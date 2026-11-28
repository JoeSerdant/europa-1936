// P3: třetí rozšíření stromů všech zemí (vlastní obsah) – pět dalších větví (diplomacie, válečné hospodářství, speciální síly,
// společnost a kultura, zbrojní výroba) a prohloubení každé alternativní politické cesty o čtyři cíle podle ideologie cesty.
// Prefix id `<tag>_p3_`; vylučující se volby přes `pair`; cíle hlavně urychlují výzkum (pravidlo 92).
import { COUNTRIES } from '../countries.js';

const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const slot = (v = 0.2) => ({ t: 'boostslot', v });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const party = (i, v) => ({ t: 'party', i, v });

function pair(a, b) {
  return [[...a.slice(0, 5), { ...(a[5] || {}), excl: [b[0]] }], [...b.slice(0, 5), { ...(b[5] || {}), excl: [a[0]] }]];
}

/** Pět dalších větví pro zemi `tag` (`DEF` = výchozí strom). */
export function moreRows3(tag) {
  const q = (s) => `${tag.toLowerCase()}_p3_${s}`;
  const big = (COUNTRIES[tag]?.tier ?? 3) <= 2;
  return [
    // ---- diplomacie
    [q('dip1'), 'Diplomatický sbor', 35, [], [pp(25)], { info: 'Vyslanectví ve všech velkých městech světa.' }],
    ...pair(
      [q('dip2a'), 'Politika spojenectví', 35, [q('dip1')], [stab(0.02), pp(20)], { info: 'Hledat spojence dřív, než přijde válka.' }],
      [q('dip2b'), 'Politika nezávislosti', 35, [q('dip1')], [ws(0.03), man(0.002)], { info: 'Spoléhat jen na vlastní síly.' }],
    ),
    [q('dip3'), 'Vojenští atašé', 35, [], [xp('land', 15), boost('sup_pruz')], { any: [q('dip2a'), q('dip2b')] }],
    [q('dip4'), 'Zpravodajská služba', 35, [q('dip3')], [boost('el_sifr'), boost('sup_sifr', 0.2)]],
    // ---- válečné hospodářství
    [q('war1'), 'Válečné zásoby', 35, [], [stock('pusky', big ? 600 : 250), stock('podpora', big ? 80 : 30)]],
    [q('war2'), 'Rezervy surovin', 35, [q('war1')], [boost('ind_kauc'), boost('synt1', 0.2)]],
    ...pair(
      [q('war3a'), 'Řízené hospodářství', 49, [q('war2')], [boost('org3', 0.2)], { mod: { prod: 0.02 }, info: 'Stát rozhoduje, co se vyrobí.' }],
      [q('war3b'), 'Pracovní brigády', 49, [q('war2')], [infra(), boost('stav2', 0.2)], { mod: { build: 0.03 }, info: 'Dobrovolníci staví silnice a továrny.' }],
    ),
    [q('war4'), 'Zbrojní normy', 35, [], [boost('pusky3', 0.2), boost('dela3', 0.2)], { any: [q('war3a'), q('war3b')] }],
    // ---- speciální síly
    [q('sf1'), 'Průzkumné oddíly', 35, [], [boost('sup_pruz'), xp('land', 10)]],
    [q('sf2'), 'Horské a zimní jednotky', 35, [q('sf1')], [boost('inf_hory'), boost('inf_zima')]],
    [q('sf3'), 'Výsadkové jednotky', 49, [q('sf2')], [boost('vysadek'), xp('air', 10)]],
    [q('sf4'), 'Přepadové oddíly', 49, [q('sf3')], [boost('inf_komando', 0.2), boost('inf_noc')]],
    // ---- společnost a kultura
    [q('soc1'), 'Národní školství', 35, [], [boost('vyz1'), stab(0.02)]],
    ...pair(
      [q('soc2a'), 'Sociální péče', 35, [q('soc1')], [stab(0.04)], { mod: { stab: 0.01 }, info: 'Stát se stará o slabší.' }],
      [q('soc2b'), 'Národní tělovýchova', 35, [q('soc1')], [ws(0.03), man(0.002)], { info: 'Zdravý národ je silný národ.' }],
    ),
    [q('soc3'), 'Lidové knihovny a rozhlas', 35, [], [slot(0.15), pp(15)], { any: [q('soc2a'), q('soc2b')] }],
    // ---- zbrojní výroba
    [q('arm1'), 'Dělostřelecké závody', 35, [], [boost('dela2'), boost('pdela2')]],
    [q('arm2'), 'Tankové dílny', 49, [q('arm1')], [boost('ltank2'), boost('vozy2')]],
    ...(big ? [[q('arm3'), 'Střední tanky', 49, [q('arm2')], [boost('mtank'), boost('tank_sus', 0.2)]], [q('arm4'), 'Výroba letadel', 49, [q('arm2')], [boost('sti2'), boost('tac2')]]] : []),
  ];
}

const ALT_DEEP = {
  democracy: [['Svobodné volby', [party('democracy', 6), stab(0.03)]], ['Ústavní reforma', [stab(0.04), pp(25)]], ['Občanská společnost', [boost('vyz_univ'), stab(0.02)]], ['Arzenál demokracie', [boost('org2'), boost('stav2', 0.2)]]],
  communism: [['Lidové komisariáty', [party('communism', 6), pp(25)]], ['Kolektivizace', [man(0.004), boost('tez1')]], ['Rudé gardy', [xp('land', 20), boost('inf_kul')]], ['Plánované hospodářství', [boost('org2'), boost('ind_mech', 0.2)]]],
  fascism: [['Korporativní stát', [party('fascism', 6), pp(25)]], ['Národní obroda', [ws(0.05)]], ['Militarizace mládeže', [man(0.004), xp('land', 15)]], ['Zbrojní soběstačnost', [boost('synt1'), boost('org2', 0.2)]]],
  neutrality: [['Vláda silné ruky', [party('neutrality', 6), stab(0.03)]], ['Národní konzervatismus', [stab(0.03), pp(20)]], ['Ozbrojená neutralita', [boost('pdela2'), boost('sup_zen')]], ['Tradice a víra', [stab(0.04)]]],
};

/** Prohloubení alternativních cest stromu: pod každý kořen cesty `path: 'alt'` čtyři navazující cíle podle ideologie cesty. */
export function altDeepRows(tree) {
  const rows = [];
  for (const f of tree) {
    if (f.path !== 'alt') continue;
    const ideo = (f.fx || []).find((e) => e.t === 'party' || e.t === 'gov')?.i;
    const list = ALT_DEEP[ideo];
    if (!list) continue;
    let prev = f.id;
    list.forEach(([n, fx], k) => {
      const id = `${f.id}_p3d${k + 1}`;
      rows.push([id, n, 42, [prev], fx]);
      prev = id;
    });
  }
  return rows;
}
