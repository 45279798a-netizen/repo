/* App shell: routing between tabs, events, sheets. */
import * as store from "./store.js";
import { S } from "./store.js";
import * as V from "./views.js";
import * as ov from "./ovmap.js";
import { autoLocate, setGoogleMap } from "./geo.js";
setGoogleMap(q => store.placeFromName(q));
import { ls, kstNow, getWeather, setDemoTime, getDemoTime, newId, driveEstimate, debounce, toMin, hhmm } from "./util.js";

const app = document.getElementById("app");
const state = {
  tab: "today",
  planDate: ls.get("jeju-plan-date", null),
  map: { filter: "all", selected: null },
  list: { tab: "shared" },
  mem: { date: null }
};
V.initPlans(ls.get("jeju-plan", {}));
V.initDone(ls.get("jeju-done", {}));

/* ---------- routing ---------- */
const TABS = ["today", "plan", "map", "list", "memories"];
function readHash() {
  const h = location.hash.replace("#", "");
  state.tab = TABS.includes(h) ? h : "today";
}
window.addEventListener("hashchange", () => { readHash(); V.setEditMode(false); render(true); });

function pickPlanDate() {
  const today = kstNow().date;
  if (S.days.some(d => d.date === today)) return today;
  if (state.planDate && S.days.some(d => d.date === state.planDate)) return state.planDate;
  return (S.days.find(d => S.stops.some(s => s.day === d.date)) || S.days[0]).date;
}

/* ---------- render ---------- */
let lastTab = null;
function render(scrollTop) {
  if (!S.ready) return;
  const y = window.scrollY;
  let html;
  if (state.tab === "plan") html = V.planView(state.planDate || (state.planDate = pickPlanDate()));
  else if (state.tab === "map") html = V.mapView(state.map);
  else if (state.tab === "list") html = V.listView(state.list);
  else if (state.tab === "memories") html = V.memoriesView(state.mem);
  else html = V.todayView();
  app.innerHTML = html + V.tabbar(state.tab);
  if (scrollTop || lastTab !== state.tab) window.scrollTo(0, 0); else window.scrollTo(0, y);
  lastTab = state.tab;
  afterRender();
}

function afterRender() {
  // weather for the day shown
  const slot = document.getElementById("wx-slot");
  if (slot) {
    const date = slot.dataset.date;
    const day = S.days.find(d => d.date === date);
    getWeather(date, day.weather_point).then(w => {
      const el = document.getElementById("wx-slot");
      if (el && el.dataset.date === date && w) el.innerHTML = V.weatherCard(day, w);
    });
  }
  if (state.tab === "today") {
    const d = S.days.find(x => x.date === kstNow().date);
    if (d) getWeather(d.date, d.weather_point);
  }
  fillPhotos(document);
  if (state.tab === "map") ov.mount(state.map.filter || "all", state.map.selected, id => pickMapStop(id, "pin"));
  else ov.unmount();
  if (pendingJump) { const id = pendingJump; pendingJump = null; setTimeout(() => jump(id), 60); }
}

let pendingJump = null;

// Picking a stop on the map tab updates the card and pins in place, so the map keeps its zoom.
function pickMapStop(id, from) {
  const s = S.stops.find(x => x.id === id);
  if (!s) return;
  state.map.selected = id;
  const old = document.getElementById("map-sheet");
  if (old) old.outerHTML = V.mapSheet(s);
  document.querySelectorAll(".gm-item").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  ov.select(id);
  if (from === "list") document.querySelector(".ovmap-wrap")?.scrollIntoView({ block: "start", behavior: "smooth" });
  else document.getElementById("map-sheet")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function jump(id) {
  const el = document.getElementById("stop-" + id);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}

/* ---------- sheets ---------- */
const sheetWrap = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");
let sheetReturnFocus = null;
function openSheet(html) {
  sheetReturnFocus = document.activeElement;
  sheetBody.innerHTML = html;
  sheetWrap.hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => sheetWrap.classList.add("open"));
  const f = sheetBody.querySelector("input:not([type=file]), select, textarea, button");
  setTimeout(() => (f || sheetBody).focus?.(), 50);
}
function closeSheet() {
  sheetWrap.classList.remove("open");
  document.body.classList.remove("sheet-open");
  setTimeout(() => { sheetWrap.hidden = true; sheetBody.innerHTML = ""; }, 180);
  sheetReturnFocus?.focus?.();
}
document.getElementById("sheet-close").addEventListener("click", closeSheet);
sheetWrap.addEventListener("click", e => { if (e.target === sheetWrap) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheetWrap.hidden) closeSheet(); });

/* ---------- toast ---------- */
const toastEl = document.getElementById("toast");
let toastT;
function toast(msg) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 3200);
}
store.onToast(toast);

/* ---------- actions ---------- */
async function guard(fn) {
  try { await fn(); } catch (e) { toast(e.message || "出了點問題，再試一次"); }
}

