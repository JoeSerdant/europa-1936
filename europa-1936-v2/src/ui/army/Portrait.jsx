// Portrét velitele (M102): vlastní kreslená silueta – čepice, výložky a hvězdy podle hodnosti, barva uniformy podle země, rysy podle jména.
// Žádné fotografie ani převzaté obrázky.
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const SKIN = ['#d9b08c', '#c99a74', '#e2bd98', '#b88563', '#d4a57e'];
const HAIR = ['#2b221a', '#5a4632', '#8a7356', '#c9c2b4', '#3d3026'];

/** Portrét `w`×`h`: `name` (rysy), `color` (uniforma, hex), `rank` 'M' | 'G' | '' (bez velitele = prázdný rámeček). */
export function Portrait({ name = '', color = '#55606a', rank = '', w = 44, h = 54, className = '' }) {
  if (!rank) {
    return (
      <svg className={`portrait empty ${className}`} width={w} height={h} viewBox="0 0 44 54" aria-hidden="true">
        <rect x="0.5" y="0.5" width="43" height="53" fill="#121c25" stroke="#2c4152" />
        <path d="M22 14 a7 7 0 1 1 0.01 0 Z M9 52 Q10 34 22 32 Q34 34 35 52 Z" fill="#22313e" />
        <text x="22" y="27" textAnchor="middle" fontSize="11" fill="#6f8392" fontWeight="700">?</text>
      </svg>
    );
  }
  const k = hash(name);
  const skin = SKIN[k % SKIN.length], hair = HAIR[(k >> 3) % HAIR.length];
  const jaw = 8 + ((k >> 6) % 3), mus = (k >> 9) % 3, glasses = (k >> 12) % 5 === 0;
  const stars = rank === 'M' ? 4 : 2;
  return (
    <svg className={`portrait ${className}`} width={w} height={h} viewBox="0 0 44 54" aria-hidden="true">
      <defs>
        <linearGradient id={`pbg${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a4652" /><stop offset="1" stopColor="#1a232c" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="44" height="54" fill={`url(#pbg${k})`} />
      {/* trup a výložky */}
      <path d="M4 54 Q5 38 22 35 Q39 38 40 54 Z" fill={color} />
      <path d="M4 54 Q5 38 22 35 Q39 38 40 54 Z" fill="#000" opacity="0.25" />
      <path d="M16 36 L22 46 L28 36" fill="none" stroke="#e8e0c8" strokeWidth="1.2" opacity="0.8" />
      <rect x="6" y="39" width="9" height="3" rx="1" fill="#d6b55c" /><rect x="29" y="39" width="9" height="3" rx="1" fill="#d6b55c" />
      {/* krk a hlava */}
      <rect x="18.5" y="28" width="7" height="8" fill={skin} />
      <ellipse cx="22" cy="22" rx={jaw} ry="10" fill={skin} />
      <path d={`M${22 - jaw} 20 Q${22 - jaw} 13 22 13 Q${22 + jaw} 13 ${22 + jaw} 20`} fill={hair} />
      <circle cx="18.5" cy="22" r="1" fill="#1b140d" /><circle cx="25.5" cy="22" r="1" fill="#1b140d" />
      {glasses && <g fill="none" stroke="#1b140d" strokeWidth="0.7"><circle cx="18.5" cy="22" r="2.3" /><circle cx="25.5" cy="22" r="2.3" /><path d="M20.8 22 H23.2" /></g>}
      {mus === 1 && <path d="M18.5 27 Q22 25.4 25.5 27 Q22 28 18.5 27 Z" fill={hair} />}
      {mus === 2 && <path d="M20 27 H24 V28 H20 Z" fill={hair} />}
      <path d="M20 29.5 Q22 30.5 24 29.5" fill="none" stroke="#7a4c36" strokeWidth="0.8" />
      {/* čepice */}
      <path d="M11 15 Q22 4 33 15 L33 16.5 L11 16.5 Z" fill={color} />
      <path d="M11 15 Q22 4 33 15 L33 16.5 L11 16.5 Z" fill="#000" opacity="0.15" />
      <path d="M10 16.5 H34 L31 19 H13 Z" fill="#1b140d" />
      <circle cx="22" cy="12.5" r="1.6" fill="#d6b55c" />
      {/* hvězdy hodnosti */}
      {Array.from({ length: stars }, (_, i) => <path key={i} transform={`translate(${22 - (stars - 1) * 3 + i * 6} 49)`} d="M0 -2.2 L0.6 -0.7 L2.1 -0.7 L0.9 0.3 L1.3 1.9 L0 1 L-1.3 1.9 L-0.9 0.3 L-2.1 -0.7 L-0.6 -0.7 Z" fill="#f0d98e" />)}
      <rect x="0.5" y="0.5" width="43" height="53" fill="none" stroke="#8d7638" />
    </svg>
  );
}
