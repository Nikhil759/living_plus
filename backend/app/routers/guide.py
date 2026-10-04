import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Form, Response, UploadFile

from app.auth import CurrentMemberDep
from app.core.db import DbSession
from app.schemas.guide import DocumentDetailOut, DocumentIn, DocumentOut
from app.services import guide

router = APIRouter(prefix="/guide", tags=["guide"])


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(db: DbSession, member: CurrentMemberDep) -> list[DocumentOut]:
    return await guide.list_documents(db, member)


@router.get("/documents/{document_id}", response_model=DocumentDetailOut)
async def get_document(
    document_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> DocumentDetailOut:
    return await guide.get_document(db, member, document_id)


# Indexing (embeddings) runs after the response, so new notices are answerable within a minute.
@router.post("/documents", response_model=DocumentDetailOut, status_code=202)
async def create_document(
    body: DocumentIn, tasks: BackgroundTasks, db: DbSession, member: CurrentMemberDep
) -> DocumentDetailOut:
    document = await guide.create_document(db, member, body)
    tasks.add_task(guide.index_in_background, document.id)
    return document


@router.post("/documents/upload", response_model=DocumentDetailOut, status_code=202)
async def upload_document(
    file: UploadFile,
    tasks: BackgroundTasks,
    db: DbSession,
    member: CurrentMemberDep,
    title: Annotated[str | None, Form()] = None,
) -> DocumentDetailOut:
    data = await file.read(guide.MAX_UPLOAD_BYTES + 1)
    document = await guide.upload_document(db, member, file.filename or "notice", data, title)
    tasks.add_task(guide.index_in_background, document.id)
    return document


@router.put("/documents/{document_id}", response_model=DocumentDetailOut, status_code=202)
async def update_document(
    document_id: uuid.UUID,
    body: DocumentIn,
    tasks: BackgroundTasks,
    db: DbSession,
    member: CurrentMemberDep,
) -> DocumentDetailOut:
    document = await guide.update_document(db, member, document_id, body)
    tasks.add_task(guide.index_in_background, document.id)
    return document


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID, db: DbSession, member: CurrentMemberDep
) -> Response:
    await guide.delete_document(db, member, document_id)
    return Response(status_code=204)