// The Naver app didn't open: let the person choose (a tap isn't blocked like an automatic pop-up).
function naverMissing(web) {
  openSheet(`<h2>Naver Map 沒有打開</h2>
    <p>可能還沒安裝 Naver Map App，或手機擋下了。可以先用網頁版導航，或去安裝 App（導航最準）。</p>
    <div class="row-btns" style="display:grid;gap:8px">
      <a class="btn primary wide" href="${web}" target="_blank" rel="noopener">用 Naver 網頁版打開</a>
      <a class="btn wide" href="https://play.google.com/store/apps/details?id=com.nhn.android.nmap" target="_blank" rel="noopener">安裝 Naver Map（Android）</a>
      <a class="btn wide" href="https://apps.apple.com/app/id311867728" target="_blank" rel="noopener">安裝 Naver Map（iPhone）</a></div>`);
}
/* Open the Naver Map app; if nothing happens, fall back to the Naver web map. */
function openNaver(scheme, web) {
  let left = false;
  const mark = () => { if (document.hidden) left = true; };
  document.addEventListener("visibilitychange", mark);
  window.addEventListener("pagehide", mark);
  try { location.href = scheme; } catch {}
  setTimeout(() => {
    document.removeEventListener("visibilitychange", mark);
    window.removeEventListener("pagehide", mark);
    if (!left && !document.hidden) naverMissing(web);
  }, 1600);
}

