/* Small shared helpers: text, time, storage, ids, sun, weather, icons. */

export const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
export const CAT = {
  sight: "景點", nature: "自然", hike: "步道・登山", beach: "海邊", sunset: "夕陽", walk: "散步",
  food: "吃飯", cafe: "咖啡廳", dessert: "甜點・小吃", market: "市場",
  museum: "美術館・博物館", history: "歷史", experience: "體驗", shopping: "購物",
  drive: "兜風", hotel: "住宿", transport: "移動"
};
export const CAT_GROUPS = [
  ["去哪玩", ["sight", "nature", "hike", "beach", "sunset", "walk"]],
  ["吃什麼", ["food", "cafe", "dessert", "market"]],
  ["看展・體驗", ["museum", "history", "experience", "shopping"]],
  ["交通・住宿", ["drive", "hotel", "transport"]]
];
export const FOOD_CATS = ["food", "cafe", "dessert", "market"];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const toMin = t => { if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
export const md = date => date.slice(5).replace("-", "/").replace(/^0/, "");
export const wdNum = date => new Date(date + "T12:00:00+09:00").getUTCDay();
export const weekday = date => WEEK[wdNum(date)];

export const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

/* Korea time. A demo time can be set to preview the trip-day screens. */
let demoIso = null;
export function setDemoTime(iso) { demoIso = iso; }
export function getDemoTime() { return demoIso; }
export function kstNow() {
  const base = demoIso ? Date.parse(demoIso + "+09:00") : Date.now();
  const k = new Date(base + 9 * 3600e3);
  return { date: k.toISOString().slice(0, 10), min: k.getUTCHours() * 60 + k.getUTCMinutes() };
}

/* Stable ids so two phones importing the same plan create the same rows. */
function h32(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995); h ^= h >>> 15; }
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0).toString(16).padStart(8, "0");
}
export function uuidFrom(str) {
  const x = h32(str, 1) + h32(str, 2) + h32(str, 3) + h32(str, 4);
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-a${x.slice(17, 20)}-${x.slice(20, 32)}`;
}
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return uuidFrom(Math.random() + ":" + Date.now());
}

export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* Sunrise / sunset (NOAA sunrise equation), minutes in KST */
export function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180;
  const jd = Date.parse(date + "T12:00:00Z") / 864e5 + 2440587.5;
  const n = Math.ceil(jd - 2451545.0 + 0.0008);
  const Js = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
  const w0 = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec))) / rad;
  const toKst = J => { const d = new Date((J - 2440587.5) * 864e5 + 9 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60; };
  return { rise: toKst(Jt - w0 / 360), set: toKst(Jt + w0 / 360) };
}

/* Weather (Open-Meteo, no key). Cached 3 h per day. */
export function wmo(code) {
  if (code === 0) return ["晴", "sun"];
  if (code <= 2) return ["晴時多雲", "partly"];
  if (code === 3) return ["陰", "cloud"];
  if (code === 45 || code === 48) return ["起霧", "fog"];
  if (code >= 51 && code <= 57) return ["毛毛雨", "rain"];
  if (code >= 61 && code <= 67) return ["下雨", "rain"];
  if (code >= 71 && code <= 77) return ["下雪", "snow"];
  if (code >= 80 && code <= 82) return ["陣雨", "rain"];
  if (code >= 95) return ["雷雨", "rain"];
  return ["多雲", "cloud"];
}
export function cachedWeather(date) { return ls.get(`wx-${date}`, null)?.v || null; }
export async function getWeather(date, pt) {
  const key = `wx-${date}`;
  const cached = ls.get(key, null);
  if (cached && Date.now() - cached.t < 3 * 3600e3) return cached.v;
  const p = pt || { lat: 33.38, lng: 126.53 };
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,apparent_temperature_min` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=16`;
  try {
    const r = await fetch(url); if (!r.ok) throw 0;
    const j = await r.json();
    const i = j.daily.time.indexOf(date);
    if (i < 0) return cached ? cached.v : null;
    const v = {
      code: j.daily.weather_code[i], max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i],
      feel: j.daily.apparent_temperature_min[i], rain: j.daily.precipitation_probability_max[i], wind: j.daily.wind_speed_10m_max[i]
    };
    ls.set(key, { t: Date.now(), v });
    return v;
  } catch { return cached ? cached.v : null; }
}
export function wxAdvice(w, hasPicking) {
  const out = [];
  if (w.wind != null && w.wind >= 8) out.push("風很大：帶防風外套，帽子要綁好");
  if (w.min != null && w.min <= 8) out.push("早晚很冷，洋蔥式穿法");
  else if (w.min != null && w.min <= 12) out.push("早晚涼，帶件薄外套");
  if (w.rain != null && w.rain >= 50) out.push(hasPicking ? "可能下雨：帶傘，摘橘子雨天不開放" : "可能下雨：記得帶傘");
  return out.join("；") || "天氣不錯，適合走步道";
}
export function wxIcon(kind) {
  const sun = '<circle cx="24" cy="24" r="9" fill="#F7B23B"/><g stroke="#F7B23B" stroke-width="3" stroke-linecap="round"><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M11 37l3.5-3.5M33.5 14.5L37 11"/></g>';
  const cloud = (x = 0, y = 0, c = "#C7D0D3") => `<path transform="translate(${x} ${y})" d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="${c}"/>`;
  const map = {
    sun,
    partly: `<g transform="translate(-6 -6) scale(.8)">${sun}</g>${cloud(4, 4, "#D5DDE0")}`,
    cloud: cloud(0, 0, "#B9C3C7"),
    fog: `${cloud(0, -4, "#C7D0D3")}<g stroke="#9AA6AA" stroke-width="3" stroke-linecap="round"><path d="M10 42h28M14 46h20"/></g>`,
    rain: `${cloud(0, -6, "#A9B6BC")}<g stroke="#2F7FA0" stroke-width="3" stroke-linecap="round"><path d="M17 38l-2 6M25 38l-2 6M33 38l-2 6"/></g>`,
    snow: `${cloud(0, -6, "#C7D0D3")}<g fill="#9DB7D6"><circle cx="17" cy="42" r="2.2"/><circle cx="25" cy="44" r="2.2"/><circle cx="33" cy="42" r="2.2"/></g>`
  };
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${map[kind] || map.partly}</svg>`;
}

