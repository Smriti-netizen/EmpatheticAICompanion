from schemas.chat import ChatRequest, ChatResponse
from services.ollama_client import chat as ollama_chat, trim_messages
from services.safety import (
    CRISIS_CARE_HINT,
    crisis_fallback,
    filter_output,
    gather_fallback,
    grounded_fallback,
    is_crisis,
    looks_malformed,
    looks_ungrounded,
)


class ChatService:
    async def respond(self, body: ChatRequest) -> ChatResponse:
        last_user = next(
            (m for m in reversed(body.messages) if m.role == "user"),
            None,
        )
        # Stay present and respond therapeutically instead of hard-stopping.
        crisis = bool(last_user and is_crisis(last_user.content))
        user_text = last_user.content if last_user else ""
        care_hint = CRISIS_CARE_HINT if crisis else None
        if user_text:
            ground = (
                f"[THIS TURN — GROUNDING]\n"
                f"Client just said (exact): {user_text[:500]}\n"
                "Reflect THIS content. Do not invent a different topic. "
                "Never say 'this is good stuff'."
            )
            care_hint = f"{care_hint}\n\n{ground}" if care_hint else ground
        messages = trim_messages([m.model_dump() for m in body.messages])
        reply = await ollama_chat(messages, system_extra=care_hint)

        def _bad(text: str) -> bool:
            return looks_malformed(text) or looks_ungrounded(user_text, text)

        if _bad(reply):
            reply = await ollama_chat(messages, system_extra=care_hint)
            if _bad(reply):
                if crisis:
                    reply = crisis_fallback()
                else:
                    reply = grounded_fallback(user_text) or gather_fallback()
        return ChatResponse(reply=filter_output(reply), crisis=False)


chat_service = ChatService()
