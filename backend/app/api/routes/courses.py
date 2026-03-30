from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Course, Section, Enrollment, User
from app.api.deps import get_current_user, check_permission
from pydantic import BaseModel

router = APIRouter(prefix="/courses", tags=["courses"])


# =======================
# SCHEMAS
# =======================

class CourseCreateSchema(BaseModel):
    name: str
    description: str | None = None
    specialty_id: int | None = None
    year_level: int | None = None
    is_guide: bool = False           

class CourseUpdateSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    specialty_id: int | None = None
    year_level: int | None = None
    is_guide: bool | None = None   

# =======================
# PUBLIC
# =======================

@router.get("/public")
def list_courses_public(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "specialty_id": c.specialty_id,
            "year_level": c.year_level
        }
        for c in courses
    ]


# =======================
# ADMIN
# =======================

@router.post("/")
def create_course(
    data: CourseCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_permission(current_user, "manage_enrollments", db)

    course = Course(**data.dict())
    db.add(course)
    db.commit()
    db.refresh(course)

    return course


@router.put("/{course_id}")
def update_course(
    course_id: int,
    data: CourseUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_permission(current_user, "manage_enrollments", db)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Curso no encontrado")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)

    return course


@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_permission(current_user, "manage_enrollments", db)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Curso no encontrado")

    # validación: evitar borrar si tiene secciones
    in_use = db.query(Section).filter(Section.course_id == course_id).first()
    if in_use:
        raise HTTPException(400, "El curso tiene secciones asociadas")

    db.delete(course)
    db.commit()

    return {"detail": "Curso eliminado"}