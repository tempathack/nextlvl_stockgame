"""Leaderboard API routes - PUBLIC."""
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.portfolio import Portfolio, Position
from app.models.user import User, Profile
from app.models.game_config import GameConfig

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
async def get_leaderboard(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, le=100, ge=1),
    offset: int = Query(default=0, ge=0),
):
    """
    Get leaderboard rankings.

    PUBLIC ENDPOINT - No authentication required.
    """
    # Get all portfolios with user info
    stmt = (
        select(Portfolio)
        .options(selectinload(Portfolio.user).selectinload(User.profile))
        .order_by((Portfolio.cash_balance + Portfolio.equity_value).desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    portfolios = result.scalars().all()

    starting_capital = Decimal("100000")
    entries = []

    for idx, portfolio in enumerate(portfolios, start=offset + 1):
        total_value = Decimal(str(portfolio.cash_balance)) + Decimal(str(portfolio.equity_value))
        return_pct = ((total_value - starting_capital) / starting_capital) * 100

        # Count positions
        positions_stmt = select(func.count(Position.id)).where(
            Position.portfolio_id == portfolio.id
        )
        positions_count = await session.scalar(positions_stmt) or 0

        display_name = portfolio.user.profile.display_name if portfolio.user.profile else f"User {portfolio.user_id}"

        entries.append({
            "rank": idx,
            "user_id": portfolio.user_id,
            "display_name": display_name,
            "portfolio_value": float(total_value),
            "cash_balance": float(portfolio.cash_balance),
            "equity_value": float(portfolio.equity_value),
            "total_return_pct": float(return_pct),
            "positions_count": positions_count,
        })

    # Get total count
    count_stmt = select(func.count(Portfolio.id))
    total = await session.scalar(count_stmt) or 0

    return {
        "entries": entries,
        "total_players": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{user_id}/portfolio")
async def get_user_portfolio_public(
    user_id: int,
    session: AsyncSession = Depends(get_session),
):
    """
    Get full portfolio details for a user.

    PUBLIC ENDPOINT - No authentication required.
    Full transparency - shows all positions with quantities and values.
    """
    # Get portfolio with positions
    stmt = (
        select(Portfolio)
        .options(
            selectinload(Portfolio.positions),
            selectinload(Portfolio.user).selectinload(User.profile),
        )
        .where(Portfolio.user_id == user_id)
    )
    result = await session.execute(stmt)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    starting_capital = Decimal("100000")
    total_value = Decimal(str(portfolio.cash_balance)) + Decimal(str(portfolio.equity_value))
    return_pct = ((total_value - starting_capital) / starting_capital) * 100

    display_name = portfolio.user.profile.display_name if portfolio.user.profile else f"User {user_id}"

    positions = []
    for pos in portfolio.positions:
        current_price = Decimal(str(pos.last_mark_price)) if pos.last_mark_price else Decimal(str(pos.average_price))
        market_value = Decimal(str(pos.quantity)) * current_price

        if pos.last_mark_price:
            gain_loss = (current_price - Decimal(str(pos.average_price))) * Decimal(str(pos.quantity))
            gain_loss_pct = ((current_price - Decimal(str(pos.average_price))) / Decimal(str(pos.average_price))) * 100
        else:
            gain_loss = None
            gain_loss_pct = None

        positions.append({
            "symbol": pos.symbol,
            "quantity": float(pos.quantity),
            "average_price": float(pos.average_price),
            "current_price": float(current_price),
            "market_value": float(market_value),
            "is_short": pos.is_short,
            "gain_loss": float(gain_loss) if gain_loss is not None else None,
            "gain_loss_pct": float(gain_loss_pct) if gain_loss_pct is not None else None,
        })

    return {
        "user_id": user_id,
        "display_name": display_name,
        "portfolio_id": portfolio.id,
        "cash_balance": float(portfolio.cash_balance),
        "equity_value": float(portfolio.equity_value),
        "total_value": float(total_value),
        "total_return_pct": float(return_pct),
        "positions": positions,
        "last_updated": portfolio.last_valuation_at,
    }


@router.get("/comparison")
async def get_all_portfolios_comparison(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Get ALL participants' portfolios for side-by-side comparison.

    PUBLIC ENDPOINT - Full transparency.
    Returns detailed position data for all players.
    """
    # Get all portfolios with positions and user info
    stmt = (
        select(Portfolio)
        .options(
            selectinload(Portfolio.positions),
            selectinload(Portfolio.user).selectinload(User.profile),
        )
        .order_by((Portfolio.cash_balance + Portfolio.equity_value).desc())
    )
    result = await session.execute(stmt)
    portfolios = result.scalars().all()

    # Get starting capital from config
    starting_capital = Decimal("100000.00")
    config_stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
    config_result = await session.execute(config_stmt)
    config = config_result.scalar_one_or_none()
    if config:
        starting_capital = config.starting_capital

    participants = []
    for portfolio in portfolios:
        total_value = Decimal(str(portfolio.cash_balance)) + Decimal(str(portfolio.equity_value))
        return_pct = ((total_value - starting_capital) / starting_capital) * 100 if starting_capital > 0 else Decimal("0")

        display_name = (
            portfolio.user.profile.display_name
            if portfolio.user and portfolio.user.profile
            else f"User {portfolio.user_id}"
        )

        # Build positions list with full details
        positions = []
        for pos in portfolio.positions:
            current_price = Decimal(str(pos.last_mark_price)) if pos.last_mark_price else Decimal(str(pos.average_price))
            market_value = Decimal(str(pos.quantity)) * current_price
            cost_basis = Decimal(str(pos.quantity)) * Decimal(str(pos.average_price))

            if pos.is_short:
                # Short positions: profit when price goes down
                pnl = cost_basis - market_value
            else:
                pnl = market_value - cost_basis

            pnl_pct = (pnl / cost_basis) * 100 if cost_basis > 0 else Decimal("0")

            # Calculate portfolio weight (contribution to total portfolio)
            portfolio_weight = float(market_value / total_value * 100) if total_value > 0 else 0

            # Calculate performance contribution (how much this position contributed to overall return)
            performance_contribution = float(pnl / starting_capital * 100) if starting_capital > 0 else 0

            positions.append({
                "symbol": pos.symbol,
                "quantity": float(pos.quantity),
                "average_price": float(pos.average_price),
                "current_price": float(current_price),
                "market_value": float(market_value),
                "cost_basis": float(cost_basis),
                "pnl": float(pnl),
                "pnl_pct": float(pnl_pct),
                "is_short": pos.is_short,
                "created_at": pos.created_at.isoformat() if pos.created_at else None,
                "portfolio_weight": portfolio_weight,
                "performance_contribution": performance_contribution,
            })

        # Get total fees paid (default to 0 if not set)
        total_fees = float(portfolio.total_fees_paid) if hasattr(portfolio, 'total_fees_paid') and portfolio.total_fees_paid else 0.0

        participants.append({
            "user_id": portfolio.user_id,
            "display_name": display_name,
            "total_value": float(total_value),
            "cash_balance": float(portfolio.cash_balance),
            "equity_value": float(portfolio.equity_value),
            "total_return_pct": float(return_pct),
            "total_fees_paid": total_fees,
            "positions": positions,
            "positions_count": len(positions),
        })

    return {
        "participants": participants,
        "total_participants": len(participants),
        "starting_capital": float(starting_capital),
        "updated_at": datetime.utcnow().isoformat(),
    }
