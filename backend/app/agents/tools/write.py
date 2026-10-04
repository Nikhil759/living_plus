"""Saarthi write tools for residents. Each one prepares a proposal; nothing changes until the
resident confirms it, and then the same service the app's screens use runs it."""

import uuid
from datetime import date, datetime, timedelta
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

from app.agents.tools.base import (
    IST,
    Outcome,
    Proposal,
    ToolContext,
    ToolInputError,
    WriteSpec,
    ist_day,
    ist_time,
    match_name,
    parse_day,
)
from app.agents.tools.read import resolve_amenity, resolve_event
from app.core.errors import AppError
from app.models.enums import (
    BusinessAvailability,
    BusinessSort,
    EventStatus,
    EventType,
    ListingStatus,
    ListingTab,
    OpeningSort,
    TicketScope,
    TicketStatus,
)
from app.schemas.amenity import BookingIn
from app.schemas.community import GroupIn, GroupOut, PostIn
from app.schemas.event import (
    EventCancelIn,
    EventCreate,
    EventDetailOut,
    EventRsvpIn,
    EventUpdate,
    StallApplyIn,
)
from app.schemas.flat_opening import OpeningDetailOut, OpeningIn
from app.schemas.help_desk import CommentIn, ConfirmationIn, FeedbackIn, IssueIn, IssueOut
from app.schemas.identity import ProfileUpdate
from app.schemas.local_business import BusinessCardOut
from app.schemas.marketplace import ListingDetailOut, ListingIn
from app.services import amenities as amenity_service
from app.services import (
    amenity_bookings,
    business_engagement,
    community,
    events,
    flat_openings,
    help_desk,
    local_businesses,
    marketplace,
    stalls,
)
from app.services import profile as profile_service

EN = chr(0x2013)  # en dash for time ranges
COMMITTEE = "the Managing Committee"


# --- shared helpers --------------------------------------------------------------------------


def at(day: date, clock: str) -> datetime:
    """IST wall-clock 'HH:MM' on a day, as an aware datetime."""
    try:
        hour, minute = (int(part) for part in clock.strip().split(":"))
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=IST)
    except ValueError:
        raise ToolInputError(f"'{clock}' is not a time; use 24-hour HH:MM.") from None


def validated(model: type[BaseModel], **values: Any) -> BaseModel:
    """Builds a service input exactly as the form would, so the same validation applies."""
    try:
        return model.model_validate(values)
    except ValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(part) for part in first["loc"]) or "details"
        raise ToolInputError(f"{field}: {first['msg']}. Ask the resident for this.") from None


def payload(body: BaseModel, **extra: Any) -> dict[str, Any]:
    return {"body": body.model_dump(mode="json", by_alias=False), **extra}


def when(start: datetime, end: datetime | None = None) -> str:
    text = f"{ist_day(start)}, {ist_time(start)}"
    return f"{text}{EN}{ist_time(end)}" if end else text


def yes(value: bool) -> str:
    return "Yes" if value else "No"


# --- amenities -------------------------------------------------------------------------------


class BookSlotArgs(BaseModel):
    amenity: str = Field(description="Court name, e.g. 'Badminton 2'")
    date: str = Field(description="YYYY-MM-DD")
    time: str = Field(description="Slot start, 24-hour HH:MM, e.g. 19:00")


async def prepare_book_slot(ctx: ToolContext, args: BookSlotArgs) -> Proposal:
    amenity_id, name = await resolve_amenity(ctx, args.amenity)
    day = parse_day(args.date, ctx)
    start = at(day, args.time)
    try:
        slots = await amenity_service.get_slots(ctx.db, ctx.member, amenity_id, day)
    except AppError as err:
        raise ToolInputError(f"{name}: {err.message}") from None
    slot = next((s for s in slots.slots if s.starts_at == start), None)
    free = [ist_time(s.starts_at) for s in slots.slots if s.state == "free"]
    if slot is None or slot.state != "free":
        state = slot.label or slot.state if slot else "not a bookable slot"
        raise ToolInputError(
            f"{name} at {ist_time(start)} on {ist_day(day)} is {state}. "
            f"Free that day: {', '.join(free) or 'none'}."
        )
    return Proposal(
        title=f"Book {name}",
        lines=[("Court", name), ("When", when(slot.starts_at, slot.ends_at))],
        payload=payload(BookingIn(starts_at=start), amenity_id=amenity_id, name=name),
        edit_href=f"/amenities/{amenity_id}",
        confirm_label="Book",
    )


