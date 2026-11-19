// Úložiště uložených her (M25, F2): sloty v IndexedDB (velký limit, nepotřebuje místo v localStorage), data komprimovaná gzipem
// (`CompressionStream`, běží nativně a asynchronně – automatické uložení nezasekne hru). Bez IndexedDB (soukromé okno, staré prohlížeče)
// se ukládá záložně do localStorage (gzip v base64, bez komprese čistý JSON). Starší nekomprimované sloty z localStorage se dál zobrazují
// a načítají; nové uložení do slotu je z localStorage smaže. Všechny funkce jsou asynchronní a nikdy nevyhazují – chyby vrací česky.
import { packGame, unpackGame, formatDate, getWorld } from '../engine/index.js';

export const SLOTS = ['auto', 'quick', 1, 2, 3, 4, 5];
export const SLOT_NAMES = { auto: 'Automatické uložení', quick: 'Rychlé uložení' };
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

// zápisy jdou za sebou (automatické a ruční uložení se nepředbíhají)
let chain = Promise.resolve();

/** Uloží stav do slotu; vrací null, nebo český popis chyby. `savedAt` je text času uložení (z rozhraní). */
export function writeSave(slot, state, savedAt = '') {
  const job = chain.then(() => doWrite(slot, state, savedAt));
  chain = job.catch(() => null);
  return job;
}

async function doWrite(slot, state, savedAt) {
  let text;
  try { text = JSON.stringify(packGame(state)); } catch { return 'Hru se nepodařilo zabalit.'; }
  const w = getWorld();
  const meta = { slot, player: state.player, name: state.player ? w.owners[w.ownerIdx[state.player]].name : 'Pozorovatel', date: formatDate(state.tick), tick: state.tick, savedAt, size: text.length, zip: 0 };
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
