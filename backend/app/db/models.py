from sqlalchemy import (
    CheckConstraint, Index, String, Integer, ForeignKey, Date, Boolean,
    Time, DateTime, Numeric, Text, UniqueConstraint, func, Enum
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from decimal import Decimal
import enum as pyenum
import datetime

class PoliticalPartyStatus(str, pyenum.Enum):
    BORRADOR    = "borrador"
    ENVIADO     = "enviado"
    EN_REVISION = "en_revision"
    APROBADO    = "aprobado"
    RECHAZADO   = "rechazado"

class PoliticalPartyMemberRole(str, pyenum.Enum):
    PRESIDENCIA     = "presidencia"
    VICEPRESIDENCIA = "vicepresidencia"
    SECRETARIA      = "secretaria"
    TESORERIA       = "tesoreria"
    FISCALIA        = "fiscalia"
    VOCALIA_1       = "vocalia_1"
    VOCALIA_2       = "vocalia_2"

class PollingMemberRole(str, pyenum.Enum):
    MIEMBRO_PROPIETARIO = "miembro_propietario"
    MIEMBRO_SUPLENTE    = "miembro_suplente"
    FISCAL_PROPIETARIO  = "fiscal_propietario"
    FISCAL_SUPLENTE     = "fiscal_suplente"

class ProfessorStatus(str, pyenum.Enum):
    DISPONIBLE   = "disponible"
    EN_REUNION   = "en_reunion"
    SALIO_ANTES  = "salio_antes"
    AUSENTE      = "ausente"
    PERMISO      = "permiso"

class ClassroomType(str, pyenum.Enum):
    NARANJA     = "naranja"
    VERDE       = "verde"
    LAB_VERDE   = "lab_verde"
    LAB_NARANJA = "lab_naranja"
    ESPECIAL    = "especial"
    GIMNASIO    = "gimnasio"

# =========================
# USERS
# =========================
class User(Base):
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
class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Permission(Base):
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


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id"), primary_key=True
    )


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)


# =========================
# SPECIALTIES
# =========================
class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)


# =========================
# APPLICANTS (Postulantes — proceso de nuevo ingreso)
# Entidad independiente de users. No tienen cuenta en el sistema.
# Al ser aprobados y matriculados, se crea User + StudentProfile.
# =========================
class Applicant(Base):
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


class ApplicantDocument(Base):
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


class ApplicantInterview(Base):
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


class ApplicantTest(Base):
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
class StudentProfile(Base):
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


class Scholarship(Base):
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
class ProfessorProfile(Base):
    __tablename__ = "professor_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    specialty_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialties.id"), nullable=True
    )
    current_status: Mapped[ProfessorStatus] = mapped_column(
        Enum(ProfessorStatus), default=ProfessorStatus.DISPONIBLE, nullable=False
    )
    status_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )


class ProfessorCourse(Base):
    __tablename__ = "professor_courses"

    professor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), primary_key=True
    )

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(100), nullable=False)

    year_level: Mapped[int | None] = mapped_column(
        Integer,
        CheckConstraint("year_level BETWEEN 1 AND 3", name="ck_courses_year_level"),
        nullable=True,
    )
    specialty_id = mapped_column(ForeignKey("specialties.id"), nullable=True)

class StudyPlanCourse(Base):
    __tablename__ = "study_plan_courses"

    id = mapped_column(Integer, primary_key=True)
    study_plan_id = mapped_column(ForeignKey("study_plans.id"), nullable=False)
    course_id = mapped_column(ForeignKey("courses.id"), nullable=False)
    weekly_lessons = mapped_column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("study_plan_id", "course_id", name="uq_plan_course"),
    )

