"""Accès à la base Supabase (PostgREST) au nom de l'utilisateur connecté.

Le jeton de l'utilisateur est transmis tel quel : les règles de sécurité (RLS) de la base
s'appliquent donc toujours, en plus des contrôles faits par ce backend.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xlflsllkkeqhkkdkevwz.supabase.co").rstrip("/")
# Clé publique (publishable) : sans danger, les droits viennent du jeton de l'utilisateur.
SUPABASE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_0PbZ_04G0RS8kNmyC5lXvQ_vMq4TY1t")


class ApiError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _translate(r: httpx.Response) -> ApiError:
    try:
        body = r.json()
    except ValueError:
        body = {}
    code = str(body.get("code", ""))
    msg = str(body.get("message") or body.get("msg") or "Erreur de base de données.")
    if r.status_code == 401 or code == "PGRST301":
        return ApiError(401, "Session expirée. Reconnectez-vous.")
    if code == "42501" or r.status_code == 403:
        return ApiError(403, "Action refusée : droits insuffisants.")
    if code == "P0001":  # exception levée volontairement par la base (limites du plan, dernier admin)
        return ApiError(409, msg)
    if code == "23505":
        return ApiError(409, "Cet élément existe déjà.")
    if code in ("23503", "23514", "22P02", "22007", "23502"):
        return ApiError(400, "Données invalides.")
    return ApiError(502 if r.status_code >= 500 else 400, msg)


class PG:
    def __init__(self, token: str, transport: httpx.AsyncBaseTransport | None = None):
        self.token = token
        self.headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}
        self.client = httpx.AsyncClient(base_url=SUPABASE_URL, timeout=20, transport=transport)

    async def aclose(self) -> None:
        await self.client.aclose()

    async def user(self) -> dict[str, Any]:
        r = await self.client.get("/auth/v1/user", headers=self.headers)
        if r.status_code != 200:
            raise ApiError(401, "Session expirée. Reconnectez-vous.")
        return r.json()

    async def select(self, table: str, **params: str) -> list[dict[str, Any]]:
        r = await self.client.get(f"/rest/v1/{table}", headers=self.headers, params={"select": "*", **params})
        if r.status_code >= 400:
            raise _translate(r)
        return r.json()

    async def insert(self, table: str, rows: list[dict[str, Any]] | dict[str, Any], on_conflict: str | None = None) -> list[dict[str, Any]]:
        headers = {**self.headers, "Prefer": "return=representation" + (",resolution=merge-duplicates" if on_conflict else "")}
        params = {"on_conflict": on_conflict} if on_conflict else None
        r = await self.client.post(f"/rest/v1/{table}", headers=headers, params=params, json=rows)
        if r.status_code >= 400:
            raise _translate(r)
        return r.json()

    async def update(self, table: str, patch: dict[str, Any], **filters: str) -> list[dict[str, Any]]:
        r = await self.client.patch(f"/rest/v1/{table}", headers={**self.headers, "Prefer": "return=representation"}, params=filters, json=patch)
        if r.status_code >= 400:
            raise _translate(r)
        return r.json()

    async def delete(self, table: str, **filters: str) -> list[dict[str, Any]]:
        r = await self.client.delete(f"/rest/v1/{table}", headers={**self.headers, "Prefer": "return=representation"}, params=filters)
        if r.status_code >= 400:
            raise _translate(r)
        return r.json()

    async def rpc(self, fn: str, args: dict[str, Any] | None = None) -> Any:
        r = await self.client.post(f"/rest/v1/rpc/{fn}", headers=self.headers, json=args or {})
        if r.status_code >= 400:
            raise _translate(r)
        return r.json() if r.content else None
