from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db, get_snapshot, upsert_snapshot
from app.tools import fetch_snapshot

router = APIRouter()


@router.get("/market/snapshot")
def market_snapshot(db: Session = Depends(get_db)):
    row = get_snapshot(db, "market_snapshot")
    if row is not None:
        return row.payload

    try:
        snapshot = fetch_snapshot()
        upsert_snapshot(db, "market_snapshot", snapshot)
        return snapshot
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
