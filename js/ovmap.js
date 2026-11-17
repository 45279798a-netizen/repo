// Overview map on the 地圖 tab: real street map (OpenStreetMap via Leaflet) with every stop
// numbered and joined in order, plus the phone's own position when the user turns it on.
import { S } from "./store.js";
import * as V from "./views.js";
import { ls, driveEstimate, esc, kstNow, toMin } from "./util.js";

const LEAFLET = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js";
const JEJU = [[33.11, 126.15], [33.57, 126.97]];
let L = null, map = null, layer = null, meLayer = null, markers = {}, watchId = null, me = null;
let filterKey = null, selected = null, onPick = () => {};
const views = {}; // remembered zoom/center per filter, so live updates don't jump the map

const inJeju = p => p && p.lat > 33.0 && p.lat < 33.7 && p.lng > 126.0 && p.lng < 127.1;
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function mount(filter, sel, pick) {
  const el = document.getElementById("ovmap");
  if (!el) { unmount(); return; }
  onPick = pick;
  try { L = L || await import(LEAFLET); } catch {
    el.innerHTML = `<p class="ov-fail">地圖載入失敗，請確認有網路再重新打開這頁。</p>`; return;
  }
  if (!document.getElementById("ovmap")) return; // left the tab while loading
  if (map) { saveView(); map.remove(); }
  map = L.map(el, { zoomControl: false, attributionControl: true, tap: true, maxBounds: [[32.6, 125.6], [34.0, 127.6]], minZoom: 9, zoomSnap: 0.5 });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
  map.attributionControl.setPrefix(false);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  map.createPane("me").style.zIndex = 650; // my position sits above the stop pins
  filterKey = filter; selected = sel;
  map.invalidateSize();
  draw();
  const v = views[filter];
  if (v) map.setView(v.c, v.z, { animate: false }); else fit(false);
  map.on("moveend", saveView);
  if (me) drawMe();
  if (ls.get("jeju-locate", false)) locate(true);
  syncButton();
}
function saveView() { if (map && filterKey) views[filterKey] = { c: map.getCenter(), z: map.getZoom() }; }

function draw() {
  if (layer) layer.remove();
  layer = L.layerGroup().addTo(map);
  markers = {};
  const list = V.mapVisible(filterKey).filter(V.onMap);
  // one line per day (and per plan), in trip order
  const runs = {};
  list.forEach(s => (runs[s.day + s.plan] ||= []).push(s));
  Object.values(runs).forEach(run => {
    if (run.length < 2) return;
    L.polyline(run.map(s => [s.lat, s.lng]), { color: V.mapColor(run[0]), weight: 4, opacity: .75, dashArray: run[0].plan === "rain" ? "6 8" : null }).addTo(layer);
  });
  list.forEach(s => {
    const label = s.plan === "rain" ? "雨" : V.mapOrder(s);
    const icon = L.divIcon({ className: "ovpin-wrap", iconSize: [34, 34], iconAnchor: [17, 17],
      html: `<span class="ovpin${s.id === selected ? " on" : ""}" style="background:${V.mapColor(s)}" title="${esc(s.name)}">${label}</span>` });
    const m = L.marker([s.lat, s.lng], { icon, keyboard: true, title: s.name, riseOnHover: true, zIndexOffset: s.id === selected ? 1000 : 0 }).addTo(layer);
    m.on("click", () => onPick(s.id));
    markers[s.id] = m;
  });
}

export function select(id) {
  selected = id;
  Object.entries(markers).forEach(([k, m]) => {
    m.getElement()?.querySelector(".ovpin")?.classList.toggle("on", k === id);
    m.setZIndexOffset(k === id ? 1000 : 0);
  });
  const s = S.stops.find(x => x.id === id);
  if (map && s && V.onMap(s)) map.panTo([s.lat, s.lng], { animate: true });
  drawMe();
}

