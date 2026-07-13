"""Chat orchestration: safety gate → LLM → output filter."""

from schemas.chat import ChatRequest, ChatResponse
from services.ollama_client import chat as ollama_chat
from services.safety import CRISIS_RESPONSE, filter_output, is_crisis


class ChatService:
    async def respond(self, body: ChatRequest) -> ChatResponse:
        last_user = next(
            (m for m in reversed(body.messages) if m.role == "user"),
            None,
        )
        if last_user and is_crisis(last_user.content):
            return ChatResponse(reply=CRISIS_RESPONSE, crisis=True)

        reply = await ollama_chat([m.model_dump() for m in body.messages])
        return ChatResponse(reply=filter_output(reply), crisis=False)


chat_service = ChatService()
