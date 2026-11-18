// Kreslené ikony výzbroje (M104): vlastní siluety (bok nebo pohled shora) v barvě skupiny – puška, děla, auta, tanky, letouny, lodě. Žádné převzaté obrázky.
// Kreslí se do rámečku 48 × 30.
const TANK = (s) => (
  <g transform={`translate(${24 - 22 * s} ${28 - 20 * s}) scale(${s})`}>
    <rect x="2" y="13" width="40" height="7" rx="3.5" />
    <path d="M6 13 L10 7 H34 L38 13 Z" />
    <path d="M14 7 V3 H28 V7 Z" />
    <rect x="27" y="4" width="17" height="2" rx="1" />
    <g fill="#0b1117">{[7, 13, 19, 25, 31, 37].map((x) => <circle key={x} cx={x} cy="16.5" r="2" />)}</g>
  </g>
);
const PLANE = (span, eng, tail = true) => (
  <g>
    <path d="M24 2 L26 6 V26 L24 29 L22 26 V6 Z" />
    <path d={`M${24 - span} 13 L24 11 L${24 + span} 13 L${24 + span} 16 L24 15.5 L${24 - span} 16 Z`} />
    {tail && <path d="M18 24 L24 23 L30 24 L30 26 L24 25.5 L18 26 Z" />}
    {eng.map((x) => <rect key={x} x={24 + x - 1.5} y="9" width="3" height="6" rx="1" />)}
  </g>
);
const SHIP = (len, deck) => (
  <g>
    <path d={`M${24 - len} 20 H${24 + len} L${24 + len - 4} 26 H${24 - len + 3} Z`} />
    {deck}
  </g>
);

const SHAPES = {
  pusky: <g><path d="M3 15 L30 13 L33 11 H45 V13 L33 15 L30 18 L22 18 L18 22 H12 L14 17 L3 17 Z" /><rect x="22" y="9" width="2" height="4" /></g>,
  podpora: <g><rect x="8" y="10" width="20" height="14" rx="1.5" /><path d="M14 10 V6 H22 V10" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 14 h4 v-2 h0 M18 12 v8 M14 17 h8" stroke="#0b1117" strokeWidth="2" /><path d="M31 24 L37 8 L39 8.5 L33 24 Z" /><circle cx="38" cy="7" r="2.5" /></g>,
  dela: <g><path d="M8 18 L42 8 L43 10 L10 21 Z" /><path d="M4 22 L18 17 L20 20 L8 25 Z" /><circle cx="16" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="16" cy="22" r="1.6" /></g>,
  pdela: <g><path d="M10 18 L44 14 L44 16 L11 21 Z" /><path d="M12 11 L20 10 L22 21 L13 22 Z" /><path d="M4 25 L18 20 L19 23 L6 27 Z" /><circle cx="17" cy="23" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.2" /></g>,
  auta: <g><path d="M3 9 H27 V22 H3 Z" /><path d="M28 13 H37 L42 18 V22 H28 Z" /><rect x="30" y="14.5" width="5" height="3" fill="#0b1117" /><circle cx="10" cy="24" r="3.6" /><circle cx="35" cy="24" r="3.6" /><circle cx="10" cy="24" r="1.2" fill="#0b1117" /><circle cx="35" cy="24" r="1.2" fill="#0b1117" /></g>,
  vozy: <g><path d="M4 20 L8 12 H38 L44 18 V21 Z" /><path d="M16 12 L19 7 H29 L31 12 Z" /><rect x="28" y="8" width="13" height="2" /><circle cx="11" cy="23" r="3.6" /><circle cx="22" cy="23" r="3.6" /><circle cx="35" cy="23" r="3.6" /></g>,
  ltanky: TANK(0.82),
  mtanky: TANK(0.95),
  htanky: <g>{TANK(1.06)}<rect x="15" y="5" width="11" height="3" /></g>,
  sti: PLANE(16, []),
  pal: <g>{PLANE(14, [])}<path d="M24 29 L24 30" /><path d="M20 28 L28 28" stroke="currentColor" strokeWidth="1.4" /></g>,
  bit: PLANE(19, [-9, 9]),
  tac: PLANE(17, [-8, 8], false),
  str: PLANE(23, [-15, -8, 8, 15]),
  rak: <g><path d="M24 1 L28 9 V24 L24 22 L20 24 V9 Z" /><path d="M20 18 L15 27 L20 25 Z M28 18 L33 27 L28 25 Z" /><path d="M22 25 L24 30 L26 25 Z" opacity="0.7" /></g>,
  dd: SHIP(19, <g><path d="M14 20 V16 H24 V20 Z M26 20 V17 H31 V20 Z" /><rect x="18" y="12" width="2.5" height="4" /><path d="M31 18 L38 16" stroke="currentColor" strokeWidth="2" /></g>),
  ca: SHIP(21, <g><path d="M12 20 V15 H30 V20 Z" /><path d="M18 15 V10 H24 V15 Z" /><rect x="26" y="11" width="2.5" height="4" /><path d="M30 17 L39 15 M12 17 L5 15" stroke="currentColor" strokeWidth="2" /></g>),
  bb: SHIP(23, <g><path d="M10 20 V14 H34 V20 Z" /><path d="M17 14 V7 H25 V14 Z" /><rect x="27" y="9" width="3" height="5" /><path d="M34 16 L44 14 M34 18 L44 16 M10 16 L2 14 M10 18 L2 16" stroke="currentColor" strokeWidth="1.8" /></g>),
  ss: <g><path d="M3 19 Q24 12 45 19 Q24 24 3 19 Z" /><path d="M20 15 V10 H27 L28 15 Z" /><rect x="23" y="5" width="1.6" height="5" /></g>,
  cv: SHIP(23, <g><path d="M1 17 H47 V20 H1 Z" /><path d="M31 17 V11 H36 V17 Z" /><path d="M8 15 L13 15 L10.5 14 Z M18 15 L23 15 L20.5 14 Z" /></g>),
  tr: SHIP(20, <g><path d="M8 20 V13 H28 V20 Z" /><path d="M30 20 V15 H38 V20 Z" /><rect x="32" y="10" width="3" height="5" /><path d="M14 13 V8 M22 13 V8" stroke="currentColor" strokeWidth="1.6" /></g>),
};

/** Ikona výzbroje `eq` v rámečku `size` × `size`·0,62 (barva = `color`, jinak currentColor). */
export function EquipIcon({ eq, size = 48, color, className = '' }) {
  const shape = SHAPES[eq];
  return (
    <svg className={`eq-icon ${className}`} width={size} height={Math.round(size * 0.62)} viewBox="0 0 48 30" aria-hidden="true" style={color ? { color } : undefined} fill="currentColor">
      {shape || <text x="24" y="20" textAnchor="middle" fontSize="12" fontWeight="700">{String(eq).slice(0, 3).toUpperCase()}</text>}
    </svg>
  );
}

export const EQUIP_ICON_IDS = Object.keys(SHAPES);
