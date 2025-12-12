"""User models."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdentifierMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.portfolio import Portfolio
    from app.models.activity import TradeActivity


class User(Base, IdentifierMixin, TimestampMixin):
    """User account model."""

    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    profile: Mapped[Optional["Profile"]] = relationship(
        "Profile", back_populates="user", uselist=False
    )
    portfolios: Mapped[list["Portfolio"]] = relationship(
        "Portfolio", back_populates="user"
    )
    activities: Mapped[list["TradeActivity"]] = relationship(
        "TradeActivity", back_populates="user"
    )


class Profile(Base, IdentifierMixin, TimestampMixin):
    """User profile model."""

    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    trade_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_report: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
