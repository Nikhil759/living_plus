import uuid

from fastapi import APIRouter

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.flat_opening import TowerOut
from app.schemas.help_desk import (
    CommentIn,
    ConfirmationIn,
    FeedbackIn,
    FeedbackOut,
    IssueIn,
    IssueOut,
    StatusIn,
    VendorOut,
)
from app.services import help_desk

router = APIRouter(prefix="/help-desk", tags=["help-desk"])


@router.get("/issues", response_model=list[IssueOut])
async def list_issues(db: DbSession, member: CurrentMemberDep) -> list[IssueOut]:
    return await help_desk.list_issues(db, member)


@router.post("/issues", response_model=IssueOut, status_code=201)
async def create_issue(body: IssueIn, db: DbSession, member: CurrentMemberDep) -> IssueOut:
    return await help_desk.create_issue(db, member, body)


@router.get("/issues/{issue_id}", response_model=IssueOut)
async def get_issue(issue_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> IssueOut:
    return await help_desk.get_issue(db, member, issue_id)


@router.post("/issues/{issue_id}/me-too", response_model=IssueOut)
async def me_too(issue_id: uuid.UUID, db: DbSession, member: CurrentMemberDep) -> IssueOut:
    return await help_desk.me_too(db, member, issue_id)


@router.post("/issues/{issue_id}/comments", response_model=IssueOut)
async def add_comment(
    issue_id: uuid.UUID, body: CommentIn, db: DbSession, member: CurrentMemberDep
) -> IssueOut:
    return await help_desk.add_comment(db, member, issue_id, body)


@router.post("/issues/{issue_id}/confirmation", response_model=IssueOut)
async def confirm_fixed(
    issue_id: uuid.UUID, body: ConfirmationIn, db: DbSession, member: CurrentMemberDep
) -> IssueOut:
    return await help_desk.confirm_fixed(db, member, issue_id, body)


@router.patch("/issues/{issue_id}/status", response_model=IssueOut)
async def update_status(
    issue_id: uuid.UUID, body: StatusIn, db: DbSession, member: CurrentMemberDep
) -> IssueOut:
    return await help_desk.update_status(db, member, issue_id, body)


@router.get("/towers", response_model=list[TowerOut])
async def list_towers(db: DbSession, member: CurrentMemberDep) -> list[TowerOut]:
    return await help_desk.list_towers(db, member)


@router.get("/vendors", response_model=list[VendorOut])
async def list_vendors(db: DbSession, member: CurrentMemberDep) -> list[VendorOut]:
    return await help_desk.list_vendors(db, member)


@router.post("/feedback", response_model=FeedbackOut, status_code=201)
async def submit_feedback(body: FeedbackIn, db: DbSession, member: CurrentMemberDep) -> FeedbackOut:
    return await help_desk.submit_feedback(db, member, body)


@router.get("/feedback", response_model=list[FeedbackOut])
async def list_feedback(db: DbSession, member: CurrentMemberDep) -> list[FeedbackOut]:
    return await help_desk.list_feedback(db, member)
