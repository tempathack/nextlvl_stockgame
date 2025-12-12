"""Enum definitions used across SQLAlchemy models."""

from enum import Enum


class OrderSide(str, Enum):
    """Trade order side enum."""

    BUY = "buy"
    SELL = "sell"
    SHORT = "short"
    COVER = "cover"


class OrderStatus(str, Enum):
    """Trade order status enum."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    SETTLED = "settled"
    CANCELLED = "cancelled"
