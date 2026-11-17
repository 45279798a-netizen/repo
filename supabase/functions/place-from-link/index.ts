// Two jobs for the trip app:
// 1. { action: "search", q }: Google Places text search inside Jeju (needs the GOOGLE_PLACES_KEY secret).
// 2. { url }: opens a shared map link (Google Maps / Naver Map) and returns the page it lands on.
// Short links like maps.app.goo.gl can only be opened from a server; the app reads the coordinates itself,
// so fixes to the reading logic don't need this function to be deployed again.
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via Editor → name "place-from-link",
// then turn off "Verify JWT" (this function checks the sign-in itself).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Only these map sites are ever fetched.
const ALLOWED = [
  /^maps\.app\.goo\.gl$/, /^goo\.gl$/, /^g\.co$/, /^consent\.google\.[a-z.]+$/,
  /^(www\.)?google\.[a-z.]+$/, /^maps\.google\.[a-z.]+$/,
  /^naver\.me$/, /^(m\.)?map\.naver\.com$/, /^(m\.)?place\.naver\.com$/, /^pcmap\.place\.naver\.com$/,
];
const AGENTS: Record<string, string> = {
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  curl: "curl/8.5.0",
};
// Skips Google's cookie-consent page.
const COOKIE = "CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg";
const MAX_HTML = 2_000_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const okHost = (u: URL) => u.protocol === "https:" && ALLOWED.some(r => r.test(u.hostname));

// Only people signed in to the trip app may use this (checked against Supabase Auth).
async function signedIn(req: Request): Promise<boolean> {
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) return true; // not running on Supabase (local test)
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+ey/.test(auth)) return false;
  const r = await fetch(`${base}/auth/v1/user`, { headers: { apikey: key, Authorization: auth } });
  await r.body?.cancel();
  return r.ok;
}

// Google Places Text Search (New), limited to Jeju. The key stays here on the server.
async function search(q: string): Promise<Response> {
  const key = Deno.env.get("GOOGLE_PLACES_KEY");
  if (!key) return json({ error: "nokey" }, 501);
  q = q.trim().slice(0, 120);
  if (q.length < 2) return json({ places: [] });
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: q, languageCode: "zh-TW", regionCode: "KR", pageSize: 5,
      locationRestriction: { rectangle: { low: { latitude: 33.10, longitude: 126.10 }, high: { latitude: 33.62, longitude: 127.00 } } },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: `Google 搜尋失敗（${r.status}）：${String(data?.error?.message || "").slice(0, 120)}` }, 502);
  const places = (data.places || []).map((p: any) => ({
    id: p.id, name: p.displayName?.text || "", address: p.formattedAddress || "",
    lat: +(+p.location?.latitude).toFixed(5), lng: +(+p.location?.longitude).toFixed(5),
  })).filter((p: any) => Number.isFinite(p.lat));
  return json({ places });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!(await signedIn(req))) return json({ error: "要先加入行程才能用" }, 401);
  let body: { url?: string; ua?: string; action?: string; q?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.action === "search") return await search(String(body.q || ""));
  const found = String(body.url || "").match(/https?:\/\/[^\s"'<>]+/);
  if (!found) return json({ error: "沒有看到連結" }, 400);
  let url: URL;
  try { url = new URL(found[0].replace(/^http:/, "https:")); } catch { return json({ error: "連結格式不對" }, 400); }
  if (!okHost(url)) return json({ error: "只支援 Google 地圖或 Naver 地圖的連結" }, 400);
  const headers = { "User-Agent": AGENTS[body.ua || "desktop"] || AGENTS.desktop, "Accept-Language": "zh-TW,ko;q=0.8,en;q=0.6", Cookie: COOKIE };

  try {
    const hops: string[] = [];
    let res = await fetch(url, { redirect: "manual", headers });
    // Follow redirects by hand so every hop stays on a map site.
    for (let i = 0; i < 8 && res.status >= 300 && res.status < 400; i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      let next = new URL(loc, url);
      if (/^consent\./.test(next.hostname) && next.searchParams.get("continue")) next = new URL(next.searchParams.get("continue")!);
      hops.push(next.href);
      if (!okHost(next)) return json({ url: url.href, hops, status: res.status, html: "", stopped: next.hostname });
      url = next;
      await res.body?.cancel();
      res = await fetch(url, { redirect: "manual", headers });
    }
    const type = res.headers.get("content-type") || "";
    const html = /text|json|javascript/.test(type) ? (await res.text()).slice(0, MAX_HTML) : (await res.body?.cancel(), "");
    return json({ url: url.href, hops, status: res.status, html });
  } catch (e) {
    return json({ error: `打開連結失敗：${String((e as Error)?.message || e).slice(0, 80)}` }, 502);
  }
});
