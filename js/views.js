/* Render functions. Each returns HTML for one tab or sheet. */
import { S, memberById, myId } from "./store.js";
import { ART, makeProjection, coastPath, PLACE_LABELS } from "./art.js";
import {
  esc, toMin, hhmm, md, weekday, wdNum, kstNow, sunTimes, wmo, wxIcon, wxAdvice, cachedWeather,
  icon, CAT, CAT_GROUPS, FOOD_CATS, getDemoTime, WEEK
} from "./util.js";

export const DAY_COLORS = ["#B4547E", "#4E8A5B", "#C25F0C", "#2F64A8", "#6B8A2E", "#8A5A2E"];
export const RAIN_COLOR = "#6B6F8A";
const THEMES = { dawn: "清晨抵達", oreum: "火山丘", south: "南部海岸", west: "西部夕陽" };

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
  return naverBtn(t, cls, s.extra?.search_q ? "找地點" : "導航") + (compact ? "" : kakaoBtn(t));
}
const optTarget = o => ({ query: o.q || o.name_ko, name: o.name_ko || o.name });

/* ---------- weather card ---------- */
export function weatherCard(day, w) {
  const pt = day.weather_point || { lat: 33.38, lng: 126.53 };
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
      <p class="wx-tip">${esc(wxAdvice(w, picking))}</p>
      <p class="wx-src">天氣預報來自 Open-Meteo，每 3 小時更新</p></section>`;
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
    const pt = day.weather_point || { lat: 33.38, lng: 126.53 };
    const sun = sunTimes(day.date, pt.lat, pt.lng);
    const w = cachedWeather(day.date);
    if (next) {
      const opt = next.options?.[0];
      body += `<section class="next-card">
        <svg class="art" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(ART[day.theme] || ART.oreum)()}</svg>
        <div class="next-body">
          <div class="next-meta"><span class="pill">下一站</span><b>${esc(next.time || "")}</b>${next.drive_min ? `<span>・開車約 ${next.drive_min} 分</span>` : ""}</div>
          <h2>${esc(next.name)}</h2>
          ${opt ? `<p>${esc(opt.name)}${next.options.length > 1 ? ` 等 ${next.options.length} 家` : ""}</p>` : next.name_ko ? `<p lang="ko">${esc(next.name_ko)}</p>` : ""}
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
      <svg class="art" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(ART[day.theme] || ART.oreum)()}</svg>
      <div class="shade"></div>
      ${editable() ? `<button class="cover-edit" type="button" data-act="edit-day" data-date="${day.date}">${icon("edit")}編輯這天</button>` : ""}
      <div class="text"><div class="dayno">DAY ${day.day}・${md(day.date)}（${weekday(day.date)}）</div>
        <h2>${esc(day.title || "還沒取名")}</h2><p>${esc(day.tagline || "")}</p>
        ${places.length ? `<p class="stats">${places.length} 站・${esc(list[0]?.time || "")} 出發</p>` : ""}</div></section>`;
  html += `<div id="wx-slot" data-date="${day.date}">${weatherCard(day, cachedWeather(day.date))}</div>`;
  if (hasRain(day.date) || editable()) {
    const w = cachedWeather(day.date);
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
  if (list.some(s => s.lat != null)) html += dayMap(day, list, nextIdx);
  else if (places.length) html += `<p class="callout soft">${icon("map")}<span>這天的站都還沒放位置，所以沒有路線圖。打開右上角「編輯」，在每站的鉛筆裡點地圖放位置。</span></p>`;
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
  if (editable()) html += `<button class="add-stop" type="button" data-act="new-stop" data-date="${day.date}" data-plan="${plan}">${icon("plus")}新增一站${plan === "rain" ? "（雨天備案）" : ""}</button>`;
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
  const opts = (s.options || []).map(o => {
    const closed = (o.closed || []).includes(wd);
    return `<li class="opt${closed ? " is-closed" : ""}"><div class="opt-name">${esc(o.name)}</div>
      <div class="opt-hours">${closed ? `<b class="bad">${WEEK[wd]}公休</b>　` : ""}${esc(o.hours)}${o.verified ? "" : `<span class="unv">待確認</span>`}</div>
      ${o.note ? `<div class="opt-note">${esc(o.note)}</div>` : ""}
      ${o.name_ko && o.name !== "改在機場吃" ? `<div class="opt-act">${naverBtn(optTarget(o), "btn primary", "Naver 導航")}${kakaoBtn(optTarget(o))}</div>` : ""}</li>`;
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
      ${editable() && !move && s.lat == null ? `<p class="warn soft">還沒放位置：不會出現在地圖上，按鉛筆補上</p>` : ""}
      ${editable() && s._early ? `<p class="warn">時間比上一站早：按鉛筆改時間</p>` : ""}
      ${s.extra?.warn === "tight" ? `<p class="warn">⚠ 到機場的時間偏緊</p>` : ""}
      ${sunsetBlock}
      ${tips.length ? `<ul class="tips">${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${opts ? `<p class="opt-h">挑一家</p><ul class="opts">${opts}</ul>` : ""}
      ${(nav || !move) ? `<div class="actions">${nav}${move ? "" : `<button class="btn check" type="button" data-act="check" data-id="${s.id}" data-date="${day.date}" aria-pressed="${done}">${done ? "✓ 去過了" : "去過了"}</button>`}</div>` : ""}
      ${editor && editor.user_id !== myId() && s.updated_at ? `<p class="edited-by">${esc(editor.display_name)} 改過</p>` : ""}
    </div></li>`;
}

function dayMap(day, list, nextIdx) {
  const pinned = list.map((s, i) => ({ s, i })).filter(o => o.s.lat != null && (isPlace(o.s) || /機場/.test(o.s.name)));
  if (!pinned.length) return "";
  const pad = 0.035;
  const lngs = pinned.map(o => o.s.lng), lats = pinned.map(o => o.s.lat);
  let b = { lng0: Math.min(...lngs) - pad, lng1: Math.max(...lngs) + pad, lat0: Math.min(...lats) - pad, lat1: Math.max(...lats) + pad };
  const minSpan = 0.22;
  if (b.lng1 - b.lng0 < minSpan) { const c = (b.lng0 + b.lng1) / 2; b.lng0 = c - minSpan / 2; b.lng1 = c + minSpan / 2; }
  const wantLat = (b.lng1 - b.lng0) * 0.835 * 0.5;
  if (b.lat1 - b.lat0 < wantLat) { const c = (b.lat0 + b.lat1) / 2; b.lat0 = c - wantLat / 2; b.lat1 = c + wantLat / 2; }
  const P = makeProjection(b, 520, 18);
  const order = new Map(); let n = 0;
  list.forEach((s, i) => { if (isPlace(s)) order.set(i, ++n); });
  const route = pinned.map(o => P.px(o.s.lng, o.s.lat).map(v => v.toFixed(1)).join(",")).join(" ");
  const others = S.stops.filter(s => s.day !== day.date && s.plan === "sun" && s.lat != null && isPlace(s));
  return `<div class="map"><svg viewBox="0 0 ${P.width} ${P.height}" role="img" aria-label="${esc(md(day.date))} 的路線圖">
    <path class="island" d="${coastPath(P.px)}" vector-effect="non-scaling-stroke"/>
    ${PLACE_LABELS.map(l => { const [x, y] = P.px(l.lng, l.lat); return `<text class="label" style="font-size:16px" x="${x.toFixed(0)}" y="${(y + l.dy * 1.3).toFixed(0)}" text-anchor="middle">${l.t}</text>`; }).join("")}
    ${others.map(s => { const [x, y] = P.px(s.lng, s.lat); return `<circle class="ghost" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; }).join("")}
    ${pinned.length > 1 ? `<polyline class="route" points="${route}" style="stroke-width:3.5"/>` : ""}
    ${pinned.map(({ s, i }) => { const [x, y] = P.px(s.lng, s.lat);
      const cls = ["pin", isDone(day.date, s.id) ? "is-done" : "", i === nextIdx ? "is-next" : ""].join(" ");
      return `<g class="${cls}" data-act="jump" data-id="${s.id}" tabindex="0" role="button" aria-label="跳到 ${esc(s.name)}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" style="stroke-width:3"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}" style="font-size:15px">${order.get(i) ?? "✈"}</text></g>`; }).join("")}
  </svg></div><p class="map-note">點地圖上的編號，會跳到那一站${(() => { const miss = list.filter(s => isPlace(s) && s.lat == null).length; return miss ? `・<b>${miss} 站還沒放位置</b>` : ""; })()}</p>`;
}

export const APP_VERSION = "12.4";
export function infoFooter() {
  const t = S.cfg || {};
  const f = (t.flights || []).map(x => `<dt>${md(x.date)}</dt><dd>${esc(x.airline)} ${esc(x.flight)}　${esc(x.from)} ${x.dep} → ${esc(x.to)} ${x.arr}</dd>`).join("");
  const dn = t.drive_note ? `<dt>車程</dt><dd>${esc(t.drive_note)}</dd>` : "";
  return `<footer class="info"><h2>航班與提醒</h2><dl>${f}${dn}</dl><button class="link-btn" type="button" data-act="open-info">更多：住宿、緊急電話、實用韓文</button><p class="ver">版本 ${APP_VERSION}</p></footer>`;
}

/* ---------- 地圖 ---------- */
export function mapView(state) {
  const filter = state.filter || "all";
  const sunStops = S.stops.filter(s => s.lat != null && isPlace(s));
  let visible = sunStops.filter(s => {
    if (filter === "all") return s.plan === "sun";
    if (filter === "food") return s.plan === "sun" && FOOD_CATS.includes(s.category);
    if (filter === "rain") return s.plan === "rain";
    return s.day === filter && s.plan === "sun";
  });
  const daysWithStops = S.days.filter(d => S.stops.some(s => s.day === d.date && s.plan === "sun" && s.lat != null));
  const chips = [["all", "全部"], ...daysWithStops.map(d => [d.date, `${md(d.date)} ${d.title || ""}`.trim()]), ["food", "吃的"], ["rain", "雨天備案"]];
  const pts = visible.length ? visible : sunStops;
  let b = { lng0: 126.15, lng1: 126.97, lat0: 33.18, lat1: 33.58 };
  if (pts.length) {
    const lngs = pts.map(s => s.lng), lats = pts.map(s => s.lat), pad = 0.04;
    b = { lng0: Math.min(...lngs) - pad, lng1: Math.max(...lngs) + pad, lat0: Math.min(...lats) - pad, lat1: Math.max(...lats) + pad };
    const minSpan = 0.3;
    if (b.lng1 - b.lng0 < minSpan) { const c = (b.lng0 + b.lng1) / 2; b.lng0 = c - minSpan / 2; b.lng1 = c + minSpan / 2; }
    const wantLat = (b.lng1 - b.lng0) * 0.835 * 0.8;
    if (b.lat1 - b.lat0 < wantLat) { const c = (b.lat0 + b.lat1) / 2; b.lat0 = c - wantLat / 2; b.lat1 = c + wantLat / 2; }
  }
  const P = makeProjection(b, 520, 22);
  const sel = visible.find(s => s.id === state.selected) || visible[0];
  const orderOf = s => stopsFor(s.day, s.plan).filter(isPlace).indexOf(s) + 1;
  const pins = visible.map(s => {
    const [x, y] = P.px(s.lng, s.lat);
    const col = s.plan === "rain" ? RAIN_COLOR : dayColor(s.day);
    return `<button type="button" class="mpin${s.id === sel?.id ? " on" : ""}" data-act="map-pick" data-id="${s.id}" aria-label="${esc(s.name)}" aria-pressed="${s.id === sel?.id}"
      style="left:${(x / P.width * 100).toFixed(2)}%;top:${(y / P.height * 100).toFixed(2)}%;background:${col}">${s.plan === "rain" ? "雨" : orderOf(s)}</button>`;
  }).join("");
  const legend = (filter === "rain" ? [] : daysWithStops.filter(d => filter === "all" || filter === "food" || filter === d.date))
    .map(d => `<div><span style="background:${dayColor(d.date)}"></span>${md(d.date)} ${esc(d.title || "")}</div>`).join("") +
    (filter === "rain" ? `<div><span style="background:${RAIN_COLOR}"></span>雨天備案</div>` : "");
  let sheet = "";
  if (sel) {
    const d = S.days.find(x => x.date === sel.day);
    sheet = `<section class="map-sheet">
      <div class="handle"></div>
      <p class="muted">${md(sel.day)}（${weekday(sel.day)}）${esc(sel.time || "")}・${CAT[sel.category] || ""}${sel.plan === "rain" ? "・雨天備案" : ""}</p>
      <h2>${esc(sel.name)}</h2>${sel.name_ko ? `<p class="muted" lang="ko">${esc(sel.name_ko)}</p>` : ""}
      ${sel.tips?.[0] ? `<p>${esc(sel.tips[0])}</p>` : ""}
      <div class="actions">${sel.options?.length ? naverBtn(optTarget(sel.options[0]), "btn primary grow") : navLinks(sel, true, "btn primary grow")}
        <a class="btn grow" href="#plan" data-act="goto-stop" data-date="${sel.day}" data-id="${sel.id}" data-plan="${sel.plan}">在行程裡看</a></div>
    </section>`;
  }
  return topbar("地圖", `${visible.length} 個地點`) + `<main class="page map-page">
    <div class="chips" role="group" aria-label="篩選地點">${chips.map(([k, l]) =>
      `<button type="button" class="chipbtn" data-act="map-filter" data-filter="${k}" aria-pressed="${k === filter}">${esc(l)}</button>`).join("")}</div>
    <div class="bigmap" style="aspect-ratio:${P.width} / ${P.height}">
      <svg viewBox="0 0 ${P.width} ${P.height}" aria-hidden="true">
        <path class="island" d="${coastPath(P.px)}"/>
        ${PLACE_LABELS.map(l => { const [x, y] = P.px(l.lng, l.lat); return `<text class="label" x="${x.toFixed(0)}" y="${(y + l.dy).toFixed(0)}" text-anchor="middle">${l.t}</text>`; }).join("")}
      </svg>${pins}
      ${legend ? `<div class="legend">${legend}</div>` : ""}
    </div>
    ${visible.length ? sheet : `<div class="empty"><h3>這裡還沒有地點</h3><p>有位置的站才會出現在地圖上。</p></div>`}
    ${unplacedCard(filter)}
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
      ${stays.map((st, i) => `<div class="sub-form">
        <label>名稱<input name="stay_name_${i}" type="text" maxlength="60" value="${esc(st.name || "")}" placeholder="${i === stays.length - 1 ? "新增一筆住宿" : ""}"></label>
        <div class="row2"><label>入住<select name="stay_in_${i}">${dateOpts(st.check_in)}</select></label>
          <label>退房<select name="stay_out_${i}">${dateOpts(st.check_out)}</select></label></div>
        <label>韓文地址（給司機看、導航用）<input name="stay_addr_${i}" type="text" maxlength="120" lang="ko" value="${esc(st.address_ko || "")}" placeholder="제주특별자치도 제주시 …"></label>
        <div class="row2"><label>電話<input name="stay_phone_${i}" type="tel" maxlength="30" value="${esc(st.phone || "")}"></label>
          <label>備註<input name="stay_note_${i}" type="text" maxlength="60" value="${esc(st.note || "")}" placeholder="15:00 入住"></label></div>
      </div>`).join("")}
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
        <label>從上一站開車（分鐘）<input name="drive_min" placeholder="放了位置會自動算" type="number" min="0" max="300" step="1" inputmode="numeric" value="${s.drive_min ?? ""}"></label></div>
      <fieldset class="loc"><legend>位置</legend>
        <p class="muted small">在地圖上點一下放位置，地圖和車程就會跟著更新。導航會用韓文名稱搜尋，比較準。</p>
        <div id="picker" class="picker">${pickerHtml(s)}</div>
        <div class="row-btns">
          <button class="btn" type="button" data-act="pick-zoom" data-dir="in">放大</button>
          <button class="btn" type="button" data-act="pick-zoom" data-dir="out">縮小</button>
          <button class="btn" type="button" data-act="pick-here">我的位置</button>
          <button class="btn" type="button" data-act="pick-clear">清除</button></div>
        <button class="btn wide" type="button" data-act="pick-search">用名稱找位置</button>
        <div id="pick-results" class="pick-results" aria-live="polite"></div>
        <input type="hidden" name="lat" value="${s.lat ?? ""}"><input type="hidden" name="lng" value="${s.lng ?? ""}">
      </fieldset>
      <label>小提醒（一行一個）<textarea name="tips" rows="3" maxlength="400">${esc((s.tips || []).join("\n"))}</textarea></label>
      ${s.options?.length ? `<p class="muted small">這站的餐廳選項（${s.options.length} 家）會保留，這裡不能改。</p>` : ""}
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
      <label>封面插畫<select name="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}"${d.theme === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <button class="btn primary wide" type="submit">儲存</button></form>`;
}

export function memSheet(date) {
  const stops = [...stopsFor(date, "sun"), ...stopsFor(date, "rain")].filter(isPlace);
  return `<h2>加照片或心得</h2><p class="muted">${md(date)}（${weekday(date)}）</p>
    <form data-act="save-mem" data-date="${date}" class="form">
      <label>在哪一站<select name="stop"><option value="">其他</option>${stops.map(s => `<option value="${s.id}">${esc(s.time || "")} ${esc(s.name)}</option>`).join("")}</select></label>
      <label>照片（可以一次選多張）<input name="photos" type="file" accept="image/*" multiple></label>
      <label>心得<textarea name="note" rows="3" maxlength="500" placeholder="橘子超甜，摘了快 2 公斤"></textarea></label>
      <p class="form-err" role="alert" hidden></p>
      <button class="btn primary wide" type="submit">放進回憶</button></form>`;
}

/* ---------- location picker ---------- */
const ISLAND = { lat: 33.38, lng: 126.56, span: 0.86 };
let pickView = null;
export function resetPicker(s) {
  pickView = s.lat != null ? { lat: s.lat, lng: s.lng, span: 0.22 } : { ...ISLAND };
}
export function zoomPicker(dir, point) {
  if (!pickView) pickView = { ...ISLAND };
  const c = point || pickView;
  const span = Math.min(ISLAND.span, Math.max(0.04, pickView.span * (dir === "in" ? 0.5 : 2)));
  pickView = span >= ISLAND.span ? { ...ISLAND } : { lat: c.lat, lng: c.lng, span };
}
export function pickerProjection() {
  const v = pickView || ISLAND;
  const latSpan = v.span * 0.835 * 0.62;
  return makeProjection({ lng0: v.lng - v.span / 2, lng1: v.lng + v.span / 2, lat0: v.lat - latSpan / 2, lat1: v.lat + latSpan / 2 }, 520, 0);
}
export function pickerHtml(s, point) {
  if (!pickView) resetPicker(s);
  const P = pickerProjection();
  const p = point || (s.lat != null ? { lat: s.lat, lng: s.lng } : null);
  const others = S.stops.filter(x => x.day === s.day && x.plan === s.plan && x.id !== s.id && x.lat != null && isPlace(x));
  const big = pickView.span < 0.3;
  const pin = p ? (() => { const [x, y] = P.px(p.lng, p.lat); return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M0 0c-6-9-12-14-12-22a12 12 0 0 1 24 0c0 8-6 13-12 22z" fill="#C25F0C" stroke="#fff" stroke-width="2.5"/><circle cy="-22" r="4.5" fill="#fff"/></g>`; })() : "";
  return `<svg viewBox="0 0 ${P.width} ${P.height}" role="img" aria-label="點一下地圖放位置">
    <rect width="${P.width}" height="${P.height}" fill="#D3E2E5"/>
    <path d="${coastPath(P.px)}" fill="#F3F5F1" stroke="#B7C7C6" stroke-width="1.5"/>
    ${PLACE_LABELS.map(l => { const [x, y] = P.px(l.lng, l.lat); return `<text x="${x.toFixed(0)}" y="${(y + l.dy).toFixed(0)}" text-anchor="middle" font-size="${big ? 17 : 15}" fill="#5F676B">${l.t}</text>`; }).join("")}
    ${others.map(o => { const [x, y] = P.px(o.lng, o.lat); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#2B3036" stroke="#fff" stroke-width="2"/>`; }).join("")}
    ${pin}
  </svg>${p ? "" : `<p class="picker-hint">點地圖放位置</p>`}`;
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

export function pickResultsHtml(list, err) {
  if (err) return `<p class="muted small">${esc(err)}</p>`;
  if (!list.length) return `<p class="muted small">找不到。試試改用韓文名稱，或直接在地圖上點。</p>`;
  return `<p class="muted small">選一個（資料來自 OpenStreetMap，可能不完整）：</p>` + list.map((r, i) =>
    `<button class="pick-hit" type="button" data-act="pick-hit" data-lat="${r.lat}" data-lng="${r.lon}"><b>${esc(r.name || r.display_name.split(",")[0])}</b><small>${esc(r.display_name.split(",").slice(1, 3).join("・"))}</small></button>`).join("");
}

function unplacedCard(filter) {
  const list = S.stops.filter(s => isPlace(s) && s.lat == null && (
    filter === "all" ? s.plan === "sun" : filter === "rain" ? s.plan === "rain" : filter === "food" ? s.plan === "sun" && FOOD_CATS.includes(s.category) : s.day === filter && s.plan === "sun"))
    .sort((a, b) => (a.day + (a.time || "")).localeCompare(b.day + (b.time || "")));
  if (!list.length) return "";
  return `<section class="card unplaced"><h3>還沒放位置（${list.length} 站）</h3>
    <p class="muted small">這些站沒有位置，所以不在地圖上，也算不出車程。${S.mode === "synced" ? "點「放位置」補上。" : "加入旅行後可以補上。"}</p>
    <ul>${list.map(s => `<li><span><b>${md(s.day)} ${esc(s.time || "")}</b>${esc(s.name)}</span>
      ${S.mode === "synced" ? `<button class="btn" type="button" data-act="edit-stop" data-id="${s.id}">放位置</button>` : ""}</li>`).join("")}</ul></section>`;
}

