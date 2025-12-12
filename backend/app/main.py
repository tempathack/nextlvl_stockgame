"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import api_router
from app.core.config import settings
from app.db.session import engine, async_session
from app.models.game_config import GameConfig

logger = logging.getLogger(__name__)


async def init_game_config():
    """Initialize game configuration from environment variables if not exists."""
    if not settings.game.is_configured:
        logger.warning("GAME__START_DATE not set - skipping auto-initialization")
        return

    async with async_session() as session:
        # Check if any game config exists
        result = await session.execute(
            select(GameConfig).where(GameConfig.is_active == True)
        )
        existing = result.scalar_one_or_none()

        if existing:
            logger.info(f"Game config already exists: {existing.name} (start: {existing.start_date})")
            return

        # Create new game config from env vars
        start_dt = datetime.combine(settings.game.start_date, datetime.min.time(), tzinfo=timezone.utc)
        end_dt = datetime.combine(settings.game.end_date, datetime.max.time(), tzinfo=timezone.utc)

        game_config = GameConfig(
            name=f"Competition {settings.game.start_date.strftime('%Y')}",
            description=f"180-Day Stock Trading Competition starting {settings.game.start_date}",
            start_date=start_dt,
            end_date=end_dt,
            starting_capital=Decimal(str(settings.game.starting_capital)),
            allow_short_selling=settings.trading.allow_short_selling,
            allow_borrowing=settings.trading.allow_borrowing,
            is_active=True,
        )

        session.add(game_config)
        await session.commit()
        logger.info(f"Created game config: {game_config.name} ({settings.game.start_date} - {settings.game.end_date})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Initialize game config on startup
    try:
        await init_game_config()
    except Exception as e:
        logger.error(f"Failed to initialize game config: {e}")

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.project_name,
    description="180-Day Stock Trading Game API",
    version="2.0.0",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "healthy", "version": "2.0.0"}


@app.get(f"{settings.api_prefix}/health")
async def api_health_check():
    """API-prefixed health check used by E2E tests."""
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "180-Day Stock Trading Game API",
        "docs": f"{settings.api_prefix}/docs",
    }
