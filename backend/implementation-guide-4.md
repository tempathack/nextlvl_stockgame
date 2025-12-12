# Implementation Guide 4: Trading Tab, Fees, Game Reset & Portfolio Comparison

## Overview

This guide covers the implementation of:
1. **Trading Tab Enhancement** - Daily stock information display with buy/sell/short/cover actions
2. **Trading Fees** - 0.1% fee on ALL order types
3. **Global Game Start Date & Reset** - Configurable game dates with easy reset functionality
4. **Portfolio Comparison Tab** - Full transparency comparison across all participants

**Project Location**: `/home/tempa/Desktop/new/new stockgame/`

---

## Table of Contents

1. [Database Schema Changes](#phase-1-database-schema-changes)
2. [Trading Fee Implementation](#phase-2-trading-fee-implementation)
3. [Admin API - Game Config & Reset](#phase-3-admin-api---game-config--reset)
4. [Comparison Tab Implementation](#phase-4-comparison-tab-implementation)
5. [Frontend Trading Fee Display](#phase-5-frontend-trading-fee-display)
6. [Testing Checklist](#phase-6-testing-checklist)

---

## Phase 1: Database Schema Changes

### 1.1 Update Portfolio Model

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/models/portfolio.py`

Add `fee_amount` to `TradeOrder` and `total_fees_paid` to `Portfolio`:

```python
from decimal import Decimal
from typing import Optional
from sqlalchemy import Numeric
from sqlalchemy.orm import Mapped, mapped_column

class Portfolio(Base, IdentifierMixin, TimestampMixin):
    """User portfolio for the trading game."""

    __tablename__ = "portfolios"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(120), default="Main Portfolio")
    cash_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("100000.00")
    )
    equity_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00")
    )
    # NEW: Track total fees paid
    total_fees_paid: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00")
    )
    last_valuation_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="portfolio")
    positions: Mapped[list["Position"]] = relationship(
        back_populates="portfolio", cascade="all, delete-orphan"
    )
    orders: Mapped[list["TradeOrder"]] = relationship(
        back_populates="portfolio", cascade="all, delete-orphan"
    )
    activities: Mapped[list["TradeActivity"]] = relationship(
        back_populates="portfolio", cascade="all, delete-orphan"
    )


class TradeOrder(Base, IdentifierMixin, TimestampMixin):
    """Trade order model."""

    __tablename__ = "trade_orders"

    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    symbol: Mapped[str] = mapped_column(String(10), index=True)
    side: Mapped[OrderSide] = mapped_column(SQLAlchemyEnum(OrderSide))
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 6))
    price: Mapped[Decimal] = mapped_column(Numeric(15, 4))
    notional_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    # NEW: Trading fee amount
    fee_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 4), default=Decimal("0.00")
    )
    status: Mapped[OrderStatus] = mapped_column(
        SQLAlchemyEnum(OrderStatus), default=OrderStatus.PENDING
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    portfolio: Mapped["Portfolio"] = relationship(back_populates="orders")
    user: Mapped["User"] = relationship(back_populates="orders")
```

### 1.2 Create Alembic Migration

**File**: `/home/tempa/Desktop/new/new stockgame/backend/alembic/versions/0002_add_trading_fees.py`

```python
"""Add trading fee columns.

Revision ID: 0002_add_trading_fees
Revises: 0001_initial
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa
from decimal import Decimal

# revision identifiers
revision = "0002_add_trading_fees"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fee_amount to trade_orders
    op.add_column(
        "trade_orders",
        sa.Column(
            "fee_amount",
            sa.Numeric(15, 4),
            nullable=True,
            server_default="0.00"
        )
    )

    # Add total_fees_paid to portfolios
    op.add_column(
        "portfolios",
        sa.Column(
            "total_fees_paid",
            sa.Numeric(15, 2),
            nullable=True,
            server_default="0.00"
        )
    )

    # Update existing records to have default values
    op.execute("UPDATE trade_orders SET fee_amount = 0.00 WHERE fee_amount IS NULL")
    op.execute("UPDATE portfolios SET total_fees_paid = 0.00 WHERE total_fees_paid IS NULL")


def downgrade() -> None:
    op.drop_column("trade_orders", "fee_amount")
    op.drop_column("portfolios", "total_fees_paid")
```

---

## Phase 2: Trading Fee Implementation

### 2.1 Update Trading Service

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/services/trading.py`

```python
"""Trading service with 0.1% fee on all trades."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import Portfolio, Position, TradeOrder
from app.models.activity import TradeActivity
from app.models.game_config import GameConfig
from app.models.enums import OrderSide, OrderStatus
from app.schemas.trade import TradeOrderCreate
from app.integrations.market_data import MarketDataProvider

if TYPE_CHECKING:
    from app.models.user import User

# Trading fee rate: 0.1%
TRADING_FEE_RATE = Decimal("0.001")


class TradingService:
    """Trading service with 0.1% fee on ALL order types."""

    def __init__(
        self,
        session: AsyncSession,
        market_data: MarketDataProvider,
    ):
        self.session = session
        self.market_data = market_data

    async def _check_game_active(self) -> None:
        """Check if the game is currently active (within start/end dates)."""
        stmt = select(GameConfig).where(GameConfig.is_active == True).limit(1)
        result = await self.session.execute(stmt)
        config = result.scalar_one_or_none()

        if config:
            now = datetime.utcnow()
            if now < config.start_date.replace(tzinfo=None):
                raise HTTPException(
                    status_code=400,
                    detail=f"Trading not allowed yet. Game starts on {config.start_date.strftime('%Y-%m-%d %H:%M UTC')}"
                )
            if now > config.end_date.replace(tzinfo=None):
                raise HTTPException(
                    status_code=400,
                    detail="Trading period has ended."
                )

    async def submit_trade(
        self,
        user: "User",
        portfolio: Portfolio,
        payload: TradeOrderCreate,
    ) -> TradeOrder:
        """
        Submit a trade order with 0.1% fee.

        Fee Rules:
        - 0.1% fee applied to ALL order types (buy, sell, short, cover)
        - Fee calculated on notional value (quantity * price)
        - Fee deducted from cash balance on every trade
        """
        # Check if game is active
        await self._check_game_active()

        symbol = payload.symbol.upper()
        quantity = Decimal(str(payload.quantity))
        side = payload.side

        # Get current price
        try:
            quote = await self.market_data.quote(symbol)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not fetch price for {symbol}: {str(e)}"
            )

        price = Decimal(str(quote.price))
        notional_value = quantity * price

        # Calculate fee (0.1% of notional value)
        fee_amount = notional_value * TRADING_FEE_RATE

        # Validate based on order side (include fee in cash requirements)
        if side == OrderSide.BUY:
            total_cost = notional_value + fee_amount
            if total_cost > portfolio.cash_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient cash (including 0.1% fee). Required: ${total_cost:.2f}, Available: ${portfolio.cash_balance:.2f}"
                )

        elif side == OrderSide.SELL:
            position = await self._get_position(portfolio.id, symbol, is_short=False)
            if not position or position.quantity < quantity:
                available = position.quantity if position else Decimal("0")
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient shares. Required: {quantity}, Available: {available}"
                )
            # Also need to have enough for the fee (deducted from proceeds)
            # Proceeds after fee must be positive
            proceeds_after_fee = notional_value - fee_amount
            if proceeds_after_fee < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Trade value too small to cover fee. Proceeds: ${notional_value:.2f}, Fee: ${fee_amount:.2f}"
                )

        elif side == OrderSide.SHORT:
            total_cost = notional_value + fee_amount
            if total_cost > portfolio.cash_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient cash for short (including 0.1% fee). Required: ${total_cost:.2f}"
                )

        elif side == OrderSide.COVER:
            position = await self._get_position(portfolio.id, symbol, is_short=True)
            if not position or position.quantity < quantity:
                available = position.quantity if position else Decimal("0")
                raise HTTPException(
                    status_code=400,
                    detail=f"No short position to cover. Required: {quantity}, Available: {available}"
                )

        # Create trade order with fee
        order = TradeOrder(
            portfolio_id=portfolio.id,
            user_id=user.id,
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=price,
            notional_value=notional_value,
            fee_amount=fee_amount,
            status=OrderStatus.PENDING,
            submitted_at=datetime.utcnow(),
        )
        self.session.add(order)

        # Execute the trade with fee
        await self._execute_trade(portfolio, order, price, fee_amount)

        # Record activity for public feed
        await self._record_activity(user, portfolio, order, price)

        await self.session.commit()
        return order

    async def _get_position(
        self,
        portfolio_id: int,
        symbol: str,
        is_short: bool = False,
    ) -> Position | None:
        """Get existing position."""
        stmt = select(Position).where(
            Position.portfolio_id == portfolio_id,
            Position.symbol == symbol,
            Position.is_short == is_short,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _execute_trade(
        self,
        portfolio: Portfolio,
        order: TradeOrder,
        price: Decimal,
        fee_amount: Decimal,
    ) -> None:
        """Execute the trade and update positions with fee deduction."""
        if order.side == OrderSide.BUY:
            # Deduct cash + fee
            portfolio.cash_balance -= (order.notional_value + fee_amount)

            # Update or create position
            position = await self._get_position(portfolio.id, order.symbol, is_short=False)
            if position:
                # Average up/down
                total_cost = (position.quantity * position.average_price) + order.notional_value
                position.quantity += order.quantity
                position.average_price = total_cost / position.quantity
            else:
                position = Position(
                    portfolio_id=portfolio.id,
                    symbol=order.symbol,
                    quantity=order.quantity,
                    average_price=price,
                    is_short=False,
                )
                self.session.add(position)

            position.last_mark_price = price

        elif order.side == OrderSide.SELL:
            # Add cash minus fee (proceeds after fee)
            portfolio.cash_balance += (order.notional_value - fee_amount)

            # Reduce position
            position = await self._get_position(portfolio.id, order.symbol, is_short=False)
            position.quantity -= order.quantity

            if position.quantity <= 0:
                await self.session.delete(position)

        elif order.side == OrderSide.SHORT:
            # Hold collateral + fee
            portfolio.cash_balance -= (order.notional_value + fee_amount)

            # Create short position
            position = await self._get_position(portfolio.id, order.symbol, is_short=True)
            if position:
                total_value = (position.quantity * position.average_price) + order.notional_value
                position.quantity += order.quantity
                position.average_price = total_value / position.quantity
            else:
                position = Position(
                    portfolio_id=portfolio.id,
                    symbol=order.symbol,
                    quantity=order.quantity,
                    average_price=price,
                    is_short=True,
                )
                self.session.add(position)

            position.last_mark_price = price

        elif order.side == OrderSide.COVER:
            # Return collateral plus/minus profit/loss, minus fee
            position = await self._get_position(portfolio.id, order.symbol, is_short=True)
            profit_loss = (position.average_price - price) * order.quantity
            portfolio.cash_balance += (order.notional_value + profit_loss - fee_amount)

            position.quantity -= order.quantity
            if position.quantity <= 0:
                await self.session.delete(position)

        # Track cumulative fees paid
        portfolio.total_fees_paid += fee_amount

        # Update order status
        order.status = OrderStatus.SETTLED
        order.executed_at = datetime.utcnow()

        # Update portfolio equity value
        await self._update_equity_value(portfolio)

    async def _update_equity_value(self, portfolio: Portfolio) -> None:
        """Recalculate portfolio equity value."""
        stmt = select(Position).where(Position.portfolio_id == portfolio.id)
        result = await self.session.execute(stmt)
        positions = result.scalars().all()

        equity = Decimal("0")
        for pos in positions:
            if pos.last_mark_price:
                if pos.is_short:
                    # Short: profit when price goes down
                    equity += (pos.average_price - pos.last_mark_price) * pos.quantity
                else:
                    equity += pos.quantity * pos.last_mark_price

        portfolio.equity_value = equity
        portfolio.last_valuation_at = datetime.utcnow()

    async def _record_activity(
        self,
        user: "User",
        portfolio: Portfolio,
        order: TradeOrder,
        price: Decimal,
    ) -> None:
        """Record trade activity for public feed."""
        display_name = user.profile.display_name if user.profile else f"User {user.id}"

        activity = TradeActivity(
            user_id=user.id,
            portfolio_id=portfolio.id,
            display_name=display_name,
            symbol=order.symbol,
            side=order.side.value,
            quantity=order.quantity,
            price=price,
            total_value=order.notional_value,
            executed_at=datetime.utcnow(),
        )
        self.session.add(activity)
```

### 2.2 Update Trade Schemas

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/schemas/trade.py`

Add `fee_amount` to the response schema:

```python
from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.enums import OrderSide, OrderStatus


class TradeOrderCreate(BaseModel):
    """Schema for creating a trade order."""
    symbol: str
    side: OrderSide
    quantity: float


class TradeOrderRead(BaseModel):
    """Schema for reading a trade order."""
    id: int
    portfolio_id: int
    user_id: int
    symbol: str
    side: OrderSide
    quantity: Decimal
    price: Decimal
    notional_value: Decimal
    fee_amount: Optional[Decimal] = None  # NEW: Trading fee
    status: OrderStatus
    submitted_at: datetime
    executed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TradeHistoryResponse(BaseModel):
    """Schema for trade history response."""
    orders: list[TradeOrderRead]
    total: int
    limit: int
    offset: int
```

---

## Phase 3: Admin API - Game Config & Reset

### 3.1 Create Admin Schemas

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/schemas/admin.py` (NEW FILE)

```python
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


class GameConfigUpdate(BaseModel):
    """Schema for updating game configuration."""
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    starting_capital: Optional[Decimal] = Field(None, gt=0)
    allow_short_selling: Optional[bool] = None
    allow_borrowing: Optional[bool] = None


class GameConfigCreate(BaseModel):
    """Schema for creating game configuration."""
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    starting_capital: Decimal = Field(default=Decimal("100000.00"), gt=0)
    allow_short_selling: bool = True
    allow_borrowing: bool = False


class GameResetRequest(BaseModel):
    """Schema for game reset request."""
    confirm: bool = Field(..., description="Must be True to confirm reset")


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
```

### 3.2 Create Admin Routes

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/api/routes/admin.py` (NEW FILE)

```python
"""Admin API routes - PROTECTED (superuser only)."""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

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


@router.post("/game-config", response_model=GameConfigRead, status_code=status.HTTP_201_CREATED)
async def create_game_config(
    payload: GameConfigCreate,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_superuser),
) -> GameConfigRead:
    """Create a new game configuration."""
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
```

### 3.3 Register Admin Router

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/api/routes/__init__.py`

Add the admin router:

```python
from fastapi import APIRouter

from app.api.routes import (
    admin,      # NEW
    auth,
    activity,
    analysis,
    benchmarks,
    leaderboard,
    market,
    trades,
    users,
)

api_router = APIRouter()

# Public endpoints
api_router.include_router(auth.router)
api_router.include_router(activity.router)
api_router.include_router(analysis.router)
api_router.include_router(market.router)
api_router.include_router(benchmarks.router)
api_router.include_router(leaderboard.router)

# Protected endpoints
api_router.include_router(users.router)
api_router.include_router(trades.router)

# Admin endpoints (superuser only)
api_router.include_router(admin.router)  # NEW
```

---

## Phase 4: Comparison Tab Implementation

### 4.1 Create Comparison API Endpoint

**File**: `/home/tempa/Desktop/new/new stockgame/backend/app/api/routes/leaderboard.py`

Add the comparison endpoint:

```python
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.user import User
from app.models.portfolio import Portfolio, Position
from app.models.game_config import GameConfig

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


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
```

### 4.2 Create Comparison Page Component

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/pages/public/Comparison.tsx` (NEW FILE)

```tsx
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import apiClient from '../../api/client';

interface Position {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  pnl: number;
  pnl_pct: number;
  is_short: boolean;
}

interface Participant {
  user_id: number;
  display_name: string;
  total_value: number;
  cash_balance: number;
  equity_value: number;
  total_return_pct: number;
  total_fees_paid: number;
  positions: Position[];
  positions_count: number;
}

interface ComparisonResponse {
  participants: Participant[];
  total_participants: number;
  starting_capital: number;
  updated_at: string;
}

const Comparison: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['comparison'],
    queryFn: async () => {
      const response = await apiClient.get<ComparisonResponse>('/leaderboard/comparison');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const getRankIcon = (index: number) => {
    if (index === 0) return <EmojiEvents sx={{ color: '#FFD700' }} />;
    if (index === 1) return <EmojiEvents sx={{ color: '#C0C0C0' }} />;
    if (index === 2) return <EmojiEvents sx={{ color: '#CD7F32' }} />;
    return null;
  };

  // Chart options for performance comparison
  const getChartOptions = () => {
    if (!data) return {};

    const categories = data.participants.map((p) => p.display_name);
    const values = data.participants.map((p) => p.total_return_pct);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}: ${formatPercent(p.value)}`;
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          rotate: 45,
          color: theme.palette.text.secondary,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${value}%`,
          color: theme.palette.text.secondary,
        },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v) => ({
            value: v,
            itemStyle: {
              color: v >= 0 ? theme.palette.success.main : theme.palette.error.main,
            },
          })),
        },
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
    };
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load comparison data</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio Comparison
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Full transparency - Compare all {data?.total_participants || 0} participants'
        portfolios, positions, and performance
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview Table" />
        <Tab label="Position Details" />
        <Tab label="Performance Chart" />
      </Tabs>

      {/* Tab 0: Overview Table */}
      {selectedTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Player</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="right">Cash</TableCell>
                <TableCell align="right">Equity</TableCell>
                <TableCell align="right">Return %</TableCell>
                <TableCell align="right">Fees Paid</TableCell>
                <TableCell align="right">Positions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.participants.map((p, idx) => (
                <TableRow
                  key={p.user_id}
                  hover
                  sx={{
                    backgroundColor:
                      idx < 3 ? `${theme.palette.success.main}10` : 'inherit',
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRankIcon(idx)}
                      <Typography variant="body2" fontWeight={idx < 3 ? 'bold' : 'normal'}>
                        #{idx + 1}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                      {p.display_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(p.total_value)}</TableCell>
                  <TableCell align="right">{formatCurrency(p.cash_balance)}</TableCell>
                  <TableCell align="right">{formatCurrency(p.equity_value)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatPercent(p.total_return_pct)}
                      color={p.total_return_pct >= 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {formatCurrency(p.total_fees_paid)}
                  </TableCell>
                  <TableCell align="right">{p.positions_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Position Details */}
      {selectedTab === 1 && (
        <Box>
          {data?.participants.map((p, idx) => (
            <Card key={p.user_id} sx={{ mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getRankIcon(idx)}
                    <Box>
                      <Typography variant="h6">
                        #{idx + 1} {p.display_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(p.total_value)} |{' '}
                        <span
                          style={{
                            color:
                              p.total_return_pct >= 0
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                          }}
                        >
                          {formatPercent(p.total_return_pct)}
                        </span>
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    onClick={() =>
                      setExpandedUser(expandedUser === p.user_id ? null : p.user_id)
                    }
                  >
                    {expandedUser === p.user_id ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={expandedUser === p.user_id}>
                  <Divider sx={{ my: 2 }} />

                  {/* Summary Stats */}
                  <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Cash Balance
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(p.cash_balance)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Equity Value
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(p.equity_value)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fees Paid
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {formatCurrency(p.total_fees_paid)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Positions Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Avg Price</TableCell>
                          <TableCell align="right">Current</TableCell>
                          <TableCell align="right">Value</TableCell>
                          <TableCell align="right">P&L</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {p.positions.map((pos) => (
                          <TableRow
                            key={`${p.user_id}-${pos.symbol}-${pos.is_short}`}
                          >
                            <TableCell>
                              <Typography fontWeight="medium">{pos.symbol}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={pos.is_short ? 'Short' : 'Long'}
                                color={pos.is_short ? 'warning' : 'primary'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {pos.quantity.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}
                            </TableCell>
                            <TableCell align="right">
                              ${pos.average_price.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              ${pos.current_price.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(pos.market_value)}
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                }}
                              >
                                {pos.pnl >= 0 ? (
                                  <TrendingUp
                                    color="success"
                                    fontSize="small"
                                  />
                                ) : (
                                  <TrendingDown color="error" fontSize="small" />
                                )}
                                <Typography
                                  color={
                                    pos.pnl >= 0
                                      ? 'success.main'
                                      : 'error.main'
                                  }
                                >
                                  {formatCurrency(pos.pnl)} (
                                  {formatPercent(pos.pnl_pct)})
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {p.positions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography color="text.secondary">
                                No positions - 100% cash
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Tab 2: Performance Chart */}
      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Return % Comparison
          </Typography>
          <Box sx={{ height: 400 }}>
            <ReactECharts
              option={getChartOptions()}
              style={{ height: '100%', width: '100%' }}
            />
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default Comparison;
```

### 4.3 Add Route to App

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/App.tsx`

Add the import and route:

```tsx
// Add import at top
import Comparison from './pages/public/Comparison';

// Add route inside Routes
<Route path="comparison" element={<Comparison />} />
```

### 4.4 Update Navigation

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/components/layout/MainLayout.tsx`

Update the `navItems` array:

```tsx
const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Comparison', path: '/comparison' },  // NEW
  { label: 'Activity', path: '/activity' },
];
```

---

## Phase 5: Frontend Trading Fee Display

### 5.1 Update TradeForm Component

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/components/portfolio/TradeForm.tsx`

Add fee calculation and display:

```tsx
// Add constant at top of file
const TRADING_FEE_RATE = 0.001; // 0.1%

// Inside component, add fee calculation
const calculateFee = (): number => {
  if (!quote || !quantity) return 0;
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) return 0;
  return qty * quote.price * TRADING_FEE_RATE;
};