document.addEventListener("click", e => {
  const nm = e.target.closest("a[data-nmap]");
  if (nm) { e.preventDefault(); openNaver(nm.dataset.nmap, nm.href); return; }
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "FORM") return;
  const a = el.dataset.act;
  const id = el.dataset.id;
  switch (a) {
    case "open-join": openSheet(V.joinSheet()); break;
    case "open-me": openSheet(V.meSheet()); break;
    case "open-info": openSheet(V.infoSheet()); break;
    case "leave": if (confirmLeave(el)) guard(() => store.leave()); break;
    case "day": state.planDate = el.dataset.date; ls.set("jeju-plan-date", state.planDate); render(true); break;
    case "plan": V.setPlan(state.planDate, el.dataset.plan); ls.set("jeju-plan", V.plansState()); render(); break;
    case "check": V.toggleDone(id); ls.set("jeju-done", V.doneState()); render(); break;
    case "jump": jump(id); break;
    case "goto-day": state.planDate = el.dataset.date; break; // link follows to #plan
    case "goto-stop":
      state.planDate = el.dataset.date;
      if (el.dataset.plan) V.setPlan(el.dataset.date, el.dataset.plan);
      pendingJump = id;
      if (state.tab === "plan") { e.preventDefault(); render(); }
      break;
    case "edit-stop": { const s = S.stops.find(x => x.id === id); if (s) { editingStop = s; openSheet(V.stopSheet(s, false)); } break; }
    case "new-stop": {
      const tpl = store.newStopTemplate(el.dataset.date, el.dataset.plan);
      pendingNew = tpl; editingStop = tpl; openSheet(V.stopSheet(tpl, true)); break;
    }
    case "new-stay-stop": {
      // A "back to the hotel" stop filled from the lodging info; the address finds the spot.
      const st = V.stayFor(el.dataset.date);
      if (!st) break;
      const tpl = store.newStopTemplate(el.dataset.date, el.dataset.plan);
      const prev = V.stopsFor(el.dataset.date, el.dataset.plan).filter(x => x.time).at(-1);
      // after the last stop (a drive back already ends at the hotel; otherwise allow ~30 min to get there)
      const t = prev ? toMin(prev.time) + (prev.duration_min ?? 60) + (prev.category === "transport" ? 0 : 30) : 21 * 60;
      Object.assign(tpl, { category: "hotel", name: `回到 ${st.name}`, duration_min: 0,
        time: hhmm(Math.min(Math.ceil(t / 15) * 15, 23 * 60 + 45)),
        tips: [st.note, st.phone ? `電話 ${st.phone}` : ""].filter(Boolean),
        extra: st.address_ko ? { search_q: st.address_ko } : {} });
      pendingNew = tpl; editingStop = tpl;
      openSheet(V.stopSheet(tpl, true));
      autoFill(sheetBody.querySelector("form[data-act=save-stop]"));
      toast("時間是估的，記得改成你們預計回去的時間");
      break;
    }
    case "pick-clear": {
      const f = sheetBody.querySelector("form[data-act=save-stop]");
      if (f && el.dataset.wrong) f.dataset.noauto = "1"; // don't search again for this name
      setPick(null);
      if (el.dataset.wrong) document.getElementById("loc-state").textContent = "已清除。可以改韓文名稱再找，或貼 Google 地圖連結。";
      break;
    }
    case "auto-geo-all": autoGeoAll(el); break;
    case "open-export": openSheet(V.exportSheet(el.dataset.date || state.planDate)); break;
    case "add-opt": {
      const box = document.getElementById("opt-rows");
      box.insertAdjacentHTML("beforeend", V.optEditRow());
      box.lastElementChild.querySelector("input")?.focus();
      break;
    }
    case "del-opt": el.closest(".opt-edit")?.remove(); break;
    case "choose-opt": {
      const s = S.stops.find(x => x.id === id); if (!s) break;
      const o = s.options?.[Number(el.dataset.k)]; if (!o) break;
      const same = s.extra?.chosen === o.name;
      guard(async () => { await store.saveStop({ ...s, extra: { ...(s.extra || {}), chosen: same ? null : o.name } }); toast(same ? "取消選擇" : `決定吃 ${o.name}`); });
      break;
    }
    case "pick-paste": {
      const f = sheetBody.querySelector("form[data-act=save-stop]");
      const typed = f.maplink.value.trim();
      if (typed) { resolveLink(typed); break; }
      if (!navigator.clipboard?.readText) { f.maplink.focus(); linkStatus("把連結貼到上面的框框"); break; }
      navigator.clipboard.readText().then(t => { if (!t.trim()) throw 0; f.maplink.value = t.trim(); resolveLink(t.trim()); })
        .catch(() => { f.maplink.focus(); linkStatus("讀不到剪貼簿，請長按上面的框框選「貼上」"); });
      break;
    }
    case "copy-to-rain": {
      const date = el.dataset.date;
      const sun = V.stopsFor(date, "sun");
      const copies = sun.map(s => ({ ...s, id: newId(), plan: "rain", extra: { ...(s.extra || {}) } }));
      guard(async () => { await store.saveStops(copies); V.setPlan(date, "rain"); ls.set("jeju-plan", V.plansState()); toast("複製好了，改掉要換的站就行"); render(); });
      break;
    }
    case "edit-info": openSheet(V.infoEditSheet()); break;
    case "show-driver": {
      const st = (S.info?.stays || [])[Number(el.dataset.idx)];
      if (st) openSheet(V.driverSheet(st.name, st.address_ko));
      break;
    }
    case "move-stop": guard(async () => { await store.moveStop(id, Number(el.dataset.dir)); closeSheet(); pendingJump = id; render(); }); break;
    case "del-stop":
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.lastChild.textContent = "再按一次刪除"; break; }
      guard(async () => { await store.deleteStop(id); closeSheet(); toast("已刪除"); }); break;
    case "edit-day": { const d = S.days.find(x => x.date === el.dataset.date); openSheet(V.daySheet(d)); fillPhotos(sheetBody); break; }
    case "map-filter": state.map.filter = el.dataset.filter; state.map.selected = null; render(); break;
    case "map-pick": pickMapStop(id, "list"); break;
    case "ov-locate": ov.toggleLocate(); break;
    case "ov-fit": ov.fit(); break;
    case "map-day": e.preventDefault(); state.map.filter = el.dataset.date; state.map.selected = null; location.hash = "map"; break;
    case "list-tab": state.list.tab = el.dataset.tab; render(); break;
    case "claim": guard(() => store.updateCheck(id, { assignee: store.myId() })); break;
    case "unclaim": {
      const c = S.checklist.find(x => x.id === id);
      if (c?.assignee === store.myId()) guard(() => store.updateCheck(id, { assignee: null }));
      else toast("這是別人認領的，請他自己取消");
      break;
    }
    case "del-item":
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.classList.add("armed"); el.setAttribute("aria-label", "再按一次刪除"); setTimeout(() => { el.dataset.confirm = ""; el.classList.remove("armed"); }, 2500); break; }
      guard(() => store.deleteCheck(id)); break;
    case "mem-day": state.mem.date = el.dataset.date; render(); break;
    case "new-mem": openSheet(V.memSheet(el.dataset.date)); break;
    case "del-mem": {
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.classList.add("armed"); el.setAttribute("aria-label", "再按一次刪除"); setTimeout(() => { el.dataset.confirm = ""; el.classList.remove("armed"); }, 2500); break; }
      const m = S.memories.find(x => x.id === id); if (m) guard(() => store.deleteMemory(m)); break;
    }
    case "photo": {
      const img = el.querySelector("img");
      if (img?.src) openSheet(`<img class="full-photo" src="${img.src}" alt="照片">`);
      break;
    }
    case "toggle-edit": V.setEditMode(!V.getEditMode()); render(); break;
    case "demo": setDemoTime("2026-11-28T13:00:00"); toast("預覽 11/28（六）13:00 的樣子"); render(true); break;
    case "demo-off": setDemoTime(null); render(true); break;
  }
});

