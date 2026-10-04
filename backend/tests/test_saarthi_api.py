import json
import uuid
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from typing import Any

import pytest
from httpx import AsyncClient
from langchain_core.callbacks import AsyncCallbackManagerForLLMRun, CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from pydantic import Field
from sqlalchemy import select

from app.agents.llm import ChatModels, NamedModel, get_chat_models
from app.auth import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import MemoryCounter, get_counter
from app.main import app
from app.models import (
    ChatMessage,
    ChatSession,
    Flat,
    LlmCall,
    Membership,
    MembershipRole,
    MembershipStatus,
    Society,
    Tower,
    User,
)
from app.models.enums import ChatFeedback, ChatMessageStatus, ChatRole, LlmOutcome


class FakeGemini(BaseChatModel):
    """Streams `reply` word by word with usage on the last chunk, or fails if `fail` is set."""

    reply: str = "Hello Nikhil, happy to help."
    fail: bool = False
    fail_after_words: int = 0
    seen: list[list[BaseMessage]] = Field(default_factory=list)

    @property
    def _llm_type(self) -> str:
        return "fake-gemini"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=AIMessage(self.reply))])

    def _stream(self, *args: Any, **kwargs: Any) -> Iterator[ChatGenerationChunk]:
        raise NotImplementedError

    async def _astream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        self.seen.append(messages)
        if self.fail and not self.fail_after_words:
            raise RuntimeError("provider down")
        words = self.reply.split(" ")
        for index, word in enumerate(words):
            if self.fail and index == self.fail_after_words:
                raise RuntimeError("provider dropped")
            last = index == len(words) - 1
            yield ChatGenerationChunk(
                message=AIMessageChunk(
                    content=word if index == 0 else f" {word}",
                    usage_metadata=(
                        {"input_tokens": 120, "output_tokens": 8, "total_tokens": 128}
                        if last
                        else None
                    ),
                )
            )


@dataclass
class Residents:
    society: Society
    nikhil: User
    neighbour: User
    outsider: User


def _member(society: Society, flat: Flat, user: User) -> Membership:
    return Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        society_id=society.id,
        flat_id=flat.id,
        role=MembershipRole.owner,
        status=MembershipStatus.approved,
    )


@pytest.fixture
async def residents(db_session) -> Residents:
    society = Society(id=uuid.uuid4(), name="Prestige Meridian Park", city="Gurugram",
                      invite_code="SAAR01")
    other = Society(id=uuid.uuid4(), name="Elsewhere", city="Pune", invite_code="SAAR02")
    tower = Tower(id=uuid.uuid4(), society_id=society.id, name="Tower C")
    other_tower = Tower(id=uuid.uuid4(), society_id=other.id, name="Tower A")
    flat = Flat(id=uuid.uuid4(), society_id=society.id, tower_id=tower.id, flat_no="702")
    other_flat = Flat(id=uuid.uuid4(), society_id=other.id, tower_id=other_tower.id, flat_no="1")
    users = [
        User(id=uuid.uuid4(), supabase_uid=f"seed:{name}", email=f"{name}@example.com",
             name=f"{name.title()} Test")
        for name in ("nikhil", "neighbour", "outsider")
    ]
    db_session.add_all([society, other, tower, other_tower, flat, other_flat, *users])
    await db_session.flush()
    db_session.add_all(
        [
            _member(society, flat, users[0]),
            _member(society, flat, users[1]),
            _member(other, other_flat, users[2]),
        ]
    )
    await db_session.commit()
    return Residents(society, *users)


@pytest.fixture
def act_as() -> Iterator[Any]:
    def switch(user: User) -> None:
        async def override() -> User:
            return user

        app.dependency_overrides[get_current_user] = override

    yield switch
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def models() -> Iterator[ChatModels]:
    main = FakeGemini()
    fast = FakeGemini(reply="Fallback answer here.")
    chat_models = ChatModels(
        primary=NamedModel("gemini-3.8-flash", main),
        fallback=NamedModel("gemini-3.5-flash-lite", fast),
    )
    app.dependency_overrides[get_chat_models] = lambda: chat_models
    yield chat_models
    app.dependency_overrides.pop(get_chat_models, None)


@pytest.fixture(autouse=True)
def fresh_limits() -> None:
    counter = get_counter()
    assert isinstance(counter, MemoryCounter)
    counter.reset()


def parse_sse(text: str) -> list[tuple[str, dict[str, Any]]]:
    events = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


async def send(client: AsyncClient, message: str, **extra: Any) -> list[tuple[str, dict]]:
    response = await client.post("/v1/saarthi/chat", json={"message": message, **extra})
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    return parse_sse(response.text)


def reply_text(events: list[tuple[str, dict]]) -> str:
    return "".join(data["text"] for kind, data in events if kind == "delta")


# --- chat ---------------------------------------------------------------------------------


