import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.session import SessionLocal
from app.pipeline.news_ingestion import run_ingestion

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


def start_scheduler() -> None:
    _scheduler.add_job(
        _ingestion_job,
        trigger="interval",
        minutes=15,
        next_run_time=datetime.now(),
        id="news_ingestion",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started — news ingestion every 15 min")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
