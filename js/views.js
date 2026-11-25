/* Render functions. Each returns HTML for one tab or sheet. */
import { S, memberById, myId } from "./store.js";
import { ART, artSvg } from "./art.js";
import {
  esc, toMin, hhmm, md, weekday, wdNum, kstNow, sunTimes, wmo, wxIcon, wxAdvice, cachedWeather,
  icon, CAT, CAT_GROUPS, FOOD_CATS, getDemoTime, WEEK
} from "./util.js";

export const DAY_COLORS = ["#B4547E", "#4E8A5B", "#C25F0C", "#2F64A8", "#6B8A2E", "#8A5A2E"];
export const RAIN_COLOR = "#6B6F8A";
const THEMES = { dawn: "清晨抵達", oreum: "火山丘", south: "南部海岸", west: "西部夕陽", ilchul: "城山日出", halla: "漢拏山初雪", eoksae: "秋天芒草", emerald: "翡翠海灘", tangerine: "橘子園", rainy: "下雨天", harbor: "夜晚港口", camellia: "山茶花", waterfall: "瀑布", greentea: "綠茶園", olle: "偶來小路", haenyeo: "海女", market: "夜市", bbq: "黑豬肉烤肉", cafe: "海景咖啡" };
const isPhoto = t => typeof t === "string" && t.startsWith("photo:");
// Day cover: one of the drawings, or the trip's own photo.
export function coverArt(theme, vb = "0 0 400 230", prefix = "") {
  if (isPhoto(theme)) return `<img class="art cover-photo" data-photo="${esc(theme.slice(6))}" alt="">`;
  return `<svg class="art" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${prefix ? artSvg(theme, prefix) : (ART[theme] || ART.oreum)()}</svg>`;
}

/* ---------- shared bits ---------- */
export const isPlace = s => s.category !== "transport";
export const dayIndex = date => S.days.findIndex(d => d.date === date);
export const dayColor = date => DAY_COLORS[Math.max(0, dayIndex(date)) % DAY_COLORS.length];
export function stopsFor(date, plan) {
  return S.stops.filter(s => s.day === date && s.plan === plan).sort((a, b) => a.position - b.position);
}
export const hasRain = date => S.stops.some(s => s.day === date && s.plan === "rain");
let editMode = false;
export function setEditMode(v) { editMode = v; }
export function getEditMode() { return editMode; }
const editable = () => S.mode === "synced" && editMode;

function avatar(m, size = 28) {
  const col = m?.color || "#8A9396";
  const name = m?.display_name || "?";
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:color-mix(in srgb, ${col} 18%, white);color:color-mix(in srgb, ${col} 75%, black);font-size:${Math.round(size * 0.42)}px" title="${esc(name)}">${esc(name.slice(-1))}</span>`;
}

export function topbar(title, sub, canEdit) {
  const chip = S.mode === "synced"
    ? `<span class="sync ok">${icon("sync")}已同步</span>`
    : S.mode === "offline" ? `<span class="sync off">${icon("cloud")}離線中</span>` : `<button class="sync join" type="button" data-act="open-join">加入旅行</button>`;
  const me = S.me ? `<button class="me-btn" type="button" data-act="open-me" aria-label="我的設定">${avatar(S.me, 36)}</button>` :
    `<button class="me-btn icon-only" type="button" data-act="open-info" aria-label="旅行資訊">${icon("info")}</button>`;
  const edit = canEdit ? `<button class="edit-toggle${editMode ? " on" : ""}" type="button" data-act="toggle-edit" aria-pressed="${editMode}">${editMode ? "完成" : `${icon("edit")}編輯`}</button>` : "";
  return `<header class="topbar">
    <div class="tb-title"><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>
    <div class="tb-right">${edit}${edit ? "" : chip}${me}</div>
  </header>`;
}

export function tabbar(active) {
  const tabs = [["today", "今天", "today"], ["plan", "行程", "route"], ["map", "地圖", "map"], ["list", "清單", "list"], ["memories", "回憶", "photo"]];
  return `<nav class="tabbar" aria-label="主要分頁">${tabs.map(([id, label, ic]) =>
    `<a href="#${id}" class="tab${active === id ? " on" : ""}"${active === id ? ' aria-current="page"' : ""}>${icon(ic, "currentColor", 1.9)}<span>${label}</span></a>`).join("")}</nav>`;
}

/* Navigation: Naver Map app first (falls back to the Naver web map), Kakao as backup. */
const enc = encodeURIComponent;
const appName = () => enc(location.origin + location.pathname);
export function naverTarget({ query, name, lat, lng, precise }) {
  const q = query || name;
  const scheme = precise && lat != null
    ? `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${enc(name || q)}&appname=${appName()}`
    : `nmap://search?query=${enc(q)}&appname=${appName()}`;
  return { scheme, web: `https://map.naver.com/p/search/${enc(q)}` };
}
export function naverBtn(target, cls = "btn primary", label = "導航") {
  const t = naverTarget(target);
  return `<a class="${cls}" href="${t.web}" data-nmap="${esc(t.scheme)}" target="_blank" rel="noopener">${icon("nav")}${label}</a>`;
}
function kakaoBtn({ query, name, lat, lng, precise }, cls = "btn") {
  const href = precise && lat != null ? `https://map.kakao.com/link/to/${enc(name || query)},${lat},${lng}` : `https://map.kakao.com/link/search/${enc(query || name)}`;
  return `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${icon("map")}Kakao</a>`;
}
function stopTarget(s) {
  return { query: s.extra?.search_q || s.name_ko || s.name, name: s.name_ko || s.name, lat: s.lat, lng: s.lng,
    precise: s.lat != null && !s.extra?.approx && !s.extra?.search_q };
}
function navLinks(s, compact, cls = "btn primary") {
  if (s.options?.length) return "";
  if (!isPlace(s) && !s.extra?.search_q && s.lat == null) return "";
  const t = stopTarget(s);
  return naverBtn(t, cls, s.extra?.search_q && s.category !== "hotel" ? "找地點" : "導航") + (compact ? "" : kakaoBtn(t));
}
const optTarget = o => ({ query: o.q || o.name_ko || o.name, name: o.name_ko || o.name });
// The restaurant picked on the day (stored by name), or null.
export function chosenOpt(s) { const c = s.extra?.chosen; return c ? (s.options || []).find(o => o.name === c) || null : null; }

/* ---------- weather card ---------- */
// Where to read the forecast: the middle of that day's stops (Jeju City if none yet).
export function dayPoint(day) {
  const pts = stopsFor(day.date, "sun").filter(s => s.lat != null && s.lng != null);
  if (pts.length) return { lat: pts.reduce((a, s) => a + s.lat, 0) / pts.length, lng: pts.reduce((a, s) => a + s.lng, 0) / pts.length };
  return day.weather_point || { lat: 33.4996, lng: 126.5312 };
}
function hourStrip(w) {
  if (!w.hours?.length) return "";
  return `<div class="wx-hours" aria-label="每 3 小時預報">${w.hours.map(x => `<div><span>${x.h}時</span>${wxIcon(wmo(x.code)[1])}<b>${Math.round(x.t)}°</b><small${x.p >= 50 ? ' class="wet"' : ""}>${x.p ?? "–"}%</small></div>`).join("")}</div>`;
}
export function weatherCard(day, w) {
  const pt = dayPoint(day);
  const sun = sunTimes(day.date, pt.lat, pt.lng);
  const sunBlock = `<div class="wx-sun">日落<b>${hhmm(sun.set)}</b>日出 ${hhmm(sun.rise)}</div>`;
  if (w) {
    const [desc, kind] = wmo(w.code);
    const picking = stopsFor(day.date, "sun").some(s => s.category === "experience");
    return `<section class="wx" aria-label="天氣">
      <div class="wx-main"><div class="wx-icon">${wxIcon(kind)}</div>
        <div><div class="wx-temp">${Math.round(w.max)}° <span class="lo">/ ${Math.round(w.min)}°</span></div>
        <div class="wx-desc">${desc}・體感最低 ${Math.round(w.feel)}°</div></div>${sunBlock}</div>
      <div class="wx-stats"><div>降雨機率<b>${w.rain ?? "–"}%</b></div><div>最大風速<b>${w.wind != null ? Math.round(w.wind) : "–"} m/s</b></div>
        <div>白天長度<b>${Math.floor((sun.set - sun.rise) / 60)}h${String(Math.round((sun.set - sun.rise) % 60)).padStart(2, "0")}</b></div></div>
      ${hourStrip(w)}
      <p class="wx-tip">${esc(wxAdvice(w, picking))}</p>
      <p class="wx-src">預報位置：這天行程的中間（海邊高度）・Open-Meteo・每小時更新${w.mm != null ? `・預估雨量 ${w.mm} mm` : ""}
        ・<a href="https://www.weather.go.kr/w/index.do" target="_blank" rel="noopener">對照韓國氣象廳</a></p></section>`;
  }
  return `<section class="wx" aria-label="天氣">
    <div class="wx-main"><div class="wx-icon">${wxIcon("partly")}</div>
      <div><div class="wx-temp">15° <span class="lo">/ 8°</span></div><div class="wx-desc">往年 11 月下旬的大約氣溫</div></div>${sunBlock}</div>
    <p class="wx-tip">濟州這時節風大、早晚冷：帶防風外套，洋蔥式穿法</p>
    <p class="wx-src">預報讀取中或尚未公布</p></section>`;
}

