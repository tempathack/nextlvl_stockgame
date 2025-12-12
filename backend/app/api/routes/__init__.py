"""API route aggregation."""
from fastapi import APIRouter

from app.api.routes import (
    admin,
    auth,
    activity,
    analysis,
    benchmarks,
    insider_trades,
    leaderboard,
    market,
    trades,
    users,
)

api_router = APIRouter()

# Public endpoints (no authentication required)
api_router.include_router(auth.router)
api_router.include_router(activity.router)
api_router.include_router(analysis.router)
api_router.include_router(market.router)
api_router.include_router(benchmarks.router)
api_router.include_router(insider_trades.router)
api_router.include_router(leaderboard.router)

# Protected endpoints (authentication required)
api_router.include_router(users.router)
api_router.include_router(trades.router)

# Admin endpoints (superuser only)
api_router.include_router(admin.router)
