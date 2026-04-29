# app/routers/partidos.py
#
# Agregar a tu main.py:
#   from app.routers.partidos import router as partidos_router
#   app.include_router(partidos_router)
#
# Flujo de estado:
#   borrador → (enviar) → enviado → (revisar) → en_revision → aprobado | rechazado
#   rechazado → (editar) → borrador → (enviar) → enviado → ...

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    ElectoralProcess,
    GovernmentPlan,
    PartyVotesCounter,
    PoliticalParty,
    PoliticalPartyStatus,
)

router = APIRouter(prefix="/electoral/partidos", tags=["partidos"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PartidoCreateIn(BaseModel):
    process_id: int
    created_by: int                         # user_id de quien crea
    advisory_teacher_id: int                # user_id del docente asesor
    name: str
    initials: Optional[str] = None
    initials_meaning: Optional[str] = None
    colors: Optional[str] = None
    colors_meaning: Optional[str] = None
    flag_url: Optional[str] = None
    mascot_url: Optional[str] = None


class PartidoEditIn(BaseModel):
    """
    Todos los campos son opcionales — solo se actualizan los que vienen.
    Solo permitido en estado borrador o rechazado.
    Editar un partido rechazado lo regresa a borrador automáticamente.
    """
    advisory_teacher_id: Optional[int] = None
    name: Optional[str] = None
    initials: Optional[str] = None
    initials_meaning: Optional[str] = None
    colors: Optional[str] = None
    colors_meaning: Optional[str] = None
    flag_url: Optional[str] = None
    mascot_url: Optional[str] = None


class RevisionIn(BaseModel):
    reviewed_by: int                        # user_id del revisor (TEE)
    aprobado: bool
    feedback: Optional[str] = None          # obligatorio si aprobado=False


class PartidoOut(BaseModel):
    id: int
    process_id: int
    name: str
    initials: Optional[str] = None
    initials_meaning: Optional[str] = None
    colors: Optional[str] = None
    colors_meaning: Optional[str] = None
    flag_url: Optional[str] = None
    mascot_url: Optional[str] = None
    advisory_teacher_id: int
    status: str
    submitted_at: Optional[datetime.datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime.datetime] = None
    seb_feedback: Optional[str] = None
    created_by: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_partido_or_404(partido_id: int, db: Session) -> PoliticalParty:
    partido = db.query(PoliticalParty).filter(PoliticalParty.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return partido


def _verificar_proceso_abierto(process_id: int, db: Session) -> ElectoralProcess:
    proceso = db.query(ElectoralProcess).filter(ElectoralProcess.id == process_id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso electoral no encontrado")
    if proceso.registration_status != "abierto":
        raise HTTPException(
            status_code=400,
            detail="La inscripción de partidos está cerrada para este proceso",
        )
    if proceso.closed_at:
        raise HTTPException(status_code=400, detail="El proceso electoral ya está cerrado")
    return proceso


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", response_model=PartidoOut, status_code=201)
def crear_partido(data: PartidoCreateIn, db: Session = Depends(get_db)):
    """
    Crea un partido político en estado borrador.
    Crea automáticamente su GovernmentPlan vacío.
    Solo permitido si el proceso tiene registration_status='abierto'.
    """
    _verificar_proceso_abierto(data.process_id, db)

    partido = PoliticalParty(
        process_id=data.process_id,
        created_by=data.created_by,
        advisory_teacher_id=data.advisory_teacher_id,
        name=data.name,
        initials=data.initials,
        initials_meaning=data.initials_meaning,
        colors=data.colors,
        colors_meaning=data.colors_meaning,
        flag_url=data.flag_url,
        mascot_url=data.mascot_url,
        status=PoliticalPartyStatus.BORRADOR,
    )
    db.add(partido)
    db.flush()  # necesitamos partido.id antes del commit para el plan

    plan = GovernmentPlan(party_id=partido.id)
    db.add(plan)

    db.commit()
    db.refresh(partido)
    return partido


@router.get("", response_model=list[PartidoOut])
def listar_partidos(
    process_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista partidos. Filtrable por proceso y/o estado."""
    query = db.query(PoliticalParty)
    if process_id:
        query = query.filter(PoliticalParty.process_id == process_id)
    if status:
        try:
            query = query.filter(PoliticalParty.status == PoliticalPartyStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Estado inválido: {status}")
    return query.order_by(PoliticalParty.created_at.desc()).all()


@router.get("/{partido_id}", response_model=PartidoOut)
def get_partido(partido_id: int, db: Session = Depends(get_db)):
    return _get_partido_or_404(partido_id, db)


@router.put("/{partido_id}", response_model=PartidoOut)
def editar_partido(partido_id: int, data: PartidoEditIn, db: Session = Depends(get_db)):
    """
    Edita un partido en estado borrador o rechazado.
    Si estaba rechazado, lo regresa a borrador y limpia el feedback.
    """
    partido = _get_partido_or_404(partido_id, db)

    estados_editables = {PoliticalPartyStatus.BORRADOR, PoliticalPartyStatus.RECHAZADO}
    if partido.status not in estados_editables:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede editar un partido en estado '{partido.status}'",
        )

    # Aplicar solo los campos que vienen en el payload
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(partido, field, value)

    # Si estaba rechazado, regresa a borrador y limpia el feedback
    if partido.status == PoliticalPartyStatus.RECHAZADO:
        partido.status = PoliticalPartyStatus.BORRADOR
        partido.seb_feedback = None
        partido.reviewed_by = None
        partido.reviewed_at = None

    partido.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(partido)
    return partido


@router.put("/{partido_id}/enviar", response_model=PartidoOut)
def enviar_partido(partido_id: int, db: Session = Depends(get_db)):
    """
    Envía el partido a revisión.
    Solo permitido desde estado borrador.
    """
    partido = _get_partido_or_404(partido_id, db)

    if partido.status != PoliticalPartyStatus.BORRADOR:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se puede enviar un partido en borrador, estado actual: '{partido.status}'",
        )

    # Validación mínima antes de enviar
    if not partido.name or not partido.advisory_teacher_id:
        raise HTTPException(
            status_code=422,
            detail="El partido debe tener nombre y docente asesor antes de enviarse",
        )

    partido.status = PoliticalPartyStatus.ENVIADO
    partido.submitted_at = datetime.datetime.now(datetime.timezone.utc)
    partido.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(partido)
    return partido


@router.put("/{partido_id}/revisar")
def marcar_en_revision(partido_id: int, db: Session = Depends(get_db)):
    """
    El TEE marca el partido como en revisión.
    Solo permitido desde estado enviado.
    """
    partido = _get_partido_or_404(partido_id, db)

    if partido.status != PoliticalPartyStatus.ENVIADO:
        raise HTTPException(
            status_code=400,
            detail=f"El partido debe estar en estado 'enviado', estado actual: '{partido.status}'",
        )

    partido.status = PoliticalPartyStatus.EN_REVISION
    partido.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"ok": True, "status": partido.status}


@router.put("/{partido_id}/resolver", response_model=PartidoOut)
def resolver_revision(
    partido_id: int,
    data: RevisionIn,
    db: Session = Depends(get_db),
):
    """
    Aprueba o rechaza un partido en revisión.
    Si aprobado=False, el feedback es obligatorio.
    Solo permitido desde estado en_revision.
    """
    partido = _get_partido_or_404(partido_id, db)

    if partido.status != PoliticalPartyStatus.EN_REVISION:
        raise HTTPException(
            status_code=400,
            detail=f"El partido debe estar en revisión, estado actual: '{partido.status}'",
        )

    if not data.aprobado and not data.feedback:
        raise HTTPException(
            status_code=422,
            detail="El feedback es obligatorio al rechazar un partido",
        )

    partido.reviewed_by = data.reviewed_by
    partido.reviewed_at = datetime.datetime.now(datetime.timezone.utc)
    partido.updated_at = datetime.datetime.now(datetime.timezone.utc)

    if data.aprobado:
        partido.status = PoliticalPartyStatus.APROBADO
        partido.seb_feedback = None
        db.add(PartyVotesCounter(party_id=partido.id, quantity=0))
    else:
        partido.status = PoliticalPartyStatus.RECHAZADO
        partido.seb_feedback = data.feedback

    db.commit()
    db.refresh(partido)
    return partido


@router.delete("/{partido_id}", status_code=204)
def eliminar_partido(partido_id: int, db: Session = Depends(get_db)):
    """
    Elimina un partido. Solo permitido en estado borrador.
    También elimina su GovernmentPlan asociado.
    """
    partido = _get_partido_or_404(partido_id, db)

    if partido.status != PoliticalPartyStatus.BORRADOR:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden eliminar partidos en borrador",
        )

    plan = db.query(GovernmentPlan).filter(GovernmentPlan.party_id == partido_id).first()
    if plan:
        db.delete(plan)

    db.delete(partido)
    db.commit()