function linkStatus(msg, ok) {
  const b = document.getElementById("link-status");
  if (b) { b.textContent = msg; b.className = "small " + (ok ? "ok" : msg ? "bad" : ""); }
}
let linkBusy = false;
async function resolveLink(text) {
  if (linkBusy) return;
  linkBusy = true; linkStatus("找位置中…", true);
  try {
    const r = await store.placeFromLink(text);
    const f = sheetBody.querySelector("form[data-act=save-stop]");
    if (!f) return;
    const p = { lat: r.lat, lng: r.lng };
    setPick(p, "link");
    const nm = (r.name || "").trim();
    if (nm && !f.name.value.trim()) f.name.value = nm;
    if (nm && /[\uac00-\ud7a3]/.test(nm) && !f.name_ko.value.trim()) f.name_ko.value = nm;
    linkStatus(`放好了${nm ? `：${nm}` : ""}，地圖已更新。`, true);
    f.maplink.value = "";
  } catch (e) {
    const f = sheetBody.querySelector("form[data-act=save-stop]");
    if (f && e.placeName && !f.name.value.trim()) f.name.value = e.placeName;
    linkStatus(e.message || "抓不到位置");
  } finally { linkBusy = false; }
}
// Pasting a link into the box resolves it right away.
document.addEventListener("input", e => {
  if (e.target.name === "maplink" && /https?:\/\/\S+|\d{2}\.\d{3,}/.test(e.target.value) && e.inputType !== "insertText") resolveLink(e.target.value.trim());
});

let pendingNew = null;
let editingStop = null;
function setPick(p, geo = "", label = "") {
  const f = sheetBody.querySelector("form[data-act=save-stop]");
  if (!f) return;
  f.lat.value = p ? p.lat : ""; f.lng.value = p ? p.lng : "";
  f.geo.value = p ? geo : ""; f.geo_label.value = p ? label : "";
  const st = document.getElementById("loc-state");
  if (st) st.innerHTML = V.locState(p ? p.lat : null, geo, label);
  updatePreview();
}
// Automatic lookup while typing the name (only when there's no exact spot from a link).
let autoRun = 0;
async function autoFill(f) {
  if (!f || f.dataset.noauto === "1") return;
  if (f.lat.value && !["auto", "gmap"].includes(f.geo.value)) return;
  const stop = { name: f.name.value, name_ko: f.name_ko.value, extra: { search_q: editingStop?.extra?.search_q } };
  if (!stop.name.trim() && !stop.name_ko.trim()) return;
  const run = ++autoRun;
  const st = document.getElementById("loc-state");
  if (st) st.textContent = "自動找位置中…";
  let hit = null, offline = false;
  try { hit = await autoLocate(stop); } catch { offline = true; }
  if (run !== autoRun || !f.isConnected) return;
  if (hit) setPick({ lat: hit.lat, lng: hit.lng }, hit.src, hit.label);
  else {
    if (["auto", "gmap"].includes(f.geo.value)) setPick(null);
    if (st) st.textContent = offline ? "現在連不到地圖資料，等一下再試" : "自動找不到這個地方：試試改韓文名稱，或貼 Google 地圖連結";
  }
  return hit;
}
const autoSoon = debounce(() => autoFill(sheetBody.querySelector("form[data-act=save-stop]")), 1300);
document.addEventListener("input", e => {
  const f = e.target.closest("form[data-act=save-stop]");
  if (f && /^(name|name_ko)$/.test(e.target.name)) { delete f.dataset.noauto; autoSoon(); }
});

// Map tab: look up every stop on screen that has no location yet.
async function autoGeoAll(btn) {
  const todo = V.mapVisible(state.map.filter || "all").filter(s => !V.onMap(s));
  if (!todo.length || btn.disabled) return;
  btn.disabled = true;
  let found = 0, k = 0;
  for (const s of todo) {
    btn.textContent = `找第 ${++k}/${todo.length} 站：${s.name}`;
    let hit = null;
    try { hit = await autoLocate(s); } catch { toast("現在連不到地圖資料，等一下再試"); break; }
    if (!hit) continue;
    const cur = S.stops.find(x => x.id === s.id);
    if (!cur || cur.lat != null) continue;
    const stop = { ...cur, lat: hit.lat, lng: hit.lng, extra: { ...(cur.extra || {}), approx: true, geo: hit.src, geo_label: hit.label } };
    try { await store.saveStops(placeAndEstimate(stop, false).map(x => ({ ...x }))); found++; } catch {}
  }
  const left = todo.length - found;
  toast(found ? `找到 ${found} 站${left ? `，${left} 站找不到（貼 Google 連結補）` : ""}` : "都找不到，這些站要貼 Google 地圖連結");
  render();
}
// The preview shows what Google finds: exact spot if set, otherwise the name.
function updatePreview() {
  const f = sheetBody.querySelector("form[data-act=save-stop]");
  const box = document.getElementById("loc-preview");
  if (!f || !box) return;
  const lat = parseFloat(f.lat.value), lng = parseFloat(f.lng.value);
  const q = V.gmapQuery({ name: f.name.value, name_ko: f.name_ko.value, lat: isNaN(lat) ? null : lat, lng: isNaN(lng) ? null : lng });
  const fr = box.querySelector("iframe"), src = V.gmapSrc(q, 15);
  if (fr && fr.src !== src) fr.src = src;
}
const previewSoon = debounce(updatePreview, 900);
document.addEventListener("input", e => { if (e.target.closest("form[data-act=save-stop]") && /^(name|name_ko)$/.test(e.target.name)) previewSoon(); });

