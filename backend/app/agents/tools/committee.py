"""Committee-only Saarthi tools. Offered only to committee members; the services check again."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.agents.tools.base import (
    NoArgs,
    Outcome,
    Proposal,
    ToolContext,
    ToolInputError,
    ToolResult,
    ToolSpec,
    WriteSpec,
    match_name,
)
from app.agents.tools.read import resolve_amenity, resolve_event
from app.agents.tools.write import payload, validated, when
from app.models.enums import EventListTab, EventStatus, EventType, StallApplicationStatus
from app.schemas.amenity import AmenityClosureIn
from app.schemas.event import EventRejectIn, StallApproveIn
from app.schemas.guide import DocumentIn
from app.schemas.saarthi import SaarthiCard
from app.services import amenities as amenity_service
from app.services import business_review, events, guide, stalls


async def pending_approvals(ctx: ToolContext, _: NoArgs) -> ToolResult:
    upcoming = await events.list_events(ctx.db, ctx.member, tab=EventListTab.upcoming)
    pending_events = [e for e in upcoming if e.status == EventStatus.pending_approval]
    businesses = await business_review.pending(ctx.db, ctx.member)
    stall_rows = []
    for event in upcoming:
        if event.event_type != EventType.society:
            continue
        detail = await events.get_event_detail(ctx.db, ctx.member, event.id)
        if not detail.stalls_enabled:
            continue
        for app in detail.stall_applications or []:
            if app.status == StallApplicationStatus.pending:
                stall_rows.append(
                    {
                        "event": event.title,
                        "application": app.id,
                        "applicant": app.applicant_name,
                        "stall": app.stall_type,
                    }
                )
    return ToolResult(
        {
            "events": [
                {"event": e.id, "title": e.title, "when": e.starts_at, "where": e.location}
                for e in pending_events
            ],
            "businesses": [
                {"business": str(b.id), "name": b.name, "owner": b.owner_first_name}
                for b in businesses
            ],
            "stall_applications": stall_rows,
        },
        [
            SaarthiCard(kind="event", title=e.title, badge="Pending", href=e.href)
            for e in pending_events[:4]
        ]
        + [
            SaarthiCard(
                kind="business", title=b.name, badge="Pending", href=f"/local-businesses/{b.id}"
            )
            for b in businesses[:2]
        ],
    )


class EventRefArgs(BaseModel):
    event: str = Field(description="Event id or title")


async def prepare_approve_event(ctx: ToolContext, args: EventRefArgs) -> Proposal:
    slug = await resolve_event(ctx, args.event)
    event = await events.get_event_detail(ctx.db, ctx.member, slug)
    if event.status != EventStatus.pending_approval:
        raise ToolInputError(f"{event.title} isn't waiting for approval.")
    lines = [
        ("Event", event.title),
        ("When", when(datetime.fromisoformat(event.starts_at))),
        ("Where", event.location),
        ("Host", event.host_profile.name),
    ]
    if event.invite_interest:
        lines.append(("Invites", f"Residents interested in {event.invite_interest}"))
    return Proposal(
        title=f"Approve {event.title}", lines=lines, payload={"slug": slug}, confirm_label="Approve"
    )


async def execute_approve_event(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.approve_event(ctx.db, ctx.member, data["slug"])
    return Outcome(
        f'Approved "{event.title}". The host is notified and it\'s published.', event.href
    )


class RejectEventArgs(EventRefArgs):
    reason: str


async def prepare_reject_event(ctx: ToolContext, args: RejectEventArgs) -> Proposal:
    slug = await resolve_event(ctx, args.event)
    event = await events.get_event_detail(ctx.db, ctx.member, slug)
    body = validated(EventRejectIn, reason=args.reason)
    return Proposal(
        title=f"Reject {event.title}",
        lines=[("Event", event.title), ("Reason", args.reason)],
        payload=payload(body, slug=slug),
        warning="The host will see this reason.",
        confirm_label="Reject",
    )


async def execute_reject_event(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.reject_event(
        ctx.db, ctx.member, data["slug"], EventRejectIn.model_validate(data["body"])
    )
    return Outcome(f'Rejected "{event.title}"; the host has the reason.', event.href)


class ReviewBusinessArgs(BaseModel):
    business: str = Field(description="Pending business name")
    approve: bool
    reason: str = Field("", description="Needed when rejecting")


async def prepare_review_business(ctx: ToolContext, args: ReviewBusinessArgs) -> Proposal:
    pending = await business_review.pending(ctx.db, ctx.member)
    found = match_name(args.business, {str(b.id): b.name for b in pending})
    if found is None:
        raise ToolInputError(f"No pending business matches '{args.business}'.")
    if not args.approve and len(args.reason.strip()) < 3:
        raise ToolInputError("Rejecting needs a short reason for the owner.")
    name = next(b.name for b in pending if str(b.id) == found)
    return Proposal(
        title=f"{'Approve' if args.approve else 'Reject'} {name}",
        lines=[("Business", name)] + ([] if args.approve else [("Reason", args.reason)]),
        payload={
            "business_id": found,
            "approve": args.approve,
            "reason": args.reason or None,
            "name": name,
        },
        confirm_label="Approve" if args.approve else "Reject",
    )


async def execute_review_business(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await business_review.review(
        ctx.db,
        ctx.member,
        uuid.UUID(data["business_id"]),
        approve=data["approve"],
        reason=data["reason"],
    )
    verb = "Approved" if data["approve"] else "Rejected"
    return Outcome(
        f"{verb} {data['name']}. The owner is notified.", f"/local-businesses/{data['business_id']}"
    )


class StallDecisionArgs(BaseModel):
    event: str = Field(description="Event with stalls")
    applicant: str = Field(description="Applicant first name or stall type")
    approve: bool
    spot: str = Field("", description="Stall spot, needed when approving, e.g. 'F7'")


async def prepare_decide_stall(ctx: ToolContext, args: StallDecisionArgs) -> Proposal:
    slug = await resolve_event(ctx, args.event)
    detail = await events.get_event_detail(ctx.db, ctx.member, slug)
    pending = [
        a for a in detail.stall_applications or [] if a.status == StallApplicationStatus.pending
    ]
    found = match_name(
        args.applicant, {a.id: f"{a.applicant_name} {a.stall_type}" for a in pending}
    )
    if found is None:
        raise ToolInputError("No pending stall application matches that.")
    app = next(a for a in pending if a.id == found)
    data: dict[str, Any] = {"slug": slug, "application_id": app.id, "approve": args.approve}
    lines = [("Event", detail.title), ("Applicant", app.applicant_name), ("Stall", app.stall_type)]
    if args.approve:
        data["body"] = validated(StallApproveIn, spot_no=args.spot).model_dump(mode="json")
        lines.append(("Spot", args.spot))
    return Proposal(
        title=f"{'Approve' if args.approve else 'Reject'} {app.stall_type} stall",
        lines=lines,
        payload=data,
        confirm_label="Approve" if args.approve else "Reject",
    )


async def execute_decide_stall(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    application_id = uuid.UUID(data["application_id"])
    if data["approve"]:
        event = await stalls.approve_stall(
            ctx.db,
            ctx.member,
            data["slug"],
            application_id,
            StallApproveIn.model_validate(data["body"]),
        )
        return Outcome("Approved the stall; the applicant can pay the fee now.", event.href)
    event = await stalls.reject_stall(ctx.db, ctx.member, data["slug"], application_id)
    return Outcome("Rejected the stall application.", event.href)


class NoticeArgs(BaseModel):
    title: str = Field(description="e.g. 'Notice: Lift maintenance in Tower A'")
    text: str


async def prepare_post_notice(ctx: ToolContext, args: NoticeArgs) -> Proposal:
    body = validated(DocumentIn, title=args.title, body=args.text)
    return Proposal(
        title="Post this notice",
        lines=[("Title", args.title), ("Notice", args.text)],
        payload=payload(body),
        edit_href="/guide/new",
        confirm_label="Post notice",
    )


async def execute_post_notice(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    document = await guide.create_document(
        ctx.db, ctx.member, DocumentIn.model_validate(data["body"])
    )
    # Index right away so residents (and Saarthi) can use it immediately.
    await guide.index_in_background(document.id)
    return Outcome(
        "Posted the notice. It's on Home and in the society guide.", f"/guide/{document.id}"
    )


class AmenityStatusArgs(BaseModel):
    amenity: str
    closed: bool
    note: str = Field("", description="Shown to residents, e.g. 'Closed for repairs till 5 PM'")


async def prepare_amenity_status(ctx: ToolContext, args: AmenityStatusArgs) -> Proposal:
    amenity_id, name = await resolve_amenity(ctx, args.amenity)
    body = validated(AmenityClosureIn, closed=args.closed, note=args.note or None)
    return Proposal(
        title=f"{'Close' if args.closed else 'Reopen'} {name}",
        lines=[("Amenity", name), ("Status", "Closed" if args.closed else "Open")]
        + ([("Note", args.note)] if args.note else []),
        payload=payload(body, amenity_id=amenity_id, name=name),
        warning="Residents will see this straight away." if args.closed else None,
        confirm_label="Update",
    )


async def execute_amenity_status(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await amenity_service.set_closure(
        ctx.db, ctx.member, data["amenity_id"], AmenityClosureIn.model_validate(data["body"])
    )
    return Outcome(f"Updated {data['name']}.", f"/amenities/{data['amenity_id']}")


COMMITTEE_READS: list[ToolSpec] = [
    ToolSpec(
        "pending_approvals",
        "Events, businesses and stall applications waiting for the committee.",
        NoArgs,
        "Checking approvals…",
        pending_approvals,
    ),
]

COMMITTEE_WRITES: list[WriteSpec] = [
    WriteSpec(
        "approve_event",
        "Approve a pending event (publishes it and sends its invites).",
        EventRefArgs,
        prepare_approve_event,
        execute_approve_event,
        committee_only=True,
    ),
    WriteSpec(
        "reject_event",
        "Reject a pending event with a reason.",
        RejectEventArgs,
        prepare_reject_event,
        execute_reject_event,
        committee_only=True,
    ),
    WriteSpec(
        "review_business",
        "Approve or reject a new local business listing.",
        ReviewBusinessArgs,
        prepare_review_business,
        execute_review_business,
        committee_only=True,
    ),
    WriteSpec(
        "decide_stall",
        "Approve (with a spot) or reject a stall application.",
        StallDecisionArgs,
        prepare_decide_stall,
        execute_decide_stall,
        committee_only=True,
    ),
    WriteSpec(
        "post_notice",
        "Post a committee notice to Home and the society guide.",
        NoticeArgs,
        prepare_post_notice,
        execute_post_notice,
        committee_only=True,
    ),
    WriteSpec(
        "set_amenity_status",
        "Close or reopen an amenity with a note.",
        AmenityStatusArgs,
        prepare_amenity_status,
        execute_amenity_status,
        committee_only=True,
    ),
]
