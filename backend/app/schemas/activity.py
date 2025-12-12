"""Activity schemas for API."""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class TradeActivityRead(BaseModel):
    """Trade activity response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    portfolio_id: int
    display_name: str
    symbol: str
    side: str
    quantity: Decimal
    price: Decimal
    total_value: Decimal
    executed_at: datetime


class ActivityFeedResponse(BaseModel):
    """Activity feed response with pagination."""

    activities: list[TradeActivityRead]
    total: int
    limit: int
    offset: int
