"""
Technical Analysis API routes for S&P 500 stock data.
Provides endpoints for historical data, technical indicators, pattern detection, and screening.
"""
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_session
from app.models.sp500 import SP500_TICKERS, SP500Stock, StockDailyHistory, StockHourlyData
from app.models.market_data import MarketPrice

router = APIRouter(prefix="/analysis", tags=["analysis"])


# ==================== Response Models ====================

class StockInfo(BaseModel):
    symbol: str
    name: Optional[str]
    sector: Optional[str]
    industry: Optional[str]
    market_cap: Optional[int]


class DailyOHLC(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    change: Optional[float]
    change_pct: Optional[float]


class DailyWithIndicators(DailyOHLC):
    sma_5: Optional[float]
    sma_10: Optional[float]
    sma_20: Optional[float]
    sma_50: Optional[float]
    sma_200: Optional[float]
    ema_12: Optional[float]
    ema_26: Optional[float]
    rsi_14: Optional[float]
    macd: Optional[float]
    macd_signal: Optional[float]
    macd_histogram: Optional[float]
    bollinger_upper: Optional[float]
    bollinger_middle: Optional[float]
    bollinger_lower: Optional[float]
    atr_14: Optional[float]
    obv: Optional[int]
    vwap: Optional[float]


class HourlyOHLC(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    sma_20: Optional[float]
    rsi_14: Optional[float]
    vwap: Optional[float]
    change: Optional[float]
    change_pct: Optional[float]


class StockStats(BaseModel):
    symbol: str
    current_price: float
    price_change_1d: Optional[float]
    price_change_1w: Optional[float]
    price_change_1m: Optional[float]
    price_change_ytd: Optional[float]
    volatility_30d: Optional[float]
    avg_volume_30d: Optional[int]
    high_52w: float
    low_52w: float
    rsi_current: Optional[float]
    trend: str  # bullish, bearish, neutral
    above_sma_20: Optional[bool]
    above_sma_50: Optional[bool]
    above_sma_200: Optional[bool]


class PatternSignal(BaseModel):
    pattern: str
    signal: str  # bullish, bearish
    strength: str  # strong, moderate, weak
    description: str


class PatternDetection(BaseModel):
    symbol: str
    patterns: List[PatternSignal]
    overall_signal: str


class ScreenerResult(BaseModel):
    symbol: str
    name: Optional[str]
    sector: Optional[str]
    price: float
    change_pct: Optional[float]
    rsi_14: Optional[float]
    volume: int
    trend: str


class SectorPerformanceData(BaseModel):
    sector: str
    avg_change_pct: float
    stock_count: int
    top_gainer: str
    top_loser: str


class HeatmapStock(BaseModel):
    symbol: str
    name: Optional[str]
    sector: Optional[str]
    price: float
    change_pct: float
    market_cap: Optional[int]


# ==================== Endpoints ====================

@router.get("/sp500/tickers")
async def get_sp500_tickers():
    """Get complete list of S&P 500 tickers."""
    return {
        "tickers": SP500_TICKERS,
        "count": len(SP500_TICKERS)
    }


@router.get("/sp500/stocks", response_model=List[StockInfo])
async def get_sp500_stocks(
    session: AsyncSession = Depends(get_session),
    sector: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=503),
):
    """Get S&P 500 stocks with metadata, optionally filtered by sector."""
    stmt = select(SP500Stock).where(SP500Stock.is_active == True)

    if sector:
        stmt = stmt.where(SP500Stock.sector == sector)

    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    stocks = result.scalars().all()

    return [
        StockInfo(
            symbol=s.symbol,
            name=s.name,
            sector=s.sector,
            industry=s.industry,
            market_cap=s.market_cap,
        )
        for s in stocks
    ]


@router.get("/sp500/sectors")
async def get_sp500_sectors(session: AsyncSession = Depends(get_session)):
    """Get list of unique sectors in S&P 500."""
    stmt = (
        select(SP500Stock.sector, func.count(SP500Stock.id).label('count'))
        .where(SP500Stock.sector.isnot(None))
        .group_by(SP500Stock.sector)
        .order_by(desc('count'))
    )
    result = await session.execute(stmt)
    sectors = result.all()

    return {
        "sectors": [{"sector": s[0], "count": s[1]} for s in sectors]
    }


@router.get("/daily/{symbol}", response_model=List[DailyWithIndicators])
async def get_daily_history(
    symbol: str,
    session: AsyncSession = Depends(get_session),
    days: int = Query(default=365, le=730, ge=1),
):
    """
    Get daily historical data with technical indicators for a symbol.
    Max 2 years (730 days) of data available.
    """
    symbol = symbol.upper()
    if symbol not in SP500_TICKERS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not in S&P 500")

    since_date = date.today() - timedelta(days=days)

    stmt = (
        select(StockDailyHistory)
        .where(
            and_(
                StockDailyHistory.symbol == symbol,
                StockDailyHistory.date >= since_date
            )
        )
        .order_by(StockDailyHistory.date.asc())
    )

    result = await session.execute(stmt)
    records = result.scalars().all()

    if not records:
        raise HTTPException(status_code=404, detail=f"No daily data for {symbol}")

    return [
        DailyWithIndicators(
            date=str(r.date),
            open=float(r.open),
            high=float(r.high),
            low=float(r.low),
            close=float(r.close),
            volume=r.volume,
            change=float(r.change) if r.change else None,
            change_pct=float(r.change_pct) if r.change_pct else None,
            sma_5=float(r.sma_5) if r.sma_5 else None,
            sma_10=float(r.sma_10) if r.sma_10 else None,
            sma_20=float(r.sma_20) if r.sma_20 else None,
            sma_50=float(r.sma_50) if r.sma_50 else None,
            sma_200=float(r.sma_200) if r.sma_200 else None,
            ema_12=float(r.ema_12) if r.ema_12 else None,
            ema_26=float(r.ema_26) if r.ema_26 else None,
            rsi_14=float(r.rsi_14) if r.rsi_14 else None,
            macd=float(r.macd) if r.macd else None,
            macd_signal=float(r.macd_signal) if r.macd_signal else None,
            macd_histogram=float(r.macd_histogram) if r.macd_histogram else None,
            bollinger_upper=float(r.bollinger_upper) if r.bollinger_upper else None,
            bollinger_middle=float(r.bollinger_middle) if r.bollinger_middle else None,
            bollinger_lower=float(r.bollinger_lower) if r.bollinger_lower else None,
            atr_14=float(r.atr_14) if r.atr_14 else None,
            obv=r.obv,
            vwap=float(r.vwap) if r.vwap else None,
        )
        for r in records
    ]


@router.get("/hourly/{symbol}", response_model=List[HourlyOHLC])
async def get_hourly_data(
    symbol: str,
    session: AsyncSession = Depends(get_session),
    hours: int = Query(default=168, le=168, ge=1),  # Max 7 days
):
    """
    Get hourly data for a symbol.
    Max 7 days (168 hours) of data available.
    """
    symbol = symbol.upper()
    if symbol not in SP500_TICKERS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not in S&P 500")

    since = datetime.utcnow() - timedelta(hours=hours)

    stmt = (
        select(StockHourlyData)
        .where(
            and_(
                StockHourlyData.symbol == symbol,
                StockHourlyData.timestamp >= since
            )
        )
        .order_by(StockHourlyData.timestamp.asc())
    )

    result = await session.execute(stmt)
    records = result.scalars().all()

    return [
        HourlyOHLC(
            timestamp=r.timestamp.isoformat(),
            open=float(r.open),
            high=float(r.high),
            low=float(r.low),
            close=float(r.close),
            volume=r.volume,
            sma_20=float(r.sma_20) if r.sma_20 else None,
            rsi_14=float(r.rsi_14) if r.rsi_14 else None,
            vwap=float(r.vwap) if r.vwap else None,
            change=float(r.change) if r.change else None,
            change_pct=float(r.change_pct) if r.change_pct else None,
        )
        for r in records
    ]


@router.get("/stats/{symbol}", response_model=StockStats)
async def get_stock_stats(
    symbol: str,
    session: AsyncSession = Depends(get_session),
):
    """Get comprehensive statistics for a stock."""
    symbol = symbol.upper()

    # Get daily history
    stmt = (
        select(StockDailyHistory)
        .where(StockDailyHistory.symbol == symbol)
        .order_by(StockDailyHistory.date.desc())
        .limit(365)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()

    if not records:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    latest = records[0]
    closes = [float(r.close) for r in records]
    current = closes[0]

    # Calculate changes
    change_1d = ((current - closes[1]) / closes[1] * 100) if len(closes) > 1 else None
    change_1w = ((current - closes[min(5, len(closes)-1)]) / closes[min(5, len(closes)-1)] * 100) if len(closes) > 5 else None
    change_1m = ((current - closes[min(22, len(closes)-1)]) / closes[min(22, len(closes)-1)] * 100) if len(closes) > 22 else None

    # YTD calculation
    ytd_start = date(date.today().year, 1, 1)
    ytd_records = [r for r in records if r.date >= ytd_start]
    change_ytd = None
    if ytd_records and len(ytd_records) > 1:
        first_price = float(ytd_records[-1].close)
        change_ytd = ((current - first_price) / first_price * 100)

    # 52-week high/low
    records_52w = records[:min(252, len(records))]
    high_52w = max(float(r.high) for r in records_52w)
    low_52w = min(float(r.low) for r in records_52w)

    # 30-day volatility (std dev of returns)
    import numpy as np
    returns_30d = []
    for i in range(min(30, len(closes) - 1)):
        ret = (closes[i] - closes[i + 1]) / closes[i + 1]
        returns_30d.append(ret)
    volatility = float(np.std(returns_30d) * 100) if returns_30d else None

    # Average volume 30d
    volumes_30d = [r.volume for r in records[:30]]
    avg_volume = int(np.mean(volumes_30d)) if volumes_30d else None

    # Determine trend
    trend = "neutral"
    if latest.sma_20 and latest.sma_50:
        if float(latest.sma_20) > float(latest.sma_50) and current > float(latest.sma_20):
            trend = "bullish"
        elif float(latest.sma_20) < float(latest.sma_50) and current < float(latest.sma_20):
            trend = "bearish"

    return StockStats(
        symbol=symbol,
        current_price=current,
        price_change_1d=change_1d,
        price_change_1w=change_1w,
        price_change_1m=change_1m,
        price_change_ytd=change_ytd,
        volatility_30d=volatility,
        avg_volume_30d=avg_volume,
        high_52w=high_52w,
        low_52w=low_52w,
        rsi_current=float(latest.rsi_14) if latest.rsi_14 else None,
        trend=trend,
        above_sma_20=current > float(latest.sma_20) if latest.sma_20 else None,
        above_sma_50=current > float(latest.sma_50) if latest.sma_50 else None,
        above_sma_200=current > float(latest.sma_200) if latest.sma_200 else None,
    )


@router.get("/patterns/{symbol}", response_model=PatternDetection)
async def detect_patterns(
    symbol: str,
    session: AsyncSession = Depends(get_session),
):
    """Detect technical patterns for a stock."""
    symbol = symbol.upper()

    stmt = (
        select(StockDailyHistory)
        .where(StockDailyHistory.symbol == symbol)
        .order_by(StockDailyHistory.date.desc())
        .limit(50)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()

    if len(records) < 2:
        return PatternDetection(symbol=symbol, patterns=[], overall_signal="neutral")

    patterns = []
    latest = records[0]
    previous = records[1]
    current_price = float(latest.close)

    # RSI patterns
    if latest.rsi_14:
        rsi = float(latest.rsi_14)
        if rsi < 30:
            patterns.append(PatternSignal(
                pattern="RSI Oversold",
                signal="bullish",
                strength="strong" if rsi < 20 else "moderate",
                description=f"RSI at {rsi:.1f} indicates oversold conditions"
            ))
        elif rsi > 70:
            patterns.append(PatternSignal(
                pattern="RSI Overbought",
                signal="bearish",
                strength="strong" if rsi > 80 else "moderate",
                description=f"RSI at {rsi:.1f} indicates overbought conditions"
            ))

    # Golden/Death Cross
    if latest.sma_50 and latest.sma_200 and previous.sma_50 and previous.sma_200:
        sma50_now, sma200_now = float(latest.sma_50), float(latest.sma_200)
        sma50_prev, sma200_prev = float(previous.sma_50), float(previous.sma_200)

        if sma50_prev <= sma200_prev and sma50_now > sma200_now:
            patterns.append(PatternSignal(
                pattern="Golden Cross",
                signal="bullish",
                strength="strong",
                description="50-day SMA crossed above 200-day SMA"
            ))
        elif sma50_prev >= sma200_prev and sma50_now < sma200_now:
            patterns.append(PatternSignal(
                pattern="Death Cross",
                signal="bearish",
                strength="strong",
                description="50-day SMA crossed below 200-day SMA"
            ))

    # MACD Crossover
    if latest.macd and latest.macd_signal and previous.macd and previous.macd_signal:
        macd_now, signal_now = float(latest.macd), float(latest.macd_signal)
        macd_prev, signal_prev = float(previous.macd), float(previous.macd_signal)

        if macd_prev <= signal_prev and macd_now > signal_now:
            patterns.append(PatternSignal(
                pattern="MACD Bullish Crossover",
                signal="bullish",
                strength="moderate",
                description="MACD crossed above signal line"
            ))
        elif macd_prev >= signal_prev and macd_now < signal_now:
            patterns.append(PatternSignal(
                pattern="MACD Bearish Crossover",
                signal="bearish",
                strength="moderate",
                description="MACD crossed below signal line"
            ))

    # Bollinger Band breakouts
    if latest.bollinger_upper and latest.bollinger_lower:
        upper, lower = float(latest.bollinger_upper), float(latest.bollinger_lower)

        if current_price > upper:
            patterns.append(PatternSignal(
                pattern="Bollinger Breakout (Upper)",
                signal="bearish",
                strength="moderate",
                description="Price broke above upper Bollinger Band"
            ))
        elif current_price < lower:
            patterns.append(PatternSignal(
                pattern="Bollinger Breakout (Lower)",
                signal="bullish",
                strength="moderate",
                description="Price broke below lower Bollinger Band"
            ))

    # SMA Support/Resistance
    if latest.sma_200:
        sma200 = float(latest.sma_200)
        pct_from_sma200 = ((current_price - sma200) / sma200) * 100

        if -2 <= pct_from_sma200 <= 2:
            patterns.append(PatternSignal(
                pattern="Near 200-day SMA",
                signal="bullish" if current_price > sma200 else "bearish",
                strength="weak",
                description=f"Price is {pct_from_sma200:.1f}% from 200-day SMA"
            ))

    # Overall signal
    bullish_count = sum(1 for p in patterns if p.signal == "bullish")
    bearish_count = sum(1 for p in patterns if p.signal == "bearish")

    if bullish_count > bearish_count:
        overall = "bullish"
    elif bearish_count > bullish_count:
        overall = "bearish"
    else:
        overall = "neutral"

    return PatternDetection(
        symbol=symbol,
        patterns=patterns,
        overall_signal=overall
    )


@router.get("/screener", response_model=List[ScreenerResult])
async def stock_screener(
    session: AsyncSession = Depends(get_session),
    rsi_below: Optional[float] = Query(default=None, description="RSI below this value"),
    rsi_above: Optional[float] = Query(default=None, description="RSI above this value"),
    trend: Optional[str] = Query(default=None, regex="^(bullish|bearish|neutral)$"),
    sector: Optional[str] = Query(default=None),
    sort_by: str = Query(default="change_pct", regex="^(change_pct|volume|rsi_14)$"),
    sort_order: str = Query(default="desc", regex="^(asc|desc)$"),
    limit: int = Query(default=50, le=100),
):
    """
    Screen S&P 500 stocks based on technical criteria.
    Returns stocks matching the specified filters.
    """
    # Get latest data for all symbols using subquery
    subquery = (
        select(
            StockDailyHistory.symbol,
            func.max(StockDailyHistory.date).label('latest_date')
        )
        .group_by(StockDailyHistory.symbol)
        .subquery()
    )

    stmt = (
        select(StockDailyHistory)
        .join(
            subquery,
            and_(
                StockDailyHistory.symbol == subquery.c.symbol,
                StockDailyHistory.date == subquery.c.latest_date
            )
        )
    )

    result = await session.execute(stmt)
    records = result.scalars().all()

    # Get stock metadata for sector filtering
    stock_meta = {}
    meta_stmt = select(SP500Stock)
    meta_result = await session.execute(meta_stmt)
    for stock in meta_result.scalars().all():
        stock_meta[stock.symbol] = stock

    filtered = []
    for r in records:
        include = True
        meta = stock_meta.get(r.symbol)

        # RSI filters
        if rsi_below and r.rsi_14 and float(r.rsi_14) > rsi_below:
            include = False
        if rsi_above and r.rsi_14 and float(r.rsi_14) < rsi_above:
            include = False

        # Trend filter
        if trend and r.sma_20 and r.sma_50:
            stock_trend = "neutral"
            price = float(r.close)
            sma20, sma50 = float(r.sma_20), float(r.sma_50)
            if sma20 > sma50 and price > sma20:
                stock_trend = "bullish"
            elif sma20 < sma50 and price < sma20:
                stock_trend = "bearish"
            if stock_trend != trend:
                include = False

        # Sector filter
        if sector and meta and meta.sector != sector:
            include = False

        if include:
            stock_trend = "neutral"
            if r.sma_20 and r.sma_50:
                price = float(r.close)
                sma20, sma50 = float(r.sma_20), float(r.sma_50)
                if sma20 > sma50 and price > sma20:
                    stock_trend = "bullish"
                elif sma20 < sma50 and price < sma20:
                    stock_trend = "bearish"

            filtered.append(ScreenerResult(
                symbol=r.symbol,
                name=meta.name if meta else None,
                sector=meta.sector if meta else None,
                price=float(r.close),
                change_pct=float(r.change_pct) if r.change_pct else None,
                rsi_14=float(r.rsi_14) if r.rsi_14 else None,
                volume=r.volume,
                trend=stock_trend,
            ))

    # Sort results
    reverse = sort_order == "desc"
    if sort_by == "change_pct":
        filtered.sort(key=lambda x: x.change_pct or 0, reverse=reverse)
    elif sort_by == "volume":
        filtered.sort(key=lambda x: x.volume, reverse=reverse)
    elif sort_by == "rsi_14":
        filtered.sort(key=lambda x: x.rsi_14 or 50, reverse=reverse)

    return filtered[:limit]


@router.get("/heatmap", response_model=List[HeatmapStock])
async def get_sp500_heatmap(
    session: AsyncSession = Depends(get_session),
):
    """
    Get S&P 500 heatmap data with prices and changes.
    Used for treemap visualization.
    """
    # Get latest prices from MarketPrice table
    stmt = select(MarketPrice).where(MarketPrice.symbol.in_(SP500_TICKERS))
    result = await session.execute(stmt)
    prices = {p.symbol: p for p in result.scalars().all()}

    # Get stock metadata
    meta_stmt = select(SP500Stock)
    meta_result = await session.execute(meta_stmt)
    stock_meta = {s.symbol: s for s in meta_result.scalars().all()}

    heatmap_data = []
    for symbol in SP500_TICKERS:
        price = prices.get(symbol)
        meta = stock_meta.get(symbol)

        if price:
            heatmap_data.append(HeatmapStock(
                symbol=symbol,
                name=price.name or (meta.name if meta else None),
                sector=price.sector or (meta.sector if meta else None),
                price=float(price.price),
                change_pct=float(price.change_pct) if price.change_pct else 0,
                market_cap=price.market_cap or (meta.market_cap if meta else None),
            ))

    # Sort by market cap for better treemap visualization
    heatmap_data.sort(key=lambda x: x.market_cap or 0, reverse=True)

    return heatmap_data


@router.get("/sector-performance", response_model=List[SectorPerformanceData])
async def get_sector_performance(
    session: AsyncSession = Depends(get_session),
):
    """Get performance breakdown by sector."""
    # Get latest data with sectors
    subquery = (
        select(
            StockDailyHistory.symbol,
            func.max(StockDailyHistory.date).label('latest_date')
        )
        .group_by(StockDailyHistory.symbol)
        .subquery()
    )

    stmt = (
        select(StockDailyHistory)
        .join(
            subquery,
            and_(
                StockDailyHistory.symbol == subquery.c.symbol,
                StockDailyHistory.date == subquery.c.latest_date
            )
        )
    )

    result = await session.execute(stmt)
    records = result.scalars().all()

    # Get stock metadata
    meta_stmt = select(SP500Stock)
    meta_result = await session.execute(meta_stmt)
    stock_meta = {s.symbol: s for s in meta_result.scalars().all()}

    # Group by sector
    sector_data = {}
    for r in records:
        meta = stock_meta.get(r.symbol)
        if not meta or not meta.sector:
            continue

        sector = meta.sector
        if sector not in sector_data:
            sector_data[sector] = {
                'changes': [],
                'stocks': [],
            }

        change_pct = float(r.change_pct) if r.change_pct else 0
        sector_data[sector]['changes'].append(change_pct)
        sector_data[sector]['stocks'].append((r.symbol, change_pct))

    # Calculate sector performance
    import numpy as np
    performance = []
    for sector, data in sector_data.items():
        stocks = data['stocks']
        stocks.sort(key=lambda x: x[1], reverse=True)

        performance.append(SectorPerformanceData(
            sector=sector,
            avg_change_pct=float(np.mean(data['changes'])),
            stock_count=len(stocks),
            top_gainer=stocks[0][0] if stocks else "",
            top_loser=stocks[-1][0] if stocks else "",
        ))

    performance.sort(key=lambda x: x.avg_change_pct, reverse=True)
    return performance
