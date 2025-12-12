"""Application configuration and settings management."""

from datetime import date, timedelta
from functools import lru_cache
from typing import Literal, Optional

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SecuritySettings(BaseModel):
    """Security-related settings such as secrets and token expirations."""

    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 14
    password_salt_rounds: int = 12


class DatabaseSettings(BaseModel):
    """Database configuration for Postgres and Redis."""

    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_user: str = "stock_game"
    postgres_password: str = "stock_game"
    postgres_db: str = "stock_game"
    pool_size: int = 10
    pool_timeout: int = 30
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Get async SQLAlchemy database URI."""
        return (
            "postgresql+asyncpg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def async_url(self) -> str:
        """Alias for sqlalchemy_database_uri."""
        return self.sqlalchemy_database_uri

    @property
    def sync_sqlalchemy_uri(self) -> str:
        """Get sync SQLAlchemy database URI."""
        return (
            "postgresql+psycopg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_dsn(self) -> str:
        """Get Redis DSN."""
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


class TradingRules(BaseModel):
    """Game rule settings - SIMPLIFIED for 180-day competition."""

    # Starting capital for all players
    starting_capital: int = 100000

    # Game duration
    game_duration_days: int = 180

    # Trading permissions
    allow_short_selling: bool = True
    allow_borrowing: bool = False

    # NO TRADE LIMITS (removed from old version)
    # - No trades_per_window
    # - No window_days
    # - No trade_value_cap_pct


class GameSettings(BaseModel):
    """Game configuration - set via environment variables."""

    # Start date of the competition (format: YYYY-MM-DD)
    start_date: Optional[date] = None

    # Duration in days (default: 180)
    duration_days: int = 180

    # Starting capital for each player
    starting_capital: int = 100000

    @property
    def end_date(self) -> Optional[date]:
        """Calculate end date from start date and duration."""
        if self.start_date:
            return self.start_date + timedelta(days=self.duration_days)
        return None

    @property
    def is_configured(self) -> bool:
        """Check if game is properly configured."""
        return self.start_date is not None


class MarketDataSettings(BaseModel):
    """Configuration for Yahoo Finance integration."""

    provider: Literal["yahoo"] = "yahoo"
    request_timeout_seconds: int = 5
    cache_ttl_seconds: int = 15
    symbols_refresh_minutes: int = 5


class AppSettings(BaseSettings):
    """Top-level application settings."""

    model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__")

    environment: Literal["local", "development", "production", "test"] = "local"
    debug: bool = True
    api_prefix: str = "/api"
    project_name: str = "180-Day Stock Trading Game"

    security: SecuritySettings
    database: DatabaseSettings = DatabaseSettings()
    trading: TradingRules = TradingRules()
    market_data: MarketDataSettings = MarketDataSettings()
    game: GameSettings = GameSettings()

    yahoo_api_key: Optional[str] = None


@lru_cache
def get_settings() -> AppSettings:
    """Return a cached settings instance."""
    return AppSettings()


settings: AppSettings = get_settings()
