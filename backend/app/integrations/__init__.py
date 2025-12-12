"""External integrations."""
from app.integrations.market_data import MarketDataProvider, get_market_data_provider

__all__ = ["MarketDataProvider", "get_market_data_provider"]
