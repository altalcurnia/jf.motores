// Ilustraciones técnicas de referencia (SVG) para los datos de ejemplo.
const Y = "#f7c600";

const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171c22"/><stop offset="1" stop-color="#0b0d10"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.55" r="0.55"><stop offset="0" stop-color="${Y}" stop-opacity="0.16"/><stop offset="1" stop-color="${Y}" stop-opacity="0"/></radialGradient>
  <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dee3"/><stop offset="0.5" stop-color="#8d959d"/><stop offset="1" stop-color="#4b5259"/></linearGradient>
  <linearGradient id="steelH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4b5259"/><stop offset="0.45" stop-color="#d9dee3"/><stop offset="1" stop-color="#4b5259"/></linearGradient>
  <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset="1" stop-color="#22262b"/></linearGradient>
  <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84d"/><stop offset="1" stop-color="#c79c00"/></linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.04"/></pattern>
</defs>`;

function frame(inner, ref) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${defs}
<rect width="1200" height="900" fill="url(#bg)"/><rect width="1200" height="900" fill="url(#grid)"/><rect width="1200" height="900" fill="url(#glow)"/>
<ellipse cx="600" cy="760" rx="420" ry="34" fill="#000" opacity="0.45"/>
<g fill="none" stroke="${Y}" stroke-width="4" opacity="0.8">
<path d="M40 100V40H100"/><path d="M1100 40H1160V100"/><path d="M40 800V860H100"/><path d="M1100 860H1160V800"/></g>
${inner}
<text x="60" y="830" font-family="monospace" font-size="26" letter-spacing="6" fill="${Y}">REF ${ref}</text>
<text x="1140" y="830" text-anchor="end" font-family="monospace" font-size="20" letter-spacing="4" fill="#98a2ad">IMAGEN DE REFERENCIA</text>
<text x="1140" y="80" text-anchor="end" font-family="sans-serif" font-weight="900" font-size="28" letter-spacing="4" fill="#eef1f4">JF <tspan fill="${Y}">MOTORES</tspan></text>
</svg>`;
}

function engineBody(x, y, w, cyl, accent, turbo) {
  const h = 210;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#iron)" stroke="#5b636c" stroke-width="3"/>`;
  for (let i = 1; i < 9; i++) s += `<line x1="${x + 20}" y1="${y + 20 * i + 10}" x2="${x + w - 20}" y2="${y + 20 * i + 10}" stroke="#15181c" stroke-width="5" opacity="0.6"/>`;
  s += `<rect x="${x - 10}" y="${y - 70}" width="${w + 20}" height="74" rx="10" fill="url(#paint)" stroke="${accent}" stroke-width="3"/>`;
  const step = (w - 40) / cyl;
  for (let i = 0; i < cyl; i++) {
    const cx = x + 20 + step * (i + 0.5);
    s += `<rect x="${cx - 9}" y="${y - 100}" width="18" height="34" rx="4" fill="url(#steel)"/>`;
    s += `<circle cx="${cx}" cy="${y - 33}" r="12" fill="#1a1d21" stroke="#0b0d10" stroke-width="3"/>`;
  }
  if (turbo) s += `<circle cx="${x + w - 30}" cy="${y - 120}" r="40" fill="url(#steel)" stroke="#3a3f45" stroke-width="4"/><circle cx="${x + w - 30}" cy="${y - 120}" r="16" fill="#22262b"/>`;
  return s;
}

function radiatorBlock(x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#1d2126" stroke="#5b636c" stroke-width="4"/>`;
  for (let i = 0; i < Math.floor(w / 12); i++) s += `<line x1="${x + 8 + i * 12}" y1="${y + 14}" x2="${x + 8 + i * 12}" y2="${y + h - 14}" stroke="#7d868f" stroke-width="3" opacity="0.7"/>`;
  return s;
}

