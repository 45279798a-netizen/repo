/* Data layer: static plan + Supabase sync (join with name and trip code). */
import { SUPABASE_URL, SUPABASE_KEY, TRIP_ID, PHOTO_BUCKET } from "./config.js";
import { ls, uuidFrom, newId, debounce, compressImage } from "./util.js";

const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const S = {
  cfg: null,          // trip-level info from data/itinerary.json (flights, transport...)
  days: [],           // [{date, day, title, tagline, theme, rain_note, weather_point, stay}]
  stops: [],          // flat list [{id, day, plan, position, ...}]
  checklist: [],
  memories: [],
  members: [],
  me: null,           // {id, display_name, color}
  mode: "local",      // local: not joined | synced | offline: joined but no network
  ready: false
};

const subs = new Set();
export function onChange(fn) { subs.add(fn); }
function emit() { subs.forEach(fn => fn()); }
let toastFn = () => {};
export function onToast(fn) { toastFn = fn; }

let sb = null;          // supabase client
let userId = null;

/* ---------- static plan -> rows ---------- */
const EXTRA_KEYS = ["approx", "search_q", "warn", "from_city", "to_city"];
function staticStops(json) {
  const rows = [];
  json.days.forEach(d => {
    const add = (list, plan) => (list || []).forEach((s, i) => {
      const extra = {};
      EXTRA_KEYS.forEach(k => { if (s[k] != null) extra[k] = s[k]; });
      rows.push({
        id: uuidFrom(`${d.date}|${plan}|${i}|${s.name}`), day: d.date, plan, position: i * 10,
        time: s.time || null, name: s.name, name_ko: s.name_ko || null, lat: s.lat ?? null, lng: s.lng ?? null,
        category: s.category || "nature", duration_min: s.duration_min ?? null, drive_min: s.drive_min ?? null,
        tips: s.tips || [], options: s.options || null, extra
      });
    });
    add(d.stops, "sun");
    add(d.rain_plan?.stops, "rain");
  });
  return rows;
}
function staticDays(json) {
  return json.days.map(d => ({
    date: d.date, day: d.day, title: d.title || "", tagline: d.tagline || "", theme: d.theme || "oreum",
    rain_note: d.rain_plan?.note || "", weather_point: d.weather_point || null, stay: d.stay || ""
  }));
}
const DEFAULT_CHECKLIST = [
  ["證件與錢", "護照（每人）"], ["證件與錢", "台灣國際駕照＋台灣駕照正本"], ["證件與錢", "主駕駛名下的信用卡"], ["證件與錢", "一點韓元現金"],
  ["共用裝備", "行動電源"], ["共用裝備", "韓國插頭轉接頭（圓頭兩孔）"], ["共用裝備", "摺疊傘"], ["共用裝備", "車用手機架"],
  ["濟州 11 月要帶", "防風外套"], ["濟州 11 月要帶", "可以綁的帽子"], ["濟州 11 月要帶", "好走的鞋（要爬火山丘）"]
];
function defaultChecklist() {
  return DEFAULT_CHECKLIST.map(([g, n], i) => ({
    id: uuidFrom(`check|${n}`), scope: "shared", owner_id: null, group_name: g, name: n, done: false, assignee: null, position: i * 10
  }));
}

/* ---------- DB row mapping ---------- */
function fromDbStop(r) {
  return {
    id: r.id, day: r.day, plan: r.plan, position: r.position, time: r.time, name: r.name, name_ko: r.name_ko,
    lat: r.lat, lng: r.lng, category: r.category || "nature", duration_min: r.duration_min, drive_min: r.drive_min,
    tips: r.tips || [], options: r.options, extra: r.extra || {}, updated_by: r.updated_by, updated_at: r.updated_at
  };
}
function toDbStop(s) {
  return {
    id: s.id, trip_id: TRIP_ID, day: s.day, plan: s.plan, position: s.position, time: s.time || null, name: s.name,
    name_ko: s.name_ko || null, lat: s.lat ?? null, lng: s.lng ?? null, category: s.category || "nature",
    duration_min: s.duration_min ?? null, drive_min: s.drive_min ?? null, tips: s.tips || [], options: s.options ?? null,
    extra: s.extra || {}
  };
}
function mergeDays(base, rows) {
  const by = Object.fromEntries(rows.map(r => [r.day, r]));
  return base.map(d => {
    const r = by[d.date]; if (!r) return d;
    return {
      ...d, title: r.title ?? d.title, tagline: r.tagline ?? d.tagline, theme: r.theme || d.theme,
      rain_note: r.rain_note ?? d.rain_note,
      weather_point: r.weather_lat != null ? { lat: r.weather_lat, lng: r.weather_lng } : d.weather_point
    };
  });
}

