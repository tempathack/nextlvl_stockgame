"""Trade activity model for real-time feed."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import String, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdentifierMixin, TimestampMixin
from app.models.enums import OrderSide

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.portfolio import Portfolio


class TradeActivity(Base, IdentifierMixin, TimestampMixin):
    """Real-time trade activity feed visible to all players."""

    __tablename__ = "trade_activities"
    __table_args__ = (
        Index("ix_trade_activities_executed_at", "executed_at"),
        Index("ix_trade_activities_symbol", "symbol"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    symbol: Mapped[str] = mapped_column(String(12), nullable=False)
    side: Mapped[str] = mapped_column(String(10), nullable=False)  # buy/sell/short/cover
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="activities")
    portfolio: Mapped["Portfolio"] = relationship(back_populates="activities")

    def __repr__(self) -> str:
        return f"<TradeActivity {self.display_name} {self.side} {self.quantity} {self.symbol}>"
