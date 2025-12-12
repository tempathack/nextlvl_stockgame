#!/usr/bin/env python3
"""
Data Migration Script for Stock Trading Game

Migrates users and portfolios from the existing Docker Compose setup
to the new Kubernetes PostgreSQL database.

Users to migrate: cheng, phil, jan, flo, michi, tempa, tuana
"""
import asyncio
import os
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert


# Source database (existing Docker Compose)
SOURCE_DB_URL = os.getenv(
    "SOURCE_DATABASE_URL",
    "postgresql://stock_game:stock_game@localhost:5432/stock_game"
)

# Target database (Kubernetes)
TARGET_DB_URL = os.getenv(
    "TARGET_DATABASE_URL",
    "postgresql+asyncpg://stock_game:change_me_in_production_123!@postgres-service:5432/stock_game"
)


async def get_source_users(source_engine) -> list[dict[str, Any]]:
    """Fetch all users from source database."""
    with source_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                u.id,
                u.email,
                u.hashed_password,
                u.is_active,
                u.is_superuser,
                u.created_at,
                u.updated_at,
                p.display_name,
                p.avatar_url,
                p.bio
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.email IN ('cheng', 'phil', 'jan', 'flo', 'michi', 'tempa', 'tuana')
               OR u.email LIKE '%@%'
        """))

        users = []
        for row in result:
            users.append({
                "id": row[0],
                "email": row[1],
                "hashed_password": row[2],
                "is_active": row[3],
                "is_superuser": row[4],
                "created_at": row[5],
                "updated_at": row[6],
                "display_name": row[7],
                "avatar_url": row[8],
                "bio": row[9],
            })
        return users


async def get_source_portfolios(source_engine) -> list[dict[str, Any]]:
    """Fetch all portfolios from source database."""
    with source_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                id,
                user_id,
                name,
                cash_balance,
                equity_value,
                created_at,
                updated_at,
                last_valuation_at
            FROM portfolios
        """))

        portfolios = []
        for row in result:
            portfolios.append({
                "id": row[0],
                "user_id": row[1],
                "name": row[2],
                "cash_balance": row[3],
                "equity_value": row[4],
                "created_at": row[5],
                "updated_at": row[6],
                "last_valuation_at": row[7],
            })
        return portfolios


async def get_source_positions(source_engine) -> list[dict[str, Any]]:
    """Fetch all positions from source database."""
    with source_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                id,
                portfolio_id,
                symbol,
                quantity,
                average_price,
                is_short,
                last_mark_price,
                created_at,
                updated_at
            FROM positions
        """))

        positions = []
        for row in result:
            positions.append({
                "id": row[0],
                "portfolio_id": row[1],
                "symbol": row[2],
                "quantity": row[3],
                "average_price": row[4],
                "is_short": row[5],
                "last_mark_price": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            })
        return positions


async def get_source_trade_orders(source_engine) -> list[dict[str, Any]]:
    """Fetch trade history from source database."""
    with source_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT
                id,
                portfolio_id,
                user_id,
                symbol,
                side,
                quantity,
                price,
                notional_value,
                status,
                submitted_at,
                executed_at
            FROM trade_orders
        """))

        orders = []
        for row in result:
            orders.append({
                "id": row[0],
                "portfolio_id": row[1],
                "user_id": row[2],
                "symbol": row[3],
                "side": row[4],
                "quantity": row[5],
                "price": row[6],
                "notional_value": row[7],
                "status": row[8],
                "submitted_at": row[9],
                "executed_at": row[10],
            })
        return orders


