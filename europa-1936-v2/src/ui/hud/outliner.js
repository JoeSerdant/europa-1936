// Přehled vpravo (outliner jako v HOI4): čistá funkce stavu → oddíly s položkami pro komponentu `Outliner`.
// Každá položka má `key`, `n` (název), volitelně `v` (číslo nebo text vpravo), `pct` (0–1, proužek), `tone` ('bad' | 'good' | '')
// a `go` (co udělá klik: { k: 'army' | 'battle' | 'fleet' | 'panel' | 'prov', id }).
import { getWorld, researchOf, industryOf, navyOf, airOf, FOCUS_BY_ID, TECHS, BUILDINGS, EQUIP, PLANES, SHIPS, NAV_MISSIONS } from '../../engine/index.js';
import { armyCards } from '../army/armybar.js';

const eqName = (k) => (EQUIP[k] || PLANES[k] || SHIPS[k] || { n: k }).n;
const MIS = { patrol: 'hlídka', cas: 'podpora', bomb: 'bombardování', intercept: 'stíhání', naval: 'úder na lodě' };

/** Oddíly přehledu pro zemi `me` (prázdné oddíly se vynechají). */
export function outlinerData(state, me) {
  if (!me) return [];
  const w = getWorld(), out = [];
  // národní cíl
  const cur = state.nat.own[me] && state.nat.own[me].cur;
  const f = cur && FOCUS_BY_ID[cur.id];
  out.push({ id: 'focus', n: 'Národní cíl', icon: 'focus', items: f ? [{ key: f.id, n: f.n, v: `${Math.max(0, Math.ceil(f.days - cur.p))} d`, pct: Math.min(1, cur.p / Math.max(1, f.days)), go: { k: 'panel', id: 'nat' } }]
    : [{ key: 'none', n: 'Žádný cíl – vyberte', tone: 'bad', go: { k: 'panel', id: 'nat' } }] });
  // výzkum
  const r = researchOf(state, me);
  out.push({ id: 'research', n: 'Výzkum', icon: 'research', items: r.slots.map((s) => (s.id
    ? { key: `r${s.slot}`, n: s.tech.n, v: s.eta >= 0 ? `${Math.ceil(s.eta)} d` : '–', pct: Math.min(1, s.p / Math.max(1, s.tech.days)), go: { k: 'panel', id: 'research' } }
    : { key: `r${s.slot}`, n: 'Volný slot', tone: 'bad', go: { k: 'panel', id: 'research' } })) });
  // bitvy s účastí hráče
  const mine = (id) => state.mil.divs[id] && state.mil.divs[id].o === me;
  const battles = [];
  for (const b of state.mil.battles) {
    const att = b.att.some(mine), dep = b.dep.some(mine);
    if (!att && !dep) continue;
    const adv = att ? b.adv : 1 - b.adv;   // podíl zásahů hráčovy strany
    battles.push({ key: `b${b.id}`, n: `${att ? 'Útok' : 'Obrana'}: ${w.provName(b.p)}`, v: `${Math.round(adv * 100)} %`, pct: adv, tone: adv >= 0.5 ? 'good' : 'bad', go: { k: 'battle', id: b.id } });
  }
  if (battles.length) out.push({ id: 'battles', n: 'Bitvy', icon: 'swords', items: battles.slice(0, 12), more: Math.max(0, battles.length - 12) });
  // armády
  const ac = armyCards(state, me);
  const armies = [...ac.groups.flatMap((g) => g.cards), ...ac.loose].map((a) => ({
    key: `a${a.id}`, n: a.nm, v: a.n, pct: a.org, tone: a.lack ? 'bad' : a.fight ? 'good' : '', go: { k: 'army', id: a.id },
    tip: `${a.nm}: ${a.n} divizí, organizace ${Math.round(a.org * 100)} %${a.fight ? `, v boji ${a.fight}` : ''}${a.lack ? `, bez zásob ${a.lack}` : ''}`,
  }));
  if (ac.free.length) armies.push({ key: 'free', n: 'Samostatné divize', v: ac.free.length, go: { k: 'panel', id: 'army' } });
  if (armies.length) out.push({ id: 'armies', n: 'Armády', icon: 'army', items: armies });
  // výcvik
  const queue = state.mil.queue.filter((q) => q.o === me);
  if (queue.length) {
    const next = Math.min(...queue.map((q) => q.done));
    out.push({ id: 'train', n: 'Výcvik', icon: 'recruit', items: [{ key: 'q', n: `${queue.length} ${queue.length === 1 ? 'divize' : queue.length < 5 ? 'divize' : 'divizí'} ve výcviku`, v: `${Math.max(0, Math.ceil((next - state.tick) / 24))} d`, go: { k: 'panel', id: 'recruit' } }] });
  }
  // flotily
  const nv = navyOf(state, me);
  if (nv.fleets.length) out.push({ id: 'fleets', n: 'Flotily', icon: 'navy', items: nv.fleets.map((fl) => ({ key: `f${fl.id}`, n: fl.nm, v: fl.count, tone: fl.blocked ? 'bad' : '', go: { k: 'fleet', id: fl.id }, tip: `${fl.nm}: ${fl.count} lodí · ${fl.moving ? `pluje do ${fl.dest}` : fl.at}${fl.m && NAV_MISSIONS[fl.m] ? ` · ${NAV_MISSIONS[fl.m].n}` : ''}` })) });
  // letectvo
  const air = airOf(state, me);
  if (air.wings.length) out.push({ id: 'air', n: 'Letectvo', icon: 'air', items: air.wings.map((wg, i) => ({ key: `w${i}`, n: PLANES[wg.t].n, v: wg.n, tone: wg.m ? 'good' : '', go: { k: 'panel', id: 'air' }, tip: `${PLANES[wg.t].n}: ${wg.n} letounů${wg.m ? ` · mise ${MIS[wg.m] || wg.m}` : ' · bez mise'}` })) });
  // výroba a stavby
  const ind = industryOf(state, me);
  if (ind.lines.length) out.push({ id: 'prod', n: 'Výroba', icon: 'industry', items: ind.lines.map((l, i) => ({ key: `l${i}`, n: eqName(l.eq), v: `${l.fac}×`, pct: Math.min(1, l.eff), tone: l.f < 0.999 ? 'bad' : '', go: { k: 'ind', id: 'prod' }, tip: `${eqName(l.eq)}: ${l.fac} továren, efektivita ${Math.round(l.eff * 100)} %${l.f < 0.999 ? ', chybí suroviny' : ''}` })) });
  if (ind.build.length) out.push({ id: 'build', n: 'Stavby', icon: 'build', items: ind.build.slice(0, 10).map((b) => ({ key: `c${b.id}`, n: `${BUILDINGS[b.k].n}: ${w.states[b.s].n}`, pct: Math.min(1, b.prog / BUILDINGS[b.k].cost), go: { k: 'prov', id: b.p || w.states[b.s].cap } })), more: Math.max(0, ind.build.length - 10) });
  void TECHS;
  return out;
}
