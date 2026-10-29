// Ukládání a načítání her (M25): zabalení stavu do obálky a kontrola při načtení. Čisté funkce; čas uložení a úložiště řeší rozhraní (ui/saves.js).
import { getWorld } from './world.js';
import { GAME_VERSION } from './game.js';

export const SAVE_FORMAT = 1;
const SYSTEMS = ['mil', 'ind', 'tech', 'pol', 'nat', 'dip', 'ai', 'log', 'nav', 'air'];

/** Obálka uložené hry. */
export function packGame(state) {
  return { fmt: SAVE_FORMAT, v: GAME_VERSION, tick: state.tick, player: state.player, state };
}

const isArr = (x) => Array.isArray(x);

/** Zkontroluje tvar stavu proti světu; vrací český popis chyby, nebo null. */
export function validateState(s) {
  const w = getWorld();
  if (!s || typeof s !== 'object') return 'Uložená hra je poškozená (chybí stav).';
  if (!Number.isInteger(s.tick) || s.tick < 0) return 'Uložená hra je poškozená (čas).';
  if (s.player != null && !w.ownerIdx[s.player]) return 'Uložená hra je poškozená (neznámá země hráče).';
  if (!isArr(s.stateOwner) || s.stateOwner.length !== w.states.length) return 'Uložená hra neodpovídá mapě (státy).';
  if (!isArr(s.ctrl) || s.ctrl.length !== w.L + 1) return 'Uložená hra neodpovídá mapě (provincie).';
  if (typeof s.rng !== 'number') return 'Uložená hra je poškozená (náhoda).';
  for (const k of SYSTEMS) if (!s[k] || typeof s[k] !== 'object') return `Uložená hra je poškozená (chybí část „${k}“).`;
  if (!isArr(s.mil.divs) || !isArr(s.mil.stock) || s.mil.stock.length !== w.owners.length) return 'Uložená hra je poškozená (armáda).';
  if (!isArr(s.ind.st) || s.ind.st.length !== w.states.length) return 'Uložená hra je poškozená (průmysl).';
  for (const k of ['tech', 'pol', 'nat']) if (!isArr(s[k].own) || s[k].own.length !== w.owners.length) return `Uložená hra je poškozená (${k}).`;
  if (!isArr(s.air.wings) || !isArr(s.air.pool) || s.air.pool.length !== w.owners.length) return 'Uložená hra je poškozená (letectvo).';
  if (!isArr(s.dip.fac) || s.dip.fac.length !== w.owners.length) return 'Uložená hra je poškozená (diplomacie).';
  return null;
}

/** Rozbalí uloženou hru: `{ state }`, nebo `{ error }` s českým popisem. */
export function unpackGame(pack) {
  if (!pack || typeof pack !== 'object' || pack.fmt !== SAVE_FORMAT) return { error: 'Soubor není uložená hra z této hry.' };
  if (pack.v !== GAME_VERSION) return { error: `Uložená hra je z jiné verze (${pack.v}, potřeba ${GAME_VERSION}) a nejde načíst.` };
  const err = validateState(pack.state);
  return err ? { error: err } : { state: pack.state };
}
