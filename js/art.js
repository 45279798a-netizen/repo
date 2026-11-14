/* Cover illustrations (one per day theme) and the Jeju outline for maps. */

export const ART = {
    dawn: () => `
      <defs><linearGradient id="g-dawn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2E3A5E"/><stop offset=".55" stop-color="#9B7FA6"/><stop offset="1" stop-color="#F2B39A"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-dawn)"/>
      <g class="sunrise"><circle cx="300" cy="132" r="22" fill="#FFD9A8" opacity=".95"/></g>
      <g fill="#fff" opacity=".7"><circle cx="40" cy="30" r="1.2"/><circle cx="90" cy="54" r="1"/><circle cx="160" cy="24" r="1.3"/><circle cx="210" cy="60" r="1"/><circle cx="350" cy="36" r="1.2"/></g>
      <path d="M0 172 Q120 92 210 104 T400 168 V230 H0Z" fill="#3E4B6C"/>
      <path d="M0 196 Q150 160 260 176 T400 186 V230 H0Z" fill="#2B344D"/>
      <g fill="#20263A">${Array.from({ length: 16 }, (_, i) => `<ellipse cx="${i * 27 + 8}" cy="${214 - (i % 3) * 2}" rx="15" ry="9"/>`).join("")}</g>
      <path d="M60 64 q60 -6 130 -26" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"/>
      <g transform="translate(222 26) rotate(-16)" fill="#fff"><path transform="scale(-.9 .9) translate(-6 -8)" d="M0 8l14-2 9-12h3l-3 12h9l3-3h2l-2 5 2 5h-2l-3-3h-9l3 12h-3l-9-12-14-2z"/></g>`,
    oreum: () => `
      <defs><linearGradient id="g-oreum" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#9FC8DA"/><stop offset="1" stop-color="#E7EFE6"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-oreum)"/>
      <g class="sunrise"><circle cx="330" cy="58" r="18" fill="#FFF6DA"/></g>
      <path d="M0 150 Q70 80 150 140 Q210 96 270 138 Q330 90 400 132 V230 H0Z" fill="#7E9E6A"/>
      <path d="M0 176 Q110 128 230 170 T400 160 V230 H0Z" fill="#5F804F"/>
      <g stroke="#EADFC3" stroke-width="2" stroke-linecap="round" fill="none">${Array.from({ length: 26 }, (_, i) => { const x = i * 16 + 4; return `<path d="M${x} 230 q${4 + (i % 3)} -26 ${10 + (i % 4)} -40"/>`; }).join("")}</g>
      <g fill="#343A3F">${Array.from({ length: 15 }, (_, i) => `<ellipse cx="${i * 28 + 12}" cy="${206 - (i % 2) * 3}" rx="15" ry="8"/>`).join("")}</g>`,
    south: () => `
      <defs>
        <linearGradient id="g-south" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EC3D6"/><stop offset="1" stop-color="#F5E6C6"/></linearGradient>
        <linearGradient id="g-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B93AA"/><stop offset="1" stop-color="#2C6A80"/></linearGradient>
      </defs>
      <rect width="400" height="230" fill="url(#g-south)"/>
      <g class="sunrise"><circle cx="232" cy="64" r="20" fill="#FFF3D6"/></g>
      <rect y="132" width="400" height="98" fill="url(#g-sea)"/>
      <g stroke="#9ED0DE" stroke-width="1.5" stroke-linecap="round" opacity=".6"><path d="M150 150h30M210 160h44M120 172h26M260 146h22"/></g>
      <path d="M18 134 C34 58 132 52 150 134Z" fill="#5E7A63"/>
      <path d="M44 100 C70 92 112 92 132 104" stroke="#71907A" stroke-width="3" fill="none" opacity=".6"/>
      <path d="M214 134 q10 -18 22 0Z M244 134 q14 -26 30 0Z" fill="#46604F"/>
      <clipPath id="c-cliff"><path d="M300 104 Q318 92 348 95 T400 88 V168 H288 Q298 150 294 128 Q292 112 300 104Z"/></clipPath>
      <path d="M300 104 Q318 92 348 95 T400 88 V168 H288 Q298 150 294 128 Q292 112 300 104Z" fill="#6E5E50"/>
      <g clip-path="url(#c-cliff)" stroke="#837061" stroke-width="2" fill="none"><path d="M280 112q60-6 130-4M280 126q60-4 130-2M280 140q60-2 130 0M280 154q60 0 130 2"/><path d="M300 104 Q318 92 348 95 T400 88" stroke="#5F7D57" stroke-width="7"/></g>
      <path d="M0 196 Q120 176 220 192 T400 186 V230 H0Z" fill="#3E5C44"/>
      ${[[40, 196], [92, 204], [150, 198]].map(([x, y]) => `
        <g><circle cx="${x}" cy="${y}" r="24" fill="#2F4A35"/>
        ${[[-10, -8], [6, -12], [12, 4], [-4, 6], [-14, 6], [2, -2]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="3.6" fill="#F28A1E"/>`).join("")}</g>`).join("")}`,
    west: () => `
      <defs>
        <linearGradient id="g-west" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5C5E9C"/><stop offset=".55" stop-color="#C77F8B"/><stop offset="1" stop-color="#F6B57A"/></linearGradient>
        <clipPath id="c-sky"><rect width="400" height="146"/></clipPath>
      </defs>
      <rect width="400" height="230" fill="url(#g-west)"/>
      <g clip-path="url(#c-sky)"><g class="sunrise"><circle cx="230" cy="146" r="34" fill="#FFD48A"/></g></g>
      <rect y="146" width="400" height="84" fill="#3E4A78"/>
      <g fill="#F7B26A" opacity=".85"><rect x="206" y="152" width="48" height="3" rx="1.5"/><rect x="214" y="162" width="32" height="3" rx="1.5"/><rect x="220" y="172" width="20" height="3" rx="1.5"/></g>
      ${[[70, 70], [120, 82], [166, 92]].map(([x, top], i) => `
        <g stroke="#2B3036" stroke-linecap="round" opacity=".88">
          <path d="M${x} ${top} V150" stroke-width="3"/>
          <g transform="translate(${x} ${top}) rotate(${i * 22})" stroke-width="2.2">
            <path d="M0 0 V-26"/><path d="M0 0 L22.5 13"/><path d="M0 0 L-22.5 13"/></g>
          <circle cx="${x}" cy="${top}" r="2.4" fill="#2B3036"/></g>`).join("")}
      <path d="M300 112 L400 104 V176 H292Z" fill="#8A6E5A"/>
      <g stroke="#A88A70" stroke-width="2.4"><path d="M296 126h104M295 138h105M294 150h106M293 162h107"/></g>
      <path d="M300 112 L400 104 v-5 L312 106Z" fill="#5E7356"/>
      <path d="M0 206 Q90 188 170 204 T400 198 V230 H0Z" fill="#23272C"/>
      <g fill="#2F3439">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${i * 55 + 20}" cy="${200 + (i % 2) * 4}" rx="22" ry="9"/>`).join("")}</g>`
  };

