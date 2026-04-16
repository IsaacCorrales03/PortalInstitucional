import datetime
from pydantic import BaseModel, ConfigDict, model_validator
from app.db.models import PoliticalPartyStatus, PoliticalPartyMemberRole, PollingMemberRole 
  
class ElectoralProcessCreate(BaseModel):
    name: str
    academic_year: str

class ElectoralProcessOut(BaseModel):
    id: int
    name: str
    academic_year: str
    registration_status: str
    created_at: datetime.datetime
    opened_at: datetime.datetime | None
    closed_at: datetime.datetime | None
 
    model_config = ConfigDict(from_attributes=True)

class PoliticalPartyCreate(BaseModel):
    """Información mínima para crear un borrador. El resto se actualiza después"""
    process_id: int
    name: str
    initials: str

class PoliticalPartyUpdate(BaseModel):
    """Todos los campos son opcionales. Actualizaciones parciales son soportadas"""
    name: str | None = None
    initials: str | None = None
    initials_meaning: str | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    colors_meaning: str | None = None
    flag_url: str | None = None
    mascot_url: str | None = None
    advisory_teacher_id: int | None = None

class PoliticalPartyOut(BaseModel):
    id: int
    process_id: int
    name: str
    initials: str
    initials_meaning: str | None
    color_primary: str | None
    color_secondary: str | None
    colors_meaning: str | None
    flag_url: str | None
    mascot_url: str | None
    advisory_teacher_id: int | None
    status: PoliticalPartyStatus
    submitted_at: datetime.datetime | None
    reviewed_at: datetime.datetime | None
    seb_feedback: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
 
    model_config = ConfigDict(from_attributes=True)

class PartyMemberAdd(BaseModel):
    student_id: int
    role: PoliticalPartyMemberRole

class PartyMemberOut(BaseModel):
    id: int
    party_id: int
    student_id: int
    role: PoliticalPartyMemberRole
 
    model_config = ConfigDict(from_attributes=True)

class PollingStationCreate(BaseModel):
    number: int
    location: str | None = None

class PollingStationOut(BaseModel):
    id: int
    process_id: int
    number: int
    location: str | None
 
    model_config = ConfigDict(from_attributes=True)

class PollingMemberAdd(BaseModel):
    station_id: int
    student_id: int
    role: PollingMemberRole

class PollingMemberOut(BaseModel):
    id: int
    party_id: int
    station_id: int
    student_id: int
    role: PollingMemberRole
 
    model_config = ConfigDict(from_attributes=True)

class GovernmentPlanUpdate(BaseModel):
    """Actualizaciones parciales, solo se actualizan los cambios que se guardan"""
    objectives: str | None = None
    contributors: str | None = None
    values: str | None = None
    activities: str | None = None
    timeline: str | None = None
    goal: str | None = None

class GovernmentPlanOut(BaseModel):
    id: int
    party_id: int
    objectives: str | None
    contributors: str | None
    values: str | None
    activities: str | None
    timeline: str | None
    goal: str | None
    updated_at: datetime.datetime
 
    model_config = ConfigDict(from_attributes=True)

class SEBReviewIn(BaseModel):
    """El TEE aprueba o denega un partido, dejando una retroalimentación"""
    action: str  # "aprobar" | "rechazar
    feedback: str | None = None
 
    @model_validator(mode="after")
    def validate_action(self):
        if self.action not in ("aprobar", "rechazar"):
            raise ValueError("action must be 'aprobar' or 'rechazar'")
        if self.action == "rechazar" and not self.feedback:
            raise ValueError("feedback is required when rejecting a party")
        return self

class PartyDetailOut(BaseModel):
    """Información completa para el panel de revisión del TEE"""
    party: PoliticalPartyOut
    members: list[PartyMemberOut]
    polling_members: list[PollingMemberOut]
    government_plan: GovernmentPlanOut | None
 
    model_config = ConfigDict(from_attributes=True)