/* ---------- long-press a stop to drag it (edit mode) ---------- */
// Touch: hold 0.4s without moving, then drag. Mouse: press and drag on a card.
let lp = null, drag = null, eatClick = false;
const HOLD = 400;
function dragStart(li, y) {
  const tl = li.parentElement;
  tl.classList.add("sorting");
  // Cards collapse while sorting. If the whole day now fits on screen, show all of it so no scrolling is needed;
  // otherwise keep the lifted row under the finger.
  const head = document.querySelector(".days")?.getBoundingClientRect().bottom || 0;
  const room = window.innerHeight - 84 - head;
  const tr = tl.getBoundingClientRect();
  const fits = tr.height <= room;
  if (fits) window.scrollBy(0, tr.top - head - Math.max(0, (room - tr.height) / 2));
  else { const r0 = li.getBoundingClientRect(); window.scrollBy(0, r0.top + r0.height / 2 - y); }
  const r = li.getBoundingClientRect();
  // A floating copy follows the finger; the real row stays in the list as the drop slot.
  const ghost = li.cloneNode(true);
  ghost.classList.add("ghost"); ghost.removeAttribute("id");
  const off = fits ? r.height / 2 : y - r.top;
  Object.assign(ghost.style, { left: r.left + "px", width: r.width + "px", top: (y - off) + "px" });
  tl.appendChild(ghost);
  li.classList.add("slot");
  drag = { li, tl, ghost, y, y0: y, moved: false, fits, off, raf: 0, order: ids(tl) };
  navigator.vibrate?.(15);
  const tick = () => {
    if (!drag) return;
    // Auto-scroll near the edges: faster the deeper you go, and it speeds up the longer you hold there.
    const vh = window.innerHeight, top = (document.querySelector(".days")?.getBoundingClientRect().bottom || 0) + 70, bottom = vh - 84 - 90;
    let depth = 0;
    if (drag.y < top) depth = -(top - drag.y) / 70;
    else if (drag.y > bottom) depth = (drag.y - bottom) / 90;
    if (depth && !drag.fits) {
      drag.held = (drag.held || 0) + 1;
      const boost = Math.min(3, 1 + drag.held / 25);
      const d = Math.sign(depth) * Math.round((18 + Math.min(1, Math.abs(depth)) * 40) * boost);
      window.scrollBy(0, d); follow();
    } else drag.held = 0;
    drag.raf = requestAnimationFrame(tick);
  };
  drag.raf = requestAnimationFrame(tick);
}
const rows = tl => [...tl.querySelectorAll("li[data-sid]:not(.ghost)")];
const ids = tl => rows(tl).map(x => x.dataset.sid);
function follow() {
  const { li, tl, ghost } = drag;
  ghost.style.top = (drag.y - drag.off) + "px";
  if (!drag.moved) { if (Math.abs(drag.y - drag.y0) < 8) return; drag.moved = true; }
  // Drop slot = before the first other row whose middle is below the finger.
  const others = rows(tl).filter(x => x !== li);
  const target = others.find(x => { const r = x.getBoundingClientRect(); return drag.y < r.top + r.height / 2; });
  const want = target ? others.indexOf(target) : others.length;
  if (want === rows(tl).indexOf(li) || !others.length) return;
  tl.insertBefore(li, target || others[others.length - 1].nextSibling);
  navigator.vibrate?.(8);
}
function dragEnd() {
  if (!drag) return;
  cancelAnimationFrame(drag.raf);
  const { li, tl, ghost, order } = drag;
  ghost.remove();
  li.classList.remove("slot");
  tl.classList.remove("sorting");
  const now = ids(tl);
  drag = null;
  eatClick = true; setTimeout(() => { eatClick = false; }, 350);
  const id = li.dataset.sid;
  if (now.join() === order.join()) { render(); jump(id); return; }
  saveOrder(tl.dataset.date, tl.dataset.plan, now, id);
}
function pressStart(e, y) {
  if (!V.getEditMode()) return false;
  const li = e.target.closest("#timeline li[data-sid]");
  if (!li || e.target.closest("input,select,textarea")) return false;
  // The grip starts dragging right away; anywhere else on the card needs a short hold.
  if (e.target.closest(".drag-handle")) { dragStart(li, y); return true; }
  li.classList.add("pressing");
  lp = { li, y0: y, y, t: setTimeout(() => { if (lp) { const l = lp; lp = null; l.li.classList.remove("pressing"); dragStart(l.li, l.y); } }, HOLD) };
  return true;
}
function pressCancel() { if (lp) { clearTimeout(lp.t); lp.li.classList.remove("pressing"); lp = null; } }
document.addEventListener("touchstart", e => { if (e.touches.length === 1) pressStart(e, e.touches[0].clientY); else pressCancel(); }, { passive: true });
document.addEventListener("touchmove", e => {
  const y = e.touches[0].clientY;
  if (drag) { e.preventDefault(); drag.y = y; follow(); return; }
  if (lp && Math.abs(y - lp.y0) > 12) pressCancel(); // finger moved: it's a scroll
  else if (lp) lp.y = y;
}, { passive: false });
document.addEventListener("touchend", e => { pressCancel(); if (drag) { e.preventDefault(); dragEnd(); } });
document.addEventListener("touchcancel", () => { pressCancel(); dragEnd(); });
document.addEventListener("contextmenu", e => { if (V.getEditMode() && e.target.closest("#timeline li[data-sid]")) e.preventDefault(); });
// mouse (desktop)
document.addEventListener("mousedown", e => { if (e.button === 0 && !e.target.closest("button,a")) { if (pressStart(e, e.clientY)) e.preventDefault(); } });
document.addEventListener("mousemove", e => {
  if (drag) { drag.y = e.clientY; follow(); return; }
  if (lp && Math.abs(e.clientY - lp.y0) > 4) { const l = lp; pressCancel(); dragStart(l.li, l.y0); drag.y = e.clientY; follow(); }
});
document.addEventListener("mouseup", () => { pressCancel(); dragEnd(); });
document.addEventListener("click", e => { if (eatClick) { e.stopPropagation(); e.preventDefault(); eatClick = false; } }, true);

