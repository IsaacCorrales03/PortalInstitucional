from pydantic import BaseModel


class CourseAssignmentSchema(BaseModel):
    course_id: int
    professor_id: int
    section_part: str | None = None

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
    
class CourseOut(BaseModel):
    course_id: int
    course_name: str
    description: str | None = None
    professor_name: str
    is_technical: bool
    is_guide: bool
    section_part: str | None = None
    specialty_id: int | None = None