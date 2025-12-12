#!/usr/bin/env python3
"""Quick test to verify MarketDataProvider is working."""

import asyncio
import traceback
from app.integrations.market_data import MarketDataProvider


async def test_market_data():
    """Test fetching data from Yahoo Finance."""
    provider = MarketDataProvider()

    print("Testing MarketDataProvider...")
    print("=" * 60)

    # Test 1: Single quote
    print("\n1. Testing single quote (AAPL)...")
    try:
        quote = await provider.quote('AAPL')
        print(f"   SUCCESS: AAPL quote fetched")
        print(f"   Price: ${quote.price}")
        print(f"   Name: {quote.name}")
        print(f"   Change: {quote.change_pct}%")
        print(f"   Sector: {quote.sector}")
    except Exception as e:
        print(f"   ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        return False

    # Test 2: Index quote
    print("\n2. Testing index quote (^GSPC - S&P 500)...")
    try:
        quote = await provider.quote('^GSPC')
        print(f"   SUCCESS: S&P 500 quote fetched")
        print(f"   Price: ${quote.price}")
        print(f"   Change: {quote.change_pct}%")
    except Exception as e:
        print(f"   ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        return False

    # Test 3: ETF quote (for sectors)
    print("\n3. Testing ETF quote (XLK - Technology Sector)...")
    try:
        quote = await provider.quote('XLK')
        print(f"   SUCCESS: XLK quote fetched")
        print(f"   Price: ${quote.price}")
        print(f"   Change: {quote.change_pct}%")
    except Exception as e:
        print(f"   ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        return False

    print("\n" + "=" * 60)
    print("All tests passed! MarketDataProvider is working correctly.")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_market_data())
    exit(0 if success else 1)