function saveOrder(date, plan, order, movedId) {
  const cur = V.stopsFor(date, plan);
  const by = Object.fromEntries(cur.map(s => [s.id, s]));
  const prevLocated = list => { const m = {}; let p = null; list.forEach(id => { const s = by[id]; if (s.lat != null) { m[id] = p; p = id; } }); return m; };
  const oldPrev = prevLocated(cur.map(s => s.id)), newPrev = prevLocated(order);
  const changed = [];
  let prev = null;
  order.forEach((id, k) => {
    const s = { ...by[id] };
    let dirty = false;
    if (s.position !== k * 10) { s.position = k * 10; dirty = true; }
    const here = s.lat != null ? [s.lat, s.lng] : null;
    if (here && prev && (oldPrev[id] !== newPrev[id] || s.extra?.drive_auto || s.drive_min == null)) {
      const est = driveEstimate(prev, here);
      if (s.drive_min !== est) { s.drive_min = est; s.extra = { ...(s.extra || {}), drive_auto: true }; dirty = true; }
    }
    if (here) prev = here;
    if (dirty) changed.push(s);
  });
  guard(async () => { await store.saveStops(changed); toast("順序換好了，時間記得檢查"); render(); jump(movedId); });
}

/* Keep new stops in time order and refresh estimated drive times. */
function placeAndEstimate(stop, isNew) {
  const list = V.stopsFor(stop.day, stop.plan).filter(s => s.id !== stop.id);
  let idx = list.length;
  if (isNew && stop.time) {
    const i = list.findIndex(s => s.time && s.time > stop.time);
    if (i >= 0) idx = i;
  } else if (!isNew) {
    idx = V.stopsFor(stop.day, stop.plan).findIndex(s => s.id === stop.id);
  }
  list.splice(idx, 0, stop);
  const changed = new Set([stop]);
  const force = new Set();
  if (isNew && stop.lat != null) { const nxt = list.slice(idx + 1).find(s => s.lat != null); if (nxt) force.add(nxt.id); }
  list.forEach((s, k) => { if (s.position !== k * 10) { s.position = k * 10; changed.add(s); } });
  let prev = null;
  list.forEach(s => {
    const here = s.lat != null ? [s.lat, s.lng] : null;
    if (here && prev && (s.drive_min == null || s.extra?.drive_auto || force.has(s.id))) {
      const est = driveEstimate(prev, here);
      if (s.drive_min !== est) { s.drive_min = est; s.extra = { ...(s.extra || {}), drive_auto: true }; changed.add(s); }
    }
    if (here) prev = here;
  });
  return [...changed];
}
function confirmLeave(el) {
  if (el.dataset.confirm === "1") return true;
  el.dataset.confirm = "1"; el.textContent = "確定登出？再按一次";
  return false;
}

document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.act === "check-item") guard(() => store.updateCheck(el.dataset.id, { done: el.checked }));
  if (el.id === "new-group" && el.value === "__new") {
    // prompt() is blocked in some viewers, so swap in an inline field
    const input = document.createElement("input");
    input.id = "new-group-name"; input.name = "groupNew"; input.placeholder = "新分類名稱"; input.maxLength = 20;
    input.setAttribute("aria-label", "新分類名稱");
    el.replaceWith(input); input.focus();
  }
});

