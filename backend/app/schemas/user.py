"""User and profile schemas."""
from pydantic import BaseModel, ConfigDict, Field


class ProfileRead(BaseModel):
    """Profile details returned with user objects."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    display_name: str | None = Field(default=None, alias="display_name")
    bio: str | None = None
    avatar_url: str | None = Field(default=None, alias="avatar_url")
    email_notifications: bool = Field(default=True, alias="emailNotifications")
    trade_alerts: bool = Field(default=True, alias="tradeAlerts")
    weekly_report: bool = Field(default=True, alias="weeklyReport")


class UserRead(BaseModel):
    """Publicly safe user representation."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    username: str
    email: str
    display_name: str | None = None
    profile: ProfileRead | None = None


class UserProfileUpdate(BaseModel):
    """Payload for updating profile information."""

    model_config = ConfigDict(populate_by_name=True)

    display_name: str = Field(alias="displayName")
    email: str
    bio: str | None = None
    avatar_url: str | None = Field(default=None, alias="avatarUrl")


class UserProfileResponse(BaseModel):
    """Profile response for settings page."""

    model_config = ConfigDict(populate_by_name=True)

    display_name: str = Field(alias="displayName")
    email: str
    bio: str | None = None
    avatar_url: str | None = Field(default=None, alias="avatarUrl")


class UserPreferencesUpdate(BaseModel):
    """Notification preferences update payload."""

    model_config = ConfigDict(populate_by_name=True)

    email_notifications: bool = Field(alias="emailNotifications")
    trade_alerts: bool = Field(alias="tradeAlerts")
    weekly_report: bool = Field(alias="weeklyReport")


class UserPreferencesResponse(BaseModel):
    """Notification preferences response."""

    model_config = ConfigDict(populate_by_name=True)

    email_notifications: bool = Field(alias="emailNotifications")
    trade_alerts: bool = Field(alias="tradeAlerts")
    weekly_report: bool = Field(alias="weeklyReport")
