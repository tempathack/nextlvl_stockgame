"""
Hourly fetch of S&P 500 current prices.
Run every hour via CronJob to update real-time price data.
"""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import pandas as pd
import numpy as np
import yfinance as yf
import httpx
from sqlalchemy import select, delete, and_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.sp500 import SP500_TICKERS, SP500Stock, StockHourlyData
from app.models.market_data import MarketPrice

settings = get_settings()


def calculate_hourly_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate short-term indicators for hourly data."""
    if df.empty:
        return df

    # SMA 20 (20 hours)
    df['sma_20'] = df['Close'].rolling(window=20, min_periods=1).mean()

    # RSI 14
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=14, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
    rs = gain / loss
    df['rsi_14'] = 100 - (100 / (1 + rs))
    df['rsi_14'] = df['rsi_14'].replace([np.inf, -np.inf], np.nan)

    # VWAP
    df['vwap'] = (df['Volume'] * (df['High'] + df['Low'] + df['Close']) / 3).cumsum() / df['Volume'].cumsum()

    # Hourly change
    df['change'] = df['Close'] - df['Close'].shift(1)
    df['change_pct'] = (df['change'] / df['Close'].shift(1)) * 100

    return df


async def fetch_chart_httpx(symbol: str, range_str: str, interval: str, client: httpx.AsyncClient):
    """Fetch raw chart data from Yahoo Finance via HTTPX."""
    fetch_symbol = symbol.replace(".", "-")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{fetch_symbol}"
    params = {
        "range": range_str,
        "interval": interval,
        "includePrePost": "false",
    }

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    payload = resp.json()

    result = payload.get("chart", {}).get("result")
    if not result:
        raise ValueError(f"No chart result for {symbol}")

    chart = result[0]
    timestamps = chart.get("timestamp") or []
    indicators = chart.get("indicators", {}).get("quote", [])
    if not timestamps or not indicators:
        raise ValueError(f"No quote data for {symbol}")

    quote = indicators[0]
    df = pd.DataFrame({
        "Timestamp": pd.to_datetime(timestamps, unit="s"),
        "Open": quote.get("open", []),
        "High": quote.get("high", []),
        "Low": quote.get("low", []),
        "Close": quote.get("close", []),
        "Volume": quote.get("volume", []),
    })
    df = df.dropna(subset=["Close"])
    return df


async def fetch_hourly_data_for_symbol(symbol: str, period: str = "7d") -> list[dict]:
    """Fetch hourly data for a single symbol."""
    loop = asyncio.get_event_loop()
    df = None

    # Fast path via HTTPX
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            df = await fetch_chart_httpx(symbol, range_str=period, interval="1h", client=client)
    except Exception:
        df = None

    try:
        if df is None:
            ticker = yf.Ticker(symbol)
            hist = await loop.run_in_executor(
                None,
                lambda: ticker.history(period=period, interval="1h", timeout=15)
            )
            df = hist.reset_index().rename(columns={"Datetime": "Timestamp"})

        if df is None or df.empty:
            return []

        # Calculate indicators
        df = df.rename(columns=str.title)
        df = calculate_hourly_indicators(df)

        records = []
        for _, row in df.iterrows():
            ts = row["Timestamp"]
            timestamp = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts

            record = {
                'symbol': symbol,
                'timestamp': timestamp,
                'open': Decimal(str(round(row['Open'], 4))),
                'high': Decimal(str(round(row['High'], 4))),
                'low': Decimal(str(round(row['Low'], 4))),
                'close': Decimal(str(round(row['Close'], 4))),
                'volume': int(row['Volume']),
            }

            # Add indicators
            for col in ['sma_20', 'rsi_14', 'vwap', 'change', 'change_pct']:
                if col in row and pd.notna(row[col]) and not np.isinf(row[col]):
                    record[col] = Decimal(str(round(float(row[col]), 4)))
                else:
                    record[col] = None

            records.append(record)

        return records

    except Exception as e:
        print(f"  Error fetching hourly {symbol}: {type(e).__name__}: {e}")
        return []


async def fetch_current_price_for_symbol(symbol: str) -> dict | None:
    """Fetch just the current price for a symbol (for MarketPrice table)."""
    loop = asyncio.get_event_loop()

    try:
        ticker = yf.Ticker(symbol)
        hist = await loop.run_in_executor(
            None,
            lambda: ticker.history(period="5d", interval="1d", timeout=10)
        )

        if hist.empty:
            return None

        latest = hist.iloc[-1]
        price = float(latest['Close'])
        volume = int(latest['Volume']) if 'Volume' in hist.columns else None

        change = None
        change_pct = None
        if len(hist) >= 2:
            prev_close = float(hist.iloc[-2]['Close'])
            change = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close != 0 else 0

        # Try to get metadata
        name = None
        sector = None
        market_cap = None
        try:
            info = await loop.run_in_executor(None, lambda: ticker.info)
            name = info.get('shortName') or info.get('longName')
            sector = info.get('sector')
            market_cap = info.get('marketCap')
        except:
            pass

        return {
            'symbol': symbol,
            'price': Decimal(str(round(price, 4))),
            'change': Decimal(str(round(change, 4))) if change else None,
            'change_pct': Decimal(str(round(change_pct, 4))) if change_pct else None,
            'volume': volume,
            'name': name,
            'sector': sector,
            'market_cap': market_cap,
            'updated_at': datetime.utcnow(),
        }

    except Exception as e:
        print(f"  Error fetching current price for {symbol}: {e}")
        return None


async def upsert_hourly_records(session: AsyncSession, records: list[dict]):
    """Upsert hourly records into database."""
    for record in records:
        stmt = insert(StockHourlyData).values(**record).on_conflict_do_update(
            constraint='uq_stock_hourly_symbol_timestamp',
            set_={k: v for k, v in record.items() if k not in ['symbol', 'timestamp']}
        )
        await session.execute(stmt)


async def upsert_market_price(session: AsyncSession, data: dict):
    """Upsert into MarketPrice table."""
    stmt = insert(MarketPrice).values(**data).on_conflict_do_update(
        index_elements=['symbol'],
        set_={k: v for k, v in data.items() if k != 'symbol'}
    )
    await session.execute(stmt)


async def hourly_sp500_fetch(include_hourly_history: bool = True):
    """
    Hourly fetch of S&P 500 data.

    Args:
        include_hourly_history: If True, also fetch full hourly history (7 days).
                               If False, only fetch current prices for MarketPrice.
    """
    start_time = datetime.utcnow()
    print(f"[{start_time}] Starting hourly S&P 500 data fetch...")
    print(f"Mode: {'FULL (prices + hourly history)' if include_hourly_history else 'PRICES ONLY'}")
    print(f"Processing {len(SP500_TICKERS)} stocks...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    batch_size = 10 if include_hourly_history else 20
    total_price_updates = 0
    total_hourly_records = 0
    failed_stocks = []

    async with async_session() as session:
        for i in range(0, len(SP500_TICKERS), batch_size):
            batch = SP500_TICKERS[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(SP500_TICKERS) + batch_size - 1) // batch_size

            if batch_num % 5 == 1:  # Print progress every 5 batches
                print(f"Batch {batch_num}/{total_batches}...")

            for symbol in batch:
                try:
                    # Always update current price in MarketPrice
                    price_data = await fetch_current_price_for_symbol(symbol)
                    if price_data:
                        await upsert_market_price(session, price_data)
                        total_price_updates += 1

                    # Optionally update hourly history
                    if include_hourly_history:
                        hourly_records = await fetch_hourly_data_for_symbol(symbol, period="7d")
                        if hourly_records:
                            # Only keep recent records to avoid too much data
                            recent_records = hourly_records[-168:]  # Last 7 days (168 hours)
                            await upsert_hourly_records(session, recent_records)
                            total_hourly_records += len(recent_records)

                    # Small delay
                    await asyncio.sleep(0.2)

                except Exception as e:
                    print(f"  {symbol}: FAILED - {e}")
                    failed_stocks.append(symbol)

            # Commit after each batch
            await session.commit()

            # Delay between batches
            await asyncio.sleep(0.5)

    await engine.dispose()

    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'=' * 60}")
    print(f"Hourly fetch complete!")
    print(f"Duration: {duration:.1f} seconds")
    print(f"Price updates: {total_price_updates}")
    if include_hourly_history:
        print(f"Hourly records: {total_hourly_records}")
    if failed_stocks:
        print(f"Failed: {len(failed_stocks)} stocks")
    print(f"[{end_time}]")


async def cleanup_old_hourly_data(hours_to_keep: int = 168):
    """Remove hourly data older than specified hours (default 7 days = 168 hours)."""
    print(f"Cleaning up hourly data older than {hours_to_keep} hours...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    cutoff_time = datetime.utcnow() - timedelta(hours=hours_to_keep)

    async with async_session() as session:
        stmt = delete(StockHourlyData).where(StockHourlyData.timestamp < cutoff_time)
        result = await session.execute(stmt)
        await session.commit()
        print(f"Deleted {result.rowcount} old hourly records")

    await engine.dispose()


async def quick_price_update():
    """Quick update of just current prices (no hourly history)."""
    await hourly_sp500_fetch(include_hourly_history=False)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--prices-only":
            asyncio.run(quick_price_update())
        elif sys.argv[1] == "--cleanup":
            asyncio.run(cleanup_old_hourly_data())
        elif sys.argv[1] == "--full":
            asyncio.run(hourly_sp500_fetch(include_hourly_history=True))
        else:
            print("Usage: python -m app.tasks.sp500_hourly_fetch [--prices-only|--full|--cleanup]")
    else:
        # Default: full hourly update
        asyncio.run(hourly_sp500_fetch(include_hourly_history=True))
