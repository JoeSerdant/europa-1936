// Dobrovolníci a expediční sbory (F4, jako v HOI4): země předá vlastní divize jiné zemi, která válčí.
// Předaná divize má vlastníka `o` = příjemce (bojuje, pohybuje se a zásobuje jako jeho jednotka) a pole `vo` = původní země:
// doplňuje ji výzbrojí a lidskou silou původní země (`dailyReinforce`), statistiky má ze své šablony (úrovně výzbroje původní země)
// a zkušenosti z jejích bojů jdou původní zemi (`docDay`).
// – Dobrovolníci: země mimo válku pošle omezený počet divizí (podpora války, vztah, podíl armády); objeví se v hlavním městě příjemce.
// – Expediční sbor: spolubojovník (společný nepřítel) předá libovolné divize; zůstanou, kde stojí (příjemce tam musí mít přístup).
// Divize se vracejí domů povoláním zpět (`recallVolunteers`), po konci války příjemce nebo jeho kapitulaci (`volDay`, `capitulate`).
import { getWorld } from '../world.js';
import { hasWar, atWar, enemiesOf, nearestControlled } from '../army/war.js';
import { withCtx } from '../army/commands.js';
import { editDiv, relocate } from '../army/ctx.js';
import { canEnter } from '../army/paths.js';
import { logAdd } from '../log.js';
import { hasCapitulated, relOf, sameFaction, setRel } from './core.js';
import { DIP } from './constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;

/** Mají `a` a `b` společného nepřítele (jsou spolubojovníci)? */
export const coBelligerent = (state, a, b) => enemiesOf(state.mil, a).some((e) => atWar(state.mil, b, e));

/** Druh pomoci, kterou smí `from` poskytnout zemi `to`: 'exp' (expediční sbor spolubojovníka), 'vol' (dobrovolníci země mimo válku), nebo null. */
export function volKind(state, from, to) {
  if (!ok(from) || !ok(to) || from === to || !hasWar(state.mil, to) || atWar(state.mil, from, to)) return null;
  if (coBelligerent(state, from, to)) return 'exp';
  return hasWar(state.mil, from) ? null : 'vol';
}

/** Divize země `from`, které teď slouží jinde (u příjemce `to`, nebo u kohokoli při `to` = 0). */
export function volAway(state, from, to = 0) {
  const out = [];
  const divs = state.mil.divs;
  for (let id = 1; id < divs.length; id++) { const d = divs[id]; if (d && d.vo === from && (!to || d.o === to)) out.push(id); }
  return out;
}

/** Vlastní divize země (bez cizích dobrovolníků, které jí slouží). */
const ownDivs = (state, o) => { let n = 0; for (const d of state.mil.divs) if (d && d.o === o && !d.vo) n++; return n; };

/** Kolik divizí smí `from` mít celkem jako dobrovolníky (podíl armády, strop; malé armády nic). */
export function volCap(state, from) {
  const n = ownDivs(state, from) + volAway(state, from).length;
  return n < DIP.VOL_MIN_ARMY ? 0 : Math.min(DIP.VOL_MAX, Math.floor(n * DIP.VOL_SHARE));
}

/** Kam dorazí dobrovolníci země `to`: hlavní město, nebo nejbližší provincie, kterou ovládá (0 = nikam). */
export function volDest(state, to) {
  const cap = getWorld().owners[to].cap;
  if (state.ctrl[cap] === to) return cap;
  return nearestControlled(state.ctrl, to, cap);
}

/** Proč nejde předat divize `ids` země `from` zemi `to` (český text), nebo null. */
export function volBlock(state, from, to, ids) {
  if (!ok(from) || !ok(to) || from === to) return 'Neplatná země.';
  if (hasCapitulated(state, from) || hasCapitulated(state, to)) return 'Kapitulovaná země divize neposílá ani nepřijímá.';
  if (!hasWar(state.mil, to)) return 'Země neválčí – divize jí lze poslat jen do války.';
  if (atWar(state.mil, from, to)) return 'Země jsou spolu ve válce.';
  const kind = volKind(state, from, to);
  if (!kind) return 'Dobrovolníky posílá jen země mimo válku; spolubojovník posílá expediční sbor.';
  if (!Array.isArray(ids) || !ids.length) return 'Nejsou vybrané žádné divize.';
  const divs = state.mil.divs;
  for (const id of ids) {
    const d = Number.isInteger(id) && id > 0 && id < divs.length ? divs[id] : null;
    if (!d || d.o !== from || d.vo) return 'Lze poslat jen vlastní divize.';
    if (d.b) return 'Divize v boji nelze poslat.';
    if (kind === 'exp' && !canEnter(state.mil, to, state.ctrl[d.p], state.dip)) return 'Expediční sbor musí stát na území, kam má příjemce přístup.';
  }
  if (new Set(ids).size !== ids.length) return 'Neplatný výběr divizí.';
  if (kind === 'vol') {
    const own = state.pol.own[from];
    if (!own || own.ws < DIP.VOL_WS) return `Dobrovolníky lze poslat od podpory války ${Math.round(DIP.VOL_WS * 100)} %.`;
    if (!sameFaction(state, from, to) && relOf(state, from, to) < DIP.VOL_REL) return `Chybí vztah aspoň ${DIP.VOL_REL}.`;
    const cap = volCap(state, from), away = volAway(state, from).length;
    if (!cap) return `Dobrovolníky posílá jen země s aspoň ${DIP.VOL_MIN_ARMY} divizemi.`;
    if (away + ids.length > cap) return `Nejvýš ${cap} divizí jako dobrovolníci (už slouží ${away}).`;
    if (!volDest(state, to)) return 'Příjemce nemá kam dobrovolníky přijmout.';
  }
  return null;
}

