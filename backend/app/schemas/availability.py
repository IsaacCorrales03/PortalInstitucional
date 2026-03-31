from datetime import time
from typing import Literal

from pydantic import BaseModel, field_validator


class AvailabilityCreateSchema(BaseModel):
    day_of_week: Literal[
        "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"
    ]
    start_time: time
    end_time: time

    @field_validator("end_time")
    def validate_time_range(cls, v, values):
        start = values.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time debe ser mayor que start_time")
        return v

class AvailabilityBulkCreateSchema(BaseModel):
    availabilities: list[AvailabilityCreateSchema]   
class AvailabilityResponseSchema(BaseModel):
    id: int
    day_of_week: str
    start_time: time
    end_time: time

    class Config:
        from_attributes = True
class AvailabilityUpdateSchema(BaseModel):
    day_of_week: str | None = None
    start_time: time | None = None
    end_time: time | None = None