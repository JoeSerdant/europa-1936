// AI: dobrovolníci, licence a atašé (F4). Stejné příkazy jako hráč (`sendVolunteers`, `buyLicence`, `sendAttache`), rozhodnutí podle řazení
// a `rand01`, bez `state.rng`. Historičtí dobrovolníci jsou data `HIST_VOL`; obecné dobrovolníky a atašé posílá AI jen ve volné historii,
// licence kupuje v obou režimech (s historickou AI jen od spojence v bloku, pána nebo loutky).
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { HIST_VOL } from '../../data/dip/volunteers.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { volBlock, sendVolunteers, volAway, volCap } from '../dip/volunteers.js';
import { attBlock, sendAttache, attachesOf } from '../dip/attache.js';
import { licOffers, buyLicence } from '../dip/licence.js';
import { relOf, sameFaction, hasCapitulated } from '../dip/core.js';
import { pactOf } from '../dip/pact.js';
import { ideologyOf } from '../politics/parties.js';
import { freeMode, keepsCourse, shiftOf } from './free.js';
import { AI } from './constants.js';

/** Divize země `o`, které AI pošle jako první: nečinné, mimo boj a bez rozkazu; nejdřív ty mimo armády, pak nejnovější. */
function spareDivs(state, o, n) {
  const out = [];
  const divs = state.mil.divs;
  for (let id = divs.length - 1; id >= 1; id--) { const d = divs[id]; if (d && d.o === o && !d.vo && !d.b && !d.path.length) out.push(id); }
  out.sort((a, b) => (divs[a].army ? 1 : 0) - (divs[b].army ? 1 : 0) || b - a);
  return out.slice(0, n);
}

/** Pošle zemi `to` až `n` divizí (kolik dovolí pravidla). */
function sendSome(state, o, to, n) {
  const room = Math.min(n, volCap(state, o) - volAway(state, o).length);
  if (room < 1) return state;
  for (let k = room; k >= 1; k--) {
    const ids = spareDivs(state, o, k);
    if (ids.length === k && !volBlock(state, o, to, ids)) return sendSome(sendVolunteers(state, o, to, ids), o, to, 0);
  }
  return state;
}

/** Historičtí dobrovolníci (řádky `HIST_VOL` země `o`). */
function histVolunteers(state, o) {
  const w = getWorld(), tag = w.owners[o].tag, day = state.tick / 24;
  if (!keepsCourse(state, o)) return state;
  for (const r of HIST_VOL) {
    if (r.from !== tag) continue;
    const to = w.ownerIdx[r.to], sh = shiftOf(state, o);
    if (!to || day < r.start + sh || day > r.end + sh || hasCapitulated(state, to) || Math.floor(day - r.start - sh) % AI.VOL_WAVE >= 7) continue;   // vlny doplnění (týden na odeslání)
    const want = r.n - volAway(state, o, to).length;
    if (want > 0) state = sendSome(state, o, to, want);
  }
  return state;
}

/** Spřátelená válčící země, které by AI ve volné historii pomohla (shodná ideologie, dobrý vztah, nepřátelé příjemce jsou jí protivní), nebo 0. */
function friendAtWar(state, o) {
  const w = getWorld(), ideo = ideologyOf(state, o);
  if (ideo === 'neutrality') return 0;
  let best = 0, bestRel = AI.VOL_REL - 1;
  for (let t = 1; t < w.owners.length; t++) {
    if (t === o || hasCapitulated(state, t) || !hasWar(state.mil, t) || ideologyOf(state, t) !== ideo) continue;
    const rel = relOf(state, o, t);
    if (rel <= bestRel) continue;
    if (enemiesOf(state.mil, t).some((e) => relOf(state, o, e) >= 0 || pactOf(state, o, e))) continue;
    best = t; bestRel = rel;
  }
  return best;
}

/** Licence (měsíčně): menší země si od spřátelené země koupí lepší úroveň výzbroje, zbude-li jí politická moc. */
function aiLicence(state, o) {
  const w = getWorld();
  if ((COUNTRIES[w.owners[o].tag]?.tier ?? 3) === 1) return state;
  const own = state.pol.own[o];
  if (!own || own.pp < AI.LIC_KEEP) return state;
  const hist = !freeMode(state);
  for (let b = 1; b < w.owners.length; b++) {
    if (b === o || hasCapitulated(state, b)) continue;
    const close = sameFaction(state, o, b) || state.dip.sub[o] === b || state.dip.sub[b] === o;
    if (hist ? !close : !close && relOf(state, o, b) < AI.LIC_REL) continue;
    for (const k of AI.LIC_KEYS) {
      const off = licOffers(state, o, b).find((x) => x.k === k);
      if (off && !off.block && own.pp - off.cost >= AI.LIC_LEFT) return buyLicence(state, o, b, k);
    }
  }
  return state;
}

/** Denní krok AI země `o` (F4): historičtí dobrovolníci denně; obecní dobrovolníci a atašé týdně (jen volná historie); licence měsíčně. */
export function aiVolunteers(state, o) {
  const day = Math.floor(state.tick / 24);
  state = histVolunteers(state, o);
  if ((day + o) % 30 === 0) state = aiLicence(state, o);
  if (!freeMode(state) || (day + o) % 7 !== 0 || hasWar(state.mil, o)) return state;
  const t = friendAtWar(state, o);
  if (!t) return state;
  state = sendSome(state, o, t, AI.VOL_N);
  const own = state.pol.own[o];
  if (own && own.pp >= AI.ATT_KEEP && !attachesOf(state, o).includes(t) && !attBlock(state, o, t)) state = sendAttache(state, o, t);
  return state;
}
