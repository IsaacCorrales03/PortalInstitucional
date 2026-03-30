from pydantic import BaseModel


class CourseAssignmentSchema(BaseModel):
    course_id: int
    professor_id: int
