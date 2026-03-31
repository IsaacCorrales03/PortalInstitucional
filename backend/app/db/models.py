from sqlalchemy import (
    String, Integer, ForeignKey, Date, Boolean,
    Time, DateTime, Numeric, Text, UniqueConstraint
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import datetime
from decimal import Decimal


# =========================
# USERS
# =========================
class User(DeclarativeBase):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    national_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    birth_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


# =========================
# ROLES & PERMISSIONS
# =========================
class Role(DeclarativeBase):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Permission(DeclarativeBase):
    """
    Permisos granulares del sistema. Códigos posibles:
      schedule_meetings     → programar reuniones
      manage_scholarships   → otorgar / revocar becas
      set_professor_status  → cambiar estado de docentes
      manage_admissions     → gestionar proceso de nuevo ingreso
      view_grade_reports    → ver boletines de calificaciones
      manage_enrollments    → gestionar matrícula
      send_announcements    → publicar avisos institucionales
    """
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class RolePermission(DeclarativeBase):
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id"), primary_key=True
    )


class UserRole(DeclarativeBase):
    __tablename__ = "user_roles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)


# =========================
# SPECIALTIES
# =========================
class Specialty(DeclarativeBase):
    __tablename__ = "specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)


# =========================
# APPLICANTS (Postulantes — proceso de nuevo ingreso)
# Entidad independiente de users. No tienen cuenta en el sistema.
# Al ser aprobados y matriculados, se crea User + StudentProfile.
# =========================
class Applicant(DeclarativeBase):
    """
    status:
      'pendiente'   → recién ingresado, sin revisar
      'en_revision' → documentos en revisión
      'en_proceso'  → entrevista / prueba pendiente
      'aprobado'    → admitido, pendiente de matricularse
      'lista_espera'→ no hay cupo en especialidades elegidas
      'rechazado'   → no cumple requisitos
      'matriculado' → ya se convirtió en estudiante oficial

    assigned_specialty_id:
      Definido según el puntaje final (prueba + entrevista) y
      disponibilidad de cupos. Puede ser primary o secondary.
    """
    __tablename__ = "applicants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    national_id: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    birth_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    primary_specialty_id: Mapped[int] = mapped_column(
        ForeignKey("specialties.id"), nullable=False
    )
    secondary_specialty_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialties.id"), nullable=True
    )
    assigned_specialty_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialties.id"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(30), default="pendiente")
    final_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    applied_at: Mapped[datetime.date] = mapped_column(Date, default=datetime.date.today)
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ApplicantDocument(DeclarativeBase):
    """
    document_type: 'acta_nacimiento' | 'notas_previas' | 'cedula' | 'foto' | 'otro'
    review_status: 'pendiente' | 'aprobado' | 'rechazado'
    """
    __tablename__ = "applicant_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("applicants.id"), nullable=False
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), default="pendiente")
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )


class ApplicantInterview(DeclarativeBase):
    """Entrevista realizada por un administrativo o docente al postulante."""
    __tablename__ = "applicant_interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("applicants.id"), nullable=False
    )
    interviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    scheduled_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ApplicantTest(DeclarativeBase):
    """Prueba de diagnóstico / admisión aplicada al postulante."""
    __tablename__ = "applicant_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("applicants.id"), nullable=False
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    taken_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    administered_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


# =========================
# STUDENT PROFILE (Estudiantes oficiales)
# Una única especialidad asignada. Existe solo tras matricularse.
# =========================
class StudentProfile(DeclarativeBase):
    """
    year_level: 1 | 2 | 3  (año técnico)
    section_shift: 'diurna' | 'nocturna'
    status: 'activo' | 'inactivo' | 'egresado' | 'retirado'

    converted_from_applicant_id:
      Referencia al Applicant que originó este estudiante.
      Nullable para soportar traslados u otros ingresos sin postulación.
    """
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    student_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    year_level: Mapped[int] = mapped_column(Integer, nullable=False)
    specialty_id: Mapped[int] = mapped_column(
        ForeignKey("specialties.id"), nullable=False
    )
    section_shift: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="activo")
    enrolled_since: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    converted_from_applicant_id: Mapped[int | None] = mapped_column(
        ForeignKey("applicants.id"), nullable=True
    )


