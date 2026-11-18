// Ilustrace pro noviny a události (M101): vlastní vektorové výjevy ve stylu starých tisků (sépiový dvoutón, siluety). Žádné převzaté obrázky.
//  kind: war | surrender | crowd | nuke | peace | navy | treaty | landing | industry | science | air | farm | flag
const SKY = {
  war: ['#4a2a1c', '#a8653a'], surrender: ['#5b5a52', '#b9b29a'], crowd: ['#3b3326', '#9c8558'], nuke: ['#5a2412', '#e0a04a'],
  peace: ['#4d6170', '#d9cfa8'], navy: ['#2c3f4c', '#9fb0a6'], treaty: ['#3d3428', '#b49c6a'], landing: ['#33404a', '#b0a27c'],
  industry: ['#3a2f28', '#a98a5c'], science: ['#25343d', '#8fa3a0'], air: ['#34495a', '#c9b88c'], farm: ['#5a5232', '#d6c48a'], flag: ['#3a3226', '#b7a06c'],
};
const INK = '#1b140d';

function Ground({ y = 150, c = INK }) { return <path d={`M0 ${y} Q130 ${y - 14} 260 ${y - 4} T520 ${y - 6} V200 H0 Z`} fill={c} />; }
function Smoke({ x, y, s = 1, o = 0.55 }) {
  return <g opacity={o} fill="#2a2018">{[0, 1, 2, 3].map((i) => <circle key={i} cx={x + i * 9 * s} cy={y - i * 13 * s} r={(9 + i * 5) * s} />)}</g>;
}
function Soldier({ x, y, s = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={INK}>
      <circle cx="0" cy="-34" r="5" /><path d="M-6 -36 Q0 -44 6 -36 Z" />
      <path d="M-5 -29 L5 -29 L7 -10 L3 0 L1 0 L0 -10 L-1 0 L-3 0 L-7 -10 Z" />
      <path d="M4 -26 L22 -44" stroke={INK} strokeWidth="2" />
    </g>
  );
}
function Factory({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK}>
      <path d="M0 0 V-30 L18 -40 V-30 L36 -40 V-30 L54 -40 V0 Z" />
      <rect x="60" y="-70" width="8" height="70" /><rect x="74" y="-56" width="7" height="56" />
    </g>
  );
}
function Ship({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK}>
      <path d="M-50 0 L50 0 L40 10 L-44 10 Z" /><rect x="-20" y="-12" width="30" height="12" /><rect x="-8" y="-24" width="8" height="12" />
      <path d="M14 -8 L34 -14" stroke={INK} strokeWidth="3" /><path d="M-26 -6 L-44 -10" stroke={INK} strokeWidth="3" />
    </g>
  );
}
function Plane({ x, y, s = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK}><path d="M-22 0 L22 -2 L26 0 L22 2 Z" /><path d="M-4 -1 L6 -16 L10 -16 L4 0 Z" /><path d="M-4 1 L6 14 L10 14 L4 1 Z" /><path d="M-22 0 L-26 -7 L-20 -1 Z" /></g>;
}
function Person({ x, y, s = 1, arm = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK}>
      <circle cx="0" cy="-30" r="5" /><path d="M-6 -24 H6 L5 0 H-5 Z" />
      {arm ? <path d="M5 -22 L12 -40" stroke={INK} strokeWidth="2.5" /> : null}
    </g>
  );
}

