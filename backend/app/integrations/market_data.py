"""Market data provider integration using yfinance."""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import asyncio
from functools import lru_cache
import time

import yfinance as yf
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


@dataclass
class Quote:
    """Stock quote data."""
    symbol: str
    price: Decimal
    change: Optional[Decimal] = None
    change_pct: Optional[Decimal] = None
    volume: Optional[int] = None
    name: Optional[str] = None
    sector: Optional[str] = None


@dataclass
class HistoricalPrice:
    """Historical price data point."""
    date: str
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int


class MarketDataProvider:
    """Market data provider using Yahoo Finance."""

    def __init__(self):
        self.timeout = settings.market_data.request_timeout_seconds

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=5),
    )
    async def quote(self, symbol: str) -> Quote:
        """
        Get current quote for a symbol.

        Uses historical data approach which is more reliable than
        the info/fast_info endpoints that are prone to rate limiting.
        """
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, self._fetch_ticker, symbol)

        try:
            # Get recent historical data (most reliable method)
            # Using 5d period to get current and previous close
            hist = await loop.run_in_executor(
                None,
                lambda: ticker.history(period='5d', timeout=10)
            )

            if hist.empty:
                raise ValueError(f"No data available for {symbol}")

            # Get latest price
            latest = hist.iloc[-1]
            price = float(latest['Close'])
            volume = int(latest['Volume']) if 'Volume' in hist.columns else None

            # Calculate change if we have at least 2 data points
            change = None
            change_pct = None
            if len(hist) >= 2:
                prev_close = float(hist.iloc[-2]['Close'])
                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close != 0 else 0

            # Try to get name and sector (optional, may fail)
            name = None
            sector = None
            try:
                # Add small delay to avoid rate limiting
                await asyncio.sleep(0.5)
                info = await loop.run_in_executor(None, lambda: ticker.info)
                name = info.get('shortName') or info.get('longName')
                sector = info.get('sector')
            except Exception as e:
                # Don't fail the whole request if we can't get metadata
                print(f"Could not fetch metadata for {symbol}: {type(e).__name__}")
                pass

            return Quote(
                symbol=symbol.upper(),
                price=Decimal(str(price)),
                change=Decimal(str(change)) if change is not None else None,
                change_pct=Decimal(str(change_pct)) if change_pct is not None else None,
                volume=volume,
                name=name,
                sector=sector,
            )

        except Exception as e:
            print(f"Error fetching quote for {symbol}: {type(e).__name__}: {e}")
            raise

    async def batch_quotes(self, symbols: list[str]) -> dict[str, Quote]:
        """
        Get quotes for multiple symbols.

        Adds delays between requests to avoid rate limiting.
        """
        results = {}

        for i, symbol in enumerate(symbols):
            try:
                # Add delay between requests to avoid rate limiting
                if i > 0:
                    await asyncio.sleep(1)

                quote = await self.quote(symbol)
                results[symbol.upper()] = quote
            except Exception as e:
                print(f"Error fetching {symbol} in batch: {e}")
                continue

        return results

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=5),
    )
    async def historical(
        self,
        symbol: str,
        period: str = "1mo",
        interval: str = "1d",
    ) -> list[HistoricalPrice]:
        """Get historical price data."""
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, self._fetch_ticker, symbol)

        hist = await loop.run_in_executor(
            None,
            lambda: ticker.history(period=period, interval=interval, timeout=10),
        )

        prices = []
        for date, row in hist.iterrows():
            prices.append(
                HistoricalPrice(
                    date=date.strftime("%Y-%m-%d"),
                    open=Decimal(str(row["Open"])),
                    high=Decimal(str(row["High"])),
                    low=Decimal(str(row["Low"])),
                    close=Decimal(str(row["Close"])),
                    volume=int(row["Volume"]),
                )
            )
        return prices

    def _fetch_ticker(self, symbol: str) -> yf.Ticker:
        """Synchronous ticker fetch for thread executor."""
        return yf.Ticker(symbol)


@lru_cache()
def get_market_data_provider() -> MarketDataProvider:
    """Get cached market data provider instance."""
    return MarketDataProvider()
