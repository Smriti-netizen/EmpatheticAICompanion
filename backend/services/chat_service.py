"""Chat orchestration: safety gate → LLM → output filter."""

from schemas.chat import ChatRequest, ChatResponse
from services.ollama_client import chat as ollama_chat
from services.safety import (
    CRISIS_CARE_HINT,
    MODEL_GATHER_FALLBACK,
    filter_output,
    is_crisis,
    looks_malformed,
)


class ChatService:
    async def respond(self, body: ChatRequest) -> ChatResponse:
        last_user = next(
            (m for m in reversed(body.messages) if m.role == "user"),
            None,
        )
        # Stay present and respond therapeutically instead of hard-stopping.
        care_hint = CRISIS_CARE_HINT if last_user and is_crisis(last_user.content) else None
        messages = [m.model_dump() for m in body.messages]
        reply = await ollama_chat(messages, system_extra=care_hint)
        # Never surface garbled output — retry once, then hold warmly.
        if looks_malformed(reply):
            reply = await ollama_chat(messages, system_extra=care_hint)
            if looks_malformed(reply):
                reply = MODEL_GATHER_FALLBACK
        return ChatResponse(reply=filter_output(reply), crisis=False)


chat_service = ChatService()
