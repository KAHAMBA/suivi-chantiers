import httpx
import pytest
from fastapi.testclient import TestClient

import index
from _db import PG

ORG = "11111111-1111-1111-1111-111111111111"
PRJ = "22222222-2222-2222-2222-222222222222"


def make_client(role: str, log: list):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        log.append((request.method, path))
        if path == "/auth/v1/user":
            return httpx.Response(200, json={"id": "u1", "email": "a@b.cd"})
        if path == "/rest/v1/memberships":
            return httpx.Response(200, json=[{"org_id": ORG, "user_id": "u1", "role": role}] if role else [])
        if request.method == "POST" and path == "/rest/v1/projects":
            return httpx.Response(201, json=[{"id": PRJ, "org_id": ORG}])
        if request.method == "POST":
            body = request.read()
            import json
            data = json.loads(body)
            return httpx.Response(201, json=data if isinstance(data, list) else [data])
        return httpx.Response(200, json=[])

    transport = httpx.MockTransport(handler)

    async def fake_ctx():
        pg = PG("tok", transport=transport)
        try:
            yield index.Ctx(pg, await pg.user())
        finally:
            await pg.aclose()

    index.app.dependency_overrides[index.get_ctx] = fake_ctx
    return TestClient(index.app)


@pytest.fixture(autouse=True)
def _clean():
    yield
    index.app.dependency_overrides.clear()


def test_health_and_auth_required():
    c = TestClient(index.app)
    assert c.get("/api/health").json() == {"status": "ok"}
    assert c.get(f"/api/orgs/{ORG}/data").status_code == 401


def test_non_member_gets_404():
    c = make_client("", [])
    assert c.get(f"/api/orgs/{ORG}/dashboard").status_code == 404


def test_reader_cannot_write():
    c = make_client("lecteur", [])
    r = c.post(f"/api/orgs/{ORG}/tasks", json={"project_id": PRJ, "titre": "x", "date": "2026-11-20"})
    assert r.status_code == 403


def test_chef_can_write_tasks_but_not_projects_or_expenses():
    c = make_client("chef", [])
    ok = c.post(f"/api/orgs/{ORG}/tasks", json={"project_id": PRJ, "titre": "Couler la dalle", "date": "2026-11-20"})
    assert ok.status_code == 201 and ok.json()["statut"] == "À faire"
    body = {"nom": "P", "budget": 10, "debut": "2026-01-01", "fin": "2026-02-01"}
    assert c.post(f"/api/orgs/{ORG}/projects", json=body).status_code == 403
    exp = {"project_id": PRJ, "cat": "Matériaux", "libelle": "x", "montant": 5, "date": "2026-11-20"}
    assert c.post(f"/api/orgs/{ORG}/expenses", json=exp).status_code == 403


def test_validation_errors():
    c = make_client("conducteur", [])
    bad_dates = {"nom": "P", "budget": 10, "debut": "2026-03-01", "fin": "2026-02-01"}
    assert c.post(f"/api/orgs/{ORG}/projects", json=bad_dates).status_code == 422
    assert c.post(f"/api/orgs/{ORG}/tasks", json={"project_id": PRJ, "titre": "x", "date": "pas-une-date"}).status_code == 422
    extra = {"project_id": PRJ, "titre": "x", "date": "2026-11-20", "org_id": "autre-entreprise"}
    assert c.post(f"/api/orgs/{ORG}/tasks", json=extra).status_code == 422
    assert c.post(f"/api/orgs/{ORG}/inconnu", json={}).status_code == 404


def test_project_creation_adds_default_budget_and_12_phases():
    log: list = []
    c = make_client("conducteur", log)
    r = c.post(f"/api/orgs/{ORG}/projects", json={"nom": "Pont", "budget": 1000, "debut": "2026-01-01", "fin": "2026-12-31"})
    assert r.status_code == 201
    assert ("POST", "/rest/v1/phases") in log


def test_only_admin_manages_members_and_invitations():
    c = make_client("conducteur", [])
    assert c.post(f"/api/orgs/{ORG}/invitations", json={"email": "x@y.zz", "role": "chef"}).status_code == 403
    assert c.post(f"/api/orgs/{ORG}/demo").status_code == 403
    c2 = make_client("admin", [])
    assert c2.post(f"/api/orgs/{ORG}/invitations", json={"email": "x@y.zz", "role": "chef"}).status_code == 201
    assert c2.post(f"/api/orgs/{ORG}/invitations", json={"email": "pas-un-email", "role": "chef"}).status_code == 422
    assert c2.post(f"/api/orgs/{ORG}/invitations", json={"email": "x@y.zz", "role": "superadmin"}).status_code == 422


def test_dashboard_route_returns_kpis():
    c = make_client("lecteur", [])
    r = c.get(f"/api/orgs/{ORG}/dashboard?today=2026-11-20")
    assert r.status_code == 200 and r.json()["kpi"]["chantiers"] == 0
    assert c.get(f"/api/orgs/{ORG}/dashboard?today=hier").status_code == 400
