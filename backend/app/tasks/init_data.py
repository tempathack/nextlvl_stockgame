"""Initialize database with seed market data."""

import asyncio
from datetime import datetime
from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.market_data import MarketPrice, SectorPerformance, MarketIndex
from app.integrations.market_data import MarketDataProvider

settings = get_settings()

# Market indices to seed
INDICES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ Composite",
    "^DJI": "Dow Jones Industrial",
    "^VIX": "CBOE Volatility Index",
}

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

# Popular stocks to seed
POPULAR_STOCKS = [
    "AAPL",   # Apple
    "MSFT",   # Microsoft
    "GOOGL",  # Alphabet
    "AMZN",   # Amazon
    "NVDA",   # NVIDIA
    "META",   # Meta
    "TSLA",   # Tesla
    "BRK-B",  # Berkshire Hathaway
    "V",      # Visa
    "JNJ",    # Johnson & Johnson
    "WMT",    # Walmart
    "JPM",    # JPMorgan Chase
    "PG",     # Procter & Gamble
    "MA",     # Mastercard
    "UNH",    # UnitedHealth
    "HD",     # Home Depot
    "DIS",    # Disney
    "BAC",    # Bank of America
    "NFLX",   # Netflix
    "ADBE",   # Adobe
]


async def seed_indices(session: AsyncSession, market_data: MarketDataProvider):
    """Seed market indices."""
    print(f"\nSeeding {len(INDICES)} market indices...")

    for symbol, name in INDICES.items():
        try:
            print(f"  Fetching {symbol} ({name})...")
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
            print(f"    {symbol}: ${quote.price}")

        except Exception as e:
            print(f"    ERROR: {e}")
            continue

    await session.commit()
    print(f"Seeded {len(INDICES)} market indices")


async def seed_sectors(session: AsyncSession, market_data: MarketDataProvider):
    """Seed sector performance data."""
    print(f"\nSeeding {len(SECTOR_ETFS)} sectors...")

    for sector, etf_symbol in SECTOR_ETFS.items():
        try:
            print(f"  Fetching {sector} via {etf_symbol}...")
            quote = await market_data.quote(etf_symbol)

            change_pct = quote.change_pct or Decimal("0")

            stmt = insert(SectorPerformance).values(
                sector=sector,
                change_pct=Decimal(str(change_pct)),
                market_cap=None,
                updated_at=datetime.utcnow(),
            ).on_conflict_do_update(
                index_elements=['sector'],
                set_={
                    'change_pct': Decimal(str(change_pct)),
                    'updated_at': datetime.utcnow(),
                }
            )
            await session.execute(stmt)
            print(f"    {sector}: {change_pct}%")

        except Exception as e:
            print(f"    ERROR: {e}")
            continue

    await session.commit()
    print(f"Seeded {len(SECTOR_ETFS)} sectors")


async def seed_stocks(session: AsyncSession, market_data: MarketDataProvider):
    """Seed popular stock prices."""
    print(f"\nSeeding {len(POPULAR_STOCKS)} popular stocks...")

    for symbol in POPULAR_STOCKS:
        try:
            print(f"  Fetching {symbol}...")
            quote = await market_data.quote(symbol)

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
            print(f"    {symbol} ({quote.name}): ${quote.price}")

        except Exception as e:
            print(f"    ERROR: {e}")
            continue

    await session.commit()
    print(f"Seeded {len(POPULAR_STOCKS)} popular stocks")


async def main():
    """Main entry point for database initialization."""
    print(f"[{datetime.utcnow()}] Starting database initialization...")
    print("=" * 60)

    # Create database connection
    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Create market data provider
    market_data = MarketDataProvider()

    async with async_session() as session:
        # Seed data in order
        await seed_indices(session, market_data)
        await seed_sectors(session, market_data)
        await seed_stocks(session, market_data)

    await engine.dispose()

    print("=" * 60)
    print(f"[{datetime.utcnow()}] Database initialization complete!")
    print("\nYou can now start the backend server and the dashboard should show data.")


if __name__ == "__main__":
    asyncio.run(main())