async def test_chat_streams_and_saves_reply(client, residents, act_as, models, db_session):
    act_as(residents.nikhil)
    events = await send(client, "  What's on today?  ", page="/home")

    kinds = [kind for kind, _ in events]
    assert kinds[0] == "session" and kinds[1] == "status" and kinds[-1] == "done"
    assert reply_text(events) == "Hello Nikhil, happy to help."
    session_id = uuid.UUID(events[0][1]["sessionId"])
    assert events[0][1]["title"] == "What's on today?"

    rows = list(await db_session.scalars(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at, ChatMessage.role.desc())
    ))
    assert [(m.role, m.content) for m in rows] == [
        (ChatRole.user, "What's on today?"),
        (ChatRole.assistant, "Hello Nikhil, happy to help."),
    ]
    assert str(rows[1].id) == events[-1][1]["messageId"]

    call = await db_session.scalar(select(LlmCall))
    assert call.model == "gemini-3.8-flash" and call.outcome == LlmOutcome.ok
    assert (call.input_tokens, call.output_tokens) == (120, 8)
    assert call.cost_usd > 0 and call.latency_ms >= 0
    assert call.message_id == rows[1].id and call.society_id == residents.society.id

    system = models.primary.model.seen[0][0].content
    assert "You are Saarthi" in system and "Nikhil" in system and "/home" in system


async def test_chat_continues_session_with_history(client, residents, act_as, models):
    act_as(residents.nikhil)
    first = await send(client, "Hi")
    session_id = first[0][1]["sessionId"]
    second = await send(client, "And tomorrow?", sessionId=session_id)

    assert second[0][1]["sessionId"] == session_id
    sent = models.primary.model.seen[1]
    assert [m.type for m in sent] == ["system", "human", "ai", "human"]
    assert sent[-1].content == "And tomorrow?"


async def test_chat_falls_back_to_other_model(client, residents, act_as, models, db_session):
    models.primary.model.fail = True
    act_as(residents.nikhil)
    events = await send(client, "Hi")

    assert reply_text(events) == "Fallback answer here."
    call = await db_session.scalar(select(LlmCall))
    assert call.model == "gemini-3.5-flash-lite" and call.outcome == LlmOutcome.fallback


async def test_chat_resets_partial_text_before_fallback(client, residents, act_as, models):
    models.primary.model.fail = True
    models.primary.model.fail_after_words = 2
    act_as(residents.nikhil)
    events = await send(client, "Hi")

    kinds = [kind for kind, _ in events]
    reset_at = kinds.index("reset")
    after = "".join(d["text"] for k, d in events[reset_at:] if k == "delta")
    assert after == "Fallback answer here."


async def test_chat_both_models_fail_gives_friendly_error(
    client, residents, act_as, models, db_session
):
    models.primary.model.fail = True
    models.fallback.model.fail = True
    act_as(residents.nikhil)
    events = await send(client, "Hi")

    kind, data = events[-1]
    assert kind == "error" and data["message"] == "I couldn't reach the server just now. Try again?"
    assert "provider" not in json.dumps(events)
    reply = await db_session.scalar(
        select(ChatMessage).where(ChatMessage.role == ChatRole.assistant)
    )
    assert reply.status == ChatMessageStatus.error
    call = await db_session.scalar(select(LlmCall))
    assert call.outcome == LlmOutcome.error and call.error_code == "RuntimeError"


async def test_failed_reply_is_left_out_of_history(client, residents, act_as, models):
    models.primary.model.fail = True
    models.fallback.model.fail = True
    act_as(residents.nikhil)
    session_id = (await send(client, "Hi"))[0][1]["sessionId"]
    models.primary.model.fail = False
    await send(client, "Again", sessionId=session_id)

    assert [m.type for m in models.primary.model.seen[-1]] == ["system", "human", "human"]


@pytest.mark.parametrize(
    "body",
    [
        {"message": "   "},
        {"message": "x" * 2001},
        {"message": "hi", "page": "javascript:alert(1)"},
        {"message": "hi", "sessionId": "not-a-uuid"},
        {},
    ],
)
async def test_chat_validation(client, residents, act_as, models, body):
    act_as(residents.nikhil)
    response = await client.post("/v1/saarthi/chat", json=body)
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


async def test_chat_requires_auth(client, models):
    response = await client.post("/v1/saarthi/chat", json={"message": "hi"})
    assert response.status_code == 401


