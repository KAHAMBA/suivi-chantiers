import { useState } from "react";
import { api } from "../lib/api";
import { useOrg } from "../state/org";
import { Pill, Top, useToast } from "../components/ui";
import { ROLE_LABEL, todayIso } from "../lib/util";
import type { Role } from "../lib/types";

const ROLES: Role[] = ["admin", "conducteur", "chef", "lecteur"];
const DEVISES = ["USD", "CDF", "EUR"];

export function Access() {
  const { org, data, userId, isAdmin, reload, refreshSession } = useOrg();
  const toast = useToast();
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("chef");
  const [nom, setNom] = useState(org.nom); const [devise, setDevise] = useState(org.devise);
  if (!data) return null;
  const base = `/orgs/${org.id}`;
  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => Promise<unknown>) => { try { await fn(); await reload(); if (after) await after(); toast(ok); } catch (e: any) { toast(e.message, true); } };
  const hasDemo = data.projects.some((p) => p.demo);
  const limit = org.plan === "gratuit" ? "2 chantiers et 5 membres" : "illimité";
  return (
    <>
      <Top title="Accès & abonnement" sub={`${org.nom} — plan ${org.plan} (${limit})`} />
      <div className="card"><h3>Membres</h3>
        <table><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th /></tr></thead><tbody>{data.members.map((m) => (
          <tr key={m.user_id}><td><b>{m.nom}</b>{m.user_id === userId && <> <Pill kind="grey">vous</Pill></>}</td><td>{m.email}</td>
            <td>{isAdmin ? <select className="input" style={{ width: "auto" }} value={m.role} aria-label={`Rôle de ${m.nom}`} onChange={(e) => run(() => api.patch(`${base}/members/${m.user_id}`, { role: e.target.value }), "Rôle modifié.")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : ROLE_LABEL[m.role]}</td>
            <td>{(isAdmin || m.user_id === userId) && <button className="btn ghost sm" onClick={async () => { if (window.confirm(m.user_id === userId ? "Quitter cette entreprise ?" : `Retirer ${m.nom} ?`)) run(() => api.del(`${base}/members/${m.user_id}`), "Fait.", m.user_id === userId ? refreshSession : undefined); }}>{m.user_id === userId ? "Quitter" : "Retirer"}</button>}</td></tr>))}</tbody></table></div>
      {isAdmin && <>
        <div className="card"><h3>Inviter un collaborateur</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>L’invité rejoint l’entreprise automatiquement quand il crée son compte (ou se connecte) avec <b>cette adresse e-mail</b>. Aucun e-mail n’est envoyé : prévenez-le vous-même.</p>
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`${base}/invitations`, { email, role }), "Invitation créée.", async () => setEmail("")); }}>
            <input className="input" style={{ maxWidth: 280 }} type="email" required placeholder="adresse@exemple.com" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="input" style={{ width: "auto" }} value={role} aria-label="Rôle" onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            <button className="btn">Inviter</button></form>
          {data.invites.length > 0 && <table style={{ marginTop: 14 }}><tbody>{data.invites.map((i) => <tr key={i.id}><td>{i.email}</td><td>{ROLE_LABEL[i.role]}</td><td><Pill kind="warn">en attente</Pill></td><td><button className="btn ghost sm" onClick={() => run(() => api.del(`${base}/invitations/${i.id}`), "Invitation annulée.")}>Annuler</button></td></tr>)}</tbody></table>}</div>
        <div className="card"><h3>Entreprise</h3>
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => api.patch(`${base}`, { nom, devise }), "Enregistré.", refreshSession); }}>
            <input className="input" style={{ maxWidth: 280 }} required maxLength={120} aria-label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            <select className="input" style={{ width: "auto" }} aria-label="Devise" value={devise} onChange={(e) => setDevise(e.target.value)}>{DEVISES.map((d) => <option key={d}>{d}</option>)}</select>
            <button className="btn">Enregistrer</button></form>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>Plan <b>{org.plan}</b> : {limit}. Pour passer au plan Pro (chantiers et membres illimités), contactez-nous : l’activation est manuelle pour l’instant.</p></div>
        <div className="card"><h3>Données d’exemple</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Chargez deux chantiers fictifs pour découvrir la plateforme, puis supprimez-les d’un clic. Seules les données marquées « exemple » sont supprimées.</p>
          <div className="row"><button className="btn" disabled={hasDemo} onClick={() => run(() => api.post(`${base}/demo?today=${todayIso()}`), "Exemples chargés.")}>Charger les exemples</button>
            <button className="btn danger" disabled={!hasDemo} onClick={() => window.confirm("Supprimer tous les chantiers d’exemple ?") && run(() => api.del(`${base}/demo`), "Exemples supprimés.")}>Supprimer les exemples</button></div></div>
      </>}
      <div className="card"><h3>Export</h3><div className="row">
        <button className="btn ghost" onClick={() => api.download(`${base}/export`, "suivi-chantiers.json").catch((e) => toast(e.message, true))}>Tout exporter (JSON)</button>
        <button className="btn ghost" onClick={() => api.download(`${base}/export/expenses.csv`, "depenses.csv").catch((e) => toast(e.message, true))}>Dépenses (CSV)</button>
        <button className="btn ghost" onClick={() => api.download(`${base}/export/tasks.csv`, "taches.csv").catch((e) => toast(e.message, true))}>Tâches (CSV)</button></div></div>
    </>
  );
}
