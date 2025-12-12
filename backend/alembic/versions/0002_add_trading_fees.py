"""Add trading fee columns.

Revision ID: 0002_add_trading_fees
Revises: 0001_initial
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "0002_add_trading_fees"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add fee_amount to trade_orders and total_fees_paid to portfolios."""
    # Add fee_amount to trade_orders
    op.add_column(
        "trade_orders",
        sa.Column(
            "fee_amount",
            sa.Numeric(15, 4),
            nullable=False,
            server_default="0.00"
        )
    )

    # Add total_fees_paid to portfolios
    op.add_column(
        "portfolios",
        sa.Column(
            "total_fees_paid",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0.00"
        )
    )


def downgrade() -> None:
    """Remove fee columns."""
    op.drop_column("trade_orders", "fee_amount")
    op.drop_column("portfolios", "total_fees_paid")