const fee = calculateFee();
const subtotal = total;
const totalWithFee = side === 'sell' || side === 'cover'
  ? total - fee
  : total + fee;

// Update the order summary section to show fee:
{quote && quantity && parseFloat(quantity) > 0 && (
  <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2">Quantity</Typography>
      <Typography variant="body2">{quantity} shares</Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2">Price</Typography>
      <Typography variant="body2">${quote.price.toFixed(2)}</Typography>
    </Box>
    <Divider sx={{ my: 1 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2">Subtotal</Typography>
      <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Trading Fee (0.1%)
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {side === 'sell' || side === 'cover' ? '-' : '+'}${fee.toFixed(2)}
      </Typography>
    </Box>
    <Divider sx={{ my: 1 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body1" fontWeight="bold">
        {side === 'sell' || side === 'cover' ? 'Net Proceeds' : 'Total Cost'}
      </Typography>
      <Typography
        variant="body1"
        fontWeight="bold"
        color={totalWithFee <= cashBalance || side === 'sell' || side === 'cover' ? 'text.primary' : 'error.main'}
      >
        ${totalWithFee.toFixed(2)}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Available Cash
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ${cashBalance.toFixed(2)}
      </Typography>
    </Box>
  </Box>
)}
```

### 5.2 Update TradeHistoryTable Component

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/components/portfolio/TradeHistoryTable.tsx`

Add fee column:

```tsx
// In TableHead
<TableHead>
  <TableRow>
    <TableCell>Date</TableCell>
    <TableCell>Symbol</TableCell>
    <TableCell>Side</TableCell>
    <TableCell align="right">Quantity</TableCell>
    <TableCell align="right">Price</TableCell>
    <TableCell align="right">Notional</TableCell>
    <TableCell align="right">Fee</TableCell>  {/* NEW */}
    <TableCell>Status</TableCell>
  </TableRow>
</TableHead>

// In TableBody
<TableBody>
  {orders.map((order) => (
    <TableRow key={order.id} hover>
      <TableCell>{formatDate(order.executed_at || order.submitted_at)}</TableCell>
      <TableCell>{order.symbol}</TableCell>
      <TableCell>
        <Chip
          label={order.side.toUpperCase()}
          size="small"
          color={
            order.side === 'buy' ? 'success' :
            order.side === 'sell' ? 'error' :
            order.side === 'short' ? 'warning' : 'info'
          }
        />
      </TableCell>
      <TableCell align="right">{parseFloat(order.quantity).toLocaleString()}</TableCell>
      <TableCell align="right">${parseFloat(order.price).toFixed(2)}</TableCell>
      <TableCell align="right">${parseFloat(order.notional_value).toFixed(2)}</TableCell>
      <TableCell align="right" sx={{ color: 'text.secondary' }}>
        ${order.fee_amount ? parseFloat(order.fee_amount).toFixed(2) : '0.00'}
      </TableCell>
      <TableCell>
        <Chip size="small" label={order.status} variant="outlined" />
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

### 5.3 Update Portfolio API Types

**File**: `/home/tempa/Desktop/new/new stockgame/frontend-react/src/api/portfolio.ts`

Add `fee_amount` to the TradeOrder interface:

```typescript
export interface TradeOrder {
  id: number;
  portfolio_id: number;
  user_id: number;
  symbol: string;
  side: 'buy' | 'sell' | 'short' | 'cover';
  quantity: string;
  price: string;
  notional_value: string;
  fee_amount: string | null;  // NEW
  status: string;
  submitted_at: string;
  executed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Phase 6: Testing Checklist

### Backend Tests

- [ ] **Trading Fee Tests**
  - [ ] Fee calculation is exactly 0.1% of notional value
  - [ ] BUY: Cash deducted = notional + fee
  - [ ] SELL: Cash added = notional - fee
  - [ ] SHORT: Cash deducted = notional + fee
  - [ ] COVER: Cash added = notional + profit/loss - fee
  - [ ] Insufficient funds error includes fee in calculation
  - [ ] `total_fees_paid` accumulates correctly on portfolio

- [ ] **Admin API Tests**
  - [ ] GET /api/admin/game-config returns active config (superuser only)
  - [ ] PUT /api/admin/game-config updates config (superuser only)
  - [ ] POST /api/admin/reset-game resets portfolios (superuser only)
  - [ ] Non-superuser gets 403 Forbidden
  - [ ] Reset clears positions, trades, activities
  - [ ] Reset sets cash_balance to starting_capital

- [ ] **Game Date Validation Tests**
  - [ ] Trading blocked before start_date
  - [ ] Trading blocked after end_date
  - [ ] Trading allowed during game period
  - [ ] Proper error messages returned

- [ ] **Comparison API Tests**
  - [ ] Returns all participants
  - [ ] Includes full position details
  - [ ] P&L calculations are correct
  - [ ] Works for empty portfolios

### Frontend Tests

- [ ] **TradeForm Fee Display**
  - [ ] Fee shows 0.1% of trade value
  - [ ] Total includes fee for BUY/SHORT
  - [ ] Net proceeds deducts fee for SELL/COVER
  - [ ] Insufficient funds warning includes fee

- [ ] **Comparison Page**
  - [ ] All participants load and display
  - [ ] Position details expand/collapse correctly
  - [ ] Rankings show correct order
  - [ ] Chart renders properly

- [ ] **Trade History**
  - [ ] Fee column displays correctly
  - [ ] Historical trades show fees

---

## File Paths Summary

| Component | File Path |
|-----------|-----------|
| Portfolio Model | `backend/app/models/portfolio.py` |
| Trading Service | `backend/app/services/trading.py` |
| Admin Routes | `backend/app/api/routes/admin.py` (NEW) |
| Admin Schemas | `backend/app/schemas/admin.py` (NEW) |
| Trade Schemas | `backend/app/schemas/trade.py` |
| Route Registry | `backend/app/api/routes/__init__.py` |
| Leaderboard Routes | `backend/app/api/routes/leaderboard.py` |
| Migration | `backend/alembic/versions/0002_add_trading_fees.py` (NEW) |
| Comparison Page | `frontend-react/src/pages/public/Comparison.tsx` (NEW) |
| TradeForm | `frontend-react/src/components/portfolio/TradeForm.tsx` |
| TradeHistoryTable | `frontend-react/src/components/portfolio/TradeHistoryTable.tsx` |
| App Router | `frontend-react/src/App.tsx` |
| Navigation | `frontend-react/src/components/layout/MainLayout.tsx` |
| Portfolio API | `frontend-react/src/api/portfolio.ts` |

---

## Implementation Order

1. Database migration for fee columns
2. Update Portfolio and TradeOrder models
3. Implement fee calculation in TradingService
4. Add game date validation to TradingService
5. Create admin schemas
6. Create admin routes
7. Register admin router
8. Add comparison endpoint to leaderboard routes
9. Update trade schemas with fee_amount
10. Update frontend API types
11. Update TradeForm with fee display
12. Update TradeHistoryTable with fee column
13. Create Comparison page
14. Add route and navigation
15. Run tests

---

Generated: 2025-12-12