/* Stroke icons (24px grid) */
const IC = {
  experience: '<circle cx="12" cy="14" r="7"/><path d="M12 7c0-2 1.5-3.5 4-4-0.5 2.5-2 4-4 4z"/>',
  walk: '<path d="M7 20c2-1 2.5-4 4-6s4-2 5-5"/><circle cx="16" cy="5" r="1.6"/><path d="M4 20h16"/>',
  nature: '<path d="M2 19c3-6 6-10 10-10s7 4 10 10z"/><path d="M8 13c1.5 1 2.5 1 4 0s2.5-1 4 0"/>',
  history: '<path d="M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-5 9 5z"/>',
  sunset: '<path d="M3 17h18M6 21h12"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 6v3M4.9 9.5l2 2M19.1 9.5l-2 2"/>',
  food: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M14 3l-3 7M19 4l-5 6"/>',
  beach: '<path d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6-1"/><path d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6-1"/><circle cx="17" cy="7" r="3"/>',
  drive: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/>',
  transport: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/>',
  sight: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  hike: '<path d="M3 20l6-10 4 6 2-3 6 7z"/><path d="M9 10V4l4 1.5L9 7"/>',
  cafe: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>',
  dessert: '<path d="M7 10a5 5 0 0 1 10 0"/><path d="M6 10h12l-6 11z"/>',
  market: '<path d="M3 9l2-5h14l2 5"/><path d="M3 9c0 1.7 1.3 2.5 3 2.5S9 10.7 9 9c0 1.7 1.3 2.5 3 2.5s3-.8 3-2.5c0 1.7 1.3 2.5 3 2.5s3-.8 3-2.5"/><path d="M5 11.5V20h14v-8.5"/>',
  shopping: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  museum: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 16l5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  hotel: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  plane: '<path d="M2 13l8-1 5-8h2l-2 8 5 0 2-2h1l-1 4 1 4h-1l-2-2-5 0 2 8h-2l-5-8-8-1z"/>',
  nav: '<path d="M3 11l18-8-8 18-2-8z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  today: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/>',
  list: '<path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17"/><path d="M11 6h9M11 12h9M11 18h9"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 15l-5-4-8 8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1A3.5 3.5 0 0 0 7 18z"/>',
  sync: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>'
};
export const icon = (k, color = "currentColor", sw = 1.8) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.nature}</svg>`;

/* Shrink a photo before upload: longest side 1600px, JPEG 80%. */
export async function compressImage(file, max = 1600, quality = 0.8) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const w = bmp.width, h = bmp.height, s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, "image/jpeg", quality));
}
