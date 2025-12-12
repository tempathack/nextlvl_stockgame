"""Market data refresh task for CronJob."""

import asyncio
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.market_data import MarketPrice, SectorPerformance, MarketIndex
from app.models.portfolio import Position
from app.integrations.market_data import MarketDataProvider

settings = get_settings()

# Sector ETF mapping
SECTOR_ETFS = {
    "Technology": "XLK",
    "Financial": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Industrials": "XLI",
    "Consumer Defensive": "XLP",
    "Consumer Cyclical": "XLY",
    "Real Estate": "XLRE",
    "Utilities": "XLU",
    "Communication Services": "XLC",
    "Basic Materials": "XLB",
}

# Major indices
INDICES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ Composite",
    "^DJI": "Dow Jones Industrial",
    "^VIX": "CBOE Volatility Index",
}


async def get_tracked_symbols(session: AsyncSession) -> list[str]:
    """Get all symbols currently in portfolios."""
    stmt = select(Position.symbol).distinct()
    result = await session.execute(stmt)
    return [row[0] for row in result.all()]


async def refresh_market_prices(session: AsyncSession, market_data: MarketDataProvider):
    """Refresh prices for all tracked symbols using UPSERT."""
    symbols = await get_tracked_symbols(session)

    print(f"Refreshing prices for {len(symbols)} symbols...")

    for symbol in symbols:
        try:
            quote = await market_data.quote(symbol)

            # PostgreSQL UPSERT
            stmt = insert(MarketPrice).values(
                symbol=symbol,
                price=Decimal(str(quote.price)),
                change=Decimal(str(quote.change)) if quote.change else None,
                change_pct=Decimal(str(quote.change_pct)) if quote.change_pct else None,
                volume=quote.volume,
                name=quote.name,
                sector=quote.sector,
                updated_at=datetime.utcnow(),
            ).on_conflict_do_update(
                index_elements=['symbol'],
                set_={
                    'price': Decimal(str(quote.price)),
                    'change': Decimal(str(quote.change)) if quote.change else None,
                    'change_pct': Decimal(str(quote.change_pct)) if quote.change_pct else None,
                    'volume': quote.volume,
                    'name': quote.name,
                    'sector': quote.sector,
                    'updated_at': datetime.utcnow(),
                }
            )
            await session.execute(stmt)

        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            continue

    await session.commit()
    print(f"Updated {len(symbols)} symbols")


async def refresh_indices(session: AsyncSession, market_data: MarketDataProvider):
    """Refresh market indices."""
    print(f"Refreshing {len(INDICES)} market indices...")

    for symbol, name in INDICES.items():
        try:
            quote = await market_data.quote(symbol)

            stmt = insert(MarketIndex).values(
                symbol=symbol,
                name=name,
                value=Decimal(str(quote.price)),
                change=Decimal(str(quote.change)) if quote.change else None,
                change_pct=Decimal(str(quote.change_pct)) if quote.change_pct else None,
                updated_at=datetime.utcnow(),
            ).on_conflict_do_update(
                index_elements=['symbol'],
                set_={
                    'value': Decimal(str(quote.price)),
                    'change': Decimal(str(quote.change)) if quote.change else None,
                    'change_pct': Decimal(str(quote.change_pct)) if quote.change_pct else None,
                    'updated_at': datetime.utcnow(),
                }
            )
            await session.execute(stmt)

        except Exception as e:
            print(f"Error fetching index {symbol}: {e}")
            continue

    await session.commit()
    print(f"Updated {len(INDICES)} indices")


async def refresh_sector_data(session: AsyncSession, market_data: MarketDataProvider):
    """Refresh sector performance data using sector ETFs."""
    print(f"Refreshing sector performance data for {len(SECTOR_ETFS)} sectors...")

    for sector, etf_symbol in SECTOR_ETFS.items():
        try:
            quote = await market_data.quote(etf_symbol)

            # Use ETF change percentage as sector performance
            change_pct = quote.change_pct or Decimal("0")

            # Try to get market cap from ETF info, otherwise set to None
            market_cap = None

            stmt = insert(SectorPerformance).values(
                sector=sector,
                change_pct=Decimal(str(change_pct)),
                market_cap=market_cap,
                updated_at=datetime.utcnow(),
            ).on_conflict_do_update(
                index_elements=['sector'],
                set_={
                    'change_pct': Decimal(str(change_pct)),
                    'market_cap': market_cap,
                    'updated_at': datetime.utcnow(),
                }
            )
            await session.execute(stmt)

            print(f"  {sector} ({etf_symbol}): {change_pct}%")

        except Exception as e:
            print(f"Error fetching sector {sector} ({etf_symbol}): {e}")
            continue

    await session.commit()
    print(f"Updated {len(SECTOR_ETFS)} sectors")


async def main():
    """Main entry point for CronJob."""
    print(f"[{datetime.utcnow()}] Starting market data refresh...")

    # Create database connection
    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Create market data provider
    market_data = MarketDataProvider()

    async with async_session() as session:
        # Refresh all data sources
        await refresh_indices(session, market_data)
        await refresh_sector_data(session, market_data)
        await refresh_market_prices(session, market_data)

    await engine.dispose()
    print(f"[{datetime.utcnow()}] Market data refresh complete!")


if __name__ == "__main__":
    asyncio.run(main())
