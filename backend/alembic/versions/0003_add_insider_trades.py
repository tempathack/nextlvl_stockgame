"""Add insider_trades table.

Revision ID: 0003_add_insider_trades
Revises: 0002_add_trading_fees
Create Date: 2025-12-12
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "0003_add_insider_trades"
down_revision = "0002_add_trading_fees"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create insider_trades table with indexes and constraints."""
    # Create insider_trades table
    op.create_table(
        "insider_trades",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        sa.Column("accession_number", sa.String(25), nullable=False),
        sa.Column("cik", sa.String(20), nullable=False),
        sa.Column("symbol", sa.String(12), nullable=False),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("insider_name", sa.String(200), nullable=False),
        sa.Column("insider_cik", sa.String(20), nullable=True),
        sa.Column("insider_title", sa.String(200), nullable=True),
        sa.Column("relationship", sa.String(100), nullable=True),
        sa.Column("transaction_type", sa.String(50), nullable=False),
        sa.Column("transaction_code", sa.String(5), nullable=True),
        sa.Column("shares_traded", sa.Numeric(18, 4), nullable=False),
        sa.Column("price_per_share", sa.Numeric(18, 4), nullable=True),
        sa.Column("total_value", sa.Numeric(18, 2), nullable=True),
        sa.Column("shares_owned_after", sa.Numeric(18, 4), nullable=True),
        sa.Column("ownership_type", sa.String(20), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("filing_date", sa.Date(), nullable=False),
        sa.Column("price_at_trade", sa.Numeric(18, 4), nullable=True),
        sa.Column("price_current", sa.Numeric(18, 4), nullable=True),
        sa.Column("price_1w_after", sa.Numeric(18, 4), nullable=True),
        sa.Column("price_1m_after", sa.Numeric(18, 4), nullable=True),
        sa.Column("price_3m_after", sa.Numeric(18, 4), nullable=True),
        sa.Column("return_1w_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("return_1m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("return_3m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("return_to_current_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("sp500_return_1w_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("sp500_return_1m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("sp500_return_3m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("alpha_1w_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("alpha_1m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("alpha_3m_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("filing_url", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("accession_number", name="uq_insider_accession_number")
    )

    # Create indexes
    op.create_index(
        "ix_insider_trades_symbol",
        "insider_trades",
        ["symbol"]
    )
    op.create_index(
        "ix_insider_trades_filing_date",
        "insider_trades",
        ["filing_date"]
    )
    op.create_index(
        "ix_insider_trades_transaction_date",
        "insider_trades",
        ["transaction_date"]
    )
    op.create_index(
        "ix_insider_trades_symbol_filing",
        "insider_trades",
        ["symbol", "filing_date"]
    )
    op.create_index(
        "ix_insider_trades_insider_name",
        "insider_trades",
        ["insider_name"]
    )


def downgrade() -> None:
    """Drop insider_trades table and all associated indexes."""
    # Drop indexes first
    op.drop_index("ix_insider_trades_insider_name", table_name="insider_trades")
    op.drop_index("ix_insider_trades_symbol_filing", table_name="insider_trades")
    op.drop_index("ix_insider_trades_transaction_date", table_name="insider_trades")
    op.drop_index("ix_insider_trades_filing_date", table_name="insider_trades")
    op.drop_index("ix_insider_trades_symbol", table_name="insider_trades")

    # Drop table
    op.drop_table("insider_trades")
