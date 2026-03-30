from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# =========================
# Cargar variables de entorno
# =========================
load_dotenv()

ENV = os.getenv("ENV", "development")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# CORS
origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in origins.split(",") if origin.strip()]

# =========================
# Inicializar app
# =========================

app = FastAPI(
    title="Portal Institucional APIA",
    version="1.0.0",
    debug=DEBUG
)
from app.api.routes import auth
from app.api.routes import admin
from app.api.routes import specialities
from app.api.routes import dashboard
from app.api.routes import courses

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(specialities.router)
app.include_router(dashboard.router)
app.include_router(courses.router)

# =========================
# Middleware CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Endpoint de salud
# =========================
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "el servicio está en linea",
        "environment": ENV
    }

# =========================
# Root opcional
# =========================
@app.get("/")
def root():
    return {"message": "API Portal Institucional activa"}

from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"message": "DB conectada"}