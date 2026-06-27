from fastapi import APIRouter, HTTPException

from app.tools import fetch_snapshot

router = APIRouter()


@router.get("/market/snapshot")
def market_snapshot():
    try:
        return fetch_snapshot()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