document.addEventListener("submit", e => {
  const form = e.target.closest("form[data-act]");
  if (!form) return;
  e.preventDefault();
  const a = form.dataset.act;
  const fd = new FormData(form);
  const btn = form.querySelector("button[type=submit]");
  const busy = on => { if (btn) { btn.disabled = on; btn.dataset.label ??= btn.textContent; btn.textContent = on ? "處理中…" : btn.dataset.label; } };

  if (a === "export-pdf") {
    exportPdf({ style: String(fd.get("style") || "plain"), scope: String(fd.get("scope") || "all"), rain: !!fd.get("rain"), opts: !!fd.get("opts"), info: !!fd.get("info"), list: !!fd.get("list") });
    return;
  }
  if (a === "join") {
    busy(true);
    store.join(String(fd.get("name")).trim(), String(fd.get("code"))).then(() => { closeSheet(); toast("加入了，歡迎！"); })
      .catch(err => { sheetBody.innerHTML = V.joinSheet(err.message); const n = sheetBody.querySelector("[name=name]"); n.value = fd.get("name"); sheetBody.querySelector("[name=code]").focus(); });
  }
  if (a === "rename") guard(async () => { await store.rename(String(fd.get("name")).trim()); closeSheet(); toast("改好了"); });
  if (a === "save-stop") {
    const id = form.dataset.id;
    const base = S.stops.find(x => x.id === id) || pendingNew;
    const num = k => { const v = String(fd.get(k) ?? "").trim(); return v === "" ? null : Number(v); };
    const isNew = !S.stops.some(x => x.id === id);
    const isNewStop = () => isNew;
    let lat = num("lat"), lng = num("lng");
    const renamed = String(fd.get("name")).trim() !== (base.name || "") || String(fd.get("name_ko") || "").trim() !== (base.name_ko || "");
    if (lat == null && (isNewStop() || renamed) && fd.get("category") !== "transport" && form.dataset.noauto !== "1" && !form.dataset.looked) {
      // Saved before the typing lookup finished: look it up now (once).
      form.dataset.looked = "1";
      busy(true);
      autoFill(form).finally(() => { busy(false); form.requestSubmit(); });
      return;
    }
    const typedDrive = num("drive_min");
    const extra = { ...(base.extra || {}) };
    if (lat !== base.lat || lng !== base.lng) extra.approx = lat != null;
    extra.geo = lat != null ? String(fd.get("geo") || "") || extra.geo || null : null;
    extra.geo_label = ["auto", "gmap"].includes(extra.geo) ? String(fd.get("geo_label") || "") : null;
    if (typedDrive != null && typedDrive !== base.drive_min) extra.drive_auto = false;
    if (typedDrive == null) extra.drive_auto = true;
    const stop = {
      ...base, time: String(fd.get("time") || ""), category: String(fd.get("category")), name: String(fd.get("name")).trim(),
      name_ko: String(fd.get("name_ko") || "").trim() || null, duration_min: num("duration_min"), drive_min: typedDrive,
      lat, lng, extra,
      tips: String(fd.get("tips") || "").split("\n").map(t => t.trim()).filter(Boolean)
    };
    // Candidate restaurants: keep fields we don't edit (search words, checked flag) from the original.
    const oldOpts = base.options || [];
    const opts = [...form.querySelectorAll(".opt-edit")].map(row => {
      const v = n => (row.querySelector(`[name^="o_${n}_"]`)?.value || "").trim();
      const name = v("name"), ko = v("ko");
      if (!name && !ko) return null;
      const prev = oldOpts[Number(row.dataset.orig)] || {};
      const o = { ...prev, name: name || ko, name_ko: ko || null, hours: v("hours"), note: v("note"),
        closed: [...row.querySelectorAll('[name^="o_closed_"]:checked')].map(x => Number(x.value)) };
      if (prev.name_ko !== o.name_ko || prev.name !== o.name) { delete o.q; if (o.hours !== prev.hours) delete o.verified; }
      return o;
    }).filter(Boolean);
    stop.options = opts.length ? opts : null;
    if (stop.extra.chosen && !opts.some(o => o.name === stop.extra.chosen)) stop.extra.chosen = null;
    if (!stop.name) return;
    busy(true);
    const changed = placeAndEstimate({ ...stop }, isNew).map(s => s.id === stop.id ? s : { ...s });
    guard(async () => { await store.saveStops(changed); pendingNew = null; editingStop = null; closeSheet(); pendingJump = stop.id; render(); });
  }
  if (a === "save-day") {
    const file = fd.get("cover_file");
    let theme = String(fd.get("theme") || "oreum");
    if (theme === "upload" && !(file && file.size)) theme = S.days.find(x => x.date === form.dataset.date)?.theme || "oreum";
    busy(true);
    guard(async () => {
      if (theme === "upload" || (theme.startsWith("photo:") && file && file.size)) theme = "photo:" + await store.uploadCover(file);
      await store.saveDay(form.dataset.date, { title: String(fd.get("title")).trim(), tagline: String(fd.get("tagline")).trim(), theme, rain_note: String(fd.get("rain_note") || "").trim() });
      closeSheet();
    }).finally?.(() => busy(false));
  }
  if (a === "save-info") {
    const g = k => String(fd.get(k) || "").trim();
    const stays = [];
    for (let i = 0; i < Number(form.dataset.stays); i++) {
      const name = g(`stay_name_${i}`);
      if (name) stays.push({ name, check_in: g(`stay_in_${i}`), check_out: g(`stay_out_${i}`), address_ko: g(`stay_addr_${i}`), phone: g(`stay_phone_${i}`), note: g(`stay_note_${i}`) });
    }
    stays.sort((a, b) => (a.check_in || "9").localeCompare(b.check_in || "9"));
    const bookings = [];
    for (let i = 0; i < Number(form.dataset.bookings); i++) {
      const label = g(`b_label_${i}`), code = g(`b_code_${i}`);
      if (label) bookings.push({ label, code });
    }
    const rental = {};
    ["company", "booking", "pickup_time", "pickup_place", "return_time", "return_place", "phone", "note"].forEach(k => { const v = g(`r_${k}`); if (v) rental[k] = v; });
    busy(true);
    guard(async () => { await store.saveTripInfo({ ...(S.info || {}), stays, rental, bookings }); openSheet(V.infoSheet()); toast("存好了"); });
  }
  if (a === "add-item") {
    const name = String(fd.get("name") || "").trim();
    if (!name) { form.querySelector("[name=name]").focus(); return; }
    const group = String(fd.get("groupNew") || fd.get("group") || "其他").trim() || "其他";
    guard(async () => { await store.addCheck({ scope: state.list.tab, name, group_name: group }); });
  }
  if (a === "save-mem") {
    const files = [...(form.querySelector("[name=photos]").files || [])];
    const note = String(fd.get("note") || "").trim();
    const err = form.querySelector(".form-err");
    if (!files.length && !note) { err.hidden = false; err.textContent = "選幾張照片，或寫一句心得"; return; }
    const stop = S.stops.find(s => s.id === fd.get("stop"));
    busy(true);
    store.addMemory({
      day: form.dataset.date, stop, note, files,
      onProgress: (i, n) => { if (btn && n) btn.textContent = i < n ? `上傳照片 ${i + 1} / ${n}…` : "存檔中…"; }
    }).then(() => { closeSheet(); toast("放進回憶了"); state.mem.date = form.dataset.date; render(); })
      .catch(e2 => { busy(false); err.hidden = false; err.textContent = e2.message || "沒存到，再試一次"; });
  }
});

