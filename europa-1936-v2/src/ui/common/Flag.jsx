import { useId } from 'react';
import { COUNTRIES } from '../../data/countries.js';
import { FORMABLES } from '../../data/nat/formables.js';

/** Body pěticípé hvězdy (vnitřní poloměr 0,382 – pravidelná hvězda). `rot` = natočení ve stupních (0 = cípem nahoru). */
export function starPoints(cx, cy, r, rot = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (rot * Math.PI) / 180 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Body slunce s `n` trojúhelníkovými paprsky (vnější poloměr r, vnitřní ri). */
function sunPoints(cx, cy, r, ri, n) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? ri : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * UI16: britská vlajka (Union Jack) v obdélníku x, y, w, h – standardní geometrie v poli 60×30: modré pole, bílé šikmé kříže,
 * posunuté červené šikmé pruhy (ořez `t` do protilehlých trojúhelníků), bílý lemovaný a červený přímý kříž.
 */
function UnionJack({ x, y, w, h, id }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${w / 60} ${h / 30})`}>
      <clipPath id={`${id}s`}><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id={`${id}t`}><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#f2f2f2" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#f2f2f2" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </g>
  );
}

/**
 * Vlajka země podle vrstev z data/countries.js (formát popsaný tam) s látkovým efektem (UI16: lehký přechod, záhyb a tenký okraj).
 * Vrstvy: r obdélník, c kruh, p mnohoúhelník, s hvězda, l čára, st pruhy, sg mřížka hvězd, u Union Jack, sun slunce s paprsky,
 * so hvězda s obrysem, pa cesta SVG, ring prstenec.
 */
export function Flag({ tag, width = 36, className = '', title, form = '' }) {
  const uid = useId().replace(/:/g, '');
  const d = COUNTRIES[tag];
  const layers = form && FORMABLES[form] ? FORMABLES[form].flag : d ? d.flag : [['r', '#555', 0, 0, 30, 20]];   // P3: vlajka vyhlášeného národa
  const body = layers.map((l, i) => {
    switch (l[0]) {
      case 'r': return <rect key={i} fill={l[1]} x={l[2]} y={l[3]} width={l[4]} height={l[5]} />;
      case 'c': return <circle key={i} fill={l[1]} cx={l[2]} cy={l[3]} r={l[4]} />;
      case 'p': return <polygon key={i} fill={l[1]} points={l[2]} />;
      case 's': return <polygon key={i} fill={l[1]} points={starPoints(l[2], l[3], l[4], l[5] || 0)} />;
      case 'l': return <line key={i} stroke={l[1]} strokeWidth={l[2]} x1={l[3]} y1={l[4]} x2={l[5]} y2={l[6]} />;
      case 'sn': {   // ['sn', barva, cx, cy, r, cípů] – hvězda s n cípy (sedmicípá hvězda Commonwealthu)
        const [, col, cx, cy, r, n] = l, pts = [];
        for (let k = 0; k < n * 2; k++) { const a = -Math.PI / 2 + (k * Math.PI) / n, rr = k % 2 ? r * 0.45 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`); }
        return <polygon key={i} fill={col} points={pts.join(' ')} />;
      }
      case 'pa': return <path key={i} fill={l[1]} d={l[2]} fillRule="evenodd" />;
      case 'ring': return <circle key={i} fill="none" stroke={l[1]} strokeWidth={l[5]} cx={l[2]} cy={l[3]} r={l[4]} />;
      case 'so': return <polygon key={i} fill={l[1]} stroke={l[2]} strokeWidth={l[6]} strokeLinejoin="miter" points={starPoints(l[3], l[4], l[5], l[7] || 0)} />;
      case 'st': {   // ['st', [barvy…], počet, x, y, w, h] – vodorovné pruhy střídající barvy
        const [, cols, n, x, y, w, h] = l, sh = h / n;
        return <g key={i}>{Array.from({ length: n }, (_, k) => <rect key={k} fill={cols[k % cols.length]} x={x} y={y + k * sh} width={w} height={sh + 0.04} />)}</g>;
      }
      case 'sg': {   // ['sg', barva, x, y, w, h, řádků, sloupců, poloměr] – mřížka hvězd rovnoměrně v obdélníku
        const [, col, x, y, w, h, rows, cols, r] = l, dx = w / cols, dy = h / rows, out = [];
        for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) out.push(<polygon key={`${a}-${b}`} fill={col} points={starPoints(x + dx * (b + 0.5), y + dy * (a + 0.5), r)} />);
        return <g key={i}>{out}</g>;
      }
      case 'sun': {  // ['sun', barva, cx, cy, r, paprsků, poloměr disku?, barva disku?]
        const [, col, cx, cy, r, n, rd, dc] = l;
        return <g key={i}><polygon fill={col} points={sunPoints(cx, cy, r, r * 0.62, n)} />{rd ? <circle cx={cx} cy={cy} r={rd} fill={dc || col} /> : null}</g>;
      }
      case 'u': return <UnionJack key={i} x={l[1]} y={l[2]} w={l[3]} h={l[4]} id={`${uid}u${i}`} />;   // ['u', x, y, w, h]
      default: return null;
    }
  });
  return (
    <svg className={`flag ${className}`} width={width} height={(width * 2) / 3} viewBox="0 0 30 20" role="img" aria-label={title || tag} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {body}
      <rect x="0" y="0" width="30" height="20" fill={`url(#${uid}f)`} pointerEvents="none" />
      <rect x="0.15" y="0.15" width="29.7" height="19.7" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="0.3" pointerEvents="none" />
    </svg>
  );
}
