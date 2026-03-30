from pydantic import BaseModel


class EnrollmentCreateSchema(BaseModel):
    user_id: int
    section_id: int


class EnrollmentUpdateSchema(BaseModel):
    status: str  # "activo" | "retirado" | "aprobado" | "reprobado"


VALID_ENROLLMENT_STATUSES = {"activo", "retirado", "aprobado", "reprobado"}