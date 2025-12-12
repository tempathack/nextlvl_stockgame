"""Activity feed API routes - PUBLIC."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.activity import TradeActivity
from app.schemas.activity import ActivityFeedResponse, TradeActivityRead

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=ActivityFeedResponse)
async def get_activity_feed(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, le=200, ge=1),
    offset: int = Query(default=0, ge=0),
) -> ActivityFeedResponse:
    """
    Get recent trade activity feed.

    PUBLIC ENDPOINT - No authentication required.
    Shows all trades from all players in real-time.
    """
    # Get total count
    count_stmt = select(func.count(TradeActivity.id))
    total = await session.scalar(count_stmt) or 0

    # Get activities
    stmt = (
        select(TradeActivity)
        .order_by(TradeActivity.executed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    activities = result.scalars().all()

    return ActivityFeedResponse(
        activities=[TradeActivityRead.model_validate(a) for a in activities],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/user/{user_id}", response_model=ActivityFeedResponse)
async def get_user_activity(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, le=200, ge=1),
    offset: int = Query(default=0, ge=0),
) -> ActivityFeedResponse:
    """
    Get trade activity for a specific user.

    PUBLIC ENDPOINT - No authentication required.
    """
    # Get total count for user
    count_stmt = select(func.count(TradeActivity.id)).where(
        TradeActivity.user_id == user_id
    )
    total = await session.scalar(count_stmt) or 0

    # Get activities
    stmt = (
        select(TradeActivity)
        .where(TradeActivity.user_id == user_id)
        .order_by(TradeActivity.executed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    activities = result.scalars().all()

    return ActivityFeedResponse(
        activities=[TradeActivityRead.model_validate(a) for a in activities],
        total=total,
        limit=limit,
        offset=offset,
    )
