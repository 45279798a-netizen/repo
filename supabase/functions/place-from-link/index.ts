// Turns a shared Google Maps (or Naver Map) link into coordinates.
// Short links like maps.app.goo.gl can only be opened from a server, so the app calls this function.
// Deploy: Supabase dashboard → Edge Functions → Deploy a new function → Via Editor → name "place-from-link".

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Only these map sites are ever fetched.
const ALLOWED = [
  /^maps\.app\.goo\.gl$/, /^goo\.gl$/, /^g\.co$/, /^(www\.)?google\.[a-z.]+$/, /^maps\.google\.[a-z.]+$/,
  /^naver\.me$/, /^(m\.)?map\.naver\.com$/, /^(m\.)?place\.naver\.com$/, /^pcmap\.place\.naver\.com$/,
];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const okHost = (u: URL) => u.protocol === "https:" && ALLOWED.some(r => r.test(u.hostname));
const inKorea = (lat: number, lng: number) => lat > 32.8 && lat < 38.9 && lng > 124 && lng < 131.5;

function coordsFrom(text: string): [number, number] | null {
  const t = decodeURIComponent(text);
  const pats: [RegExp, boolean][] = [
    [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, false],                    // google place data
    [/[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, false],
    [/@(-?\d+\.\d+),(-?\d+\.\d+)/, false],                         // google viewport
    [/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/, false],           // google static map preview
    [/[?&]lat=(-?\d+\.\d+)&lng=(-?\d+\.\d+)/, false],
    [/[?&]lng=(-?\d+\.\d+)&lat=(-?\d+\.\d+)/, true],
    [/"x"\s*:\s*"?(\d+\.\d+)"?\s*,\s*"y"\s*:\s*"?(\d+\.\d+)/, true], // naver place data
  ];
  for (const [re, swap] of pats) {
    const m = t.match(re);
    if (!m) continue;
    let a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (swap) [a, b] = [b, a];
    if (inKorea(a, b)) return [a, b];
  }
  // Google page state: [[[zoomDistance, lng, lat] ...
  const s = t.match(/APP_INITIALIZATION_STATE=\[\[\[(-?\d+\.?\d*),(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (s && inKorea(+s[3], +s[2])) return [+s[3], +s[2]];
  return null;
}
function nameFrom(url: string, html = ""): string {
  const g = url.match(/\/maps\/place\/([^/@?]+)/);
  if (g) return decodeURIComponent(g[1].replace(/\+/g, " "));
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/);
  if (og) return og[1].replace(/\s*[-·|:]\s*(Google\s*(地圖|Maps)|네이버.*|NAVER.*)$/i, "").trim();
  return "";
}

async function get(url: URL) {
  return await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "zh-TW,ko;q=0.8,en;q=0.6" } });
}

// Only people signed in to the trip app may use this (checked against Supabase Auth).
async function signedIn(req: Request): Promise<boolean> {
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  const auth = req.headers.get("authorization") || "";
  if (!base || !key) return true; // not running on Supabase (local test)
  if (!/^Bearer\s+ey/.test(auth)) return false;
  const r = await fetch(`${base}/auth/v1/user`, { headers: { apikey: key, Authorization: auth } });
  await r.body?.cancel();
  return r.ok;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!(await signedIn(req))) return json({ error: "要先加入行程才能用" }, 401);
  let input = "";
  try { input = String((await req.json()).url || ""); } catch { /* empty */ }
  const found = input.match(/https?:\/\/[^\s"'<>]+/);
  if (!found) return json({ error: "沒有看到連結" }, 400);
  let url: URL;
  try { url = new URL(found[0].replace(/^http:/, "https:")); } catch { return json({ error: "連結格式不對" }, 400); }
  if (!okHost(url)) return json({ error: "只支援 Google 地圖或 Naver 地圖的連結" }, 400);

  try {
    // Follow redirects by hand so every hop stays on a map site.
    let res = await get(url);
    for (let i = 0; i < 6 && res.status >= 300 && res.status < 400; i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const next = new URL(loc, url);
      if (!okHost(next)) return json({ error: "連結轉到不支援的網站" }, 400);
      url = next;
      await res.body?.cancel();
      res = await get(url);
    }
    let c = coordsFrom(url.href);
    let html = "";
    if (!c) { html = await res.text(); c = coordsFrom(html); }
    else await res.body?.cancel();

    // Naver: the place page holds the coordinates.
    const nv = url.href.match(/place\/(\d{5,})/);
    if (!c && nv) {
      const p = new URL(`https://m.place.naver.com/place/${nv[1]}/home`);
      html = await (await get(p)).text();
      c = coordsFrom(html);
    }
    if (!c) return json({ error: "這個連結裡找不到座標，換一個連結或直接在地圖上點" }, 422);
    return json({ lat: +c[0].toFixed(5), lng: +c[1].toFixed(5), name: nameFrom(url.href, html) });
  } catch (e) {
    return json({ error: "打開連結失敗，等一下再試" }, 502);
  }
});
