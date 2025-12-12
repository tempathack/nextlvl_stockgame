"""Trade schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import OrderSide, OrderStatus


class TradeOrderCreate(BaseModel):
    """Schema for creating a trade order."""

    symbol: str = Field(min_length=1, max_length=10)
    side: OrderSide
    quantity: Decimal = Field(gt=0)


class TradeOrderRead(BaseModel):
    """Schema for reading a trade order."""

    id: int
    portfolio_id: int
    user_id: int
    symbol: str
    side: OrderSide
    quantity: Decimal
    price: Optional[Decimal]
    notional_value: Optional[Decimal]
    fee_amount: Decimal = Decimal("0.00")
    status: OrderStatus
    submitted_at: datetime
    executed_at: Optional[datetime]
    error_message: Optional[str]

    model_config = {"from_attributes": True}


class TradeHistoryResponse(BaseModel):
    """Schema for trade history response."""

    orders: list[TradeOrderRead]
    total: int
    limit: int
    offset: int