export const COAST = [
    [126.162,33.300],[126.165,33.335],[126.185,33.360],[126.230,33.395],[126.270,33.420],[126.310,33.455],
    [126.360,33.475],[126.420,33.490],[126.490,33.510],[126.530,33.520],[126.600,33.530],[126.670,33.545],
    [126.750,33.565],[126.820,33.555],[126.870,33.525],[126.920,33.500],[126.945,33.460],[126.920,33.430],
    [126.860,33.370],[126.830,33.320],[126.750,33.290],[126.660,33.265],[126.580,33.245],[126.500,33.235],
    [126.420,33.240],[126.360,33.235],[126.320,33.225],[126.300,33.205],[126.290,33.195],[126.250,33.210],
    [126.210,33.240],[126.175,33.270]
  ];

/* Equirectangular projection fitted to a box. */
export function makeProjection(bounds, width, pad = 24) {
  const KX = 0.835; // cos(33.4°)
  const spanX = (bounds.lng1 - bounds.lng0) * KX, spanY = bounds.lat1 - bounds.lat0;
  const s = (width - pad * 2) / spanX;
  const height = Math.round(spanY * s + pad * 2);
  const px = (lng, lat) => [pad + (lng - bounds.lng0) * KX * s, pad + (bounds.lat1 - lat) * s];
  const ll = (x, y) => [bounds.lat1 - (y - pad) / s, (x - pad) / (KX * s) + bounds.lng0];
  return { px, ll, width, height, scale: s };
}
export function coastPath(px) {
  const p = COAST.map(([a, b]) => px(a, b));
  const mid = i => { const a = p[i], b = p[(i + 1) % p.length]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  let d = `M${mid(p.length - 1).map(n => n.toFixed(1)).join(",")}`;
  p.forEach((pt, i) => { const m = mid(i); d += ` Q${pt[0].toFixed(1)},${pt[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`; });
  return d + "Z";
}
export const PLACE_LABELS = [
  { t: "濟州市", lng: 126.53, lat: 33.50, dy: 16 }, { t: "西歸浦", lng: 126.56, lat: 33.255, dy: -10 },
  { t: "漢拏山 ▲", lng: 126.533, lat: 33.362, dy: 4 }, { t: "翰林", lng: 126.29, lat: 33.41, dy: 16 },
  { t: "中文", lng: 126.42, lat: 33.255, dy: -6 }, { t: "城山", lng: 126.92, lat: 33.45, dy: 14 }
];
