"""Seed script to create users from old stock game with initial positions."""

import asyncio
import sys
from datetime import datetime, date
from decimal import Decimal

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent to path for imports
sys.path.insert(0, "/app")

from app.db.session import AsyncSessionLocal
from app.models.user import User, Profile
from app.models.portfolio import Portfolio, Position
from app.models.stock import StockDailyHistory

# Game start date - FIXED DATE
GAME_START_DATE = date(2025, 12, 10)


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly (bypasses passlib compatibility issues)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Trading fee rate: 0.1%
TRADING_FEE_RATE = Decimal("0.001")

# Starting capital
STARTING_CAPITAL = Decimal("100000")

# Unique passwords for each user (more secure than predictable patterns)
USER_PASSWORDS = {
    "cheng": "Dragon88Steel!",
    "phil": "Phoenix42Rise!",
    "jan": "Nordic7Thunder!",
    "flo": "Alpine3Summit!",
    "michi": "Tokyo9Drift!",
    "tempa": "Quantum5Leap!",
    "tuana": "Nebula6Star!",
}

# Portfolio allocations from old stock game
PORTFOLIOS = {
    "cheng": {
        "INOD": 0.05,
        "CRDO": 0.05,
        "SMTC": 0.05,
        "CRNC": 0.05,
        "CLS": 0.05,
        "GE": 0.05,
        "AVGO": 0.05,
        "NBIS": 0.05,
        "HIMS": 0.05,
        "TCEHY": 0.05,
        "TSLA": 0.05,
        "KO": 0.05,
        "BRK-B": 0.05,
        "PYPL": 0.05,
        "DIS": 0.05,
        "ABNB": 0.05,
        "CEG": 0.05,
        "LEU": 0.05,
        "CRM": 0.05,
        "VRT": 0.05,
    },
    "phil": {
        "GOOGL": 0.05,
        "AMZN": 0.10,
        "AAPL": 0.05,
        "META": 0.15,
        "MSFT": 0.10,
        "LMT": 0.10,
        "PYPL": 0.05,
        "NOC": 0.05,
        "WMT": 0.10,
        "6503.T": 0.10,  # May not work - Tokyo Stock Exchange
        "ORCL": 0.05,
        "JPM": 0.10,
    },
    "jan": {
        "DE": 0.15,
        "META": 0.15,
        "BRK-B": 0.15,
        "V": 0.15,
        "NEE": 0.15,
        "600690.SS": 0.075,  # May not work - Shanghai Stock Exchange
        "1810.HK": 0.075,    # May not work - Hong Kong Exchange
        "FLEX": 0.05,
        "TER": 0.05,
    },
    "flo": {
        "NVO": 0.10,
        "NKE": 0.07,
        "LVMUY": 0.06,
        "UBER": 0.07,
        "COIN": 0.04,
        "XOM": 0.05,
        "NVDA": 0.05,
        "MELI": 0.05,
        "PYPL": 0.04,
        "ILU.AX": 0.03,      # May not work - Australian Exchange
        "VRTX": 0.04,
        "HYQ.DE": 0.04,      # May not work - German Exchange
        "BABA": 0.04,
        "BYDDY": 0.06,
        "ASML": 0.05,
        "DHL.DE": 0.05,      # May not work - German Exchange
        "BYW6.DE": 0.04,     # May not work - German Exchange
        "LHX": 0.03,
        "ZAL.DE": 0.04,      # May not work - German Exchange
        "BC8.DE": 0.05,      # May not work - German Exchange
    },
    "michi": {
        "FIX": 0.12,
        "NVO": 0.12,
        "WTKWY": 0.12,
        "BMI": 0.12,
        "AMZN": 0.12,
        "BN": 0.12,
        "MELI": 0.12,
        "WPM": 0.08,
        "VST": 0.08,
    },
    "tempa": {
        "CMG": 0.13,
        "META": 0.13,
        "XOM": 0.12,
        "CVX": 0.12,
        "NEE": 0.12,
        "DUK": 0.12,
        "SO": 0.11,
        "PG": 0.03,
        "JNJ": 0.03,
        "KO": 0.03,
        "PEP": 0.03,
        "VZ": 0.03,
    },
    "tuana": {
        "GOOGL": 0.10,
        "NVDA": 0.10,
        "AVGO": 0.10,
        "MSFT": 0.10,
        "ARM": 0.10,
        "ANET": 0.10,
        "TEM": 0.06667,
        "PL": 0.06667,
        "RKLB": 0.06667,
        "IBM.F": 0.05,       # May not work - Frankfurt Exchange
        "ORCL": 0.05,
        "VST": 0.05,
        "BTI": 0.05,
    },
}


