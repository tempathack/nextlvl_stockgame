#!/usr/bin/env python3
"""Verify S&P 500 data coverage for daily (2y) and hourly (7d) tables."""

import asyncio
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.sp500 import SP500_TICKERS, StockDailyHistory, StockHourlyData

settings = get_settings()


async def summarize_daily(session: AsyncSession) -> None:
    """Print coverage details for 2-year daily history."""
    total_rows = await session.scalar(select(func.count()).select_from(StockDailyHistory)) or 0
    distinct_symbols = set(
        (await session.scalars(select(StockDailyHistory.symbol).distinct())).all()
    )
    min_date = await session.scalar(select(func.min(StockDailyHistory.date)))
    max_date = await session.scalar(select(func.max(StockDailyHistory.date)))
    missing = sorted(set(SP500_TICKERS) - distinct_symbols)

    print("\nDaily history (target: 503 symbols · ~2y)")
    print(f"  Symbols: {len(distinct_symbols)}/{len(SP500_TICKERS)} "
          f"({len(distinct_symbols)/len(SP500_TICKERS)*100:.1f}%)")
    print(f"  Rows: {total_rows}")
    if min_date and max_date:
        span_days = (max_date - min_date).days
        print(f"  Span: {min_date} → {max_date} ({span_days} days)")

    if missing:
        preview = ", ".join(missing[:10])
        suffix = " ..." if len(missing) > 10 else ""
        print(f"  Missing symbols: {preview}{suffix}")

    short_stmt = (
        select(StockDailyHistory.symbol, func.count().label("rows"))
        .group_by(StockDailyHistory.symbol)
        .having(func.count() < 450)  # 2y ≈ 500 trading days; flag anything short
        .order_by(func.count())
        .limit(10)
    )
    short_results = (await session.execute(short_stmt)).all()
    if short_results:
        print("  Symbols with <450 daily rows (need backfill):")
        for symbol, rows in short_results:
            print(f"    - {symbol}: {rows} rows")


async def summarize_hourly(session: AsyncSession) -> None:
    """Print coverage details for 7-day hourly history."""
    total_rows = await session.scalar(select(func.count()).select_from(StockHourlyData)) or 0
    distinct_symbols = set(
        (await session.scalars(select(StockHourlyData.symbol).distinct())).all()
    )
    min_ts = await session.scalar(select(func.min(StockHourlyData.timestamp)))
    max_ts = await session.scalar(select(func.max(StockHourlyData.timestamp)))
    missing = sorted(set(SP500_TICKERS) - distinct_symbols)

    print("\nHourly history (target: 503 symbols · 7d @ 1h)")
    print(f"  Symbols: {len(distinct_symbols)}/{len(SP500_TICKERS)} "
          f"({len(distinct_symbols)/len(SP500_TICKERS)*100:.1f}%)")
    print(f"  Rows: {total_rows}")
    if min_ts and max_ts:
        span_hours = int((max_ts - min_ts).total_seconds() // 3600)
        print(f"  Span: {min_ts} → {max_ts} ({span_hours} hours)")

    if missing:
        preview = ", ".join(missing[:10])
        suffix = " ..." if len(missing) > 10 else ""
        print(f"  Missing symbols: {preview}{suffix}")

    short_stmt = (
        select(StockHourlyData.symbol, func.count().label("rows"))
        .group_by(StockHourlyData.symbol)
        .having(func.count() < 160)  # 7d ≈ 168 hours; allow minor gaps
        .order_by(func.count())
        .limit(10)
    )
    short_results = (await session.execute(short_stmt)).all()
    if short_results:
        print("  Symbols with <160 hourly rows (need refill):")
        for symbol, rows in short_results:
            print(f"    - {symbol}: {rows} rows")


async def main():
    """Entry point."""
    print(f"[{datetime.utcnow().isoformat()}] Verifying S&P 500 data coverage...")
    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        await summarize_daily(session)
        await summarize_hourly(session)

    await engine.dispose()
    print("\nDone. Use the SP500 tasks (daily --full / hourly) to backfill missing data if needed.")


if __name__ == "__main__":
    asyncio.run(main())
