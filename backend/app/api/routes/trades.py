"""Trade submission endpoints - PROTECTED."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_session
from app.integrations.market_data import MarketDataProvider, get_market_data_provider
from app.models.portfolio import Portfolio, TradeOrder
from app.models.user import User
from app.schemas.trade import TradeHistoryResponse, TradeOrderCreate, TradeOrderRead
from app.services.trading import TradingService

router = APIRouter(prefix="/trades", tags=["trades"])


@router.post("", response_model=TradeOrderRead, status_code=status.HTTP_201_CREATED)
async def submit_trade(
    payload: TradeOrderCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> TradeOrderRead:
    """
    Submit a trade order.

    PROTECTED ENDPOINT - Authentication required.
    Simplified rules: no trade limits, just cash/shares validation.
    """
    # Get user's portfolio
    portfolio = await _get_default_portfolio(session=session, user=current_user)
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Submit trade via trading service
    trading_service = TradingService(session, market_data)
    order = await trading_service.submit_trade(
        user=current_user,
        portfolio=portfolio,
        payload=payload,
    )

    await session.commit()
    await session.refresh(order)

    return TradeOrderRead.model_validate(order)


@router.get("/history", response_model=TradeHistoryResponse)
async def get_trade_history(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> TradeHistoryResponse:
    """
    Get the authenticated user's trading book.

    PROTECTED ENDPOINT - Authentication required.
    Returns trades in reverse chronological order.
    """
    count_stmt = select(func.count(TradeOrder.id)).where(TradeOrder.user_id == current_user.id)
    total = await session.scalar(count_stmt) or 0

    stmt = (
        select(TradeOrder)
        .where(TradeOrder.user_id == current_user.id)
        .order_by(TradeOrder.submitted_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    orders = result.scalars().all()

    return TradeHistoryResponse(
        orders=[TradeOrderRead.model_validate(o) for o in orders],
        total=total,
        limit=limit,
        offset=offset,
    )


async def _get_default_portfolio(*, session: AsyncSession, user: User) -> Portfolio | None:
    """Get user's default portfolio."""
    stmt = select(Portfolio).where(Portfolio.user_id == user.id).limit(1)
    return await session.scalar(stmt)
