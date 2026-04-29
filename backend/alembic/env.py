import os
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# Cargar .env
load_dotenv()

# Obtener URL desde entorno
DATABASE_URL = os.getenv("DATABASE_URL")

# Configuración Alembic
config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL) # type: ignore
# Importar metadata
from app.db.base import Base
from app.db.models import *
from app.db.models import PartyVotesCounter  # ← este

target_metadata = Base.metadata
from sqlalchemy import create_engine
from alembic import context

def run_migrations_online():
    connectable = create_engine(DATABASE_URL) # type: ignore

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()
if context.is_offline_mode():
    raise Exception("Modo offline no soportado en esta configuración")
else:
    run_migrations_online()
print(Base.metadata.tables.keys())