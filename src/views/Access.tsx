import { useState } from "react";
import { Icon } from "../components/Icon";
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
      <div className="grid2">
        <section className="card"><h2>Votre accès</h2>
          <dl className="kv"><dt>Utilisateur</dt><dd>{data.members.find((m) => m.user_id === userId)?.nom || "Connecté"}</dd><dt>Entreprise</dt><dd>{org.nom}</dd><dt>Rôle</dt><dd><Pill kind={isAdmin ? "" : "grey"}>{ROLE_LABEL[data.role]}</Pill></dd><dt>Abonnement</dt><dd>Plan {org.plan} ({limit})</dd></dl></section>
        <section className="card"><h2>Données</h2>
          <p className="small muted" style={{ marginTop: 4 }}>Réservé aux administrateurs. Les exemples sont repérés et se suppriment sans toucher à vos vraies données.</p>
          <div className="acts">{isAdmin && <><button className="btn sm" disabled={hasDemo} onClick={() => run(() => api.post(`${base}/demo?today=${todayIso()}`), "Exemples chargés.")}>Charger des exemples</button>
            <button className="btn ghost sm" disabled={!hasDemo} onClick={() => window.confirm("Supprimer tous les chantiers d’exemple ?") && run(() => api.del(`${base}/demo`), "Exemples supprimés.")}>Supprimer les exemples</button></>}
            <button className="btn ghost sm" onClick={() => api.download(`${base}/export`, "suivi-chantiers.json").catch((e) => toast(e.message, true))}><Icon n="download" size={16} /> Exporter (JSON)</button>
            <button className="btn ghost sm" onClick={() => api.download(`${base}/export/expenses.csv`, "depenses.csv").catch((e) => toast(e.message, true))}>Dépenses (CSV)</button>
            <button className="btn ghost sm" onClick={() => api.download(`${base}/export/tasks.csv`, "taches.csv").catch((e) => toast(e.message, true))}>Tâches (CSV)</button></div>
        </section>
      </div>
      <section className="card"><h2>Membres</h2>
        <table className="rt"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th><span className="sr">Actions</span></th></tr></thead><tbody>{data.members.map((m) => (
          <tr key={m.user_id}><td data-label="Nom"><b>{m.nom}</b>{m.user_id === userId && <> <Pill kind="grey">vous</Pill></>}</td><td data-label="E-mail" className="mail">{m.email}</td>
            <td data-label="Rôle">{isAdmin ? <select className="input" style={{ width: "auto" }} value={m.role} aria-label={`Rôle de ${m.nom}`} onChange={(e) => run(() => api.patch(`${base}/members/${m.user_id}`, { role: e.target.value }), "Rôle modifié.")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : ROLE_LABEL[m.role]}</td>
            <td className="act">{(isAdmin || m.user_id === userId) && <button className="btn ghost sm" onClick={async () => { if (window.confirm(m.user_id === userId ? "Quitter cette entreprise ?" : `Retirer ${m.nom} ?`)) run(() => api.del(`${base}/members/${m.user_id}`), "Fait.", m.user_id === userId ? refreshSession : undefined); }}>{m.user_id === userId ? "Quitter" : "Retirer"}</button>}</td></tr>))}</tbody></table></section>
      {isAdmin && <div className="grid2">
        <section className="card"><h2>Inviter un collaborateur</h2>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>L’invité rejoint l’entreprise automatiquement quand il crée son compte (ou se connecte) avec <b>cette adresse e-mail</b>. Aucun e-mail n’est envoyé : prévenez-le vous-même.</p>
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`${base}/invitations`, { email, role }), "Invitation créée.", async () => setEmail("")); }}>
            <input className="input" style={{ maxWidth: 280 }} type="email" required placeholder="adresse@exemple.com" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="input" style={{ width: "auto" }} value={role} aria-label="Rôle" onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            <button className="btn">Inviter</button></form>
          {data.invites.length > 0 && <table className="rt" style={{ marginTop: 14 }}><tbody>{data.invites.map((i) => <tr key={i.id}><td data-label="E-mail" className="mail">{i.email}</td><td data-label="Rôle">{ROLE_LABEL[i.role]}</td><td data-label="Statut"><Pill kind="warn">en attente</Pill></td><td className="act"><button className="btn ghost sm" onClick={() => run(() => api.del(`${base}/invitations/${i.id}`), "Invitation annulée.")}>Annuler</button></td></tr>)}</tbody></table>}</section>
        <section className="card"><h2>Entreprise</h2>
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => api.patch(`${base}`, { nom, devise }), "Enregistré.", refreshSession); }}>
            <input className="input" style={{ maxWidth: 280 }} required maxLength={120} aria-label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            <select className="input" style={{ width: "auto" }} aria-label="Devise" value={devise} onChange={(e) => setDevise(e.target.value)}>{DEVISES.map((d) => <option key={d}>{d}</option>)}</select>
            <button className="btn">Enregistrer</button></form>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>Plan <b>{org.plan}</b> : {limit}. Pour passer au plan Pro (chantiers et membres illimités), contactez-nous : l’activation est manuelle pour l’instant.</p></section>
      </div>}
      <section className="card"><h2>Qui peut faire quoi</h2>
        <table className="rt"><thead><tr><th>Rôle</th><th>Sur le chantier</th><th>Droits</th></tr></thead><tbody>
          <tr><td data-label="Rôle"><b>Administrateur</b></td><td data-label="Sur le chantier">Direction</td><td data-label="Droits">Tout : chantiers, budget, équipe, invitations, abonnement, suppressions, exemples et export.</td></tr>
          <tr><td data-label="Rôle"><b>Conducteur des travaux</b></td><td data-label="Sur le chantier">Conduite et suivi</td><td data-label="Droits">Chantiers, budget et dépenses, et tout ce que fait un chef de chantier. Pas de gestion des membres.</td></tr>
          <tr><td data-label="Rôle"><b>Chef de chantier</b></td><td data-label="Sur le chantier">Ingénieur, équipe terrain</td><td data-label="Droits">Tâches, rapports, planning, qualité, sécurité, équipe, dossier du projet. Pas de création de chantier ni de dépenses.</td></tr>
          <tr><td data-label="Rôle"><b>Lecteur</b></td><td data-label="Sur le chantier">Maître d’ouvrage, client</td><td data-label="Droits">Consultation seule.</td></tr></tbody></table>
        <p className="small muted" style={{ marginTop: 10 }}>Ces droits sont appliqués par le serveur et la base de données, pas seulement affichés.</p></section>
    </>
  );
}
