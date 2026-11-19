// Úložiště uložených her (M25, F2): sloty v IndexedDB (velký limit, nepotřebuje místo v localStorage), data komprimovaná gzipem
// (`CompressionStream`, běží nativně a asynchronně – automatické uložení nezasekne hru). Bez IndexedDB (soukromé okno, staré prohlížeče)
// se ukládá záložně do localStorage (gzip v base64, bez komprese čistý JSON). Starší nekomprimované sloty z localStorage se dál zobrazují
// a načítají; nové uložení do slotu je z localStorage smaže. Všechny funkce jsou asynchronní a nikdy nevyhazují – chyby vrací česky.
import { packGame, unpackGame, formatDate, getWorld } from '../engine/index.js';

export const AUTO_SLOTS = ['auto', 'auto2', 'auto3'];   // F3: automatická uložení na střídačku (přepisuje se nejstarší)
export const SLOTS = [...AUTO_SLOTS, 'quick', 1, 2, 3, 4, 5];
export const SLOT_NAMES = { auto: 'Automatické uložení 1', auto2: 'Automatické uložení 2', auto3: 'Automatické uložení 3', quick: 'Rychlé uložení' };
export const slotName = (s) => SLOT_NAMES[s] || `Slot ${s}`;
const key = (slot, kind) => `e1936:${kind}:${slot}`;
const GZ = 'gz1:';   // předpona komprimovaného slotu v localStorage

const local = () => { try { return globalThis.localStorage || null; } catch { return null; } };

