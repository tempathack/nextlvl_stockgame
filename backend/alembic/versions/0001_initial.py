"""Initial schema creation for stock trading game."""
from alembic import op

from app import models  # noqa: F401 - import models to register metadata
from app.models import Base

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables defined in SQLAlchemy models."""
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    """Drop all application tables."""
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