class SectionStudyPlan(Base):
    __tablename__ = "section_study_plans"

    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), primary_key=True
    )
    study_plan_id: Mapped[int] = mapped_column(
        ForeignKey("study_plans.id"), primary_key=True
    )
    part: Mapped[str | None] = mapped_column(
        String(1),
        CheckConstraint("part IN ('A', 'B')", name="ck_section_study_plan_part"),
        nullable=False,
        primary_key=True,  #
    )

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_technical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    specialty_id: Mapped[int | None] = mapped_column(
        ForeignKey("specialties.id"), nullable=True
    )

# =========================
# ADMINISTRATIVE PROFILE
# =========================
class AdministrativeProfile(Base):
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

    
class Section(Base):
    __tablename__ = "sections"

    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(20), nullable=False)
    academic_year = mapped_column(String(20), nullable=False)
    guide_professor_id = mapped_column(ForeignKey("users.id"), nullable=True)

class SectionSpecialty(Base):
    __tablename__ = "section_specialties"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    specialty_id = mapped_column(ForeignKey("specialties.id"), nullable=False)

    part = mapped_column(String(1), nullable=False)  # "A" o "B"

class SectionCourse(Base):
    __tablename__ = "section_courses"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    course_id = mapped_column(ForeignKey("courses.id"), nullable=False)
    professor_id = mapped_column(ForeignKey("users.id"), nullable=False)

    # NULL → materia académica (ambas partes juntas)
    # "A" o "B" → materia técnica (parte específica)
    section_part = mapped_column(String(1), nullable=True)

    __table_args__ = (
        UniqueConstraint("section_id", "course_id", "section_part"),
        # Regla de aplicación: si course.is_technical=False,
        # section_part debe ser NULL y solo puede existir una fila
        # si course.is_technical=True,
        # section_part debe ser "A" o "B", máximo dos filas por course+section
    )

class LessonSlot(Base):
    __tablename__ = "lesson_slots"

    id = mapped_column(Integer, primary_key=True)
    number = mapped_column(Integer, nullable=False, unique=True)  # 1–12

    start_time = mapped_column(Time, nullable=False)
    end_time = mapped_column(Time, nullable=False)

class ScheduleLesson(Base):
    __tablename__ = "schedule_lessons"

    id = mapped_column(Integer, primary_key=True)

    section_id = mapped_column(ForeignKey("sections.id"), nullable=False)
    section_course_id = mapped_column(ForeignKey("section_courses.id"), nullable=False)
    professor_id = mapped_column(ForeignKey("users.id"), nullable=False)  # desnormalizado para poder restringir

    day_of_week = mapped_column(Integer, nullable=False)  # 1–5 en lugar de String, más consistente
    lesson_number = mapped_column(Integer, nullable=False)  # 1–12

    section_part = mapped_column(String(1), nullable=True)  # "A" | "B" | NULL (académicas)

    classroom_id = mapped_column(ForeignKey("classrooms.id"), nullable=False)

    __table_args__ = (
        # Un aula no puede tener dos clases al mismo tiempo
        UniqueConstraint("classroom_id", "day_of_week", "lesson_number"),

        # Un profesor no puede estar en dos lugares al mismo tiempo
        UniqueConstraint("professor_id", "day_of_week", "lesson_number"),

        # Una sección/parte no puede tener dos materias en el mismo slot
        # Cubre tanto académicas (part=NULL) como técnicas (part=A o part=B)
        UniqueConstraint("section_id", "section_part", "day_of_week", "lesson_number"),
    )




class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    type: Mapped[ClassroomType] = mapped_column(Enum(ClassroomType), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ClassroomAvailabilitySlot(Base):
    __tablename__ = "classroom_availability_slots"

    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id"), primary_key=True
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint("day_of_week BETWEEN 0 AND 4", name="ck_classroom_day"),
        primary_key=True,
    )
    lesson_number: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint("lesson_number BETWEEN 1 AND 12", name="ck_classroom_lesson"),
        primary_key=True,
    )