/* ---------- 今天 ---------- */
export function todayView() {
  const now = kstNow();
  const first = S.days[0]?.date, last = S.days.at(-1)?.date;
  const t = S.cfg || {};
  let body = "";
  let title = "今天", sub = "";
  if (now.date < first) {
    const diff = Math.round((Date.parse(first) - Date.parse(now.date)) / 864e5);
    const f = (t.flights || [])[0];
    const shared = S.checklist.filter(c => c.scope === "shared");
    const done = shared.filter(c => c.done).length;
    const mine = S.checklist.filter(c => c.scope === "mine" && (!c.owner_id || c.owner_id === myId()));
    const d1 = S.days[0];
    const d1stops = stopsFor(d1.date, "sun").filter(isPlace);
    sub = "出發前";
    body = `
      <section class="hero-count">
        <svg class="art" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${ART.dawn()}</svg>
        <div class="shade"></div>
        <div class="text"><div class="big"><b>${diff}</b> 天後出發</div>
        ${f ? `<p>${md(f.date)}（${weekday(f.date)}）${esc(f.airline)} ${esc(f.flight)} ${f.dep} 起飛</p>` : ""}</div>
      </section>
      ${f && f.dep < "06:00" ? `<p class="callout">${icon("plane")}<span>${esc(f.flight)} 是 ${md(f.date)} 凌晨 ${f.dep} 的班機，<b>${md(prevDate(f.date))} 晚上</b>就要到桃園機場 ${esc(f.from.split(" ")[1] || "")}。</span></p>` : ""}
      ${S.mode === "local" ? `<section class="card join-card"><h3>和朋友一起用</h3><p>輸入名字和你們的通關碼，行程、清單、照片就會同步到每個人的手機。</p><button class="btn primary wide" type="button" data-act="open-join">加入旅行</button></section>` : ""}
      <a class="card link-card" href="#list"><div><h3>準備進度</h3><p>大家一起 ${done} / ${shared.length}${mine.length ? `・我的 ${mine.filter(c => c.done).length} / ${mine.length}` : ""}</p></div>
        <div class="ring" style="--p:${shared.length ? Math.round(done / shared.length * 100) : 0}"><span>${shared.length ? Math.round(done / shared.length * 100) : 0}%</span></div></a>
      <section class="card"><h3>出發那天</h3>
        ${d1stops.length ? `<ol class="mini-list">${d1stops.slice(0, 4).map(s => `<li><b>${esc(s.time || "")}</b>${esc(s.name)}</li>`).join("")}</ol>` :
          `<p class="muted">Day 1 的行程還沒排${editable() ? `，到「行程」分頁就能新增。` : "。"}</p>`}
        <a class="btn" href="#plan" data-act="goto-day" data-date="${d1.date}">看完整行程</a></section>
      <button class="link-btn" type="button" data-act="demo">預覽旅途中的「今天」長怎樣</button>`;
  } else if (now.date > last) {
    title = "旅程結束";
    body = `<section class="card"><h3>回來了，辛苦了</h3><p>照片和心得都在「回憶」分頁。</p><a class="btn primary" href="#memories">看回憶</a></section>`;
  } else {
    const day = S.days.find(d => d.date === now.date);
    const di = dayIndex(day.date);
    title = day.title || `Day ${day.day}`;
    sub = `${md(day.date)}（${weekday(day.date)}）・旅行第 ${di + 1} 天`;
    const plan = currentPlan(day.date);
    const list = stopsFor(day.date, plan);
    const nextIdx = list.findIndex(s => isPlace(s) && toMin(s.time) != null && toMin(s.time) + (s.duration_min || 30) > now.min && !isDone(day.date, s.id));
    const next = list[nextIdx];
    const later = list.slice(nextIdx + 1).filter(isPlace);
    const pt = dayPoint(day);
    const sun = sunTimes(day.date, pt.lat, pt.lng);
    const w = cachedWeather(day.date, pt);
    if (next) {
      const opt = chosenOpt(next) || next.options?.[0];
      body += `<section class="next-card">
        ${coverArt(day.theme, "0 0 400 140")}
        <div class="next-body">
          <div class="next-meta"><span class="pill">下一站</span><b>${esc(next.time || "")}</b>${next.drive_min ? `<span>・開車約 ${next.drive_min} 分</span>` : ""}</div>
          <h2>${esc(next.name)}</h2>
          ${opt ? `<p>${esc(opt.name)}${next.options.length > 1 && !chosenOpt(next) ? ` 等 ${next.options.length} 家` : ""}</p>` : next.name_ko ? `<p lang="ko">${esc(next.name_ko)}</p>` : ""}
          <div class="actions">${opt ? naverBtn(optTarget(opt), "btn primary grow") : navLinks(next, true, "btn primary grow")}
            <button class="btn grow" type="button" data-act="check" data-id="${next.id}" data-date="${day.date}">去過了</button></div>
        </div></section>`;
    } else {
      body += `<section class="card"><h3>今天的行程都走完了</h3><p>到「回憶」留幾張照片吧。</p><a class="btn primary" href="#memories">加照片</a></section>`;
    }
    body += `<section class="wx-strip">
      <div>${w ? esc(wmo(w.code)[0]) : "往年平均"}<b>${w ? `${Math.round(w.max)}° <small>/ ${Math.round(w.min)}°</small>` : `15° <small>/ 8°</small>`}</b></div>
      <div>日落<b class="sunset">${hhmm(sun.set)}</b></div>
      <div>降雨・風<b>${w ? `${w.rain ?? "–"}% <small>${Math.round(w.wind ?? 0)} m/s</small>` : "–"}</b></div></section>`;
    if (later.length) {
      body += `<div class="section-h"><h3>接下來</h3><span>還有 ${later.length} 站</span></div>
        <ul class="up-list">${later.map(s => `<li><a href="#plan" data-act="goto-stop" data-date="${day.date}" data-id="${s.id}">
          <b>${esc(s.time || "")}</b><i style="background:var(--c-${s.category})"></i>
          <span><strong>${esc(s.name)}</strong><small${s.category === "sunset" ? ' class="sunset"' : ""}>${s.category === "sunset" ? `日落 ${hhmm(sun.set)}・${hhmm(sun.set - 20)} 前到` : `${CAT[s.category] || ""}${s.duration_min ? `・約 ${s.duration_min} 分` : ""}`}</small></span></a></li>`).join("")}</ul>`;
    }
    body += stayCard(day.date);
  }
  if (getDemoTime()) body += `<button class="link-btn" type="button" data-act="demo-off">結束預覽，回到現在</button>`;
  return topbar(title, sub) + `<main class="page">${body}</main>`;
}
function prevDate(date) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }

/* ---------- 行程 ---------- */
let planChoice = {};
export function setPlan(date, p) { planChoice[date] = p; }
export function currentPlan(date) { return planChoice[date] === "rain" && (hasRain(date) || editable()) ? "rain" : "sun"; }
export function initPlans(saved) { planChoice = saved || {}; }
export function plansState() { return planChoice; }

let doneMap = {};
export function initDone(saved) { doneMap = saved || {}; }
export function doneState() { return doneMap; }
export const isDone = (date, id) => !!doneMap[id];
export function toggleDone(id) { if (doneMap[id]) delete doneMap[id]; else doneMap[id] = Date.now(); }

