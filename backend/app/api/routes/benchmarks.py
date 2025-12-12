"""Benchmark comparison API routes - PUBLIC."""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.portfolio import Portfolio, MetricSnapshot
from app.schemas.benchmark import (
    BenchmarksResponse,
    BenchmarkPerformance,
    PortfolioBenchmarkComparisonResponse,
)
from app.integrations.market_data import MarketDataProvider, get_market_data_provider

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

# Benchmark symbols
BENCHMARK_SYMBOLS = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ Composite",
    "^DJI": "Dow Jones",
    "SPY": "SPDR S&P 500 ETF",
    "QQQ": "Invesco QQQ Trust",
    "VOO": "Vanguard S&P 500 ETF",
    "VTI": "Vanguard Total Stock Market",
}


@router.get("", response_model=BenchmarksResponse)
async def get_benchmarks(
    session: AsyncSession = Depends(get_session),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> BenchmarksResponse:
    """
    Get all benchmark performance data.

    PUBLIC ENDPOINT - No authentication required.
    """
    benchmarks = []

    for symbol, name in BENCHMARK_SYMBOLS.items():
        try:
            quote = await market_data.quote(symbol)
            benchmarks.append(
                BenchmarkPerformance(
                    symbol=symbol,
                    name=name,
                    current_value=Decimal(str(quote.price)),
                    change_pct=Decimal("0"),  # Would need historical data
                    ytd_return=None,
                )
            )
        except Exception:
            continue

    return BenchmarksResponse(
        benchmarks=benchmarks,
        updated_at=datetime.utcnow(),
    )


@router.get("/compare/{portfolio_id}", response_model=PortfolioBenchmarkComparisonResponse)
async def compare_portfolio_to_benchmarks(
    portfolio_id: int,
    session: AsyncSession = Depends(get_session),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> PortfolioBenchmarkComparisonResponse:
    """
    Compare a portfolio's performance against benchmarks.

    PUBLIC ENDPOINT - No authentication required.
    Full transparency - anyone can see any portfolio's performance.
    """
    # Get portfolio
    stmt = select(Portfolio).where(Portfolio.id == portfolio_id)
    result = await session.execute(stmt)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get historical snapshots
    snapshots_stmt = (
        select(MetricSnapshot)
        .where(MetricSnapshot.portfolio_id == portfolio_id)
        .order_by(MetricSnapshot.as_of_date.asc())
    )
    snapshots_result = await session.execute(snapshots_stmt)
    snapshots = snapshots_result.scalars().all()

    starting_value = Decimal("100000")  # Game starting capital
    current_value = Decimal(str(portfolio.cash_balance)) + Decimal(str(portfolio.equity_value))
    total_return_pct = ((current_value - starting_value) / starting_value) * 100

    return PortfolioBenchmarkComparisonResponse(
        portfolio_id=portfolio_id,
        portfolio_name=f"Portfolio #{portfolio_id}",
        starting_value=starting_value,
        current_value=current_value,
        total_return_pct=total_return_pct,
        history=[],  # Would populate from snapshots
        benchmark_symbols=list(BENCHMARK_SYMBOLS.keys()),
    )
