from datetime import date

from _logic import dashboard, default_budget, make_phases, planned, progress, schedule

T = date(2026, 11, 20)


def test_default_budget_sums_to_total():
    b = default_budget(480000)
    assert b["Acquisition du terrain"] == 0
    assert abs(sum(b.values()) - 480000) <= 5


def test_make_phases_covers_the_period_in_order():
    ph = make_phases(date(2026, 7, 23), date(2027, 4, 19))
    assert len(ph) == 12
    assert ph[0]["debut"] == "2026-07-23"
    assert all(ph[i]["fin"] < ph[i + 1]["debut"] for i in range(11))
    assert ph[-1]["fin"] <= "2027-04-19"


def test_schedule_labels():
    assert schedule(40, 60) == ("bad", "Retard de 20 pts")
    assert schedule(80, 60) == ("good", "En avance de 20 pts")
    assert schedule(55, 60) == ("good", "Dans les délais")


def test_progress_and_planned():
    assert progress([]) == 0
    assert progress([{"av": 100}, {"av": 50}]) == 75
    assert planned({"debut": "2026-11-10", "fin": "2026-11-30"}, T) == 50
    assert planned({"debut": "2027-01-01", "fin": "2027-02-01"}, T) == 0


def sample():
    p = {"id": "p1", "nom": "A", "budget": 1000, "debut": "2026-10-01", "fin": "2027-01-01", "bud": {"Matériaux": 600, "Transport": 400}}
    return {
        "projects": [p],
        "phases": [{"project_id": "p1", "av": 50}, {"project_id": "p1", "av": 100}],
        "tasks": [
            {"project_id": "p1", "date": "2026-11-20", "statut": "Terminé"},
            {"project_id": "p1", "date": "2026-11-20", "statut": "À faire"},
            {"project_id": "p1", "date": "2026-11-18", "statut": "En cours"},
        ],
        "reports": [],
        "expenses": [
            {"project_id": "p1", "cat": "Matériaux", "montant": 300, "date": "2026-10-15"},
            {"project_id": "p1", "cat": "Matériaux", "montant": 100, "date": "2026-11-01"},
        ],
        "controls": [{"project_id": "p1", "resultat": "Défaut ouvert"}],
        "incidents": [{"project_id": "p1", "statut": "Ouvert"}, {"project_id": "p1", "statut": "Clos"}],
        "team": [],
    }


def test_dashboard_kpis_and_curves():
    r = dashboard(sample(), T)
    k = r["kpi"]
    assert k["chantiers"] == 1 and k["avancement"] == 75
    assert k["taches_jour"] == 2 and k["taches_jour_faites"] == 1 and k["taches_retard"] == 1
    assert k["depense"] == 400 and k["pct_budget"] == 40
    assert k["incidents_ouverts"] == 1 and k["defauts_ouverts"] == 1
    assert r["repartition"] == [{"poste": "Matériaux", "montant": 400.0}]
    assert {x["poste"] for x in r["budget_par_poste"]} == {"Matériaux", "Transport"}
    reel = r["courbe"]["reel"]
    assert reel[0][1] == 0 and reel[-1] == ["2026-11-20", 400.0]
    assert len(r["courbe"]["prevu"]) == 25 and r["courbe"]["prevu"][-1][1] == 1000


def test_dashboard_filters_by_project_and_handles_empty():
    d = sample()
    assert dashboard(d, T, "autre")["kpi"]["chantiers"] == 0
    empty = {k: [] for k in d}
    r = dashboard(empty, T)
    assert r["kpi"]["avancement"] == 0 and r["courbe"]["reel"] == []
