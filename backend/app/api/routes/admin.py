import datetime
import secrets
import string
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import check_permission, get_current_user
from app.core.security import hash_password
from app.db.models import (
    AdministrativeProfile,
    Attendance,
    Course,
    Enrollment,
    GradeReport,
    GroupMember,
    Permission,
    ProfessorAvailability,
    ProfessorCourse,
    ProfessorProfile,
    Role,
    RolePermission,
    Section,
    SectionCourse,
    SectionSpecialty,
    SectionStudyPlan,
    Specialty,
    StudentProfile,
    StudyPlan,
    StudyPlanCourse,
    Submission,
    User,
    UserRole,
)
from app.db.session import get_db
from app.schemas.user import UserCreateAdmin
from app.core.security import AuthenticatedUser

router = APIRouter(prefix="/admin", tags=["admin"])


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

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


# ══════════════════════════════════════════════
# USUARIOS
# ══════════════════════════════════════════════

@router.get("/users")
def list_users(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_users", db)

    users = db.query(User).all()
    result = []
    for u in users:
        role = (
            db.query(Role.name)
            .join(UserRole, Role.id == UserRole.role_id)
            .filter(UserRole.user_id == u.id)
            .first()
        )
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "role": role[0] if role else None,
        })
    return result

@router.get("/professors/by-course/{course_id}")
def list_professors_by_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    check_permission(current_user, "manage_users", db)

    professors = (
        db.query(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .join(ProfessorCourse, ProfessorCourse.professor_id == User.id)
        .filter(
            Role.name == "profesor",
            ProfessorCourse.course_id == course_id
        )
        .all()
    )

    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
        }
        for p in professors
    ]

