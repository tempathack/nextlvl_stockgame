"""
Daily fetch of S&P 500 historical data for Technical Analysis.
Run once per day to update historical daily data with technical indicators.
"""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import pandas as pd
import numpy as np
import yfinance as yf
import httpx
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.sp500 import SP500_TICKERS, SP500Stock, StockDailyHistory

settings = get_settings()


def calculate_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate comprehensive technical indicators for daily data."""
    if df.empty:
        return df

    # Simple Moving Averages
    df['sma_5'] = df['Close'].rolling(window=5, min_periods=1).mean()
    df['sma_10'] = df['Close'].rolling(window=10, min_periods=1).mean()
    df['sma_20'] = df['Close'].rolling(window=20, min_periods=1).mean()
    df['sma_50'] = df['Close'].rolling(window=50, min_periods=1).mean()
    df['sma_200'] = df['Close'].rolling(window=200, min_periods=1).mean()

    # Exponential Moving Averages
    df['ema_12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['ema_26'] = df['Close'].ewm(span=26, adjust=False).mean()

    # RSI 14
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=14, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
    rs = gain / loss
    df['rsi_14'] = 100 - (100 / (1 + rs))
    df['rsi_14'] = df['rsi_14'].replace([np.inf, -np.inf], np.nan)

    # MACD
    df['macd'] = df['ema_12'] - df['ema_26']
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_histogram'] = df['macd'] - df['macd_signal']

    # Bollinger Bands (20-day, 2 std)
    df['bollinger_middle'] = df['Close'].rolling(window=20, min_periods=1).mean()
    std_20 = df['Close'].rolling(window=20, min_periods=1).std()
    df['bollinger_upper'] = df['bollinger_middle'] + (std_20 * 2)
    df['bollinger_lower'] = df['bollinger_middle'] - (std_20 * 2)

    # ATR (Average True Range) 14
    high_low = df['High'] - df['Low']
    high_close = (df['High'] - df['Close'].shift()).abs()
    low_close = (df['Low'] - df['Close'].shift()).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df['atr_14'] = true_range.rolling(window=14, min_periods=1).mean()

    # OBV (On-Balance Volume)
    obv = [0]
    for i in range(1, len(df)):
        if df['Close'].iloc[i] > df['Close'].iloc[i - 1]:
            obv.append(obv[-1] + df['Volume'].iloc[i])
        elif df['Close'].iloc[i] < df['Close'].iloc[i - 1]:
            obv.append(obv[-1] - df['Volume'].iloc[i])
        else:
            obv.append(obv[-1])
    df['obv'] = obv

    # VWAP (Volume Weighted Average Price) - cumulative for the period
    df['vwap'] = (df['Volume'] * (df['High'] + df['Low'] + df['Close']) / 3).cumsum() / df['Volume'].cumsum()

    # Daily change
    df['change'] = df['Close'] - df['Close'].shift(1)
    df['change_pct'] = (df['change'] / df['Close'].shift(1)) * 100

    return df


async def fetch_chart_httpx(symbol: str, range_str: str, interval: str, client: httpx.AsyncClient):
    """Fetch raw chart data from Yahoo Finance via HTTPX (faster than yfinance)."""
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
        "Date": pd.to_datetime(timestamps, unit="s").date,
        "Open": quote.get("open", []),
        "High": quote.get("high", []),
        "Low": quote.get("low", []),
        "Close": quote.get("close", []),
        "Volume": quote.get("volume", []),
    })
    df = df.dropna(subset=["Close"])  # drop rows with missing close
    return df


async def fetch_daily_history_for_symbol(symbol: str, period: str = "2y") -> list[dict]:
    """Fetch daily historical data for a single symbol with 2 years of data."""
    loop = asyncio.get_event_loop()

    range_str = "2y" if period == "2y" else "1mo"
    df = None

    # Fast path via HTTPX
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            df = await fetch_chart_httpx(symbol, range_str=range_str, interval="1d", client=client)
    except Exception:
        df = None

    try:
        if df is None:
            ticker = yf.Ticker(symbol)
            hist = await loop.run_in_executor(
                None,
                lambda: ticker.history(period=period, interval="1d", timeout=30)
            )
            df = hist.reset_index().rename(columns={"Date": "Date"})

        if df is None or df.empty:
            print(f"  {symbol}: No data available")
            return []

        # Calculate technical indicators
        df = df.rename(columns=str.title)
        df = df.rename(columns={"Date": "Date"})
        df = calculate_technical_indicators(df)

        records = []
        for _, row in df.iterrows():
            trade_date = row["Date"]
            if hasattr(trade_date, "date"):
                trade_date = trade_date.date()

            record = {
                'symbol': symbol,
                'date': trade_date,
                'open': Decimal(str(round(row['Open'], 4))),
                'high': Decimal(str(round(row['High'], 4))),
                'low': Decimal(str(round(row['Low'], 4))),
                'close': Decimal(str(round(row['Close'], 4))),
                'adj_close': Decimal(str(round(row['Close'], 4))),  # yfinance returns adjusted by default
                'volume': int(row['Volume']),
            }

            # Add technical indicators (handle NaN values)
            for col in ['sma_5', 'sma_10', 'sma_20', 'sma_50', 'sma_200', 'ema_12', 'ema_26',
                        'rsi_14', 'macd', 'macd_signal', 'macd_histogram',
                        'bollinger_upper', 'bollinger_middle', 'bollinger_lower',
                        'atr_14', 'vwap', 'change', 'change_pct']:
                if col in row and pd.notna(row[col]) and not np.isinf(row[col]):
                    record[col] = Decimal(str(round(float(row[col]), 4)))
                else:
                    record[col] = None

            # OBV is integer
            if 'obv' in row and pd.notna(row['obv']):
                record['obv'] = int(row['obv'])
            else:
                record['obv'] = None

            records.append(record)

        return records

    except Exception as e:
        print(f"  Error fetching {symbol}: {type(e).__name__}: {e}")
        return []


async def upsert_daily_records(session: AsyncSession, records: list[dict]):
    """Upsert daily historical records into database."""
    for record in records:
        stmt = insert(StockDailyHistory).values(**record).on_conflict_do_update(
            constraint='uq_stock_daily_symbol_date',
            set_={k: v for k, v in record.items() if k not in ['symbol', 'date']}
        )
        await session.execute(stmt)


async def update_stock_metadata(session: AsyncSession, symbol: str):
    """Update stock metadata after fetching."""
    try:
        loop = asyncio.get_event_loop()
        ticker = yf.Ticker(symbol)
        info = await loop.run_in_executor(None, lambda: ticker.info)

        stmt = insert(SP500Stock).values(
            symbol=symbol,
            name=info.get('shortName') or info.get('longName'),
            sector=info.get('sector'),
            industry=info.get('industry'),
            market_cap=info.get('marketCap'),
            is_active=True,
            last_daily_fetch=datetime.utcnow(),
        ).on_conflict_do_update(
            index_elements=['symbol'],
            set_={
                'name': info.get('shortName') or info.get('longName'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'market_cap': info.get('marketCap'),
                'last_daily_fetch': datetime.utcnow(),
            }
        )
        await session.execute(stmt)
    except Exception as e:
        print(f"  Could not update metadata for {symbol}: {e}")


async def daily_sp500_fetch(full_refresh: bool = False):
    """
    Daily fetch of S&P 500 historical data.

    Args:
        full_refresh: If True, fetch 2 years of data. If False, fetch only recent data.
    """
    start_time = datetime.utcnow()
    print(f"[{start_time}] Starting daily S&P 500 historical data fetch...")
    print(f"Mode: {'FULL REFRESH (2 years)' if full_refresh else 'INCREMENTAL (30 days)'}")
    print(f"Processing {len(SP500_TICKERS)} stocks...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    period = "2y" if full_refresh else "1mo"
    batch_size = 5  # Process 5 stocks at a time to avoid rate limiting
    total_records = 0
    successful_stocks = 0
    failed_stocks = []

    async with async_session() as session:
        for i in range(0, len(SP500_TICKERS), batch_size):
            batch = SP500_TICKERS[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (len(SP500_TICKERS) + batch_size - 1) // batch_size
            print(f"\nBatch {batch_num}/{total_batches}: {batch}")

            for symbol in batch:
                try:
                    records = await fetch_daily_history_for_symbol(symbol, period=period)
                    if records:
                        await upsert_daily_records(session, records)
                        await session.commit()
                        total_records += len(records)
                        successful_stocks += 1
                        print(f"  {symbol}: {len(records)} daily records")

                        # Update metadata (only on full refresh to save API calls)
                        if full_refresh:
                            await update_stock_metadata(session, symbol)
                            await session.commit()
                    else:
                        failed_stocks.append(symbol)

                    # Small delay between symbols
                    await asyncio.sleep(0.3)

                except Exception as e:
                    print(f"  {symbol}: FAILED - {e}")
                    failed_stocks.append(symbol)
                    await session.rollback()

            # Longer delay between batches
            await asyncio.sleep(1)

    await engine.dispose()

    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'=' * 60}")
    print(f"Daily fetch complete!")
    print(f"Duration: {duration:.1f} seconds")
    print(f"Successful: {successful_stocks}/{len(SP500_TICKERS)} stocks")
    print(f"Total records: {total_records}")
    if failed_stocks:
        print(f"Failed stocks: {failed_stocks}")
    print(f"[{end_time}]")


async def cleanup_old_daily_data(days_to_keep: int = 730):
    """Remove daily data older than specified days (default 2 years)."""
    print(f"Cleaning up daily data older than {days_to_keep} days...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    cutoff_date = datetime.utcnow().date() - timedelta(days=days_to_keep)

    async with async_session() as session:
        stmt = delete(StockDailyHistory).where(StockDailyHistory.date < cutoff_date)
        result = await session.execute(stmt)
        await session.commit()
        print(f"Deleted {result.rowcount} old daily records")

    await engine.dispose()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--full":
            asyncio.run(daily_sp500_fetch(full_refresh=True))
        elif sys.argv[1] == "--cleanup":
            asyncio.run(cleanup_old_daily_data())
        else:
            print("Usage: python -m app.tasks.sp500_daily_fetch [--full|--cleanup]")
    else:
        # Default: incremental daily update
        asyncio.run(daily_sp500_fetch(full_refresh=False))
