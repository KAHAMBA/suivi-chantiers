import { supabase } from "./supabase";

export class ApiFail extends Error { constructor(public status: number, message: string) { super(message); } }

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiFail(401, "Session expirée, reconnectez-vous.");
  return data.session.access_token;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch { /* ignore */ }
    throw new ApiFail(res.status, msg);
  }
  return (res.headers.get("content-type")?.includes("json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  get: <T,>(p: string) => call<T>("GET", p),
  post: <T,>(p: string, b?: unknown) => call<T>("POST", p, b ?? {}),
  patch: <T,>(p: string, b: unknown) => call<T>("PATCH", p, b),
  put: <T,>(p: string, b: unknown) => call<T>("PUT", p, b),
  del: <T,>(p: string) => call<T>("DELETE", p),
  async download(path: string, filename: string) {
    const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${await token()}` } });
    if (!res.ok) throw new ApiFail(res.status, "Export impossible.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
