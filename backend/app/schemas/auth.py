"""Authentication schemas."""
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    """Payload for user registration."""

    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = None


class TokenResponse(BaseModel):
    """Authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    """Request body for refreshing an access token."""

    refresh_token: str = Field(alias="refresh_token")

    model_config = ConfigDict(populate_by_name=True)
