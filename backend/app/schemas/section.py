
from pydantic import BaseModel, field_validator

from app.schemas.courses import CourseAssignmentSchema


class SectionCreateSchema(BaseModel):
    name: str
    academic_year: int | str  
    year_level: int

    specialty_id_a: int
    specialty_id_b: int
    guide_professor_id: int | None = None
    course_assignments: list[CourseAssignmentSchema]

    @field_validator("academic_year", mode="before")
    @classmethod
    def coerce_academic_year(cls, v):
        return str(v)                 # siempre guarda como string

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

