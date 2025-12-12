"""SEC Form 4 insider trades data models."""
from datetime import date
from decimal import Decimal

from sqlalchemy import String, Numeric, Date, Text, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdentifierMixin


class InsiderTrade(Base, IdentifierMixin):
    """
    SEC Form 4 insider trading data with price impact analysis.
    Tracks insider transactions and their subsequent price performance.
    """

    __tablename__ = "insider_trades"
    __table_args__ = (
        UniqueConstraint("accession_number", name="uq_insider_accession_number"),
        Index("ix_insider_trades_symbol", "symbol"),
        Index("ix_insider_trades_filing_date", "filing_date"),
        Index("ix_insider_trades_transaction_date", "transaction_date"),
        Index("ix_insider_trades_symbol_filing_date", "symbol", "filing_date"),
        Index("ix_insider_trades_insider_name", "insider_name"),
    )

    # SEC Filing identifiers
    accession_number: Mapped[str] = mapped_column(String(25), nullable=False, unique=True)
    cik: Mapped[str] = mapped_column(String(20), nullable=False)

    # Stock info
    symbol: Mapped[str] = mapped_column(String(12), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Insider info
    insider_name: Mapped[str] = mapped_column(String(200), nullable=False)
    insider_cik: Mapped[str | None] = mapped_column(String(20), nullable=True)
    insider_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Transaction details
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Buy, Sell, Award, Option Exercise
    transaction_code: Mapped[str | None] = mapped_column(String(5), nullable=True)  # P, S, A, M, etc.
    shares_traded: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    price_per_share: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    shares_owned_after: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    ownership_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Direct/Indirect

    # Dates
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    filing_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Price impact (calculated fields)
    price_at_trade: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    price_current: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    price_1w_after: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    price_1m_after: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    price_3m_after: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    return_1w_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    return_1m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    return_3m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    return_to_current_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Benchmark comparison (vs S&P 500)
    sp500_return_1w_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    sp500_return_1m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    sp500_return_3m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    alpha_1w_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    alpha_1m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    alpha_3m_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)

    filing_url: Mapped[str | None] = mapped_column(Text, nullable=True)
