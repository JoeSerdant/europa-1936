// Rozložení stromu národních cílů jako v HOI4 (UI1): rodič vždy uprostřed nad svými potomky, větve ve svislých sloupcích,
// podstromy se k sobě přisunou, kam až to jde (obrysové skládání po řádcích). Čisté funkce bez Reactu – testuje `test/focus-layout.test.js`.
// Řádek cíle = nejdelší řetěz předpokladů nad ním, sloupec dopočítá rozložení; data stromů (`x`, `y`) slouží jen k pořadí sourozenců.
import { TECHS } from '../../data/research/techs.js';
import { SPIRITS } from '../../data/nat/spirits.js';

const GAP = 1;        // mezera mezi sousedními cíli v jednom řádku (sloupce)
const TREE_GAP = 2;   // mezera mezi samostatnými stromy (kořeny)

/**
 * Poloha každého cíle: `pos` Map(id → { col, row }), rozměr { cols, rows } a `main` Map(id → primární rodič). Sloupce jsou celá čísla nebo poloviny (rodič mezi dvěma potomky).
 * Primární rodič cíle je jeho nejhlubší předpoklad – pod ním se cíl kreslí; další předpoklady jsou jen spojnice.
 */
export function focusLayout(tree) {
  const byId = new Map(tree.map((f, i) => [f.id, { f, i }]));
  const parentsOf = (f) => [...(f.req || []), ...(f.any || [])].filter((r) => byId.has(r) && r !== f.id);
  const rowOf = new Map();
  const row = (id, seen = new Set()) => {
    if (rowOf.has(id)) return rowOf.get(id);
    if (seen.has(id)) return 0;   // cyklus v datech: nerozbít se
    seen.add(id);
    const ps = parentsOf(byId.get(id).f);
    const r = ps.length ? Math.max(...ps.map((p) => row(p, seen))) + 1 : 0;
    rowOf.set(id, r);
    return r;
  };
  for (const f of tree) row(f.id);
  // děti podle primárního rodiče (nejhlubší předpoklad, při shodě první v seznamu)
  const kids = new Map(), roots = [], main = new Map();   // main: cíl → primární rodič
  for (const f of tree) {
    const ps = parentsOf(f);
    if (!ps.length) { roots.push(f.id); continue; }
    let best = ps[0];
    for (const p of ps) if (rowOf.get(p) > rowOf.get(best)) best = p;
    main.set(f.id, best);
    if (!kids.has(best)) kids.set(best, []);
    kids.get(best).push(f.id);
  }
  // pořadí sourozenců: podle původní polohy v datech (x, pak y), aby navazující a vylučující se cíle zůstaly vedle sebe
  const order = (a, b) => { const A = byId.get(a), B = byId.get(b); return (A.f.x ?? 0) - (B.f.x ?? 0) || (A.f.y ?? 0) - (B.f.y ?? 0) || A.i - B.i; };
  for (const arr of kids.values()) arr.sort(order);
  roots.sort(order);

  // obrys podstromu: Map(řádek → [min, max]) vůči sloupci kořene podstromu
  const rel = new Map();   // id → posun vůči rodiči
  const shapeOf = (id) => {
    const r = rowOf.get(id), ch = kids.get(id) || [];
    const shape = new Map([[r, [0, 0]]]);
    if (!ch.length) return shape;
    const subs = ch.map((c) => ({ c, s: shapeOf(c) }));
    const pos = packRow(subs.map((x) => x.s), GAP);
    const mid = (pos[0] + pos[pos.length - 1]) / 2;
    subs.forEach(({ c, s }, k) => {
      const dx = pos[k] - mid;
      rel.set(c, dx);
      for (const [rr, [a, b]] of s) {
        const cur = shape.get(rr);
        shape.set(rr, cur ? [Math.min(cur[0], a + dx), Math.max(cur[1], b + dx)] : [a + dx, b + dx]);
      }
    });
    return shape;
  };
  const rootShapes = roots.map((id) => shapeOf(id));
  const rootPos = packRow(rootShapes, TREE_GAP);
  let minCol = Infinity;
  rootShapes.forEach((s, k) => { for (const [a] of s.values()) minCol = Math.min(minCol, a + rootPos[k]); });
  const out = new Map();
  const place = (id, col) => {
    out.set(id, { col, row: rowOf.get(id) });
    for (const c of kids.get(id) || []) place(c, col + rel.get(c));
  };
  roots.forEach((id, k) => place(id, rootPos[k] - (Number.isFinite(minCol) ? minCol : 0)));
  let cols = 0, rows = 0;
  for (const p of out.values()) { cols = Math.max(cols, p.col + 1); rows = Math.max(rows, p.row + 1); }
  return { pos: out, cols, rows, main };
}

