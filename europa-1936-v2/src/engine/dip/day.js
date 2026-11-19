// Denní krok diplomacie (M23): kapitulace zemí, zapomínání změn vztahů v míru, vypršení ospravedlnění.
import { getWorld } from '../world.js';
import { hasWar, enemiesOf, atWar } from '../army/war.js';
import { friendsOf } from './accessCore.js';
import { DIP } from './constants.js';
import { vpHeld } from './core.js';
import { capitulate } from './capitulate.js';
import { subjectsDay } from './subjects.js';
import { accessDay } from './access.js';
import { pactDay } from './pact.js';
import { overseasDay } from './overseas.js';
import { exileDay } from './exile.js';
import { civilDay, isCivilWar } from '../civil/index.js';
import { CAP_LIMITS, HIST_STRATEGIES } from '../../data/ai/strategies.js';

/** Hranice kapitulace země (M92): `CAP_LIMITS` podle tagu, jinak výchozí `DIP.CAP_SHARE` a `DIP.CAP_CAPITAL_SHARE`. */
export function capLimitOf(o) {
  const l = CAP_LIMITS[getWorld().owners[o].tag];
  return { share: l ? l.share : DIP.CAP_SHARE, capital: l ? l.capital : DIP.CAP_CAPITAL_SHARE };
}

/**
 * Historické příměří (M93, řádek `armistice` v `HIST_STRATEGIES`, jen s historickou AI): země v okně kapituluje, jakmile nepřítel `armistice` nebo jeho spojenec
 * drží aspoň `held` provincií jejího původního území (nebo od dne `force` v každém případě).
 */
export function armisticeDue(state, o) {
  return !!armisticeRow(state, o);
}

/** Řádek historického příměří nebo kapitulace, který právě nastal (viz `armisticeDue`), nebo null. Řádek s `conf` = bezpodmínečná kapitulace s konferencí. */
export function armisticeRow(state, o) {
  if (!state.ai || !state.ai.hist) return null;
  const w = getWorld(), tag = w.owners[o].tag, day = state.tick / 24;
  if (state.player && w.ownerIdx[state.player] === o) return null;   // hráčova země se rozhoduje sama
  for (const s of HIST_STRATEGIES) {
    if (s.tag !== tag || !s.armistice || day < s.from || day >= s.until) continue;
    const foe = w.ownerIdx[s.armistice];
    if (!foe || !atWar(state.mil, o, foe)) continue;
    if (s.force && day >= s.force) return s;   // pojistka: režim padne i bez úspěšného vylodění
    const camp = new Set([foe, ...friendsOf(state.dip, foe)]);
    let n = 0;
    for (let p = 1; p <= w.L; p++) if (w.provOwner0[p] === o && camp.has(state.ctrl[p]) && ++n >= s.held) return s;
  }
  return null;
}

/** Vytrvá země `o` podle historické strategie (`holdout` v okně, M98)? Pak kapituluje až při `DIP.HOLDOUT_SHARE` území v rukou nepřítele. */
export function holdoutOf(state, o) {
  if (!state.ai || !state.ai.hist) return false;
  const w = getWorld(), tag = w.owners[o].tag, day = state.tick / 24;
  if (state.player && w.ownerIdx[state.player] === o) return false;
  return HIST_STRATEGIES.some((s) => s.tag === tag && s.holdout && day >= s.from && day < s.until);
}

export function dipDay(state) {
  const w = getWorld();
  state = civilDay(state);   // M69: historické občanské války
  state = subjectsDay(state);
  state = pactDay(state);   // M75: nabídky a zaniklé pakty
  state = overseasDay(state);   // M79: zámořská pomoc
  state = exileDay(state);   // M83: obnova exilových zemí
  // kapitulace
  const player = state.player ? w.ownerIdx[state.player] || 0 : 0;
  for (let o = 1; o < w.owners.length; o++) {
    if (state.dip.cap[o] || !hasWar(state.mil, o)) continue;
    const h = vpHeld(state, o);
    if (enemiesOf(state.mil, o).some((e) => isCivilWar(state, o, e))) {   // M69: občanskou válku neukončí pád hlavního města, až držení většiny země
      if (h.total && h.share >= DIP.CIVIL_CAP_SHARE) state = capitulate(state, o);
      continue;
    }
    const lim = holdoutOf(state, o) ? { share: DIP.HOLDOUT_SHARE, capital: DIP.HOLDOUT_SHARE } : capLimitOf(o);   // M92: hranice kapitulace podle země; M98: vytrvání do konce
    const capRule = o !== player;   // F3: hráčova země po pádu hlavního města nekapituluje hned – jako v HOI4 rozhoduje jen podíl ztraceného území
    if (h.total && (h.share >= lim.share || (capRule && h.capHeld && h.share >= lim.capital))) state = capitulate(state, o);
    else {
      const ar = armisticeRow(state, o);
      if (ar) state = capitulate(state, o, ar.conf ? { noExile: true, victor: w.ownerIdx[ar.armistice] } : { armistice: true, peace: !!ar.peace });   // M93: příměří (bez exilu a konference); M98: bezpodmínečná kapitulace (konference bez exilu)
    }
  }
  // vypršelá ospravedlnění
  let just = state.dip.just;
  const live = just.filter((j) => state.tick - j.ready <= DIP.JUST_KEEP * 24);
  if (live.length !== just.length) just = live;
  // zapomínání změn vztahů mezi zeměmi, které spolu nejsou ve válce
  let rel = state.dip.rel, relCopy = false;
  for (const k in rel) {
    const [a, b] = k.split('-').map(Number);
    if (state.mil.wars.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
    const v = rel[k], nv = Math.abs(v) <= DIP.REL_FORGET ? 0 : v - Math.sign(v) * DIP.REL_FORGET;
    if (nv !== v) { if (!relCopy) { rel = { ...rel }; relCopy = true; } if (nv === 0) delete rel[k]; else rel[k] = nv; }
  }
  if (just !== state.dip.just || rel !== state.dip.rel) state = { ...state, dip: { ...state.dip, just, rel } };
  return accessDay(state);   // M67: dohody s kapitulovanými a válečnými protivníky zaniknou, cizinci bez práva na cizím území odejdou domů
}