async def get_historical_price(session: AsyncSession, symbol: str, target_date: date) -> Decimal | None:
    """Fetch historical price for a symbol from database, returns None if unavailable."""
    try:
        # Try to get price from stock_daily_history table
        result = await session.execute(
            select(StockDailyHistory)
            .where(StockDailyHistory.symbol == symbol.upper())
            .where(StockDailyHistory.date <= target_date)
            .order_by(StockDailyHistory.date.desc())
            .limit(1)
        )
        history = result.scalar_one_or_none()
        if history:
            return history.close
        print(f"  [SKIP] No historical price for {symbol} on {target_date}")
        return None
    except Exception as e:
        print(f"  [SKIP] Could not fetch price for {symbol}: {e}")
        return None


async def seed_user(
    session: AsyncSession,
    username: str,
    allocations: dict[str, float],
) -> None:
    """Create a single user with their portfolio positions."""
    print(f"\n{'='*60}")
    print(f"Creating user: {username}")
    print(f"{'='*60}")

    # Check if user already exists
    existing = await session.execute(
        select(User).where(User.username == username)
    )
    if existing.scalar_one_or_none():
        print(f"  [SKIP] User {username} already exists")
        return

    # Create user
    password = USER_PASSWORDS[username]
    user = User(
        username=username,
        email=f"{username}@stockgame.local",
        hashed_password=hash_password(password),
        is_active=True,
        is_superuser=False,
    )
    session.add(user)
    await session.flush()  # Get user.id

    # Create profile
    profile = Profile(
        user_id=user.id,
        display_name=username.capitalize(),
    )
    session.add(profile)

    # Create portfolio
    portfolio = Portfolio(
        user_id=user.id,
        cash_balance=STARTING_CAPITAL,
        equity_value=Decimal("0"),
        total_fees_paid=Decimal("0"),
    )
    session.add(portfolio)
    await session.flush()  # Get portfolio.id

    print(f"  Created user: {username} (password: {password})")
    print(f"  Portfolio ID: {portfolio.id}")
    print(f"  Starting capital: ${STARTING_CAPITAL:,.2f}")
    print(f"\n  Creating positions:")

    total_invested = Decimal("0")
    total_fees = Decimal("0")
    positions_created = 0

    for symbol, allocation_pct in allocations.items():
        # Get historical price from game start date
        price = await get_historical_price(session, symbol, GAME_START_DATE)
        if price is None:
            continue

        # Calculate shares to buy
        target_value = STARTING_CAPITAL * Decimal(str(allocation_pct))
        shares = int(target_value / price)

        if shares <= 0:
            print(f"  [SKIP] {symbol}: price ${price:.2f} too high for ${target_value:.2f} allocation")
            continue

        # Calculate actual investment and fee
        actual_value = Decimal(str(shares)) * price
        fee = actual_value * TRADING_FEE_RATE
        total_cost = actual_value + fee

        # Create position
        position = Position(
            portfolio_id=portfolio.id,
            symbol=symbol.upper(),
            quantity=Decimal(str(shares)),
            average_price=price,
            last_mark_price=price,
            is_short=False,
        )
        session.add(position)

        total_invested += actual_value
        total_fees += fee
        positions_created += 1

        print(f"    {symbol}: {shares} shares @ ${price:.2f} = ${actual_value:,.2f} (fee: ${fee:.2f})")

    # Update portfolio cash balance
    portfolio.cash_balance = STARTING_CAPITAL - total_invested - total_fees
    portfolio.equity_value = total_invested
    portfolio.total_fees_paid = total_fees

    print(f"\n  Summary for {username}:")
    print(f"    Positions created: {positions_created}/{len(allocations)}")
    print(f"    Total invested: ${total_invested:,.2f}")
    print(f"    Total fees: ${total_fees:,.2f}")
    print(f"    Remaining cash: ${portfolio.cash_balance:,.2f}")


async def seed_users() -> None:
    """Seed all users from the old stock game."""
    print("=" * 60)
    print("Stock Game User Seed Script")
    print("=" * 60)
    print(f"Game start date: {GAME_START_DATE}")
    print(f"Users to create: {', '.join(PORTFOLIOS.keys())}")
    print(f"Starting capital: ${STARTING_CAPITAL:,.2f}")

    async with AsyncSessionLocal() as session:
        for username, allocations in PORTFOLIOS.items():
            try:
                await seed_user(session, username, allocations)
            except Exception as e:
                print(f"  [ERROR] Failed to create {username}: {e}")
                await session.rollback()
                continue

        # Commit all changes
        await session.commit()
        print("\n" + "=" * 60)
        print("Seed complete!")
        print("=" * 60)

        # Print login credentials summary
        print("\nLogin Credentials:")
        print("-" * 40)
        for username, password in USER_PASSWORDS.items():
            print(f"  {username}: {password}")


if __name__ == "__main__":
    asyncio.run(seed_users())