async def migrate_users(target_session: AsyncSession, users: list[dict]) -> dict[int, int]:
    """Migrate users to target database. Returns old_id -> new_id mapping."""
    id_mapping = {}

    for user in users:
        # Insert user
        result = await target_session.execute(text("""
            INSERT INTO users (email, hashed_password, is_active, is_superuser, created_at, updated_at)
            VALUES (:email, :hashed_password, :is_active, :is_superuser, :created_at, :updated_at)
            ON CONFLICT (email) DO UPDATE SET
                hashed_password = EXCLUDED.hashed_password,
                updated_at = EXCLUDED.updated_at
            RETURNING id
        """), {
            "email": user["email"],
            "hashed_password": user["hashed_password"],
            "is_active": user["is_active"],
            "is_superuser": user["is_superuser"],
            "created_at": user["created_at"] or datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        new_id = result.scalar_one()
        id_mapping[user["id"]] = new_id

        # Insert profile if display_name exists
        if user.get("display_name"):
            await target_session.execute(text("""
                INSERT INTO profiles (user_id, display_name, avatar_url, bio, created_at, updated_at)
                VALUES (:user_id, :display_name, :avatar_url, :bio, :created_at, :updated_at)
                ON CONFLICT (user_id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    avatar_url = EXCLUDED.avatar_url,
                    bio = EXCLUDED.bio,
                    updated_at = EXCLUDED.updated_at
            """), {
                "user_id": new_id,
                "display_name": user["display_name"],
                "avatar_url": user.get("avatar_url"),
                "bio": user.get("bio"),
                "created_at": user["created_at"] or datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })

    print(f"Migrated {len(users)} users")
    return id_mapping


async def migrate_portfolios(
    target_session: AsyncSession,
    portfolios: list[dict],
    user_id_mapping: dict[int, int]
) -> dict[int, int]:
    """Migrate portfolios to target database."""
    id_mapping = {}

    for portfolio in portfolios:
        new_user_id = user_id_mapping.get(portfolio["user_id"])
        if not new_user_id:
            print(f"Skipping portfolio {portfolio['id']} - user not migrated")
            continue

        result = await target_session.execute(text("""
            INSERT INTO portfolios (user_id, name, cash_balance, equity_value, created_at, updated_at, last_valuation_at)
            VALUES (:user_id, :name, :cash_balance, :equity_value, :created_at, :updated_at, :last_valuation_at)
            ON CONFLICT (user_id) DO UPDATE SET
                cash_balance = EXCLUDED.cash_balance,
                equity_value = EXCLUDED.equity_value,
                updated_at = EXCLUDED.updated_at,
                last_valuation_at = EXCLUDED.last_valuation_at
            RETURNING id
        """), {
            "user_id": new_user_id,
            "name": portfolio["name"] or "Main Portfolio",
            "cash_balance": portfolio["cash_balance"] or Decimal("100000"),
            "equity_value": portfolio["equity_value"] or Decimal("0"),
            "created_at": portfolio["created_at"] or datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_valuation_at": portfolio.get("last_valuation_at"),
        })
        new_id = result.scalar_one()
        id_mapping[portfolio["id"]] = new_id

    print(f"Migrated {len(id_mapping)} portfolios")
    return id_mapping


async def migrate_positions(
    target_session: AsyncSession,
    positions: list[dict],
    portfolio_id_mapping: dict[int, int]
) -> None:
    """Migrate positions to target database."""
    migrated = 0

    for position in positions:
        new_portfolio_id = portfolio_id_mapping.get(position["portfolio_id"])
        if not new_portfolio_id:
            continue

        await target_session.execute(text("""
            INSERT INTO positions (portfolio_id, symbol, quantity, average_price, is_short, last_mark_price, created_at, updated_at)
            VALUES (:portfolio_id, :symbol, :quantity, :average_price, :is_short, :last_mark_price, :created_at, :updated_at)
            ON CONFLICT (portfolio_id, symbol, is_short) DO UPDATE SET
                quantity = EXCLUDED.quantity,
                average_price = EXCLUDED.average_price,
                last_mark_price = EXCLUDED.last_mark_price,
                updated_at = EXCLUDED.updated_at
        """), {
            "portfolio_id": new_portfolio_id,
            "symbol": position["symbol"],
            "quantity": position["quantity"],
            "average_price": position["average_price"],
            "is_short": position.get("is_short", False),
            "last_mark_price": position.get("last_mark_price"),
            "created_at": position["created_at"] or datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        migrated += 1

    print(f"Migrated {migrated} positions")


async def migrate_trade_history(
    target_session: AsyncSession,
    orders: list[dict],
    portfolio_id_mapping: dict[int, int],
    user_id_mapping: dict[int, int]
) -> None:
    """Migrate trade history to target database."""
    migrated = 0

    for order in orders:
        new_portfolio_id = portfolio_id_mapping.get(order["portfolio_id"])
        new_user_id = user_id_mapping.get(order["user_id"])
        if not new_portfolio_id or not new_user_id:
            continue

        # Insert into trade_orders
        await target_session.execute(text("""
            INSERT INTO trade_orders (portfolio_id, user_id, symbol, side, quantity, price, notional_value, status, submitted_at, executed_at)
            VALUES (:portfolio_id, :user_id, :symbol, :side, :quantity, :price, :notional_value, :status, :submitted_at, :executed_at)
        """), {
            "portfolio_id": new_portfolio_id,
            "user_id": new_user_id,
            "symbol": order["symbol"],
            "side": order["side"],
            "quantity": order["quantity"],
            "price": order["price"],
            "notional_value": order["notional_value"],
            "status": order["status"],
            "submitted_at": order["submitted_at"],
            "executed_at": order.get("executed_at"),
        })

        # Also create activity record for executed trades
        if order.get("executed_at") and order["status"] == "settled":
            await target_session.execute(text("""
                INSERT INTO trade_activities (user_id, portfolio_id, display_name, symbol, side, quantity, price, total_value, executed_at)
                SELECT :user_id, :portfolio_id, COALESCE(p.display_name, 'Unknown'), :symbol, :side, :quantity, :price, :total_value, :executed_at
                FROM profiles p WHERE p.user_id = :user_id
            """), {
                "user_id": new_user_id,
                "portfolio_id": new_portfolio_id,
                "symbol": order["symbol"],
                "side": order["side"],
                "quantity": order["quantity"],
                "price": order["price"],
                "total_value": order["notional_value"],
                "executed_at": order["executed_at"],
            })

        migrated += 1

    print(f"Migrated {migrated} trade orders")


async def initialize_game_config(target_session: AsyncSession) -> None:
    """Initialize the 180-day game configuration."""
    now = datetime.utcnow()
    end_date = datetime(now.year, now.month, now.day)
    # Add 180 days
    from datetime import timedelta
    end_date = now + timedelta(days=180)

    await target_session.execute(text("""
        INSERT INTO game_configs (name, description, start_date, end_date, starting_capital, allow_short_selling, allow_borrowing, is_active, created_at, updated_at)
        VALUES (:name, :description, :start_date, :end_date, :starting_capital, :allow_short_selling, :allow_borrowing, :is_active, :created_at, :updated_at)
        ON CONFLICT (name) DO UPDATE SET
            end_date = EXCLUDED.end_date,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
    """), {
        "name": "180-Day Trading Competition",
        "description": "Compete to build the best portfolio over 180 days. Unlimited trading, short selling allowed, no borrowing.",
        "start_date": now,
        "end_date": end_date,
        "starting_capital": Decimal("100000"),
        "allow_short_selling": True,
        "allow_borrowing": False,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })

    print("Initialized game configuration")


async def main():
    """Main migration function."""
    print("=" * 60)
    print("STOCK TRADING GAME - DATA MIGRATION")
    print("=" * 60)
    print(f"Source: {SOURCE_DB_URL.split('@')[1] if '@' in SOURCE_DB_URL else SOURCE_DB_URL}")
    print(f"Target: {TARGET_DB_URL.split('@')[1] if '@' in TARGET_DB_URL else TARGET_DB_URL}")
    print("=" * 60)

    # Create engines
    source_engine = create_engine(SOURCE_DB_URL.replace("+asyncpg", ""))
    target_engine = create_async_engine(TARGET_DB_URL)

    async_session = sessionmaker(
        target_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    try:
        # Fetch source data
        print("\n[1/6] Fetching source data...")
        users = await get_source_users(source_engine)
        portfolios = await get_source_portfolios(source_engine)
        positions = await get_source_positions(source_engine)
        orders = await get_source_trade_orders(source_engine)

        print(f"  Found {len(users)} users")
        print(f"  Found {len(portfolios)} portfolios")
        print(f"  Found {len(positions)} positions")
        print(f"  Found {len(orders)} trade orders")

        async with async_session() as session:
            # Migrate users
            print("\n[2/6] Migrating users...")
            user_id_mapping = await migrate_users(session, users)

            # Migrate portfolios
            print("\n[3/6] Migrating portfolios...")
            portfolio_id_mapping = await migrate_portfolios(session, portfolios, user_id_mapping)

            # Migrate positions
            print("\n[4/6] Migrating positions...")
            await migrate_positions(session, positions, portfolio_id_mapping)

            # Migrate trade history
            print("\n[5/6] Migrating trade history...")
            await migrate_trade_history(session, orders, portfolio_id_mapping, user_id_mapping)

            # Initialize game config
            print("\n[6/6] Initializing game configuration...")
            await initialize_game_config(session)

            # Commit all changes
            await session.commit()

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE!")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: Migration failed - {e}")
        raise
    finally:
        source_engine.dispose()
        await target_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
