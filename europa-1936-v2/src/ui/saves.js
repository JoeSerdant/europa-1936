// Úložiště uložených her (M25): sloty v localStorage. Všechny přístupy jsou v try/catch (soukromé okno, plné úložiště, zakázané úložiště).
import { packGame, unpackGame, formatDate, getWorld } from '../engine/index.js';

export const SLOTS = ['auto', 'quick', 1, 2, 3, 4, 5];
export const SLOT_NAMES = { auto: 'Automatické uložení', quick: 'Rychlé uložení' };
export const slotName = (s) => SLOT_NAMES[s] || `Slot ${s}`;
const key = (slot, kind) => `e1936:${kind}:${slot}`;

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

/** Seznam obsazených slotů (meta údaje pro dialog); vadné záznamy se přeskočí. */
export function listSaves() {
  const ls = store();
  const out = [];
  if (!ls) return out;
  for (const slot of SLOTS) {
    try {
      const raw = ls.getItem(key(slot, 'meta'));
      if (raw) out.push({ slot, ...JSON.parse(raw) });
    } catch { /* vadný záznam */ }
  }
  return out;
}

/** Uloží stav do slotu; vrací null, nebo český popis chyby. `savedAt` je text času uložení (z rozhraní). */
export function writeSave(slot, state, savedAt = '') {
  const ls = store();
  if (!ls) return 'Úložiště prohlížeče není dostupné.';
  try {
    const pack = JSON.stringify(packGame(state));
    const w = getWorld();
    const meta = { player: state.player, name: state.player ? w.owners[w.ownerIdx[state.player]].name : 'Pozorovatel', date: formatDate(state.tick), tick: state.tick, savedAt, size: pack.length };
    ls.setItem(key(slot, 'save'), pack);
    ls.setItem(key(slot, 'meta'), JSON.stringify(meta));
    return null;
  } catch {
    return 'Hru se nepodařilo uložit (úložiště je plné nebo zakázané).';
  }
}

/** Načte slot: `{ state }`, nebo `{ error }`. */
export function readSave(slot) {
  const ls = store();
  if (!ls) return { error: 'Úložiště prohlížeče není dostupné.' };
  let raw;
  try { raw = ls.getItem(key(slot, 'save')); } catch { return { error: 'Úložiště nejde číst.' }; }
  if (!raw) return { error: 'Slot je prázdný.' };
  let pack;
  try { pack = JSON.parse(raw); } catch { return { error: 'Uložená hra je poškozená (nejde přečíst).' }; }
  return unpackGame(pack);
}

export function deleteSave(slot) {
  const ls = store();
  if (!ls) return;
  try { ls.removeItem(key(slot, 'save')); ls.removeItem(key(slot, 'meta')); } catch { /* nic */ }
}