function Body({ kind }) {
  switch (kind) {
    case 'war': return (<>
      <Smoke x={70} y={120} s={1.3} /><Smoke x={360} y={110} s={1.6} o={0.45} />
      <circle cx="430" cy="60" r="16" fill="#f0c070" opacity="0.7" />
      <Ground y={160} />
      {[60, 110, 160, 210, 260].map((x, i) => <Soldier key={x} x={x + (i % 2) * 6} y={158 - (i % 2) * 3} s={1.05} />)}
      <path d="M300 150 L330 128 H380 L392 150 Z" fill={INK} /><path d="M340 128 L380 112" stroke={INK} strokeWidth="5" />
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={304 + i * 18} cy="152" r="7" fill="#2a2018" />)}
    </>);
    case 'surrender': return (<>
      <Ground y={165} />
      <path d="M60 165 V95 L90 80 L120 95 V165 Z M160 165 V110 H230 V165 Z M380 165 V90 L410 75 V165 Z" fill="#2a2018" opacity="0.8" />
      <rect x="258" y="40" width="4" height="126" fill={INK} />
      <path d="M262 44 Q300 36 330 50 Q300 62 262 70 Z" fill="#efe8d4" />
      {[200, 300, 340].map((x) => <Person key={x} x={x} y={165} s={1} />)}
    </>);
    case 'crowd': return (<>
      <path d="M180 80 H340 V170 H180 Z" fill="#2a2018" /><path d="M170 80 L260 40 L350 80 Z" fill={INK} />
      {[200, 230, 260, 290, 320].map((x) => <rect key={x} x={x - 5} y="88" width="10" height="70" fill="#4a3a28" />)}
      <rect x="250" y="20" width="3" height="24" fill={INK} /><path d="M253 22 H276 V34 H253 Z" fill="#a8432f" />
      <Ground y={178} />
      {Array.from({ length: 22 }, (_, i) => <Person key={i} x={20 + i * 23 + (i % 3) * 3} y={196 - (i % 2) * 6} s={0.95} arm={i % 4 === 0 ? 1 : 0} />)}
    </>);
    case 'nuke': return (<>
      <Ground y={170} />
      <path d="M240 170 Q236 120 250 100 Q264 120 260 170 Z" fill="#3a2015" />
      <ellipse cx="252" cy="88" rx="70" ry="34" fill="#2a160e" /><ellipse cx="252" cy="80" rx="52" ry="24" fill="#4a2414" />
      <ellipse cx="252" cy="168" rx="120" ry="14" fill="#2a160e" opacity="0.8" />
    </>);
    case 'peace': return (<>
      <circle cx="260" cy="70" r="30" fill="#f4e6b4" opacity="0.8" />
      <Ground y={160} c="#2f3a2a" />
      <path d="M120 160 V100 H170 V160 Z M340 160 V96 H400 V160 Z" fill="#2a2a20" />
      {[150, 190, 230, 270, 310, 350].map((x, i) => <Person key={x} x={x} y={175} s={1} arm={i % 2} />)}
      {[[200, 50], [280, 40], [320, 60]].map(([x, y]) => <path key={x} d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} stroke={INK} fill="none" strokeWidth="2" />)}
    </>);
    case 'navy': return (<>
      <rect x="0" y="130" width="520" height="70" fill="#22303a" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${140 + i * 12} Q65 ${136 + i * 12} 130 ${140 + i * 12} T260 ${140 + i * 12} T390 ${140 + i * 12} T520 ${140 + i * 12}`} stroke="#3c5260" fill="none" />)}
      <Ship x={150} y={128} s={1.4} /><Ship x={360} y={124} s={1.1} /><Smoke x={150} y={95} s={0.8} o={0.4} />
    </>);
    case 'landing': return (<>
      <rect x="0" y="120" width="520" height="80" fill="#22303a" />
      <path d="M300 120 Q400 112 520 118 V200 H340 Z" fill="#6b5a3e" />
      {[60, 140, 220].map((x) => <path key={x} d={`M${x - 26} 140 H${x + 26} L${x + 20} 152 H${x - 20} Z`} fill={INK} />)}
      <Ship x={120} y={110} s={0.9} /><Smoke x={420} y={110} s={1.1} o={0.5} />
      {[360, 390, 420].map((x) => <Soldier key={x} x={x} y={150} s={0.8} />)}
    </>);
    case 'treaty': return (<>
      <rect x="40" y="120" width="440" height="80" fill="#2a2018" />
      <path d="M150 70 H370 L360 150 H160 Z" fill="#efe8d4" />
      {[86, 98, 110, 122].map((y) => <rect key={y} x="180" y={y} width="150" height="3" fill="#8a7a5a" />)}
      <path d="M300 140 Q320 128 340 136" stroke={INK} strokeWidth="2.5" fill="none" />
      <path d="M350 60 L392 130" stroke={INK} strokeWidth="4" /><circle cx="210" cy="140" r="10" fill="#a8432f" />
    </>);
    case 'industry': return (<>
      <Smoke x={145} y={70} s={1.1} /><Smoke x={340} y={64} s={1.2} />
      <Ground y={160} />
      <Factory x={60} y={160} s={1.3} /><Factory x={260} y={160} s={1.4} />
      <path d="M0 176 H520" stroke="#6b5a3e" strokeWidth="3" />
    </>);
    case 'science': return (<>
      <rect x="0" y="150" width="520" height="50" fill={INK} />
      <path d="M230 60 H262 V100 L296 150 H196 L230 100 Z" fill="#2a3a3c" stroke={INK} strokeWidth="3" />
      <path d="M210 140 L282 140 L296 150 H196 Z" fill="#6f9a8a" />
      {[0, 60, 120].map((a) => <ellipse key={a} cx="380" cy="80" rx="46" ry="14" fill="none" stroke={INK} strokeWidth="2" transform={`rotate(${a} 380 80)`} />)}
      <circle cx="380" cy="80" r="6" fill={INK} />
    </>);
    case 'air': return (<>
      <path d="M0 140 Q120 110 240 132 T520 120 V200 H0 Z" fill="#2a2a24" />
      <Plane x={150} y={70} s={1.4} /><Plane x={240} y={50} s={1.1} /><Plane x={330} y={78} s={1.25} />
      {[150, 240, 330].map((x) => <path key={x} d={`M${x - 40} ${x === 240 ? 50 : 72} H${x - 120}`} stroke="#efe8d4" opacity="0.35" strokeWidth="2" />)}
    </>);
    case 'farm': return (<>
      <circle cx="400" cy="60" r="22" fill="#f4e0a0" opacity="0.8" />
      <path d="M0 120 Q260 100 520 118 V200 H0 Z" fill="#6b5a2e" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 46} 200 L${200 + i * 12} 120`} stroke="#4a3e1e" strokeWidth="3" />)}
      <path d="M90 130 H150 V100 L120 84 L90 100 Z" fill={INK} />
    </>);
    default: return (<>
      <Ground y={170} />
      <rect x="250" y="30" width="5" height="142" fill={INK} />
      <path d="M255 34 Q300 26 340 40 Q300 52 255 62 Z" fill="#a8432f" />
    </>);
  }
}

/** Ilustrace 520 × 200 (škáluje se na šířku rodiče). */
export function Scene({ kind = 'flag', className = '' }) {
  const [a, b] = SKY[kind] || SKY.flag;
  const id = `sky-${kind}`;
  return (
    <svg className={`scene ${className}`} viewBox="0 0 520 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        <pattern id="scene-grain" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none" /><circle cx="1" cy="1" r="0.6" fill="#000" opacity="0.18" /></pattern>
        <radialGradient id="scene-vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></radialGradient>
      </defs>
      <rect width="520" height="200" fill={`url(#${id})`} />
      <Body kind={kind} />
      <rect width="520" height="200" fill="url(#scene-grain)" />
      <rect width="520" height="200" fill="url(#scene-vig)" />
    </svg>
  );
}
