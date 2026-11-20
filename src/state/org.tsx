import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { OrgData, OrgInfo, TableName } from "../lib/types";
import { can } from "../lib/util";
import { useToast } from "../components/ui";

interface Ctx {
  org: OrgInfo; data: OrgData | null; reload: () => Promise<void>; refreshSession: () => Promise<void>; userId: string;
  canWrite: boolean; canManage: boolean; isAdmin: boolean; project: string; setProject: (id: string) => void;
  create: (t: TableName, body: Record<string, unknown>) => Promise<any>;
  update: (t: TableName, id: string, body: Record<string, unknown>) => Promise<any>;
  remove: (t: TableName, id: string) => Promise<void>;
  names: (id: string | null | undefined) => string;
  pname: (id: string) => string;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useOrg = () => useContext(C);

export function OrgProvider({ org, userId, refreshSession, children }: { org: OrgInfo; userId: string; refreshSession: () => Promise<void>; children: ReactNode }) {
  const [data, setData] = useState<OrgData | null>(null);
  const [project, setProject] = useState("all");
  const toast = useToast();
  const alive = useRef(true);
  const base = `/orgs/${org.id}`;

  const reload = useCallback(async () => {
    try { const d = await api.get<OrgData>(`${base}/data`); if (alive.current) setData(d); }
    catch (e: any) { if (alive.current && !data) toast(e.message, true); }
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { alive.current = true; setData(null); setProject("all"); reload();
    const poll = setInterval(() => document.visibilityState === "visible" && reload(), 40000);
    const vis = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", vis);
    return () => { alive.current = false; clearInterval(poll); document.removeEventListener("visibilitychange", vis); };
  }, [reload]);

  const wrap = async <T,>(p: Promise<T>): Promise<T> => { try { const r = await p; await reload(); return r; } catch (e: any) { throw e; } };
  const role = data?.role ?? org.role;
  const value: Ctx = {
    org, data, reload, refreshSession, userId, project, setProject,
    canWrite: can(role, "write"), canManage: can(role, "manage"), isAdmin: can(role, "admin"),
    create: (t, b) => wrap(api.post(`${base}/${t}`, b)),
    update: (t, id, b) => wrap(api.patch(`${base}/${t}/${id}`, b)),
    remove: (t, id) => wrap(api.del<void>(`${base}/${t}/${id}`)),
    names: (id) => (id && data?.names[id]) || "—",
    pname: (id) => data?.projects.find((p) => p.id === id)?.nom ?? "—",
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
