// UI2: rozpisy hodnot horní lišty jako v HOI4 – z čeho se skládá stabilita, podpora války, politická moc, lidská síla, továrny, palivo a transporty.
// Čisté dotazy nad stavem (žádné nové číslo vyvážení – jen čtou stejné zdroje jako engine; součet zdrojů = `polModsOf`, hlídá `test/breakdown.test.js`).
import { getWorld } from '../../engine/world.js';
import { LAWS, LAW_CATS, ADVISORS, ADV_SLOT_IDS } from '../../data/politics/index.js';
import { POL_IDEO } from '../../data/politics/national.js';
import { SPIRITS } from '../../data/nat/spirits.js';
import { CONT_FOCUSES } from '../../data/nat/continuous.js';
import { FAC_GOALS } from '../../data/dip/facgoals.js';
import { POL } from '../../engine/politics/constants.js';
import { polModsOf, stabMult, manMult } from '../../engine/politics/core.js';
import { polBase } from '../../engine/politics/setup.js';
import { targetsOf } from '../../engine/politics/day.js';
import { ideologyOf, startIdeology } from '../../engine/politics/parties.js';
import { focusMods } from '../../engine/nat/core.js';
import { hasWar } from '../../engine/army/war.js';
import { tallyOwners } from '../../engine/industry/core.js';
import { C as ARMY } from '../../engine/army/constants.js';
import { countryStats } from '../../engine/selectors.js';
import { industryOf, fuelOf, transportsOf, manpowerOf } from '../../engine/index.js';

