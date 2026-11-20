import type { Role } from "./types";

export const PHASES = ["Installation du chantier", "Terrassement", "Réalisation des fondations", "Élévation de la structure", "Réalisation de la toiture", "Travaux de maçonnerie", "Électricité et plomberie", "Enduits et revêtements", "Menuiserie", "Peinture et finitions", "Aménagements extérieurs", "Réception des travaux"];
export const CATS = ["Acquisition du terrain", "Frais d’études", "Honoraires (architectes, ingénieurs)", "Matériaux", "Main-d’œuvre", "Équipements et matériels", "Transport", "Frais administratifs", "Dépenses imprévues"];
export const ROLES_METIER = ["Maître d’ouvrage", "Architecte", "Ingénieur en génie civil", "Conducteur des travaux", "Chef de chantier", "Géomètre-topographe", "Technicien de laboratoire", "Maçon", "Ferrailleur", "Coffreur", "Électricien", "Plombier", "Menuisier", "Peintre", "Manœuvre"];
export const CTRL = ["Qualité des matériaux", "Vérification des dimensions", "Ferraillage avant bétonnage", "Contrôle du béton", "Conformité aux plans", "Suivi des travaux"];
export const NATURES = ["Maison", "Immeuble", "École", "Hôpital", "Bureau", "Voirie / route", "Autre"];
export const STAT = ["À faire", "En cours", "Terminé"] as const;
export const METEO = ["Ensoleillé", "Nuageux", "Pluie légère", "Forte pluie", "Chaleur intense"];
export const CHECK = [
  { g: "Étude du terrain", i: ["Localisation du terrain", "Superficie et limites", "Topographie", "Étude géotechnique du sol", "Capacité portante du sol", "Niveau de la nappe phréatique", "Accessibilité du terrain", "Risques naturels et drainage"] },
  { g: "Études techniques", i: ["Étude architecturale", "Étude structurale", "Étude géotechnique", "Étude hydraulique et sanitaire", "Étude électrique", "Ventilation et climatisation", "Sécurité incendie"] },
  { g: "Plans du projet", i: ["Plan de situation", "Plan de masse", "Plan de fondation", "Plan de coffrage", "Plan de ferraillage", "Plan architectural", "Coupes et façades", "Plan d’électricité", "Plomberie et assainissement", "Plan de toiture", "Aménagement extérieur"] },
  { g: "Autorisations administratives", i: ["Titre ou justificatif de propriété", "Permis de construire", "Respect des règles d’urbanisme", "Autorisations particulières", "Documents exigés par les autorités"] },
  { g: "Réception et clôture", i: ["Essais et vérifications techniques", "Réception provisoire", "Liste des réserves établie", "Défauts corrigés", "Remise des clés et documents", "Réception définitive", "Bilan financier final"] },
];
export const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", conducteur: "Conducteur des travaux", chef: "Chef de chantier", lecteur: "Lecteur" };
export const RANK: Record<Role, number> = { lecteur: 0, chef: 1, conducteur: 2, admin: 3 };
export const can = (role: Role, level: "write" | "manage" | "admin") => RANK[role] >= { write: 1, manage: 2, admin: 3 }[level];

export const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const fd = (iso?: string | null) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
export const fdShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
export const money = (n: number, devise = "USD") => { try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise, maximumFractionDigits: 0 }).format(n || 0); } catch { return `${Math.round(n || 0)} ${devise}`; } };
export const num = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
export const pct = (n: number) => `${Math.round(n || 0)} %`;
export const progress = (phases: { av: number }[]) => (phases.length ? Math.round(phases.reduce((s, p) => s + p.av, 0) / phases.length) : 0);
export const isoDays = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
