from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1)


class ChatResponse(BaseModel):
    reply: str
    crisis: bool = False
