// Statistiky divize odvozené ze šablony (čistá funkce, mezipaměť podle objektu šablony).
//  součet přes prapory: hp, soft, hard, def, brk, men, sup, need
//  průměr váhou lidské síly: org (liniové), hardness (všechny), terr (liniové)
//  pierce = 0,4 · nejvyšší + 0,6 · průměr (jen prapory s průrazem);  armor = 0,4 · nejvyšší + 0,6 · průměr přes liniové prapory
//  speed = nejpomalejší liniový prapor;  width = součet šířek liniových praporů
import { BATTALIONS, SUPPORT, EQUIP_LEVEL_MULT, GRID } from '../../data/army/index.js';

const TERR_KEYS = [0, 1, 2, 3, 4, 5, 6, 'r'];
const cache = new WeakMap();

const levelMult = (lvl, kind) => (lvl && lvl[kind] > 1 ? EQUIP_LEVEL_MULT[Math.min(lvl[kind], EQUIP_LEVEL_MULT.length) - 1] : 1);

/** Prapory šablony: { line: [def…], sup: [def…] } (neplatné typy se přeskočí). */
export function templateUnits(tpl) {
  const line = [], sup = [];
  for (const col of tpl.reg) for (const t of col) if (BATTALIONS[t]) line.push(BATTALIONS[t]);
  for (const t of tpl.sup) if (SUPPORT[t]) sup.push(SUPPORT[t]);
  return { line, sup };
}

export function deriveStats(tpl, lvl = null) {
  if (!lvl) { const hit = cache.get(tpl); if (hit) return hit; }
  const { line, sup } = templateUnits(tpl);
  const all = line.concat(sup);
  const s = {
    width: 0, hp: 0, org: 0, men: 0, sup: 0, soft: 0, hard: 0, pierce: 0, def: 0, brk: 0, armor: 0, hardness: 0, speed: 99,
    rec: 0, eng: 0, plan: 0, supSave: 0, healing: 0, days: 0, nLine: line.length, nSup: sup.length, need: {}, cls: 'inf', terr: {}, cost: 0,
  };
  let orgW = 0, lineMen = 0, hardW = 0, allMen = 0, pierceMax = 0, pierceW = 0, pierceMen = 0, armorMax = 0, armorW = 0;
  const share = { arm: 0, mot: 0, cav: 0, mtn: 0 };
  for (const u of all) {
    const m = levelMult(lvl, u.kind);
    s.hp += u.hp; s.men += u.men; s.sup += u.sup;
    s.soft += u.soft * m; s.hard += u.hard * m; s.def += u.def * m; s.brk += u.brk * m;
    s.rec += u.rec || 0; s.eng += u.eng || 0; s.plan += u.plan || 0; s.supSave += u.supSave || 0; s.healing += u.healing || 0;
    s.days = Math.max(s.days, u.days);
    for (const k in u.need) s.need[k] = (s.need[k] || 0) + u.need[k];
    allMen += u.men; hardW += u.men * u.hardness;
    if (u.pierce > 0) { const p = u.pierce * m; pierceMax = Math.max(pierceMax, p); pierceW += u.men * p; pierceMen += u.men; }
  }
  for (const u of line) {
    const m = levelMult(lvl, u.kind);
    s.width += u.w; s.speed = Math.min(s.speed, u.spd);
    orgW += u.men * u.org; lineMen += u.men;
    const a = u.armor * m; armorMax = Math.max(armorMax, a); armorW += u.men * a;
    if (u.sym === 'arm') share.arm += u.men; else if (u.sym === 'mot') share.mot += u.men; else if (u.sym === 'cav') share.cav += u.men; else if (u.sym === 'mtn') share.mtn += u.men;
  }
  if (!line.length) s.speed = 0;
  s.org = lineMen ? orgW / lineMen : 0;
  s.hardness = allMen ? hardW / allMen : 0;
  s.pierce = pierceMen ? 0.4 * pierceMax + 0.6 * (pierceW / pierceMen) : 0;
  s.armor = lineMen ? 0.4 * armorMax + 0.6 * (armorW / lineMen) : 0;
  // druh divize (pro ikonu, rysy velitelů): převažující podíl liniové lidské síly
  if (lineMen) {
    if (share.arm / lineMen >= 0.4) s.cls = 'arm';
    else if (share.mot / lineMen >= 0.6) s.cls = 'mot';
    else if (share.cav / lineMen >= 0.6) s.cls = 'cav';
    else if (share.mtn / lineMen >= 0.6) s.cls = 'mtn';
  }
  // terénní úpravy: průměr váhou lidské síly liniových praporů
  for (const key of TERR_KEYS) {
    let atk = 0, def = 0, mov = 0;
    for (const u of line) {
      const t = u.terr[key];
      if (t) { atk += u.men * (t.atk || 0); def += u.men * (t.def || 0); mov += u.men * (t.mov || 0); }
    }
    if (lineMen && (atk || def || mov)) s.terr[key] = { atk: atk / lineMen, def: def / lineMen, mov: mov / lineMen };
  }
  if (!lvl) cache.set(tpl, s);
  return s;
}

/** Zkontroluje šablonu: vrací null, když je v pořádku, jinak český popis chyby. `unlocked(typ)` rozhoduje o odemčení (zatím jen bez zámku „M20“). */
export function validateTemplate(tpl, unlocked = (def) => !def.unlock) {
  if (!tpl || !Array.isArray(tpl.reg) || !Array.isArray(tpl.sup)) return 'Neplatná šablona.';
  if (tpl.reg.length < 1 || tpl.reg.length > GRID.cols) return `Šablona má mít 1 až ${GRID.cols} pluků.`;
  let n = 0;
  for (const col of tpl.reg) {
    if (!Array.isArray(col) || col.length < 1 || col.length > GRID.rows) return `Pluk má mít 1 až ${GRID.rows} praporů.`;
    for (const t of col) {
      const d = BATTALIONS[t];
      if (!d) return 'Neznámý typ praporu.';
      if (!unlocked(d)) return `Prapor „${d.n}“ ještě není odemčený.`;
      n++;
    }
  }
  if (n < 1) return 'Šablona potřebuje alespoň jeden prapor.';
  if (tpl.sup.length > GRID.support) return `Podpory je nejvýš ${GRID.support}.`;
  for (const t of tpl.sup) {
    const d = SUPPORT[t];
    if (!d) return 'Neznámý typ podpory.';
    if (!unlocked(d)) return `Podpora „${d.n}“ ještě není odemčená.`;
  }
  if (typeof tpl.nm !== 'string' || !tpl.nm.trim()) return 'Šablona potřebuje název.';
  return null;
}

/** Zkrácený název pro jména divizí: „5. pěší divize“. */
export function divisionName(tpl, nr) {
  return `${nr}. ${tpl.short || tpl.nm.toLowerCase()}`;
}
