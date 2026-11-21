export type Role = "admin" | "conducteur" | "chef" | "lecteur";
export type Statut = "À faire" | "En cours" | "Terminé";

export interface Project { id: string; nom: string; nature: string | null; lieu: string | null; moa: string | null; moe: string | null; objectifs: string | null; budget: number; debut: string; fin: string; bud: Record<string, number> | null; demo: boolean; created_by: string | null }
export interface Phase { id: string; project_id: string; nom: string; debut: string; fin: string; av: number }
export interface Task { id: string; project_id: string; titre: string; date: string; assigne: string | null; statut: Statut; prio: "haute" | "normale" | "basse"; phase: string | null; created_by: string | null }
export interface Report { id: string; project_id: string; date: string; meteo: string | null; effectif: number | null; travaux: string; problemes: string | null; created_by: string | null }
export interface Expense { id: string; project_id: string; cat: string; libelle: string; montant: number; date: string; created_by: string | null }
export interface Control { id: string; project_id: string; type: string; date: string; resultat: "Conforme" | "Défaut ouvert" | "Défaut corrigé"; note: string | null; created_by: string | null }
export interface Incident { id: string; project_id: string; date: string; type: string; gravite: "Mineur" | "Modéré" | "Grave"; description: string | null; mesure: string | null; statut: "Ouvert" | "Clos"; created_by: string | null }
export interface TeamMember { id: string; project_id: string; nom: string; role: string; tel: string | null }
export interface Member { user_id: string; role: Role; nom: string; email: string }
export interface Invite { id: string; email: string; role: Role }

export interface OrgData {
  projects: Project[]; phases: Phase[]; tasks: Task[]; reports: Report[]; expenses: Expense[];
  controls: Control[]; incidents: Incident[]; team: TeamMember[];
  checks: Record<string, Record<string, boolean>>;
  members: Member[]; invites: Invite[]; names: Record<string, string>; role: Role;
}
export type TableName = "projects" | "phases" | "tasks" | "reports" | "expenses" | "controls" | "incidents" | "team";

export interface OrgInfo { id: string; nom: string; plan: string; devise: string; role: Role }
export interface SessionInfo { user: { id: string; email: string; nom: string }; orgs: OrgInfo[] }

export interface Dashboard {
  kpi: { chantiers: number; en_cours: number; avancement: number; taches_jour: number; taches_jour_faites: number; taches_retard: number; budget_total: number; depense: number; pct_budget: number; incidents_ouverts: number; defauts_ouverts: number };
  projets: { id: string; nom: string; avancement: number; prevu: number; statut: "bad" | "good"; libelle: string; fin: string; budget: number; depense: number; pct_budget: number }[];
  budget_par_poste: { poste: string; prevu: number; depense: number }[];
  repartition: { poste: string; montant: number }[];
  courbe: { debut: string | null; fin: string | null; aujourdhui: string; reel: [string, number][]; prevu: [string, number][]; budget: number };
}
