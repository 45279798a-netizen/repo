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
      <g fill="#2F3439">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${i * 55 + 20}" cy="${200 + (i % 2) * 4}" rx="22" ry="9"/>`).join("")}</g>`,
    ilchul: () => `
      <defs><linearGradient id="g-ilchul" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22305A"/><stop offset=".5" stop-color="#D9788F"/><stop offset="1" stop-color="#FFC98B"/></linearGradient>
        <linearGradient id="g-ilsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A5F8E"/><stop offset="1" stop-color="#1E2C4E"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-ilchul)"/>
      <g class="sunrise"><circle cx="268" cy="140" r="40" fill="#FFD9A0" opacity=".35"/><circle cx="268" cy="140" r="24" fill="#FFE6B0"/></g>
      <rect y="146" width="400" height="84" fill="url(#g-ilsea)"/>
      <g fill="#FFD9A0" opacity=".8"><rect x="244" y="152" width="48" height="3" rx="1.5"/><rect x="252" y="162" width="32" height="3" rx="1.5"/><rect x="258" y="172" width="20" height="3" rx="1.5"/><rect x="262" y="182" width="12" height="2" rx="1"/></g>
      <path d="M-4 150 L0 146 H34 L66 98 Q72 90 82 93 L92 86 L103 92 L114 84 L125 91 L136 86 L148 95 Q158 99 164 112 L196 150 Z" fill="#2A2F47"/>
      <path d="M82 93 Q114 104 148 95" stroke="#3B4262" stroke-width="2" fill="none"/>
      <g stroke="#3B4262" stroke-width="1.5" fill="none" opacity=".8"><path d="M74 112 l-8 30M96 104 l-4 40M122 103 l2 42M146 108 l10 36"/></g>
      <path d="M0 150 H200 V162 Q140 170 80 164 T0 166Z" fill="#1F2438"/>
      <g stroke="#2A2F47" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M300 56 q5 -5 10 0 q5 -5 10 0"/><path d="M330 70 q4 -4 8 0 q4 -4 8 0"/></g>`,
    halla: () => `
      <defs><linearGradient id="g-halla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FA9D8"/><stop offset="1" stop-color="#E3F1F8"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-halla)"/>
      <g class="sunrise"><circle cx="66" cy="50" r="16" fill="#FFF8E2"/></g>
      <path d="M0 186 Q90 140 150 104 Q176 88 190 84 L200 88 L212 84 Q228 88 252 104 Q320 144 400 176 V230 H0Z" fill="#6E8C7B"/>
      <path d="M150 104 Q176 88 190 84 L200 88 L212 84 Q228 88 252 104 Q240 102 232 108 Q222 99 212 106 Q202 98 192 106 Q180 99 170 106 Q160 101 150 104Z" fill="#fff"/>
      <g fill="#fff" opacity=".85"><ellipse cx="120" cy="132" rx="46" ry="9"/><ellipse cx="300" cy="140" rx="54" ry="10"/><ellipse cx="250" cy="128" rx="30" ry="7"/></g>
      <path d="M0 196 Q100 168 200 186 T400 180 V230 H0Z" fill="#4D6E58"/>
      <g fill="#3B5A45">${Array.from({ length: 22 }, (_, i) => `<path d="M${i * 19 + 4} 214 l7 -22 l7 22z"/>`).join("")}</g>
      <g fill="#555B5F">${Array.from({ length: 15 }, (_, i) => `<ellipse cx="${i * 28 + 10}" cy="${222 - (i % 2) * 3}" rx="15" ry="8"/>`).join("")}</g>`,
    eoksae: () => `
      <defs><linearGradient id="g-eoksae" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DBFD6"/><stop offset=".7" stop-color="#F2D9AE"/><stop offset="1" stop-color="#F6C98E"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-eoksae)"/>
      <g class="sunrise"><circle cx="300" cy="96" r="20" fill="#FFF1CF"/></g>
      <path d="M0 140 Q60 96 130 128 Q190 84 260 126 Q320 100 400 120 V230 H0Z" fill="#B59C6B"/>
      <path d="M0 168 Q120 130 240 160 T400 150 V230 H0Z" fill="#9C8456"/>
      <g stroke-linecap="round">${Array.from({ length: 34 }, (_, i) => {
        const x = i * 12 + (i % 3) * 3, h = 44 + (i * 37 % 30), lean = (i % 5) - 2, top = 230 - h;
        return `<path d="M${x} 230 Q${x + lean * 3} ${top + 20} ${x + lean * 6} ${top}" stroke="#8C7448" stroke-width="1.6" fill="none"/>
          <ellipse cx="${x + lean * 6}" cy="${top + 2}" rx="4" ry="13" transform="rotate(${lean * 9} ${x + lean * 6} ${top + 2})" fill="#F6EEDC" opacity=".92"/>`;
      }).join("")}</g>`,
    emerald: () => `
      <defs><linearGradient id="g-emerald" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FCDE8"/><stop offset="1" stop-color="#EAF7FB"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-emerald)"/>
      <g class="sunrise"><circle cx="90" cy="46" r="16" fill="#FFFBEA"/></g>
      <path d="M240 118 Q262 100 276 104 L282 96 L288 104 Q304 106 322 118Z" fill="#5E8A74"/>
      <rect y="118" width="400" height="20" fill="#2E8DB0"/>
      <path d="M0 136 H400 V158 Q300 150 200 156 T0 154Z" fill="#3DB6C4"/>
      <path d="M0 152 Q100 148 200 154 T400 156 V176 Q300 168 200 174 T0 172Z" fill="#7FE0D6"/>
      <path d="M0 170 Q100 164 200 172 T400 174 V230 H0Z" fill="#F4ECDD"/>
      <path d="M0 171 Q100 165 200 173 T400 175" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/>
      <path d="M40 160 q20 -3 40 0 M260 166 q24 -3 48 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>
      <path d="M0 188 Q22 168 48 176 Q66 170 80 186 Q92 196 86 230 H0Z" fill="#33383E"/>
      <g fill="#4A5057"><circle cx="20" cy="194" r="3"/><circle cx="44" cy="186" r="2.4"/><circle cx="60" cy="200" r="2.8"/><circle cx="30" cy="212" r="2.4"/></g>`,
    tangerine: () => `
      <defs><linearGradient id="g-tangerine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B6DCEE"/><stop offset="1" stop-color="#F3F1DF"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-tangerine)"/>
      <g class="sunrise"><circle cx="320" cy="48" r="17" fill="#FFF6DA"/></g>
      <path d="M0 112 Q100 76 200 104 T400 96 V230 H0Z" fill="#8FAE7E"/>
      ${[[118, 9, 26, 12], [158, 7, 34, 15], [204, 6, 46, 19]].map(([y, n, gap, r], row) => `
        <g>${Array.from({ length: n + 2 }, (_, i) => { const x = i * gap * 1.9 + (row % 2) * gap - 10;
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="${row === 2 ? "#2F5A34" : "#3C6B40"}"/>` +
            [[-.45, -.3], [.3, -.45], [.5, .15], [-.15, .35], [-.55, .25], [.1, -.05]].map(([dx, dy]) => `<circle cx="${x + dx * r}" cy="${y + dy * r}" r="${r * .17}" fill="#F28A1E"/>`).join(""); }).join("")}
        <g fill="#4A4F55">${Array.from({ length: 30 }, (_, i) => `<ellipse cx="${i * 14 + (row % 2) * 7}" cy="${y + r + 2 - (i % 2)}" rx="${7 + row}" ry="${3.5 + row}"/>`).join("")}</g></g>`).join("")}`,
    rainy: () => `
      <defs><linearGradient id="g-rainy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7F8C99"/><stop offset="1" stop-color="#CBD3D8"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-rainy)"/>
      <g fill="#E8ECEE" opacity=".55"><ellipse cx="80" cy="40" rx="70" ry="18"/><ellipse cx="300" cy="30" rx="90" ry="20"/><ellipse cx="200" cy="56" rx="60" ry="12"/></g>
      <path d="M0 176 Q120 156 240 172 T400 168 V230 H0Z" fill="#6C7A72"/>
      <g fill="#8E9C95" opacity=".7"><ellipse cx="270" cy="200" rx="40" ry="5"/><ellipse cx="90" cy="214" rx="30" ry="4"/></g>
      <g fill="#4B5157">
        <ellipse cx="132" cy="92" rx="30" ry="10"/><path d="M110 92 Q112 64 132 62 Q152 64 154 92Z"/>
        <path d="M108 96 Q100 140 106 196 H158 Q164 140 156 96Z"/></g>
      <g fill="#3A3F44"><ellipse cx="121" cy="112" rx="7" ry="8"/><ellipse cx="143" cy="112" rx="7" ry="8"/><path d="M128 120 q4 16 0 22 q4 4 8 0 q-4 -6 0 -22z"/>
        <path d="M114 160 q18 -10 36 -4 l0 8 q-18 -6 -36 4z"/><path d="M118 176 q16 6 30 0 l0 8 q-16 6 -30 0z"/></g>
      <g fill="#5B6268">${[[116, 130], [148, 138], [124, 188], [142, 150], [112, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join("")}</g>
      <path d="M262 120 A46 34 0 0 1 354 120Z" fill="#EE7F1B"/>
      <path d="M262 120 q11.5 -8 23 0 q11.5 -8 23 0 q11.5 -8 23 0 q11.5 -8 23 0" fill="#EE7F1B" stroke="#C9650E" stroke-width="1.5"/>
      <path d="M308 86 V172 q0 8 -8 8 q-6 0 -6 -6" stroke="#2B3036" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".55">${Array.from({ length: 46 }, (_, i) => { const x = (i * 53) % 410, y = (i * 37) % 200; return `<path d="M${x} ${y} l-6 16"/>`; }).join("")}</g>`,
    harbor: () => `
      <defs><linearGradient id="g-harbor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1838"/><stop offset="1" stop-color="#34437A"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-harbor)"/>
      <g fill="#fff" opacity=".8">${[[30, 24], [80, 50], [140, 18], [200, 40], [250, 14], [330, 30], [370, 58], [110, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1"/>`).join("")}</g>
      <g class="sunrise"><circle cx="318" cy="52" r="15" fill="#FFF3CF"/><circle cx="324" cy="48" r="13" fill="#1A2550"/></g>
      <rect y="140" width="400" height="90" fill="#0C1430"/>
      ${[[60, 150, 1], [190, 136, .7], [300, 158, 1.1]].map(([x, y, k]) => `
        <g transform="translate(${x} ${y}) scale(${k})">
          <path d="M-34 0 H34 L26 12 H-28Z" fill="#1E2A4A"/><rect x="-6" y="-14" width="14" height="14" fill="#1E2A4A"/>
          <path d="M-30 -8 H30" stroke="#5B6A90" stroke-width="1"/>
          ${Array.from({ length: 7 }, (_, i) => `<circle cx="${-27 + i * 9}" cy="-8" r="6" fill="#FFE9A6" opacity=".25"/><circle cx="${-27 + i * 9}" cy="-8" r="2.4" fill="#FFF4CC"/>`).join("")}
        </g>
        <g fill="#FFE9A6" opacity=".35"><rect x="${x - 24 * k}" y="${y + 18 * k}" width="${48 * k}" height="2"/><rect x="${x - 14 * k}" y="${y + 26 * k}" width="${28 * k}" height="2"/></g>`).join("")}
      <path d="M360 140 H400 V150 H352Z" fill="#26304F"/>
      <g><rect x="368" y="96" width="14" height="44" fill="#F4F1EA"/><rect x="368" y="106" width="14" height="8" fill="#D9473A"/><rect x="368" y="122" width="14" height="8" fill="#D9473A"/>
        <rect x="366" y="90" width="18" height="6" fill="#2B3036"/><circle cx="375" cy="86" r="5" fill="#FFF3B0"/><circle cx="375" cy="86" r="14" fill="#FFF3B0" opacity=".25"/></g>`,
    camellia: () => `
      <defs><linearGradient id="g-camellia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D9DC"/><stop offset="1" stop-color="#FBEFEA"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-camellia)"/>
      <path d="M0 120 Q100 96 200 112 T400 104 V230 H0Z" fill="#3F6B4A"/>
      ${[[40, 84, 54], [130, 70, 62], [230, 80, 58], [330, 66, 66], [80, 160, 70], [200, 170, 74], [320, 168, 70]].map(([x, y, r], i) => `
        <circle cx="${x}" cy="${y}" r="${r}" fill="${i > 3 ? "#2E5639" : "#386845"}"/>
        ${Array.from({ length: 9 }, (_, k) => { const a = k * 2.4 + i, rr = r * (.25 + (k % 3) * .22), fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr;
          return `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)})">${[0, 72, 144, 216, 288].map(d => `<ellipse rx="4.2" ry="6.4" transform="rotate(${d}) translate(0 -4.5)" fill="#D8344B"/>`).join("")}<circle r="2.6" fill="#F7C948"/></g>`; }).join("")}`).join("")}
      <g fill="#D8344B" opacity=".85"><ellipse cx="60" cy="222" rx="5" ry="3"/><ellipse cx="150" cy="226" rx="5" ry="3"/><ellipse cx="270" cy="220" rx="5" ry="3"/><ellipse cx="370" cy="226" rx="5" ry="3"/></g>`,
    waterfall: () => `
      <defs><linearGradient id="g-waterfall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A7D3E3"/><stop offset="1" stop-color="#E8F4F2"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-waterfall)"/>
      <path d="M0 0 H150 Q160 60 150 120 L140 230 H0Z" fill="#3E4A47"/>
      <path d="M400 0 H250 Q238 60 250 120 L262 230 H400Z" fill="#3E4A47"/>
      <g fill="#4D7A55"><ellipse cx="60" cy="10" rx="80" ry="22"/><ellipse cx="350" cy="12" rx="80" ry="24"/><ellipse cx="20" cy="70" rx="30" ry="14"/><ellipse cx="390" cy="80" rx="30" ry="14"/></g>
      <g stroke="#56615D" stroke-width="2" fill="none" opacity=".7"><path d="M20 40 l30 8 M60 90 l40 6 M10 140 l50 4 M300 50 l40 -6 M290 110 l60 -4 M310 170 l50 2"/></g>
      <rect x="160" y="0" width="80" height="178" fill="#EAF6FA"/>
      <g stroke="#B9DDE8" stroke-width="3" stroke-linecap="round">${Array.from({ length: 9 }, (_, i) => `<path d="M${168 + i * 8} ${(i * 23) % 40} V${120 + (i * 17) % 50}"/>`).join("")}</g>
      <rect y="172" width="400" height="58" fill="#3B8FA3"/>
      <g fill="#fff" opacity=".9"><ellipse cx="200" cy="176" rx="64" ry="10"/><ellipse cx="170" cy="182" rx="22" ry="6"/><ellipse cx="236" cy="183" rx="24" ry="6"/></g>
      <path d="M0 200 Q60 190 120 204 L140 230 H0Z M400 196 Q330 190 280 206 L262 230 H400Z" fill="#2E3836"/>`,
    greentea: () => `
      <defs><linearGradient id="g-greentea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE1F0"/><stop offset="1" stop-color="#F2F4E3"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-greentea)"/>
      <g class="sunrise"><circle cx="80" cy="44" r="15" fill="#FFF8DE"/></g>
      <path d="M140 96 Q200 70 260 96Z" fill="#9AB7A2" opacity=".8"/>
      <path d="M0 100 H400 V230 H0Z" fill="#7DAA5C"/>
      ${Array.from({ length: 9 }, (_, i) => { const y = 104 + i * i * 1.6 + i * 6, w = 3 + i * 1.6;
        return `<path d="M-10 ${y} Q100 ${y - 4 - i} 200 ${y} T410 ${y}" stroke="${i % 2 ? "#4F8A3A" : "#5E9A45"}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; }).join("")}
      <g fill="#3F7531" opacity=".5">${Array.from({ length: 18 }, (_, i) => `<circle cx="${i * 24 + 6}" cy="${222 + (i % 2) * 3}" r="6"/>`).join("")}</g>`,
    olle: () => `
      <defs><linearGradient id="g-olle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A5D2EA"/><stop offset="1" stop-color="#EEF5EC"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-olle)"/>
      <g class="sunrise"><circle cx="330" cy="46" r="15" fill="#FFF8DE"/></g>
      <path d="M0 110 Q120 86 220 104 T400 96 V230 H0Z" fill="#87AE72"/>
      <path d="M170 230 Q190 170 214 130 Q222 116 230 108 Q236 116 240 130 Q252 170 290 230Z" fill="#D9C9A6"/>
      <g fill="#4A4F55">${Array.from({ length: 13 }, (_, i) => `<ellipse cx="${i * 13 + 2}" cy="${150 + i * 6}" rx="9" ry="5"/>`).join("")}${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${398 - i * 9}" cy="${150 + i * 7}" rx="9" ry="5"/>`).join("")}</g>
      <path d="M120 108 V170" stroke="#5B4636" stroke-width="3"/>
      <path d="M120 116 q14 6 6 22" stroke="#EE7F1B" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M124 116 q12 8 2 24" stroke="#2F64A8" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g transform="translate(290 118)"><path d="M0 0 L34 6 L28 14 L-2 10Z" fill="#2F64A8"/><path d="M6 -1 L40 4" stroke="#EE7F1B" stroke-width="3"/><path d="M0 -4 V40" stroke="#5B4636" stroke-width="3"/></g>`,
    haenyeo: () => `
      <defs><linearGradient id="g-haenyeo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CD0E4"/><stop offset=".45" stop-color="#E6F3F4"/><stop offset=".46" stop-color="#3D97B0"/><stop offset="1" stop-color="#1F5D78"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-haenyeo)"/>
      <path d="M0 104 Q40 70 90 98 L104 104Z" fill="#5F7D66"/>
      ${[[130, 128], [230, 150], [330, 124]].map(([x, y]) => `
        <g><circle cx="${x}" cy="${y}" r="13" fill="#F07A1A"/><path d="M${x - 13} ${y} H${x + 13}" stroke="#C95F0D" stroke-width="2"/>
        <path d="M${x} ${y + 12} Q${x + 6} ${y + 40} ${x - 4} ${y + 70}" stroke="#E7E1D3" stroke-width="1.5" fill="none" opacity=".7"/></g>`).join("")}
      <g transform="translate(250 196) rotate(-28)"><ellipse rx="22" ry="7" fill="#1A2A33"/><circle cx="-24" cy="-2" r="7" fill="#1A2A33"/><path d="M18 -2 l16 -8 l-2 14z" fill="#1A2A33"/></g>
      <g fill="#fff" opacity=".7">${Array.from({ length: 10 }, (_, i) => `<circle cx="${244 + (i % 3) * 6}" cy="${186 - i * 8}" r="${1.5 + (i % 2)}"/>`).join("")}</g>
      <g stroke="#B6E0EA" stroke-width="1.5" opacity=".6" stroke-linecap="round"><path d="M20 120 h30 M170 112 h40 M300 140 h26 M60 160 h24"/></g>`,
    market: () => `
      <defs><linearGradient id="g-market" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1F3D"/><stop offset="1" stop-color="#5A3A4A"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-market)"/>
      <path d="M0 30 Q200 70 400 30" stroke="#3B2F2A" stroke-width="2" fill="none"/>
      ${Array.from({ length: 9 }, (_, i) => { const x = 22 + i * 45, y = 30 + Math.sin(i / 8 * Math.PI) * 26;
        return `<g><circle cx="${x}" cy="${y + 16}" r="22" fill="#FFB347" opacity=".18"/><rect x="${x - 9}" y="${y + 4}" width="18" height="24" rx="8" fill="${i % 2 ? "#E8443A" : "#F2A33A"}"/><rect x="${x - 5}" y="${y + 2}" width="10" height="3" fill="#3B2F2A"/></g>`; }).join("")}
      ${[[0, "#C94F3D"], [140, "#2F64A8"], [280, "#3C7A4A"]].map(([x, c]) => `
        <g><path d="M${x + 4} 120 H${x + 132} L${x + 124} 104 H${x + 12}Z" fill="${c}"/>
        <g fill="#fff" opacity=".9">${Array.from({ length: 6 }, (_, k) => `<rect x="${x + 14 + k * 20}" y="104" width="10" height="16"/>`).join("")}</g>
        <rect x="${x + 8}" y="120" width="124" height="56" fill="#2B2230"/>
        <rect x="${x + 4}" y="164" width="132" height="14" fill="#6B4A3A"/>
        <g>${Array.from({ length: 8 }, (_, k) => `<circle cx="${x + 18 + k * 15}" cy="158" r="6" fill="${["#F28A1E", "#F7C948", "#E8443A", "#8BC34A"][k % 4]}"/>`).join("")}</g></g>`).join("")}
      <path d="M0 178 H400 V230 H0Z" fill="#3A2C32"/>
      <g fill="#FFDCA0" opacity=".2"><ellipse cx="70" cy="200" rx="60" ry="10"/><ellipse cx="210" cy="206" rx="60" ry="10"/><ellipse cx="350" cy="200" rx="60" ry="10"/></g>`,
    bbq: () => `
      <defs><radialGradient id="g-bbq" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#6A3A28"/><stop offset="1" stop-color="#24160F"/></radialGradient></defs>
      <rect width="400" height="230" fill="url(#g-bbq)"/>
      <g fill="#fff" opacity=".12"><path d="M150 70 q-14 -20 0 -40 q14 -20 0 -40" stroke="#fff" stroke-width="10" fill="none"/><path d="M250 74 q14 -22 0 -44 q-14 -20 0 -40" stroke="#fff" stroke-width="10" fill="none"/></g>
      <ellipse cx="200" cy="160" rx="150" ry="58" fill="#1A1A1C"/>
      <ellipse cx="200" cy="154" rx="132" ry="46" fill="#3A3A3E"/>
      <g stroke="#6A6A70" stroke-width="2">${Array.from({ length: 11 }, (_, i) => `<path d="M${84 + i * 23} 118 V192"/>`).join("")}</g>
      <ellipse cx="200" cy="154" rx="132" ry="46" fill="none" stroke="#FF7A2E" stroke-width="2" opacity=".5"/>
      ${[[140, 140, -8], [210, 136, 6], [175, 168, 4], [250, 166, -6]].map(([x, y, r]) => `
        <g transform="translate(${x} ${y}) rotate(${r})"><rect x="-30" y="-11" width="60" height="22" rx="6" fill="#8B4A36"/>
        <rect x="-30" y="-11" width="60" height="7" rx="3" fill="#F0D6C0"/><g stroke="#3A1E14" stroke-width="3" opacity=".7"><path d="M-18 -11 V11 M-2 -11 V11 M14 -11 V11"/></g></g>`).join("")}
      <g fill="#7BB661"><ellipse cx="90" cy="212" rx="22" ry="10"/><ellipse cx="320" cy="214" rx="24" ry="10"/></g>
      <g fill="#F2E6C8"><circle cx="300" cy="134" r="5"/><circle cx="312" cy="140" r="5"/><circle cx="120" cy="174" r="5"/></g>`,
    cafe: () => `
      <defs><linearGradient id="g-cafe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FCBE4"/><stop offset=".55" stop-color="#E5F4F6"/><stop offset=".56" stop-color="#46A8BE"/><stop offset="1" stop-color="#2D7C93"/></linearGradient></defs>
      <rect width="400" height="230" fill="url(#g-cafe)"/>
      <rect x="0" y="0" width="400" height="230" fill="none" stroke="#E9DCC8" stroke-width="26"/>
      <path d="M200 0 V170" stroke="#E9DCC8" stroke-width="10"/>
      <rect y="168" width="400" height="62" fill="#C9A27A"/>
      <rect y="168" width="400" height="6" fill="#B38C64"/>
      <g transform="translate(120 150)"><path d="M-22 0 H22 L18 28 H-18Z" fill="#fff"/><path d="M22 6 q14 2 10 14 q-4 6 -12 4" stroke="#fff" stroke-width="4" fill="none"/>
        <ellipse cx="0" cy="2" rx="20" ry="4" fill="#8A5A3B"/><path d="M-6 -8 q-4 -8 2 -14 M6 -8 q-4 -8 2 -14" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
        <ellipse cx="0" cy="30" rx="34" ry="5" fill="#fff" opacity=".9"/></g>
      <g transform="translate(270 156)"><path d="M-26 -6 H26 L20 20 H-20Z" fill="#F7EDE0"/><path d="M-22 -6 L0 -20 L22 -6" fill="#F2A33A"/><circle cx="0" cy="-20" r="4" fill="#E8443A"/></g>
      <g class="sunrise"><circle cx="320" cy="40" r="12" fill="#FFF8DE"/></g>`
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

// The same art with its own gradient ids, for showing several covers on one screen.
export function artSvg(theme, prefix) {
  return (ART[theme] || ART.oreum)().replace(/id="([^"]+)"/g, `id="${prefix}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}
