from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import AuthenticatedUser
from app.db.models import Enrollment, Section, StudentProfile


def require_student_profile(current_user: AuthenticatedUser, db: Session) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")
    return profile


def require_section(enroll: Enrollment, db: Session) -> Section:
    if not enroll.section_id:
        raise HTTPException(status_code=404, detail="No tienes una sección asignada")
    section = db.query(Section).filter(Section.id == enroll.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    return section