@router.get("/professors")
def list_professors(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    check_permission(current_user, "manage_users", db)

    professors = (
        db.query(User)
        .join(UserRole)
        .join(Role)
        .filter(Role.name == "profesor")
        .all()
    )

    result = []

    for p in professors:
        courses = (
            db.query(Course)
            .join(ProfessorCourse, ProfessorCourse.course_id == Course.id)
            .filter(ProfessorCourse.professor_id == p.id)
            .all()
        )

        result.append({
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "is_active": p.is_active,
            "courses": [
                {
                    "id": c.id,
                    "name": c.name,
                }
                for c in courses
            ],
        })

    return result


@router.post("/users/create")
def create_user(
    user_data: UserCreateAdmin,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_users", db)

    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    if db.query(User).filter(User.national_id == user_data.national_id).first():
        raise HTTPException(status_code=400, detail="Cédula ya registrada")

    role = db.query(Role).filter(Role.name == user_data.role).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no existe")

    password = generate_password()

    try:
        user = User(
            email=user_data.email,
            password_hash=hash_password(password),
            full_name=user_data.full_name,
            national_id=user_data.national_id,
            is_active=True,
        )
        db.add(user)
        db.flush()

        db.add(UserRole(user_id=user.id, role_id=role.id))

        if role.name == "estudiante":
            if not user_data.student_profile:
                raise HTTPException(
                    status_code=400,
                    detail="Se requiere student_profile para usuarios estudiantes",
                )

            sp = user_data.student_profile

            if not sp.section_id:
                raise HTTPException(400, "Falta sección")
            if not sp.section_part or sp.section_part not in ["A", "B"]:
                raise HTTPException(
                    status_code=400,
                    detail="Debe especificar si pertenece a A o B"
                )
            section = db.query(Section).filter(
                Section.id == sp.section_id
            ).first()

            if not section:
                raise HTTPException(
                    status_code=404,
                    detail="Sección no existe"
                )

            db.add(StudentProfile(
                user_id=user.id,
                student_code=generate_student_code(db),
                year_level=sp.year_level,
                specialty_id=sp.specialty_id,
                section_id=section.id,  
                section_part=sp.section_part,
                section_shift=sp.section_shift,
                enrolled_since=sp.enrolled_since,
                status="activo",
            ))
        if role.name == "profesor":
            if not user_data.professor_profile:
                raise HTTPException(
                    status_code=400,
                    detail="Se requiere professor_profile para usuarios profesores",
                )

            pp = user_data.professor_profile

            db.add(ProfessorProfile(
                user_id=user.id,
                specialty_area=pp.specialty_area,
                current_status="disponible",
                status_note=None,
                status_updated_at=None,
            ))
        
        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    return {"id": user.id, "email": user.email, "role": role.name, "password": password}


class AvailabilityCreateSchema(BaseModel):
    day_of_week: Literal[
        "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"
    ]
    start_time: datetime.time
    end_time: datetime.time

    @field_validator("end_time")
    def validate_time_range(cls, v, values):
        start = values.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time debe ser mayor que start_time")
        return v
class AvailabilityBulkCreateSchema(BaseModel):
    availabilities: list[AvailabilityCreateSchema]   

class AvailabilityResponseSchema(BaseModel):
    id: int
    day_of_week: str
    start_time: datetime.time
    end_time: datetime.time

    class Config:
        from_attributes = True
class AvailabilityUpdateSchema(BaseModel):
    day_of_week: str | None = None
    start_time: datetime.time | None = None
    end_time: datetime.time | None = None

class ProfessorCourseAssignSchema(BaseModel):
    course_ids: list[int]
class ProfessorCourseResponse(BaseModel):
    professor_id: int
    course_id: int

    class Config:
        from_attributes = True  
        
@router.post("/professors/{professor_id}/courses")
def assign_courses_to_professor(
    professor_id: int,
    data: ProfessorCourseAssignSchema,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    check_permission(current_user, "manage_users", db)

    # validar profesor
    professor = (
        db.query(User)
        .join(UserRole).join(Role)
        .filter(User.id == professor_id, Role.name == "profesor")
        .first()
    )

    if not professor:
        raise HTTPException(404, "Profesor no existe")

    if not data.course_ids:
        raise HTTPException(400, "Debe enviar al menos un course_id")

    # validar cursos existentes
    courses = db.query(Course).filter(Course.id.in_(data.course_ids)).all()

    if len(courses) != len(set(data.course_ids)):
        raise HTTPException(404, "Uno o más cursos no existen")

    created = []

    for course in courses:
        exists = db.query(ProfessorCourse).filter(
            ProfessorCourse.professor_id == professor_id,
            ProfessorCourse.course_id == course.id
        ).first()

        if not exists:
            pc = ProfessorCourse(
                professor_id=professor_id,
                course_id=course.id
            )
            db.add(pc)
            created.append(pc)

    db.commit()

    return {
        "assigned": len(created),
        "total_requested": len(data.course_ids)
    }  

@router.post("/professors/{professor_id}/availability")
def add_availability(
    professor_id: int,
    data: AvailabilityCreateSchema,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    check_permission(current_user, "manage_users", db)

    # validar profesor
    professor = (
        db.query(User)
        .join(UserRole).join(Role)
        .filter(User.id == professor_id, Role.name == "profesor")
        .first()
    )

    if not professor:
        raise HTTPException(404, "Profesor no existe")

    # validar rango
    if data.start_time >= data.end_time:
        raise HTTPException(400, "Rango inválido")

    # validar solapamiento
    overlap = db.query(ProfessorAvailability).filter(
        ProfessorAvailability.professor_id == professor_id,
        ProfessorAvailability.day_of_week == data.day_of_week,
        ~(
            (data.end_time <= ProfessorAvailability.start_time) |
            (data.start_time >= ProfessorAvailability.end_time)
        )
    ).first()

    if overlap:
        raise HTTPException(400, "Horario solapado")

    db.add(ProfessorAvailability(
        professor_id=professor_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time
    ))

    db.commit()

    return {"ok": True}


@router.get("/professors/{professor_id}/courses")
def get_professor_courses(
    professor_id: int,
    db: Session = Depends(get_db),
):
    return db.query(ProfessorCourse).filter(
        ProfessorCourse.professor_id == professor_id
    ).all()

@router.delete("/professors/{professor_id}/courses/{course_id}")
def remove_professor_course(
    professor_id: int,
    course_id: int,
    db: Session = Depends(get_db),
):
    pc = db.query(ProfessorCourse).filter(
        ProfessorCourse.professor_id == professor_id,
        ProfessorCourse.course_id == course_id
    ).first()

    if not pc:
        raise HTTPException(404, "Asignación no existe")

    db.delete(pc)
    db.commit()

    return {"ok": True}

@router.put("/users/{user_id}")
def edit_user(
    user_id: int,
    full_name: str | None = None,
    is_active: bool | None = None,
    role_name: str | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_users", db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if full_name is not None:
        user.full_name = full_name
    if is_active is not None:
        user.is_active = is_active
    db.commit()

    if role_name is not None:
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise HTTPException(status_code=400, detail="Rol no existe")
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()

    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_users", db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.query(StudentProfile).filter(StudentProfile.user_id == user_id).delete()
    db.query(ProfessorProfile).filter(ProfessorProfile.user_id == user_id).delete()
    db.query(AdministrativeProfile).filter(AdministrativeProfile.user_id == user_id).delete()
    db.query(UserRole).filter(UserRole.user_id == user_id).delete()
    db.query(Enrollment).filter(Enrollment.user_id == user_id).delete()
    db.query(Attendance).filter(Attendance.user_id == user_id).delete()
    db.query(GroupMember).filter(GroupMember.user_id == user_id).delete()
    db.query(Submission).filter(Submission.user_id == user_id).delete()
    db.query(GradeReport).filter(GradeReport.student_id == user_id).delete()
    db.delete(user)
    db.commit()

    return {"detail": f"Usuario {user.email} eliminado"}


# ══════════════════════════════════════════════
# CURSOS
# ══════════════════════════════════════════════

class CourseCreateSchema(BaseModel):
    name: str
    description: str | None = None
    specialty_id: int | None = None
    year_level: int | None = None


class CourseUpdateSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    specialty_id: int | None = None
    year_level: int | None = None


@router.get("/courses")
def list_courses(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_courses", db)
    courses = db.query(Course).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "specialty_id": c.specialty_id,
            "year_level": c.year_level,
        }
        for c in courses
    ]


@router.get("/courses/{course_id}")
def get_course(
    course_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_courses", db)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "specialty_id": course.specialty_id,
        "year_level": course.year_level,
    }


@router.post("/courses")
def create_course(
    data: CourseCreateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_courses", db)

    if data.specialty_id:
        if not db.query(Specialty).filter(Specialty.id == data.specialty_id).first():
            raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    course = Course(
        name=data.name,
        description=data.description,
        specialty_id=data.specialty_id,
        year_level=data.year_level,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"id": course.id, "name": course.name}


@router.put("/courses/{course_id}")
def update_course(
    course_id: int,
    data: CourseUpdateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_courses", db)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    if data.specialty_id is not None:
        if not db.query(Specialty).filter(Specialty.id == data.specialty_id).first():
            raise HTTPException(status_code=404, detail="Especialidad no encontrada")
        course.specialty_id = data.specialty_id

    if data.name is not None:
        course.name = data.name
    if data.description is not None:
        course.description = data.description
    if data.year_level is not None:
        course.year_level = data.year_level

    db.commit()
    db.refresh(course)
    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "specialty_id": course.specialty_id,
        "year_level": course.year_level,
    }


@router.delete("/courses/{course_id}")
def delete_course(
    course_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_courses", db)

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    in_use = db.query(SectionCourse).filter(SectionCourse.course_id == course_id).first()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el curso porque está asignado a una o más secciones",
        )

    db.delete(course)
    db.commit()
    return {"detail": f"Curso '{course.name}' eliminado"}


# ══════════════════════════════════════════════
# SECCIONES
# ══════════════════════════════════════════════
class CourseAssignmentSchema(BaseModel):
    course_id: int
    professor_id: int


class SectionCreateSchema(BaseModel):
    name: str
    academic_year: str
    year_level: int

    specialty_id_a: int
    specialty_id_b: int

    guide_professor_id: int | None = None

    course_assignments: list[CourseAssignmentSchema]

class SectionUpdateSchema(BaseModel):
    name: str | None = None
    academic_year: str | None = None
    specialty_id_a: int | None = None
    specialty_id_b: int | None = None
    guide_professor_id: int | None = None

class SectionCourseAssignSchema(BaseModel):
    course_id: int
    professor_id: int


class SectionCourseUpdateSchema(BaseModel):
    professor_id: int




@router.get("/sections")
def list_sections(
    specialty_id: int | None = None,
    academic_year: str | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    query = db.query(Section)

    if academic_year:
        query = query.filter(Section.academic_year == academic_year)

    sections = query.all()

    result = []
    for s in sections:
        specialties = (
            db.query(SectionSpecialty, Specialty)
            .join(Specialty, SectionSpecialty.specialty_id == Specialty.id)
            .filter(SectionSpecialty.section_id == s.id)
            .all()
        )

        # filtrar por especialidad si viene
        if specialty_id:
            if not any(sp.specialty_id == specialty_id for sp, _ in specialties):
                continue

        specialties_out = [
            {
                "part": sp.part,
                "id": sp.specialty_id,
                "name": spec.name,
            }
            for sp, spec in specialties
        ]

        guide = (
            db.query(User).filter(User.id == s.guide_professor_id).first()
            if s.guide_professor_id else None
        )

        result.append({
            "id": s.id,
            "name": s.name,
            "academic_year": s.academic_year,
            "specialties": specialties_out,  # 🔥 clave
            "guide_professor_id": s.guide_professor_id,
            "guide_professor_name": guide.full_name if guide else None,
        })

    return result

@router.post("/sections")
def create_section(
    data: SectionCreateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    # ───── VALIDAR ESPECIALIDADES ─────
    specialty_a = db.query(Specialty).filter(Specialty.id == data.specialty_id_a).first()
    specialty_b = db.query(Specialty).filter(Specialty.id == data.specialty_id_b).first()

    if not specialty_a or not specialty_b:
        raise HTTPException(404, "Especialidad no encontrada")

    if data.specialty_id_a == data.specialty_id_b:
        raise HTTPException(400, "A y B no pueden ser iguales")

    # ───── VALIDAR PROFESOR GUÍA ─────
    if data.guide_professor_id:
        professor = (
            db.query(User).join(UserRole).join(Role)
            .filter(User.id == data.guide_professor_id, Role.name == "profesor")
            .first()
        )
        if not professor:
            raise HTTPException(400, "Profesor guía no válido")

    # ───── OBTENER PLAN ACADÉMICO ─────
    academic_plan = db.query(StudyPlan).filter(
        StudyPlan.year_level == data.year_level,
        StudyPlan.specialty_id.is_(None)
    ).first()

    if not academic_plan:
        raise HTTPException(
            400,
            f"No existe plan académico para el año {data.year_level}"
        )

    # ───── CREAR SECCIÓN ─────
    section = Section(
        name=data.name,
        academic_year=data.academic_year,
        guide_professor_id=data.guide_professor_id,
    )
    db.add(section)
    db.flush()  # ya tenemos section.id

    # ───── ASIGNAR PLAN ─────
    db.add(SectionStudyPlan(
        section_id=section.id,
        study_plan_id=academic_plan.id,
        part=None
    ))

    # ───── RELACIÓN A/B ─────
    db.add_all([
        SectionSpecialty(
            section_id=section.id,
            specialty_id=data.specialty_id_a,
            part="A",
        ),
        SectionSpecialty(
            section_id=section.id,
            specialty_id=data.specialty_id_b,
            part="B",
        )
    ])

    # ───── ASIGNAR PROFESORES A MATERIAS ─────
    # data.course_assignments = [{course_id, professor_id}]
    if not data.course_assignments:
        raise HTTPException(400, "Debe asignar profesores a las materias")

    # obtener materias del plan
    plan_courses = db.query(StudyPlanCourse).filter(
        StudyPlanCourse.study_plan_id == academic_plan.id
    ).all()

    plan_course_ids = {pc.course_id for pc in plan_courses}
    assigned_course_ids = {c.course_id for c in data.course_assignments}

    # validar que cubre todo el plan
    if plan_course_ids != assigned_course_ids:
        raise HTTPException(
            400,
            "Debe asignar exactamente todas las materias del plan"
        )

    for item in data.course_assignments:
        # validar profesor
        professor = (
            db.query(User).join(UserRole).join(Role)
            .filter(User.id == item.professor_id, Role.name == "profesor")
            .first()
        )

        if not professor:
            raise HTTPException(400, f"Profesor inválido para curso {item.course_id}")

        db.add(SectionCourse(
            section_id=section.id,
            course_id=item.course_id,
            professor_id=item.professor_id
        ))

    db.commit()
    db.refresh(section)

    return {
        "id": section.id,
        "name": section.name,
        "academic_year": section.academic_year,
    }

@router.put("/sections/{section_id}")
def update_section(
    section_id: int,
    data: SectionUpdateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    # ─── actualizar especialidades A/B ───
    if data.specialty_id_a is not None or data.specialty_id_b is not None:

        if data.specialty_id_a == data.specialty_id_b:
            raise HTTPException(status_code=400, detail="A y B no pueden ser iguales")

        # obtener actuales
        specialties = db.query(SectionSpecialty).filter(
            SectionSpecialty.section_id == section.id
        ).all()

        sp_map = {sp.part: sp for sp in specialties}

        # actualizar A
        if data.specialty_id_a is not None:
            if not db.query(Specialty).filter(Specialty.id == data.specialty_id_a).first():
                raise HTTPException(status_code=404, detail="Especialidad A no encontrada")

            if "A" in sp_map:
                sp_map["A"].specialty_id = data.specialty_id_a
            else:
                db.add(SectionSpecialty(
                    section_id=section.id,
                    specialty_id=data.specialty_id_a,
                    part="A"
                ))

        # actualizar B
        if data.specialty_id_b is not None:
            if not db.query(Specialty).filter(Specialty.id == data.specialty_id_b).first():
                raise HTTPException(status_code=404, detail="Especialidad B no encontrada")

            if "B" in sp_map:
                sp_map["B"].specialty_id = data.specialty_id_b
            else:
                db.add(SectionSpecialty(
                    section_id=section.id,
                    specialty_id=data.specialty_id_b,
                    part="B"
                ))

    # ─── profesor guía ───
    if data.guide_professor_id is not None:
        professor = (
            db.query(User).join(UserRole).join(Role)
            .filter(User.id == data.guide_professor_id, Role.name == "profesor")
            .first()
        )
        if not professor:
            raise HTTPException(status_code=400, detail="Profesor guía no válido")

        section.guide_professor_id = data.guide_professor_id

    # ─── otros campos ───
    if data.name is not None:
        section.name = data.name

    if data.academic_year is not None:
        section.academic_year = data.academic_year

    db.commit()
    db.refresh(section)

    return {
        "id": section.id,
        "name": section.name,
        "academic_year": section.academic_year,
    }

@router.delete("/sections/{section_id}")
def delete_section(
    section_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    db.query(SectionCourse).filter(SectionCourse.section_id == section_id).delete()
    db.query(Enrollment).filter(Enrollment.section_id == section_id).delete()
    db.query(StudentProfile).filter(StudentProfile.section_id == section_id).update({"section_id": None})
    db.delete(section)
    db.commit()
    return {"detail": f"Sección '{section.name}' eliminada"}


@router.post("/sections/{section_id}/courses")
def assign_course_to_section(
    section_id: int,
    data: SectionCourseAssignSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    if not db.query(Section).filter(Section.id == section_id).first():
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    if not db.query(Course).filter(Course.id == data.course_id).first():
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    professor = (
        db.query(User).join(UserRole).join(Role)
        .filter(User.id == data.professor_id, Role.name == "profesor")
        .first()
    )
    if not professor:
        raise HTTPException(status_code=400, detail="Profesor no válido")

    sc = SectionCourse(
        section_id=section_id,
        course_id=data.course_id,
        professor_id=data.professor_id,
    )
    db.add(sc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este curso ya está asignado a la sección")

    db.refresh(sc)
    return {"id": sc.id, "section_id": sc.section_id, "course_id": sc.course_id, "professor_id": sc.professor_id}


@router.put("/sections/{section_id}/courses/{section_course_id}")
def update_section_course(
    section_id: int,
    section_course_id: int,
    data: SectionCourseUpdateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    sc = db.query(SectionCourse).filter(
        SectionCourse.id == section_course_id,
        SectionCourse.section_id == section_id,
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    professor = (
        db.query(User).join(UserRole).join(Role)
        .filter(User.id == data.professor_id, Role.name == "profesor")
        .first()
    )
    if not professor:
        raise HTTPException(status_code=400, detail="Profesor no válido")

    sc.professor_id = data.professor_id
    db.commit()
    db.refresh(sc)
    return {"id": sc.id, "section_id": sc.section_id, "course_id": sc.course_id, "professor_id": sc.professor_id}


@router.delete("/sections/{section_id}/courses/{section_course_id}")
def remove_course_from_section(
    section_id: int,
    section_course_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_sections", db)

    sc = db.query(SectionCourse).filter(
        SectionCourse.id == section_course_id,
        SectionCourse.section_id == section_id,
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    db.delete(sc)
    db.commit()
    return {"detail": "Curso removido de la sección"}


# ══════════════════════════════════════════════
# INSCRIPCIONES
# ══════════════════════════════════════════════

class EnrollmentCreateSchema(BaseModel):
    user_id: int
    section_id: int


class EnrollmentUpdateSchema(BaseModel):
    status: str  # "activo" | "retirado" | "aprobado" | "reprobado"


VALID_ENROLLMENT_STATUSES = {"activo", "retirado", "aprobado", "reprobado"}


def _get_enrollment_or_404(user_id: int, section_id: int, db: Session) -> Enrollment:
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user_id,
        Enrollment.section_id == section_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return enrollment


@router.get("/enrollments")
def list_enrollments(
    section_id: int | None = None,
    user_id: int | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_enrollments", db)
    query = db.query(Enrollment)
    if section_id:
        query = query.filter(Enrollment.section_id == section_id)
    if user_id:
        query = query.filter(Enrollment.user_id == user_id)
    return [
        {
            "user_id": e.user_id,
            "section_id": e.section_id,
            "enrolled_at": e.enrolled_at,
            "status": e.status,
        }
        for e in query.all()
    ]


@router.get("/enrollments/{user_id}/{section_id}")
def get_enrollment(
    user_id: int,
    section_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_enrollments", db)
    enrollment = _get_enrollment_or_404(user_id, section_id, db)
    return {
        "user_id": enrollment.user_id,
        "section_id": enrollment.section_id,
        "enrolled_at": enrollment.enrolled_at,
        "status": enrollment.status,
    }


@router.post("/enrollments")
def enroll_student(
    data: EnrollmentCreateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_enrollments", db)

    student = (
        db.query(User).join(UserRole).join(Role)
        .filter(User.id == data.user_id, Role.name == "estudiante")
        .first()
    )
    if not student:
        raise HTTPException(status_code=400, detail="Usuario no es estudiante o no existe")

    if not db.query(Section).filter(Section.id == data.section_id).first():
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    enrollment = Enrollment(user_id=data.user_id, section_id=data.section_id)
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El estudiante ya está inscrito en esta sección")

    db.refresh(enrollment)
    return {
        "user_id": enrollment.user_id,
        "section_id": enrollment.section_id,
        "enrolled_at": enrollment.enrolled_at,
        "status": enrollment.status,
    }


@router.put("/enrollments/{user_id}/{section_id}")
def update_enrollment(
    user_id: int,
    section_id: int,
    data: EnrollmentUpdateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_enrollments", db)

    if data.status not in VALID_ENROLLMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Opciones: {', '.join(sorted(VALID_ENROLLMENT_STATUSES))}",
        )

    enrollment = _get_enrollment_or_404(user_id, section_id, db)
    enrollment.status = data.status
    db.commit()
    db.refresh(enrollment)
    return {
        "user_id": enrollment.user_id,
        "section_id": enrollment.section_id,
        "enrolled_at": enrollment.enrolled_at,
        "status": enrollment.status,
    }


@router.delete("/enrollments/{user_id}/{section_id}")
def delete_enrollment(
    user_id: int,
    section_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_enrollments", db)
    enrollment = _get_enrollment_or_404(user_id, section_id, db)
    db.delete(enrollment)
    db.commit()
    return {"detail": f"Estudiante {user_id} dado de baja de la sección {section_id}"}


# ══════════════════════════════════════════════
# PERMISOS
# ══════════════════════════════════════════════

class PermissionCreateSchema(BaseModel):
    code: str
    description: str | None = None


@router.get("/permissions")
def list_permissions(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_permissions", db)
    return [
        {"id": p.id, "code": p.code, "description": p.description}
        for p in db.query(Permission).all()
    ]


@router.post("/permissions")
def create_permission(
    data: PermissionCreateSchema,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_permissions", db)

    if db.query(Permission).filter(Permission.code == data.code).first():
        raise HTTPException(status_code=400, detail="Permiso ya existe")

    permission = Permission(code=data.code, description=data.description)
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return {"id": permission.id, "code": permission.code}


@router.delete("/permissions/{permission_id}")
def delete_permission(
    permission_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_permissions", db)

    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    db.query(RolePermission).filter(RolePermission.permission_id == permission_id).delete()
    db.delete(permission)
    db.commit()
    return {"detail": f"Permiso '{permission.code}' eliminado"}


@router.get("/users/{user_id}/permissions")
def get_user_permissions(
    user_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_permission(current_user, "manage_permissions", db)

    permissions = (
        db.query(Permission.code, Permission.description)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id)
        .all()
    )
    return [{"code": p.code, "description": p.description} for p in permissions]