// ---- komprese ----
const canZip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function';
/** Text → gzip (Uint8Array). */
export async function gzip(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** gzip (Uint8Array / ArrayBuffer) → text. */
export async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
function toB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromB64(text) {
  const bin = atob(text), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---- IndexedDB ----
let dbp = null;
/** Otevřená databáze, nebo null (IndexedDB chybí nebo je zakázané). Výsledek se pamatuje. */
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    let idb = null;
    try { idb = globalThis.indexedDB || null; } catch { idb = null; }
    if (!idb) { resolve(null); return; }
    try {
      const rq = idb.open('e1936', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        for (const n of ['meta', 'data']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n);
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(null);
      rq.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
/** Jen pro testy: zapomene otevřenou databázi (po výměně `indexedDB`). */
export const resetSaveDb = () => { dbp = null; };

const ask = (rq) => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
/** Zápisová transakce nad oběma sklady; vyřeší se po dokončení. */
const write = (db, fn) => new Promise((res, rej) => {
  try {
    const t = db.transaction(['meta', 'data'], 'readwrite');
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('abort'));
    fn(t.objectStore('meta'), t.objectStore('data'));
  } catch (e) { rej(e); }
});

/** Starý slot v localStorage (už nahrazený novým uložením) smaže. */
function dropLocal(slot) {
  const ls = local();
  if (!ls) return;
  try { ls.removeItem(key(slot, 'save')); ls.removeItem(key(slot, 'meta')); } catch { /* nic */ }
}

/** Seznam obsazených slotů (meta údaje pro dialog) v pořadí `SLOTS`; vadné záznamy se přeskočí. */
export async function listSaves() {
  const got = new Map();
  const db = await openDb();
  if (db) {
    try {
      const metas = await ask(db.transaction('meta', 'readonly').objectStore('meta').getAll());
      for (const m of metas) if (m && SLOTS.includes(m.slot)) got.set(m.slot, m);
    } catch { /* databáze nejde číst – zůstanou sloty z localStorage */ }
  }
  const ls = local();
  if (ls) {
    for (const slot of SLOTS) {
      if (got.has(slot)) continue;
      try {
        const raw = ls.getItem(key(slot, 'meta'));
        if (raw) got.set(slot, { slot, ...JSON.parse(raw) });
      } catch { /* vadný záznam */ }
    }
  }
  return SLOTS.filter((s) => got.has(s)).map((s) => got.get(s));
}

/** F3: slot pro další automatické uložení – první prázdný, jinak ten s nejstarším uložením (`stamp`; starší záznamy bez něj jsou nejstarší). */
export async function nextAutoSlot() {
  const metas = new Map((await listSaves()).map((m) => [m.slot, m]));
  let best = AUTO_SLOTS[0], bt = Infinity;
  for (const s of AUTO_SLOTS) {
    const m = metas.get(s);
    if (!m) return s;
    const t = m.stamp || 0;
    if (t < bt) { bt = t; best = s; }
  }
  return best;
}

// ---- F3: interval automatického ukládání (volba hráče v localStorage) ----
export const AUTOSAVE_OPTS = [['week', 'každý týden', 24 * 7], ['month', 'každý měsíc', 24 * 30], ['year', 'každý rok', 24 * 365], ['off', 'vypnuto', 0]];
const AUTO_KEY = 'e1936.autosave';
/** Zvolený interval automatického ukládání (id z `AUTOSAVE_OPTS`, výchozí měsíc). */
export function autoSaveEvery() {
  try { const v = globalThis.localStorage && globalThis.localStorage.getItem(AUTO_KEY); if (AUTOSAVE_OPTS.some(([id]) => id === v)) return v; } catch { /* nic */ }
  return 'month';
}
export function setAutoSaveEvery(id) {
  if (!AUTOSAVE_OPTS.some(([x]) => x === id)) return;
  try { globalThis.localStorage && globalThis.localStorage.setItem(AUTO_KEY, id); } catch { /* nic */ }
}
/** Herní hodiny mezi automatickými uloženími (0 = vypnuto). */
export const autoSaveHours = () => AUTOSAVE_OPTS.find(([id]) => id === autoSaveEvery())[2];

// zápisy jdou za sebou (automatické a ruční uložení se nepředbíhají)
let chain = Promise.resolve();

/** Uloží stav do slotu; vrací null, nebo český popis chyby. `savedAt` je text času uložení, `stamp` jeho číselná podoba (z rozhraní, F3: pořadí automatických uložení). */
export function writeSave(slot, state, savedAt = '', stamp = 0) {
  const job = chain.then(() => doWrite(slot, state, savedAt, stamp));
  chain = job.catch(() => null);
  return job;
}

async function doWrite(slot, state, savedAt, stamp) {
  let text;
  try { text = JSON.stringify(packGame(state)); } catch { return 'Hru se nepodařilo zabalit.'; }
  const w = getWorld();
  const meta = { slot, player: state.player, name: state.player ? w.owners[w.ownerIdx[state.player]].name : 'Pozorovatel', date: formatDate(state.tick), tick: state.tick, savedAt, stamp, size: text.length, zip: 0 };
  let bytes = null;
  if (canZip()) { try { bytes = await gzip(text); meta.zip = bytes.length; } catch { bytes = null; } }
  const db = await openDb();
  if (db) {
    try {
      await write(db, (m, d) => { d.put(bytes || text, String(slot)); m.put(meta, String(slot)); });
      dropLocal(slot);
      return null;
    } catch {
      return 'Hru se nepodařilo uložit (úložiště prohlížeče je plné nebo zakázané).';
    }
  }
  const ls = local();
  if (!ls) return 'Úložiště prohlížeče není dostupné.';
  try {
    ls.setItem(key(slot, 'save'), bytes ? GZ + toB64(bytes) : text);
    ls.setItem(key(slot, 'meta'), JSON.stringify(meta));
    return null;
  } catch {
    return 'Hru se nepodařilo uložit (úložiště je plné nebo zakázané).';
  }
}

/** Uložená data (gzip, base64 s předponou, nebo čistý JSON) → `{ state }`, nebo `{ error }`. */
async function decode(data) {
  let text;
  try {
    if (typeof data === 'string') text = data.startsWith(GZ) ? await gunzip(fromB64(data.slice(GZ.length))) : data;
    else text = await gunzip(data);
  } catch { return { error: 'Uložená hra je poškozená (nejde rozbalit).' }; }
  let pack;
  try { pack = JSON.parse(text); } catch { return { error: 'Uložená hra je poškozená (nejde přečíst).' }; }
  return unpackGame(pack);
}

/** Načte slot: `{ state }`, nebo `{ error }`. */
export async function readSave(slot) {
  const db = await openDb();
  if (db) {
    let data;
    try { data = await ask(db.transaction('data', 'readonly').objectStore('data').get(String(slot))); } catch { return { error: 'Úložiště nejde číst.' }; }
    if (data != null) return decode(data);
  }
  const ls = local();
  if (!ls) return { error: db ? 'Slot je prázdný.' : 'Úložiště prohlížeče není dostupné.' };
  let raw;
  try { raw = ls.getItem(key(slot, 'save')); } catch { return { error: 'Úložiště nejde číst.' }; }
  if (!raw) return { error: 'Slot je prázdný.' };
  return decode(raw);
}

/** Smaže slot (v databázi i případný starý v localStorage). */
export async function deleteSave(slot) {
  const db = await openDb();
  if (db) { try { await write(db, (m, d) => { m.delete(String(slot)); d.delete(String(slot)); }); } catch { /* nic */ } }
  dropLocal(slot);
}
