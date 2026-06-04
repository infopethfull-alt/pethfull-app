// ─── Supabase Database Layer ───────────────────────────────────────────────
// Replace the two lines below with your actual Supabase URL and anon key
// You get these from: supabase.com → your project → Settings → API

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

const api = (path, opts={}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...opts })
    .then(r => r.json());

// ─── Check if Supabase is configured ──────────────────────────────────────
export const isConfigured = () => !!SUPABASE_URL && !!SUPABASE_KEY;

// ─── Entries ──────────────────────────────────────────────────────────────
export const getEntries = () =>
  api("entries?select=*&order=logged_at.asc");

export const insertEntries = (rows) =>
  api("entries", {
    method: "POST",
    body: JSON.stringify(rows.map(r => ({
      id:          r.id,
      week_idx:    r.weekIdx,
      event_type:  r.eventType,
      event_cat:   r.eventCat,
      pts:         r.pts,
      total_pts:   r.totalPts,
      split_count: r.splitCount,
      target:      r.target,
      source:      r.source,
      staff_id:    r.staffId,
      logged_at:   r.loggedAt,
    })))
  });

export const deleteEntry = (id) =>
  api(`entries?id=eq.${id}`, { method: "DELETE" });

export const deleteAllEntries = () =>
  api(`entries?id=neq.none`, { method: "DELETE" });

// ─── Settings (staff, rules, rate stored as key/value) ────────────────────
export const getSetting = async (key) => {
  const r = await api(`settings?key=eq.${key}&select=value`);
  return r?.[0]?.value ?? null;
};

export const setSetting = (key, value) =>
  api("settings", {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key, value: JSON.stringify(value) }),
  });
