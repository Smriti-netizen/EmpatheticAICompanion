import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.session import init_db
from routers import bookings, chat, crisis, health, intake, sessions, users, voice

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(title="Empathic Companion API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(crisis.router)
app.include_router(users.router)
app.include_router(intake.router)
app.include_router(bookings.router)
app.include_router(sessions.router)
app.include_router(voice.router)
app.include_router(chat.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/")
async def root():
    return {"service": "empathic-companion", "docs": "/docs", "version": "0.2.0"}
