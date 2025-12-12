"""Game configuration model."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Numeric, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdentifierMixin, TimestampMixin


class GameConfig(Base, IdentifierMixin, TimestampMixin):
    """Game configuration and competition settings."""

    __tablename__ = "game_configs"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    starting_capital: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("100000.00")
    )
    allow_short_selling: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_borrowing: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<GameConfig {self.name} active={self.is_active}>"

    @property
    def is_running(self) -> bool:
        """Check if game is currently running."""
        now = datetime.utcnow()
        return self.is_active and self.start_date <= now <= self.end_date

    @property
    def days_remaining(self) -> int:
        """Days remaining in competition."""
        if not self.is_running:
            return 0
        return (self.end_date - datetime.utcnow()).days
