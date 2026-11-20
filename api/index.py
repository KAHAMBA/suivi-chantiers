"""API Suivi Chantiers (FastAPI). Déployée comme fonction Python sur Vercel."""
from __future__ import annotations

import asyncio
import csv
import io
import os
import sys
from datetime import date
from typing import Any, AsyncIterator
from uuid import UUID

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response

from _db import PG, ApiError
from _logic import dashboard, default_budget, make_phases
from _models import (TABLES, CheckIn, InviteIn, MemberPatch, OrgIn, OrgPatch)
from _seed import build_seed

app = FastAPI(title="Suivi Chantiers API", docs_url=None, redoc_url=None, openapi_url=None)

DATA_TABLES = ["projects", "phases", "tasks", "reports", "expenses", "controls", "incidents", "team"]
RANK = {"lecteur": 0, "chef": 1, "conducteur": 2, "admin": 3}
NEED = {"read": 0, "write": 1, "manage": 2, "admin": 3}


@app.exception_handler(ApiError)
async def api_error(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse({"detail": exc.detail}, status_code=exc.status)


class Ctx:
    def __init__(self, pg: PG, user: dict[str, Any]):
        self.pg = pg
        self.user = user
        self.uid: str = user["id"]
        self.email: str = (user.get("email") or "").lower()


async def get_ctx(authorization: str | None = Header(default=None)) -> AsyncIterator[Ctx]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Connexion requise.")
    pg = PG(authorization[7:].strip())
    try:
        yield Ctx(pg, await pg.user())
    finally:
        await pg.aclose()


async def require(ctx: Ctx, org: UUID, level: str) -> str:
    """Vérifie l'appartenance à l'entreprise et le rôle minimal ; renvoie le rôle."""
    rows = await ctx.pg.select("memberships", org_id=f"eq.{org}", user_id=f"eq.{ctx.uid}")
    if not rows:
        raise HTTPException(404, "Entreprise introuvable.")
    role = rows[0]["role"]
    if RANK[role] < NEED[level]:
        raise HTTPException(403, "Action refusée : droits insuffisants.")
    return role


def _today(value: str | None) -> date:
    try:
        return date.fromisoformat(value) if value else date.today()
    except ValueError:
        raise HTTPException(400, "Date invalide.")


async def _all(ctx: Ctx, org: UUID) -> dict[str, list[dict[str, Any]]]:
    results = await asyncio.gather(*[ctx.pg.select(t, org_id=f"eq.{org}", order="created_at.asc", limit="5000") for t in DATA_TABLES])
    return dict(zip(DATA_TABLES, results))


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/session")
async def session(ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    """Rattache l'utilisateur aux invitations reçues puis renvoie son profil et ses entreprises."""
    await ctx.pg.rpc("accept_invitations")
    prof = await ctx.pg.select("profiles", id=f"eq.{ctx.uid}")
    nom = (prof[0].get("nom") if prof else None) or ctx.email
    mem = await ctx.pg.select("memberships", user_id=f"eq.{ctx.uid}")
    orgs = []
    if mem:
        ids = ",".join(m["org_id"] for m in mem)
        found = {o["id"]: o for o in await ctx.pg.select("organizations", id=f"in.({ids})")}
        orgs = [{"id": m["org_id"], "nom": found[m["org_id"]]["nom"], "plan": found[m["org_id"]]["plan"],
                 "devise": found[m["org_id"]]["devise"], "role": m["role"]} for m in mem if m["org_id"] in found]
    return {"user": {"id": ctx.uid, "email": ctx.email, "nom": nom}, "orgs": orgs}


@app.post("/api/orgs", status_code=201)
async def create_org(body: OrgIn, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    org_id = await ctx.pg.rpc("create_organization", {"p_nom": body.nom})
    return {"id": org_id}


@app.patch("/api/orgs/{org}")
async def patch_org(org: UUID, body: OrgPatch, ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    await require(ctx, org, "admin")
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(400, "Rien à modifier.")
    rows = await ctx.pg.update("organizations", patch, id=f"eq.{org}")
    if not rows:
        raise HTTPException(403, "Action refusée : droits insuffisants.")
    return rows[0]


@app.get("/api/orgs/{org}/data")
async def org_data(org: UUID, ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    role = await require(ctx, org, "read")
    data, members, profiles, checks = await asyncio.gather(
        _all(ctx, org),
        ctx.pg.select("memberships", org_id=f"eq.{org}"),
        ctx.pg.select("profiles"),
        ctx.pg.select("checks", org_id=f"eq.{org}", limit="20000"),
    )
    invites = await ctx.pg.select("invitations", org_id=f"eq.{org}") if role == "admin" else []
    names = {p["id"]: p for p in profiles}
    check_map: dict[str, dict[str, bool]] = {}
    for c in checks:
        check_map.setdefault(c["project_id"], {})[c["key"]] = c["value"]
    return {
        **data,
        "checks": check_map,
        "members": [{"user_id": m["user_id"], "role": m["role"],
                     "nom": (names.get(m["user_id"]) or {}).get("nom") or "Membre",
                     "email": (names.get(m["user_id"]) or {}).get("email") or ""} for m in members],
        "invites": [{"id": i["id"], "email": i["email"], "role": i["role"]} for i in invites],
        "names": {k: v.get("nom") or v.get("email") for k, v in names.items()},
        "role": role,
    }


@app.get("/api/orgs/{org}/dashboard")
async def org_dashboard(org: UUID, project_id: UUID | None = None, today: str | None = None,
                        ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    await require(ctx, org, "read")
    return dashboard(await _all(ctx, org), _today(today), str(project_id) if project_id else None)


# ---------- membres et invitations (administrateur) ----------

@app.patch("/api/orgs/{org}/members/{user_id}")
async def set_role(org: UUID, user_id: UUID, body: MemberPatch, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    await require(ctx, org, "admin")
    rows = await ctx.pg.update("memberships", {"role": body.role}, org_id=f"eq.{org}", user_id=f"eq.{user_id}")
    if not rows:
        raise HTTPException(404, "Membre introuvable.")
    return {"status": "ok"}


@app.delete("/api/orgs/{org}/members/{user_id}")
async def remove_member(org: UUID, user_id: UUID, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    await require(ctx, org, "read")
    if str(user_id) != ctx.uid:
        await require(ctx, org, "admin")
    rows = await ctx.pg.delete("memberships", org_id=f"eq.{org}", user_id=f"eq.{user_id}")
    if not rows:
        raise HTTPException(404, "Membre introuvable.")
    return {"status": "ok"}


@app.post("/api/orgs/{org}/invitations", status_code=201)
async def invite(org: UUID, body: InviteIn, ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    await require(ctx, org, "admin")
    rows = await ctx.pg.insert("invitations", {"org_id": str(org), "email": body.email.lower(), "role": body.role})
    return rows[0]


@app.delete("/api/orgs/{org}/invitations/{inv}")
async def revoke(org: UUID, inv: UUID, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    await require(ctx, org, "admin")
    await ctx.pg.delete("invitations", org_id=f"eq.{org}", id=f"eq.{inv}")
    return {"status": "ok"}


# ---------- exemples et export ----------

@app.post("/api/orgs/{org}/demo", status_code=201)
async def load_demo(org: UUID, today: str | None = None, ctx: Ctx = Depends(get_ctx)) -> dict[str, int]:
    await require(ctx, org, "admin")
    seed = build_seed(_today(today))
    oid = str(org)
    inserted = await ctx.pg.insert("projects", [
        {"org_id": oid, "demo": True, **{k: v for k, v in p.items() if k != "key"}} for p in seed["projects"]])
    ids = {p["key"]: row["id"] for p, row in zip(seed["projects"], inserted)}
    count = len(inserted)
    for table in ("phases", "tasks", "reports", "expenses", "controls", "incidents", "team"):
        rows = [{"org_id": oid, "demo": True, "project_id": ids[r["key"]], **{k: v for k, v in r.items() if k != "key"}} for r in seed[table]]
        await ctx.pg.insert(table, rows)
        count += len(rows)
    checks = [{"org_id": oid, "demo": True, "project_id": ids[c["key"]], "key": c["check"], "value": True} for c in seed["checks"]]
    await ctx.pg.insert("checks", checks)
    return {"documents": count + len(checks)}


@app.delete("/api/orgs/{org}/demo")
async def clear_demo(org: UUID, ctx: Ctx = Depends(get_ctx)) -> dict[str, int]:
    await require(ctx, org, "admin")
    rows = await ctx.pg.delete("projects", org_id=f"eq.{org}", demo="eq.true")
    return {"chantiers_supprimes": len(rows)}


@app.get("/api/orgs/{org}/export")
async def export_json(org: UUID, ctx: Ctx = Depends(get_ctx)) -> Response:
    await require(ctx, org, "read")
    data = await _all(ctx, org)
    import json
    return Response(json.dumps(data, ensure_ascii=False, indent=2), media_type="application/json",
                    headers={"Content-Disposition": 'attachment; filename="suivi-chantiers.json"'})


@app.get("/api/orgs/{org}/export/{table}.csv")
async def export_csv(org: UUID, table: str, ctx: Ctx = Depends(get_ctx)) -> Response:
    await require(ctx, org, "read")
    if table not in DATA_TABLES:
        raise HTTPException(404, "Table inconnue.")
    rows = await ctx.pg.select(table, org_id=f"eq.{org}", order="created_at.asc", limit="20000")
    cols = [c for c in (rows[0].keys() if rows else []) if c not in ("org_id", "created_by")]
    out = io.StringIO()
    w = csv.writer(out, delimiter=";")
    w.writerow(cols)
    for r in rows:
        w.writerow([("" if r.get(c) is None else r.get(c)) for c in cols])
    return Response("﻿" + out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{table}.csv"'})


# ---------- cases à cocher du dossier de projet ----------

@app.put("/api/orgs/{org}/checks")
async def set_check(org: UUID, body: CheckIn, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    await require(ctx, org, "write")
    await ctx.pg.insert("checks", {"org_id": str(org), "project_id": str(body.project_id), "key": body.key, "value": body.value},
                        on_conflict="project_id,key")
    return {"status": "ok"}


# ---------- CRUD générique (liste blanche de tables) ----------

def _spec(table: str):
    if table not in TABLES:
        raise HTTPException(404, "Ressource inconnue.")
    return TABLES[table]


@app.post("/api/orgs/{org}/{table}", status_code=201)
async def create(org: UUID, table: str, request: Request, ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    create_model, _, level = _spec(table)
    await require(ctx, org, level)
    try:
        item = create_model.model_validate(await request.json())
    except ValueError as e:
        raise HTTPException(422, _first_error(e))
    row = item.model_dump(mode="json")
    row["org_id"] = str(org)
    if table == "projects":
        row["bud"] = row.get("bud") or default_budget(row["budget"])
        created = (await ctx.pg.insert("projects", row))[0]
        phases = [{"org_id": str(org), "project_id": created["id"], **p} for p in make_phases(item.debut, item.fin)]  # type: ignore[attr-defined]
        await ctx.pg.insert("phases", phases)
        return created
    return (await ctx.pg.insert(table, row))[0]


@app.patch("/api/orgs/{org}/{table}/{rid}")
async def patch(org: UUID, table: str, rid: UUID, request: Request, ctx: Ctx = Depends(get_ctx)) -> dict[str, Any]:
    _, patch_model, level = _spec(table)
    await require(ctx, org, level)
    try:
        item = patch_model.model_validate(await request.json())
    except ValueError as e:
        raise HTTPException(422, _first_error(e))
    row = item.model_dump(mode="json", exclude_unset=True)
    if not row:
        raise HTTPException(400, "Rien à modifier.")
    if table == "projects" and "budget" in row and "bud" not in row:
        row["bud"] = default_budget(row["budget"])
    rows = await ctx.pg.update(table, row, org_id=f"eq.{org}", id=f"eq.{rid}")
    if not rows:
        raise HTTPException(404, "Élément introuvable ou droits insuffisants.")
    return rows[0]


@app.delete("/api/orgs/{org}/{table}/{rid}")
async def remove(org: UUID, table: str, rid: UUID, ctx: Ctx = Depends(get_ctx)) -> dict[str, str]:
    _, _, level = _spec(table)
    await require(ctx, org, level)
    rows = await ctx.pg.delete(table, org_id=f"eq.{org}", id=f"eq.{rid}")
    if not rows:
        raise HTTPException(404, "Élément introuvable ou droits insuffisants.")
    return {"status": "ok"}


def _first_error(e: ValueError) -> str:
    try:
        err = e.errors()[0]  # type: ignore[attr-defined]
        loc = ".".join(str(x) for x in err["loc"] if x != "body")
        return f"Champ « {loc} » invalide : {err['msg']}" if loc else str(err["msg"])
    except Exception:
        return "Données invalides."
