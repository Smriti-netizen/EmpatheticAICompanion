from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from db.base import Base

Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{settings.db_path}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _migrate_sqlite() -> None:
    """Additive migrations for existing local DBs."""
    with engine.begin() as conn:
        cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(user_profiles)")).fetchall()
        }
        if cols and "avatar_id" not in cols:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN avatar_id VARCHAR"))


def init_db() -> None:
    from db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
