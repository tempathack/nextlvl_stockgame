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
            # Handle timezone-aware datetimes
            start_date = config.start_date.replace(tzinfo=None) if config.start_date.tzinfo else config.start_date
            end_date = config.end_date.replace(tzinfo=None) if config.end_date.tzinfo else config.end_date

            if now < start_date:
                raise HTTPException(
                    status_code=400,
                    detail=f"Trading not allowed yet. Game starts on {config.start_date.strftime('%Y-%m-%d %H:%M UTC')}"
                )
            if now > end_date:
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
