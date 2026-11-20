import { useState, type ReactNode } from "react";
import { useOrg } from "../state/org";
import type { OrgInfo } from "../lib/types";
import { ROLE_LABEL } from "../lib/util";

export const NAV: { id: string; label: string; d: string }[] = [
  { id: "dash", label: "Tableau de bord", d: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { id: "proj", label: "Chantiers", d: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" },
  { id: "task", label: "Tâches du jour", d: "M9 11l3 3 8-8M4 5h5M4 12h3M4 19h16" },
  { id: "rep", label: "Rapports", d: "M6 3h9l4 4v14H6zM9 12h7M9 16h7" },
  { id: "plan", label: "Planning", d: "M4 6h10M8 12h12M4 18h8" },
  { id: "bud", label: "Budget", d: "M12 3v18M17 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7" },
  { id: "qual", label: "Qualité", d: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z M9 12l2 2 4-4" },
  { id: "sec", label: "Sécurité", d: "M12 3l9 17H3zM12 10v4M12 17h.01" },
  { id: "team", label: "Équipe", d: "M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 20v-2a4 4 0 00-3-3.9" },
  { id: "acc", label: "Accès & abonnement", d: "M12 15a3 3 0 100-6 3 3 0 000 6M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.7h4l.4-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2" },
];

export function Shell({ orgs, view, setView, onOrg, user, onLogout, children }: {
  orgs: OrgInfo[]; view: string; setView: (v: string) => void; onOrg: (id: string) => void;
  user: { nom: string; email: string }; onLogout: () => void; children: ReactNode;
}) {
  const { org, data } = useOrg();
  const role = data?.role ?? org.role;
  const [open, setOpen] = useState(false);
  const go = (id: string) => { setView(id); setOpen(false); window.scrollTo({ top: 0 }); };
  return (
    <div className="app">
      <header className="mbar">
        <button className="burger" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(!open)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <img src="/logo.png" alt="NeoGTec" /><span className="mtitle">{NAV.find((n) => n.id === view)?.label}</span>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={"side" + (open ? " open" : "")}>
        <div className="logo"><img src="/logo.png" alt="NeoGTec" /></div>
        <div className="orgname">{org.nom} · plan {org.plan}</div>
        {orgs.length > 1 && <select aria-label="Entreprise" value={org.id} onChange={(e) => onOrg(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}</select>}
        <nav className="nav" aria-label="Navigation principale">
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => go(n.id)} aria-current={view === n.id ? "page" : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.d} /></svg>{n.label}
            </button>
          ))}
        </nav>
        <div className="prof"><b>{user.nom}</b><span>{ROLE_LABEL[role]}</span><br /><button onClick={onLogout}>Se déconnecter</button></div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function ProjectFilter() {
  const { data, project, setProject } = useOrg();
  if (!data || data.projects.length < 2) return null;
  return (
    <select className="input" style={{ width: "auto" }} aria-label="Chantier" value={project} onChange={(e) => setProject(e.target.value)}>
      <option value="all">Tous les chantiers</option>
      {data.projects.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
    </select>
  );
}
export const inProject = <T extends { project_id: string }>(rows: T[], project: string) => (project === "all" ? rows : rows.filter((r) => r.project_id === project));