async def test_chat_without_api_key_is_unavailable(client, residents, act_as, monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    act_as(residents.nikhil)
    response = await client.post("/v1/saarthi/chat", json={"message": "hi"})
    assert response.status_code == 503
    assert response.json() == {
        "code": "saarthi_unavailable",
        "message": "Saarthi isn't available right now.",
    }


async def test_chat_rate_limited(client, residents, act_as, models, monkeypatch):
    monkeypatch.setattr(get_settings(), "SAARTHI_CHAT_PER_10MIN", 2)
    act_as(residents.nikhil)
    await send(client, "one")
    await send(client, "two")
    response = await client.post("/v1/saarthi/chat", json={"message": "three"})
    assert response.status_code == 429
    assert response.json()["code"] == "rate_limited"


async def test_cannot_continue_someone_elses_chat(client, residents, act_as, models):
    act_as(residents.nikhil)
    session_id = (await send(client, "Hi"))[0][1]["sessionId"]

    for user in (residents.neighbour, residents.outsider):
        act_as(user)
        response = await client.post(
            "/v1/saarthi/chat", json={"message": "hi", "sessionId": session_id}
        )
        assert response.status_code == 404


# --- sessions ------------------------------------------------------------------------------


async def test_list_get_and_delete_sessions(client, residents, act_as, models):
    act_as(residents.nikhil)
    first = (await send(client, "First chat"))[0][1]["sessionId"]
    second = (await send(client, "Second chat"))[0][1]["sessionId"]

    listed = (await client.get("/v1/saarthi/sessions")).json()
    assert [s["id"] for s in listed] == [second, first]
    assert set(listed[0]) == {"id", "title", "lastMessageAt"}

    detail = (await client.get(f"/v1/saarthi/sessions/{first}")).json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]
    assert detail["messages"][1]["feedback"] is None

    assert (await client.delete(f"/v1/saarthi/sessions/{first}")).status_code == 204
    assert [s["id"] for s in (await client.get("/v1/saarthi/sessions")).json()] == [second]
    assert (await client.get(f"/v1/saarthi/sessions/{first}")).status_code == 404


async def test_sessions_require_auth(client):
    session_id = uuid.uuid4()
    assert (await client.get("/v1/saarthi/sessions")).status_code == 401
    assert (await client.get(f"/v1/saarthi/sessions/{session_id}")).status_code == 401
    assert (await client.delete(f"/v1/saarthi/sessions/{session_id}")).status_code == 401


async def test_sessions_are_private(client, residents, act_as, models):
    act_as(residents.nikhil)
    session_id = (await send(client, "Hi"))[0][1]["sessionId"]

    for user in (residents.neighbour, residents.outsider):
        act_as(user)
        assert (await client.get("/v1/saarthi/sessions")).json() == []
        assert (await client.get(f"/v1/saarthi/sessions/{session_id}")).status_code == 404
        assert (await client.delete(f"/v1/saarthi/sessions/{session_id}")).status_code == 404


async def test_session_id_validation(client, residents, act_as):
    act_as(residents.nikhil)
    assert (await client.get("/v1/saarthi/sessions/nope")).status_code == 422


# --- feedback ------------------------------------------------------------------------------


async def test_feedback_on_reply(client, residents, act_as, models, db_session):
    act_as(residents.nikhil)
    events = await send(client, "Hi")
    message_id = events[-1][1]["messageId"]

    response = await client.post(
        f"/v1/saarthi/messages/{message_id}/feedback",
        json={"rating": "down", "reason": " Wrong timing "},
    )
    assert response.status_code == 200
    assert response.json()["feedback"] == "down"
    saved = await db_session.get(ChatMessage, uuid.UUID(message_id))
    await db_session.refresh(saved)
    assert saved.feedback == ChatFeedback.down and saved.feedback_reason == "Wrong timing"


async def test_feedback_validation(client, residents, act_as, models, db_session):
    act_as(residents.nikhil)
    events = await send(client, "Hi")
    message_id = events[-1][1]["messageId"]
    url = f"/v1/saarthi/messages/{message_id}/feedback"

    assert (await client.post(url, json={"rating": "meh"})).status_code == 422
    assert (await client.post(url, json={"rating": "up", "reason": "x" * 501})).status_code == 422

    session = await db_session.scalar(select(ChatSession))
    own = await db_session.scalar(
        select(ChatMessage).where(
            ChatMessage.session_id == session.id, ChatMessage.role == ChatRole.user
        )
    )
    response = await client.post(f"/v1/saarthi/messages/{own.id}/feedback", json={"rating": "up"})
    assert response.status_code == 422


async def test_feedback_requires_auth(client):
    response = await client.post(
        f"/v1/saarthi/messages/{uuid.uuid4()}/feedback", json={"rating": "up"}
    )
    assert response.status_code == 401


async def test_feedback_on_someone_elses_reply(client, residents, act_as, models):
    act_as(residents.nikhil)
    message_id = (await send(client, "Hi"))[-1][1]["messageId"]

    for user in (residents.neighbour, residents.outsider):
        act_as(user)
        response = await client.post(
            f"/v1/saarthi/messages/{message_id}/feedback", json={"rating": "up"}
        )
        assert response.status_code == 404
