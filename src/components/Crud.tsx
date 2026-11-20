import { useState, type ReactNode } from "react";
import { useOrg } from "../state/org";
import type { TableName } from "../lib/types";
import { Icon } from "./Icon";
import { Empty, FormModal, useToast, type FieldDef } from "./ui";

export interface Col<T> { h: string; f: (r: T) => ReactNode; n?: boolean }

export function useCrud<T extends { id: string }>(table: TableName, fields: FieldDef[], defaults: () => Record<string, any>, level: "write" | "manage" = "write", clean?: (v: Record<string, any>) => Record<string, any>) {
  const { create, update, remove, canWrite, canManage } = useOrg();
  const toast = useToast();
  const [edit, setEdit] = useState<{ row?: T } | null>(null);
  const allowed = level === "manage" ? canManage : canWrite;
  const prep = (v: Record<string, any>, editing = false) => {
    const o: Record<string, any> = {};
    for (const f of fields) {
      if (editing && f.name === "project_id") continue;
      let x = v[f.name];
      if (f.type === "number") x = x === "" || x == null ? null : Number(x);
      else if (x === "") x = null;
      o[f.name] = x;
    }
    return clean ? clean(o) : o;
  };
  const modal = edit && (
    <FormModal title={edit.row ? "Modifier" : "Ajouter"} fields={fields} initial={edit.row ? { ...edit.row } : defaults()} onClose={() => setEdit(null)}
      onSubmit={async (v) => { if (edit.row) await update(table, edit.row.id, prep(v, true)); else await create(table, prep(v)); toast("Enregistré."); }} />
  );
  const del = async (r: T) => { if (!window.confirm("Supprimer cet élément ?")) return; try { await remove(table, r.id); toast("Supprimé."); } catch (e: any) { toast(e.message, true); } };
  return { allowed, add: () => setEdit({}), editRow: (r: T) => setEdit({ row: r }), del, modal };
}

export function Table<T extends { id: string }>({ cols, rows, empty, crud }: { cols: Col<T>[]; rows: T[]; empty: string; crud?: { allowed: boolean; editRow: (r: T) => void; del: (r: T) => void } }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <table className="rt"><thead><tr>{cols.map((c) => <th key={c.h} className={c.n ? "n" : ""}>{c.h}</th>)}{crud?.allowed && <th><span className="sr">Actions</span></th>}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}>{cols.map((c) => <td key={c.h} data-label={c.h} className={c.n ? "n" : ""}>{c.f(r)}</td>)}
        {crud?.allowed && <td className="act"><button className="icon-btn" onClick={() => crud.editRow(r)} aria-label="Modifier" title="Modifier"><Icon n="edit" /></button><button className="icon-btn danger" onClick={() => crud.del(r)} aria-label="Supprimer" title="Supprimer"><Icon n="trash" /></button></td>}</tr>)}</tbody></table>
  );
}
