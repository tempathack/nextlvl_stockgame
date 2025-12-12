"""SEC Insider Trades API routes - PUBLIC."""
from datetime import date, timedelta
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, and_, desc, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_session
from app.models.insider_trades import InsiderTrade

router = APIRouter(prefix="/insider-trades", tags=["insider-trades"])


# Response Models
class InsiderTradeResponse(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str]
    insider_name: str
    insider_title: Optional[str]
    relationship: Optional[str]
    transaction_type: str
    transaction_code: Optional[str]
    shares_traded: float
    price_per_share: Optional[float]
    total_value: Optional[float]
    shares_owned_after: Optional[float]
    transaction_date: str
    filing_date: str
    # Price impact
    price_at_trade: Optional[float]
    price_current: Optional[float]
    return_1w_pct: Optional[float]
    return_1m_pct: Optional[float]
    return_3m_pct: Optional[float]
    return_to_current_pct: Optional[float]
    # Benchmark
    sp500_return_1w_pct: Optional[float]
    sp500_return_1m_pct: Optional[float]
    sp500_return_3m_pct: Optional[float]
    alpha_1w_pct: Optional[float]
    alpha_1m_pct: Optional[float]
    alpha_3m_pct: Optional[float]
    filing_url: Optional[str]

    class Config:
        from_attributes = True


class InsiderTradeListResponse(BaseModel):
    trades: List[InsiderTradeResponse]
    total: int
    limit: int
    offset: int


class InsiderSummary(BaseModel):
    symbol: str
    total_trades: int
    buy_count: int
    sell_count: int
    total_buy_value: float
    total_sell_value: float
    net_insider_value: float
    avg_buy_return_1m: Optional[float]
    avg_sell_return_1m: Optional[float]
    most_recent_trade_date: str
    top_insider: str


class InsiderStats(BaseModel):
    period_days: int
    total_trades: int
    unique_stocks: int
    unique_insiders: int
    total_buy_value: float
    total_sell_value: float
    net_insider_sentiment: float
    avg_buy_return_1m: Optional[float]
    avg_sell_return_1m: Optional[float]


class TopInsider(BaseModel):
    insider_name: str
    total_trades: int
    total_value: float
    buy_count: int
    sell_count: int
    avg_return_1m: Optional[float]
    symbols: List[str]


# Endpoints