const pct = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(d).replace('.', ',')} %`;
const num = (v, d = 0) => Math.round(v).toLocaleString('cs-CZ', { maximumFractionDigits: d });
const tone = (v) => (v > 1e-9 ? 'up' : v < -1e-9 ? 'down' : '');

/** Zdroje jednoho klíče bonusu (`stab`, `ws`, `man`, `prod` …) v pořadí zákony, poradci, cíle, duchové, průběžný cíl, blok: [{ n, v }]. */
export function modSources(state, o, key) {
  const out = [];
  const own = state.pol.own[o];
  if (!own) return out;
  for (const cat in own.laws) { const L = LAWS[cat]?.[own.laws[cat]]; if (L?.mod?.[key]) out.push({ n: `${LAW_CATS[cat]?.n || 'Zákon'}: ${L.n}`, v: L.mod[key] }); }
  for (const slot of ADV_SLOT_IDS) { const A = ADVISORS[own.adv[slot]]; if (A?.mod?.[key]) out.push({ n: `Poradce: ${A.n}`, v: A.mod[key] }); }
  const fm = focusMods(state.nat?.own[o]?.done);
  if (fm[key]) out.push({ n: 'Národní cíle', v: fm[key] });
  const sp = state.nat?.own[o]?.sp || {};
  for (const id in sp) { const S = SPIRITS[id]; if (S?.mod?.[key]) out.push({ n: S.n, v: S.mod[key], spirit: true }); }
  const cid = state.nat?.own[o]?.cont, CF = cid ? CONT_FOCUSES[cid] : null;
  if (CF?.mod?.[key]) out.push({ n: `Průběžný cíl: ${CF.n}`, v: CF.mod[key] });
  const fid = state.dip?.fac[o], F = fid ? state.dip.facs[fid] : null;
  for (const g of F?.gd || []) { const G = FAC_GOALS[g]; if (G?.mod?.[key]) out.push({ n: `Cíl bloku: ${G.n}`, v: G.mod[key] }); }
  return out;
}

/** Rozpis cíle stability nebo podpory války (`key` = 'stab' | 'ws'): { title, value, target, rows, effects, text }. */
export function targetBreakdown(state, o, key) {
  const w = getWorld(), own = state.pol.own[o];
  const occ = tallyOwners(state)[o].occ;
  const t = targetsOf(state, o, own, occ);
  const b = polBase(w.owners[o].tag);
  const rows = [{ n: 'Základ', v: b[key], base: true }];
  const g = ideologyOf(state, o), s0 = startIdeology(o);
  if (g !== s0) { const d = (POL_IDEO[g]?.[key] ?? 0) - (POL_IDEO[s0]?.[key] ?? 0); if (d) rows.push({ n: 'Nová vláda', v: d }); }
  rows.push(...modSources(state, o, key));
  if (key === 'stab' && occ) rows.push({ n: `Okupované státy (${occ})`, v: -Math.min(POL.OCC_MAX, occ * POL.OCC_STAB) });
  if (key === 'ws' && hasWar(state.mil, o)) rows.push({ n: 'Země je ve válce', v: POL.WAR_WS });
  const effects = key === 'stab'
    ? [{ n: 'Výroba a stavby', v: stabMult(own.stab) - 1 }]
    : [{ n: 'Přírůstek lidské síly', v: POL.WS_MAN_BASE + POL.WS_MAN_SLOPE * own.ws - 1 }];
  return {
    title: key === 'stab' ? 'Stabilita' : 'Podpora války', value: own[key], target: t[key],
    rows: rows.map((r) => ({ n: r.n, v: r.base ? `${Math.round(r.v * 100)} %` : pct(r.v, 1), tone: r.base ? '' : tone(r.v) })),
    effects: effects.map((e) => ({ n: e.n, v: pct(e.v, 1), tone: tone(e.v) })),
    text: key === 'stab'
      ? `Stabilita se každý den přibližuje k cíli o ${pct(POL.DRIFT, 1).slice(1)}. Vysoká stabilita zrychluje výrobu a stavby, nízká hrozí převratem.`
      : `Podpora války se přibližuje k cíli o ${pct(POL.DRIFT, 1).slice(1)} denně. Určuje přírůstek lidské síly a dostupnost válečných zákonů.`,
  };
}

/** Rozpis politické moci: { title, value, rows, text }. */
export function ppBreakdown(state, o) {
  const own = state.pol.own[o];
  return {
    title: 'Politická moc', value: own.pp,
    rows: [{ n: 'Přírůstek za den', v: `+${POL.PP_BASE.toFixed(2).replace('.', ',')}`, tone: 'up' }, { n: 'Základ', v: POL.PP_BASE.toFixed(2).replace('.', ',') }, { n: 'Strop', v: num(POL.PP_MAX) }],
    text: 'Politickou mocí se mění zákony, najímají poradci a náčelníci štábů, podporují strany a provádějí rozhodnutí a diplomatické akce.',
  };
}

/** Rozpis lidské síly: volná, v poli, měsíční přírůstek a jeho násobky. */
export function manBreakdown(state, o) {
  const w = getWorld(), st = countryStats(state, w.owners[o].tag);
  let n = 0;
  for (const d of state.mil.divs) if (d && d.o === o) n++;
  const own = state.pol.own[o];
  const growth = st ? st.manPop * 1000 * ARMY.MAN_GROWTH_MONTH * manMult(state, o) : 0;
  const rows = [
    { n: 'Volná lidská síla', v: num(manpowerOf(state, o)) },
    { n: 'Divize v poli', v: num(n) },
    { n: 'Měsíční přírůstek', v: `+${num(growth)}`, tone: 'up' },
    ...modSources(state, o, 'man').map((r) => ({ n: r.n, v: pct(r.v, 1), tone: tone(r.v) })),
    { n: 'Podpora války', v: pct(POL.WS_MAN_BASE + POL.WS_MAN_SLOPE * own.ws - 1, 1), tone: tone(POL.WS_MAN_BASE + POL.WS_MAN_SLOPE * own.ws - 1) },
  ];
  return { title: 'Lidská síla', value: manpowerOf(state, o), rows, text: 'Lidská síla roste každý měsíc z obyvatel jádra (kolonie jen zlomkem). Přísnější zákon o odvodu a vyšší podpora války přírůstek zvětší.' };
}

/** Rozpis továren: civilní (spotřební zboží, obchod, stavby), vojenské (linky) a loděnice. */
export function facBreakdown(state, o) {
  const x = industryOf(state, o);
  const rows = [
    { n: 'Civilní továrny', v: num(x.civ) },
    { n: '· na spotřební zboží', v: num(x.consFac), tone: x.consFac ? 'down' : '' },
    { n: '· na obchod', v: num(x.tradeCiv || 0) },
    { n: '· na stavby', v: num(x.civAvail), tone: 'up' },
    { n: 'Vojenské továrny (použité / celkem)', v: `${num(x.milUsed)} / ${num(x.mil)}` },
    { n: 'Loděnice (použité / celkem)', v: `${num(x.dockUsed || 0)} / ${num(x.dok)}` },
    ...modSources(state, o, 'prod').map((r) => ({ n: `Výroba – ${r.n}`, v: pct(r.v, 1), tone: tone(r.v) })),
  ];
  return { title: 'Továrny', value: x.civ + x.mil + x.dok, rows, text: 'Civilní továrny staví budovy a platí spotřební zboží a obchod, vojenské vyrábějí výzbroj a letadla, loděnice lodě.' };
}

/** Rozpis paliva: zásoba, strop, výroba, spotřeba a doba do naplnění nebo vyčerpání. */
export function fuelBreakdown(state, o) {
  const f = fuelOf(state, o);
  const net = f.gain - f.use;
  const rows = [
    { n: 'Zásoba', v: `${num(f.stock)} / ${num(f.cap)}` },
    { n: 'Výroba za den', v: `+${f.gain.toFixed(1).replace('.', ',')}`, tone: 'up' },
    { n: 'Spotřeba za den', v: `−${f.use.toFixed(1).replace('.', ',')}`, tone: f.use ? 'down' : '' },
    { n: net >= 0 ? 'Naplnění zásoby' : 'Vyčerpání zásoby', v: net >= 0 ? (net > 1e-9 ? `${num((f.cap - f.stock) / net)} dní` : '—') : (Number.isFinite(f.days) ? `${num(f.days)} dní` : '—'), tone: net >= 0 ? '' : 'down' },
  ];
  return { title: 'Palivo', value: f.stock, rows, text: 'Palivo vzniká z ropy a rafinerií. Spotřebovávají ho tanky, motorizované jednotky, letadla a lodě; při nedostatku slábnou.' };
}

/** Rozpis transportů: celkem, na konvoje obchodu, na přepravu vojsk a volné. */
export function convoyBreakdown(state, o) {
  const t = transportsOf(state, o);
  return {
    title: 'Transporty', value: t.free,
    rows: [
      { n: 'Celkem', v: num(t.total) },
      { n: 'Konvoje obchodu (potřeba)', v: `${num(t.convoys)} / ${num(t.need || 0)}`, tone: t.need > t.convoys ? 'down' : '' },
      { n: 'Přeprava divizí', v: num(t.sail || 0) },
      { n: 'Volné', v: num(t.free), tone: 'up' },
    ],
    text: 'Transportní lodě vozí dovážené suroviny po moři a převážejí divize. Chybějící konvoje snižují dodávky obchodu.',
  };
}