document.addEventListener("keydown", e => {
  const g = e.target.closest?.("[data-act=jump]");
  if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); jump(g.dataset.id); }
});

/* ---------- start ---------- */
readHash();
store.onChange(() => render());
store.init().catch(() => {
  app.innerHTML = `<main class="page"><p class="error">讀不到行程資料（data/itinerary.json）。請用網址開啟這個頁面，不要直接點開檔案。</p></main>`;
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    // Home-screen apps resume without reloading; check for a new version whenever the app comes back.
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
}

/* ---------- export to PDF: print a clean layout, the phone saves it as PDF ---------- */
function exportPdf(o) {
  const root = document.getElementById("print-root");
  root.innerHTML = V.printDoc(o);
  root.className = o.style === "fancy" ? "fancy" : "";
  closeSheet();
  const days = o.scope === "all" ? S.days : S.days.filter(d => d.date === o.scope);
  const old = document.title;
  document.title = `濟州行程${o.scope === "all" ? "" : "_" + o.scope.slice(5).replace("-", "")}`; // becomes the PDF file name
  const done = () => { document.title = old; root.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  // let fonts and cover photos load before the print dialog takes a snapshot
  const loaded = () => Promise.all([...root.querySelectorAll("img")].map(i => i.complete && i.src ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 6000); })));
  Promise.all([document.fonts?.ready, fillPhotos(root).then(loaded)]).then(() => setTimeout(() => {
    try { window.print(); } catch { done(); toast("這裡不能列印：請用 Chrome 或 Safari 打開網址再匯出"); }
  }, 150));
  if (!days.length) toast("沒有可以匯出的行程");
}

// Signed links for private photos (memories and day covers).
function fillPhotos(scope) {
  const imgs = [...scope.querySelectorAll("img[data-photo]")].filter(i => !i.src);
  if (!imgs.length) return Promise.resolve();
  return store.photoUrls([...new Set(imgs.map(i => i.dataset.photo))]).then(map => {
    imgs.forEach(i => { const u = map[i.dataset.photo]; if (u) i.src = u; });
  }).catch(() => {});
}
// Picking a photo for the cover selects that tile and previews it.
document.addEventListener("change", e => {
  if (e.target.name !== "cover_file" || !e.target.files?.[0]) return;
  const tile = e.target.closest(".theme-upload");
  const radio = tile.querySelector("input[type=radio]");
  radio.value = "upload"; radio.checked = true;
  let img = tile.querySelector("img");
  if (!img) { img = document.createElement("img"); img.alt = ""; tile.querySelector(".up-ic")?.replaceWith(img); }
  img.removeAttribute("data-photo");
  img.src = URL.createObjectURL(e.target.files[0]);
  tile.querySelector("span:not(.up-ic)").textContent = "你的照片（儲存後上傳）";
});
