"""Benchmark comparison schemas."""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class BenchmarkPerformance(BaseModel):
    """Single benchmark performance."""

    symbol: str
    name: str
    current_value: Decimal
    change_pct: Decimal
    ytd_return: Decimal | None


class BenchmarksResponse(BaseModel):
    """All benchmarks response."""

    benchmarks: list[BenchmarkPerformance]
    updated_at: datetime


class PortfolioVsBenchmark(BaseModel):
    """Portfolio comparison to benchmark."""

    date: str
    portfolio_value: Decimal
    portfolio_return_pct: Decimal
    benchmark_values: dict[str, Decimal]  # symbol -> value
    benchmark_returns: dict[str, Decimal]  # symbol -> return %


class PortfolioBenchmarkComparisonResponse(BaseModel):
    """Portfolio vs benchmarks comparison."""

    portfolio_id: int
    portfolio_name: str
    starting_value: Decimal
    current_value: Decimal
    total_return_pct: Decimal
    history: list[PortfolioVsBenchmark]
    benchmark_symbols: list[str]