class Enrollment(Base):
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
class AcademicPeriod(Base):
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
class AttendanceReport(Base):
    __tablename__ = "attendance_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_course_id: Mapped[int] = mapped_column(ForeignKey("section_courses.id"), nullable=False)
    professor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    lesson_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime.date] = mapped_column(DateTime, default=func.now())

    __table_args__ = (
        Index("ix_ar_section_course", "section_course_id"),
        Index("ix_ar_date",           "date"),
        Index("ix_ar_professor",      "professor_id"),
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("attendance_reports.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("presente", "ausente", "tardia", "justificado", name="attendance_status"),
        nullable=False,
        default="presente"
    )
    justification: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_arec_report",   "report_id"),
        Index("ix_arec_user",     "user_id"),
        Index("ix_arec_user_rep", "user_id", "report_id"),
    )
# =========================
# GROUPS
# =========================
class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class GroupMember(Base):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)


# =========================
# EVALUATIONS & GRADE REPORTS
# =========================
class Evaluation(Base):
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


class Submission(Base):
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


class GradeReport(Base):
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
class Meeting(Base):
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


class MeetingAttendee(Base):
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
class Announcement(Base):
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
class Event(Base):
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




# =========================
# PROFESSOR AVAILABILITY
# =========================
class ProfessorAvailabilitySlot(Base):
    __tablename__ = "professor_availability_slots"

    professor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint("day_of_week BETWEEN 0 AND 4", name="ck_availability_day"),
        primary_key=True,
    )
    lesson_number: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint("lesson_number BETWEEN 1 AND 12", name="ck_availability_lesson"),
        primary_key=True,
    )
class Mail(Base):
    __tablename__ = "mails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Quién envía
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Asunto y contenido
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Metadata
    sent_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    # Opcional: si quieres tipo broadcast (como announcements)
    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id"), nullable=True
    )

class MailRecipient(Base):
    __tablename__ = "mail_recipients"

    mail_id: Mapped[int] = mapped_column(
        ForeignKey("mails.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

class MailAttachment(Base):
    __tablename__ = "mail_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mail_id: Mapped[int] = mapped_column(
        ForeignKey("mails.id"), nullable=False
    )

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)





# =========================
# VOTATION SYSTEM
# =========================
class ElectoralProcess(Base):
    """
    Un solo proceso electoral.
    La presidencia y vicepresidencia del TEE manejan el proceso.

    registration_status:
        'cerrado' -> los estudiantes no pueden crear partidos políticos.
        'abierto' -> la inscripción de partidos políticos está abierta.
    """

    __tablename__ = "electoral_processes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)
    registration_status: Mapped[str] = mapped_column(String(20), default="cerrado")

    # Metadata
    opened_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    opened_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    closed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    closed_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now(datetime.timezone.utc)
    )

class PollingStation(Base):
    """
    Una de todas las mesas electorales de un proceso electoral.
    Definida por proceso, no globalmente.
    """

    __tablename__ = "polling_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("electoral_processes.id"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)

    __table_args__ = (
        UniqueConstraint("process_id", "name", name="uq_station_per_process"),
    )

class PoliticalParty(Base):
    """
    Registro de un partido político.
    Flujo de estado: borrador -> enviado -> en_revision -> aprobado | rechazado.

    Partidos en 'rechazado' pueden editar y reenviar (el estado se reinicia a borrador
    por cada edición, luego a 'enviado' en cada reenvío).
    """

    __tablename__ = "political_parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("electoral_processes.id"), nullable=False)

    # Identidad
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    initials: Mapped[str | None] = mapped_column(String(20), nullable=True)
    initials_meaning: Mapped[str | None] = mapped_column(String(255), nullable=True)
    colors: Mapped[str | None] = mapped_column(String(255), nullable=True)
    colors_meaning: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flag_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mascot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    advisory_teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Ciclo de vida
    status: Mapped[PoliticalPartyStatus] = mapped_column(
        Enum(PoliticalPartyStatus), default=PoliticalPartyStatus.BORRADOR, nullable=False
    )
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    reviewed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reviewed_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    seb_feedback: Mapped[str | None] = mapped_column(String(500), nullable=True)
 
    # Metadata
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now(datetime.timezone.utc),
        onupdate=datetime.datetime.now(datetime.timezone.utc)
    )

