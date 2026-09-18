import logging
import os

from sqlalchemy import func

from auth import hash_password
from database import SessionLocal
import models


logger = logging.getLogger(__name__)


def bootstrap_initial_admin() -> None:
    """Create exactly one initial admin only when both explicit env vars are supplied."""
    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or ""
    if not email or not password:
        return

    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if existing:
            logger.info("Initial admin bootstrap skipped because the configured email already exists.")
            return
        admin = models.User(
            name="Platform Administrator",
            email=email,
            hashed_password=hash_password(password),
            role="admin",
            language="en",
        )
        db.add(admin)
        db.commit()
        logger.info("Initial admin account created from environment configuration.")
    finally:
        db.close()
