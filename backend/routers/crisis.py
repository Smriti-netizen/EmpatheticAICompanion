import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/crisis", tags=["crisis"])

_RESOURCES_PATH = Path(__file__).resolve().parent.parent / "data" / "crisis_resources.json"


@router.get("/resources")
async def crisis_resources():
    return json.loads(_RESOURCES_PATH.read_text(encoding="utf-8"))
