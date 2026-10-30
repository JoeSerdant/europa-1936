// Vojenský přístup – čistá pravidla (M67), bez závislostí, aby je mohla číst armáda (pohyb, cesty, zásobování) bez cyklu importů.
// Přístup mají vlastní území, členové téhož bloku, pán a jeho loutky; ostatní jen podle dohody `state.dip.acc = [{ g, r }]` (země `g` dovolila průchod zemi `r`).

/** Smí země `o` vstoupit na území země `c`? Čistá funkce nad `dip` (válku řeší pohyb zvlášť): vlastní území, blok, pán a loutka, dohoda. */
export function hasAccess(dip, o, c) {
  if (o === c) return true;
  const f = dip.fac[o];
  if (f && f === dip.fac[c]) return true;
  if (dip.sub[o] === c || dip.sub[c] === o) return true;
  const acc = dip.acc;
  if (acc) for (let i = 0; i < acc.length; i++) if (acc[i].g === c && acc[i].r === o) return true;
  return false;
}

const friendCache = new WeakMap();   // dip → pole podle země (stav se nemutuje, nový `dip` = nová mezipaměť)
/** Země, na jejichž území smí `o` vstoupit (bez ní samé), vzestupně. Spojenci zásobují jednotky na svém území a tvoří součást zásobovací sítě. */
export function friendsOf(dip, o) {
  let m = friendCache.get(dip);
  if (!m) { m = []; friendCache.set(dip, m); }
  if (m[o]) return m[o];
  const out = [];
  for (let c = 1; c < dip.fac.length; c++) if (c !== o && hasAccess(dip, o, c)) out.push(c);
  return (m[o] = out);
}

/** Dovolila `g` výslovnou dohodou průchod zemi `r`? (blok a poddanství se sem nepočítají) */
export const grants = (state, g, r) => (state.dip.acc || []).some((x) => x.g === g && x.r === r);
/** Země, kterým `g` dovolila průchod dohodou. */
export const grantedBy = (state, g) => (state.dip.acc || []).filter((x) => x.g === g).map((x) => x.r);
