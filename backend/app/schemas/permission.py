
from pydantic import BaseModel


class PermissionCreateSchema(BaseModel):
    code: str
    description: str | None = None
