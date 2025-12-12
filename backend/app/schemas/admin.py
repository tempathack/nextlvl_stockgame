"""Admin schemas for game configuration and reset."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class GameConfigRead(BaseModel):
    """Schema for reading game configuration."""

    id: int
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    starting_capital: Decimal
    allow_short_selling: bool
    allow_borrowing: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GameConfigCreate(BaseModel):
    """Schema for creating game configuration."""

    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    start_date: datetime
    end_date: datetime
    starting_capital: Decimal = Field(default=Decimal("100000.00"), gt=0)
    allow_short_selling: bool = True
    allow_borrowing: bool = False


class GameConfigUpdate(BaseModel):
    """Schema for updating game configuration."""

    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    starting_capital: Optional[Decimal] = Field(None, gt=0)
    allow_short_selling: Optional[bool] = None
    allow_borrowing: Optional[bool] = None


class GameResetRequest(BaseModel):
    """Schema for game reset request."""

    confirm: bool = Field(
        ...,
        description="Must be True to confirm reset. This action cannot be undone.",
    )


class GameResetResponse(BaseModel):
    """Schema for game reset response."""

    success: bool
    message: str
    portfolios_reset: int
    positions_cleared: int
    trades_cleared: int
    activities_cleared: int
    starting_capital: float


class GameStatusResponse(BaseModel):
    """Schema for game status."""

    is_active: bool
    is_running: bool
    days_remaining: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    starting_capital: float
    total_participants: int
