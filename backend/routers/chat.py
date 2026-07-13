from fastapi import APIRouter, HTTPException

from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import chat_service
from services.ollama_client import OllamaError

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def counselor_chat(body: ChatRequest) -> ChatResponse:
    try:
        return await chat_service.respond(body)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