/* ---------- cache ---------- */
function saveCache() {
  ls.set("jeju-cache", { days: S.days, stops: S.stops, checklist: S.checklist, memories: S.memories, members: S.members, me: S.me, t: Date.now() });
}
function loadCache() { return ls.get("jeju-cache", null); }

/* ---------- boot ---------- */
let baseDays = [];
export async function init() {
  const json = await fetch("data/itinerary.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  S.cfg = json.trip;
  baseDays = staticDays(json);
  S.days = baseDays;
  S.stops = staticStops(json);
  S.checklist = ls.get("jeju-local-checklist", null) || defaultChecklist();

  const cache = loadCache();
  const wasMember = ls.get("jeju-member", false);
  if (wasMember && cache) {
    Object.assign(S, cache);
    S.days = cache.days || baseDays;
    S.mode = "offline";
  }
  S.ready = true;
  emit();

  try {
    const mod = await import(SUPABASE_ESM);
    sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "jeju-auth" } });
    const { data } = await sb.auth.getSession();
    userId = data.session?.user?.id || null;
    if (userId) {
      const { data: m, error } = await sb.from("members").select("*").eq("trip_id", TRIP_ID).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (m) { await enterSynced(); return; }
      ls.set("jeju-member", false);
      if (S.mode === "offline") { S.mode = "local"; emit(); }
    }
  } catch (e) {
    // No network or the library could not load: keep showing what we have.
    if (S.mode !== "offline") S.mode = "local";
    emit();
  }
}

export function canSync() { return !!sb; }

/* ---------- join / leave ---------- */
export async function join(name, code) {
  if (!sb) throw new Error("現在連不上資料庫，請確認網路後再試");
  if (!userId) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error(error.message.includes("Anonymous") ? "Supabase 還沒開啟匿名登入（Authentication → Sign In / Providers）" : error.message);
    userId = data.user.id;
  }
  const { error } = await sb.rpc("join_trip", { p_code: code, p_name: name });
  if (error) {
    if (/wrong code/.test(error.message)) throw new Error("通關碼不對，再確認一次");
    if (/function .* does not exist|Could not find the function/.test(error.message)) throw new Error("資料庫還沒設定好，請先跑 setup.sql");
    throw new Error(error.message);
  }
  await enterSynced(true);
}

export async function leave() {
  try { await sb?.auth.signOut(); } catch {}
  ls.del("jeju-cache"); ls.set("jeju-member", false);
  location.reload();
}

export async function rename(name) {
  const { error } = await sb.from("members").update({ display_name: name }).eq("trip_id", TRIP_ID).eq("user_id", userId);
  if (error) throw error;
  await fetchTable("members");
}

async function enterSynced(justJoined) {
  ls.set("jeju-member", true);
  await fetchAll();
  await seedIfEmpty(justJoined);
  S.mode = "synced";
  saveCache(); emit();
  subscribe();
}

