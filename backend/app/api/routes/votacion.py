# votacion/router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import update
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.db.models import (
    PoliticalParty, PoliticalPartyStatus,
    ElectionVote, PartyVotesCounter,
)

router = APIRouter(prefix="", tags=["votacion"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PartidoOut(BaseModel):
    id:       int
    nombre:   str
    siglas:   Optional[str] = None
    colores:  Optional[str] = None
    flag_url: Optional[str] = None

    class Config:
        from_attributes = True


class RegistrarParticipacionIn(BaseModel):
    """
    Registra que el estudiante ejerció su voto.
    NO contiene party_id — ese dato nunca llega al servidor.
    """
    sala_id:    str   # ID del room de Socket.IO
    votante_id: str   # cédula del votante, se resuelve a user_id internamente
    process_id: int   # ElectoralProcess.id


class SumarVotoIn(BaseModel):
    """
    Incrementa el contador del partido elegido.
    NO contiene user_id ni ningún dato del votante.
    """
    partido_id: int


class ConteoOut(BaseModel):
    partido_id: int
    nombre:     str
    siglas:     Optional[str] = None
    votos:      int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/partidos", response_model=list[PartidoOut])
def get_partidos(process_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Lista partidos aprobados, filtrando por proceso si se indica."""
    query = db.query(PoliticalParty).filter(
        PoliticalParty.status == PoliticalPartyStatus.APROBADO
    )
    if process_id:
        query = query.filter(PoliticalParty.process_id == process_id)

    return [
        PartidoOut(
            id=p.id,
            nombre=p.name,
            siglas=p.initials,
            colores=p.colors,
            flag_url=p.flag_url,
        )
        for p in query.all()
    ]


@router.post("/votos/participacion", status_code=201)
def registrar_participacion(data: RegistrarParticipacionIn, db: Session = Depends(get_db)):
    """
    Paso 1 — El servidor Socket.IO llama esto cuando el auxiliar acepta al votante.
    Solo registra que el estudiante participó. Sin partido.

    El frontend hace esta llamada ANTES de mostrarle las opciones al votante,
    o en paralelo mientras vota — nunca junto con el partido elegido.
    """
    from app.db.models import User

    # Resolver cédula → User
    usuario = db.query(User).filter(User.national_id == data.votante_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Votante no encontrado")

    # Verificar que no haya votado ya (la UniqueConstraint lo bloquea igual,
    # pero conviene dar un mensaje claro)
    ya_voto = db.query(ElectionVote).filter(
        ElectionVote.process_id == data.process_id,
        ElectionVote.user_id == usuario.id,
    ).first()
    if ya_voto:
        raise HTTPException(status_code=409, detail="El estudiante ya ejerció su voto")

    voto = ElectionVote(
        process_id=data.process_id,
        user_id=usuario.id,
        is_valid=True,
        # party_id no existe en el modelo — eliminado intencionalmente
    )
    db.add(voto)
    db.commit()
    db.refresh(voto)

    return {"ok": True, "voto_id": voto.id}




@router.get("/votos/conteo", response_model=list[ConteoOut])
def conteo_votos(process_id: int, db: Session = Depends(get_db)):
    """
    Resultados por partido. Lee directamente de PartyVotesCounter,
    que nunca tuvo información del votante.
    """
    partidos = db.query(PoliticalParty).filter(
        PoliticalParty.process_id == process_id,
        PoliticalParty.status == PoliticalPartyStatus.APROBADO,
    ).all()

    if not partidos:
        return []

    partido_ids = [p.id for p in partidos]
    contadores = db.query(PartyVotesCounter).filter(
        PartyVotesCounter.party_id.in_(partido_ids)
    ).all()

    conteo_map = {c.party_id: c.quantity for c in contadores}
    partido_map = {p.id: p for p in partidos}

    return [
        ConteoOut(
            partido_id=pid,
            nombre=partido_map[pid].name,
            siglas=partido_map[pid].initials,
            votos=conteo_map.get(pid, 0),
        )
        for pid in partido_ids
    ]