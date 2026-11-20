import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";
import type { SessionInfo } from "./lib/types";
import { AuthScreen, Onboarding } from "./components/Auth";
import { Shell } from "./components/Shell";
import { ToastProvider } from "./components/ui";
import { OrgProvider, useOrg } from "./state/org";
import { Dashboard } from "./views/Dashboard";
import { Projects } from "./views/Projects";
import { Tasks } from "./views/Tasks";
import { Reports } from "./views/Reports";
import { Plan } from "./views/Plan";
import { Budget } from "./views/Budget";
import { Quality } from "./views/Quality";
import { Safety } from "./views/Safety";
import { Team } from "./views/Team";
import { Access } from "./views/Access";

function Views({ view, go }: { view: string; go: (v: string) => void }) {
  const { data } = useOrg();
  if (!data) return <div className="empty">Chargement…</div>;
  switch (view) {
    case "proj": return <Projects />;
    case "task": return <Tasks />;
    case "rep": return <Reports />;
    case "plan": return <Plan />;
    case "bud": return <Budget />;
    case "qual": return <Quality />;
    case "sec": return <Safety />;
    case "team": return <Team />;
    case "acc": return <Access />;
    default: return <Dashboard go={go} />;
  }
}

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(window.location.hash.includes("type=recovery"));
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [fatal, setFatal] = useState("");
  const [orgId, setOrgId] = useState<string>(() => { try { return localStorage.getItem("org") ?? ""; } catch { return ""; } });
  const [view, setView] = useState("dash");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === "PASSWORD_RECOVERY") setRecovery(true); setSession(s); if (!s) setInfo(null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    try { setInfo(await api.post<SessionInfo>("/session")); setFatal(""); }
    catch (e: any) { setFatal(e.message || "Service indisponible."); }
  }, []);
  useEffect(() => { if (session && !recovery) refresh(); }, [session?.user.id, recovery, refresh]); // eslint-disable-line

  const logout = () => supabase.auth.signOut();
  if (session === undefined) return <div className="empty" style={{ paddingTop: 120 }}>Chargement…</div>;
  if (!session || recovery) return <AuthScreen recovery={recovery} />;
  if (fatal) return <div className="empty" style={{ paddingTop: 120 }}><p>{fatal}</p><button className="btn" onClick={refresh}>Réessayer</button> <button className="btn ghost" onClick={logout}>Se déconnecter</button></div>;
  if (!info) return <div className="empty" style={{ paddingTop: 120 }}>Chargement…</div>;
  if (!info.orgs.length) return <Onboarding nom={info.user.nom} onDone={refresh} onLogout={logout} />;
  const org = info.orgs.find((o) => o.id === orgId) ?? info.orgs[0];
  const pick = (id: string) => { setOrgId(id); try { localStorage.setItem("org", id); } catch { /* ignore */ } setView("dash"); };
  return (
    <OrgProvider key={org.id} org={org} userId={info.user.id} refreshSession={refresh}>
      <Shell orgs={info.orgs} view={view} setView={setView} onOrg={pick} user={info.user} onLogout={logout}>
        <Views view={view} go={setView} />
      </Shell>
    </OrgProvider>
  );
}

export default function App() { return <ToastProvider><Root /></ToastProvider>; }
