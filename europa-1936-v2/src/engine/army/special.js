// S5c: speciální jednotky – výsadkáři a námořní pěchota (`sf` / `marine` v datech praporů). Divize je speciální, když aspoň
// `RAID.SF_SHARE` liniových praporů je speciálních; jejich počet (divize i výcvik) omezuje strop `sfCap`. Čisté funkce.
import { BATTALIONS } from '../../data/army/battalions.js';
import { RAID } from '../../data/army/raids.js';

function share(tpl, flag) {
  const line = (tpl && tpl.reg) || [];
  let n = 0, k = 0;
  for (const col of line) for (const b of col || []) if (b) { n++; if (BATTALIONS[b] && BATTALIONS[b][flag]) k++; }
  return n ? k / n : 0;
}
/** Je šablona speciální (výsadkáři, námořní pěchota)? */
export const isSpecialTpl = (tpl) => share(tpl, 'sf') >= RAID.SF_SHARE;
/** Je divize speciální jednotkou? */
export const isSpecial = (mil, d) => !!d && isSpecialTpl(mil.tpl[d.tpl]);
/** Je divize námořní pěchotou (vylodění bez přípravy a ztráty organizace)? */
export const isMarine = (mil, d) => !!d && share(mil.tpl[d.tpl], 'marine') >= RAID.SF_SHARE;

/** Strop speciálních divizí země `o`. */
export function sfCap(mil, o) {
  let n = 0;
  for (const d of mil.divs) if (d && d.o === o) n++;
  return Math.max(RAID.SF_BASE, Math.ceil(n * RAID.SF_PER_DIV));
}
/** Speciální divize země `o` (v poli i ve výcviku). */
export function sfUsed(mil, o) {
  let n = 0;
  for (const d of mil.divs) if (d && d.o === o && isSpecialTpl(mil.tpl[d.tpl])) n++;
  for (const q of mil.queue) if (q.o === o && isSpecialTpl(mil.tpl[q.tpl])) n++;
  return n;
}
/** Proč nejde vycvičit `count` divizí šablony (strop speciálních jednotek), nebo null. */
export function sfBlock(mil, tplId, count = 1) {
  const t = mil.tpl[tplId];
  if (!t || !isSpecialTpl(t)) return null;
  const cap = sfCap(mil, t.o), used = sfUsed(mil, t.o);
  return used + count > cap ? `Speciálních divizí smíte mít nejvýš ${cap} (máte ${used}).` : null;
}
