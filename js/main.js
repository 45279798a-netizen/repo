/* App shell: routing between tabs, events, sheets. */
import * as store from "./store.js";
import { S } from "./store.js";
import * as V from "./views.js";
import { ls, kstNow, getWeather, setDemoTime, getDemoTime, newId } from "./util.js";

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
window.addEventListener("hashchange", () => { readHash(); render(true); });

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
  // photos
  const imgs = [...document.querySelectorAll("img[data-photo]")];
  if (imgs.length) {
    store.photoUrls([...new Set(imgs.map(i => i.dataset.photo))]).then(map => {
      imgs.forEach(i => { const u = map[i.dataset.photo]; if (u) i.src = u; });
    }).catch(() => {});
  }
  if (pendingJump) { const id = pendingJump; pendingJump = null; setTimeout(() => jump(id), 60); }
}

let pendingJump = null;
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

document.addEventListener("click", e => {
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
    case "edit-stop": { const s = S.stops.find(x => x.id === id); if (s) openSheet(V.stopSheet(s, false)); break; }
    case "new-stop": {
      const tpl = store.newStopTemplate(el.dataset.date, el.dataset.plan);
      pendingNew = tpl; openSheet(V.stopSheet(tpl, true)); break;
    }
    case "move-stop": guard(async () => { await store.moveStop(id, Number(el.dataset.dir)); closeSheet(); pendingJump = id; render(); }); break;
    case "del-stop":
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.lastChild.textContent = "再按一次刪除"; break; }
      guard(async () => { await store.deleteStop(id); closeSheet(); toast("已刪除"); }); break;
    case "edit-day": { const d = S.days.find(x => x.date === el.dataset.date); openSheet(V.daySheet(d)); break; }
    case "map-filter": state.map.filter = el.dataset.filter; state.map.selected = null; render(); break;
    case "map-pick": state.map.selected = id; render(); break;
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
    case "demo": setDemoTime("2026-11-28T13:00:00"); toast("預覽 11/28（六）13:00 的樣子"); render(true); break;
    case "demo-off": setDemoTime(null); render(true); break;
  }
});

let pendingNew = null;
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
    const stop = {
      ...base, time: String(fd.get("time") || ""), category: String(fd.get("category")), name: String(fd.get("name")).trim(),
      name_ko: String(fd.get("name_ko") || "").trim() || null, duration_min: num("duration_min"), drive_min: num("drive_min"),
      tips: String(fd.get("tips") || "").split("\n").map(t => t.trim()).filter(Boolean)
    };
    if (!stop.name) return;
    busy(true);
    guard(async () => { await store.saveStop(stop); pendingNew = null; closeSheet(); pendingJump = stop.id; render(); });
  }
  if (a === "save-day") {
    guard(async () => { await store.saveDay(form.dataset.date, { title: String(fd.get("title")).trim(), tagline: String(fd.get("tagline")).trim(), theme: String(fd.get("theme")) }); closeSheet(); });
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

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
