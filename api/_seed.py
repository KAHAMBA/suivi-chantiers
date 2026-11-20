"""Données d'exemple (fictives), datées par rapport à aujourd'hui."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from _logic import default_budget, make_phases


def build_seed(today: date) -> dict[str, Any]:
    def d(n: int) -> str:
        return (today + timedelta(days=n)).isoformat()

    a_start, a_end = today - timedelta(days=120), today + timedelta(days=150)
    b_start, b_end = today - timedelta(days=30), today + timedelta(days=330)
    projects = [
        {"key": "a", "nom": "Résidence Les Palmiers (R+2)", "nature": "Immeuble", "lieu": "Lemba, Kinshasa",
         "moa": "Société Immo Kongo", "moe": "Cabinet Mbuyi & Associés",
         "objectifs": "Livrer 12 appartements dans les délais et le budget.", "budget": 480000,
         "debut": a_start.isoformat(), "fin": a_end.isoformat(), "bud": default_budget(480000)},
        {"key": "b", "nom": "École primaire de Kimbanseke", "nature": "École", "lieu": "Kimbanseke, Kinshasa",
         "moa": "Fondation Espoir", "moe": "Bureau d’études Lukusa",
         "objectifs": "Construire 8 salles de classe et un bloc sanitaire.", "budget": 260000,
         "debut": b_start.isoformat(), "fin": b_end.isoformat(), "bud": default_budget(260000)},
    ]

    phases = []
    for key, start, end, prog in (("a", a_start, a_end, [100, 100, 100, 100, 80, 40, 10]), ("b", b_start, b_end, [100, 70])):
        for i, ph in enumerate(make_phases(start, end)):
            phases.append({"key": key, **ph, "av": prog[i] if i < len(prog) else 0})

    def task(k, titre, n, ass, st, pr, ph):
        return {"key": k, "titre": titre, "date": d(n), "assigne": ass, "statut": st, "prio": pr, "phase": ph}

    tasks = [
        task("a", "Coulage de la dalle du 2e niveau", 0, "Chef de chantier Kalala", "En cours", "haute", "Élévation de la structure"),
        task("a", "Contrôle du ferraillage avant bétonnage", 0, "Ing. Tshimanga", "À faire", "haute", "Élévation de la structure"),
        task("a", "Livraison de 200 sacs de ciment", 0, "Magasinier", "À faire", "normale", "Travaux de maçonnerie"),
        task("a", "Montage des échafaudages façade nord", 1, "Équipe échafaudage", "À faire", "normale", "Réalisation de la toiture"),
        task("a", "Pose des gaines électriques niveau 1", -2, "Électricien Ilunga", "En cours", "normale", "Électricité et plomberie"),
        task("a", "Réception des blocs de maçonnerie", -1, "Conducteur des travaux", "Terminé", "basse", "Travaux de maçonnerie"),
        task("b", "Implantation des semelles bloc B", 0, "Géomètre Mutombo", "En cours", "haute", "Réalisation des fondations"),
        task("b", "Essai de compression des éprouvettes", 2, "Technicien labo", "À faire", "normale", "Réalisation des fondations"),
        task("b", "Compactage de la plateforme", -3, "Équipe terrassement", "Terminé", "normale", "Terrassement"),
    ]
    reports = [
        {"key": "a", "date": d(0), "meteo": "Ensoleillé", "effectif": 28, "travaux": "Ferraillage dalle R+2 terminé à 80 %. Coffrage poutres axe C.", "problemes": "Retard de livraison du fer de 12 mm."},
        {"key": "a", "date": d(-1), "meteo": "Pluie légère", "effectif": 22, "travaux": "Maçonnerie des cloisons niveau 1. Réception des blocs.", "problemes": "Arrêt de 2 h à cause de la pluie."},
        {"key": "b", "date": d(-1), "meteo": "Nuageux", "effectif": 15, "travaux": "Fouilles des semelles bloc B, pose du béton de propreté.", "problemes": ""},
    ]
    exp = [
        ("a", "Frais d’études", "Étude géotechnique et plans", 17000, -125),
        ("a", "Honoraires (architectes, ingénieurs)", "Honoraires phase 1", 24000, -100),
        ("a", "Matériaux", "Ciment, sable, gravier", 92000, -60),
        ("a", "Matériaux", "Acier pour béton armé", 64000, -30),
        ("a", "Main-d’œuvre", "Salaires cumulés", 78000, -7),
        ("a", "Équipements et matériels", "Location bétonnière et échafaudages", 21000, -20),
        ("a", "Transport", "Camions-bennes", 7500, -15),
        ("b", "Frais d’études", "Études et topographie", 9000, -30),
        ("b", "Matériaux", "Ciment et acier fondations", 28000, -8),
        ("b", "Main-d’œuvre", "Salaires", 11000, -3),
    ]
    expenses = [{"key": k, "cat": c, "libelle": l, "montant": m, "date": d(n)} for k, c, l, m, n in exp]
    controls = [
        {"key": "a", "type": "Ferraillage avant bétonnage", "date": d(-5), "resultat": "Conforme", "note": "Dalle R+1 validée par l’ingénieur."},
        {"key": "a", "type": "Contrôle du béton", "date": d(-4), "resultat": "Défaut ouvert", "note": "Slump hors tolérance sur une toupie, béton refusé."},
        {"key": "b", "type": "Vérification des dimensions", "date": d(-2), "resultat": "Défaut corrigé", "note": "Écart de 3 cm sur l’implantation, repris."},
    ]
    incidents = [
        {"key": "a", "date": d(-6), "type": "Non-port des EPI", "gravite": "Mineur", "description": "Deux ouvriers sans casque au niveau 2.", "mesure": "Rappel à l’ordre et causerie sécurité.", "statut": "Clos"},
        {"key": "a", "date": d(-1), "type": "Presque-accident", "gravite": "Modéré", "description": "Chute d’un madrier depuis l’échafaudage.", "mesure": "Balisage de la zone, filet de protection à poser.", "statut": "Ouvert"},
    ]
    team = [
        {"key": "a", "nom": "Kalala Jean", "role": "Chef de chantier", "tel": "+243 81 000 0001"},
        {"key": "a", "nom": "Tshimanga Paul", "role": "Ingénieur en génie civil", "tel": "+243 82 000 0002"},
        {"key": "a", "nom": "Ilunga Marc", "role": "Électricien", "tel": ""},
        {"key": "a", "nom": "Mbuyi Sarah", "role": "Architecte", "tel": ""},
        {"key": "b", "nom": "Mutombo Eric", "role": "Géomètre-topographe", "tel": ""},
        {"key": "b", "nom": "Lukusa Pierre", "role": "Conducteur des travaux", "tel": "+243 99 000 0003"},
    ]
    sizes = {"a": [8, 7, 11, 5, 0], "b": [8, 4, 0, 0, 0]}
    checks = [
        {"key": k, "check": f"{g}-{i}"}
        for k, groups in sizes.items()
        for g, n in enumerate(groups)
        for i in range(n)
    ]
    return {"projects": projects, "phases": phases, "tasks": tasks, "reports": reports, "expenses": expenses,
            "controls": controls, "incidents": incidents, "team": team, "checks": checks}
