"""Market data schemas for API."""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class QuoteResponse(BaseModel):
    """Individual stock quote."""

    model_config = ConfigDict(from_attributes=True)

    symbol: str
    price: Decimal
    change: Decimal | None
    change_pct: Decimal | None
    volume: int | None
    name: str | None
    sector: str | None
    updated_at: datetime


class SectorData(BaseModel):
    """Sector performance for heatmap."""

    sector: str
    change_pct: Decimal
    market_cap: int | None


class SectorHeatmapResponse(BaseModel):
    """Sector heatmap response."""

    sectors: list[SectorData]
    updated_at: datetime


class TopMover(BaseModel):
    """Top mover stock."""

    symbol: str
    name: str | None
    price: Decimal
    change_pct: Decimal
    volume: int | None


class TopMoversResponse(BaseModel):
    """Top movers response."""

    gainers: list[TopMover]
    losers: list[TopMover]
    most_active: list[TopMover]
    updated_at: datetime


class IndexData(BaseModel):
    """Market index data."""

    symbol: str
    name: str
    value: Decimal
    change: Decimal | None
    change_pct: Decimal | None


class MarketIndicesResponse(BaseModel):
    """Market indices response."""

    indices: list[IndexData]
    updated_at: datetime


class SymbolSearchResult(BaseModel):
    """Symbol search result."""

    symbol: str
    name: str
    sector: str | None


class SymbolSearchResponse(BaseModel):
    """Symbol search response."""

    results: list[SymbolSearchResult]