/** Posuny podstromů v řadě zleva doprava tak, aby se jejich obrysy v žádném řádku nepřekryly (mezera `gap`). */
function packRow(shapes, gap) {
  const pos = [];
  const acc = new Map();   // řádek → nejpravější obsazený sloupec
  shapes.forEach((s, k) => {
    let x = 0;
    if (k > 0) {
      x = -Infinity;
      for (const [r, [a]] of s) if (acc.has(r)) x = Math.max(x, acc.get(r) - a + gap);
      if (x === -Infinity) x = pos[k - 1];   // podstromy bez společného řádku – stačí nepřekročit předchozího
      x = Math.max(x, pos[k - 1] + gap);       // sourozenci jdou vždy zleva doprava
    }
    pos.push(x);
    for (const [r, [, b]] of s) acc.set(r, Math.max(acc.has(r) ? acc.get(r) : -Infinity, b + x));
  });
  return pos;
}

/** Dvojice vzájemně se vylučujících cílů ve stejném řádku (pro značku „!“ mezi nimi): [[idA, idB], …], každá jednou. */
export function exclusivePairs(tree, pos) {
  const out = [], seen = new Set();
  for (const f of tree) for (const e of f.excl || []) {
    const k = f.id < e ? `${f.id}|${e}` : `${e}|${f.id}`;
    if (seen.has(k) || !pos.has(e) || !pos.has(f.id)) continue;
    seen.add(k);
    if (pos.get(e).row === pos.get(f.id).row) out.push(f.id < e ? [f.id, e] : [e, f.id]);
  }
  return out;
}

const TECH_CAT = { letectvo: 'air', namor: 'navy', prumysl: 'industry', elektro: 'research' };
const MOD_CAT = { prod: 'industry', build: 'industry', extract: 'industry', cons: 'industry', imp: 'industry', research: 'research', man: 'army', stab: 'politics', ws: 'politics' };

/** Druh cíle podle účinků (ikona a filtr): industry | research | army | air | navy | politics | dip. */
export function focusCat(f) {
  const score = { industry: 0, research: 0, army: 0, air: 0, navy: 0, politics: 0, dip: 0 };
  for (const e of f.fx || []) {
    switch (e.t) {
      case 'factory': case 'infra': case 'stock': score[e.t === 'factory' && e.k === 'dok' ? 'navy' : 'industry'] += 2; break;
      case 'bld': score[e.k === 'dok' || e.k === 'nb' ? 'navy' : e.k === 'afb' || e.k === 'radar' ? 'air' : 'industry'] += 2; break;
      case 'tech': case 'boost': score[TECH_CAT[TECHS[e.id]?.cat] || (TECHS[e.id] ? 'army' : 'research')] += 2; break;
      case 'boostslot': score.research += 2; break;
      case 'xp': score[e.b === 'air' ? 'air' : e.b === 'sea' ? 'navy' : 'army'] += 2; break;
      case 'man': score.army += 1; break;
      case 'spirit': score[SPIRITS[e.id]?.army ? 'army' : 'politics'] += 1; break;
      case 'rel': case 'ult': score.dip += 2; break;
      case 'pp': case 'stab': case 'ws': case 'party': case 'gov': case 'law': case 'adv': case 'mech': score.politics += 1; break;
      default: break;
    }
  }
  for (const k in f.mod || {}) if (MOD_CAT[k]) score[MOD_CAT[k]] += 1;
  let best = 'politics', n = 0;
  for (const k in score) if (score[k] > n) { n = score[k]; best = k; }
  return best;
}

export const FOCUS_CATS = [
  { id: 'industry', n: 'Průmysl', icon: 'industry' },
  { id: 'research', n: 'Výzkum', icon: 'research' },
  { id: 'army', n: 'Armáda', icon: 'army' },
  { id: 'air', n: 'Letectvo', icon: 'plane' },
  { id: 'navy', n: 'Námořnictvo', icon: 'ship' },
  { id: 'politics', n: 'Politika', icon: 'politics' },
  { id: 'dip', n: 'Diplomacie', icon: 'dip' },
];
export const FOCUS_CAT_ICON = Object.fromEntries(FOCUS_CATS.map((c) => [c.id, c.icon]));

/** Hledání v názvu cíle bez ohledu na diakritiku a velikost písmen. */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const focusMatches = (f, q) => !q || fold(f.n).includes(fold(q.trim()));
