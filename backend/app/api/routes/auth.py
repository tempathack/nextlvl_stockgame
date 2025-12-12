"""Authentication routes."""
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.db.session import get_session
from app.models.portfolio import Portfolio
from app.models.user import Profile, User
from app.schemas.auth import RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


async def _load_user(session: AsyncSession, user_id: int) -> User | None:
    """Load a user with profile eager loaded."""
    stmt = (
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id)
    )
    return await session.scalar(stmt)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Register a new user and create their default portfolio."""
    existing = await session.scalar(
        select(User).where(
            or_(User.username == payload.username, User.email == payload.email)
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with that username or email already exists",
        )

    hashed_password = get_password_hash(payload.password)

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed_password,
        is_active=True,
    )

    # Basic profile with notification defaults enabled
    profile = Profile(
        user=user,
        display_name=payload.display_name or payload.username,
        bio=None,
        avatar_url=None,
        email_notifications=True,
        trade_alerts=True,
        weekly_report=True,
    )

    # Default portfolio with starting capital
    portfolio = Portfolio(
        user=user,
        cash_balance=Decimal(str(settings.trading.starting_capital)),
        equity_value=Decimal("0"),
    )

    session.add_all([user, profile, portfolio])
    await session.commit()
    await session.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Authenticate a user and return access/refresh tokens."""
    stmt = (
        select(User)
        .options(selectinload(User.profile))
        .where(
            or_(
                User.username == form_data.username,
                User.email == form_data.username,
            )
        )
    )
    user = await session.scalar(stmt)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    user.last_login = datetime.utcnow()
    await session.commit()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Exchange a refresh token for a new access token."""
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.security.jwt_secret_key,
            algorithms=[settings.security.jwt_algorithm],
        )
        sub = decoded.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await _load_user(session, int(sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/logout")
async def logout() -> dict[str, str]:
    """Stateless logout endpoint for client-side token deletion."""
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Return the current authenticated user."""
    return UserRead.model_validate(current_user)
