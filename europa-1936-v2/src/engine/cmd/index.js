// Velitelská moc a schopnosti armád (M53): `state.cmd = { cp: [moc podle země], ab: [{ o, army, id, until }] }`.
// Moc se hromadí denně; schopnost stojí moc a dává armádě dočasné bonusy (čte je `army/unit.js modsOf` přes `abilityMods`).
import { ABILITIES, ABILITY_IDS } from '../../data/cmd/abilities.js';
import { CMD } from './constants.js';
import { hasWar } from '../army/war.js';

export { CMD, ABILITIES, ABILITY_IDS };

export function createCmd(w) {
  return { cp: Array.from({ length: w.owners.length }, (_, o) => (o ? CMD.START : 0)), ab: [] };
}

/** Aktivní schopnost armády (nebo null). */
export const abilityOf = (state, army) => (state.cmd.ab.find((a) => a.army === army && a.until > state.tick)) || null;

/** Součet bonusů schopnosti armády `army` (jen klíče, které schopnost mění), nebo null. */
export function abilityMods(state, army) {
  if (!army || !state.cmd || !state.cmd.ab.length) return null;
  const a = abilityOf(state, army);
  return a ? ABILITIES[a.id].mods : null;
}

/** Proč armáda nemůže použít schopnost (český text), nebo null. */
export function abilityBlock(state, o, army, id) {
  const A = ABILITIES[id], ar = state.mil.armies[army];
  if (!A) return 'Neznámá schopnost.';
  if (!Number.isInteger(o) || !ar || ar.o !== o) return 'Neplatná armáda.';
  if (!state.mil.divs.some((d) => d && d.army === army)) return 'Armáda nemá žádné divize.';
  if (abilityOf(state, army)) return 'Armáda už má aktivní schopnost.';
  if (state.cmd.cp[o] < A.cost) return `Chybí velitelská moc (${Math.ceil(A.cost - state.cmd.cp[o])}).`;
  return null;
}

/** Použije schopnost: odečte moc a zapíše aktivní schopnost na `days` dní. */
export function useAbility(state, o, army, id) {
  if (abilityBlock(state, o, army, id)) return state;
  const A = ABILITIES[id];
  const cp = state.cmd.cp.slice(); cp[o] -= A.cost;
  return { ...state, cmd: { cp, ab: [...state.cmd.ab, { o, army, id, until: state.tick + A.days * 24 }] } };
}

/** Denní krok: přírůstek moci a vypršení schopností. */
export function cmdDay(state) {
  const cp = state.cmd.cp.map((v, o) => (o ? Math.min(CMD.MAX, v + (hasWar(state.mil, o) ? CMD.PER_DAY_WAR : CMD.PER_DAY)) : 0));
  const live = state.cmd.ab.filter((a) => a.until > state.tick && state.mil.armies[a.army]);
  return { ...state, cmd: { cp, ab: live.length === state.cmd.ab.length ? state.cmd.ab : live } };
}

export const cmdHour = (state) => (state.tick % 24 === 0 ? cmdDay(state) : state);

/** AI: v boji použije schopnost – útočící armáda vynucený útok, bránící poslední vzdor. */
export function aiCommand(state, o) {
  if (!hasWar(state.mil, o)) return state;
  for (let id = 1; id < state.mil.armies.length; id++) {
    const ar = state.mil.armies[id];
    if (!ar || ar.o !== o || abilityOf(state, id)) continue;
    const divs = [];
    for (let d = 1; d < state.mil.divs.length; d++) if (state.mil.divs[d] && state.mil.divs[d].army === id && state.mil.divs[d].b) divs.push(d);
    if (!divs.length) continue;
    const att = divs.filter((d) => state.mil.battles.some((b) => b && b.att.includes(d))).length * 2 >= divs.length;
    const next = useAbility(state, o, id, att ? 'force_attack' : 'last_stand');
    if (next !== state) state = next;
  }
  return state;
}
