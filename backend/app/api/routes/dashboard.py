from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import AuthenticatedUser
from app.db.session import get_db
from app.db.models import *
from app.schemas.section import *
from app.schemas.user import *
from app.schemas.courses import *
from app.schemas.attendance import *
from app.schemas.dashboard import *
from app.utils.dashboard import *
from app.utils.scheduler_generator import DIAS
TECHNICAL_OVERRIDES = {"educación física"}

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/", response_model=DashboardOut)
def get_dashboard(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile_out = None

    if "estudiante" in current_user.roles:
        student = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id == current_user.id)
            .first()
        )
        if not student:
            raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

        specialty = db.query(Specialty).filter(Specialty.id == student.specialty_id).first()
        profile_out = StudentProfileOut(
            student_code=student.student_code,
            year_level=student.year_level,
            section_shift=student.section_shift,
            status=student.status,
            enrolled_since=student.enrolled_since,
            specialty_id=student.specialty_id,
            specialty_name=specialty.name if specialty else "Sin especialidad",
        )

    return DashboardOut(
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        national_id=current_user.national_id,
        birth_date=current_user.birth_date,
        phone=current_user.phone,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        roles=current_user.roles,
        profile=profile_out,
    )


@router.get("/me/section", response_model=SectionOut)
def get_my_section(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    enroll = db.query(Enrollment).filter(Enrollment.user_id == profile.user_id).first()
    section = require_section(enroll, db)

    selected = (
        db.query(SectionSpecialty)
        .filter(
            SectionSpecialty.section_id == section.id,
            SectionSpecialty.part == enroll.section_part
        )
        .first()
    )

    specialty = (
        db.query(Specialty).filter(Specialty.id == selected.specialty_id).first()
        if selected else None
    )

    guide = (
        db.query(User).filter(User.id == section.guide_professor_id).first()
        if section.guide_professor_id else None
    )

    return SectionOut(
        section_name=section.name,
        academic_year=section.academic_year,
        shift=profile.section_shift,
        section_part=enroll.section_part,
        specialty_name=specialty.name if specialty else "Sin especialidad",
        guide_professor_name=guide.full_name if guide else None,
    )

@router.get("/me/courses", response_model=list[CourseOut])
def get_my_courses(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    enroll = db.query(Enrollment).filter(Enrollment.user_id == profile.user_id).first()
    section = require_section(enroll, db)

    section_specialty = (
        db.query(SectionSpecialty)
        .filter(
            SectionSpecialty.section_id == section.id,
            SectionSpecialty.part == enroll.section_part,
        )
        .first()
    )
    student_specialty_id = section_specialty.specialty_id if section_specialty else None

    section_courses = (
        db.query(SectionCourse)
        .filter(SectionCourse.section_id == section.id)
        .all()
    )

    seen = set()
    result = []

    for sc in section_courses:
        course = db.query(Course).filter(Course.id == sc.course_id).first()
        if not course:
            continue

        # Filtrar por section_part si la fila tiene una asignada
        if sc.section_part is not None and sc.section_part != enroll.section_part:
            continue

        is_technical = course.is_technical  # campo directo en DB

        # Técnica con specialty_id → exclusiva de esa especialidad
        if is_technical and course.specialty_id is not None:
            if course.specialty_id != student_specialty_id:
                continue

        # Deduplicar
        if course.id in seen:
            continue
        seen.add(course.id)

        professor = db.query(User).filter(User.id == sc.professor_id).first()
        result.append(CourseOut(
            course_id=course.id,
            course_name=course.name,
            description=course.description,
            professor_name=professor.full_name if professor else "Sin asignar",
            is_technical=is_technical,
            section_part=sc.section_part,
            specialty_id=course.specialty_id
        ))

    return result
@router.get("/me/schedule")
def get_my_schedule(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    enroll  = db.query(Enrollment).filter(Enrollment.user_id == profile.user_id).first()
    section = require_section(enroll, db)

    lessons = (
        db.query(ScheduleLesson)
        .filter(ScheduleLesson.section_id == section.id)
        .order_by(ScheduleLesson.section_part, ScheduleLesson.day_of_week, ScheduleLesson.lesson_number)
        .all()
    )

    if not lessons:
        raise HTTPException(status_code=404, detail="Esta sección no tiene horario generado aún")

    sc_ids        = {l.section_course_id for l in lessons}
    professor_ids = {l.professor_id for l in lessons}
    classroom_ids = {l.classroom_id for l in lessons}

    sc_map         = {sc.id: sc for sc in db.query(SectionCourse).filter(SectionCourse.id.in_(sc_ids)).all()}
    course_ids     = {sc.course_id for sc in sc_map.values()}
    courses_map    = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()}
    professors_map = {p.id: p for p in db.query(User).filter(User.id.in_(professor_ids)).all()}
    classrooms_map = {r.id: r for r in db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all()}

    def _build_part(part):
        grid = {dia: {} for dia in DIAS}
        for lesson in lessons:
            if lesson.section_part is not None and lesson.section_part != part:
                continue
            if lesson.section_part is None and part not in ("A", "B"):
                continue
            dia       = DIAS[lesson.day_of_week]
            sc        = sc_map.get(lesson.section_course_id)
            course    = courses_map.get(sc.course_id) if sc else None
            professor = professors_map.get(lesson.professor_id)
            classroom = classrooms_map.get(lesson.classroom_id)
            grid[dia][lesson.lesson_number] = {
                "materia":    course.name if course else None,
                "profesor":   professor.full_name if professor else None,
                "aula":       classroom.name if classroom else None,
                "es_tecnica": course.is_technical if course else False,
            }
        return grid

    return {
        "section_id":   section.id,
        "section_name": section.name,
        "schedule": {
            "A": _build_part("A"),
            "B": _build_part("B"),
        },
    }

@router.get("/me/attendance")
def get_my_attendance(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    enroll  = db.query(Enrollment).filter(Enrollment.user_id == profile.user_id).first()
    section = require_section(enroll, db)

    # Todos los records del estudiante en esta sección
    records = (
        db.query(AttendanceRecord)
        .join(AttendanceReport, AttendanceRecord.report_id == AttendanceReport.id)
        .join(SectionCourse, AttendanceReport.section_course_id == SectionCourse.id)
        .filter(
            AttendanceRecord.user_id == current_user.id,
            SectionCourse.section_id == section.id,
        )
        .order_by(AttendanceReport.date.desc())
        .all()
    )

    if not records:
        return []

    # Precarga de reportes y materias (evita N+1)
    report_ids     = {r.report_id for r in records}
    reports_map    = {
        r.id: r for r in db.query(AttendanceReport)
        .filter(AttendanceReport.id.in_(report_ids)).all()
    }
    sc_ids         = {r.section_course_id for r in reports_map.values()}
    sc_map         = {
        sc.id: sc for sc in db.query(SectionCourse)
        .filter(SectionCourse.id.in_(sc_ids)).all()
    }
    course_ids     = {sc.course_id for sc in sc_map.values()}
    courses_map    = {
        c.id: c for c in db.query(Course)
        .filter(Course.id.in_(course_ids)).all()
    }

    # Agrupar por materia
    grouped: dict[str, list] = {}

    for rec in records:
        report  = reports_map.get(rec.report_id)
        sc      = sc_map.get(report.section_course_id) if report else None
        course  = courses_map.get(sc.course_id) if sc else None
        name    = course.name if course else "Sin materia"

        if name not in grouped:
            grouped[name] = []

        grouped[name].append({
            "record_id":    rec.id,
            "date":         report.date.isoformat() if report else None,
            "lesson_number": report.lesson_number if report else None,
            "lesson_count":  report.lesson_count if report else None,
            "status":        rec.status,
            "justification": rec.justification,
        })

    # Calcular stats por materia
    result = []
    for course_name, recs in grouped.items():
        total      = len(recs)
        presente   = sum(1 for r in recs if r["status"] == "presente")
        ausente    = sum(1 for r in recs if r["status"] == "ausente")
        tardia     = sum(1 for r in recs if r["status"] == "tardia")
        justificado = sum(1 for r in recs if r["status"] == "justificado")
        score = sum(
            1 if r["status"] in ("presente", "justificado") else
            0.33 if r["status"] == "tardia" else
            0
            for r in recs
        )

        rate = round((score / total) * 100, 1) if total > 0 else 0.0

        result.append({
            "course_name":   course_name,
            "total":         total,
            "presente":      presente,
            "ausente":       ausente,
            "tardia":        tardia,
            "justificado":   justificado,
            "attendance_rate": rate,
            "records":       recs,
        })

    # Ordenar alfabéticamente por materia
    result.sort(key=lambda x: x["course_name"])
    return result

@router.get("/me/permissions")
def get_my_permissions(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    permissions = (
        db.query(Permission.code, Permission.description)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == current_user.id)
        .all()
    )

    return [{"code": p.code, "description": p.description} for p in permissions]

@router.get("/me/grades", response_model=list[GradeReportOut])
def get_my_grades(
    period_id: int | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    section = require_section(profile, db)

    query = db.query(GradeReport).filter(
        GradeReport.student_id == current_user.id,
        GradeReport.section_id == section.id,
    )
    if period_id:
        query = query.filter(GradeReport.period_id == period_id)

    grade_reports = query.all()

    result = []
    for gr in grade_reports:
        period = db.query(AcademicPeriod).filter(AcademicPeriod.id == gr.period_id).first()

        # Nombre del curso via SectionCourse
        sc = db.query(SectionCourse).filter(
            SectionCourse.section_id == gr.section_id,
        ).first()
        course = db.query(Course).filter(Course.id == sc.course_id).first() if sc else None

        # Entregas del estudiante en este período y sección
        evaluations = (
            db.query(Evaluation)
            .filter(
                Evaluation.section_id == gr.section_id,
                Evaluation.period_id == gr.period_id,
            )
            .all()
        )

        submissions_out = []
        for ev in evaluations:
            submission = (
                db.query(Submission)
                .filter(
                    Submission.evaluation_id == ev.id,
                    Submission.user_id == current_user.id,
                )
                .first()
            )
            submissions_out.append(SubmissionOut(
                evaluation_title=ev.title,
                score=submission.score if submission else None,
                weight_percent=ev.weight_percent,
                submitted_at=submission.submitted_at if submission else None,
            ))

        result.append(GradeReportOut(
            period_id=gr.period_id,
            period_name=period.name if period else "—",
            course_name=course.name if course else "—",
            final_grade=gr.final_grade,
            status=gr.status,
            submissions=submissions_out,
        ))

    return result