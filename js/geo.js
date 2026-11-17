// Free automatic location lookup from OpenStreetMap data (Nominatim, then Photon).
// Good for sights, beaches, oreums and well-known shops; small shops are often missing.
const BOX = { w: 126.10, s: 33.10, e: 127.00, n: 33.62 };
const inJeju = (lat, lng) => lat > BOX.s && lat < BOX.n && lng > BOX.w && lng < BOX.e;
// Words that are not a place on their own.
const GENERIC = /^(午餐|晚餐|早餐|早午餐|宵夜|吃飯|吃的|咖啡|休息|住宿|飯店|酒店|民宿|回飯店|出發|集合|自由活動|購物|逛街|點心|甜點|lunch|dinner|breakfast|cafe|hotel)$/i;

const norm = t => String(t || "").toLowerCase().replace(/\(.*?\)|（.*?）/g, "").replace(/[\s·・,，.。'’"“”\-_/／+＋&|]/g, "");
function bigrams(t) { const a = new Set(); for (let i = 0; i < t.length - 1; i++) a.add(t.slice(i, i + 2)); return a; }
function similar(a, b) {
  a = norm(a); b = norm(b);
  if (a.length < 2 || b.length < 2) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const A = bigrams(a), B = bigrams(b);
  let n = 0; A.forEach(x => { if (B.has(x)) n++; });
  return (2 * n) / (A.size + B.size) >= 0.55;
}

// Queries to try for a stop, best first.
export function queriesFor(stop) {
  const out = [];
  const add = q => { q = String(q || "").replace(/\s+/g, " ").trim(); if (q.length >= 2 && !GENERIC.test(q) && !out.includes(q)) out.push(q); };
  add(stop.extra?.search_q);
  const ko = stop.name_ko || "";
  add(ko);
  ko.split(/[／/＋+,，]/).forEach(add);
  const zh = String(stop.name || "").replace(/（.*?）|\(.*?\)/g, "").trim();
  add(zh);
  zh.split(/[／/＋+,，]/).forEach(add);
  return out.slice(0, 5);
}

// Nominatim allows one request per second.
let last = 0;
async function slot() {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
}
async function nominatim(q) {
  await slot();
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&namedetails=1&countrycodes=kr&bounded=1" +
    `&viewbox=${BOX.w},${BOX.n},${BOX.e},${BOX.s}&accept-language=ko&q=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("nominatim " + r.status);
  return (await r.json()).map(x => ({
    lat: +x.lat, lng: +x.lon, label: x.namedetails?.["name:ko"] || x.name || x.display_name.split(",")[0],
    names: [x.name, ...Object.values(x.namedetails || {}), x.display_name.split(",")[0]].filter(Boolean),
  }));
}
async function photon(q) {
  const url = `https://photon.komoot.io/api/?limit=6&bbox=${BOX.w},${BOX.s},${BOX.e},${BOX.n}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("photon " + r.status);
  return (await r.json()).features.map(f => ({
    lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label: f.properties.name || "",
    names: [f.properties.name].filter(Boolean),
  }));
}

// Returns { lat, lng, label } or null. Only accepts a hit whose name matches what we searched.
export async function autoLocate(stop) {
  const qs = queriesFor(stop);
  let failed = 0;
  for (const src of [nominatim, photon]) {
    for (const q of qs) {
      let hits;
      try { hits = await src(q); } catch { failed++; continue; }
      const hit = hits.find(h => inJeju(h.lat, h.lng) && h.names.some(n => similar(n, q)));
      if (hit) return { lat: +hit.lat.toFixed(5), lng: +hit.lng.toFixed(5), label: hit.label || q };
    }
  }
  if (failed && failed === qs.length * 2) throw new Error("offline");
  return null;
}
