"""Schémas de validation (Pydantic) des données reçues par l'API."""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, create_model, model_validator

Role = Literal["admin", "conducteur", "chef", "lecteur"]
Statut = Literal["À faire", "En cours", "Terminé"]
Prio = Literal["haute", "normale", "basse"]
Resultat = Literal["Conforme", "Défaut ouvert", "Défaut corrigé"]
Gravite = Literal["Mineur", "Modéré", "Grave"]
StatutInc = Literal["Ouvert", "Clos"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProjectIn(Strict):
    nom: str = Field(min_length=1, max_length=200)
    nature: Optional[str] = Field(default=None, max_length=60)
    lieu: Optional[str] = Field(default=None, max_length=200)
    moa: Optional[str] = Field(default=None, max_length=200)
    moe: Optional[str] = Field(default=None, max_length=200)
    objectifs: Optional[str] = Field(default=None, max_length=2000)
    budget: float = Field(ge=0)
    debut: date
    fin: date
    bud: Optional[dict[str, float]] = None

    @model_validator(mode="after")
    def _dates(self):
        if self.fin < self.debut:
            raise ValueError("La date de fin précède la date de début.")
        return self


class PhaseIn(Strict):
    project_id: UUID
    nom: str = Field(min_length=1, max_length=200)
    debut: date
    fin: date
    av: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def _dates(self):
        if self.fin < self.debut:
            raise ValueError("La date de fin précède la date de début.")
        return self


class TaskIn(Strict):
    project_id: UUID
    titre: str = Field(min_length=1, max_length=300)
    date: date
    assigne: Optional[str] = Field(default=None, max_length=200)
    statut: Statut = "À faire"
    prio: Prio = "normale"
    phase: Optional[str] = Field(default=None, max_length=200)


class ReportIn(Strict):
    project_id: UUID
    date: date
    meteo: Optional[str] = Field(default=None, max_length=60)
    effectif: Optional[int] = Field(default=None, ge=0, le=100000)
    travaux: str = Field(min_length=1, max_length=4000)
    problemes: Optional[str] = Field(default=None, max_length=4000)


class ExpenseIn(Strict):
    project_id: UUID
    cat: str = Field(min_length=1, max_length=120)
    libelle: str = Field(min_length=1, max_length=300)
    montant: float = Field(ge=0)
    date: date


class ControlIn(Strict):
    project_id: UUID
    type: str = Field(min_length=1, max_length=120)
    date: date
    resultat: Resultat
    note: Optional[str] = Field(default=None, max_length=4000)


class IncidentIn(Strict):
    project_id: UUID
    date: date
    type: str = Field(min_length=1, max_length=120)
    gravite: Gravite
    description: str = Field(min_length=1, max_length=4000)
    mesure: Optional[str] = Field(default=None, max_length=4000)
    statut: StatutInc = "Ouvert"


class TeamIn(Strict):
    project_id: UUID
    nom: str = Field(min_length=1, max_length=200)
    role: Optional[str] = Field(default=None, max_length=120)
    tel: Optional[str] = Field(default=None, max_length=60)


def _partial(model: type[BaseModel]) -> type[BaseModel]:
    """Version « tous les champs optionnels » pour les modifications partielles (PATCH)."""
    fields = {
        name: (Optional[f.annotation], None)
        for name, f in model.model_fields.items()
        if name != "project_id"
    }
    return create_model(f"{model.__name__}Patch", __config__=ConfigDict(extra="forbid", str_strip_whitespace=True), **fields)  # type: ignore[call-overload]


# table -> (schéma de création, schéma de modification, rôle minimal requis)
TABLES: dict[str, tuple[type[BaseModel], type[BaseModel], str]] = {
    "projects": (ProjectIn, _partial(ProjectIn), "manage"),
    "expenses": (ExpenseIn, _partial(ExpenseIn), "manage"),
    "phases": (PhaseIn, _partial(PhaseIn), "write"),
    "tasks": (TaskIn, _partial(TaskIn), "write"),
    "reports": (ReportIn, _partial(ReportIn), "write"),
    "controls": (ControlIn, _partial(ControlIn), "write"),
    "incidents": (IncidentIn, _partial(IncidentIn), "write"),
    "team": (TeamIn, _partial(TeamIn), "write"),
}


class OrgIn(Strict):
    nom: str = Field(min_length=2, max_length=120)


class OrgPatch(Strict):
    nom: Optional[str] = Field(default=None, min_length=2, max_length=120)
    devise: Optional[Literal["USD", "CDF", "EUR"]] = None


class InviteIn(Strict):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: Role


class MemberPatch(Strict):
    role: Role


class CheckIn(Strict):
    project_id: UUID
    key: str = Field(min_length=1, max_length=20, pattern=r"^\d+-\d+$")
    value: bool
