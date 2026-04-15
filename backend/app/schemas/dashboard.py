import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.user import StudentProfileOut


class DashboardOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    national_id: str
    birth_date: datetime.date | None
    phone: str | None
    is_active: bool
    created_at: datetime.datetime
    roles: list[str]
    profile: StudentProfileOut | None

class SubmissionOut(BaseModel):
    evaluation_title: str
    score: Decimal | None
    weight_percent: Decimal | None
    submitted_at: datetime.datetime | None


class GradeReportOut(BaseModel):
    period_id: int
    period_name: str
    course_name: str
    final_grade: Decimal | None
    status: str
    submissions: list[SubmissionOut]

class MailOut(BaseModel):
    id: int
    subject: str
    content: str
    sender_name: str
    sent_at: datetime.datetime
    is_read: bool
    attachments: list[str] = []
    is_mine: bool

class MailReadUpdate(BaseModel):
    is_read: bool

class MailCreate(BaseModel):
    subject: str
    content: str

    # Opcionales (puedes usar uno o varios)
    recipient_ids: list[int] = []
    target_role: str | None = None
    target_section_id: int | None = None

    attachments: list[str] = []  # URLs o paths