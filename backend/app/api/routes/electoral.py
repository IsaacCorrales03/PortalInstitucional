# app/routers/electoral.py

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    ElectionVote,
    ElectoralProcess,
    PartyVotesCounter,
    PoliticalParty,
    PoliticalPartyStatus,
    User,
)

router = APIRouter(prefix="/electoral", tags=["electoral"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProcesoIn(BaseModel):
    academic_year: int
    opened_by: int


class ProcesoOut(BaseModel):
    id: int
    academic_year: int
    registration_status: str
    opened_by: int
    opened_at: datetime.datetime
    closed_by: Optional[int] = None
    closed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class PartidoOut(BaseModel):
    id: int
    nombre: str
    siglas: Optional[str] = None
    colores: Optional[str] = None
    flag_url: Optional[str] = None

    class Config:
        from_attributes = True


class RegistrarParticipacionIn(BaseModel):
    """
    Registra que el estudiante participó. Sin partido.
    Llamado por Socket.IO al aceptar el voto.
    """
    process_id: int
    votante_id: str   # cédula — se resuelve a User.id aquí
    sala_id:    str   # solo para logging


class SumarVotoIn(BaseModel):
    """
    Incrementa el contador del partido. Sin user_id ni cédula.
    Llamado por Socket.IO en request separada e independiente.
    """
    partido_id: int


class ConteoOut(BaseModel):
    partido_id: int
    nombre: str
    siglas: Optional[str] = None
    votos: int


# ─── Proceso electoral ────────────────────────────────────────────────────────

@router.post("/procesos", response_model=ProcesoOut, status_code=201)
def crear_proceso(data: ProcesoIn, db: Session = Depends(get_db)):
    """Crea un proceso electoral. Nace abierto."""
    proceso = ElectoralProcess(
        academic_year=data.academic_year,
        registration_status="abierto",
        opened_by=data.opened_by,
        opened_at=datetime.datetime.now(datetime.timezone.utc),
        created_by=data.opened_by,
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(proceso)
    db.commit()
    db.refresh(proceso)
    return proceso


@router.get("/procesos", response_model=list[ProcesoOut])
def listar_procesos(db: Session = Depends(get_db)):
    return db.query(ElectoralProcess).order_by(ElectoralProcess.academic_year.desc()).all()


@router.get("/procesos/{process_id}", response_model=ProcesoOut)
def get_proceso(process_id: int, db: Session = Depends(get_db)):
    proceso = db.query(ElectoralProcess).filter(ElectoralProcess.id == process_id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    return proceso


@router.put("/procesos/{process_id}/cerrar")
def cerrar_proceso(process_id: int, closed_by: int, db: Session = Depends(get_db)):
    proceso = db.query(ElectoralProcess).filter(ElectoralProcess.id == process_id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    if proceso.closed_at:
        raise HTTPException(status_code=400, detail="El proceso ya está cerrado")
    proceso.closed_by = closed_by
    proceso.closed_at = datetime.datetime.now(datetime.timezone.utc)
    proceso.registration_status = "cerrado"
    db.commit()
    return {"ok": True}


@router.put("/procesos/{process_id}/inscripcion")
def toggle_inscripcion(process_id: int, estado: str, db: Session = Depends(get_db)):
    if estado not in ("abierto", "cerrado"):
        raise HTTPException(status_code=400, detail="estado debe ser 'abierto' o 'cerrado'")
    proceso = db.query(ElectoralProcess).filter(ElectoralProcess.id == process_id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    proceso.registration_status = estado
    db.commit()
    return {"ok": True, "registration_status": estado}


# ─── Partidos ─────────────────────────────────────────────────────────────────

@router.get("/procesos/{process_id}/partidos", response_model=list[PartidoOut])
def get_partidos(process_id: int, db: Session = Depends(get_db)):
    """Lista los partidos aprobados de un proceso. Usado por el frontend de votación."""
    partidos = (
        db.query(PoliticalParty)
        .filter(
            PoliticalParty.process_id == process_id,
            PoliticalParty.status == PoliticalPartyStatus.APROBADO,
        )
        .all()
    )
    return [
        PartidoOut(
            id=p.id,
            nombre=p.name,
            siglas=p.initials,
            colores=p.colors,
            flag_url=p.flag_url,
        )
        for p in partidos
    ]


# ─── Votos ────────────────────────────────────────────────────────────────────

@router.post("/votos/participacion", status_code=201)
def registrar_participacion(data: RegistrarParticipacionIn, db: Session = Depends(get_db)):
    """
    Paso 1 — registra que el votante participó. Sin partido.
    El servidor Socket.IO llama esto al aceptar el voto.
    """
    usuario = db.query(User).filter(User.national_id == data.votante_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Votante no encontrado")

    proceso = db.query(ElectoralProcess).filter(
        ElectoralProcess.id == data.process_id
    ).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso electoral no encontrado")
    if proceso.closed_at:
        raise HTTPException(status_code=400, detail="El proceso electoral ya está cerrado")

    duplicado = db.query(ElectionVote).filter(
        ElectionVote.process_id == data.process_id,
        ElectionVote.user_id == usuario.id,
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Este votante ya registró su voto")

    voto = ElectionVote(
        process_id=data.process_id,
        user_id=usuario.id,
        is_valid=True,
    )
    db.add(voto)
    db.commit()
    db.refresh(voto)

    return {"ok": True, "voto_id": voto.id}


@router.post("/votos/sumar", status_code=200)
def sumar_voto_partido(data: SumarVotoIn, db: Session = Depends(get_db)):
    """
    Paso 2 — incrementa el contador del partido. Sin ningún dato del votante.
    El servidor Socket.IO llama esto en request separada e independiente.
    """
    print("Contador")
    print(data.partido_id)
    contador = db.query(PartyVotesCounter).filter(
        PartyVotesCounter.party_id == data.partido_id
    ).first()
    if not contador:
        counter = PartyVotesCounter(party_id=data.partido_id, quantity=0)
        db.add(counter)

    db.execute(
        update(PartyVotesCounter)
        .where(PartyVotesCounter.party_id == data.partido_id)
        .values(quantity=PartyVotesCounter.quantity + 1)
    )
    db.commit()

    return {"ok": True}


@router.get("/votos/conteo", response_model=list[ConteoOut])
def conteo_votos(process_id: int, db: Session = Depends(get_db)):
    """
    Resultados por partido. Lee de PartyVotesCounter — nunca de ElectionVote,
    que no guarda a qué partido votó nadie.
    """
    partidos = db.query(PoliticalParty).filter(
        PoliticalParty.process_id == process_id,
        PoliticalParty.status == PoliticalPartyStatus.APROBADO,
    ).all()

    if not partidos:
        return []

    partido_ids = [p.id for p in partidos]
    contadores  = db.query(PartyVotesCounter).filter(
        PartyVotesCounter.party_id.in_(partido_ids)
    ).all()

    conteo_map = {c.party_id: c.quantity for c in contadores}

    return [
        ConteoOut(
            partido_id=p.id,
            nombre=p.name,
            siglas=p.initials,
            votos=conteo_map.get(p.id, 0),
        )
        for p in partidos
    ]