/* ---------- fetch ---------- */
async function fetchTable(t) {
  if (t === "members") {
    const { data, error } = await sb.from("members").select("*").eq("trip_id", TRIP_ID).order("joined_at");
    if (error) throw error;
    S.members = data; S.me = data.find(m => m.user_id === userId) || S.me;
  } else if (t === "days") {
    const { data, error } = await sb.from("days").select("*").eq("trip_id", TRIP_ID);
    if (error) throw error;
    S.days = mergeDays(baseDays, data);
  } else if (t === "stops") {
    const { data, error } = await sb.from("stops").select("*").eq("trip_id", TRIP_ID).order("day").order("plan").order("position");
    if (error) throw error;
    S._serverStops = data.length;
    S.stops = data.map(fromDbStop);
  } else if (t === "checklist_items") {
    const { data, error } = await sb.from("checklist_items").select("*").eq("trip_id", TRIP_ID).order("position").order("updated_at");
    if (error) throw error;
    S._serverChecklist = data.length;
    S.checklist = data;
  } else if (t === "memories") {
    const { data, error } = await sb.from("memories").select("*").eq("trip_id", TRIP_ID).order("created_at", { ascending: false });
    if (error) throw error;
    S.memories = data;
  }
}
async function fetchAll() {
  await Promise.all(["members", "days", "stops", "checklist_items", "memories"].map(fetchTable));
}
async function seedIfEmpty() {
  let changed = false;
  if (!S._serverStops) {
    const json = await fetch("data/itinerary.json", { cache: "no-cache" }).then(r => r.json());
    const rows = staticStops(json).map(toDbStop);
    const { error } = await sb.from("stops").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    changed = true;
  }
  if (!S._serverChecklist) {
    const local = ls.get("jeju-local-checklist", null) || defaultChecklist();
    const rows = local.filter(c => c.scope === "shared").map(c => ({
      id: c.id, trip_id: TRIP_ID, scope: "shared", group_name: c.group_name, name: c.name, done: !!c.done, position: c.position
    }));
    const mine = local.filter(c => c.scope === "mine").map(c => ({
      id: c.id, trip_id: TRIP_ID, scope: "mine", group_name: c.group_name, name: c.name, done: !!c.done, position: c.position
    }));
    const { error } = await sb.from("checklist_items").upsert([...rows, ...mine], { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    changed = true;
  }
  if (changed) await Promise.all(["stops", "checklist_items"].map(fetchTable));
}

/* ---------- realtime ---------- */
let channel = null;
const refetchers = {};
function subscribe() {
  if (!sb || channel) return;
  channel = sb.channel(`trip-${TRIP_ID}`);
  ["members", "days", "stops", "checklist_items", "memories"].forEach(t => {
    refetchers[t] = debounce(async () => {
      try { await fetchTable(t); saveCache(); emit(); } catch {}
    }, 400);
    channel.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `trip_id=eq.${TRIP_ID}` }, () => refetchers[t]());
  });
  channel.subscribe();
  window.addEventListener("online", () => fetchAll().then(() => { S.mode = "synced"; saveCache(); emit(); }).catch(() => {}));
}

/* ---------- writes ---------- */
function requireSync() {
  if (S.mode !== "synced") throw new Error(S.mode === "offline" ? "現在沒網路，連上後再改" : "先加入旅行才能編輯");
}
async function run(op, table) {
  try {
    const { error } = await op;
    if (error) throw error;
  } catch (e) {
    toastFn("沒存到：" + (e.message || "請再試一次"));
    try { await fetchTable(table); } catch {}
  }
  saveCache(); emit();
}