const art = {
  pump({ scale = 1, accent = Y, mirror = false }) {
    let s = `<rect x="170" y="620" width="860" height="60" rx="8" fill="#1a1d21" stroke="${accent}" stroke-width="5"/>`;
    s += `<rect x="170" y="676" width="860" height="14" fill="${accent}"/>`;
    s += radiatorBlock(200, 380, 130, 230);
    s += `<circle cx="345" cy="495" r="50" fill="none" stroke="#3a3f45" stroke-width="10"/>`;
    s += engineBody(370, 400, 330, 4, accent, scale > 1.1);
    s += `<path d="M640 330 V220 h40" fill="none" stroke="url(#steelH)" stroke-width="24" stroke-linecap="round"/><rect x="628" y="250" width="34" height="60" rx="8" fill="#22262b"/>`;
    s += `<rect x="700" y="470" width="60" height="70" fill="url(#steel)"/>`;
    s += `<circle cx="855" cy="505" r="${110}" fill="url(#paint)" stroke="${accent}" stroke-width="5"/>`;
    s += `<path d="M855 505 m-70 0 a70 70 0 1 1 70 70 a50 50 0 1 1 -40 -60" fill="none" stroke="#7a6000" stroke-width="10" opacity="0.6"/>`;
    s += `<circle cx="855" cy="505" r="28" fill="#22262b"/>`;
    s += `<rect x="960" y="475" width="120" height="60" fill="url(#steel)"/><rect x="1070" y="455" width="24" height="100" rx="4" fill="#8d959d"/>`;
    s += `<rect x="825" y="300" width="60" height="110" fill="url(#steelH)"/><rect x="805" y="285" width="100" height="24" rx="4" fill="#8d959d"/>`;
    const tr = `translate(600 450) scale(${(mirror ? -1 : 1) * scale} ${scale}) translate(-600 -450)`;
    return `<g transform="${tr}">${s}</g>`;
  },
  engine({ cyl = 4, accent = Y, turbo = false }) {
    let s = `<rect x="260" y="640" width="680" height="40" rx="8" fill="#1a1d21" stroke="${accent}" stroke-width="4"/>`;
    s += radiatorBlock(270, 380, 140, 250);
    s += `<g transform="translate(445 505)"><circle r="85" fill="none" stroke="#3a3f45" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="M0 0 L${Math.cos(i) * 80} ${Math.sin(i) * 80}" stroke="#5b636c" stroke-width="16" stroke-linecap="round"/>`;
    s += `<circle r="18" fill="#22262b"/></g>`;
    const w = cyl === 2 ? 240 : 340;
    s += engineBody(520, 410, w, cyl, accent, turbo);
    s += `<circle cx="${520 + w + 70}" cy="515" r="110" fill="url(#steel)" stroke="#3a3f45" stroke-width="6"/><circle cx="${520 + w + 70}" cy="515" r="34" fill="#22262b"/>`;
    s += `<path d="M${520 + w - 60} 340 V230 h40" fill="none" stroke="url(#steelH)" stroke-width="22" stroke-linecap="round"/>`;
    return s;
  },
  radiator() {
    let s = radiatorBlock(330, 230, 540, 470);
    s += `<rect x="310" y="190" width="580" height="60" rx="12" fill="url(#paint)"/><rect x="310" y="680" width="580" height="60" rx="12" fill="url(#paint)"/>`;
    s += `<rect x="780" y="150" width="60" height="44" rx="10" fill="url(#steel)"/><rect x="250" y="600" width="70" height="40" rx="10" fill="url(#steelH)"/><rect x="880" y="270" width="70" height="40" rx="10" fill="url(#steelH)"/>`;
    return s;
  },
  piston() {
    let s = `<rect x="430" y="190" width="340" height="300" rx="26" fill="url(#steelH)" stroke="#3a3f45" stroke-width="4"/>`;
    for (let i = 0; i < 3; i++) s += `<rect x="430" y="${220 + i * 26}" width="340" height="10" fill="#2a2f35"/>`;
    s += `<circle cx="600" cy="390" r="44" fill="#1a1d21" stroke="#5b636c" stroke-width="6"/>`;
    s += `<path d="M560 420 L520 690 h160 L640 420 Z" fill="url(#steel)" stroke="#3a3f45" stroke-width="4"/>`;
    s += `<circle cx="600" cy="700" r="86" fill="url(#steel)" stroke="#3a3f45" stroke-width="5"/><circle cx="600" cy="700" r="52" fill="#1a1d21"/>`;
    return s;
  },
  rings() {
    let s = "";
    [[480, 420, "#c7ccd2"], [600, 460, "#9aa1a8"], [720, 500, Y]].forEach(([x, y, c]) => {
      s += `<ellipse cx="${x}" cy="${y}" rx="190" ry="78" fill="none" stroke="${c}" stroke-width="22"/>`;
    });
    return s;
  },
  gasket() {
    let s = `<rect x="200" y="300" width="800" height="300" rx="40" fill="url(#steelH)" stroke="#3a3f45" stroke-width="5"/>`;
    for (let i = 0; i < 4; i++) {
      const cx = 320 + i * 186;
      s += `<circle cx="${cx}" cy="450" r="74" fill="#14171b" stroke="${Y}" stroke-width="6"/>`;
      s += `<circle cx="${cx - 90}" cy="340" r="12" fill="#14171b"/><circle cx="${cx - 90}" cy="560" r="12" fill="#14171b"/>`;
    }
    return s;
  },
  valves() {
    let s = "";
    for (let i = 0; i < 6; i++) {
      const x = 330 + i * 108;
      s += `<rect x="${x - 9}" y="230" width="18" height="380" rx="6" fill="url(#steelH)"/>`;
      s += `<path d="M${x - 58} 640 L${x - 14} 600 h28 L${x + 58} 640 Z" fill="url(#steel)" stroke="#3a3f45" stroke-width="3"/>`;
      s += `<rect x="${x - 14}" y="240" width="28" height="18" rx="3" fill="${Y}"/>`;
    }
    return s;
  },
  liner() {
    return `<rect x="430" y="210" width="340" height="480" fill="url(#steelH)" stroke="#3a3f45" stroke-width="4"/>
<ellipse cx="600" cy="690" rx="170" ry="42" fill="#6b737b"/><ellipse cx="600" cy="210" rx="200" ry="50" fill="url(#steel)" stroke="#3a3f45" stroke-width="4"/>
<ellipse cx="600" cy="210" rx="150" ry="36" fill="#14171b"/><rect x="430" y="300" width="340" height="12" fill="${Y}" opacity="0.8"/>`;
  },
  muffler() {
    return `<rect x="300" y="340" width="600" height="220" rx="110" fill="url(#steel)" stroke="#3a3f45" stroke-width="5"/>
<rect x="160" y="420" width="160" height="56" rx="10" fill="url(#steelH)"/><rect x="880" y="420" width="190" height="56" rx="10" fill="url(#steelH)"/>
<rect x="380" y="340" width="20" height="220" fill="${Y}" opacity="0.85"/><rect x="800" y="340" width="20" height="220" fill="${Y}" opacity="0.85"/>`;
  },
  tank() {
    return `<rect x="320" y="270" width="560" height="400" rx="30" fill="url(#paint)" stroke="#a37f00" stroke-width="6"/>
<rect x="680" y="220" width="110" height="60" rx="14" fill="url(#steel)"/><rect x="380" y="330" width="40" height="280" rx="8" fill="#14171b"/>
<rect x="386" y="470" width="28" height="134" rx="6" fill="#4fa3ff" opacity="0.7"/><rect x="460" y="640" width="60" height="70" fill="#22262b"/><rect x="700" y="640" width="60" height="70" fill="#22262b"/>`;
  },
  fan() {
    let s = `<g transform="translate(600 450)">`;
    for (let i = 0; i < 6; i++) s += `<path d="M0 0 C 60 -40, 200 -60, 250 -10 C 200 30, 80 40, 0 0Z" fill="url(#steel)" stroke="#3a3f45" stroke-width="4" transform="rotate(${i * 60})"/>`;
    s += `<circle r="70" fill="url(#paint)" stroke="#a37f00" stroke-width="5"/><circle r="22" fill="#14171b"/></g>`;
    return s;
  },
  flywheel() {
    let s = `<g transform="translate(600 450)"><circle r="280" fill="url(#steel)" stroke="#3a3f45" stroke-width="6"/>`;
    for (let i = 0; i < 72; i++) s += `<rect x="-6" y="-300" width="12" height="26" fill="#6b737b" transform="rotate(${i * 5})"/>`;
    s += `<circle r="170" fill="none" stroke="#3a3f45" stroke-width="8"/><circle r="80" fill="url(#paint)"/><circle r="34" fill="#14171b"/>`;
    for (let i = 0; i < 6; i++) s += `<circle cx="${Math.cos((i * Math.PI) / 3) * 120}" cy="${Math.sin((i * Math.PI) / 3) * 120}" r="14" fill="#14171b"/>`;
    return s + "</g>";
  },
  impeller() {
    let s = `<g transform="translate(600 450)"><circle r="270" fill="#2a2f35" stroke="#5b636c" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="M30 0 C 120 -30, 200 -10, 260 70" fill="none" stroke="url(#paint)" stroke-width="26" stroke-linecap="round" transform="rotate(${i * 60})"/>`;
    s += `<circle r="80" fill="url(#steel)" stroke="#3a3f45" stroke-width="5"/><circle r="30" fill="#14171b"/></g>`;
    return s;
  },
  seal() {
    return `<g transform="translate(600 450)"><circle r="230" fill="url(#steel)" stroke="#3a3f45" stroke-width="6"/>
<circle r="170" fill="#1d2126"/><circle r="150" fill="none" stroke="${Y}" stroke-width="18"/><circle r="100" fill="url(#steel)"/><circle r="56" fill="#14171b"/>
<path d="M-260 300 q40 -40 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="#8d959d" stroke-width="14" transform="translate(70 0) scale(0.9)"/></g>`;
  },
  panel() {
    return `<rect x="290" y="230" width="620" height="440" rx="24" fill="url(#iron)" stroke="${Y}" stroke-width="6"/>
<g transform="translate(450 410)"><circle r="96" fill="#14171b" stroke="#5b636c" stroke-width="8"/><path d="M-70 40 A80 80 0 1 1 70 40" fill="none" stroke="${Y}" stroke-width="10"/><line x1="0" y1="0" x2="50" y2="-50" stroke="#eef1f4" stroke-width="8" stroke-linecap="round"/></g>
<g transform="translate(750 410)"><circle r="96" fill="#14171b" stroke="#5b636c" stroke-width="8"/><path d="M-70 40 A80 80 0 1 1 70 40" fill="none" stroke="#ff7a45" stroke-width="10"/><line x1="0" y1="0" x2="-40" y2="-60" stroke="#eef1f4" stroke-width="8" stroke-linecap="round"/></g>
<rect x="400" y="550" width="240" height="70" rx="8" fill="#0b2a14"/><text x="520" y="598" text-anchor="middle" font-family="monospace" font-size="40" fill="#3ecf8e">01234.5</text>
<circle cx="770" cy="585" r="34" fill="url(#steel)"/><rect x="760" y="560" width="20" height="50" rx="4" fill="#22262b"/>`;
  },
};

export function renderArt(spec, ref) {
  const fn = art[spec.type];
  if (!fn) throw new Error(`Ilustración desconocida: ${spec.type}`);
  return frame(fn(spec), ref);
}
