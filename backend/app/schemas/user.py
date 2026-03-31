import datetime

from pydantic import BaseModel, EmailStr


# =========================
# USUARIOS
# =========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    national_id: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True


class UserCreateAdmin(BaseModel):
    email: str
    full_name: str
    national_id: str
    role: str

    student_profile: "StudentProfileCreate | None" = None
    professor_profile: "ProfessorProfileCreate | None" = None


# =========================
# ESTUDIANTES
# =========================

class StudentProfileCreate(BaseModel):
    year_level: int
    section_shift: str
    section_id: int
    specialty_id: int
    section_part: str
    enrolled_since: datetime.date | None = None


class StudentProfileOut(BaseModel):
    student_code: str
    year_level: int
    section_shift: str
    status: str
    enrolled_since: datetime.date | None
    specialty_name: str

    class Config:
        from_attributes = True
# =========================
# PROFESORES
# =========================

class ProfessorProfileCreate(BaseModel):
    specialty_area: str | None = None


class ProfessorCourseAssignSchema(BaseModel):
    course_ids: list[int]


class ProfessorCourseResponse(BaseModel):
    professor_id: int
    course_id: int

    class Config:
        from_attributes = True