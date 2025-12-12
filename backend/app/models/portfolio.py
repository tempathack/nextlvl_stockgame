"""Portfolio and trading models."""
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdentifierMixin, TimestampMixin
from app.models.enums import OrderSide, OrderStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.activity import TradeActivity


class Portfolio(Base, IdentifierMixin, TimestampMixin):
    """Portfolio model."""

    __tablename__ = "portfolios"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), default="Main Portfolio")
    cash_balance: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("100000.00")
    )
    equity_value: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00")
    )
    total_fees_paid: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00")
    )
    last_valuation_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="portfolios")
    positions: Mapped[list["Position"]] = relationship(
        "Position", back_populates="portfolio"
    )
    orders: Mapped[list["TradeOrder"]] = relationship(
        "TradeOrder", back_populates="portfolio"
    )
    activities: Mapped[list["TradeActivity"]] = relationship(
        "TradeActivity", back_populates="portfolio"
    )


class Position(Base, IdentifierMixin, TimestampMixin):
    """Position model representing holdings in a portfolio."""

    __tablename__ = "positions"

    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 6))
    average_price: Mapped[Decimal] = mapped_column(Numeric(15, 4))
    last_mark_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4))
    is_short: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="positions")


class TradeOrder(Base, IdentifierMixin, TimestampMixin):
    """Trade order model."""

    __tablename__ = "trade_orders"

    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    side: Mapped[OrderSide] = mapped_column()
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 6))
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4))
    notional_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2))
    fee_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=Decimal("0.00")
    )
    status: Mapped[OrderStatus] = mapped_column(default=OrderStatus.PENDING)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[Optional[str]] = mapped_column(String(500))

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="orders")


class MetricSnapshot(Base, IdentifierMixin):
    """Portfolio metric snapshot for historical tracking."""

    __tablename__ = "metric_snapshots"

    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), index=True)
    as_of_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    total_value: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    cash_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    equity_value: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    day_return_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
    total_return_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4))