class PoliticalPartyMember(Base):
    """
    Los 7 roles oficiales en un partido político.
    Cada estudiante puede estar en un solo partido político (obligado por
    la restricción única en student_id + process_id)

    La alternabilidad de género será evaluada en la capa de aplicación, no en
    la DB.
    """

    __tablename__ = "political_party_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    party_id: Mapped[int] = mapped_column(ForeignKey("political_parties.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[PoliticalPartyMemberRole] = mapped_column(Enum(PoliticalPartyMemberRole), nullable=False)

    __table_args__ = (
        # Un rol por partido.
        UniqueConstraint("party_id", "role", name="uq_one_role_per_party"),
        # Un partido por estudiante por proceso, restringido por la capa de aplicación.
        # Usamos una restricción directa aquí, pidiendo solo unicidad en student_id +
        # party_id porque ya party_id es único proceso.
        UniqueConstraint("party_id", "student_id", name="uq_one_student_per_party"),
    )

class PollingStationMember(Base):
    """
    Por mesa electoral, cada partido registra:
    - 1 miembro de mesa propietario.
    - 1 fiscal propietario.

    Todos deben ser estudiantes existentes y no pueden ser miembros del partido.
    """

    __tablename__ = "polling_station_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    party_id: Mapped[int] = mapped_column(ForeignKey("political_parties.id"), nullable=False)
    station_id: Mapped[int] = mapped_column(ForeignKey("polling_stations.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[PollingMemberRole] = mapped_column(Enum(PollingMemberRole), nullable=False)

    __table_args__ = (
        # Un estudiante por rol por mesa electoral por partido.
        UniqueConstraint("party_id", "station_id", "role", name="uq_role_per_station_per_party"),
    )

class GovernmentPlan(Base):
    """
    Un plan de gobierno por partido político.
    Se crea automáticamente cuando un partido es creado (vacío).
    Se actualiza iterativamente hasta el envío.
    """

    __tablename__ = "government_plans"
 
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    party_id: Mapped[int] = mapped_column(ForeignKey("political_parties.id"), unique=True, nullable=False)
    objectives: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    contributors: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    values: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    activities: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    timeline: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    goal: Mapped[str | None] = mapped_column(String(1024), nullable=True)
 
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now(datetime.timezone.utc),
        onupdate=datetime.datetime.now(datetime.timezone.utc)
    )

"""
# Plan de gobierno: tiene gobierno al que pertenece
# id_plan
# propuestasPlan: relaciona el id, plan de gobierno, con una propuesta
# propuesta: Objetivo, tiempo de realización, prioridad, descripción
class ElectionParty(Base):
    ""Lista/partido que participa en una elección.""

    __tablename__ = "election_parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    election_id: Mapped[int] = mapped_column(ForeignKey("election.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    #description: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[str] = mapped_column(String(500), nullable=False)


class ElectionVote(Base):
    ""
    Un voto por estudiante por elección.
    - user_id es único por election_id.
    - Nunca se elimina un voto. is_valid=False para votos nulos.
    - No exponer la unión usuario<->partido en endpoints públicos/admin de resultados.
    ""

    __tablename__ = "election_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    election_id: Mapped[int] = mapped_column(ForeignKey("election.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    party_id: Mapped[int] = mapped_column(ForeignKey("election_parties.id"), nullable=False)
    is_valid: Mapped[int] = mapped_column(Boolean, default=True)
    revoked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    voted_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))

    __table_args__ = (
        UniqueConstraint("election_id", "user_id", name="uq_one_vote_per_student"),
    )
"""