/** Předá divize `ids` země `from` zemi `to` (dobrovolníci do hlavního města příjemce, expediční sbor na místě). Neplatný vstup = tentýž stav. */
export function sendVolunteers(state, from, to, ids) {
  if (volBlock(state, from, to, ids)) return state;
  const kind = volKind(state, from, to), dest = kind === 'vol' ? volDest(state, to) : 0;
  let s = withCtx(state, (ctx) => {
    for (const id of ids) {
      const e = editDiv(ctx, id);
      e.o = to; e.vo = from; e.army = 0; e.path = []; e.prog = 0; e.hold = 0;
      delete e.mo;
      if (dest && e.p !== dest) { relocate(ctx, id, dest); editDiv(ctx, id).dig = 0; }
    }
    ctx.ver++;
  });
  s = { ...s, dip: { ...s.dip, rel: setRel(s.dip.rel, from, to, DIP.VOL_REL_GAIN), ver: s.dip.ver + 1 } };
  return logAdd(s, { k: 'vol', a: from, b: to, x: kind, y: ids.length });
}

/**
 * Vrátí domů divize, které splňují `pred(d)` a nejsou v boji: vlastníkem je znovu původní země; zůstanou na místě, smí-li tam stát,
 * jinak se objeví v nejbližší provincii, kterou původní země ovládá (bez území zůstanou trvale u příjemce). Zapíše jeden záznam deníku za dvojici zemí.
 */
function returnVolunteers(state, pred, why = '') {
  const back = new Map();
  const s = withCtx(state, (ctx) => {
    for (let id = 1; id < ctx.divs.length; id++) {
      const d = ctx.divs[id];
      if (!d || !d.vo || d.b || !pred(d)) continue;
      const from = d.vo, to = d.o;
      const stay = canEnter(ctx.mil, from, ctx.ctrl[d.p], ctx.state.dip);
      const home = stay ? d.p : (ctx.ctrl[getWorld().owners[from].cap] === from ? getWorld().owners[from].cap : nearestControlled(ctx.ctrl, from, d.p));
      const e = editDiv(ctx, id);
      delete e.vo;
      if (!home) continue;   // původní země nemá kam – divize zůstane příjemci
      e.o = from; e.army = 0; e.path = []; e.prog = 0; e.hold = 0;
      delete e.mo;
      if (home !== d.p) { relocate(ctx, id, home); editDiv(ctx, id).dig = 0; }
      const k = `${from}>${to}`;
      back.set(k, (back.get(k) || 0) + 1);
    }
    if (back.size) ctx.ver++;
  });
  let out = s;
  const me = state.player ? getWorld().ownerIdx[state.player] : 0;
  for (const [k, n] of back) { const [a, b] = k.split('>').map(Number); if (me === a || me === b) out = logAdd(out, { k: 'volback', a, b, y: n, x: why }); }   // osobní záznam jen s hráčem
  return out;
}

/** Povolá zpět divize země `from` sloužící u `to` (divize v boji zůstanou, dokud bitva trvá). Nic k povolání = tentýž stav. */
export function recallVolunteers(state, from, to) {
  if (!ok(from) || !ok(to) || !volAway(state, from, to).length) return state;
  return returnVolunteers(state, (d) => d.vo === from && d.o === to, 'recall');
}

/** Při kapitulaci příjemce `o` se jeho cizí divize vracejí domů (volá `capitulate`). */
export const returnFrom = (state, o) => returnVolunteers(state, (d) => d.o === o, 'cap');

/**
 * Denní krok (F4): divize se vracejí, když příjemce už neválčí, kapituloval nebo je s původní zemí ve válce; po kapitulaci původní země
 * zůstanou trvale u příjemce. Bez předaných divizí nic nemění.
 */
export function volDay(state) {
  const divs = state.mil.divs;
  let any = false, orphan = false;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d || !d.vo) continue;
    any = true;
    if (state.dip.cap[d.vo]) orphan = true;
  }
  if (!any) return state;
  if (orphan) {
    state = withCtx(state, (ctx) => {
      for (let id = 1; id < ctx.divs.length; id++) { const d = ctx.divs[id]; if (d && d.vo && ctx.state.dip.cap[d.vo]) delete editDiv(ctx, id).vo; }
    });
  }
  return returnVolunteers(state, (d) => state.dip.cap[d.o] || !hasWar(state.mil, d.o) || atWar(state.mil, d.o, d.vo), 'end');
}