@router.get("/", response_model=InsiderTradeListResponse)
async def get_insider_trades(
    session: AsyncSession = Depends(get_session),
    symbol: Optional[str] = Query(default=None, description="Filter by stock symbol"),
    transaction_type: Optional[str] = Query(default=None, description="Filter by transaction type (Buy/Sell)"),
    insider_name: Optional[str] = Query(default=None, description="Filter by insider name (partial match)"),
    min_value: Optional[float] = Query(default=None, description="Minimum transaction value"),
    days_back: int = Query(default=30, le=90, ge=1, description="Number of days to look back"),
    sort_by: str = Query(default="filing_date", description="Field to sort by"),
    sort_order: str = Query(default="desc", description="Sort order (asc/desc)"),
    limit: int = Query(default=50, le=200, description="Maximum number of results"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
):
    """
    Get insider trades with filtering and sorting.

    PUBLIC ENDPOINT - No authentication required.
    """
    # Build base query
    conditions = []

    # Date filter
    cutoff_date = date.today() - timedelta(days=days_back)
    conditions.append(InsiderTrade.filing_date >= cutoff_date)

    # Symbol filter
    if symbol:
        conditions.append(InsiderTrade.symbol == symbol.upper())

    # Transaction type filter
    if transaction_type:
        conditions.append(InsiderTrade.transaction_type.ilike(f"%{transaction_type}%"))

    # Insider name filter
    if insider_name:
        conditions.append(InsiderTrade.insider_name.ilike(f"%{insider_name}%"))

    # Minimum value filter
    if min_value is not None:
        conditions.append(InsiderTrade.total_value >= Decimal(str(min_value)))

    # Determine sort column
    sort_column = getattr(InsiderTrade, sort_by, InsiderTrade.filing_date)
    if sort_order.lower() == "desc":
        sort_column = desc(sort_column)

    # Count total matching records
    count_stmt = select(func.count(InsiderTrade.id)).where(and_(*conditions))
    total = await session.scalar(count_stmt) or 0

    # Get paginated results
    stmt = (
        select(InsiderTrade)
        .where(and_(*conditions))
        .order_by(sort_column)
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    trades = result.scalars().all()

    # Convert to response model
    trade_responses = []
    for trade in trades:
        trade_responses.append(
            InsiderTradeResponse(
                id=trade.id,
                symbol=trade.symbol,
                company_name=trade.company_name,
                insider_name=trade.insider_name,
                insider_title=trade.insider_title,
                relationship=trade.relationship,
                transaction_type=trade.transaction_type,
                transaction_code=trade.transaction_code,
                shares_traded=float(trade.shares_traded),
                price_per_share=float(trade.price_per_share) if trade.price_per_share else None,
                total_value=float(trade.total_value) if trade.total_value else None,
                shares_owned_after=float(trade.shares_owned_after) if trade.shares_owned_after else None,
                transaction_date=trade.transaction_date.isoformat(),
                filing_date=trade.filing_date.isoformat(),
                price_at_trade=float(trade.price_at_trade) if trade.price_at_trade else None,
                price_current=float(trade.price_current) if trade.price_current else None,
                return_1w_pct=float(trade.return_1w_pct) if trade.return_1w_pct else None,
                return_1m_pct=float(trade.return_1m_pct) if trade.return_1m_pct else None,
                return_3m_pct=float(trade.return_3m_pct) if trade.return_3m_pct else None,
                return_to_current_pct=float(trade.return_to_current_pct) if trade.return_to_current_pct else None,
                sp500_return_1w_pct=float(trade.sp500_return_1w_pct) if trade.sp500_return_1w_pct else None,
                sp500_return_1m_pct=float(trade.sp500_return_1m_pct) if trade.sp500_return_1m_pct else None,
                sp500_return_3m_pct=float(trade.sp500_return_3m_pct) if trade.sp500_return_3m_pct else None,
                alpha_1w_pct=float(trade.alpha_1w_pct) if trade.alpha_1w_pct else None,
                alpha_1m_pct=float(trade.alpha_1m_pct) if trade.alpha_1m_pct else None,
                alpha_3m_pct=float(trade.alpha_3m_pct) if trade.alpha_3m_pct else None,
                filing_url=trade.filing_url,
            )
        )

    return InsiderTradeListResponse(
        trades=trade_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/symbol/{symbol}", response_model=InsiderTradeListResponse)
async def get_trades_by_symbol(
    symbol: str,
    session: AsyncSession = Depends(get_session),
    days_back: int = Query(default=90, le=365, description="Number of days to look back"),
    limit: int = Query(default=50, le=200, description="Maximum number of results"),
    offset: int = Query(default=0, description="Number of results to skip"),
):
    """
    Get all insider trades for a specific stock symbol.

    PUBLIC ENDPOINT - No authentication required.
    """
    cutoff_date = date.today() - timedelta(days=days_back)

    # Count total
    count_stmt = (
        select(func.count(InsiderTrade.id))
        .where(
            and_(
                InsiderTrade.symbol == symbol.upper(),
                InsiderTrade.filing_date >= cutoff_date,
            )
        )
    )
    total = await session.scalar(count_stmt) or 0

    # Get trades
    stmt = (
        select(InsiderTrade)
        .where(
            and_(
                InsiderTrade.symbol == symbol.upper(),
                InsiderTrade.filing_date >= cutoff_date,
            )
        )
        .order_by(desc(InsiderTrade.filing_date))
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    trades = result.scalars().all()

    # Convert to response model
    trade_responses = []
    for trade in trades:
        trade_responses.append(
            InsiderTradeResponse(
                id=trade.id,
                symbol=trade.symbol,
                company_name=trade.company_name,
                insider_name=trade.insider_name,
                insider_title=trade.insider_title,
                relationship=trade.relationship,
                transaction_type=trade.transaction_type,
                transaction_code=trade.transaction_code,
                shares_traded=float(trade.shares_traded),
                price_per_share=float(trade.price_per_share) if trade.price_per_share else None,
                total_value=float(trade.total_value) if trade.total_value else None,
                shares_owned_after=float(trade.shares_owned_after) if trade.shares_owned_after else None,
                transaction_date=trade.transaction_date.isoformat(),
                filing_date=trade.filing_date.isoformat(),
                price_at_trade=float(trade.price_at_trade) if trade.price_at_trade else None,
                price_current=float(trade.price_current) if trade.price_current else None,
                return_1w_pct=float(trade.return_1w_pct) if trade.return_1w_pct else None,
                return_1m_pct=float(trade.return_1m_pct) if trade.return_1m_pct else None,
                return_3m_pct=float(trade.return_3m_pct) if trade.return_3m_pct else None,
                return_to_current_pct=float(trade.return_to_current_pct) if trade.return_to_current_pct else None,
                sp500_return_1w_pct=float(trade.sp500_return_1w_pct) if trade.sp500_return_1w_pct else None,
                sp500_return_1m_pct=float(trade.sp500_return_1m_pct) if trade.sp500_return_1m_pct else None,
                sp500_return_3m_pct=float(trade.sp500_return_3m_pct) if trade.sp500_return_3m_pct else None,
                alpha_1w_pct=float(trade.alpha_1w_pct) if trade.alpha_1w_pct else None,
                alpha_1m_pct=float(trade.alpha_1m_pct) if trade.alpha_1m_pct else None,
                alpha_3m_pct=float(trade.alpha_3m_pct) if trade.alpha_3m_pct else None,
                filing_url=trade.filing_url,
            )
        )

    return InsiderTradeListResponse(
        trades=trade_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/summary", response_model=List[InsiderSummary])
async def get_insider_summary(
    session: AsyncSession = Depends(get_session),
    days_back: int = Query(default=30, le=90, description="Number of days to look back"),
    sort_by: str = Query(default="net_insider_value", description="Field to sort by"),
    limit: int = Query(default=20, le=50, description="Maximum number of results"),
):
    """
    Get summary of insider activity by stock.

    PUBLIC ENDPOINT - No authentication required.
    Groups trades by symbol and provides aggregate statistics.
    """
    cutoff_date = date.today() - timedelta(days=days_back)

    # Build aggregation query
    # We need to do this in Python since SQLAlchemy's aggregation can be complex
    stmt = (
        select(InsiderTrade)
        .where(InsiderTrade.filing_date >= cutoff_date)
        .order_by(desc(InsiderTrade.filing_date))
    )
    result = await session.execute(stmt)
    all_trades = result.scalars().all()

    # Group by symbol
    symbol_data = {}
    for trade in all_trades:
        symbol = trade.symbol
        if symbol not in symbol_data:
            symbol_data[symbol] = {
                "trades": [],
                "buy_trades": [],
                "sell_trades": [],
            }

        symbol_data[symbol]["trades"].append(trade)

        # Classify as buy or sell
        if trade.transaction_type and "buy" in trade.transaction_type.lower():
            symbol_data[symbol]["buy_trades"].append(trade)
        elif trade.transaction_type and "sell" in trade.transaction_type.lower():
            symbol_data[symbol]["sell_trades"].append(trade)

    # Calculate summaries
    summaries = []
    for symbol, data in symbol_data.items():
        trades = data["trades"]
        buy_trades = data["buy_trades"]
        sell_trades = data["sell_trades"]

        total_buy_value = sum(
            float(t.total_value) for t in buy_trades if t.total_value
        )
        total_sell_value = sum(
            float(t.total_value) for t in sell_trades if t.total_value
        )

        # Calculate average returns
        buy_returns = [
            float(t.return_1m_pct) for t in buy_trades
            if t.return_1m_pct is not None
        ]
        sell_returns = [
            float(t.return_1m_pct) for t in sell_trades
            if t.return_1m_pct is not None
        ]

        avg_buy_return = sum(buy_returns) / len(buy_returns) if buy_returns else None
        avg_sell_return = sum(sell_returns) / len(sell_returns) if sell_returns else None

        # Find most recent trade and top insider
        most_recent = max(trades, key=lambda t: t.filing_date)

        # Count trades by insider
        insider_counts = {}
        for t in trades:
            insider_counts[t.insider_name] = insider_counts.get(t.insider_name, 0) + 1
        top_insider = max(insider_counts, key=insider_counts.get) if insider_counts else "Unknown"

        summaries.append(
            InsiderSummary(
                symbol=symbol,
                total_trades=len(trades),
                buy_count=len(buy_trades),
                sell_count=len(sell_trades),
                total_buy_value=total_buy_value,
                total_sell_value=total_sell_value,
                net_insider_value=total_buy_value - total_sell_value,
                avg_buy_return_1m=avg_buy_return,
                avg_sell_return_1m=avg_sell_return,
                most_recent_trade_date=most_recent.filing_date.isoformat(),
                top_insider=top_insider,
            )
        )

    # Sort summaries
    if sort_by == "net_insider_value":
        summaries.sort(key=lambda x: x.net_insider_value, reverse=True)
    elif sort_by == "total_trades":
        summaries.sort(key=lambda x: x.total_trades, reverse=True)
    elif sort_by == "total_buy_value":
        summaries.sort(key=lambda x: x.total_buy_value, reverse=True)
    elif sort_by == "total_sell_value":
        summaries.sort(key=lambda x: x.total_sell_value, reverse=True)

    return summaries[:limit]


@router.get("/top-insiders", response_model=List[TopInsider])
async def get_top_insiders(
    session: AsyncSession = Depends(get_session),
    days_back: int = Query(default=30, le=90, description="Number of days to look back"),
    transaction_type: Optional[str] = Query(default=None, description="Filter by transaction type"),
    limit: int = Query(default=20, le=50, description="Maximum number of results"),
):
    """
    Get top insiders by trading volume.

    PUBLIC ENDPOINT - No authentication required.
    """
    cutoff_date = date.today() - timedelta(days=days_back)

    conditions = [InsiderTrade.filing_date >= cutoff_date]

    if transaction_type:
        conditions.append(InsiderTrade.transaction_type.ilike(f"%{transaction_type}%"))

    # Get all matching trades
    stmt = select(InsiderTrade).where(and_(*conditions))
    result = await session.execute(stmt)
    all_trades = result.scalars().all()

    # Group by insider
    insider_data = {}
    for trade in all_trades:
        insider = trade.insider_name
        if insider not in insider_data:
            insider_data[insider] = {
                "trades": [],
                "symbols": set(),
                "buy_count": 0,
                "sell_count": 0,
            }

        insider_data[insider]["trades"].append(trade)
        insider_data[insider]["symbols"].add(trade.symbol)

        if trade.transaction_type and "buy" in trade.transaction_type.lower():
            insider_data[insider]["buy_count"] += 1
        elif trade.transaction_type and "sell" in trade.transaction_type.lower():
            insider_data[insider]["sell_count"] += 1

    # Calculate summaries
    top_insiders = []
    for insider_name, data in insider_data.items():
        trades = data["trades"]

        total_value = sum(
            float(t.total_value) for t in trades if t.total_value
        )

        # Calculate average 1m return
        returns_1m = [
            float(t.return_1m_pct) for t in trades
            if t.return_1m_pct is not None
        ]
        avg_return_1m = sum(returns_1m) / len(returns_1m) if returns_1m else None

        top_insiders.append(
            TopInsider(
                insider_name=insider_name,
                total_trades=len(trades),
                total_value=total_value,
                buy_count=data["buy_count"],
                sell_count=data["sell_count"],
                avg_return_1m=avg_return_1m,
                symbols=sorted(list(data["symbols"])),
            )
        )

    # Sort by total value
    top_insiders.sort(key=lambda x: x.total_value, reverse=True)

    return top_insiders[:limit]


@router.get("/stats", response_model=InsiderStats)
async def get_insider_stats(
    session: AsyncSession = Depends(get_session),
    days_back: int = Query(default=30, le=90, description="Number of days to look back"),
):
    """
    Get aggregate insider trading statistics.

    PUBLIC ENDPOINT - No authentication required.
    Provides overall market insider sentiment and performance metrics.
    """
    cutoff_date = date.today() - timedelta(days=days_back)

    # Get all trades in period
    stmt = select(InsiderTrade).where(InsiderTrade.filing_date >= cutoff_date)
    result = await session.execute(stmt)
    all_trades = result.scalars().all()

    if not all_trades:
        return InsiderStats(
            period_days=days_back,
            total_trades=0,
            unique_stocks=0,
            unique_insiders=0,
            total_buy_value=0.0,
            total_sell_value=0.0,
            net_insider_sentiment=0.0,
            avg_buy_return_1m=None,
            avg_sell_return_1m=None,
        )

    # Calculate aggregates
    unique_stocks = len(set(t.symbol for t in all_trades))
    unique_insiders = len(set(t.insider_name for t in all_trades))

    buy_trades = []
    sell_trades = []

    for trade in all_trades:
        if trade.transaction_type and "buy" in trade.transaction_type.lower():
            buy_trades.append(trade)
        elif trade.transaction_type and "sell" in trade.transaction_type.lower():
            sell_trades.append(trade)

    total_buy_value = sum(
        float(t.total_value) for t in buy_trades if t.total_value
    )
    total_sell_value = sum(
        float(t.total_value) for t in sell_trades if t.total_value
    )

    # Net insider sentiment (positive = more buying, negative = more selling)
    net_insider_sentiment = total_buy_value - total_sell_value

    # Calculate average returns
    buy_returns = [
        float(t.return_1m_pct) for t in buy_trades
        if t.return_1m_pct is not None
    ]
    sell_returns = [
        float(t.return_1m_pct) for t in sell_trades
        if t.return_1m_pct is not None
    ]

    avg_buy_return = sum(buy_returns) / len(buy_returns) if buy_returns else None
    avg_sell_return = sum(sell_returns) / len(sell_returns) if sell_returns else None

    return InsiderStats(
        period_days=days_back,
        total_trades=len(all_trades),
        unique_stocks=unique_stocks,
        unique_insiders=unique_insiders,
        total_buy_value=total_buy_value,
        total_sell_value=total_sell_value,
        net_insider_sentiment=net_insider_sentiment,
        avg_buy_return_1m=avg_buy_return,
        avg_sell_return_1m=avg_sell_return,
    )
