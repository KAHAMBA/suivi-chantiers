import { useState } from "react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

function Brand() {
  return <div className="brand"><h1>Suivi <b>Chantiers</b></h1><p>La plateforme de suivi de vos projets d’infrastructure : chantiers, tâches journalières, rapports, planning, budget, qualité et sécurité — pour toute votre équipe.</p></div>;
}

export function AuthScreen({ recovery }: { recovery: boolean }) {
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">(recovery ? "reset" : "in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [nom, setNom] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setMsg("");
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === "up") {
        if (pw.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { nom }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMsg("Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg("Si ce compte existe, un e-mail de réinitialisation vient d’être envoyé.");
      } else {
        if (pw.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw error;
        setMsg("Mot de passe mis à jour."); window.history.replaceState({}, "", "/"); setTimeout(() => window.location.reload(), 900);
      }
    } catch (x: any) {
      const m: string = x.message || "Erreur";
      setErr(/invalid login/i.test(m) ? "E-mail ou mot de passe incorrect." : /already registered/i.test(m) ? "Cette adresse est déjà utilisée." : /confirm/i.test(m) ? "Adresse e-mail non confirmée : vérifiez votre boîte e-mail." : m);
    } finally { setBusy(false); }
  };

  const title = { in: "Connexion", up: "Créer un compte", forgot: "Mot de passe oublié", reset: "Nouveau mot de passe" }[mode];
  return (
    <div className="auth"><Brand />
      <div className="form"><form onSubmit={submit}>
        <h2>{title}</h2><p style={{ color: "var(--muted)", marginTop: 0 }}>{mode === "up" ? "Créez votre espace entreprise en quelques secondes." : mode === "in" ? "Heureux de vous revoir." : " "}</p>
        {mode === "up" && <div className="field"><label htmlFor="nom">Votre nom</label><input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" /></div>}
        {mode !== "reset" && <div className="field"><label htmlFor="em">Adresse e-mail</label><input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>}
        {mode !== "forgot" && <div className="field"><label htmlFor="pw">Mot de passe</label><input id="pw" type="password" required minLength={mode === "in" ? 1 : 8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>}
        {err && <div className="err-text" role="alert">{err}</div>}{msg && <div style={{ color: "var(--accent)", margin: "6px 0" }} role="status">{msg}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 6 }} disabled={busy}>{busy ? "…" : mode === "in" ? "Se connecter" : mode === "up" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Enregistrer"}</button>
        {mode !== "reset" && <p style={{ fontSize: 14, marginTop: 16 }}>
          {mode === "in" ? <>Pas de compte ? <button type="button" className="link" onClick={() => { setMode("up"); setErr(""); setMsg(""); }}>Créer un compte</button> · <button type="button" className="link" onClick={() => { setMode("forgot"); setErr(""); setMsg(""); }}>Mot de passe oublié</button></>
            : <button type="button" className="link" onClick={() => { setMode("in"); setErr(""); setMsg(""); }}>← Retour à la connexion</button>}
        </p>}
      </form></div>
    </div>
  );
}

export function Onboarding({ nom, onDone, onLogout }: { nom: string; onDone: () => Promise<void>; onLogout: () => void }) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api.post("/orgs", { nom: name }); await onDone(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth"><Brand />
      <div className="form"><form onSubmit={submit}>
        <h2>Bienvenue {nom.split(" ")[0]}</h2>
        <p style={{ color: "var(--muted)" }}>Créez l’espace de votre entreprise. Vous en serez l’administrateur et pourrez inviter votre équipe. Si on vous a invité, demandez à l’administrateur d’utiliser <b>votre adresse e-mail de connexion</b>, puis reconnectez-vous.</p>
        <div className="field"><label htmlFor="org">Nom de l’entreprise</label><input id="org" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
        {err && <div className="err-text" role="alert">{err}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "…" : "Créer mon espace"}</button>
        <p style={{ fontSize: 14 }}><button type="button" className="link" onClick={onLogout}>Se déconnecter</button></p>
      </form></div>
    </div>
  );
}
