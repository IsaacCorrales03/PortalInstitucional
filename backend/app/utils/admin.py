import secrets
import string

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Enrollment, StudentProfile


def generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_student_code(db: Session) -> str:
    last = (
        db.query(StudentProfile)
        .order_by(StudentProfile.student_code.desc())
        .first()
    )
    if not last:
        return "CTP-P0001"
    num = int(last.student_code[5:])
    return f"CTP-P{num + 1:04d}"

def get_enrollment_or_404(user_id: int, section_id: int, db: Session) -> Enrollment:
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.section_id == section_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return enrollment
