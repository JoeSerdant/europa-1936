// Nastavení upozornění (F3, jako v HOI4): pro každou skupinu zpráv deníku hráč volí, zda se jen zapíše do deníku, ohlásí
// (pruh, karta nebo krátké oznámení – výchozí), nebo ohlásí a hra se pozastaví. Volby jsou v localStorage (v try/catch), ne v herním stavu.

/** Skupiny zpráv: id → { n: název, info, kinds: druhy záznamů deníku (`e.k`) }. Druh mimo seznam patří do skupiny `other`. */
export const NOTIFY_GROUPS = {
  war: { n: 'Války a mír', info: 'Vyhlášení války, mír, kapitulace, mírové konference, ultimáta, volby, změny vlád a občanské války.', kinds: ['elect', 'war', 'goal', 'peace', 'cap', 'cede', 'civil', 'gov', 'ult', 'ultq', 'release', 'exile', 'restore', 'puppet', 'annex', 'take', 'tribute', 'free', 'rebel', 'collab', 'kick'] },
  dip: { n: 'Diplomacie', info: 'Bloky, záruky, pakty o neútočení, vojenský přístup, půjčky, dobrovolníci, atašé, licence a zámořská pomoc.', kinds: ['faction', 'join', 'facgoal', 'mkt', 'gar', 'garend', 'nap', 'napq', 'napend', 'access', 'accend', 'lend', 'aid', 'spy', 'vol', 'volback', 'att', 'lic'] },
  research: { n: 'Výzkum a doktríny', info: 'Dokončené technologie a přijaté doktríny.', kinds: ['tech', 'doctrine'] },
  focus: { n: 'Národní cíle a události', info: 'Splněné národní cíle a rozhodnutí v událostech.', kinds: ['focus', 'event'] },
  build: { n: 'Stavby', info: 'Dokončené budovy a pevnosti.', kinds: ['built'] },
  military: { n: 'Vojenské operace', info: 'Vylodění, výsadky, potopené lodě, konvoje, bombardování, letecká esa a jaderné zbraně.', kinds: ['landing', 'lands', 'inv', 'drop', 'sunk', 'convoy', 'bombed', 'ace', 'nuke', 'nukeready', 'refit', 'raid'] },
  other: { n: 'Ostatní', info: 'Ostatní zprávy.', kinds: [] },
};
export const NOTIFY_IDS = Object.keys(NOTIFY_GROUPS);

/** Způsoby ohlášení: [id, popisek, nápověda]. */
export const NOTIFY_MODES = [
  ['log', 'Jen deník', 'Zpráva se jen zapíše do deníku (panel Zprávy), nic nevyskočí.'],
  ['show', 'Oznámit', 'Pruh, karta nebo krátké oznámení – hra běží dál.'],
  ['pause', 'Oznámit a pozastavit', 'Oznámí se a hra se pozastaví, abyste mohli hned reagovat.'],
];
const MODE_IDS = NOTIFY_MODES.map(([id]) => id);

const KIND_GROUP = new Map();
for (const id of NOTIFY_IDS) for (const k of NOTIFY_GROUPS[id].kinds) KIND_GROUP.set(k, id);
/** Skupina druhu záznamu deníku. */
export const groupOf = (kind) => KIND_GROUP.get(kind) || 'other';

const KEY = 'e1936.notify';
const DEFAULTS = Object.freeze(Object.fromEntries(NOTIFY_IDS.map((id) => [id, 'show'])));   // výchozí = jako dřív (oznámit, hra běží)
let cache = null;

/** Všechny volby { skupina: způsob } (neznámé hodnoty nahradí výchozí). */
export function notifyPrefs() {
  if (cache) return cache;
  let raw = null;
  try { raw = JSON.parse((globalThis.localStorage && globalThis.localStorage.getItem(KEY)) || 'null'); } catch { raw = null; }
  const out = {};
  for (const id of NOTIFY_IDS) out[id] = raw && MODE_IDS.includes(raw[id]) ? raw[id] : DEFAULTS[id];
  cache = out;
  return out;
}

/** Nastaví způsob ohlášení skupiny `id` (neplatná skupina nebo způsob = nic). */
export function setNotify(id, mode) {
  if (!NOTIFY_GROUPS[id] || !MODE_IDS.includes(mode)) return;
  cache = { ...notifyPrefs(), [id]: mode };
  try { globalThis.localStorage && globalThis.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* nic */ }
}

/** Obnoví výchozí volby. */
export function resetNotify() {
  cache = { ...DEFAULTS };
  try { globalThis.localStorage && globalThis.localStorage.removeItem(KEY); } catch { /* nic */ }
}

/** Způsob ohlášení záznamu deníku: 'log' | 'show' | 'pause'. */
export const notifyMode = (kind) => notifyPrefs()[groupOf(kind)];

/** Jen pro testy: zapomene načtené volby (po výměně localStorage). */
export const resetNotifyCache = () => { cache = null; };
