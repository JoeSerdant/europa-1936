// Malé stavební prvky panelů armády: značka druhu divize, ukazatele síly a organizace, stav.
import { CLS_NAMES, STATUS_NAMES } from './helpers.js';

/** Značka druhu divize (NATO styl, stejná jako na žetonu na mapě). */
export function ClsIcon({ cls, size = 24 }) {
  const w = size, h = Math.round(size * 0.64), i = 2.2;
  const l = i, r = w - i, t = i, b = h - i, cx = w / 2, cy = h / 2;
  let mark;
  switch (cls) {
    case 'cav': mark = <path d={`M${l} ${b}L${r} ${t}`} />; break;
    case 'arm': mark = <ellipse cx={cx} cy={cy} rx={w * 0.3} ry={h * 0.27} />; break;
    case 'mot': mark = <path d={`M${l} ${t}L${r} ${b}M${l} ${b}L${r} ${t}M${cx} ${t}L${cx} ${b}`} />; break;
    case 'mtn': mark = <path d={`M${l} ${t}L${r} ${b}M${l} ${b}L${r} ${t}M${cx - w * 0.16} ${b}L${cx} ${b - h * 0.34}L${cx + w * 0.16} ${b}`} />; break;
    default: mark = <path d={`M${l} ${t}L${r} ${b}M${l} ${b}L${r} ${t}`} />;
  }
  return (
    <svg className="cls-icon" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={CLS_NAMES[cls] || 'Divize'}>
      <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} rx="1.5" />
      <g>{mark}</g>
    </svg>
  );
}

/** Tenký ukazatel 0–1. `kind`: 'hp' (zelená → žlutá → červená podle hodnoty) nebo 'org' (modrá). */
export function Bar({ v, kind, title }) {
  const x = Math.max(0, Math.min(1, v || 0));
  const tone = kind === 'hp' ? (x > 0.5 ? '' : x > 0.25 ? ' mid' : ' low') : '';
  return <span className={`bar ${kind}${tone}`} title={title}><i style={{ width: `${(x * 100).toFixed(1)}%` }} /></span>;
}

const SHORT = { idle: 'Stojí', moving: 'Pochod', fighting: 'Boj', retreating: 'Ústup', lack: 'Zásoby' };

/** Stav divize: boj a ústup mají přednost před nedostatkem zásob, ten před pochodem. */
export function Status({ status, supply, grace }) {
  const lack = supply < 0.999 && grace < 48;
  const key = status === 'fighting' || status === 'retreating' ? status : lack ? 'lack' : status === 'lack' ? 'lack' : status;
  let title = STATUS_NAMES[key] || '';
  if (key === 'lack') title = grace > 0 ? `Zásoby nedostačují – batoh vystačí ještě ${Math.round(grace)} h` : 'Bez zásob – klesá organizace i síla';
  return <span className={`st ${key}`} title={title}>{SHORT[key]}</span>;
}