async def execute_book_slot(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    booking = await amenity_bookings.book_slot(
        ctx.db, ctx.member, data["amenity_id"], BookingIn.model_validate(data["body"])
    )
    return Outcome(
        f"Booked {booking.amenity_name} for {when(booking.starts_at, booking.ends_at)}.",
        f"/amenities/{booking.amenity_id}",
    )


class CancelBookingArgs(BaseModel):
    amenity: str
    date: str = Field(description="YYYY-MM-DD")
    time: str = Field("", description="Slot start HH:MM; needed if there are several that day")


async def prepare_cancel_booking(ctx: ToolContext, args: CancelBookingArgs) -> Proposal:
    _, name = await resolve_amenity(ctx, args.amenity)
    day = parse_day(args.date, ctx)
    mine = [
        b
        for b in await amenity_bookings.my_bookings(ctx.db, ctx.member)
        if b.amenity_name == name and b.starts_at.astimezone(IST).date() == day
    ]
    if args.time:
        mine = [b for b in mine if b.starts_at == at(day, args.time)]
    if len(mine) != 1:
        raise ToolInputError(
            f"Found {len(mine)} of your {name} bookings on {ist_day(day)}; ask which one."
            if mine
            else f"You have no {name} booking on {ist_day(day)}."
        )
    booking = mine[0]
    return Proposal(
        title=f"Cancel your {name} booking",
        lines=[("Court", name), ("When", when(booking.starts_at, booking.ends_at))],
        payload={"booking_id": booking.id},
        warning="This cancels your booking and frees the slot for others.",
        confirm_label="Cancel booking",
    )


async def execute_cancel_booking(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    booking = await amenity_bookings.cancel_booking(
        ctx.db, ctx.member, uuid.UUID(data["booking_id"])
    )
    return Outcome(f"Cancelled your {booking.amenity_name} booking.", "/amenities")


# --- events ----------------------------------------------------------------------------------


class RsvpArgs(BaseModel):
    event: str = Field(description="Event id or title")
    guests: int = Field(0, ge=0, le=9, description="People coming with the resident")


async def _event(ctx: ToolContext, query: str) -> EventDetailOut:
    return await events.get_event_detail(ctx.db, ctx.member, await resolve_event(ctx, query))


async def prepare_rsvp(ctx: ToolContext, args: RsvpArgs) -> Proposal:
    event = await _event(ctx, args.event)
    if event.event_type == EventType.paid:
        raise ToolInputError("Paid events need a ticket bought on the event page; link it.")
    if event.viewer_going:
        raise ToolInputError("The resident is already going to this event.")
    if args.guests > event.guest_limit:
        raise ToolInputError(f"This event allows {event.guest_limit} guests per resident.")
    left = max(event.capacity - event.spots_taken, 0)
    if left < args.guests + 1:
        raise ToolInputError(f"Only {left} spots left; offer the waitlist instead (join_waitlist).")
    return Proposal(
        title=f"RSVP to {event.title}",
        lines=[
            ("When", when(datetime.fromisoformat(event.starts_at))),
            ("Where", event.location),
            ("People", str(args.guests + 1)),
        ],
        payload=payload(EventRsvpIn(qty=args.guests + 1), slug=event.id),
        edit_href=event.href,
        confirm_label="RSVP",
    )


async def execute_rsvp(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.rsvp_event(
        ctx.db, ctx.member, data["slug"], EventRsvpIn.model_validate(data["body"])
    )
    return Outcome(f"You're going to {event.title}.", event.href)


class EventRefArgs(BaseModel):
    event: str = Field(description="Event id or title")


async def prepare_cancel_rsvp(ctx: ToolContext, args: EventRefArgs) -> Proposal:
    event = await _event(ctx, args.event)
    if not event.viewer_going:
        raise ToolInputError("The resident hasn't RSVPed to this event.")
    return Proposal(
        title=f"Cancel your RSVP to {event.title}",
        lines=[("When", when(datetime.fromisoformat(event.starts_at)))],
        payload={"slug": event.id},
        warning="This cancels your RSVP and frees your spot.",
        confirm_label="Cancel RSVP",
    )


async def execute_cancel_rsvp(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.leave_event(ctx.db, ctx.member, data["slug"])
    return Outcome(f"Cancelled your RSVP to {event.title}.", event.href)


async def prepare_join_waitlist(ctx: ToolContext, args: RsvpArgs) -> Proposal:
    event = await _event(ctx, args.event)
    return Proposal(
        title=f"Join the waitlist for {event.title}",
        lines=[
            ("When", when(datetime.fromisoformat(event.starts_at))),
            ("People", str(args.guests + 1)),
        ],
        payload=payload(EventRsvpIn(qty=args.guests + 1), slug=event.id),
        confirm_label="Join waitlist",
    )


async def execute_join_waitlist(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.join_waitlist(
        ctx.db, ctx.member, data["slug"], EventRsvpIn.model_validate(data["body"])
    )
    return Outcome(f"You're on the waitlist for {event.title}.", event.href)


class CreateEventArgs(BaseModel):
    title: str
    date: str = Field(description="YYYY-MM-DD")
    start_time: str = Field(description="24-hour HH:MM")
    end_time: str = Field(description="24-hour HH:MM")
    space: str = Field("", description="Community Hall, Amphitheatre or Clubhouse Terrace, if used")
    location: str = Field("", description="Where, when no society space is used, e.g. 'Gate 1'")
    capacity: int = Field(50, ge=1, le=2000)
    category: Literal[
        "sports", "fitness", "kids", "food", "music", "learning", "social", "other"
    ] = "other"
    event_type: Literal["free", "paid", "society"] = "free"
    price_inr: int = Field(0, ge=0, le=10_000, description="Ticket price for paid events")
    description: str = ""
    invite_interest: str = Field(
        "", description="Invite residents with this interest when published, e.g. 'football'"
    )


async def prepare_create_event(ctx: ToolContext, args: CreateEventArgs) -> Proposal:
    day = parse_day(args.date, ctx)
    start, end = at(day, args.start_time), at(day, args.end_time)
    amenity_id, location, approval = None, args.location.strip(), None
    if args.space.strip():
        amenity_id, location = await resolve_amenity(ctx, args.space)
        detail = await amenity_service.get_amenity(ctx.db, ctx.member, amenity_id)
        if detail.kind == "space":
            approval = COMMITTEE
    if not location:
        raise ToolInputError("Where is the event? Ask for a place or a society space.")
    body = validated(
        EventCreate,
        title=args.title,
        location_label=location,
        starts_at=start,
        ends_at=end,
        description=args.description or None,
        event_type=args.event_type,
        category=args.category,
        capacity=args.capacity,
        price_inr=args.price_inr if args.event_type == "paid" else None,
        amenity_id=amenity_id,
        invite_interest=args.invite_interest or None,
    )
    if args.event_type in ("paid", "society"):
        approval = COMMITTEE
    lines = [
        ("Event", args.title),
        ("When", when(start, end)),
        ("Where", location),
        ("Capacity", str(args.capacity)),
        (
            "Type",
            f"Paid · ₹{args.price_inr}" if args.event_type == "paid" else args.event_type.title(),
        ),
        ("Category", args.category.title()),
    ]
    if args.invite_interest:
        invitees = await community.interest_count(ctx.db, ctx.member, args.invite_interest)
        lines.append(("Invite", f"{invitees} residents interested in {args.invite_interest}"))
        if invitees > events.INVITE_APPROVAL_LIMIT:
            approval = COMMITTEE
    return Proposal(
        title="Create this event",
        lines=lines,
        payload=payload(body),
        approval=approval,
        edit_href="/events/new?saarthiAction={action}",
        confirm_label="Create event",
    )


async def execute_create_event(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    event = await events.create_event(ctx.db, ctx.member, EventCreate.model_validate(data["body"]))
    if event.status == EventStatus.pending_approval:
        invites = " and the invites go out" if event.invite_interest else ""
        return Outcome(
            f'Sent "{event.title}" to the committee for approval. Once they approve it, it\'s '
            f"published{invites}, and I'll let you know.",
            event.href,
            pending=True,
        )
    return Outcome(f'"{event.title}" is published.', event.href)


class EditEventArgs(BaseModel):
    event: str = Field(description="The resident's own event: id or title")
    title: str = ""
    date: str = Field("", description="New date YYYY-MM-DD, if changing")
    start_time: str = Field("", description="New start HH:MM, if changing")
    end_time: str = Field("", description="New end HH:MM, if changing")
    capacity: int = Field(0, ge=0, le=2000, description="0 means unchanged")
    description: str = ""


async def prepare_edit_event(ctx: ToolContext, args: EditEventArgs) -> Proposal:
    event = await _event(ctx, args.event)
    if not event.is_host:
        raise ToolInputError("Only the host can edit this event.")
    starts = datetime.fromisoformat(event.starts_at)
    ends = datetime.fromisoformat(event.ends_at) if event.ends_at else starts + timedelta(hours=2)
    day = parse_day(args.date, ctx) if args.date else starts.astimezone(IST).date()
    new_start = (
        at(day, args.start_time)
        if args.start_time
        else datetime.combine(day, starts.astimezone(IST).timetz())
    )
    new_end = (
        at(day, args.end_time)
        if args.end_time
        else datetime.combine(day, ends.astimezone(IST).timetz())
    )
    changes: dict[str, Any] = {}
    lines: list[tuple[str, str]] = [("Event", event.title)]
    if new_start != starts or new_end != ends:
        changes |= {"starts_at": new_start, "ends_at": new_end}
        lines.append(("When", f"{when(new_start, new_end)} (was {when(starts, ends)})"))
    for field, value in (("title", args.title), ("description", args.description)):
        if value.strip():
            changes[field] = value.strip()
            lines.append((field.title(), value.strip()))
    if args.capacity:
        changes["capacity"] = args.capacity
        lines.append(("Capacity", f"{args.capacity} (was {event.capacity})"))
    if len(lines) == 1:
        raise ToolInputError("What should change? Ask the resident.")
    body = validated(EventUpdate, **changes)
    return Proposal(
        title=f"Update {event.title}",
        lines=lines,
        payload=payload(body, slug=event.id),
        edit_href=f"/events/{event.id}/edit",
        confirm_label="Update event",
    )


async def execute_edit_event(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    body = EventUpdate.model_validate(data["body"])
    event = await events.update_event(ctx.db, ctx.member, data["slug"], body)
    return Outcome(f'Updated "{event.title}". Going residents will see the change.', event.href)


class CancelEventArgs(BaseModel):
    event: str = Field(description="The resident's own event: id or title")
    reason: str = Field(description="Short reason shown to attendees")


async def prepare_cancel_event(ctx: ToolContext, args: CancelEventArgs) -> Proposal:
    event = await _event(ctx, args.event)
    if not event.is_host:
        raise ToolInputError("Only the host can cancel this event.")
    body = validated(EventCancelIn, reason=args.reason)
    return Proposal(
        title=f"Cancel {event.title}",
        lines=[("When", when(datetime.fromisoformat(event.starts_at))), ("Reason", args.reason)],
        payload=payload(body, slug=event.id),
        warning="This cancels the event for everyone who RSVPed.",
        confirm_label="Cancel event",
    )


async def execute_cancel_event(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    body = EventCancelIn.model_validate(data["body"])
    event = await events.cancel_event(ctx.db, ctx.member, data["slug"], body)
    return Outcome(f'Cancelled "{event.title}".', event.href)


class StallArgs(BaseModel):
    event: str = Field(description="Event with stalls, e.g. 'Diwali Mela'")
    stall_type: str = Field(description="What the stall sells, e.g. 'Chaat' or 'Handmade diyas'")
    description: str = ""


async def prepare_apply_stall(ctx: ToolContext, args: StallArgs) -> Proposal:
    event = await _event(ctx, args.event)
    if not event.stalls_enabled:
        raise ToolInputError(f"{event.title} doesn't take stall applications.")
    stall_type = args.stall_type
    categories = [c.name for c in event.stall_categories]
    if categories:
        # Strict: a wrong stall type is a different stall, not a typo.
        found = match_name(stall_type, {name: name for name in categories}, cutoff=0.75)
        if found is None:
            raise ToolInputError(
                f"Stall types for {event.title}: {', '.join(categories)}. Ask which one fits."
            )
        stall_type = found
    body = validated(StallApplyIn, stall_type=stall_type, description=args.description or None)
    return Proposal(
        title=f"Apply for a stall at {event.title}",
        lines=[("Stall", stall_type), ("Event", event.title)],
        payload=payload(body, slug=event.id),
        approval=COMMITTEE,
        edit_href=event.href,
        confirm_label="Apply",
    )


async def execute_apply_stall(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    body = StallApplyIn.model_validate(data["body"])
    event = await stalls.apply_stall(ctx.db, ctx.member, data["slug"], body)
    return Outcome(
        "Your stall application is with the committee. You'll pay the fee in the app once "
        "it's approved.",
        event.href,
        pending=True,
    )


# --- help desk -------------------------------------------------------------------------------


async def _issue(ctx: ToolContext, query: str) -> IssueOut:
    issues = await help_desk.list_issues(ctx.db, ctx.member)
    wanted = query.strip().upper().replace(" ", "")
    for issue in issues:
        if issue.number.replace("-", "") == wanted.replace("-", "") or str(issue.id) == query:
            return issue
    found = match_name(query, {str(i.id): i.title for i in issues})
    if found is None:
        raise ToolInputError(f"No issue matches '{query}'. Use my_issues or open_issues_in_tower.")
    return next(i for i in issues if str(i.id) == found)


class ReportIssueArgs(BaseModel):
    category: Literal[
        "lift",
        "water",
        "electricity",
        "plumbing",
        "security",
        "cleanliness",
        "parking",
        "amenity",
        "noise",
        "other",
    ]
    where: Literal["my_flat", "common_area"]
    tower: str = Field("", description="For common areas, e.g. 'Tower B'; empty means own tower")
    area: str = Field("", description="Common area, e.g. 'Lift 2'")
    title: str
    description: str
    urgent: bool = False
    new_issue_anyway: bool = Field(
        False, description="True only if the resident said it differs from the similar issue"
    )


async def prepare_report_issue(ctx: ToolContext, args: ReportIssueArgs) -> Proposal:
    towers = await help_desk.list_towers(ctx.db, ctx.member)
    tower_id = None
    if args.where == "common_area":
        own = await help_desk.member_tower_id(ctx.db, ctx.member)
        wanted = args.tower.strip()
        tower_id = (
            own
            if not wanted
            else uuid.UUID(
                match_name(
                    wanted if wanted.lower().startswith("tower") else f"Tower {wanted}",
                    {str(t.id): t.name for t in towers},
                )
                or str(own)
            )
        )
        similar = [
            i
            for i in await help_desk.list_issues(ctx.db, ctx.member)
            if i.scope == TicketScope.common_area
            and i.tower_id == tower_id
            and i.category.value == args.category
            and i.status in (TicketStatus.open, TicketStatus.in_progress)
        ]
        if similar and not args.new_issue_anyway:
            issue = similar[0]
            raise ToolInputError(
                f'An open issue already covers this: {issue.number} "{issue.title}" '
                f"({issue.reporter_count} reporters). Offer me_too on {issue.number} instead of "
                "a new report, unless the resident says it's different."
            )
    body = validated(
        IssueIn,
        category=args.category,
        scope=args.where,
        tower_id=tower_id,
        area_label=args.area or None,
        title=args.title,
        description=args.description,
        urgency="urgent" if args.urgent else "normal",
    )
    tower_name = next((t.name for t in towers if t.id == tower_id), "Your flat")
    return Proposal(
        title="Report this issue",
        lines=[
            ("Issue", args.title),
            ("Where", f"{tower_name} · {args.area}" if args.area else tower_name),
            ("Category", args.category.title()),
            ("Urgent", yes(args.urgent)),
        ],
        payload=payload(body),
        edit_href="/help-desk/report",
        confirm_label="Report",
    )


async def execute_report_issue(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    issue = await help_desk.create_issue(ctx.db, ctx.member, IssueIn.model_validate(data["body"]))
    return Outcome(
        f"Reported as {issue.number}. You'll get updates as the committee works on it.",
        f"/help-desk/tickets/{issue.id}",
    )


class IssueRefArgs(BaseModel):
    issue: str = Field(description="Issue number like 'HD-1042' or its title")


async def prepare_me_too(ctx: ToolContext, args: IssueRefArgs) -> Proposal:
    issue = await _issue(ctx, args.issue)
    if issue.scope != TicketScope.common_area:
        raise ToolInputError("Only common-area issues take a Me too.")
    if str(ctx.member.user.id) in issue.follower_ids:
        raise ToolInputError(f"The resident is already on {issue.number}.")
    return Proposal(
        title=f"Add you to {issue.number}",
        lines=[
            ("Issue", issue.title),
            ("Where", f"{issue.tower} · {issue.area_label or ''}"),
            ("Reported by", f"{issue.reporter_count} residents so far"),
        ],
        payload={"issue_id": issue.id},
        edit_href=f"/help-desk/tickets/{issue.id}",
        confirm_label="Me too",
    )


async def execute_me_too(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    issue = await help_desk.me_too(ctx.db, ctx.member, uuid.UUID(data["issue_id"]))
    return Outcome(
        f"Added you to {issue.number}. {issue.reporter_count} residents have reported it now.",
        f"/help-desk/tickets/{issue.id}",
    )


class CommentArgs(IssueRefArgs):
    message: str


async def prepare_comment(ctx: ToolContext, args: CommentArgs) -> Proposal:
    issue = await _issue(ctx, args.issue)
    body = validated(CommentIn, message=args.message)
    return Proposal(
        title=f"Comment on {issue.number}",
        lines=[("Issue", issue.title), ("Comment", args.message)],
        payload=payload(body, issue_id=issue.id),
        confirm_label="Post comment",
    )


async def execute_comment(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    issue = await help_desk.add_comment(
        ctx.db, ctx.member, uuid.UUID(data["issue_id"]), CommentIn.model_validate(data["body"])
    )
    return Outcome(f"Added your comment to {issue.number}.", f"/help-desk/tickets/{issue.id}")


class ConfirmFixedArgs(IssueRefArgs):
    fixed: bool
    note: str = ""


async def prepare_confirm_fixed(ctx: ToolContext, args: ConfirmFixedArgs) -> Proposal:
    issue = await _issue(ctx, args.issue)
    if not issue.awaiting_confirmation:
        raise ToolInputError(f"{issue.number} isn't waiting for a fix confirmation.")
    body = validated(ConfirmationIn, fixed=args.fixed, note=args.note or None)
    return Proposal(
        title=f"{'Close' if args.fixed else 'Reopen'} {issue.number}",
        lines=[("Issue", issue.title), ("Fixed", yes(args.fixed))]
        + ([("Note", args.note)] if args.note else []),
        payload=payload(body, issue_id=issue.id),
        confirm_label="Confirm",
    )


async def execute_confirm_fixed(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    issue = await help_desk.confirm_fixed(
        ctx.db, ctx.member, uuid.UUID(data["issue_id"]), ConfirmationIn.model_validate(data["body"])
    )
    state = "closed" if issue.status == TicketStatus.closed else "reopened"
    return Outcome(f"{issue.number} is {state}.", f"/help-desk/tickets/{issue.id}")


class FeedbackArgs(BaseModel):
    topic: Literal["committee", "app", "suggestion"] = "committee"
    message: str
    anonymous: bool = False


async def prepare_feedback(ctx: ToolContext, args: FeedbackArgs) -> Proposal:
    body = validated(FeedbackIn, topic=args.topic, message=args.message, anonymous=args.anonymous)
    return Proposal(
        title="Send feedback to the committee",
        lines=[("Message", args.message), ("Anonymous", yes(args.anonymous))],
        payload=payload(body),
        edit_href="/help-desk/feedback",
        confirm_label="Send",
    )


async def execute_feedback(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await help_desk.submit_feedback(ctx.db, ctx.member, FeedbackIn.model_validate(data["body"]))
    return Outcome("Sent your feedback to the committee.", "/help-desk")


# --- marketplace -----------------------------------------------------------------------------


async def _my_listing(ctx: ToolContext, query: str) -> ListingDetailOut:
    mine = [
        *await marketplace.my_listings(ctx.db, ctx.member, ListingTab.active),
        *await marketplace.my_listings(ctx.db, ctx.member, ListingTab.sold),
    ]
    found = match_name(query, {str(x.id): x.title for x in mine})
    if found is None:
        raise ToolInputError(f"None of the resident's listings matches '{query}'.")
    return await marketplace.get_listing(ctx.db, ctx.member, uuid.UUID(found))


def _listing_body(listing: ListingDetailOut, **changes: Any) -> ListingIn:
    current = {
        "title": listing.title,
        "category": listing.category,
        "condition": listing.condition,
        "price_inr": listing.price_inr,
        "is_free": listing.is_free,
        "negotiable": listing.negotiable,
        "description": listing.description,
        "photos": listing.photos,
        "contact_method": listing.contact_method,
        "pickup_note": listing.pickup_note,
    }
    body = validated(ListingIn, **(current | changes))
    assert isinstance(body, ListingIn)
    return body


class UpdateListingArgs(BaseModel):
    listing: str = Field(description="Title of the resident's own listing")
    price_inr: int = Field(-1, ge=-1, description="-1 means unchanged")
    title: str = ""
    description: str = ""
    negotiable: Literal["", "yes", "no"] = ""


async def prepare_update_listing(ctx: ToolContext, args: UpdateListingArgs) -> Proposal:
    listing = await _my_listing(ctx, args.listing)
    changes: dict[str, Any] = {}
    lines: list[tuple[str, str]] = [("Item", listing.title)]
    if args.price_inr >= 0:
        changes |= {"price_inr": args.price_inr, "is_free": args.price_inr == 0}
        lines.append(("Price", f"₹{args.price_inr:,} (was ₹{listing.price_inr:,})"))
    for field in ("title", "description"):
        if getattr(args, field).strip():
            changes[field] = getattr(args, field).strip()
            lines.append((field.title(), changes[field]))
    if args.negotiable:
        changes["negotiable"] = args.negotiable == "yes"
        lines.append(("Negotiable", args.negotiable.title()))
    if len(lines) == 1:
        raise ToolInputError("What should change on the listing? Ask the resident.")
    body = _listing_body(listing, **changes)
    return Proposal(
        title=f"Update your listing: {listing.title}",
        lines=lines,
        payload=payload(body, listing_id=listing.id),
        edit_href=f"/marketplace/{listing.id}/edit",
        confirm_label="Update listing",
    )


async def execute_update_listing(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    listing = await marketplace.update_listing(
        ctx.db, ctx.member, uuid.UUID(data["listing_id"]), ListingIn.model_validate(data["body"])
    )
    return Outcome(f'Updated "{listing.title}".', f"/marketplace/{listing.id}")


class MarkListingArgs(BaseModel):
    listing: str = Field(description="Title of the resident's own listing")
    status: Literal["reserved", "sold", "available"] = Field(
        description="'available' relists a reserved or sold item"
    )


async def prepare_mark_listing(ctx: ToolContext, args: MarkListingArgs) -> Proposal:
    listing = await _my_listing(ctx, args.listing)
    label = {"reserved": "Mark as reserved", "sold": "Mark as sold", "available": "Relist"}
    return Proposal(
        title=f"{label[args.status]}: {listing.title}",
        lines=[
            ("Item", listing.title),
            ("Status", f"{args.status.title()} (was {listing.status.value})"),
        ],
        payload={"listing_id": listing.id, "status": args.status},
        confirm_label=label[args.status],
    )


async def execute_mark_listing(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    listing = await marketplace.set_status(
        ctx.db, ctx.member, uuid.UUID(data["listing_id"]), ListingStatus(data["status"])
    )
    return Outcome(
        f'"{listing.title}" is now {listing.status.value}.', f"/marketplace/{listing.id}"
    )


class ListingRefArgs(BaseModel):
    listing: str = Field(description="Title of the resident's own listing")


async def prepare_delete_listing(ctx: ToolContext, args: ListingRefArgs) -> Proposal:
    listing = await _my_listing(ctx, args.listing)
    return Proposal(
        title=f"Delete your listing: {listing.title}",
        lines=[("Item", listing.title)],
        payload={"listing_id": listing.id},
        warning="This removes the listing for good.",
        confirm_label="Delete",
    )


async def execute_delete_listing(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await marketplace.remove_listing(ctx.db, ctx.member, uuid.UUID(data["listing_id"]), None)
    return Outcome("Deleted the listing.", "/marketplace")


class CreateListingArgs(BaseModel):
    title: str
    category: Literal["furniture", "electronics", "kids", "books", "sports", "home_kitchen"]
    condition: Literal["new", "like_new", "good", "fair"] = "good"
    price_inr: int = Field(0, ge=0)
    negotiable: bool = False
    description: str = ""


async def prepare_create_listing(ctx: ToolContext, args: CreateListingArgs) -> Proposal:
    return Proposal(
        title=f"Sell: {args.title}",
        lines=[
            ("Item", args.title),
            ("Price", "Free" if args.price_inr == 0 else f"₹{args.price_inr:,}"),
            ("Condition", args.condition.replace("_", " ")),
        ],
        payload={"draft": args.model_dump()},
        edit_href="/marketplace/new?saarthiAction={action}",
        draft_only=True,
        confirm_label="Open the Sell form",
    )


async def execute_draft_only(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    raise AppError("draft_only", "This one needs the form (for example to add a photo).", 422)


# --- local businesses ------------------------------------------------------------------------


async def _business(ctx: ToolContext, query: str, *, mine: bool = False) -> BusinessCardOut:
    every = (
        await local_businesses.my_businesses(ctx.db, ctx.member)
        if mine
        else await local_businesses.browse(
            ctx.db,
            ctx.member,
            category=None,
            taking_orders=False,
            query=None,
            sort=BusinessSort.newest,
        )
    )
    found = (
        match_name(query, {str(b.id): b.name for b in every})
        if query
        else (str(every[0].id) if mine and len(every) == 1 else None)
    )
    if found is None:
        raise ToolInputError(f"No {'own ' if mine else ''}business matches '{query}'.")
    return next(b for b in every if str(b.id) == found)


class BusinessRefArgs(BaseModel):
    business: str = Field(description="Business name")


def _business_action(verb: str, run: Any, done: str, warning: str | None = None) -> tuple[Any, Any]:
    async def prepare(ctx: ToolContext, args: BusinessRefArgs) -> Proposal:
        business = await _business(ctx, args.business)
        return Proposal(
            title=f"{verb} {business.name}",
            lines=[("Business", business.name)],
            payload={"business_id": business.id, "name": business.name},
            warning=warning,
            confirm_label=verb,
        )

    async def execute(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
        await run(ctx.db, ctx.member, uuid.UUID(data["business_id"]))
        return Outcome(done.format(name=data["name"]), f"/local-businesses/{data['business_id']}")

    return prepare, execute


prepare_follow, execute_follow = _business_action(
    "Follow", business_engagement.follow, "You're following {name}; their updates will reach you."
)
prepare_unfollow, execute_unfollow = _business_action(
    "Unfollow",
    business_engagement.unfollow,
    "You've unfollowed {name}.",
    "You'll stop getting their updates.",
)


class RecommendArgs(BusinessRefArgs):
    note: str = Field("", max_length=200)


async def prepare_recommend(ctx: ToolContext, args: RecommendArgs) -> Proposal:
    business = await _business(ctx, args.business)
    return Proposal(
        title=f"Recommend {business.name}",
        lines=[("Business", business.name)] + ([("Note", args.note)] if args.note else []),
        payload={"business_id": business.id, "name": business.name, "note": args.note or None},
        confirm_label="Recommend",
    )


async def execute_recommend(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await business_engagement.recommend(
        ctx.db, ctx.member, uuid.UUID(data["business_id"]), data["note"]
    )
    return Outcome(f"Recommended {data['name']}.", f"/local-businesses/{data['business_id']}")


class BusinessUpdateArgs(BaseModel):
    business: str = Field("", description="The resident's own business; empty if they have one")
    text: str = Field(description="The update, e.g. today's menu")


async def prepare_business_update(ctx: ToolContext, args: BusinessUpdateArgs) -> Proposal:
    business = await _business(ctx, args.business, mine=True)
    return Proposal(
        title=f"Post an update for {business.name}",
        lines=[("Update", args.text)],
        payload={"business_id": business.id, "name": business.name, "text": args.text},
        confirm_label="Post update",
    )


async def execute_business_update(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await business_engagement.post_update(
        ctx.db, ctx.member, uuid.UUID(data["business_id"]), data["text"]
    )
    return Outcome(
        f"Posted the update for {data['name']}; followers will see it.",
        f"/local-businesses/{data['business_id']}",
    )


class BusinessStatusArgs(BaseModel):
    business: str = Field("", description="The resident's own business; empty if they have one")
    status: Literal["taking_orders", "fully_booked", "on_break"]


async def prepare_business_status(ctx: ToolContext, args: BusinessStatusArgs) -> Proposal:
    business = await _business(ctx, args.business, mine=True)
    label = args.status.replace("_", " ")
    return Proposal(
        title=f"Set {business.name} to “{label}”",
        lines=[("Business", business.name), ("Status", label)],
        payload={"business_id": business.id, "name": business.name, "status": args.status},
        confirm_label="Update status",
    )


async def execute_business_status(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await local_businesses.set_availability(
        ctx.db, ctx.member, uuid.UUID(data["business_id"]), BusinessAvailability(data["status"])
    )
    return Outcome(
        f"{data['name']} now shows “{data['status'].replace('_', ' ')}”.",
        f"/local-businesses/{data['business_id']}",
    )


class BusinessDraftArgs(BaseModel):
    name: str
    category: Literal[
        "food", "tuition", "childcare", "pet_care", "art", "wellness", "home_services"
    ]
    tagline: str
    about: str = ""
    timings: str = ""


async def prepare_business_draft(ctx: ToolContext, args: BusinessDraftArgs) -> Proposal:
    return Proposal(
        title=f"List your business: {args.name}",
        lines=[
            ("Business", args.name),
            ("Category", args.category.replace("_", " ")),
            ("Tagline", args.tagline),
        ],
        payload={"draft": args.model_dump()},
        edit_href="/local-businesses/new?saarthiAction={action}",
        approval=COMMITTEE,
        draft_only=True,
        confirm_label="Open the business form",
    )


# --- flat openings ---------------------------------------------------------------------------


class PostOpeningArgs(BaseModel):
    kind: Literal["room_available", "flatmate_needed", "full_flat"]
    bhk: int = Field(ge=1, le=4)
    rent_inr: int = Field(ge=1000)
    furnishing: Literal["furnished", "semi_furnished", "unfurnished"]
    preference: Literal[
        "anyone", "women_only", "men_only", "family", "working_professionals", "students"
    ] = "anyone"
    description: str
    available_from: str = Field("", description="YYYY-MM-DD; empty means now")
    deposit_inr: int = Field(0, ge=0, description="0 means not given")
    floor: int = Field(-1, ge=-1, le=60, description="-1 means not given")


async def prepare_post_opening(ctx: ToolContext, args: PostOpeningArgs) -> Proposal:
    tower_id = await help_desk.member_tower_id(ctx.db, ctx.member)
    if tower_id is None:
        raise ToolInputError("Only residents with a flat can post an opening.")
    body = validated(
        OpeningIn,
        kind=args.kind,
        tower_id=tower_id,
        bhk=args.bhk,
        rent_inr=args.rent_inr,
        furnishing=args.furnishing,
        preference=args.preference,
        description=args.description,
        available_from=parse_day(args.available_from, ctx) if args.available_from else None,
        deposit_inr=args.deposit_inr or None,
        floor=None if args.floor < 0 else args.floor,
        contact_method="whatsapp",
    )
    return Proposal(
        title="Post this flat opening",
        lines=[
            ("Opening", f"{args.kind.replace('_', ' ').title()} · {args.bhk} BHK"),
            ("Rent", f"₹{args.rent_inr:,}/month"),
            ("Furnishing", args.furnishing.replace("_", " ")),
            ("Contact", "WhatsApp (private link)"),
        ],
        payload=payload(body),
        edit_href="/flat-openings/new",
        confirm_label="Post opening",
    )


async def execute_post_opening(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    opening = await flat_openings.create_opening(
        ctx.db, ctx.member, OpeningIn.model_validate(data["body"])
    )
    return Outcome(f'Posted "{opening.title}".', f"/flat-openings/{opening.id}")


async def _my_opening(ctx: ToolContext, query: str) -> OpeningDetailOut:
    mine = [
        o
        for o in await flat_openings.browse(
            ctx.db,
            ctx.member,
            kind=None,
            bhk=None,
            budget=None,
            furnishing=None,
            sort=OpeningSort.newest,
        )
        if o.is_mine
    ]
    found = (
        match_name(query, {str(o.id): o.title for o in mine})
        if query
        else (str(mine[0].id) if len(mine) == 1 else None)
    )
    if found is None:
        raise ToolInputError("Which of the resident's openings? Ask them.")
    return await flat_openings.detail(ctx.db, ctx.member, uuid.UUID(found))


class EditOpeningArgs(BaseModel):
    opening: str = Field("", description="The resident's own opening; empty if they have one")
    rent_inr: int = Field(0, ge=0, description="0 means unchanged")
    description: str = ""
    available_from: str = Field("", description="YYYY-MM-DD, if changing")


async def prepare_edit_opening(ctx: ToolContext, args: EditOpeningArgs) -> Proposal:
    o = await _my_opening(ctx, args.opening)
    current = {
        "kind": o.kind,
        "tower_id": o.tower_id,
        "floor": o.floor,
        "bhk": o.bhk,
        "furnishing": o.furnishing,
        "rent_inr": o.rent_inr,
        "deposit_inr": o.deposit_inr,
        "maintenance_included": o.maintenance_included,
        "maintenance_inr": o.maintenance_inr,
        "available_from": o.available_from,
        "preference": o.preference,
        "included": o.included,
        "description": o.description,
        "contact_method": o.contact_method,
    }
    changes: dict[str, Any] = {}
    lines: list[tuple[str, str]] = [("Opening", o.title)]
    if args.rent_inr:
        changes["rent_inr"] = args.rent_inr
        lines.append(("Rent", f"₹{args.rent_inr:,} (was ₹{o.rent_inr:,})"))
    if args.description.strip():
        changes["description"] = args.description.strip()
        lines.append(("Description", changes["description"]))
    if args.available_from:
        changes["available_from"] = parse_day(args.available_from, ctx)
        lines.append(("Available from", ist_day(changes["available_from"])))
    if len(lines) == 1:
        raise ToolInputError("What should change on the opening? Ask the resident.")
    body = validated(OpeningIn, **(current | changes))
    return Proposal(
        title=f"Update {o.title}",
        lines=lines,
        payload=payload(body, opening_id=o.id),
        edit_href=f"/flat-openings/{o.id}/edit",
        confirm_label="Update opening",
    )


async def execute_edit_opening(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    opening = await flat_openings.update_opening(
        ctx.db, ctx.member, uuid.UUID(data["opening_id"]), OpeningIn.model_validate(data["body"])
    )
    return Outcome(f'Updated "{opening.title}".', f"/flat-openings/{opening.id}")


class OpeningRefArgs(BaseModel):
    opening: str = Field("", description="The resident's own opening; empty if they have one")


async def prepare_opening_filled(ctx: ToolContext, args: OpeningRefArgs) -> Proposal:
    o = await _my_opening(ctx, args.opening)
    return Proposal(
        title=f"Mark {o.title} as filled",
        lines=[("Opening", o.title)],
        payload={"opening_id": o.id},
        confirm_label="Mark filled",
    )


async def execute_opening_filled(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    o = await flat_openings.mark_filled(ctx.db, ctx.member, uuid.UUID(data["opening_id"]))
    return Outcome(f'Marked "{o.title}" as filled.', f"/flat-openings/{o.id}")


async def prepare_delete_opening(ctx: ToolContext, args: OpeningRefArgs) -> Proposal:
    o = await _my_opening(ctx, args.opening)
    return Proposal(
        title=f"Delete {o.title}",
        lines=[("Opening", o.title)],
        payload={"opening_id": o.id},
        warning="This removes the opening for good.",
        confirm_label="Delete",
    )


async def execute_delete_opening(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await flat_openings.remove(ctx.db, ctx.member, uuid.UUID(data["opening_id"]), None)
    return Outcome("Deleted the opening.", "/flat-openings")


# --- community -------------------------------------------------------------------------------


async def _group(ctx: ToolContext, query: str) -> GroupOut:
    catalog = await community.catalog(ctx.db, ctx.member)
    found = match_name(query, {str(g.id): g.name for g in catalog.groups})
    if found is None:
        raise ToolInputError(f"No group called '{query}'.")
    return next(g for g in catalog.groups if str(g.id) == found)


class PostArgs(BaseModel):
    text: str
    post_type: Literal["general", "question", "alert", "lost_found", "recommendation"] = "general"
    group: str = Field("", description="Group name; empty posts to the whole society")


async def prepare_post(ctx: ToolContext, args: PostArgs) -> Proposal:
    group = await _group(ctx, args.group) if args.group.strip() else None
    if group is not None and not group.joined:
        raise ToolInputError(f"The resident isn't in {group.name}; offer join_group first.")
    body = validated(
        PostIn, body=args.text, post_type=args.post_type, group_id=group.id if group else None
    )
    return Proposal(
        title="Post this",
        lines=[
            ("To", group.name if group else "Whole society"),
            ("Type", args.post_type.replace("_", " ").title()),
            ("Post", args.text),
        ],
        payload=payload(body),
        edit_href="/community/post",
        confirm_label="Post",
    )


async def execute_post(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    post = await community.create_post(ctx.db, ctx.member, PostIn.model_validate(data["body"]))
    href = f"/community/groups/{post.group_id}" if post.group_id else "/community"
    return Outcome("Posted.", href)


class GroupRefArgs(BaseModel):
    group: str = Field(description="Group name")


async def prepare_join_group(ctx: ToolContext, args: GroupRefArgs) -> Proposal:
    group = await _group(ctx, args.group)
    if group.joined:
        raise ToolInputError(f"The resident is already in {group.name}.")
    private = group.visibility == "private"
    return Proposal(
        title=f"{'Ask to join' if private else 'Join'} {group.name}",
        lines=[("Group", group.name), ("Members", str(group.member_count))],
        payload={"group_id": group.id},
        approval="the group's admin" if private else None,
        confirm_label="Join",
    )


async def execute_join_group(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    group = await community.join_group(ctx.db, ctx.member, uuid.UUID(data["group_id"]))
    if group.pending:
        return Outcome(
            f"Asked to join {group.name}; the admin will approve it.",
            f"/community/groups/{group.id}",
            pending=True,
        )
    return Outcome(f"You've joined {group.name}.", f"/community/groups/{group.id}")


async def prepare_leave_group(ctx: ToolContext, args: GroupRefArgs) -> Proposal:
    group = await _group(ctx, args.group)
    if not group.joined:
        raise ToolInputError(f"The resident isn't in {group.name}.")
    return Proposal(
        title=f"Leave {group.name}",
        lines=[("Group", group.name)],
        payload={"group_id": group.id},
        warning="You'll stop seeing this group's posts.",
        confirm_label="Leave",
    )


async def execute_leave_group(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    group = await community.leave_group(ctx.db, ctx.member, uuid.UUID(data["group_id"]))
    return Outcome(f"You've left {group.name}.", "/community")


class StartGroupArgs(BaseModel):
    name: str
    description: str
    emoji: str = "👥"
    private: bool = False
    interests: list[str] = Field(default_factory=list, max_length=8)


async def prepare_start_group(ctx: ToolContext, args: StartGroupArgs) -> Proposal:
    body = validated(
        GroupIn,
        name=args.name,
        description=args.description,
        emoji=args.emoji,
        visibility="private" if args.private else "public",
        tags=args.interests,
    )
    return Proposal(
        title=f"Start {args.emoji} {args.name}",
        lines=[
            ("Group", args.name),
            ("About", args.description),
            ("Who can join", "You approve requests" if args.private else "Anyone"),
        ],
        payload=payload(body),
        edit_href="/community/new",
        confirm_label="Start group",
    )


async def execute_start_group(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    group = await community.create_group(ctx.db, ctx.member, GroupIn.model_validate(data["body"]))
    return Outcome(f"Started {group.name}. You're its admin.", f"/community/groups/{group.id}")


class WhatsappArgs(BaseModel):
    group: str = Field(description="WhatsApp group name")


async def prepare_whatsapp(ctx: ToolContext, args: WhatsappArgs) -> Proposal:
    catalog = await community.catalog(ctx.db, ctx.member)
    found = match_name(args.group, {str(w.id): w.name for w in catalog.whatsapp_groups})
    if found is None:
        raise ToolInputError(f"No WhatsApp group called '{args.group}'.")
    chat = next(w for w in catalog.whatsapp_groups if str(w.id) == found)
    if chat.invite_link or chat.pending_approval:
        raise ToolInputError(
            f"The resident already {'has the invite' if chat.invite_link else 'asked'}"
            f" for {chat.name}."
        )
    return Proposal(
        title=f"Ask to join {chat.name}",
        lines=[("WhatsApp group", chat.name), ("Members", str(chat.member_count))],
        payload={"whatsapp_id": chat.id},
        approval="the group's admin",
        confirm_label="Request",
    )


async def execute_whatsapp(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    chat = await community.request_whatsapp(ctx.db, ctx.member, uuid.UUID(data["whatsapp_id"]))
    return Outcome(
        f"Asked for the {chat.name} invite. You'll see the link once the admin approves.",
        "/community",
        pending=True,
    )


# --- profile ---------------------------------------------------------------------------------


class InterestsArgs(BaseModel):
    add: list[str] = Field(default_factory=list, max_length=10)
    remove: list[str] = Field(default_factory=list, max_length=10)


async def prepare_interests(ctx: ToolContext, args: InterestsArgs) -> Proposal:
    me = await profile_service.build_resident_out(ctx.db, ctx.member)
    current = list(me.interests)
    removing = {r.strip().lower() for r in args.remove}
    updated = [i for i in current if i.lower() not in removing]
    updated += [
        a.strip()
        for a in args.add
        if a.strip() and a.strip().lower() not in {i.lower() for i in updated}
    ]
    if updated == current:
        raise ToolInputError("Nothing would change; ask what to add or remove.")
    body = validated(ProfileUpdate, interests=updated)
    return Proposal(
        title="Update your interests",
        lines=[("Interests", ", ".join(updated) or "None")],
        payload=payload(body),
        edit_href="/profile/edit",
        confirm_label="Save",
    )


class PrivacyArgs(BaseModel):
    profile_visible: Literal["", "on", "off"] = ""
    show_flat_number: Literal["", "on", "off"] = ""


async def prepare_privacy(ctx: ToolContext, args: PrivacyArgs) -> Proposal:
    changes: dict[str, Any] = {}
    lines: list[tuple[str, str]] = []
    if args.profile_visible:
        changes["is_visible"] = args.profile_visible == "on"
        lines.append(("Profile visible to neighbours", args.profile_visible.title()))
    if args.show_flat_number:
        changes["show_flat"] = args.show_flat_number == "on"
        lines.append(("Show my flat number", args.show_flat_number.title()))
    if not changes:
        raise ToolInputError("Which privacy switch should change?")
    return Proposal(
        title="Change your privacy settings",
        lines=lines,
        payload=payload(validated(ProfileUpdate, **changes)),
        edit_href="/profile",
        confirm_label="Save",
    )


async def execute_profile(ctx: ToolContext, data: dict[str, Any]) -> Outcome:
    await profile_service.update_profile(
        ctx.db, ctx.member, ProfileUpdate.model_validate(data["body"])
    )
    return Outcome("Saved your profile.", "/profile")


RESIDENT_WRITES: list[WriteSpec] = [
    WriteSpec(
        "book_slot",
        "Book a court slot for the resident.",
        BookSlotArgs,
        prepare_book_slot,
        execute_book_slot,
    ),
    WriteSpec(
        "cancel_booking",
        "Cancel one of the resident's amenity bookings.",
        CancelBookingArgs,
        prepare_cancel_booking,
        execute_cancel_booking,
    ),
    WriteSpec(
        "rsvp",
        "RSVP the resident (and guests) to a free or society event.",
        RsvpArgs,
        prepare_rsvp,
        execute_rsvp,
    ),
    WriteSpec(
        "cancel_rsvp",
        "Cancel the resident's RSVP.",
        EventRefArgs,
        prepare_cancel_rsvp,
        execute_cancel_rsvp,
    ),
    WriteSpec(
        "join_waitlist",
        "Put the resident on a full event's waitlist.",
        RsvpArgs,
        prepare_join_waitlist,
        execute_join_waitlist,
    ),
    WriteSpec(
        "create_event",
        "Create an event hosted by the resident, optionally in a society "
        "space and inviting residents with an interest.",
        CreateEventArgs,
        prepare_create_event,
        execute_create_event,
    ),
    WriteSpec(
        "edit_my_event",
        "Change the time, title, capacity or description of the resident's own event.",
        EditEventArgs,
        prepare_edit_event,
        execute_edit_event,
    ),
    WriteSpec(
        "cancel_my_event",
        "Cancel an event the resident hosts.",
        CancelEventArgs,
        prepare_cancel_event,
        execute_cancel_event,
    ),
    WriteSpec(
        "apply_for_stall",
        "Apply for a stall at an event that takes stalls.",
        StallArgs,
        prepare_apply_stall,
        execute_apply_stall,
    ),
    WriteSpec(
        "report_issue",
        "Report a help desk issue. Checks for a similar open issue first.",
        ReportIssueArgs,
        prepare_report_issue,
        execute_report_issue,
    ),
    WriteSpec(
        "me_too",
        "Add the resident to an existing common-area issue.",
        IssueRefArgs,
        prepare_me_too,
        execute_me_too,
    ),
    WriteSpec(
        "comment_on_issue",
        "Comment on an issue the resident is part of.",
        CommentArgs,
        prepare_comment,
        execute_comment,
    ),
    WriteSpec(
        "confirm_fixed",
        "Tell the committee whether a resolved issue is really fixed.",
        ConfirmFixedArgs,
        prepare_confirm_fixed,
        execute_confirm_fixed,
    ),
    WriteSpec(
        "give_feedback",
        "Send feedback or a suggestion to the committee.",
        FeedbackArgs,
        prepare_feedback,
        execute_feedback,
    ),
    WriteSpec(
        "create_listing",
        "Start a marketplace listing (opens the Sell form to add a photo).",
        CreateListingArgs,
        prepare_create_listing,
        execute_draft_only,
    ),
    WriteSpec(
        "update_listing",
        "Change price, title or description of the resident's listing.",
        UpdateListingArgs,
        prepare_update_listing,
        execute_update_listing,
    ),
    WriteSpec(
        "mark_listing",
        "Mark the resident's listing reserved or sold, or relist it.",
        MarkListingArgs,
        prepare_mark_listing,
        execute_mark_listing,
    ),
    WriteSpec(
        "delete_listing",
        "Delete the resident's listing.",
        ListingRefArgs,
        prepare_delete_listing,
        execute_delete_listing,
    ),
    WriteSpec(
        "follow_business",
        "Follow a local business.",
        BusinessRefArgs,
        prepare_follow,
        execute_follow,
    ),
    WriteSpec(
        "unfollow_business",
        "Unfollow a local business.",
        BusinessRefArgs,
        prepare_unfollow,
        execute_unfollow,
    ),
    WriteSpec(
        "recommend_business",
        "Recommend a local business with an optional note.",
        RecommendArgs,
        prepare_recommend,
        execute_recommend,
    ),
    WriteSpec(
        "post_business_update",
        "Post an update (e.g. today's menu) for the resident's own business.",
        BusinessUpdateArgs,
        prepare_business_update,
        execute_business_update,
    ),
    WriteSpec(
        "set_business_status",
        "Set the resident's own business availability.",
        BusinessStatusArgs,
        prepare_business_status,
        execute_business_status,
    ),
    WriteSpec(
        "start_business_listing",
        "Start listing the resident's business (opens the form "
        "to add a cover photo; committee approves new businesses).",
        BusinessDraftArgs,
        prepare_business_draft,
        execute_draft_only,
    ),
    WriteSpec(
        "post_opening",
        "Post a flat opening for the resident's own flat.",
        PostOpeningArgs,
        prepare_post_opening,
        execute_post_opening,
    ),
    WriteSpec(
        "edit_opening",
        "Change rent, description or date of the resident's opening.",
        EditOpeningArgs,
        prepare_edit_opening,
        execute_edit_opening,
    ),
    WriteSpec(
        "mark_opening_filled",
        "Mark the resident's opening as filled.",
        OpeningRefArgs,
        prepare_opening_filled,
        execute_opening_filled,
    ),
    WriteSpec(
        "delete_opening",
        "Delete the resident's opening.",
        OpeningRefArgs,
        prepare_delete_opening,
        execute_delete_opening,
    ),
    WriteSpec(
        "write_post",
        "Post to the society feed or a group the resident is in.",
        PostArgs,
        prepare_post,
        execute_post,
    ),
    WriteSpec(
        "join_group",
        "Join an interest group (private groups need the admin).",
        GroupRefArgs,
        prepare_join_group,
        execute_join_group,
    ),
    WriteSpec(
        "leave_group",
        "Leave an interest group.",
        GroupRefArgs,
        prepare_leave_group,
        execute_leave_group,
    ),
    WriteSpec(
        "start_group",
        "Start a new interest group with the resident as admin.",
        StartGroupArgs,
        prepare_start_group,
        execute_start_group,
    ),
    WriteSpec(
        "request_whatsapp",
        "Ask to join a society WhatsApp group.",
        WhatsappArgs,
        prepare_whatsapp,
        execute_whatsapp,
    ),
    WriteSpec(
        "update_interests",
        "Add or remove the resident's interests.",
        InterestsArgs,
        prepare_interests,
        execute_profile,
    ),
    WriteSpec(
        "set_privacy",
        "Turn the resident's privacy switches on or off.",
        PrivacyArgs,
        prepare_privacy,
        execute_profile,
    ),
]
