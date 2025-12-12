"""Market data API routes - PUBLIC."""
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.market_data import MarketPrice, SectorPerformance, MarketIndex
from app.schemas.market import (
    QuoteResponse,
    SectorHeatmapResponse,
    SectorData,
    TopMoversResponse,
    TopMover,
    MarketIndicesResponse,
    IndexData,
    SymbolSearchResponse,
    SymbolSearchResult,
)
from app.integrations.market_data import MarketDataProvider, get_market_data_provider

router = APIRouter(prefix="/market", tags=["market"])

# Fallback indices configuration
FALLBACK_INDICES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ Composite",
    "^DJI": "Dow Jones Industrial",
    "^VIX": "CBOE Volatility Index",
}


@router.get("/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(
    symbol: str,
    session: AsyncSession = Depends(get_session),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> QuoteResponse:
    """
    Get quote for a specific symbol.

    PUBLIC ENDPOINT - No authentication required.
    First checks cache, then fetches from Yahoo Finance if not found.
    """
    symbol = symbol.upper()

    # Check cache first
    stmt = select(MarketPrice).where(MarketPrice.symbol == symbol)
    result = await session.execute(stmt)
    cached = result.scalar_one_or_none()

    if cached:
        return QuoteResponse.model_validate(cached)

    # Fetch from Yahoo Finance
    try:
        quote = await market_data.quote(symbol)
        return QuoteResponse(
            symbol=symbol,
            price=quote.price,
            change=quote.change,
            change_pct=quote.change_pct,
            volume=quote.volume,
            name=quote.name,
            sector=quote.sector,
            updated_at=datetime.utcnow(),
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")


@router.get("/sectors", response_model=SectorHeatmapResponse)
async def get_sector_heatmap(
    session: AsyncSession = Depends(get_session),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> SectorHeatmapResponse:
    """
    Get sector performance data for heatmap visualization.

    PUBLIC ENDPOINT - No authentication required.
    Falls back to live Yahoo Finance data if database is empty.
    """
    stmt = select(SectorPerformance).order_by(SectorPerformance.change_pct.desc())
    result = await session.execute(stmt)
    sectors = result.scalars().all()

    # If database has data, return it
    if sectors:
        return SectorHeatmapResponse(
            sectors=[
                SectorData(
                    sector=s.sector,
                    change_pct=s.change_pct,
                    market_cap=s.market_cap,
                )
                for s in sectors
            ],
            updated_at=datetime.utcnow(),
        )

    # Fallback: Try to fetch live data from sector ETFs
    print("Warning: SectorPerformance table is empty, fetching live data...")
    sector_etfs = {
        "Technology": "XLK",
        "Financial": "XLF",
        "Healthcare": "XLV",
        "Energy": "XLE",
        "Industrials": "XLI",
        "Consumer Defensive": "XLP",
        "Consumer Cyclical": "XLY",
        "Real Estate": "XLRE",
        "Utilities": "XLU",
        "Communication Services": "XLC",
        "Basic Materials": "XLB",
    }

    sector_data = []
    for sector, etf in sector_etfs.items():
        try:
            quote = await market_data.quote(etf)
            sector_data.append(
                SectorData(
                    sector=sector,
                    change_pct=quote.change_pct or 0,
                    market_cap=None,
                )
            )
        except Exception as e:
            print(f"Error fetching sector {sector} ({etf}): {e}")
            continue

    # Sort by change_pct descending
    sector_data.sort(key=lambda x: x.change_pct, reverse=True)

    return SectorHeatmapResponse(
        sectors=sector_data,
        updated_at=datetime.utcnow(),
    )


@router.get("/movers", response_model=TopMoversResponse)
async def get_top_movers(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=10, le=50, ge=1),
) -> TopMoversResponse:
    """
    Get top gainers, losers, and most active stocks.

    PUBLIC ENDPOINT - No authentication required.
    Returns empty arrays if database is not populated yet.
    """
    # Top gainers
    gainers_stmt = (
        select(MarketPrice)
        .where(MarketPrice.change_pct.isnot(None))
        .order_by(MarketPrice.change_pct.desc())
        .limit(limit)
    )
    gainers_result = await session.execute(gainers_stmt)
    gainers = gainers_result.scalars().all()

    # Top losers
    losers_stmt = (
        select(MarketPrice)
        .where(MarketPrice.change_pct.isnot(None))
        .order_by(MarketPrice.change_pct.asc())
        .limit(limit)
    )
    losers_result = await session.execute(losers_stmt)
    losers = losers_result.scalars().all()

    # Most active
    active_stmt = (
        select(MarketPrice)
        .where(MarketPrice.volume.isnot(None))
        .order_by(MarketPrice.volume.desc())
        .limit(limit)
    )
    active_result = await session.execute(active_stmt)
    most_active = active_result.scalars().all()

    def to_mover(m: MarketPrice) -> TopMover:
        return TopMover(
            symbol=m.symbol,
            name=m.name,
            price=m.price,
            change_pct=m.change_pct or 0,
            volume=m.volume,
        )

    return TopMoversResponse(
        gainers=[to_mover(g) for g in gainers],
        losers=[to_mover(l) for l in losers],
        most_active=[to_mover(a) for a in most_active],
        updated_at=datetime.utcnow(),
    )


@router.get("/indices", response_model=MarketIndicesResponse)
async def get_market_indices(
    session: AsyncSession = Depends(get_session),
    market_data: MarketDataProvider = Depends(get_market_data_provider),
) -> MarketIndicesResponse:
    """
    Get market indices (S&P 500, NASDAQ, DOW, VIX).

    PUBLIC ENDPOINT - No authentication required.
    Falls back to live Yahoo Finance data if database is empty.
    """
    stmt = select(MarketIndex)
    result = await session.execute(stmt)
    indices = result.scalars().all()

    # If database has data, return it
    if indices:
        return MarketIndicesResponse(
            indices=[
                IndexData(
                    symbol=i.symbol,
                    name=i.name,
                    value=i.value,
                    change=i.change,
                    change_pct=i.change_pct,
                )
                for i in indices
            ],
            updated_at=datetime.utcnow(),
        )

    # Fallback: Try to fetch live data from Yahoo Finance
    print("Warning: MarketIndex table is empty, fetching live data...")
    index_data = []
    for symbol, name in FALLBACK_INDICES.items():
        try:
            quote = await market_data.quote(symbol)
            index_data.append(
                IndexData(
                    symbol=symbol,
                    name=name,
                    value=quote.price,
                    change=quote.change,
                    change_pct=quote.change_pct,
                )
            )
        except Exception as e:
            print(f"Error fetching index {symbol}: {e}")
            continue

    return MarketIndicesResponse(
        indices=index_data,
        updated_at=datetime.utcnow(),
    )


@router.get("/search", response_model=SymbolSearchResponse)
async def search_symbols(
    q: str = Query(min_length=1, max_length=20),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=20, le=50, ge=1),
) -> SymbolSearchResponse:
    """
    Search for stock symbols.

    PUBLIC ENDPOINT - No authentication required.
    """
    search_pattern = f"%{q.upper()}%"

    stmt = (
        select(MarketPrice)
        .where(
            (MarketPrice.symbol.ilike(search_pattern)) |
            (MarketPrice.name.ilike(search_pattern))
        )
        .limit(limit)
    )
    result = await session.execute(stmt)
    matches = result.scalars().all()

    return SymbolSearchResponse(
        results=[
            SymbolSearchResult(
                symbol=m.symbol,
                name=m.name or m.symbol,
                sector=m.sector,
            )
            for m in matches
        ]
    )
