"""Admin API routes - PROTECTED (superuser only)."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.models.game_config import GameConfig
from app.models.portfolio import Portfolio, Position, TradeOrder, MetricSnapshot
from app.models.activity import TradeActivity
from app.schemas.admin import (
    GameConfigRead,
    GameConfigCreate,
    GameConfigUpdate,
    GameResetRequest,
    GameResetResponse,
    GameStatusResponse,
)
from app.integrations.market_data import MarketDataProvider

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require superuser privileges."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user


@router.get("/game-config", response_model=GameConfigRead)
async def get_game_config(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameConfigRead:
    """Get current active game configuration."""
    stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active game configuration found",
        )

    return GameConfigRead.model_validate(config)


@router.post(
    "/game-config",
    response_model=GameConfigRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_game_config(
    payload: GameConfigCreate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameConfigRead:
    """Create a new game configuration. Deactivates any existing active configs."""
    # Deactivate any existing active configs
    stmt = select(GameConfig).where(GameConfig.is_active == True)
    result = await session.execute(stmt)
    existing = result.scalars().all()
    for config in existing:
        config.is_active = False

    # Create new config
    config = GameConfig(
        name=payload.name,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        starting_capital=payload.starting_capital,
        allow_short_selling=payload.allow_short_selling,
        allow_borrowing=payload.allow_borrowing,
        is_active=True,
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)

    return GameConfigRead.model_validate(config)


@router.put("/game-config", response_model=GameConfigRead)
async def update_game_config(
    payload: GameConfigUpdate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameConfigRead:
    """Update active game configuration."""
    stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active game configuration found. Create one first.",
        )

    # Update fields if provided
    if payload.name is not None:
        config.name = payload.name
    if payload.description is not None:
        config.description = payload.description
    if payload.start_date is not None:
        config.start_date = payload.start_date
    if payload.end_date is not None:
        config.end_date = payload.end_date
    if payload.starting_capital is not None:
        config.starting_capital = payload.starting_capital
    if payload.allow_short_selling is not None:
        config.allow_short_selling = payload.allow_short_selling
    if payload.allow_borrowing is not None:
        config.allow_borrowing = payload.allow_borrowing

    await session.commit()
    await session.refresh(config)

    return GameConfigRead.model_validate(config)


@router.get("/game-status", response_model=GameStatusResponse)
async def get_game_status(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameStatusResponse:
    """Get current game status with statistics."""
    stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()

    # Count participants
    participant_count = await session.scalar(select(func.count(Portfolio.id))) or 0

    if not config:
        return GameStatusResponse(
            is_active=False,
            is_running=False,
            days_remaining=0,
            start_date=None,
            end_date=None,
            starting_capital=100000.0,
            total_participants=participant_count,
        )

    return GameStatusResponse(
        is_active=config.is_active,
        is_running=config.is_running,
        days_remaining=config.days_remaining,
        start_date=config.start_date,
        end_date=config.end_date,
        starting_capital=float(config.starting_capital),
        total_participants=participant_count,
    )


@router.post("/reset-game", response_model=GameResetResponse)
async def reset_game(
    payload: GameResetRequest,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameResetResponse:
    """
    Reset game: Keep users, reset portfolios to starting_capital,
    clear all positions, trades, and activity feed.

    WARNING: This action cannot be undone!
    """
    if not payload.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must confirm reset by setting 'confirm' to true",
        )

    # Get starting capital from config
    stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()

    starting_capital = config.starting_capital if config else Decimal("100000.00")

    # Count records before deletion
    portfolios_stmt = select(Portfolio)
    portfolios_result = await session.execute(portfolios_stmt)
    portfolios = portfolios_result.scalars().all()
    portfolio_count = len(portfolios)

    positions_count = await session.scalar(select(func.count(Position.id))) or 0
    trades_count = await session.scalar(select(func.count(TradeOrder.id))) or 0
    activities_count = await session.scalar(select(func.count(TradeActivity.id))) or 0

    # Delete all positions
    await session.execute(delete(Position))

    # Delete all trade orders
    await session.execute(delete(TradeOrder))

    # Delete all trade activities
    await session.execute(delete(TradeActivity))

    # Delete all metric snapshots
    await session.execute(delete(MetricSnapshot))

    # Reset all portfolios to starting capital
    for portfolio in portfolios:
        portfolio.cash_balance = starting_capital
        portfolio.equity_value = Decimal("0.00")
        portfolio.total_fees_paid = Decimal("0.00")
        portfolio.last_valuation_at = None

    await session.commit()

    return GameResetResponse(
        success=True,
        message=f"Game reset successfully. {portfolio_count} portfolios reset to ${starting_capital:.2f}",
        portfolios_reset=portfolio_count,
        positions_cleared=positions_count,
        trades_cleared=trades_count,
        activities_cleared=activities_count,
        starting_capital=float(starting_capital),
    )


@router.post("/revalue-portfolios")
async def revalue_portfolios(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Revalue all portfolios with current market prices.

    PUBLIC ENDPOINT - No authentication required.
    This fetches current prices for all positions and updates:
    - Position.last_mark_price with current market price
    - Portfolio.equity_value with sum of position values
    - Portfolio.last_valuation_at with current timestamp
    """
    market_data = MarketDataProvider()

    # Get all positions grouped by symbol
    positions_stmt = select(Position)
    result = await session.execute(positions_stmt)
    all_positions = result.scalars().all()

    # Get unique symbols
    symbols = list(set(pos.symbol for pos in all_positions))

    if not symbols:
        return {
            "success": True,
            "message": "No positions to revalue",
            "symbols_updated": 0,
            "positions_updated": 0,
            "portfolios_updated": 0,
        }

    # Fetch current prices for all symbols
    prices: dict[str, Decimal] = {}
    errors: list[str] = []

    for symbol in symbols:
        try:
            quote = await market_data.quote(symbol)
            prices[symbol] = quote.price
        except Exception as e:
            errors.append(f"{symbol}: {str(e)}")

    # Update positions with new prices
    positions_updated = 0
    for pos in all_positions:
        if pos.symbol in prices:
            pos.last_mark_price = prices[pos.symbol]
            positions_updated += 1

    # Get all portfolios with their positions
    portfolios_stmt = (
        select(Portfolio)
        .options(selectinload(Portfolio.positions))
    )
    result = await session.execute(portfolios_stmt)
    portfolios = result.scalars().all()

    # Recalculate equity value for each portfolio
    portfolios_updated = 0
    for portfolio in portfolios:
        equity_value = Decimal("0")
        for pos in portfolio.positions:
            current_price = pos.last_mark_price if pos.last_mark_price else pos.average_price
            position_value = Decimal(str(pos.quantity)) * Decimal(str(current_price))
            equity_value += position_value

        portfolio.equity_value = equity_value
        portfolio.last_valuation_at = datetime.utcnow()
        portfolios_updated += 1

    await session.commit()

    return {
        "success": True,
        "message": f"Revalued {positions_updated} positions across {portfolios_updated} portfolios",
        "symbols_updated": len(prices),
        "positions_updated": positions_updated,
        "portfolios_updated": portfolios_updated,
        "prices": {symbol: float(price) for symbol, price in prices.items()},
        "errors": errors if errors else None,
    }
