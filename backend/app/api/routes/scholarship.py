from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime

from app.api.deps import get_current_user
from app.core.security import AuthenticatedUser
from app.db.session import get_db
from app.db.models import Scholarship, StudentProfile

router = APIRouter(prefix="/scholarships", tags=["scholarships"])

VALID_TYPES = {"transporte", "alimentacion"}

# ── Schemas ───────────────────────────────────────────────────────────────────

class ScholarshipOut(BaseModel):
    id: int
    type: str
    status: str
    start_date: datetime.date
    end_date: datetime.date | None
    notes: str | None

    class Config:
        from_attributes = True

class ScholarshipApplyIn(BaseModel):
    type: str  # "transporte" | "alimentacion"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=list[ScholarshipOut])
def get_my_scholarships(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Becas activas del estudiante autenticado."""
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    return (
        db.query(Scholarship)
        .filter(Scholarship.student_id == student.user_id)
        .order_by(Scholarship.start_date.desc())
        .all()
    )


@router.post("/me/apply", response_model=ScholarshipOut, status_code=201)
def apply_for_scholarship(
    body: ScholarshipApplyIn,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aplica a una beca. Crea registro en estado 'activa'."""
    if body.type not in VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo inválido. Opciones: {', '.join(VALID_TYPES)}"
        )

    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    # No permitir duplicado activo del mismo tipo
    existing = db.query(Scholarship).filter(
        Scholarship.student_id == student.user_id,
        Scholarship.type == body.type,
        Scholarship.status == "activa",
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya tenés una beca de {body.type} activa."
        )

    scholarship = Scholarship(
        student_id=student.user_id,
        type=body.type,
        status="activa",
        start_date=datetime.date.today(),
    )
    db.add(scholarship)
    db.commit()
    db.refresh(scholarship)
    return scholarship