class Scholarship(DeclarativeBase):
    """
    type: 'transporte' | 'alimentacion'
    status: 'activa' | 'suspendida' | 'finalizada'
    Requiere permiso: manage_scholarships
    """
    __tablename__ = "scholarships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.user_id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="activa")
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    granted_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


# =========================
# PROFESSOR PROFILE
# =========================
class ProfessorProfile(DeclarativeBase):
    """
    current_status:
      'disponible' | 'en_reunion' | 'salio_antes' | 'ausente' | 'permiso'

    Puede ser modificado por el docente o por administrativos con
    el permiso set_professor_status.
    """
    __tablename__ = "professor_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    specialty_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_status: Mapped[str] = mapped_column(String(50), default="disponible")
    status_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )


# =========================
# ADMINISTRATIVE PROFILE
# =========================
class AdministrativeProfile(DeclarativeBase):
    """
    section_shift: 'diurna' | 'nocturna' | 'completo'
    El nivel de privilegio se gestiona mediante roles y permisos,
    no como campo directo en este modelo.
    """
    __tablename__ = "administrative_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    position_title: Mapped[str] = mapped_column(String(255), nullable=False)
    section_shift: Mapped[str] = mapped_column(String(20), nullable=False)


# =========================
# COURSES & SECTIONS
# =========================
class Course(DeclarativeBase):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # en tu modelo Course
    is_guide: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    specialty_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialties.id"), nullable=True
    )
    year_level: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Section(DeclarativeBase):
    __tablename__ = "sections"

    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(20), nullable=False)
    academic_year = mapped_column(String(20), nullable=False)
    guide_professor_id = mapped_column(ForeignKey("users.id"), nullable=True)

class SectionSpecialty(DeclarativeBase):
    __tablename__ = "section_specialties"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    specialty_id = mapped_column(ForeignKey("specialties.id"), nullable=False)

    part = mapped_column(String(1), nullable=False)  # "A" o "B"

class SectionCourse(DeclarativeBase):
    __tablename__ = "section_courses"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    course_id = mapped_column(ForeignKey("courses.id"), nullable=False)

    professor_id = mapped_column(ForeignKey("users.id"), nullable=False)
    section_part = mapped_column(String(1), nullable=True)
    __table_args__ = (
        UniqueConstraint("section_id", "course_id"), 
    )

class Schedule(DeclarativeBase):
    """Horario de una sección. day_of_week: 'lunes' | 'martes' | ..."""
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    room: Mapped[str | None] = mapped_column(String(50), nullable=True)


class Enrollment(DeclarativeBase):
    """status: 'activo' | 'retirado' | 'aprobado' | 'reprobado'"""
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "section_id"),)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), primary_key=True
    )
    section_part = mapped_column(String(1), nullable=False)
    enrolled_at: Mapped[datetime.date] = mapped_column(
        Date, default=datetime.date.today
    )
    status: Mapped[str] = mapped_column(String(30), default="activo")


# =========================
# ACADEMIC PERIODS
# =========================
class AcademicPeriod(DeclarativeBase):
    """e.g. name='I Trimestre 2025', academic_year='2025'"""
    __tablename__ = "academic_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)


# =========================
# ATTENDANCE
# =========================
class Attendance(DeclarativeBase):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    present: Mapped[bool] = mapped_column(Boolean, default=False)
    late: Mapped[bool] = mapped_column(Boolean, default=False)
    justification: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )


# =========================
# GROUPS
# =========================
class Group(DeclarativeBase):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class GroupMember(DeclarativeBase):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)


