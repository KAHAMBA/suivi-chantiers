"""Logique métier pure (sans réseau) : budget, phases, indicateurs du tableau de bord."""
from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any

CATS = [
    "Acquisition du terrain",
    "Frais d’études",
    "Honoraires (architectes, ingénieurs)",
    "Matériaux",
    "Main-d’œuvre",
    "Équipements et matériels",
    "Transport",
    "Frais administratifs",
    "Dépenses imprévues",
]
SPLIT = [0, 0.04, 0.08, 0.38, 0.25, 0.10, 0.04, 0.03, 0.08]
PHASES = [
    "Installation du chantier",
    "Terrassement",
    "Réalisation des fondations",
    "Élévation de la structure",
    "Réalisation de la toiture",
    "Travaux de maçonnerie",
    "Électricité et plomberie",
    "Enduits et revêtements",
    "Menuiserie",
    "Peinture et finitions",
    "Aménagements extérieurs",
    "Réception des travaux",
]


def _round(x: float) -> int:
    return math.floor(x + 0.5)


def _clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def _d(v: Any) -> date:
    return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])


def default_budget(total: float) -> dict[str, int]:
    """Répartition par défaut du budget prévisionnel entre les postes."""
    return {c: _round(total * s) for c, s in zip(CATS, SPLIT)}


def make_phases(debut: date, fin: date) -> list[dict[str, Any]]:
    """Découpe la durée du chantier en 12 phases consécutives de durée égale."""
    total = max(12, (fin - debut).days)
    step = total / 12
    out = []
    for k, nom in enumerate(PHASES):
        start = debut + timedelta(days=_round(k * step))
        end = debut + timedelta(days=_round((k + 1) * step) - 1)
        out.append({"nom": nom, "debut": start.isoformat(), "fin": end.isoformat(), "av": 0})
    return out


def progress(phases: list[dict[str, Any]]) -> int:
    return _round(sum(p["av"] for p in phases) / len(phases)) if phases else 0


def planned(project: dict[str, Any], today: date) -> int:
    debut, fin = _d(project["debut"]), _d(project["fin"])
    total = max(1, (fin - debut).days)
    return _round(_clamp((today - debut).days / total, 0, 1) * 100)


def schedule(av: int, pl: int) -> tuple[str, str]:
    diff = av - pl
    if diff < -10:
        return "bad", f"Retard de {-diff} pts"
    if diff > 10:
        return "good", f"En avance de {diff} pts"
    return "good", "Dans les délais"


def _pct(a: float, b: float) -> int:
    return _round(a / b * 100) if b else 0


def dashboard(data: dict[str, list[dict[str, Any]]], today: date, project_id: str | None = None) -> dict[str, Any]:
    """Indicateurs, répartitions et courbes affichés sur le tableau de bord."""
    projects = [p for p in data["projects"] if project_id in (None, p["id"])]
    ids = {p["id"] for p in projects}
    phases = [f for f in data["phases"] if f["project_id"] in ids]
    tasks = [t for t in data["tasks"] if t["project_id"] in ids]
    expenses = [e for e in data["expenses"] if e["project_id"] in ids]
    controls = [c for c in data["controls"] if c["project_id"] in ids]
    incidents = [i for i in data["incidents"] if i["project_id"] in ids]

    iso = today.isoformat()
    spent_by: dict[str, float] = {}
    for e in expenses:
        spent_by[e["project_id"]] = spent_by.get(e["project_id"], 0) + float(e["montant"])

    rows = []
    for p in projects:
        av = progress([f for f in phases if f["project_id"] == p["id"]])
        pl = planned(p, today)
        statut, libelle = schedule(av, pl)
        dep = spent_by.get(p["id"], 0)
        rows.append({
            "id": p["id"], "nom": p["nom"], "avancement": av, "prevu": pl,
            "statut": statut, "libelle": libelle, "fin": str(p["fin"]),
            "budget": float(p["budget"]), "depense": dep, "pct_budget": _pct(dep, float(p["budget"])),
        })

    tb = sum(r["budget"] for r in rows)
    ts = sum(r["depense"] for r in rows)
    today_tasks = [t for t in tasks if str(t["date"]) == iso]

    kpi = {
        "chantiers": len(rows),
        "en_cours": sum(1 for r in rows if r["avancement"] < 100),
        "avancement": _round(sum(r["avancement"] for r in rows) / len(rows)) if rows else 0,
        "taches_jour": len(today_tasks),
        "taches_jour_faites": sum(1 for t in today_tasks if t["statut"] == "Terminé"),
        "taches_retard": sum(1 for t in tasks if t["statut"] != "Terminé" and str(t["date"]) < iso),
        "budget_total": tb,
        "depense": ts,
        "pct_budget": _pct(ts, tb),
        "incidents_ouverts": sum(1 for i in incidents if i["statut"] == "Ouvert"),
        "defauts_ouverts": sum(1 for c in controls if c["resultat"] == "Défaut ouvert"),
    }

    par_poste = []
    for cat in CATS:
        prevu = sum(float((p.get("bud") or {}).get(cat, 0)) for p in projects)
        dep = sum(float(e["montant"]) for e in expenses if e["cat"] == cat)
        if prevu or dep:
            par_poste.append({"poste": cat, "prevu": prevu, "depense": dep})
    repartition = [{"poste": r["poste"], "montant": r["depense"]} for r in par_poste if r["depense"] > 0]

    return {
        "kpi": kpi,
        "projets": rows,
        "budget_par_poste": par_poste,
        "repartition": repartition,
        "courbe": _curve(projects, expenses, today),
    }


def _curve(projects: list[dict], expenses: list[dict], today: date) -> dict[str, Any]:
    if not projects:
        return {"debut": iso_or_none(today), "fin": iso_or_none(today), "aujourdhui": today.isoformat(), "reel": [], "prevu": [], "budget": 0}
    x0 = min(_d(p["debut"]) for p in projects)
    x1 = max(max(_d(p["fin"]) for p in projects), today)
    cum = 0.0
    reel: list[list[Any]] = [[x0.isoformat(), 0.0]]
    for e in sorted(expenses, key=lambda e: str(e["date"])):
        cum += float(e["montant"])
        reel.append([max(x0, _d(e["date"])).isoformat(), cum])
    reel.append([_clamp_date(today, x0, x1).isoformat(), cum])

    span = (x1 - x0).days
    prevu = []
    for i in range(25):
        d = x0 + timedelta(days=_round(span * i / 24))
        val = 0.0
        for p in projects:
            dur = max(1, (_d(p["fin"]) - _d(p["debut"])).days)
            val += float(p["budget"]) * _clamp((d - _d(p["debut"])).days / dur, 0, 1)
        prevu.append([d.isoformat(), val])
    return {
        "debut": x0.isoformat(), "fin": x1.isoformat(), "aujourdhui": today.isoformat(),
        "reel": reel, "prevu": prevu, "budget": sum(float(p["budget"]) for p in projects),
    }


def iso_or_none(d: date) -> str:
    return d.isoformat()


def _clamp_date(d: date, a: date, b: date) -> date:
    return max(a, min(b, d))
