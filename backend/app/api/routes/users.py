"""User profile and preferences routes."""
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.db.session import get_session
from app.models.user import Profile, User
from app.models.portfolio import Portfolio
from app.schemas.user import (
    UserPreferencesResponse,
    UserPreferencesUpdate,
    UserProfileResponse,
    UserProfileUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


async def _get_or_create_profile(session: AsyncSession, user: User) -> Profile:
    """Ensure a profile exists for the user."""
    profile = user.profile
    if profile is None:
        profile = Profile(
            user_id=user.id,
            display_name=user.username,
            bio=None,
            avatar_url=None,
            email_notifications=True,
            trade_alerts=True,
            weekly_report=True,
        )
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    return profile


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileResponse:
    """Return the current user's profile information."""
    profile = await _get_or_create_profile(session, current_user)

    return UserProfileResponse(
        display_name=profile.display_name or current_user.username,
        email=current_user.email,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
    )


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileResponse:
    """Update display name, email, or bio for the current user."""
    # Check for email uniqueness
    if payload.email != current_user.email:
        existing_email = await session.scalar(
            select(User).where(User.email == payload.email, User.id != current_user.id)
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use",
            )

    profile = await _get_or_create_profile(session, current_user)

    current_user.email = payload.email
    profile.display_name = payload.display_name
    profile.bio = payload.bio
    profile.avatar_url = payload.avatar_url

    session.add_all([current_user, profile])
    await session.commit()

    return UserProfileResponse(
        display_name=profile.display_name,
        email=current_user.email,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
    )


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserPreferencesResponse:
    """Get notification preferences."""
    profile = await _get_or_create_profile(session, current_user)

    return UserPreferencesResponse(
        email_notifications=profile.email_notifications,
        trade_alerts=profile.trade_alerts,
        weekly_report=profile.weekly_report,
    )


@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserPreferencesResponse:
    """Update notification preferences."""
    profile = await _get_or_create_profile(session, current_user)

    profile.email_notifications = payload.email_notifications
    profile.trade_alerts = payload.trade_alerts
    profile.weekly_report = payload.weekly_report

    session.add(profile)
    await session.commit()

    return UserPreferencesResponse(
        email_notifications=profile.email_notifications,
        trade_alerts=profile.trade_alerts,
        weekly_report=profile.weekly_report,
    )


@router.get("/portfolio")
async def get_my_portfolio(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """
    Get current user's portfolio with positions.

    PROTECTED ENDPOINT - Authentication required.
    Returns portfolio summary and all positions with P&L.
    """
    # Get portfolio with positions
    stmt = (
        select(Portfolio)
        .options(selectinload(Portfolio.positions))
        .where(Portfolio.user_id == current_user.id)
    )
    result = await session.execute(stmt)
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    starting_capital = Decimal("100000")
    total_value = Decimal(str(portfolio.cash_balance)) + Decimal(str(portfolio.equity_value))
    return_pct = ((total_value - starting_capital) / starting_capital) * 100

    # Build positions list
    positions = []
    for pos in portfolio.positions:
        avg_price = Decimal(str(pos.average_price))
        mark_price = Decimal(str(pos.last_mark_price)) if pos.last_mark_price else avg_price
        qty = Decimal(str(pos.quantity))

        cost_basis = qty * avg_price
        market_value = qty * mark_price

        if pos.is_short:
            pnl = cost_basis - market_value
        else:
            pnl = market_value - cost_basis

        pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else Decimal("0")

        positions.append({
            "id": pos.id,
            "symbol": pos.symbol,
            "quantity": float(qty),
            "average_price": float(avg_price),
            "current_price": float(mark_price),
            "cost_basis": float(cost_basis),
            "market_value": float(market_value),
            "pnl": float(pnl),
            "pnl_pct": float(pnl_pct),
            "is_short": pos.is_short,
            "purchased_at": pos.created_at.isoformat() if pos.created_at else None,
        })

    # Sort by market value descending
    positions.sort(key=lambda x: x["market_value"], reverse=True)

    return {
        "portfolio_id": portfolio.id,
        "user_id": current_user.id,
        "display_name": current_user.profile.display_name if current_user.profile else current_user.username,
        "cash_balance": float(portfolio.cash_balance),
        "equity_value": float(portfolio.equity_value),
        "total_value": float(total_value),
        "total_return_pct": float(return_pct),
        "total_fees_paid": float(portfolio.total_fees_paid) if portfolio.total_fees_paid else 0.0,
        "positions": positions,
        "positions_count": len(positions),
    }
