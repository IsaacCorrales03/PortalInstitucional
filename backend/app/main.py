from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

from app.api.routes import admin, auth, specialities, dashboard, scholarship, votacion, partidos, electoral
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login-form")
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
app.include_router(scholarship.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(specialities.router)
app.include_router(dashboard.router)
app.include_router(votacion.router)
app.include_router(partidos.router)
app.include_router(electoral.router)
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
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "el servicio está en linea",
        "environment": ENV
    }

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"message": "DB conectada"}

