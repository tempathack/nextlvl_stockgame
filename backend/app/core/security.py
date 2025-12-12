"""Security utilities for password hashing and JWT token management."""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a hashed password."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a plaintext password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def _create_token(subject: str, expires_minutes: int) -> str:
    """Create a signed JWT token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode: dict[str, Any] = {"exp": expire, "sub": subject}
    return jwt.encode(
        to_encode,
        settings.security.jwt_secret_key,
        algorithm=settings.security.jwt_algorithm,
    )


def create_access_token(subject: str) -> str:
    """Create a short-lived access token."""
    return _create_token(subject, settings.security.access_token_expire_minutes)


def create_refresh_token(subject: str) -> str:
    """Create a longer-lived refresh token."""
    return _create_token(subject, settings.security.refresh_token_expire_minutes)
