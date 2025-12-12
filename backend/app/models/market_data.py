"""Market data models for caching stock prices."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Numeric, DateTime, BigInteger, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdentifierMixin


class MarketPrice(Base, IdentifierMixin):
    """Cached market prices updated hourly via CronJob."""

    __tablename__ = "market_prices"
    __table_args__ = (
        Index("ix_market_prices_symbol", "symbol", unique=True),
        Index("ix_market_prices_updated_at", "updated_at"),
    )

    symbol: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    change: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    change_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    volume: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    sector: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class SectorPerformance(Base, IdentifierMixin):
    """Sector performance data for heatmap."""

    __tablename__ = "sector_performance"

    sector: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    change_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class MarketIndex(Base, IdentifierMixin):
    """Market indices (S&P 500, NASDAQ, DOW, VIX)."""

    __tablename__ = "market_indices"

    symbol: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    change: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    change_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
