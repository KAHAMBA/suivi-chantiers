import { Icon } from "./Icon";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ToastFn = (msg: string, err?: boolean) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; err: boolean } | null>(null);
  const show = useCallback<ToastFn>((msg, err = false) => { setT({ msg, err }); }, []);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 4200); return () => clearTimeout(id); }, [t]);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={"toast" + (t.err ? " err" : "")} role="status">{t.msg}</div>}</ToastCtx.Provider>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><h3>{title}</h3>{children}</div></div>;
}

export type FieldDef = { name: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea" | "tel"; options?: (string | { v: string; l: string })[]; required?: boolean; half?: boolean };

export function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel = "Enregistrer" }: {
  title: string; fields: FieldDef[]; initial: Record<string, any>; onSubmit: (v: Record<string, any>) => Promise<void>; onClose: () => void; submitLabel?: string;
}) {
  const [v, setV] = useState<Record<string, any>>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await onSubmit(v); onClose(); } catch (x: any) { setErr(x.message || "Erreur"); } finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          {fields.map((f) => (
            <div className="field" key={f.name} style={f.half ? { minWidth: 160 } : { flexBasis: "100%" }}>
              <label htmlFor={"f-" + f.name}>{f.label}{f.required ? " *" : ""}</label>
              {f.type === "select" ? (
                <select id={"f-" + f.name} value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}>
                  {f.options!.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea id={"f-" + f.name} rows={3} required={f.required} value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
              ) : (
                <input id={"f-" + f.name} type={f.type ?? "text"} required={f.required} min={f.type === "number" ? 0 : undefined} step={f.type === "number" ? "any" : undefined}
                  value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        {err && <div className="err-text" role="alert">{err}</div>}
        <div className="row end"><button type="button" className="btn ghost" onClick={onClose}>Annuler</button><button className="btn" disabled={busy}>{busy ? "…" : submitLabel}</button></div>
      </form>
    </Modal>
  );
}

export const Pill = ({ kind = "", children }: { kind?: "" | "bad" | "warn" | "grey"; children: ReactNode }) => <span className={"pill " + kind}>{children}</span>;
export const Bar = ({ value, red }: { value: number; red?: boolean }) => <div className={"bar" + (red ? " red" : "")} title={`${Math.round(value)} %`}><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} /></div>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty-mark"><Icon n="building" size={26} /></div><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>;
}
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div aria-busy="true" aria-label="Chargement" className="skel-wrap"><div className="skel" style={{ height: 30, width: "42%" }} />{Array.from({ length: rows }).map((_, i) => <div className="skel" key={i} style={{ height: 64 }} />)}</div>;
}

export function Top({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="top"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="row">{children}</div></div>;
}
