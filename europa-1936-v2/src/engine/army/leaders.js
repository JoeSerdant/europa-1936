// Velitelé: bonusy z dovedností a rysů, zkušenosti a postup úrovní.
import { C } from './constants.js';
import { TRAITS } from '../../data/army/index.js';

export const MOD_KEYS = ['atk', 'def', 'planCap', 'planGain', 'supUse', 'speed', 'orgRegen', 'atkArm', 'atkInf', 'defInf', 'hillAtk', 'hillDef'];
export const ZERO_MODS = Object.freeze(Object.fromEntries(MOD_KEYS.map((k) => [k, 0])));

const cache = new WeakMap();

/** Bonusy jednoho velitele (mezipaměť podle objektu velitele). */
export function genMods(g) {
  if (!g) return ZERO_MODS;
  let m = cache.get(g);
  if (m) return m;
  m = { ...ZERO_MODS };
  m.atk = C.SKILL_ATK * g.a;
  m.def = C.SKILL_DEF * g.d;
  m.planCap = C.SKILL_PLAN_CAP * g.pl;
  m.planGain = C.SKILL_PLAN_GAIN * g.pl;
  m.supUse = -C.SKILL_LOG_SUP * g.lg;
  m.speed = C.SKILL_LOG_SPEED * g.lg + C.SKILL_MAN_SPEED * (g.mn || 1);
  m.orgRegen = C.SKILL_MAN_ORG * (g.mn || 1);
  for (const t of g.tr) { const tm = TRAITS[t]?.mod; if (tm) for (const k in tm) m[k] += tm[k]; }
  cache.set(g, m);
  return m;
}

const armyCache = new WeakMap();

/** Bonusy armády = její generál + podíl polního maršála skupiny armád. */
export function armyMods(gens, groups, army) {
  if (!army) return ZERO_MODS;
  const g = gens[army.cmd] || null;
  const grp = army.grp ? groups[army.grp] : null;
  const fm = grp ? gens[grp.cmd] || null : null;
  if (!g && !fm) return ZERO_MODS;
  const key = g || fm;
  const hit = armyCache.get(key);
  if (hit && hit.g === g && hit.fm === fm) return hit.m;
  const a = genMods(g), b = fm ? genMods(fm) : ZERO_MODS;
  const m = {};
  for (const k of MOD_KEYS) m[k] = a[k] + C.MARSHAL_SHARE * b[k];
  armyCache.set(key, { g, fm, m });
  return m;
}

/** Úroveň velitele = součet dovedností − 3 (pět dovedností po 1 = úroveň 1). */
export const genLevel = (g) => g.a + g.d + g.pl + g.lg + (g.mn || 1) - 4;

/** Zkušenosti potřebné ke zvýšení z úrovně `lv` o jednu (lineárně: úroveň 6 = 360). */
export const xpForLevel = (lv) => C.LEADER_XP_LEVEL * Math.max(1, lv);
