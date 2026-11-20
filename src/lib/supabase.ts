import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "https://xlflsllkkeqhkkdkevwz.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_0PbZ_04G0RS8kNmyC5lXvQ_vMq4TY1t";
export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
