import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.db import SessionLocal

from .market_refresh import refresh_market_and_suggestions
from .news_ingestion import run_ingestion

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


def _ingestion_job() -> None:
    db = SessionLocal()
    try:
        count = run_ingestion(db)
        logger.info("News ingestion complete: %d new articles", count)
    except Exception as exc:
        logger.exception("News ingestion failed: %s", exc)
    finally:
        db.close()


def _market_job() -> None:
    db = SessionLocal()
    try:
        refresh_market_and_suggestions(db)
        logger.info("Market/suggestions refresh complete")
    except Exception as exc:
        logger.exception("Market/suggestions refresh failed: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    _scheduler.add_job(
        _ingestion_job,
        trigger="interval",
        minutes=60,
        next_run_time=datetime.now() + timedelta(minutes=2),
        id="news_ingestion",
        replace_existing=True,
    )
    _scheduler.add_job(
        _market_job,
        trigger="interval",
        minutes=60,
        next_run_time=datetime.now() + timedelta(minutes=17),
        id="market_suggestions_refresh",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Scheduler started — news ingestion every 60 min, "
        "market/suggestions refresh every 60 min (offset 15 min after news)"
    )


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