export function planView(date) {
  const day = S.days.find(d => d.date === date) || S.days[0];
  const plan = currentPlan(day.date);
  const list = stopsFor(day.date, plan);
  const places = list.filter(isPlace);
  const t = S.cfg || {};
  const arr = (t.flights || []).find(f => f.date === day.date && f.to === "CJU");
  const dep = (t.flights || []).find(f => f.date === day.date && f.from === "CJU");
  const now = kstNow();
  const nextIdx = now.date === day.date ? list.findIndex(s => isPlace(s) && !isDone(day.date, s.id) && toMin(s.time) != null && toMin(s.time) + (s.duration_min || 30) > now.min) : -1;

  const tabs = `<nav class="days" role="tablist" aria-label="選擇哪一天">${S.days.map((d, i) => `
    <button class="day-tab" role="tab" type="button" data-act="day" data-date="${d.date}" aria-selected="${d.date === day.date}">
      <span class="d">${md(d.date)}</span><span class="w">${weekday(d.date)}・${esc(d.title || "待補")}${d.date === now.date ? '<span class="today-dot" aria-label="今天"></span>' : ""}</span>
      <span class="bar" style="background:${DAY_COLORS[i % DAY_COLORS.length]}"></span></button>`).join("")}</nav>`;

  let html = topbar("行程", "", S.mode === "synced") + tabs + `<main class="page">${editable() ? `<p class="editing-bar">編輯中：點鉛筆改內容，按住右邊 <b>⠿</b> 上下拖可換順序</p>` : ""}`;
  if (S.mode === "local") html += `<p class="callout soft">${icon("user")}<span>加入旅行後，大家都能在這裡新增、修改行程。<button class="link-btn inline" type="button" data-act="open-join">加入</button></span></p>`;
  html += `<section class="cover" aria-label="Day ${day.day} 封面">
      ${coverArt(day.theme)}
      <div class="shade"></div>
      ${editable() ? `<button class="cover-edit" type="button" data-act="edit-day" data-date="${day.date}">${icon("edit")}編輯這天</button>` : ""}
      <div class="text"><div class="dayno">DAY ${day.day}・${md(day.date)}（${weekday(day.date)}）</div>
        <h2>${esc(day.title || "還沒取名")}</h2><p>${esc(day.tagline || "")}</p>
        ${places.length ? `<p class="stats">${places.length} 站・${esc(list[0]?.time || "")} 出發</p>` : ""}</div></section>`;
  html += `<div id="wx-slot" data-date="${day.date}">${weatherCard(day, cachedWeather(day.date, dayPoint(day)))}</div>`;
  if (hasRain(day.date) || editable()) {
    const w = cachedWeather(day.date, dayPoint(day));
    const bad = w && ((w.rain ?? 0) >= 60 || (w.wind ?? 0) >= 12);
    html += `<section class="plan-sw" aria-label="選擇行程">
      <div class="seg" role="group" aria-label="晴天或雨天行程">
        <button type="button" data-act="plan" data-plan="sun" aria-pressed="${plan === "sun"}">晴天行程</button>
        <button type="button" data-act="plan" data-plan="rain" aria-pressed="${plan === "rain"}">雨天備案</button></div>
      ${bad && plan === "sun" ? `<p class="plan-alert">預報${(w.rain ?? 0) >= 60 ? `降雨機率 ${w.rain}%` : `風速 ${Math.round(w.wind)} m/s`}，建議切到雨天備案</p>` : ""}
      ${plan === "rain" && day.rain_note ? `<p class="plan-note">${esc(day.rain_note)}</p>` : ""}
      ${plan === "rain" && !hasRain(day.date) ? `<p class="plan-note">這天還沒有雨天備案。可以從晴天行程複製一份再改，或一站一站新增。</p>
        <button class="btn wide" type="button" data-act="copy-to-rain" data-date="${day.date}">複製晴天行程當作雨天備案</button>` : ""}</section>`;
  }
  html += dayGmap(day, list, nextIdx);
  html += `<div class="section-h"><h3>行程</h3><span>${places.length} 站</span></div><ol class="timeline" id="timeline" data-date="${day.date}" data-plan="${plan}">`;
  if (arr) html += flightRow(arr, "arr");
  let n = 0, lastT = null;
  list.forEach((s, i) => {
    const p = list[i - 1];
    const t = toMin(s.time);
    s._early = t != null && lastT != null && t < lastT;
    if (t != null) lastT = t;
    if (p && s.drive_min) {
      const pt = toMin(p.time), st = toMin(s.time);
      const late = pt != null && st != null ? pt + (p.duration_min || 0) + s.drive_min - st : 0;
      html += `<li class="leg${late > 0 ? " is-late" : ""}"><div></div><div class="rail"></div>
        <div class="leg-body">${icon("drive")}開車約 ${s.drive_min} 分${late > 0 ? `<b>・會晚到 ${late} 分</b>` : ""}</div></li>`;
    }
    html += stopRow(day, s, i, isPlace(s) ? ++n : 0, nextIdx);
  });
  if (dep) html += flightRow(dep, "dep");
  html += `</ol>`;
  if (!list.length && !arr) html += `<div class="empty"><h3>這天還沒有行程</h3><p>${editable() ? "按下面的按鈕新增第一站。" : "加入旅行後就能新增。"}</p></div>`;
  if (editable()) {
    const st = stayFor(day.date), any = (S.info?.stays || []).length;
    html += `<div class="add-row${st || !any ? "" : " one"}"><button class="add-stop" type="button" data-act="new-stop" data-date="${day.date}" data-plan="${plan}">${icon("plus")}新增一站${plan === "rain" ? "（雨天備案）" : ""}</button>
      ${st || !any ? `<button class="add-stop add-hotel" type="button" data-act="${st ? "new-stay-stop" : "edit-info"}" data-date="${day.date}" data-plan="${plan}">${icon("hotel")}${st ? "加「回住宿」" : "先填住宿資訊"}</button>` : ""}</div>`;
  }
  html += stayCard(day.date) + infoFooter() + `</main>`;
  return html;
}

function flightRow(f, kind) {
  const arr = kind === "arr";
  return `<li class="stop is-flight"><div class="time">${arr ? f.arr : f.dep}</div>
    <div class="rail"><div class="dot">✈</div></div>
    <div class="card flight-card"><div class="card-head"><div class="cat-ic" style="background:#fff">${icon("plane", "#2F64A8")}</div>
      <div><h4>${arr ? "抵達濟州機場" : "起飛回臺灣"}</h4><p class="sub">${esc(f.airline)} ${esc(f.flight)}・${esc(f.from)} ${f.dep} → ${esc(f.to)} ${f.arr}</p></div></div></div></li>`;
}