export function fit(animate = true) {
  if (!map) return;
  const pts = V.mapVisible(filterKey).filter(V.onMap).map(s => [s.lat, s.lng]);
  if (inJeju(me)) pts.push([me.lat, me.lng]);
  if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 14, animate });
  else if (pts.length === 1) map.setView(pts[0], 13, { animate });
  else map.fitBounds(JEJU, { animate });
}

/* ---------- my position ---------- */
export function toggleLocate() {
  if (watchId != null) { stopLocate(); ls.set("jeju-locate", false); return; }
  ls.set("jeju-locate", true);
  locate(false);
}
function locate(quiet) {
  if (!navigator.geolocation) { status("這支手機的瀏覽器不能定位"); return; }
  if (watchId != null) return;
  if (!quiet) status("定位中…");
  let first = true;
  watchId = navigator.geolocation.watchPosition(pos => {
    me = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
    drawMe();
    if (first && inJeju(me) && map) fit();
    first = false;
  }, err => {
    // Only a refusal stops it; weak signal just waits for the next fix.
    if (err.code === 1) { stopLocate(); ls.set("jeju-locate", false); status("沒有定位權限：到手機設定允許這個 App（或瀏覽器）使用位置"); }
    else if (!me) status("訊號不好，還在找你的位置…");
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  syncButton();
}
function stopLocate() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; me = null;
  if (meLayer) { meLayer.remove(); meLayer = null; }
  status(""); dist("");
  syncButton();
}
function syncButton() {
  const b = document.querySelector("[data-act=ov-locate]");
  if (b) b.setAttribute("aria-pressed", String(watchId != null));
}
function status(t) { const p = document.getElementById("ov-me"); if (p) { p.textContent = t; p.hidden = !t; } }
function dist(t) { const p = document.getElementById("ov-dist"); if (p) { p.innerHTML = t; p.hidden = !t; } }

// Blue dot, a dashed line to the chosen stop (or the next stop today), and the distance.
function drawMe() {
  if (!map || !L || !me) return;
  if (meLayer) meLayer.remove();
  meLayer = L.layerGroup().addTo(map);
  if (!inJeju(me)) {
    status("你現在不在濟州，到了之後這裡會顯示你和各站的距離。");
    dist("");
    return;
  }
  L.circle([me.lat, me.lng], { pane: "me", radius: Math.min(me.acc || 30, 300), color: "#1A73E8", weight: 1, fillOpacity: .12, interactive: false }).addTo(meLayer);
  L.circleMarker([me.lat, me.lng], { pane: "me", radius: 9, color: "#fff", weight: 3, fillColor: "#1A73E8", fillOpacity: 1, interactive: false }).addTo(meLayer);
  const target = S.stops.find(s => s.id === selected && V.onMap(s)) || nextStopToday();
  if (!target) { status("藍點是你現在的位置。"); dist(""); return; }
  L.polyline([[me.lat, me.lng], [target.lat, target.lng]], { pane: "me", color: "#1A73E8", weight: 2, dashArray: "4 6", opacity: .8, interactive: false }).addTo(meLayer);
  const d = km([me.lat, me.lng], [target.lat, target.lng]);
  const text = d < 0.3 ? `你已經在「${esc(target.name)}」附近了` :
    `離「${esc(target.name)}」直線 ${d < 10 ? d.toFixed(1) : Math.round(d)} 公里，開車約 ${driveEstimate([me.lat, me.lng], [target.lat, target.lng])} 分鐘`;
  if (target.id === selected) { status("藍點是你現在的位置。"); dist(text); }
  else { status(text.replace(/&[a-z#0-9]+;/g, "")); dist(""); }
}
// During the trip: the first stop today that hasn't started yet.
function nextStopToday() {
  const { date, min } = kstNow();
  const list = V.stopsFor(date, V.currentPlan?.(date) || "sun").filter(s => V.isPlace(s) && V.onMap(s));
  return list.find(s => (toMin(s.time) ?? 0) >= min - 15) || null;
}

export function unmount() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (map) { saveView(); map.remove(); map = null; }
  layer = meLayer = null; markers = {};
}