export async function saveStop(stop) {
  requireSync();
  const i = S.stops.findIndex(s => s.id === stop.id);
  if (i >= 0) S.stops[i] = { ...S.stops[i], ...stop }; else S.stops.push(stop);
  emit();
  await run(sb.from("stops").upsert(toDbStop(i >= 0 ? S.stops[i] : stop)), "stops");
}
export async function deleteStop(id) {
  requireSync();
  S.stops = S.stops.filter(s => s.id !== id); emit();
  await run(sb.from("stops").delete().eq("id", id), "stops");
}
export async function moveStop(id, dir) {
  requireSync();
  const s = S.stops.find(x => x.id === id); if (!s) return;
  const list = S.stops.filter(x => x.day === s.day && x.plan === s.plan).sort((a, b) => a.position - b.position);
  const i = list.indexOf(s), j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((x, k) => { x.position = k * 10; });
  emit();
  await run(sb.from("stops").upsert(list.map(toDbStop)), "stops");
}
export async function saveDay(date, patch) {
  requireSync();
  const d = S.days.find(x => x.date === date);
  Object.assign(d, patch); emit();
  await run(sb.from("days").upsert({
    trip_id: TRIP_ID, day: date, title: d.title, tagline: d.tagline, theme: d.theme, rain_note: d.rain_note,
    weather_lat: d.weather_point?.lat ?? null, weather_lng: d.weather_point?.lng ?? null
  }), "days");
}
export function newStopTemplate(day, plan) {
  const list = S.stops.filter(x => x.day === day && x.plan === plan);
  const last = list.sort((a, b) => a.position - b.position).at(-1);
  return { id: newId(), day, plan, position: (last?.position ?? -10) + 10, time: "", name: "", name_ko: "", lat: null, lng: null,
    category: "nature", duration_min: 60, drive_min: null, tips: [], options: null, extra: {} };
}

/* checklist works locally before joining */
function saveLocalChecklist() { ls.set("jeju-local-checklist", S.checklist); }
export async function addCheck(item) {
  const row = { id: newId(), scope: item.scope, owner_id: userId, group_name: item.group_name || "其他", name: item.name, done: false, assignee: null,
    position: (Math.max(0, ...S.checklist.map(c => c.position || 0)) + 10) };
  S.checklist.push(row); emit();
  if (S.mode !== "synced") { saveLocalChecklist(); return; }
  await run(sb.from("checklist_items").insert({ id: row.id, trip_id: TRIP_ID, scope: row.scope, group_name: row.group_name, name: row.name, position: row.position }), "checklist_items");
}
export async function updateCheck(id, patch) {
  const c = S.checklist.find(x => x.id === id); if (!c) return;
  Object.assign(c, patch); emit();
  if (S.mode !== "synced") { saveLocalChecklist(); return; }
  await run(sb.from("checklist_items").update(patch).eq("id", id), "checklist_items");
}
export async function deleteCheck(id) {
  S.checklist = S.checklist.filter(x => x.id !== id); emit();
  if (S.mode !== "synced") { saveLocalChecklist(); return; }
  await run(sb.from("checklist_items").delete().eq("id", id), "checklist_items");
}

/* memories */
export async function addMemory({ day, stop, note, files, onProgress }) {
  requireSync();
  const paths = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    const blob = await compressImage(files[i]);
    const path = `${TRIP_ID}/${day}/${newId()}.jpg`;
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error("照片上傳失敗：" + error.message);
    paths.push(path);
  }
  onProgress?.(files.length, files.length);
  const row = { trip_id: TRIP_ID, day, stop_id: stop?.id || null, stop_name: stop?.name || null, note: note || null, photos: paths };
  const { data, error } = await sb.from("memories").insert(row).select().single();
  if (error) throw error;
  S.memories.unshift(data); saveCache(); emit();
}
export async function deleteMemory(m) {
  requireSync();
  S.memories = S.memories.filter(x => x.id !== m.id); emit();
  if (m.photos?.length) await sb.storage.from(PHOTO_BUCKET).remove(m.photos).catch(() => {});
  await run(sb.from("memories").delete().eq("id", m.id), "memories");
}
const urlCache = new Map();
export async function photoUrls(paths) {
  const now = Date.now();
  const need = paths.filter(p => !(urlCache.get(p)?.exp > now + 60e3));
  if (need.length && sb && navigator.onLine !== false) {
    const { data } = await sb.storage.from(PHOTO_BUCKET).createSignedUrls(need, 3600);
    (data || []).forEach(d => { if (d.signedUrl) urlCache.set(d.path, { url: d.signedUrl, exp: now + 3600e3 }); });
  }
  return Object.fromEntries(paths.map(p => [p, urlCache.get(p)?.url || null]));
}

export function myId() { return userId; }
export function memberById(id) { return S.members.find(m => m.user_id === id) || null; }