function stopRow(day, s, i, num, nextIdx) {
  const move = !isPlace(s), done = isDone(day.date, s.id), sunset = s.category === "sunset";
  const color = `var(--c-${s.category})`;
  const cls = ["stop", move ? "is-move" : "", done ? "is-done" : "", i === nextIdx ? "is-next" : "", sunset ? "is-sunset" : ""].join(" ");
  let sunsetBlock = "";
  if (sunset && s.lat != null) {
    const set = sunTimes(day.date, s.lat, s.lng).set;
    sunsetBlock = `<div class="sunset-time"><b>${hhmm(set)}</b><span>日落・${hhmm(set - 20)} 前到，最美的是日落後 15 分鐘</span></div>`;
  }
  const wd = wdNum(day.date);
  const chosen = chosenOpt(s);
  const canPick = S.mode === "synced" && (s.options || []).length > 1;
  const opts = (s.options || []).map((o, k) => {
    const closed = (o.closed || []).includes(wd);
    const on = chosen && chosen.name === o.name;
    const navOk = o.name !== "改在機場吃" && (o.q || o.name_ko || o.name);
    return `<li class="opt${closed ? " is-closed" : ""}${on ? " is-chosen" : chosen ? " not-chosen" : ""}"><div class="opt-name">${on ? "✓ " : ""}${esc(o.name)}</div>
      ${o.name_ko && o.name_ko !== o.name ? `<div class="opt-hours" lang="ko">${esc(o.name_ko)}</div>` : ""}
      ${o.hours || closed ? `<div class="opt-hours">${closed ? `<b class="bad">${WEEK[wd]}公休</b>　` : ""}${esc(o.hours || "")}${o.verified === false && o.hours ? `<span class="unv">待確認</span>` : ""}</div>` : ""}
      ${o.note ? `<div class="opt-note">${esc(o.note)}</div>` : ""}
      ${navOk || canPick ? `<div class="opt-act">${navOk ? naverBtn(optTarget(o), "btn primary", "Naver 導航") + `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((o.q || o.name_ko || o.name) + " 제주")}" target="_blank" rel="noopener">Google</a>` : ""}
        ${canPick ? `<button class="btn${on ? " on" : ""}" type="button" data-act="choose-opt" data-id="${s.id}" data-k="${k}" aria-pressed="${!!on}">${on ? "已選這家" : "就吃這家"}</button>` : ""}</div>` : ""}</li>`;
  }).join("");
  const tips = (s.tips || []).filter(t => !(sunset && /日落約/.test(t)));
  const editor = s.updated_by ? memberById(s.updated_by) : null;
  const nav = navLinks(s);
  return `<li class="${cls}" id="stop-${s.id}"${editable() ? ` data-sid="${s.id}"` : ""}>
    <div class="time">${esc(s.time || "")}</div>
    <div class="rail"><div class="dot">${move ? "" : num}</div></div>
    <div class="card">
      ${editable() ? `<button class="edit-btn" type="button" data-act="edit-stop" data-id="${s.id}" aria-label="編輯 ${esc(s.name)}">${icon("edit")}</button><span class="drag-handle" aria-hidden="true">${icon("grip")}</span>` : ""}
      <div class="card-head"><div class="cat-ic" style="background:color-mix(in srgb, ${color} 14%, white)">${icon(s.category, color)}</div>
        <div><h4>${esc(s.name)}${i === nextIdx ? `<span class="next-tag">下一站</span>` : ""}</h4>
          ${s.name_ko && !move ? `<p class="sub" lang="ko">${esc(s.name_ko)}</p>` : ""}
          ${move ? "" : `<p class="sub"><span class="chip" style="background:color-mix(in srgb, ${color} 14%, white);color:${color}">${CAT[s.category] || ""}</span>${s.duration_min ? `約 ${s.duration_min} 分鐘` : ""}</p>`}</div></div>
      ${editable() && s._early ? `<p class="warn">時間比上一站早：按鉛筆改時間</p>` : ""}
      ${s.extra?.warn === "tight" ? `<p class="warn">⚠ 到機場的時間偏緊</p>` : ""}
      ${sunsetBlock}
      ${tips.length ? `<ul class="tips">${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${opts ? `<p class="opt-h">${chosen ? `決定吃：${esc(chosen.name)}` : `${s.options.length} 家選一家`}</p><ul class="opts">${opts}</ul>` : ""}
      ${(nav || !move) ? `<div class="actions">${nav}${move ? "" : `<button class="btn check" type="button" data-act="check" data-id="${s.id}" data-date="${day.date}" aria-pressed="${done}">${done ? "✓ 去過了" : "去過了"}</button>`}</div>` : ""}
      ${editor && editor.user_id !== myId() && s.updated_at ? `<p class="edited-by">${esc(editor.display_name)} 改過</p>` : ""}
    </div></li>`;
}

/* ---------- Google Maps (embedded, no key needed) ---------- */
// A stop is shown by its exact coordinates when it has them, otherwise Google finds it by name.
export function gmapQuery(s) {
  if (s.lat != null && !s.extra?.approx) return `${s.lat},${s.lng}`;
  const q = (s.extra?.search_q || s.name_ko || s.name || "").trim();
  if (!q) return "濟州島";
  return /제주|濟州|济州|jeju/i.test(q) ? q : `${q} ${/[가-힣]/.test(q) ? "제주" : "濟州"}`;
}
export function gmapSrc(q, z = 15) { return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=zh-TW&z=${z}&output=embed`; }
export function gmapFrame(q, z, title, cls = "gmap") {
  return `<div class="${cls}"><iframe src="${gmapSrc(q, z)}" title="${esc(title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>`;
}
const gmapOpen = s => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gmapQuery(s))}`;
function gmapRoute(list) {
  const q = list.map(gmapQuery);
  if (q.length < 2) return q.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q[0])}` : "";
  const w = q.slice(1, -1).slice(0, 9);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(q[0])}&destination=${encodeURIComponent(q[q.length - 1])}${w.length ? `&waypoints=${encodeURIComponent(w.join("|"))}` : ""}`;
}
function dayGmap(day, list, nextIdx) {
  const places = list.filter(isPlace);
  if (!places.length) return "";
  const focus = (nextIdx >= 0 && isPlace(list[nextIdx]) ? list[nextIdx] : null) || places[0];
  return `<section class="day-gmap">
    ${gmapFrame(gmapQuery(focus), 13, `${focus.name} 的地圖`)}
    <div class="day-gmap-bar"><span class="small">地圖上是：<b>${esc(focus.name)}</b></span>
      <span class="row-btns"><a class="btn" href="#map" data-act="map-day" data-date="${day.date}">每站地圖</a>
      <a class="btn" href="${gmapRoute(places)}" target="_blank" rel="noopener">整天路線</a></span></div>
  </section>`;
}

export const APP_VERSION = "17.4";
/* ---------- export to PDF (print layout) ---------- */
export function exportSheet(curDate) {
  const d = S.days.find(x => x.date === curDate);
  return `<h2>匯出 PDF</h2>
    <form data-act="export-pdf" class="form">
      <fieldset class="seg-field"><legend>樣式</legend>
        <label class="radio style-pick"><input type="radio" name="style" value="plain" checked><span><b>標準</b><small>黑白為主、字多排得密，省墨、適合印出來帶著</small></span></label>
        <label class="radio style-pick"><input type="radio" name="style" value="fancy"><span><b>美化版</b><small>彩色封面和每天的插圖，適合傳給朋友在手機上看</small></span></label>
      </fieldset>
      <fieldset class="seg-field"><legend>要匯出哪幾天</legend>
        <label class="radio"><input type="radio" name="scope" value="all" checked> 全部 ${S.days.length} 天</label>
        ${d ? `<label class="radio"><input type="radio" name="scope" value="${d.date}"> 只有 ${md(d.date)}（${weekday(d.date)}）${esc(d.title || "")}</label>` : ""}
      </fieldset>
      <fieldset class="seg-field"><legend>還要放進去</legend>
        <label class="radio"><input type="checkbox" name="rain" checked> 雨天備案</label>
        <label class="radio"><input type="checkbox" name="opts" checked> 餐廳候選</label>
        <label class="radio"><input type="checkbox" name="info" checked> 旅行資訊（航班、住宿、租車、緊急電話）</label>
        <label class="radio"><input type="checkbox" name="list"> 打包清單</label>
      </fieldset>
      <p class="muted small">按「匯出」後會跳出列印畫面，印表機選「<b>另存為 PDF</b>」（iPhone 是左下「分享」→ 儲存到檔案），就能存成 PDF 或傳給朋友。</p>
      <button class="btn primary wide" type="submit">${icon("list")}匯出</button>
    </form>`;
}
function printStop(s, o) {
  const place = isPlace(s);
  const meta = [CAT[s.category], s.duration_min ? `停留 ${s.duration_min} 分` : "", s.drive_min ? `開車 ${s.drive_min} 分` : ""].filter(Boolean).join("・");
  const chosen = chosenOpt(s);
  const opts = o.opts && (s.options || []).length ? `<ul class="p-opts">${s.options.map(op => `<li${chosen && chosen.name === op.name ? ' class="on"' : ""}>
      <b>${chosen && chosen.name === op.name ? "✓ " : ""}${esc(op.name)}</b>${op.name_ko && op.name_ko !== op.name ? ` <span lang="ko">${esc(op.name_ko)}</span>` : ""}
      ${op.hours ? `<span class="p-mut">　${esc(op.hours)}</span>` : ""}${(op.closed || []).length ? `<span class="p-mut">　週${op.closed.map(c => WEEK[c]).join("、")}公休</span>` : ""}
      ${op.note ? `<div class="p-mut">${esc(op.note)}</div>` : ""}</li>`).join("")}</ul>` : "";
  const tips = (s.tips || []).filter(Boolean).slice(0, 3);
  return `<div class="p-row${place ? "" : " p-move"}" style="--cc:var(--c-${s.category})"><div class="p-time">${esc(s.time || "")}</div>
    <div class="p-body"><div class="p-name"><span class="p-catdot" aria-hidden="true"></span>${esc(s.name)}${s.name_ko ? ` <span lang="ko">${esc(s.name_ko)}</span>` : ""}</div>
      ${meta ? `<div class="p-mut">${meta}</div>` : ""}
      ${tips.length ? `<ul class="p-tips">${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}${opts}</div></div>`;
}
function printFlight(f, arr) {
  return `<div class="p-row p-move"><div class="p-time">${arr ? f.arr : f.dep}</div><div class="p-body"><div class="p-name">✈ ${arr ? "抵達濟州機場" : "起飛回臺灣"}</div>
    <div class="p-mut">${esc(f.airline)} ${esc(f.flight)}・${esc(f.from)} ${f.dep} → ${esc(f.to)} ${f.arr}</div></div></div>`;
}
// Cover art with its own gradient ids, so it renders even though the app's copy is hidden while printing.
const printArt = theme => artSvg(theme, "p");
export function printDoc(o) {
  const t = S.cfg || {}, info = S.info || {};
  const days = o.scope === "all" ? S.days : S.days.filter(d => d.date === o.scope);
  const first = S.days[0]?.date, last = S.days.at(-1)?.date;
  let h = `<header class="p-head"><h1>濟州 ${first ? md(first) : ""}–${last ? md(last).split("/").pop() : ""}</h1>
    <p class="p-mut">匯出時間 ${new Date().toLocaleString("zh-TW", { hour12: false })}${S.members.length ? `・${S.members.map(m => esc(m.display_name)).join("、")}` : ""}</p></header>`;
  if (o.style === "fancy") {
    const t0 = S.days[0];
    h = `<section class="p-cover">
      ${isPhoto(t0?.theme) ? `<img class="p-cover-art" data-photo="${esc(t0.theme.slice(6))}" alt="">` : `<svg class="p-cover-art" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${printArt(t0?.theme || "dawn")}</svg>`}
      <div class="p-cover-txt"><p class="p-kicker">JEJU ISLAND</p><h1>濟州 ${first ? md(first) : ""}–${last ? md(last).split("/").pop() : ""}</h1>
        ${S.members.length ? `<p>${S.members.map(m => esc(m.display_name)).join("・")}</p>` : ""}</div>
      <ol class="p-toc">${days.map(d => `<li><span class="p-dayno" style="background:${dayColor(d.date)}">DAY ${d.day}</span><b>${md(d.date)}（${weekday(d.date)}）</b>${esc(d.title || "還沒排")}<span class="p-mut">　${stopsFor(d.date, "sun").filter(isPlace).length} 站</span></li>`).join("")}</ol>
      <ul class="p-flights">${(t.flights || []).map(x => `<li>✈ ${md(x.date)} ${esc(x.airline)} ${esc(x.flight)}　${esc(x.from)} ${x.dep} → ${esc(x.to)} ${x.arr}</li>`).join("")}</ul>
    </section>`;
  }
  days.forEach((day, i) => {
    const sun = stopsFor(day.date, "sun"), rain = stopsFor(day.date, "rain");
    const arr = (t.flights || []).find(f => f.date === day.date && f.to === "CJU");
    const dep = (t.flights || []).find(f => f.date === day.date && f.from === "CJU");
    const st = stayFor(day.date);
    const banner = o.style === "fancy" ? `<div class="p-banner">${isPhoto(day.theme) ? `<img data-photo="${esc(day.theme.slice(6))}" alt="">` : `<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${printArt(day.theme)}</svg>`}
      <div class="p-banner-txt"><span>DAY ${day.day}・${md(day.date)}（${weekday(day.date)}）</span><b>${esc(day.title || "還沒取名")}</b>${day.tagline ? `<small>${esc(day.tagline)}</small>` : ""}</div></div>` : "";
    h += `<section class="p-day${i || o.style === "fancy" ? " p-break" : ""}">${banner}
      <h2 class="p-dayh"><span class="p-dayno" style="background:${dayColor(day.date)}">DAY ${day.day}</span>${md(day.date)}（${weekday(day.date)}）${esc(day.title || "")}</h2>
      ${day.tagline ? `<p class="p-mut">${esc(day.tagline)}</p>` : ""}
      ${sun.length || arr || dep ? `<div class="p-table">${arr ? printFlight(arr, true) : ""}${sun.map(s => printStop(s, o)).join("")}${dep ? printFlight(dep, false) : ""}</div>` : `<p class="p-mut">這天還沒排行程。</p>`}
      ${o.rain && rain.length ? `<h3 class="p-rainh">☔ ${md(day.date)} 雨天備案（下雨才用）</h3>${day.rain_note ? `<p class="p-mut">${esc(day.rain_note)}</p>` : ""}<div class="p-table">${rain.map(s => printStop(s, o)).join("")}</div>` : ""}
      ${st ? `<p class="p-stay">今晚住：<b>${esc(st.name)}</b>${st.address_ko ? `　<span lang="ko">${esc(st.address_ko)}</span>` : ""}${st.phone ? `　☎ ${esc(st.phone)}` : ""}</p>` : ""}
    </section>`;
  });
  if (o.info) {
    const r = info.rental || {};
    const rental = [["公司", r.company], ["訂位代號", r.booking], ["取車", [r.pickup_time, r.pickup_place].filter(Boolean).join("・")], ["還車", [r.return_time, r.return_place].filter(Boolean).join("・")], ["電話", r.phone], ["備註", r.note]].filter(x => x[1]);
    const bookings = (info.bookings || []).filter(b => b.label || b.code);
    h += `<section class="p-day p-break"><h2>旅行資訊</h2>
      <h3>航班</h3><ul>${(t.flights || []).map(x => `<li>${md(x.date)}（${weekday(x.date)}）${esc(x.airline)} ${esc(x.flight)}　${esc(x.from)} ${x.dep} → ${esc(x.to)} ${x.arr}</li>`).join("")}</ul>
      ${(info.stays || []).length ? `<h3>住宿</h3><ul>${info.stays.map(st => `<li><b>${esc(st.name)}</b>${st.check_in ? `　${md(st.check_in)} 入住${st.check_out ? `・${md(st.check_out)} 退房` : ""}` : ""}
        ${st.address_ko ? `<div lang="ko">${esc(st.address_ko)}</div>` : ""}${st.phone ? `<div>☎ ${esc(st.phone)}</div>` : ""}${st.note ? `<div class="p-mut">${esc(st.note)}</div>` : ""}</li>`).join("")}</ul>` : ""}
      ${rental.length ? `<h3>租車</h3><dl class="p-kv">${rental.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
      ${(t.transport?.docs || []).length ? `<p class="p-mut">要帶：${esc(t.transport.docs.join("、"))}。還車前要加滿油。</p>` : ""}
      ${bookings.length ? `<h3>訂位代號</h3><dl class="p-kv">${bookings.map(b => `<dt>${esc(b.label || "")}</dt><dd><b>${esc(b.code || "")}</b></dd>`).join("")}</dl>` : ""}
      <h3>緊急電話</h3><p>112 警察　119 火警、救護車　1330 觀光熱線（有中文）</p></section>`;
  }
  if (o.list) {
    const items = S.checklist.filter(c => c.scope === "shared");
    const groups = [...new Set(items.map(c => c.group_name || "其他"))];
    h += `<section class="p-day p-break"><h2>打包清單</h2>${groups.map(g => `<h3>${esc(g)}</h3><ul class="p-check">${items.filter(c => (c.group_name || "其他") === g).map(c => {
      const who = c.assignee ? memberById(c.assignee) : null;
      return `<li>${c.done ? "☑" : "☐"} ${esc(c.text)}${who ? `<span class="p-mut">（${esc(who.display_name)}）</span>` : ""}</li>`; }).join("")}</ul>`).join("")}</section>`;
  }
  return h;
}

export function infoFooter() {
  const t = S.cfg || {};
  const f = (t.flights || []).map(x => `<dt>${md(x.date)}</dt><dd>${esc(x.airline)} ${esc(x.flight)}　${esc(x.from)} ${x.dep} → ${esc(x.to)} ${x.arr}</dd>`).join("");
  const dn = t.drive_note ? `<dt>車程</dt><dd>${esc(t.drive_note)}</dd>` : "";
  return `<footer class="info"><h2>航班與提醒</h2><dl>${f}${dn}</dl><button class="link-btn" type="button" data-act="open-info">更多：住宿、緊急電話、實用韓文</button><p class="ver">版本 ${APP_VERSION}</p></footer>`;
}

/* ---------- 地圖 ---------- */
const mapOrd = s => (S.days.findIndex(d => d.date === s.day) * 1e6) + (s.plan === "rain" ? 5e5 : 0) + (s.position || 0);
// Stops shown for a map filter, in trip order.
export function mapVisible(filter = "all") {
  return S.stops.filter(isPlace).filter(s => {
    if (filter === "all") return s.plan === "sun";
    if (filter === "food") return s.plan === "sun" && FOOD_CATS.includes(s.category);
    if (filter === "rain") return s.plan === "rain";
    return s.day === filter && s.plan === "sun";
  }).sort((a, b) => mapOrd(a) - mapOrd(b));
}
export const mapOrder = s => stopsFor(s.day, s.plan).filter(isPlace).indexOf(s) + 1;
export const mapColor = s => s.plan === "rain" ? RAIN_COLOR : dayColor(s.day);
export const onMap = s => s.lat != null && s.lng != null;
export function mapSheet(sel) {
  if (!sel) return `<section id="map-sheet" class="map-sheet" hidden></section>`;
  return `<section id="map-sheet" class="map-sheet">
      <p class="muted">${md(sel.day)}（${weekday(sel.day)}）${esc(sel.time || "")}・${CAT[sel.category] || ""}${sel.plan === "rain" ? "・雨天備案" : ""}</p>
      <h2>${esc(sel.name)}</h2>${sel.name_ko ? `<p class="muted" lang="ko">${esc(sel.name_ko)}</p>` : ""}
      <p id="ov-dist" class="ov-dist" hidden></p>
      ${sel.tips?.[0] ? `<p>${esc(sel.tips[0])}</p>` : ""}
      <div class="actions">${sel.options?.length ? naverBtn(optTarget(chosenOpt(sel) || sel.options[0]), "btn primary grow") : navLinks(sel, true, "btn primary grow")}
        <a class="btn grow" href="${gmapOpen(sel)}" target="_blank" rel="noopener">Google</a>
        <a class="btn grow" href="#plan" data-act="goto-stop" data-date="${sel.day}" data-id="${sel.id}" data-plan="${sel.plan}">看行程</a></div>
      <details class="gm-peek"><summary>看 Google 地圖上的樣子</summary>${gmapFrame(gmapQuery(sel), 16, `${sel.name} 的 Google 地圖`, "gmap small")}</details>
    </section>`;
}
export function mapView(state) {
  const filter = state.filter || "all";
  const places = S.stops.filter(isPlace);
  const visible = mapVisible(filter);
  const daysWithStops = S.days.filter(d => places.some(s => s.day === d.date && s.plan === "sun"));
  const chips = [["all", "全部"], ...daysWithStops.map(d => [d.date, `${md(d.date)} ${d.title || ""}`.trim()]), ["food", "吃的"], ["rain", "雨天備案"]];
  const sel = visible.find(s => s.id === state.selected) || null;
  const isDay = S.days.some(d => d.date === filter);
  const missing = visible.filter(s => !onMap(s));
  const items = visible.map(s => `<li><button type="button" class="gm-item" data-act="map-pick" data-id="${s.id}" aria-pressed="${s.id === sel?.id}">
      <span class="gm-num" style="background:${mapColor(s)}">${s.plan === "rain" ? "雨" : mapOrder(s)}</span>
      <span class="gm-txt"><b>${esc(s.name)}</b><small>${md(s.day)} ${esc(s.time || "")}・${CAT[s.category] || ""}${onMap(s) ? "" : "・沒標在地圖上"}</small></span></button></li>`).join("");
  return topbar("地圖", `${visible.length} 個地點`) + `<main class="page map-page">
    <div class="chips" role="group" aria-label="篩選地點">${chips.map(([k, l]) =>
      `<button type="button" class="chipbtn" data-act="map-filter" data-filter="${k}" aria-pressed="${k === filter}">${esc(l)}</button>`).join("")}</div>
    <div class="ovmap-wrap">
      <div id="ovmap" class="ovmap" role="region" aria-label="行程總覽地圖，點編號看那一站"></div>
      <div class="ov-ctrl">
        <button type="button" class="ov-btn" data-act="ov-locate" aria-pressed="false">${icon("nav")}<span>我的位置</span></button>
        <button type="button" class="ov-btn" data-act="ov-fit">${icon("map")}<span>看全部</span></button>
      </div>
      <p id="ov-me" class="ov-me" hidden></p>
    </div>
    ${missing.length ? `<p class="callout soft small">${icon("info")}<span>${missing.length} 站沒有位置，所以沒標在地圖上：${missing.slice(0, 4).map(s => esc(s.name)).join("、")}${missing.length > 4 ? "…" : ""}。</span></p>
      ${S.mode === "synced" ? `<button class="btn wide" type="button" data-act="auto-geo-all">${icon("map")}自動幫這 ${missing.length} 站找位置</button>` : ""}` : ""}
    ${mapSheet(sel)}
    ${visible.length ? `<div class="section-h"><h3>${isDay ? "這天的地點" : "地點"}</h3><span>點一下看那一站</span></div>
      <ol class="gm-list">${items}</ol>
      ${isDay && visible.length > 1 ? `<a class="btn wide" href="${gmapRoute(visible)}" target="_blank" rel="noopener">在 Google 地圖看這天的路線</a>` : ""}`
      : `<div class="empty"><h3>這裡還沒有地點</h3><p>在「行程」新增一站，就會出現在這裡。</p></div>`}
  </main>`;
}

/* ---------- 清單 ---------- */
export function listView(state) {
  const tab = state.tab || "shared";
  const me = myId();
  const items = S.checklist.filter(c => tab === "shared" ? c.scope === "shared" : c.scope === "mine" && (!c.owner_id || !me || c.owner_id === me));
  const groups = [];
  items.forEach(c => { let g = groups.find(x => x.name === c.group_name); if (!g) groups.push(g = { name: c.group_name, items: [] }); g.items.push(c); });
  const done = items.filter(c => c.done).length;
  const first = S.days[0]?.date;
  const diff = first ? Math.round((Date.parse(first) - Date.parse(kstNow().date)) / 864e5) : 0;
  const groupNames = [...new Set(S.checklist.filter(c => c.scope === tab).map(c => c.group_name))];
  return topbar("清單", diff > 0 ? `出發還有 ${diff} 天` : "", true) + `<main class="page">
    <div class="seg big" role="group" aria-label="切換清單">
      <button type="button" data-act="list-tab" data-tab="shared" aria-pressed="${tab === "shared"}">大家一起</button>
      <button type="button" data-act="list-tab" data-tab="mine" aria-pressed="${tab === "mine"}">我的</button></div>
    <div class="progress"><div class="progress-row"><span>已經準備好</span><b>${done} / ${items.length}</b></div>
      <div class="bar"><i style="width:${items.length ? Math.round(done / items.length * 100) : 0}%"></i></div></div>
    ${tab === "shared" && S.mode !== "synced" ? `<p class="callout soft">${icon("user")}<span>還沒加入旅行，清單只存在這支手機。<button class="link-btn inline" type="button" data-act="open-join">加入</button></span></p>` : ""}
    ${groups.map(g => `<section class="check-group"><h3>${esc(g.name)}</h3><ul>${g.items.map(c => {
      const who = c.assignee ? memberById(c.assignee) : null;
      return `<li class="check${c.done ? " done" : ""}">
        <input type="checkbox" id="c-${c.id}" data-act="check-item" data-id="${c.id}" ${c.done ? "checked" : ""}>
        <label for="c-${c.id}">${esc(c.name)}</label>
        ${tab === "shared" && S.mode === "synced" ? (who ? `<button type="button" class="who" data-act="unclaim" data-id="${c.id}" aria-label="${esc(who.display_name)} 帶，點一下取消">${avatar(who, 24)}<span>${esc(who.display_name)}</span></button>`
          : `<button type="button" class="claim" data-act="claim" data-id="${c.id}">我帶</button>`) : ""}
        ${editMode ? `<button type="button" class="del" data-act="del-item" data-id="${c.id}" aria-label="刪除 ${esc(c.name)}">${icon("close")}</button>` : ""}
      </li>`; }).join("")}</ul></section>`).join("")}
    ${!items.length ? `<div class="empty"><h3>${tab === "mine" ? "列出你自己要帶的東西" : "列出大家要準備的東西"}</h3><p>${tab === "mine" ? "只有你看得到。" : "誰要帶什麼，按「我帶」認領。"}</p></div>` : ""}
    <form class="add-item" data-act="add-item">
      <label class="sr-only" for="new-item">新增項目</label>
      <input id="new-item" name="name" type="text" placeholder="暖暖包" maxlength="60" autocomplete="off">
      <label class="sr-only" for="new-group">分類</label>
      <select id="new-group" name="group">${(groupNames.length ? groupNames : [tab === "mine" ? "我自己的" : "其他"]).map(g => `<option>${esc(g)}</option>`).join("")}<option value="__new">新分類…</option></select>
      <button class="btn primary" type="submit">新增</button>
    </form>
  </main>`;
}

/* ---------- 回憶 ---------- */
export function memoriesView(state) {
  const first = S.days[0]?.date;
  const today = kstNow().date;
  const date = state.date || (S.days.find(d => d.date === today)?.date) || first;
  const ms = S.memories.filter(m => m.day === date);
  const photoCount = S.memories.reduce((n, m) => n + (m.photos?.length || 0), 0);
  let body = `<div class="chips" role="group" aria-label="選擇哪一天">${S.days.map(d =>
    `<button type="button" class="chipbtn" data-act="mem-day" data-date="${d.date}" aria-pressed="${d.date === date}">${md(d.date)} ${esc(d.title || "")}</button>`).join("")}</div>`;
  if (S.mode === "local") {
    body += `<div class="empty"><h3>回憶要加入旅行才能用</h3><p>照片和心得會存在大家共用的空間，只有加入的人看得到。</p>
      <button class="btn primary" type="button" data-act="open-join">加入旅行</button></div>`;
  } else if (!ms.length) {
    body += `<div class="empty"><h3>${md(date)} 還沒有回憶</h3><p>拍了照片、吃了好吃的，按右下角加進來。</p></div>`;
  } else {
    const groups = [];
    ms.slice().reverse().forEach(m => { const k = m.stop_name || "其他"; let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, ms: [], time: S.stops.find(s => s.id === m.stop_id)?.time || "" }); g.ms.push(m); });
    groups.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    body += groups.map(g => `<section class="mem-group"><div class="mem-h">${g.time ? `<b>${esc(g.time)}</b>` : ""}<h3>${esc(g.k)}</h3></div>
      ${g.ms.map(m => {
        const a = memberById(m.author_id);
        const mine = m.author_id === myId();
        const n = m.photos?.length || 0;
        return `<article class="mem">
          ${n ? `<div class="ph-grid n${Math.min(n, 3)}">${m.photos.map(p => `<button type="button" class="ph" data-act="photo" data-path="${esc(p)}" aria-label="看大圖"><img data-photo="${esc(p)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
          ${m.note ? `<div class="note">${avatar(a, 30)}<p>${esc(m.note)}</p></div>` : `<div class="note bare">${avatar(a, 24)}<span>${esc(a?.display_name || "")}</span></div>`}
          ${mine && editMode ? `<button type="button" class="mem-del" data-act="del-mem" data-id="${m.id}" aria-label="刪除這則回憶">${icon("trash")}</button>` : ""}
        </article>`; }).join("")}</section>`).join("");
  }
  const fab = S.mode === "synced" ? `<button type="button" class="fab" data-act="new-mem" data-date="${date}">${icon("plus", "currentColor", 2.2)}加照片或心得</button>` : "";
  return topbar("回憶", S.mode === "local" ? "" : `${S.members.length} 人・${photoCount} 張照片`, S.mode === "synced" && S.memories.some(m => m.author_id === myId())) + `<main class="page">${body}</main>${fab}`;
}

/* ---------- sheets ---------- */
export function joinSheet(err) {
  return `<h2>加入旅行</h2><p class="muted">輸入你的名字和揪團的人給的通關碼。加入後，行程、清單、照片會同步到每個人的手機。</p>
    <form data-act="join" class="form">
      <label>你的名字<input name="name" type="text" maxlength="20" required autocomplete="nickname" placeholder="小美" value="${esc(S.me?.display_name || "")}"></label>
      <label>通關碼<input name="code" type="text" required autocomplete="off" autocapitalize="off" placeholder="揪團的人會給你"></label>
      ${err ? `<p class="form-err" role="alert">${esc(err)}</p>` : ""}
      <button class="btn primary wide" type="submit">加入</button>
    </form>`;
}

export function meSheet() {
  return `<h2>${esc(S.me?.display_name || "")}</h2>
    <form data-act="rename" class="form"><label>改名字<input name="name" type="text" maxlength="20" required value="${esc(S.me?.display_name || "")}"></label>
      <button class="btn" type="submit">儲存</button></form>
    <h3>一起旅行的人</h3><ul class="people">${S.members.map(m => `<li>${avatar(m, 30)}<span>${esc(m.display_name)}</span>${m.user_id === myId() ? `<small>你</small>` : ""}</li>`).join("")}</ul>
    <p class="muted">${S.mode === "synced" ? "已連線，大家的修改會馬上同步。" : "現在離線，看的是上次存下來的資料。"}</p>
    <button class="btn wide" type="button" data-act="open-info">旅行資訊</button>
    <button class="btn wide" type="button" data-act="open-export">${icon("list")}匯出成 PDF</button>
    <button class="btn wide danger" type="button" data-act="leave">在這支手機登出</button>
    <p class="muted small">登出後要再用通關碼加入一次，你之前加的照片和心得不會不見，但會變成另一個身分。</p>`;
}

export function infoSheet() {
  const t = S.cfg || {};
  const info = S.info || {};
  const synced = S.mode === "synced";
  const f = (t.flights || []).map(x => `<li><b>${md(x.date)}（${weekday(x.date)}）</b>${esc(x.airline)} ${esc(x.flight)}<br>${esc(x.from)} ${x.dep} → ${esc(x.to)} ${x.arr}</li>`).join("");
  const stays = (info.stays || []).map((st, i) => `<li class="info-item">
      <div><b class="nm">${esc(st.name)}</b>${st.check_in ? `<small>${md(st.check_in)} 入住${st.check_out ? `・${md(st.check_out)} 退房` : ""}</small>` : ""}</div>
      ${st.address_ko ? `<p lang="ko">${esc(st.address_ko)}</p>` : ""}${st.phone ? `<p>電話 ${esc(st.phone)}</p>` : ""}${st.note ? `<p class="muted">${esc(st.note)}</p>` : ""}
      <div class="actions">${naverBtn({ query: st.address_ko || st.name, name: st.name })}
      ${st.address_ko ? `<button class="btn" type="button" data-act="show-driver" data-kind="stay" data-idx="${i}">給司機看</button>` : ""}</div></li>`).join("");
  const r = info.rental || {};
  const rentalRows = [["公司", r.company], ["訂位代號", r.booking], ["取車", [r.pickup_time, r.pickup_place].filter(Boolean).join("・")], ["還車", [r.return_time, r.return_place].filter(Boolean).join("・")], ["電話", r.phone], ["備註", r.note]].filter(x => x[1]);
  const bookings = (info.bookings || []).filter(b => b.label || b.code);
  const phrases = [["這個請給我", "이거 주세요", "i-geo ju-se-yo"], ["請結帳", "계산해 주세요", "gye-san-hae ju-se-yo"], ["可以外帶嗎？", "포장 돼요?", "po-jang dwae-yo"],
    ["請不要太辣", "안 맵게 해 주세요", "an maep-ge hae ju-se-yo"], ["廁所在哪裡？", "화장실 어디예요?", "hwa-jang-sil eo-di-ye-yo"], ["謝謝", "감사합니다", "gam-sa-ham-ni-da"]];
  return `<h2>旅行資訊</h2>
    ${synced ? `<button class="btn wide" type="button" data-act="edit-info">${icon("edit")}編輯住宿、租車和訂位代號</button>` : ""}
    <h3>住宿</h3>${stays ? `<ul class="info-list rich">${stays}</ul>` : `<p>${esc(t.lodging?.area || "待補")}</p><p class="muted small">${synced ? "按上面的「編輯」加入住宿和韓文地址，就能直接導航、給司機看。" : "加入旅行後可以填住宿和韓文地址。"}</p>`}
    <h3>租車</h3>${rentalRows.length ? `<dl class="kv">${rentalRows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
      <p class="muted small">要帶：${esc((t.transport?.docs || []).join("、"))}。還車前要加滿油。</p>
    ${bookings.length ? `<h3>訂位代號</h3><dl class="kv">${bookings.map(b => `<dt>${esc(b.label || "")}</dt><dd><b class="code">${esc(b.code || "")}</b></dd>`).join("")}</dl>` : ""}
    <h3>航班</h3><ul class="info-list">${f}</ul>
    <h3>導航</h3><p class="small">「導航」會打開 <b>Naver Map</b> app（有中文介面），沒裝的話會開網頁版。出發前先裝好、下載濟州地圖。Kakao 按鈕留著當備用。</p>
    <h3>緊急電話</h3><ul class="info-list">
      <li><b>112</b> 警察</li><li><b>119</b> 火警、救護車</li><li><b>1330</b> 韓國觀光公社旅遊熱線（有中文）</li></ul>
    <h3>實用韓文</h3><ul class="phrases">${phrases.map(([zh, ko, ro]) => `<li><span>${zh}</span><b lang="ko">${ko}</b><small>${ro}</small></li>`).join("")}</ul>`;
}

function stayRow(st, i, dateOpts, isNew) {
  return `<div class="sub-form stay-row" data-i="${i}">
        <div class="opt-edit-h"><b>${isNew ? "新的住宿" : "住宿"}</b><button class="link-btn danger" type="button" data-act="del-stay-row">刪除</button></div>
        <label>名稱<input name="stay_name_${i}" type="text" maxlength="60" value="${esc(st.name || "")}" placeholder="${isNew ? "飯店或民宿名稱" : ""}"></label>
        <div class="row2"><label>入住<select name="stay_in_${i}">${dateOpts(st.check_in)}</select></label>
          <label>退房<select name="stay_out_${i}">${dateOpts(st.check_out)}</select></label></div>
        <label>韓文地址（給司機看、導航用）<input name="stay_addr_${i}" type="text" maxlength="120" lang="ko" value="${esc(st.address_ko || "")}" placeholder="제주특별자치도 제주시 …"></label>
        <div class="row2"><label>電話<input name="stay_phone_${i}" type="tel" maxlength="30" value="${esc(st.phone || "")}"></label>
          <label>備註<input name="stay_note_${i}" type="text" maxlength="60" value="${esc(st.note || "")}" placeholder="15:00 入住"></label></div>
      </div>`;
}

export function infoEditSheet() {
  const info = S.info || {};
  const stays = [...(info.stays || []), {}];
  const dates = S.days.map(d => d.date);
  const last = dates.at(-1);
  const allDates = [...dates];
  if (last) { const d = new Date(last + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); allDates.push(d.toISOString().slice(0, 10)); }
  const dateOpts = (v) => `<option value="">—</option>` + allDates.map(d => `<option value="${d}"${v === d ? " selected" : ""}>${md(d)}（${weekday(d)}）</option>`).join("");
  const r = info.rental || {};
  const bookings = [...(info.bookings || []), {}, {}];
  return `<h2>編輯旅行資訊</h2>
    <form data-act="save-info" class="form" data-stays="${stays.length}" data-bookings="${bookings.length}">
      <h3>住宿</h3>
      <p class="muted small">住不只一間就每間各填一筆，入住、退房日期填對，每天就會自動顯示當晚住哪裡。</p>
      <div id="stay-rows">${stays.map((st, i) => stayRow(st, i, dateOpts, i === stays.length - 1)).join("")}</div>
      <button class="btn wide" type="button" data-act="add-stay-row">${icon("plus")}再加一間住宿</button>
      <template id="stay-tpl">${stayRow({}, "__I__", dateOpts, true)}</template>
      <h3>租車</h3>
      <div class="sub-form">
        <div class="row2"><label>公司<input name="r_company" type="text" maxlength="40" value="${esc(r.company || "")}"></label>
          <label>訂位代號<input name="r_booking" type="text" maxlength="40" value="${esc(r.booking || "")}"></label></div>
        <div class="row2"><label>取車時間<input name="r_pickup_time" type="text" maxlength="30" value="${esc(r.pickup_time || "")}" placeholder="11/26 07:00"></label>
          <label>取車地點<input name="r_pickup_place" type="text" maxlength="60" value="${esc(r.pickup_place || "")}" placeholder="機場租車大樓"></label></div>
        <div class="row2"><label>還車時間<input name="r_return_time" type="text" maxlength="30" value="${esc(r.return_time || "")}" placeholder="11/29 18:05"></label>
          <label>還車地點<input name="r_return_place" type="text" maxlength="60" value="${esc(r.return_place || "")}"></label></div>
        <div class="row2"><label>電話<input name="r_phone" type="tel" maxlength="30" value="${esc(r.phone || "")}"></label>
          <label>備註<input name="r_note" type="text" maxlength="60" value="${esc(r.note || "")}"></label></div>
      </div>
      <h3>訂位代號</h3>
      ${bookings.map((b, i) => `<div class="row2"><label>項目<input name="b_label_${i}" type="text" maxlength="30" value="${esc(b.label || "")}" placeholder="機票（去程）"></label>
        <label>代號<input name="b_code_${i}" type="text" maxlength="40" value="${esc(b.code || "")}"></label></div>`).join("")}
      <p class="muted small">名稱或項目清空就會刪掉那一筆。這些資料只有加入旅行的人看得到。</p>
      <button class="btn primary wide" type="submit">儲存</button>
    </form>`;
}

export function stopSheet(s, isNew) {
  const cats = CAT_GROUPS.map(([g, ks]) => `<optgroup label="${g}">${ks.map(k => `<option value="${k}"${s.category === k ? " selected" : ""}>${CAT[k]}</option>`).join("")}</optgroup>`).join("");
  return `<h2>${isNew ? "新增一站" : "編輯這站"}</h2>
    <form data-act="save-stop" data-id="${s.id}" class="form">
      <div class="row2"><label>時間<input name="time" type="time" value="${esc(s.time || "")}"></label>
        <label>類型<select name="category">${cats}</select></label></div>
      <label>名稱<input name="name" type="text" required maxlength="80" value="${esc(s.name)}" placeholder="城山日出峰"></label>
      <label>韓文名稱（導航用）<input name="name_ko" type="text" maxlength="80" value="${esc(s.name_ko || "")}" placeholder="성산일출봉" lang="ko"></label>
      <div class="row2"><label>停留（分鐘）<input name="duration_min" type="number" min="0" max="600" step="1" inputmode="numeric" value="${s.duration_min ?? ""}"></label>
        <label>從上一站開車（分鐘）<input name="drive_min" placeholder="有精確位置會自動算" type="number" min="0" max="300" step="1" inputmode="numeric" value="${s.drive_min ?? ""}"></label></div>
      <fieldset class="loc"><legend>位置</legend>
        <p class="muted small">打好名稱會自動用 Google 地圖找位置（跟下面預覽的地圖一樣）。找錯了按「不是這個」，或貼 Google 地圖連結。</p>
        <div id="loc-preview">${gmapFrame(gmapQuery(s), 15, "位置預覽", "gmap small")}</div>
        <p id="loc-state" class="small loc-state" aria-live="polite">${locState(s.lat, s.extra?.geo, s.extra?.geo_label)}</p>
        <div class="maplink">
          <p class="small"><b>要更準：</b>在 Google 地圖找到這個地方 → 分享 → 複製連結，回來按「貼上連結」。</p>
          <div class="maplink-row"><input name="maplink" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" aria-label="Google 地圖連結" autocomplete="off">
            <button class="btn primary" type="button" data-act="pick-paste">貼上連結</button></div>
          <div id="link-status" class="small" aria-live="polite"></div>
        </div>
        <input type="hidden" name="geo" value="${esc(s.extra?.geo || "")}"><input type="hidden" name="geo_label" value="${esc(s.extra?.geo_label || "")}"><input type="hidden" name="lat" value="${s.lat ?? ""}"><input type="hidden" name="lng" value="${s.lng ?? ""}">
      </fieldset>
      <label>小提醒（一行一個）<textarea name="tips" rows="3" maxlength="400">${esc((s.tips || []).join("\n"))}</textarea></label>
      <fieldset class="opt-edit-box"><legend>候選餐廳（到時候再選）</legend>
        <p class="muted small">放兩家以上，當天在行程裡按「就吃這家」決定。只有一家就留空，用上面的名稱就好。</p>
        <div id="opt-rows">${(s.options || []).map((o, k) => optEditRow(o, k)).join("")}</div>
        <button class="btn wide" type="button" data-act="add-opt">${icon("plus")}加一家候選</button>
      </fieldset>
      <button class="btn primary wide" type="submit">儲存</button>
      ${isNew ? "" : `<div class="row-btns">
        <button class="btn" type="button" data-act="move-stop" data-id="${s.id}" data-dir="-1">${icon("up")}往前</button>
        <button class="btn" type="button" data-act="move-stop" data-id="${s.id}" data-dir="1">${icon("down")}往後</button>
        <button class="btn danger" type="button" data-act="del-stop" data-id="${s.id}">${icon("trash")}刪除</button></div>`}
    </form>`;
}

export function daySheet(d) {
  return `<h2>編輯 ${md(d.date)}</h2>
    <form data-act="save-day" data-date="${d.date}" class="form">
      <label>這天叫什麼<input name="title" type="text" maxlength="12" value="${esc(d.title || "")}" placeholder="東部"></label>
      <label>一句話介紹<input name="tagline" type="text" maxlength="40" value="${esc(d.tagline || "")}" placeholder="日出、海女和牛島"></label>
      <label>雨天備案說明（選填）<input name="rain_note" type="text" maxlength="60" value="${esc(d.rain_note || "")}" placeholder="下雨改去美術館，晚餐照舊"></label>
      <fieldset class="theme-pick"><legend>封面插畫</legend>
        <div class="theme-grid">
          <label class="theme-opt theme-upload"><input type="radio" name="theme" value="${isPhoto(d.theme) ? esc(d.theme) : "upload"}"${isPhoto(d.theme) ? " checked" : ""}>
            ${isPhoto(d.theme) ? `<img data-photo="${esc(d.theme.slice(6))}" alt="">` : `<span class="up-ic">${icon("photo")}</span>`}
            <span>${isPhoto(d.theme) ? "你的照片（點這裡換）" : "用自己的照片"}</span>
            <input type="file" name="cover_file" accept="image/*" aria-label="選一張照片當封面"></label>
          ${Object.entries(THEMES).map(([k, v]) => `<label class="theme-opt"><input type="radio" name="theme" value="${k}"${(d.theme || "oreum") === k ? " checked" : ""}>
          <svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${artSvg(k, "t-" + k)}</svg><span>${v}</span></label>`).join("")}</div>
      </fieldset>
      <button class="btn primary wide" type="submit">儲存</button></form>`;
}

export function memSheet(date) {
  const stops = [...stopsFor(date, "sun"), ...stopsFor(date, "rain")].filter(isPlace);
  return `<h2>加照片或心得</h2><p class="muted">${md(date)}（${weekday(date)}）</p>
    <form data-act="save-mem" data-date="${date}" class="form">
      <label>在哪一站<select name="stop"><option value="">其他</option>${stops.map(s => `<option value="${s.id}">${esc(s.time || "")} ${esc(s.name)}</option>`).join("")}</select></label>
      <fieldset class="seg-field"><legend>照片</legend>
        <div class="photo-btns">
          <label class="btn primary">${icon("photo")}拍照<input class="vh" name="cam" type="file" accept="image/*" capture="environment"></label>
          <label class="btn">${icon("list")}從相簿選<input class="vh" name="photos" type="file" accept="image/*" multiple></label></div>
        <div id="mem-picked" class="mem-picked"></div>
        <p class="muted small">可以連續拍好幾張，拍完再按「放進回憶」。</p>
      </fieldset>
      <label>心得<textarea name="note" rows="3" maxlength="500" placeholder="橘子超甜，摘了快 2 公斤"></textarea></label>
      <p class="form-err" role="alert" hidden></p>
      <button class="btn primary wide" type="submit">放進回憶</button></form>`;
}

/* ---------- location picker ---------- */
export function locState(lat, geo, label) {
  if (lat == null || lat === "") return "還沒有精確位置：打好名稱會自動找";
  if (geo === "auto") return `📍 自動找到：${esc(label || "")} <button class="link-btn" type="button" data-act="pick-clear" data-wrong="1">不是這個</button>`;
  if (geo === "gmap") return `📍 用 Google 地圖找到：${esc(label || "")} <button class="link-btn" type="button" data-act="pick-clear" data-wrong="1">不是這個</button>`;
  return `📍 已放精確位置 <button class="link-btn" type="button" data-act="pick-clear">清除</button>`;
}

/* ---------- stays & trip info ---------- */
export function stayFor(date) {
  return (S.info?.stays || []).find(st => st.check_in && st.check_out && st.check_in <= date && date < st.check_out) || null;
}
function stayCard(date) {
  const st = stayFor(date);
  if (!st) return "";
  return `<section class="card stay-card"><p class="muted small">今晚住</p><h3>${esc(st.name)}</h3>
    ${st.address_ko ? `<p lang="ko">${esc(st.address_ko)}</p>` : ""}
    <div class="actions">${naverBtn({ query: st.address_ko || st.name, name: st.name })}
      ${st.address_ko ? `<button class="btn" type="button" data-act="show-driver" data-kind="stay" data-idx="${S.info.stays.indexOf(st)}">給司機看</button>` : ""}</div></section>`;
}
export function driverSheet(name, address) {
  return `<div class="driver"><p class="muted">請載我到這個地址</p><p class="driver-ko" lang="ko">이 주소로 가 주세요</p>
    <b lang="ko">${esc(address)}</b>${name ? `<p class="driver-name">${esc(name)}</p>` : ""}</div>`;
}

let optSeq = 100;
export function optEditRow(o = {}, orig = -1) {
  const k = optSeq++;
  return `<div class="opt-edit" data-orig="${orig}">
    <div class="opt-edit-h"><b>候選</b><button class="link-btn danger" type="button" data-act="del-opt">移除</button></div>
    <label>名稱<input name="o_name_${k}" type="text" maxlength="80" value="${esc(o.name || "")}" placeholder="例：한림칼국수（海螺刀削麵）"></label>
    <label>韓文名稱（導航用）<input name="o_ko_${k}" type="text" maxlength="80" lang="ko" value="${esc(o.name_ko || "")}" placeholder="한림칼국수"></label>
    <label>營業時間<input name="o_hours_${k}" type="text" maxlength="80" value="${esc(o.hours || "")}" placeholder="10:00–20:00"></label>
    <div class="closed-days" role="group" aria-label="公休日"><span class="small muted">公休</span>${WEEK.map((w, d) =>
      `<label class="day-chk"><input type="checkbox" name="o_closed_${k}" value="${d}"${(o.closed || []).includes(d) ? " checked" : ""}><span>${w}</span></label>`).join("")}</div>
    <label>備註<input name="o_note_${k}" type="text" maxlength="120" value="${esc(o.note || "")}" placeholder="招牌菜、要不要排隊"></label>
  </div>`;
}