# =========================
# EVALUATIONS & GRADE REPORTS
# =========================
class Evaluation(DeclarativeBase):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    period_id: Mapped[int] = mapped_column(
        ForeignKey("academic_periods.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    due_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)


class Submission(DeclarativeBase):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluations.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    submitted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    graded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class GradeReport(DeclarativeBase):
    """
    Boletín de calificaciones final por período y sección.
    status: 'pendiente' | 'aprobado' | 'reprobado'
    """
    __tablename__ = "grade_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    period_id: Mapped[int] = mapped_column(
        ForeignKey("academic_periods.id"), nullable=False
    )
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    final_grade: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pendiente")
    generated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )


# =========================
# MEETINGS
# =========================
class Meeting(DeclarativeBase):
    """
    Requiere permiso: schedule_meetings
    status: 'programada' | 'en_curso' | 'finalizada' | 'cancelada'
    """
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="programada")
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)


class MeetingAttendee(DeclarativeBase):
    """
    role: 'organizador' | 'participante' | 'opcional'
    rsvp_status: 'pendiente' | 'confirmado' | 'rechazado'
    """
    __tablename__ = "meeting_attendees"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(30), default="participante")
    rsvp_status: Mapped[str] = mapped_column(String(30), default="pendiente")


# =========================
# ANNOUNCEMENTS
# =========================
class Announcement(DeclarativeBase):
    """
    Requiere permiso: send_announcements

    target_role: 'estudiante' | 'docente' | 'administrativo' | None (todos)
    target_section_id: None = aplica a toda la institución
    """
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id"), nullable=True
    )
    published_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

# =========================
# EVENTS (Eventos institucionales)
# =========================
class Event(DeclarativeBase):
    """
    type: 'academico' | 'cultural' | 'deportivo' | 'administrativo'
    status: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'

    target_role:
      'estudiante' | 'docente' | 'administrativo' | None (todos)
    """
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="programado")

    start_datetime: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    end_datetime: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id"), nullable=True
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class StudyPlan(DeclarativeBase):
    __tablename__ = "study_plans"

    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(100), nullable=False)

    year_level = mapped_column(Integer, nullable=False)
    specialty_id = mapped_column(ForeignKey("specialties.id"), nullable=True)

class StudyPlanCourse(DeclarativeBase):
    __tablename__ = "study_plan_courses"

    id = mapped_column(Integer, primary_key=True)
    study_plan_id = mapped_column(ForeignKey("study_plans.id"), nullable=False)
    course_id = mapped_column(ForeignKey("courses.id"), nullable=False)

    part = mapped_column(String(1), nullable=True)  # A / B / NULL

class SectionStudyPlan(DeclarativeBase):
    __tablename__ = "section_study_plans"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    study_plan_id = mapped_column(ForeignKey("study_plans.id"), nullable=False)

    part = mapped_column(String(1), nullable=True)  # A / B / NULL

class ProfessorCourse(DeclarativeBase):
    __tablename__ = "professor_courses"

    professor_id = mapped_column(ForeignKey("users.id"), primary_key=True)
    course_id = mapped_column(ForeignKey("courses.id"), primary_key=True)

# =========================
# PROFESSOR AVAILABILITY
# =========================
class ProfessorAvailability(DeclarativeBase):
    __tablename__ = "professor_availabilities"

    id = mapped_column(Integer, primary_key=True)

    professor_id = mapped_column(ForeignKey("users.id"), nullable=False)

    day_of_week = mapped_column(String(20), nullable=False)  # lunes, martes, etc.
    start_time = mapped_column(Time, nullable=False)
    end_time = mapped_column(Time, nullable=False)

    __table_args__ = (
        UniqueConstraint("professor_id", "day_of_week", "start_time", "end_time"),
    )

# =========================
# VOTATION SYSTEM
# =========================
class Election(DeclarativeBase):
    """
    status: 'pendiente' | 'abierta' | 'cerrada'
    """

    __tablename__ = "election"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #name: Mapped[str] = mapped_column(String(255), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[int] = mapped_column(String(30), default="pendiente")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now(datetime.timezone.utc)
    )
    closed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=False)