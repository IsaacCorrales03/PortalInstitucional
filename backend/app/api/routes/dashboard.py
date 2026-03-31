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
            is_guide=course.is_guide,
            section_part=sc.section_part,
            specialty_id=course.specialty_id
        ))

    return result

@router.get("/me/attendance", response_model=AttendanceSummaryOut)
def get_my_attendance(
    section_id: int | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = require_student_profile(current_user, db)
    section = require_section(profile, db)

    # Filtrar por sección específica o usar la sección del estudiante
    target_section_id = section_id if section_id else section.id

    records = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == current_user.id,
            Attendance.section_id == target_section_id,
        )
        .order_by(Attendance.date.desc())
        .all()
    )

    # Obtener nombres de cursos por section_course
    section_courses = (
        db.query(SectionCourse).filter(SectionCourse.section_id == target_section_id).all()
    )
    course_map = {}
    for sc in section_courses:
        course = db.query(Course).filter(Course.id == sc.course_id).first()
        if course:
            course_map[sc.section_id] = course.name

    records_out = []
    present_count = 0
    late_count    = 0

    for r in records:
        if r.present:
            present_count += 1
        if r.late:
            late_count += 1

        records_out.append(AttendanceRecordOut(
            date=r.date,
            course_name=course_map.get(r.section_id, "—"),
            present=r.present,
            late=r.late,
            justification=r.justification,
        ))

    total        = len(records)
    absent_count = total - present_count
    rate         = round((present_count / total) * 100, 1) if total > 0 else 0.0

    return AttendanceSummaryOut(
        total=total,
        present=present_count,
        absent=absent_count,
        late=late_count,
        attendance_rate=rate,
        records=records_out,
    )


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