// Velké stromy národních cílů (M94): velmoci (~50 cílů ve větvích průmysl, armáda, letectvo, námořnictvo, věda, politika), rozšíření zajímavých
// zemí a velký výchozí strom. Vlastní obsah, názvy a čísla (bez skutečných osob). Poloha v mřížce se dopočítá z větví a hloubky předpokladů.
//  Položka: [id, název, dny, předpoklady, účinky, doplňky { ai, info, mod, excl, any }]
const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const slot = (v = 0.25) => ({ t: 'boostslot', v });
const law = (cat, id) => ({ t: 'law', cat, id });
const adv = (s, id) => ({ t: 'adv', slot: s, id });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const spirit = (id) => ({ t: 'spirit', id });
const party = (i, v) => ({ t: 'party', i, v });
const bld = (k, n = 1) => ({ t: 'bld', k, n });
const NAMES = {
  GER: 'Německo', ITA: 'Itálie', SOV: 'SSSR', ENG: 'Británie', FRA: 'Francie', POL: 'Polsko', CZE: 'Československo', HUN: 'Maďarsko', ROM: 'Rumunsko',
  YUG: 'Jugoslávie', BUL: 'Bulharsko', GRE: 'Řecko', TUR: 'Turecko', SPR: 'Španělsko', POR: 'Portugalsko', SWE: 'Švédsko', FIN: 'Finsko', NOR: 'Norsko',
  DEN: 'Dánsko', HOL: 'Nizozemsko', BEL: 'Belgie', SWI: 'Švýcarsko', AUS: 'Rakousko', EST: 'Estonsko', LAT: 'Lotyšsko', LIT: 'Litva', ALB: 'Albánie', EGY: 'Egypt',
};
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });
import { XL_BRANCHES, XL_DEFAULT } from './focuses_xl.js';
import { ALT_BRANCHES, MOD_BRANCHES, ALT_DEFAULT } from './focuses_alt.js';

function F(id, n, x, y, days, req, fx, extra = {}) {
  return { id, n, x, y, days, req, fx, any: [], excl: [], mod: null, ai: 100, info: '', path: '', ...extra };
}

/**
 * Strom z větví: každá větev je sloupec (šířka = nejvíc cílů v jednom řádku), řádek = hloubka předpokladů (i přes větve).
 * Priorita AI = hloubka × 10 + priorita větve (`prio`), pokud cíl nemá vlastní `ai`.
 */
export function big(branches) {
  const all = new Map();
  branches.forEach((b, bi) => b.list.forEach((it) => all.set(it[0], { it, bi })));
  const depth = {};
  const dOf = (id) => {
    if (depth[id] !== undefined) return depth[id];
    const e = all.get(id);
    if (!e) return -1;   // předpoklad z jiného stromu (rozšíření) – hloubka 0
    depth[id] = 0;
    const req = [...e.it[3], ...((e.it[5] || {}).any || [])];
    depth[id] = req.length ? 1 + Math.max(...req.map(dOf)) : 0;
    return depth[id];
  };
  const out = [];
  let x0 = 0;
  branches.forEach((b) => {
    const rows = {};
    for (const [id, n, days, req, fx, extra = {}] of b.list) {
      const d = dOf(id);
      const x = x0 + (rows[d] = (rows[d] || 0) + 1) - 1;
      out.push(F(id, n, x, d, days, req, fx, { ai: d * 10 + (b.prio ?? 5), ...extra }));
    }
    x0 += Math.max(1, ...Object.values(rows));
  });
  return out;
}

/** Rozšíří existující strom `base` o cíle `list` pod něj (řádky od nejnižšího řádku stromu + 1); AI je plní až po původních. */
export function grow(base, list) {
  const y0 = Math.max(...base.map((f) => f.y)) + 1;
  const depth = {}, rows = {};
  const ai0 = Math.max(...base.map((f) => f.ai)) + 1;
  return [...base, ...list.map(([id, n, days, req, fx, extra = {}], i) => {
    const d = Math.max(0, ...[...req, ...(extra.any || [])].map((r) => (depth[r] !== undefined ? depth[r] + 1 : 0)));   // W5: i alternativní předpoklady (`any`)
    depth[id] = d;
    const x = (rows[d] = (rows[d] || 0) + 1) - 1;
    return F(id, n, x, y0 + d, days, req, fx, { ai: ai0 + d * 10 + i / 100, ...extra });
  })];
}

// ---------------------------------------------------------------- Německo
const GER_B = [
  { prio: 0, list: [
    ['ger_plan', 'Čtyřletý plán', 45, [], [civ(), mil()], { ai: 1, mod: { prod: 0.03 }, info: 'Řízené hospodářství: továrny a trvale vyšší výroba.' }],
    ['ger_road', 'Dálniční síť', 35, ['ger_plan'], [infra(), civ()], { ai: 2 }],
    ['ger_rearm', 'Zbrojní program', 45, ['ger_plan'], [mil(2)], { ai: 3 }],
    ['ger_auto', 'Hospodářská soběstačnost', 35, ['ger_rearm'], [law('trd', 'closed')], { ai: 5, mod: { extract: 0.05 }, excl: ['ger_trade'], info: 'Uzavřené hospodářství, vlastní těžba.' }],
    ['ger_trade', 'Zámořský obchod', 35, ['ger_rearm'], [law('trd', 'free')], { ai: 6, mod: { imp: -0.1 }, excl: ['ger_auto'], info: 'Volný obchod, levnější dovoz.' }],
    ['ger_synth', 'Syntetické palivo', 70, ['ger_auto'], [boost('synt1', 0.5), civ()], { info: 'Benzín z uhlí: ropa z vlastních hydrogenačních závodů.' }],
    ['ger_ore', 'Rudné doly', 35, ['ger_road'], [boost('tez1', 0.5)], { mod: { extract: 0.04 } }],
    ['ger_reichsw', 'Státní hutní koncern', 70, ['ger_ore'], [civ(), mil(), adv('ind', 'koncern')], { info: 'Hutě zpracují i chudé domácí rudy.' }],
    ['ger_ruhr', 'Modernizace Porúří', 70, ['ger_reichsw'], [mil()]],
    ['ger_people_car', 'Lidový automobil', 35, ['ger_road'], [civ(), spirit('f_spotrebni_vyroba')], { info: 'Automobilka pro každou rodinu – a později pro armádu.' }],
    ['ger_rational', 'Racionalizace zbrojení', 70, ['ger_ruhr', 'ger_synth'], [spirit('f_racionalizace')]],
    ['ger_synth2', 'Syntetický kaučuk', 35, ['ger_synth'], [boost('synt2', 0.4)]],
    ['ger_war_eco', 'Řízení surovin', 35, ['ger_rational'], [boost('synt2', 0.2), pp(30)]],
    ['ger_total', 'Totální válka', 70, ['ger_war_eco'], [spirit('f_totalni_mobilizace')], { ai: 900, info: 'Celá země slouží válce.' }],
  ] },
  { prio: 1, list: [
    ['ger_auta', 'Motorizace', 35, ['ger_road'], [boost('auta2'), mil()], { ai: 4 }],
    ['ger_conscr', 'Branná výchova', 35, ['ger_rearm'], [man(0.004), ws(0.06)], { ai: 7 }],
    ['ger_tank', 'Tankové ambice', 45, ['ger_auta'], [boost('ltank2'), stock('ltanky', 60)], { ai: 8 }],
    ['ger_inf', 'Pěchotní výcvik', 35, ['ger_conscr'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['ger_art', 'Dělostřelecký program', 35, ['ger_inf'], [boost('dela2'), spirit('f_delostrelecka_skola')]],
    ['ger_panzer', 'Tanková škola', 70, ['ger_tank'], [spirit('f_tankova_skola'), boost('mtank', 0.4)]],
    ['ger_motor', 'Motorizovaná válka', 35, ['ger_panzer'], [spirit('f_motorizovana_valka'), boost('mech')]],
    ['ger_staff', 'Válečná akademie', 35, ['ger_inf'], [spirit('f_stabni_planovani'), xp('land', 25)]],
    ['ger_mountain', 'Horské myslivce', 35, ['ger_staff'], [spirit('f_horske_jednotky')]],
    ['ger_supply', 'Týlové služby', 35, ['ger_motor'], [spirit('f_tylove_sluzby'), boost('log')]],
    ['ger_para', 'Výsadkové sbory', 35, ['ger_staff'], [boost('vysadek', 0.5)]],
    ['ger_heavy', 'Těžké tanky', 70, ['ger_panzer'], [boost('htank', 0.4), mil()]],
    ['ger_elite', 'Elitní divize', 35, ['ger_heavy', 'ger_supply'], [spirit('f_elitni_jednotky')]],
    ['ger_at', 'Protitanková obrana', 35, ['ger_art'], [boost('pdela2'), stock('pdela', 200)]],
  ] },
  { prio: 2, list: [
    ['ger_luft', 'Letecký program', 45, ['ger_plan'], [boost('sti2'), xp('air', 25), mil()], { ai: 9 }],
    ['ger_afb', 'Síť letišť', 35, ['ger_luft'], [bld('afb', 2)]],
    ['ger_dive', 'Střemhlavé bombardéry', 35, ['ger_luft'], [boost('tac2'), xp('air', 15)]],
    ['ger_fight', 'Stíhací eskadry', 35, ['ger_afb'], [boost('sti3'), xp('air', 15)]],
    ['ger_radar', 'Protiletadlová obrana říše', 35, ['ger_fight'], [bld('radar', 2)]],
    ['ger_jet', 'Proudový pohon', 70, ['ger_radar'], [boost('sti4', 0.5)]],
  ] },
  { prio: 3, list: [
    ['ger_sci', 'Technické ústavy', 35, ['ger_auto'], [slot()], { ai: 10, mod: { research: 0.05 } }],
    ['ger_council', 'Říšská výzkumná rada', 35, ['ger_sci'], [spirit('f_vedecka_rada')]],
    ['ger_rocket', 'Raketové středisko', 70, ['ger_council'], [boost('rakety', 0.5)]],
    ['ger_rocket2', 'Odvetné zbraně', 70, ['ger_rocket'], [boost('rakety2', 0.5)]],
    ['ger_uranium', 'Uranový spolek', 70, ['ger_council'], [boost('jadro1', 0.5)]],
  ] },
  { prio: 4, list: [
    ['ger_navy', 'Námořní program', 45, ['ger_sci'], [xp('sea', 20), civ()], { ai: 11 }],
    ['ger_dock', 'Loděnice v Kielu', 35, ['ger_navy'], [bld('dok', 2)]],
    ['ger_uboat', 'Ponorková válka', 35, ['ger_dock'], [xp('sea', 25)], { info: 'Vlčí smečky proti konvojům.' }],
    ['ger_raider', 'Námořní nájezdníci', 35, ['ger_dock'], [xp('sea', 15), pp(30)]],
  ] },
  { prio: 2, list: [
    ['ger_spy', 'Vojenská rozvědka', 35, ['ger_conscr'], [pp(40), xp('land', 15)], { ai: 12 }],
    ['ger_rhine', 'Návrat do Porýní', 35, [], [ws(0.06), stab(0.04)], { ai: 6, info: 'Vojáci znovu na západní hranici.' }],
    ['ger_prop', 'Ministerstvo propagandy', 35, ['ger_rhine'], [spirit('f_propaganda')]],
    ['ger_axis', 'Osa Berlín–Řím', 35, ['ger_prop'], [rel('ITA', 50), pp(30)]],
    ['ger_danube', 'Podunajská spolupráce', 35, ['ger_axis'], [rel('HUN', 40), rel('ROM', 30), rel('BUL', 30)]],
    ['ger_oil', 'Rumunská ropa', 35, ['ger_danube'], [rel('ROM', 30), law('trd', 'lim')]],
    ['ger_north', 'Severská ruda', 35, ['ger_axis'], [rel('SWE', 30), rel('FIN', 30)]],
    ['ger_unity', 'Národní společenství', 35, ['ger_prop'], [spirit('f_narodni_jednota'), party('gov', 10)]],
  ] },
];
const GER = big([...GER_B, ...(XL_BRANCHES.GER || []), ...ALT_BRANCHES.GER, ...MOD_BRANCHES.GER]);   // M98: nové větve; M100: politické cesty a modernizace

// ---------------------------------------------------------------- SSSR
const SOV_B = [
  { prio: 0, list: [
    ['sov_plan', 'Pětiletý plán', 45, [], [civ(2), mil(1)], { ai: 1, mod: { build: 0.05 } }],
    ['sov_heavy', 'Těžký průmysl', 45, ['sov_plan'], [mil(3)], { ai: 2 }],
    ['sov_rail', 'Železniční výstavba', 35, ['sov_plan'], [infra(2)], { ai: 3 }],
    ['sov_ural', 'Uralský průmyslový komplex', 70, ['sov_heavy'], [civ(2), mil()], { info: 'Továrny daleko od hranic.' }],
    ['sov_siberia', 'Bohatství Sibiře', 35, ['sov_rail'], [boost('tez1', 0.5)], { mod: { extract: 0.06 } }],
    ['sov_stakh', 'Úderníci', 35, ['sov_ural'], [spirit('f_racionalizace')], { info: 'Normy se plní na stovky procent.' }],
    ['sov_canal', 'Velké stavby komunismu', 70, ['sov_siberia'], [spirit('f_stavebni_program'), civ()]],
    ['sov_oil', 'Baku a Kavkaz', 35, ['sov_siberia'], [boost('tez2', 0.4)], { mod: { extract: 0.04 } }],
    ['sov_plan3', 'Třetí pětiletka', 70, ['sov_stakh', 'sov_canal'], [mil(2), civ()]],
    ['sov_evac', 'Plány evakuace průmyslu', 35, ['sov_plan3'], [spirit('f_tylove_sluzby')], { info: 'Každá továrna má připravené vagony.' }],
    ['sov_war_eco', 'Všechno pro frontu', 35, ['sov_evac'], [spirit('f_totalni_mobilizace')], { ai: 900 }],
  ] },
  { prio: 1, list: [
    ['sov_army', 'Přezbrojení armády', 45, ['sov_heavy'], [stock('pusky', 4000), stock('dela', 150), man(0.003)], { ai: 5 }],
    ['sov_tank', 'Tankové zbraně', 45, ['sov_army'], [boost('ltank2'), stock('ltanky', 100)], { ai: 6 }],
    ['sov_conscr', 'Všeobecná výcviková příprava', 35, ['sov_tank'], [man(0.004), ws(0.05)], { ai: 10 }],
    ['sov_mass', 'Masová armáda', 35, ['sov_conscr'], [spirit('f_masova_armada')]],
    ['sov_deep', 'Hluboká operace', 70, ['sov_tank'], [spirit('f_stabni_planovani'), xp('land', 30)], { info: 'Útok do celé hloubky obrany najednou.' }],
    ['sov_t34', 'Nový střední tank', 70, ['sov_deep'], [boost('mtank', 0.5), mil()]],
    ['sov_art', 'Bůh války', 35, ['sov_army'], [boost('dela2'), spirit('f_delostrelecka_skola')], { info: 'Dělostřelectvo jako hlavní úderná síla.' }],
    ['sov_rocketart', 'Raketomety', 35, ['sov_art'], [boost('dela3', 0.3), stock('dela', 300)]],
    ['sov_defense', 'Opevněné oblasti', 35, ['sov_conscr'], [spirit('f_hlubka_obrany')]],
    ['sov_para', 'Výsadkové brigády', 35, ['sov_deep'], [boost('vysadek', 0.5)]],
    ['sov_winter', 'Zimní výcvik', 35, ['sov_mass'], [spirit('f_disciplina')]],
    ['sov_kv', 'Těžké průlomové tanky', 70, ['sov_t34'], [boost('htank', 0.4)]],
  ] },
  { prio: 2, list: [
    ['sov_air', 'Letecké závody', 45, ['sov_sci'], [boost('sti2'), xp('air', 20)], { ai: 7 }],
    ['sov_shturm', 'Bitevní letectvo', 35, ['sov_air'], [boost('bit2'), xp('air', 15)]],
    ['sov_afb', 'Polní letiště', 35, ['sov_air'], [bld('afb', 2)]],
    ['sov_fight', 'Nové stíhačky', 35, ['sov_afb'], [boost('sti3')]],
  ] },
  { prio: 3, list: [
    ['sov_sci', 'Akademie věd', 35, ['sov_rail'], [slot()], { ai: 4, mod: { research: 0.05 } }],
    ['sov_design', 'Konstrukční kanceláře', 35, ['sov_sci'], [adv('sci', 'konstrukter'), spirit('f_vedecka_rada')]],
    ['sov_radio', 'Radiotechnika', 35, ['sov_design'], [boost('spoj', 0.5)]],
    ['sov_atom', 'Laboratoř číslo dvě', 70, ['sov_design'], [boost('jadro1', 0.5)]],
  ] },
  { prio: 4, list: [
    ['sov_navy', 'Lodní program', 45, ['sov_army'], [xp('sea', 15), infra()], { ai: 8 }],
    ['sov_dock', 'Loděnice na Bílém moři', 35, ['sov_navy'], [bld('dok', 2)]],
    ['sov_subs', 'Ponorková flotila', 35, ['sov_dock'], [xp('sea', 20)]],
  ] },
  { prio: 2, list: [
    ['sov_spy', 'Bezpečnostní aparát', 35, ['sov_tank'], [pp(50), stab(0.04)], { ai: 9 }],
    ['sov_purge_end', 'Konec čistek', 70, ['sov_spy'], [{ t: 'unspirit', id: 'cistky' }, { t: 'mech', id: 'purge', v: -60 }, stab(0.05)], { info: 'Uvěznění důstojníci se vracejí k jednotkám.' }],
    ['sov_comintern', 'Komunistická internacionála', 35, ['sov_spy'], [pp(40), rel('CZE', 20), rel('FRA', 15)]],
    ['sov_collective', 'Kolektivní bezpečnost', 35, ['sov_comintern'], [rel('FRA', 30), rel('ENG', 20), rel('CZE', 30)], { excl: ['sov_pact'] }],
    ['sov_pact', 'Smlouva se západním sousedem', 35, ['sov_comintern'], [rel('GER', 40), pp(40)], { excl: ['sov_collective'], info: 'Získat čas a území dohodou.' }],
    ['sov_motherland', 'Obrana vlasti', 35, ['sov_purge_end'], [spirit('f_propaganda'), ws(0.08)]],
    ['sov_unity', 'Jednota národů', 35, ['sov_motherland'], [spirit('f_narodni_jednota')]],
  ] },
  { prio: 3, list: [
    ['sov_inf', 'Pěchotní výcvik', 35, ['sov_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['sov_at', 'Protitankové pluky', 35, ['sov_inf'], [boost('pdela2'), stock('pdela', 300)]],
    ['sov_cav', 'Jezdecko-mechanizované skupiny', 35, ['sov_inf'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['sov_partisan', 'Partyzánské hnutí', 35, ['sov_motherland'], [ws(0.05), xp('land', 15)]],
    ['sov_fareast', 'Dálněvýchodní armády', 70, ['sov_mass'], [man(0.005), stock('pusky', 5000)], { info: 'Divize z východu, kde je už klid.' }],
    ['sov_mines', 'Rudné pánve', 35, ['sov_oil'], [boost('tez3', 0.3)], { mod: { extract: 0.03 } }],
    ['sov_supply', 'Vojenské železnice', 35, ['sov_evac'], [boost('log', 0.4), infra()]],
  ] },
];
const SOV = big([...SOV_B, ...(XL_BRANCHES.SOV || []), ...ALT_BRANCHES.SOV, ...MOD_BRANCHES.SOV]);   // M98: nové větve; M100: politické cesty a modernizace

// ---------------------------------------------------------------- Británie
const ENG_B = [
  { prio: 0, list: [
    ['eng_ind', 'Obnova průmyslu', 35, [], [civ(2)], { ai: 1 }],
    ['eng_rearm', 'Program přezbrojení', 45, ['eng_ind'], [mil(2)], { ai: 3 }],
    ['eng_shadow', 'Stínové továrny', 70, ['eng_rearm'], [mil(2)], { info: 'Automobilky připravené přejít na zbrojní výrobu.' }],
    ['eng_coal', 'Uhlí a ocel', 35, ['eng_ind'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['eng_midlands', 'Průmyslové hrabství', 70, ['eng_coal'], [civ(2)]],
    ['eng_ration', 'Přídělový systém', 35, ['eng_shadow'], [spirit('f_racionalizace')]],
    ['eng_war_eco', 'Válečný kabinet', 35, ['eng_ration'], [law('eco', 'war'), stab(0.04)]],
    ['eng_total', 'Národní služba', 70, ['eng_war_eco'], [spirit('f_totalni_mobilizace')], { ai: 900 }],
  ] },
  { prio: 1, list: [
    ['eng_army', 'Expediční armáda', 35, ['eng_rearm'], [man(0.003), ws(0.08)], { ai: 5 }],
    ['eng_motor', 'Plně motorizovaná armáda', 35, ['eng_army'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['eng_tank', 'Pěchotní tanky', 45, ['eng_motor'], [boost('mtank', 0.4), stock('ltanky', 60)]],
    ['eng_art', 'Polní dělostřelectvo', 35, ['eng_army'], [boost('dela2'), spirit('f_delostrelecka_skola')]],
    ['eng_commando', 'Komanda', 35, ['eng_art'], [boost('vysadek', 0.5), spirit('f_elitni_jednotky')]],
    ['eng_desert', 'Pouštní válka', 35, ['eng_motor'], [spirit('f_tylove_sluzby'), xp('land', 20)]],
    ['eng_staff', 'Císařský generální štáb', 35, ['eng_commando'], [spirit('f_stabni_planovani')]],
  ] },
  { prio: 2, list: [
    ['eng_air', 'Stíhací velení', 45, ['eng_sci'], [boost('sti2'), xp('air', 25)], { ai: 7 }],
    ['eng_radar', 'Řetěz radarů', 35, ['eng_air'], [bld('radar', 3)], { info: 'Pobřežní stanice vidí nepřítele dřív, než přiletí.' }],
    ['eng_spit', 'Nové stíhačky', 35, ['eng_radar'], [boost('sti3'), bld('afb', 2)]],
    ['eng_bomber', 'Bombardovací velení', 70, ['eng_air'], [boost('strbomb', 0.5), xp('air', 20)]],
    ['eng_heavyb', 'Čtyřmotorové bombardéry', 70, ['eng_bomber'], [boost('str2', 0.4)]],
  ] },
  { prio: 3, list: [
    ['eng_sci', 'Radiolokační výzkum', 45, ['eng_ind'], [slot(0.3)], { ai: 2, mod: { research: 0.08 }, info: 'Silný vědecký sektor.' }],
    ['eng_code', 'Luštění šifer', 35, ['eng_sci'], [pp(40), spirit('f_vedecka_rada')], { info: 'Matematici na venkovském zámečku čtou cizí rozkazy.' }],
    ['eng_jet', 'Proudový motor', 70, ['eng_code'], [boost('sti4', 0.4)]],
    ['eng_tube', 'Slitinové trubky', 70, ['eng_code'], [boost('jadro1', 0.5)]],
  ] },
  { prio: 2, list: [
    ['eng_nav', 'Zámořské zásobování', 35, ['eng_rearm'], [law('trd', 'free')], { ai: 4, mod: { imp: -0.1 } }],
    ['eng_navy', 'Posílení loďstva', 45, ['eng_nav'], [xp('sea', 25), civ()], { ai: 8 }],
    ['eng_dock', 'Královské loděnice', 35, ['eng_navy'], [bld('dok', 3)]],
    ['eng_convoy', 'Ochrana konvojů', 35, ['eng_dock'], [xp('sea', 25), spirit('f_obchodni_lodstvo')]],
    ['eng_carrier', 'Námořní letectvo', 35, ['eng_dock'], [xp('sea', 15), xp('air', 15)]],
  ] },
  { prio: 2, list: [
    ['eng_unity', 'Národní svornost', 35, ['eng_sci'], [stab(0.06), pp(40)], { ai: 6 }],
    ['eng_spy', 'Tajná služba', 35, ['eng_unity'], [pp(50), xp('land', 15)], { ai: 9 }],
    ['eng_empire', 'Říšská spolupráce', 35, ['eng_nav'], [pp(40), man(0.003)], { ai: 10 }],
    ['eng_dominion', 'Dominia do zbraně', 70, ['eng_empire'], [man(0.004), stock('pusky', 3000)], { info: 'Divize z dominií posílí armádu v Evropě.' }],
    ['eng_france', 'Srdečná dohoda', 35, ['eng_unity'], [rel('FRA', 40), rel('BEL', 20)]],
    ['eng_guarantee', 'Záruky malým národům', 35, ['eng_france'], [rel('POL', 30), rel('GRE', 30), rel('ROM', 20)]],
    ['eng_finest', 'Nejskvělejší hodina', 35, ['eng_guarantee', 'eng_spy'], [spirit('f_narodni_jednota'), ws(0.1)]],
    ['eng_lend', 'Arzenál demokracie', 35, ['eng_finest'], [stock('pusky', 4000), stock('auta', 300), pp(30)], { info: 'Zámořské dodávky na úvěr.' }],
  ] },
  { prio: 3, list: [
    ['eng_inf', 'Pěchotní výcvik', 35, ['eng_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['eng_at', 'Protitankové zbraně', 35, ['eng_inf'], [boost('pdela2'), stock('pdela', 150)]],
    ['eng_disc', 'Plukovní tradice', 35, ['eng_inf'], [spirit('f_disciplina')]],
    ['eng_home', 'Domobrana', 35, ['eng_at'], [man(0.003), spirit('f_hlubka_obrany')]],
    ['eng_funnies', 'Zvláštní obrněná vozidla', 35, ['eng_tank'], [boost('ltank3', 0.3), xp('land', 15)]],
    ['eng_supply', 'Zásobovací kolony', 35, ['eng_desert'], [boost('log', 0.4)]],
    ['eng_harbour', 'Přenosné přístavy', 70, ['eng_staff', 'eng_convoy'], [xp('sea', 20), xp('land', 20)], { info: 'Vylodění nečeká na dobytý přístav.' }],
    ['eng_tactical', 'Taktické letectvo', 35, ['eng_bomber'], [boost('tac2'), xp('air', 15)]],
  ] },
];
const ENG = big([...ENG_B, ...(XL_BRANCHES.ENG || []), ...ALT_BRANCHES.ENG, ...MOD_BRANCHES.ENG]);   // M98: nové větve; M100: politické cesty a modernizace

// ---------------------------------------------------------------- Francie
const FRA_B = [
  { prio: 0, list: [
    ['fra_ind', 'Národní hospodářská obnova', 45, [], [civ(2)], { ai: 2 }],
    ['fra_arm', 'Znárodnění zbrojovek', 35, ['fra_ind'], [mil(2)], { ai: 3, mod: { prod: 0.02 } }],
    ['fra_col', 'Zdroje z kolonií', 35, ['fra_ind'], [law('trd', 'closed')], { ai: 5, mod: { extract: 0.08 } }],
    ['fra_north', 'Severní průmyslová pánev', 70, ['fra_arm'], [mil(), civ()]],
    ['fra_lorraine', 'Lotrinská ruda', 35, ['fra_col'], [boost('tez1', 0.5)], { mod: { extract: 0.04 } }],
    ['fra_40h', 'Čtyřicetihodinový týden', 35, ['fra_ind'], [spirit('f_spotrebni_vyroba')], { excl: ['fra_overtime'], info: 'Sociální smír místo přesčasů.' }],
    ['fra_overtime', 'Přesčasy ve zbrojovkách', 35, ['fra_ind'], [spirit('f_racionalizace'), stab(-0.03)], { excl: ['fra_40h'] }],
    ['fra_war_eco', 'Válečné hospodářství', 35, ['fra_north'], [law('eco', 'war')]],
  ] },
  { prio: 1, list: [
    ['fra_front', 'Pevnostní pás', 45, [], [infra(), ws(0.04)], { ai: 1, info: 'Dlouhodobá obrana hranic.' }],
    ['fra_army', 'Reforma armády', 35, ['fra_front'], [man(0.004), adv('arm', 'reform')], { ai: 4 }],
    ['fra_tank', 'Tankové divize', 45, ['fra_army'], [boost('ltank2'), stock('ltanky', 50)], { ai: 7 }],
    ['fra_maginot', 'Rozšíření pevnostní linie', 70, ['fra_front'], [spirit('f_hlubka_obrany')]],
    ['fra_drm', 'Obrněné divize', 70, ['fra_tank'], [boost('mtank', 0.4), spirit('f_tankova_skola')], { info: 'Tanky soustředěné do divizí, ne rozptýlené k pěchotě.' }],
    ['fra_motor', 'Motorizace pěchoty', 35, ['fra_tank'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['fra_art', 'Těžké dělostřelectvo', 35, ['fra_army'], [boost('dela2'), spirit('f_delostrelecka_skola')]],
    ['fra_alpine', 'Alpští myslivci', 35, ['fra_art'], [spirit('f_horske_jednotky')]],
    ['fra_colonial', 'Koloniální armáda', 35, ['fra_army'], [man(0.004), stock('pusky', 2500)]],
    ['fra_radio', 'Rádiové spojení', 35, ['fra_drm'], [boost('spoj', 0.5), spirit('f_stabni_planovani')], { info: 'Konec telefonních drátů na bojišti.' }],
  ] },
  { prio: 2, list: [
    ['fra_air', 'Letecká reforma', 45, ['fra_col'], [boost('sti2'), xp('air', 20)], { ai: 8 }],
    ['fra_aircons', 'Znárodnění leteckých továren', 35, ['fra_air'], [mil(), bld('afb', 2)]],
    ['fra_fight', 'Moderní stíhačky', 35, ['fra_aircons'], [boost('sti3')]],
  ] },
  { prio: 3, list: [
    ['fra_sci', 'Vědecké ústavy', 35, ['fra_army'], [slot()], { ai: 9, mod: { research: 0.05 } }],
    ['fra_cnrs', 'Národní výzkumné středisko', 35, ['fra_sci'], [spirit('f_vedecka_rada')]],
    ['fra_atom', 'Jaderná fyzika', 70, ['fra_cnrs'], [boost('jadro1', 0.5)]],
  ] },
  { prio: 4, list: [
    ['fra_navy', 'Zámořské loďstvo', 45, ['fra_unity'], [xp('sea', 20), infra()], { ai: 10 }],
    ['fra_dock', 'Loděnice v Brestu', 35, ['fra_navy'], [bld('dok', 2)]],
    ['fra_med', 'Středomořská eskadra', 35, ['fra_dock'], [xp('sea', 20)]],
  ] },
  { prio: 2, list: [
    ['fra_unity', 'Lidová jednota', 35, ['fra_army'], [stab(0.08), pp(50)], { ai: 6 }],
    ['fra_spy', 'Druhé oddělení', 35, ['fra_unity'], [pp(40), xp('land', 15)], { ai: 11 }],
    ['fra_entente', 'Spojenectví s Británií', 35, ['fra_unity'], [rel('ENG', 40)]],
    ['fra_little', 'Malá dohoda', 35, ['fra_entente'], [rel('CZE', 40), rel('YUG', 30), rel('ROM', 30)]],
    ['fra_east', 'Východní pakt', 35, ['fra_little'], [rel('SOV', 30), rel('POL', 30)]],
    ['fra_republic', 'Obrana republiky', 35, ['fra_spy'], [spirit('f_narodni_jednota'), { t: 'unspirit', id: 'rozstepena_republika' }], { info: 'Konec střídání vlád po měsících.' }],
    ['fra_resolve', 'Odhodlání bojovat', 35, ['fra_republic'], [ws(0.1), spirit('f_propaganda')]],
  ] },
  { prio: 3, list: [
    ['fra_inf', 'Pěchotní výcvik', 35, ['fra_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['fra_at', 'Protitankové kanóny', 35, ['fra_inf'], [boost('pdela2'), stock('pdela', 150)]],
    ['fra_disc', 'Vojenská škola', 35, ['fra_inf'], [spirit('f_disciplina'), xp('land', 15)]],
    ['fra_supply', 'Vojenská doprava', 35, ['fra_motor'], [spirit('f_tylove_sluzby')]],
    ['fra_dlm', 'Lehké mechanizované divize', 35, ['fra_motor'], [boost('auta3', 0.3), boost('mech', 0.3)]],
    ['fra_heavy', 'Těžké tanky', 70, ['fra_drm'], [boost('htank', 0.4)]],
    ['fra_reserve', 'Záložní armáda', 35, ['fra_colonial'], [man(0.003), stab(0.02)]],
    ['fra_bomb', 'Bombardovací letectvo', 35, ['fra_aircons'], [boost('tac2'), xp('air', 15)]],
    ['fra_radar', 'Protiletadlová obrana', 35, ['fra_fight'], [bld('radar', 2)]],
    ['fra_staff', 'Moderní velení', 70, ['fra_radio', 'fra_republic'], [{ t: 'unspirit', id: 'tezkopadne_veleni' }, xp('land', 20)], { info: 'Konec těžkopádného velení.' }],
  ] },
];
const FRA = big([...FRA_B, ...(XL_BRANCHES.FRA || []), ...ALT_BRANCHES.FRA, ...MOD_BRANCHES.FRA]);   // M98: nové větve; M100: politické cesty a modernizace

// ---------------------------------------------------------------- Itálie
const ITA_B = [
  { prio: 0, list: [
    ['ita_ind', 'Hospodářský program', 45, [], [civ(), mil()], { ai: 1 }],
    ['ita_auto', 'Soběstačnost', 35, ['ita_ind'], [law('trd', 'closed')], { ai: 2, mod: { extract: 0.06 } }],
    ['ita_arm', 'Zbrojní podniky', 45, ['ita_auto'], [mil(2)], { ai: 4 }],
    ['ita_road', 'Silniční program', 35, ['ita_arm'], [infra()], { ai: 6 }],
    ['ita_north', 'Severní průmyslový trojúhelník', 70, ['ita_arm'], [civ(), mil()]],
    ['ita_south', 'Rozvoj jihu', 70, ['ita_road'], [civ(2), stab(0.03)]],
    ['ita_marsh', 'Vysoušení bažin', 35, ['ita_road'], [spirit('f_stavebni_program')]],
    ['ita_albania', 'Albánská ropa', 35, ['ita_auto'], [boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['ita_war_eco', 'Válečná výroba', 35, ['ita_north'], [spirit('f_racionalizace')]],
  ] },
  { prio: 1, list: [
    ['ita_army', 'Reforma armády', 35, ['ita_ind'], [man(0.004), ws(0.05)], { ai: 3 }],
    ['ita_alpini', 'Alpské sbory', 35, ['ita_army'], [spirit('f_horske_jednotky')]],
    ['ita_binary', 'Dvoupluková divize', 35, ['ita_army'], [man(0.004), spirit('f_masova_armada')], { info: 'Víc menších divizí.' }],
    ['ita_armor', 'Obrněné divize', 45, ['ita_alpini'], [boost('ltank2'), stock('ltanky', 50)]],
    ['ita_motor', 'Motorizace', 35, ['ita_armor'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['ita_art', 'Moderní dělostřelectvo', 35, ['ita_binary'], [boost('dela2'), stock('dela', 200)]],
    ['ita_para', 'Výsadkový pluk', 35, ['ita_art'], [boost('vysadek', 0.5)]],
    ['ita_africa', 'Africká armáda', 35, ['ita_motor'], [spirit('f_tylove_sluzby'), xp('land', 20)]],
    ['ita_mtank', 'Střední tanky', 70, ['ita_armor'], [boost('mtank', 0.4)]],
  ] },
  { prio: 2, list: [
    ['ita_air', 'Letecké síly', 45, ['ita_sci'], [boost('sti2'), xp('air', 20)], { ai: 7 }],
    ['ita_afb', 'Letiště v Libyi a na ostrovech', 35, ['ita_air'], [bld('afb', 2)]],
    ['ita_torp', 'Torpédové letectvo', 35, ['ita_afb'], [boost('tac2'), xp('air', 15)]],
  ] },
  { prio: 3, list: [
    ['ita_sci', 'Technické ústavy', 35, ['ita_army'], [slot()], { ai: 5, mod: { research: 0.05 } }],
    ['ita_cnr', 'Národní rada pro výzkum', 35, ['ita_sci'], [spirit('f_vedecka_rada')]],
  ] },
  { prio: 2, list: [
    ['ita_navy', 'Námořní program', 45, ['ita_arm'], [xp('sea', 25), infra()], { ai: 8 }],
    ['ita_dock', 'Loděnice v Janově a Tarentu', 35, ['ita_navy'], [bld('dok', 2)]],
    ['ita_mare', 'Naše moře', 35, ['ita_dock'], [xp('sea', 25), ws(0.05)]],
    ['ita_frogmen', 'Útočné čluny a potápěči', 35, ['ita_mare'], [xp('sea', 15), pp(30)]],
  ] },
  { prio: 2, list: [
    ['ita_spy', 'Vojenská zpravodajská služba', 35, ['ita_road'], [pp(40), xp('land', 15)], { ai: 9 }],
    ['ita_empire', 'Nová říše', 35, ['ita_army'], [ws(0.06), spirit('f_propaganda')]],
    ['ita_axis', 'Ocelový pakt', 35, ['ita_empire'], [rel('GER', 50)], { excl: ['ita_stresa'] }],
    ['ita_stresa', 'Stresská fronta', 35, ['ita_empire'], [rel('FRA', 40), rel('ENG', 40)], { excl: ['ita_axis'], info: 'Spojit se se západem proti německé expanzi.' }],
    ['ita_balkan', 'Balkánský vliv', 35, ['ita_axis'], [rel('HUN', 30), rel('BUL', 30), rel('ALB', 30)]],
    ['ita_spain', 'Podpora ve Španělsku', 35, ['ita_empire'], [rel('SPR', 30), xp('land', 20), xp('air', 15)]],
    ['ita_unity', 'Korporativní stát', 35, ['ita_spy'], [spirit('f_narodni_jednota'), party('gov', 8)]],
  ] },
  { prio: 3, list: [
    ['ita_inf', 'Pěchotní výcvik', 35, ['ita_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['ita_at', 'Protitankové zbraně', 35, ['ita_inf'], [boost('pdela2'), stock('pdela', 120)]],
    ['ita_disc', 'Vojenská akademie', 35, ['ita_inf'], [spirit('f_disciplina')]],
    ['ita_staff', 'Generální štáb', 35, ['ita_disc'], [spirit('f_stabni_planovani')]],
    ['ita_fight', 'Nové stíhačky', 35, ['ita_afb'], [boost('sti3')]],
    ['ita_bomb', 'Trojmotorové bombardéry', 35, ['ita_air'], [boost('strbomb', 0.4)]],
    ['ita_radar', 'Protiletadlová obrana', 35, ['ita_fight'], [bld('radar', 1)]],
    ['ita_mines', 'Sardinské doly', 35, ['ita_albania'], [boost('tez2', 0.3)], { mod: { extract: 0.03 } }],
    ['ita_eafrica', 'Východoafrické posádky', 35, ['ita_africa'], [man(0.003), stock('pusky', 2000)]],
    ['ita_elite', 'Výběrové divize', 35, ['ita_staff', 'ita_para'], [spirit('f_elitni_jednotky')]],
  ] },
];
const ITA = big([...ITA_B, ...(XL_BRANCHES.ITA || []), ...ALT_BRANCHES.ITA, ...MOD_BRANCHES.ITA]);   // M98: nové větve; M100: politické cesty a modernizace

export const BIG_TREES = { GER, SOV, ENG, FRA, ITA };

// ---------------------------------------------------------------- rozšíření zajímavých zemí (pod původní strom)
export const GROW = {
  POL: [
    ['pol_cop', 'Centrální průmyslový okruh', 70, ['pol_ind'], [civ(), mil()], { info: 'Továrny v bezpečí uprostřed země.' }],
    ['pol_steel', 'Hutě ve Stalowé Woli', 35, ['pol_cop'], [boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['pol_cav', 'Jízda a motorizace', 35, ['pol_army'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['pol_at', 'Protitankové pušky', 35, ['pol_arm'], [boost('pdela2'), stock('pdela', 120)]],
    ['pol_tank', 'Lehké tanky vlastní konstrukce', 45, ['pol_cav'], [boost('ltank2'), stock('ltanky', 40)]],
    ['pol_fort', 'Opevnění západní hranice', 35, ['pol_army'], [spirit('f_hlubka_obrany')]],
    ['pol_inf', 'Pěchotní výcvik', 35, ['pol_fort'], [spirit('f_pechotni_drill'), boost('pusky2')]],
    ['pol_enigma', 'Matematici proti šifrám', 35, ['pol_spy'], [pp(40), slot()], { info: 'Šifrovací stroj souseda už není tajemstvím.' }],
    ['pol_france', 'Spojenectví s Francií', 35, ['pol_unity'], [rel('FRA', 40), rel('ENG', 30)], { excl: ['pol_intermarium'] }],
    ['pol_intermarium', 'Mezimoří', 35, ['pol_unity'], [rel('ROM', 30), rel('HUN', 30), rel('LIT', 20)], { excl: ['pol_france'], info: 'Blok států mezi Baltem a Černým mořem.' }],
    ['pol_reserve', 'Záložníci', 35, ['pol_inf'], [man(0.004), ws(0.05)]],
    ['pol_last', 'Do posledního muže', 35, ['pol_reserve'], [spirit('f_narodni_jednota'), ws(0.06)]],
  ],
  CZE: [
    ['cze_skoda', 'Rozšíření zbrojovek', 70, ['cze_ind'], [mil(2)]],
    ['cze_brno', 'Zbrojovka v Brně', 35, ['cze_skoda'], [boost('pusky2'), stock('pusky', 2000)]],
    ['cze_lt38', 'Nový lehký tank', 45, ['cze_tank'], [boost('ltank3', 0.3), mil()]],
    ['cze_fort2', 'Těžká opevnění', 70, ['cze_fort'], [spirit('f_hlubka_obrany')]],
    ['cze_mountain', 'Horské prapory', 35, ['cze_fort2'], [spirit('f_horske_jednotky')]],
    ['cze_little', 'Malá dohoda', 35, ['cze_unity'], [rel('YUG', 40), rel('ROM', 40)], { excl: ['cze_west'] }],
    ['cze_west', 'Spoléhání na Francii', 35, ['cze_unity'], [rel('FRA', 40), rel('SOV', 20)], { excl: ['cze_little'] }],
    ['cze_mob', 'Mobilizace', 35, ['cze_mountain'], [man(0.004), ws(0.08)]],
    ['cze_air2', 'Moderní stíhačky', 35, ['cze_air'], [boost('sti2'), bld('afb', 1)]],
    ['cze_defense', 'Obrana republiky', 35, ['cze_mob', 'cze_spy'], [spirit('f_narodni_jednota')]],
  ],
  SPR: [
    ['spr_rebuild', 'Obnova po válce', 70, ['spr_ind'], [civ(2), stab(0.03)]],
    ['spr_rail', 'Železnice', 35, ['spr_rebuild'], [infra()]],
    ['spr_wolfram', 'Wolframové doly', 35, ['spr_mine'], [boost('tez2', 0.3)], { mod: { extract: 0.05 } }],
    ['spr_legion', 'Cizinecká legie', 35, ['spr_army'], [spirit('f_elitni_jednotky')]],
    ['spr_mountain', 'Horské brigády', 35, ['spr_army'], [spirit('f_horske_jednotky')]],
    ['spr_neutral', 'Nevměšování', 35, ['spr_unity'], [stab(0.05), pp(40)], { excl: ['spr_axis', 'spr_republic'] }],
    ['spr_axis', 'S Osou', 35, ['spr_unity'], [rel('GER', 40), rel('ITA', 40), party('fascism', 10)], { excl: ['spr_neutral', 'spr_republic'] }],
    ['spr_republic', 'Obnova republiky', 35, ['spr_unity'], [rel('FRA', 40), party('democracy', 10)], { excl: ['spr_neutral', 'spr_axis'] }],
    ['spr_tank', 'Tankové dílny', 35, ['spr_arm'], [boost('ltank2'), stock('ltanky', 30)]],
    ['spr_navy', 'Obnova loďstva', 35, ['spr_rail'], [bld('dok', 1), xp('sea', 15)]],
  ],
  HUN: [
    ['hun_gyor', 'Program z Győru', 70, ['hun_ind'], [mil(), civ()], { info: 'Miliarda pengő na přezbrojení.' }],
    ['hun_bauxite', 'Bauxit a hliník', 35, ['hun_gyor'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['hun_hussar', 'Husaři na motocyklech', 35, ['hun_army'], [boost('auta2'), spirit('f_motorizovana_valka')]],
    ['hun_turan', 'Vlastní tank', 45, ['hun_tank'], [boost('mtank', 0.3), stock('ltanky', 30)]],
    ['hun_air', 'Královské letectvo', 35, ['hun_army'], [boost('sti2'), xp('air', 15)]],
    ['hun_axis', 'Arbitráže', 35, ['hun_rev'], [rel('GER', 40), rel('ITA', 40)], { excl: ['hun_west'], info: 'Revize hranic s pomocí Osy.' }],
    ['hun_west', 'Tajné styky se Západem', 35, ['hun_rev'], [rel('ENG', 30), rel('POL', 30)], { excl: ['hun_axis'] }],
    ['hun_staff', 'Generální štáb', 35, ['hun_hussar'], [spirit('f_stabni_planovani')]],
    ['hun_levy', 'Honvéd', 35, ['hun_staff'], [man(0.004), ws(0.05)]],
    ['hun_crown', 'Svatoštěpánská koruna', 35, ['hun_unity'], [spirit('f_narodni_jednota')]],
  ],
  ROM: [
    ['rom_ploiesti', 'Rafinerie v Ploješti', 70, ['rom_oil'], [civ(), boost('synt1', 0.2)], { mod: { extract: 0.05 } }],
    ['rom_resita', 'Hutě v Rešici', 35, ['rom_ploiesti'], [mil()]],
    ['rom_carol', 'Karlova linie', 35, ['rom_fort'], [spirit('f_hlubka_obrany')]],
    ['rom_mountain', 'Vânători de munte', 35, ['rom_army'], [spirit('f_horske_jednotky')]],
    ['rom_cav', 'Jízdní sbor', 35, ['rom_mountain'], [boost('auta2'), stock('auta', 100)]],
    ['rom_west', 'Balkánská dohoda', 35, ['rom_alliance'], [rel('YUG', 30), rel('GRE', 30), rel('TUR', 30)], { excl: ['rom_axis'] }],
    ['rom_axis', 'Ropa za záruky', 35, ['rom_alliance'], [rel('GER', 40), law('trd', 'free')], { excl: ['rom_west'] }],
    ['rom_air2', 'Vlastní letouny', 35, ['rom_air'], [boost('sti2'), bld('afb', 1)]],
    ['rom_levy', 'Všeobecná branná povinnost', 35, ['rom_cav'], [man(0.004), ws(0.05)]],
    ['rom_unity', 'Velké Rumunsko', 35, ['rom_order'], [spirit('f_narodni_jednota')]],
  ],
  YUG: [
    ['yug_bor', 'Měď z Boru', 35, ['yug_mine'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['yug_kragujevac', 'Zbrojovka v Kragujevaci', 70, ['yug_arm'], [mil(), stock('pusky', 1500)]],
    ['yug_rail', 'Jaderská železnice', 35, ['yug_agri'], [infra(), civ()]],
    ['yug_chetnik', 'Horské oddíly', 35, ['yug_mountain'], [spirit('f_horske_jednotky')]],
    ['yug_fort', 'Pohraniční opevnění', 35, ['yug_army'], [spirit('f_hlubka_obrany')]],
    ['yug_federal', 'Dohoda národů', 35, ['yug_unity'], [stab(0.08), pp(40)], { excl: ['yug_central'], info: 'Autonomie místo centralismu.' }],
    ['yug_central', 'Silná koruna', 35, ['yug_unity'], [ws(0.06), party('gov', 8)], { excl: ['yug_federal'] }],
    ['yug_balkan', 'Balkánský pakt', 35, ['yug_alliance'], [rel('GRE', 30), rel('TUR', 30), rel('ROM', 30)]],
    ['yug_air', 'Letecké dílny', 35, ['yug_arm'], [boost('sti2'), xp('air', 15)]],
    ['yug_levy', 'Mobilizace', 35, ['yug_fort'], [man(0.004), ws(0.05)]],
  ],
  TUR: [
    ['tur_karabuk', 'Hutě v Karabüku', 70, ['tur_ind'], [civ(), mil()]],
    ['tur_chrome', 'Chromová ruda', 35, ['tur_mine'], [boost('tez2', 0.3)], { mod: { extract: 0.06 } }],
    ['tur_planned', 'Pětiletý plán', 70, ['tur_karabuk'], [civ(2)]],
    ['tur_army2', 'Modernizace armády', 35, ['tur_army'], [boost('pusky2'), stock('pusky', 2000)]],
    ['tur_mountain', 'Anatolské sbory', 35, ['tur_army2'], [spirit('f_horske_jednotky')]],
    ['tur_thrace', 'Thrácké opevnění', 35, ['tur_straits'], [spirit('f_hlubka_obrany')]],
    ['tur_west', 'Spojenectví s Británií', 35, ['tur_neutral'], [rel('ENG', 40), rel('FRA', 30)], { excl: ['tur_balance'] }],
    ['tur_balance', 'Aktivní neutralita', 35, ['tur_neutral'], [stab(0.05), pp(50)], { excl: ['tur_west'] }],
    ['tur_air', 'Letecká liga', 35, ['tur_sci'], [boost('sti2'), bld('afb', 1)]],
    ['tur_unity', 'Šest šípů', 35, ['tur_reform'], [spirit('f_narodni_jednota')]],
  ],
  SWE: [
    ['swe_bofors', 'Kanóny z Boforsu', 70, ['swe_ind'], [mil(), boost('pdela2')], { info: 'Protiletadlové a protitankové kanóny světové pověsti.' }],
    ['swe_steel', 'Švédská ocel', 35, ['swe_ore'], [boost('tez2', 0.3)], { mod: { extract: 0.05 } }],
    ['swe_saab', 'Letecký průmysl', 35, ['swe_air'], [boost('sti2'), mil()]],
    ['swe_winter', 'Zimní pěchota', 35, ['swe_army'], [spirit('f_pechotni_drill')]],
    ['swe_tank', 'Vlastní tanky', 35, ['swe_army'], [boost('ltank2'), stock('ltanky', 30)]],
    ['swe_fort', 'Opevnění na severu', 35, ['swe_winter'], [spirit('f_hlubka_obrany')]],
    ['swe_nordic', 'Severská spolupráce', 35, ['swe_neutral'], [rel('NOR', 30), rel('FIN', 40), rel('DEN', 30)]],
    ['swe_trade', 'Obchod s oběma stranami', 35, ['swe_neutral'], [law('trd', 'free'), pp(30)], { mod: { imp: -0.05 } }],
    ['swe_navy2', 'Pobřežní obrněné lodě', 35, ['swe_navy'], [bld('dok', 1), xp('sea', 15)]],
    ['swe_ready', 'Ozbrojená pohotovost', 35, ['swe_fort'], [man(0.003), ws(0.06)]],
  ],
  FIN: [
    ['fin_line', 'Opevněná linie na šíji', 70, ['fin_east'], [spirit('f_hlubka_obrany')]],
    ['fin_sisu', 'Houževnatost', 35, ['fin_winter'], [spirit('f_disciplina')], { info: 'Vydržet i to, co se vydržet nedá.' }],
    ['fin_motti', 'Taktika obklíčených kotlů', 35, ['fin_ski'], [xp('land', 25), spirit('f_stabni_planovani')]],
    ['fin_nickel', 'Niklové doly', 35, ['fin_north'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['fin_arms', 'Zbrojní výroba', 70, ['fin_arm'], [mil(), stock('pusky', 1500)]],
    ['fin_air', 'Letectvo', 35, ['fin_arm'], [boost('sti2'), xp('air', 15)]],
    ['fin_sweden', 'Bratrská pomoc ze Švédska', 35, ['fin_unity'], [rel('SWE', 40), stock('pusky', 1000)]],
    ['fin_germany', 'Zbraně za nikl', 35, ['fin_unity'], [rel('GER', 30), stock('dela', 80)]],
    ['fin_guard2', 'Ochranné sbory', 35, ['fin_guard'], [man(0.004)]],
    ['fin_forest2', 'Dřevařský vývoz', 35, ['fin_forest'], [civ(), law('trd', 'free')]],
  ],
  GRE: [
    ['gre_metaxas', 'Pevnostní linie na severu', 70, ['gre_fort'], [spirit('f_hlubka_obrany')]],
    ['gre_evzones', 'Evzoni', 35, ['gre_mountain'], [spirit('f_horske_jednotky'), xp('land', 15)]],
    ['gre_ind', 'Průmyslová obnova', 70, ['gre_order'], [civ(), mil()]],
    ['gre_merchant', 'Obchodní loďstvo', 35, ['gre_ship'], [spirit('f_obchodni_lodstvo')]],
    ['gre_navy2', 'Torpédoborce', 35, ['gre_navy'], [bld('dok', 1), xp('sea', 15)]],
    ['gre_balkan', 'Balkánský pakt', 35, ['gre_order'], [rel('TUR', 40), rel('YUG', 30), rel('ROM', 30)]],
    ['gre_england', 'Britské záruky', 35, ['gre_balkan'], [rel('ENG', 40)]],
    ['gre_air', 'Letectvo', 35, ['gre_arm'], [boost('sti2'), bld('afb', 1)]],
    ['gre_levy', 'Všeobecná mobilizace', 35, ['gre_evzones'], [man(0.004), ws(0.06)]],
  ],
  HOL: [
    ['hol_water', 'Vodní linie', 70, ['hol_flood'], [spirit('f_hlubka_obrany')]],
    ['hol_fokker', 'Domácí letouny', 35, ['hol_air'], [boost('sti2'), bld('afb', 1)]],
    ['hol_indies', 'Ropa z Indií', 35, ['hol_colony'], [boost('tez2', 0.3), stock('pusky', 800)], { mod: { extract: 0.04 } }],
    ['hol_navy', 'Loďstvo pro kolonie', 35, ['hol_trade'], [bld('dok', 1), xp('sea', 20)]],
    ['hol_merchant', 'Obchodní flotila', 35, ['hol_navy'], [spirit('f_obchodni_lodstvo')]],
    ['hol_west', 'Tajná jednání se Západem', 35, ['hol_neutral'], [rel('ENG', 30), rel('BEL', 30)]],
    ['hol_army2', 'Modernizace pěchoty', 35, ['hol_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['hol_at', 'Protitankové kanóny', 35, ['hol_army2'], [boost('pdela2'), stock('pdela', 80)]],
    ['hol_sci', 'Laboratoře', 35, ['hol_philips'], [spirit('f_vedecka_rada')]],
  ],
  BEL: [
    ['bel_eben', 'Pevnostní pás na Máse', 70, ['bel_fort'], [spirit('f_hlubka_obrany')]],
    ['bel_ardennes', 'Ardenští myslivci', 35, ['bel_army'], [spirit('f_horske_jednotky')]],
    ['bel_fn', 'Zbrojovka v Herstalu', 70, ['bel_arm'], [mil(), stock('pusky', 1500)]],
    ['bel_coal', 'Uhelné revíry', 35, ['bel_ind'], [boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['bel_kw', 'Hlavní obranná linie', 35, ['bel_eben'], [ws(0.06), man(0.003)]],
    ['bel_west', 'Opatrná spolupráce s Francií', 35, ['bel_neutral'], [rel('FRA', 30), rel('ENG', 30)]],
    ['bel_air', 'Letecká obrana', 35, ['bel_arm'], [boost('sti2'), bld('afb', 1)]],
    ['bel_unity', 'Národní jednota', 35, ['bel_neutral'], [spirit('f_narodni_jednota')]],
    ['bel_reserve', 'Mobilizační plán', 35, ['bel_kw'], [man(0.003), stock('pusky', 1000)]],
  ],
  POR: [
    ['por_estado', 'Nový stát', 35, ['por_order'], [stab(0.06), party('gov', 8)]],
    ['por_wolfram', 'Wolfram pro všechny', 35, ['por_colony'], [boost('tez2', 0.3), law('trd', 'free')], { mod: { extract: 0.05 } }],
    ['por_ind2', 'Obnova průmyslu', 70, ['por_ind'], [civ(), mil()]],
    ['por_alliance', 'Nejstarší spojenectví', 35, ['por_neutral'], [rel('ENG', 40)], { excl: ['por_iberia'] }],
    ['por_iberia', 'Iberský pakt', 35, ['por_neutral'], [rel('SPR', 40)], { excl: ['por_alliance'] }],
    ['por_azores', 'Atlantické základny', 35, ['por_fleet'], [bld('afb', 1), xp('sea', 15)]],
    ['por_army2', 'Modernizace armády', 35, ['por_army'], [boost('pusky2'), stock('pusky', 1500)]],
    ['por_africa', 'Africké posádky', 35, ['por_army2'], [man(0.003)]],
    ['por_mines', 'Doly v Alentejo', 35, ['por_wolfram'], [civ()], { mod: { extract: 0.03 } }],
  ],
  SWI: [
    ['swi_alps', 'Národní reduta v Alpách', 70, ['swi_redoubt'], [spirit('f_horske_jednotky'), spirit('f_hlubka_obrany')]],
    ['swi_precision', 'Přesné strojírenství', 35, ['swi_ind'], [spirit('f_racionalizace')]],
    ['swi_oerlikon', 'Kanóny z Oerlikonu', 35, ['swi_arm'], [boost('pdela2'), mil()]],
    ['swi_bank2', 'Finanční uzel Evropy', 35, ['swi_bank'], [civ(), pp(40)]],
    ['swi_red', 'Červený kříž', 35, ['swi_neutral'], [stab(0.05), rel('GER', 10), rel('ENG', 10), rel('FRA', 10)]],
    ['swi_militia2', 'Každý občan voják', 35, ['swi_militia'], [man(0.004), spirit('f_pechotni_drill')]],
    ['swi_air2', 'Stíhačky do hor', 35, ['swi_air'], [boost('sti2'), bld('afb', 1)]],
    ['swi_sci2', 'Fyzikální ústavy', 35, ['swi_sci'], [spirit('f_vedecka_rada')]],
  ],
  NOR: [
    ['nor_merchant', 'Čtvrtá obchodní flotila světa', 35, ['nor_ship'], [spirit('f_obchodni_lodstvo')]],
    ['nor_heavy_water', 'Těžká voda', 70, ['nor_hydro'], [boost('jadro1', 0.3), civ()]],
    ['nor_alu2', 'Hliníkárny', 35, ['nor_alu'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['nor_arms', 'Zbrojovka v Raufossu', 70, ['nor_army'], [mil(), stock('pusky', 1200)]],
    ['nor_coast2', 'Pobřežní pevnosti', 35, ['nor_coast'], [spirit('f_hlubka_obrany')]],
    ['nor_ski', 'Lyžařské prapory', 35, ['nor_mountain'], [spirit('f_horske_jednotky')]],
    ['nor_nordic', 'Severská spolupráce', 35, ['nor_neutral'], [rel('SWE', 40), rel('DEN', 30)]],
    ['nor_west', 'Pod ochranou loďstva', 35, ['nor_nordic'], [rel('ENG', 40)]],
    ['nor_navy', 'Námořní obrana', 35, ['nor_coast'], [bld('dok', 1), xp('sea', 15)]],
  ],
};

// ---------------------------------------------------------------- výchozí strom (země bez vlastního stromu)
const DEFAULT_B = [
  { prio: 0, list: [
    ['def_ind', 'Průmyslová expanze', 35, [], [civ()], { ai: 1, info: 'Nová civilní továrna.' }],
    ['def_arm', 'Zbrojní výroba', 35, ['def_ind'], [mil()], { ai: 2, info: 'Nová vojenská továrna.' }],
    ['def_road', 'Silnice a železnice', 35, ['def_ind'], [infra()], { ai: 4 }],
    ['def_stock', 'Modernizace zásob', 35, ['def_arm'], [stock('pusky', 1500), stock('dela', 80)], { ai: 7 }],
    ['def_ind2', 'Druhá průmyslová vlna', 70, ['def_road'], [civ(2)]],
    ['def_mines', 'Těžba nerostů', 35, ['def_road'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['def_arm2', 'Domácí zbrojovky', 70, ['def_stock'], [mil(), stock('pusky', 1000)]],
    ['def_rational', 'Moderní řízení výroby', 35, ['def_ind2', 'def_arm2'], [spirit('f_racionalizace')]],
    ['def_trade', 'Obchodní smlouvy', 35, ['def_mines'], [law('trd', 'free')], { mod: { imp: -0.05 }, excl: ['def_autarky'] }],
    ['def_autarky', 'Soběstačnost', 35, ['def_mines'], [law('trd', 'closed')], { mod: { extract: 0.05 }, excl: ['def_trade'] }],
    ['def_build', 'Stavební program', 35, ['def_ind2'], [spirit('f_stavebni_program')]],
  ] },
  { prio: 1, list: [
    ['def_army', 'Posílení armády', 35, ['def_unity'], [man(0.003)], { ai: 5 }],
    ['def_def', 'Příprava obrany', 35, ['def_army'], [ws(0.08), law('con', 'ext')], { ai: 8, info: 'Zavede rozšířený odvod.' }],
    ['def_inf', 'Pěchotní výcvik', 35, ['def_army'], [boost('pusky2'), spirit('f_pechotni_drill')]],
    ['def_art', 'Dělostřelectvo', 35, ['def_inf'], [boost('dela2'), stock('dela', 60)]],
    ['def_at', 'Protitanková obrana', 35, ['def_art'], [boost('pdela2'), stock('pdela', 60)]],
    ['def_fort', 'Pohraniční opevnění', 35, ['def_def'], [spirit('f_hlubka_obrany')]],
    ['def_motor', 'Motorizace', 35, ['def_inf'], [boost('auta2'), stock('auta', 80)]],
    ['def_tank', 'Obrněné jednotky', 45, ['def_motor'], [boost('ltank2'), stock('ltanky', 20)]],
    ['def_staff', 'Vojenská akademie', 35, ['def_fort'], [spirit('f_stabni_planovani'), xp('land', 15)]],
    ['def_reserve', 'Záložníci', 35, ['def_staff'], [man(0.004)]],
  ] },
  { prio: 2, list: [
    ['def_air', 'Letecké síly', 35, ['def_arm'], [boost('sti2'), xp('air', 15)]],
    ['def_afb', 'Letiště', 35, ['def_air'], [bld('afb', 1)]],
    ['def_navy', 'Pobřežní obrana', 35, ['def_road'], [xp('sea', 15), bld('dok', 1)]],
    ['def_merchant', 'Obchodní loďstvo', 35, ['def_navy'], [spirit('f_obchodni_lodstvo')]],
  ] },
  { prio: 3, list: [
    ['def_sci', 'Vědecký program', 35, ['def_unity'], [slot()], { ai: 6, mod: { research: 0.05 }, info: 'Trvale rychlejší výzkum.' }],
    ['def_uni', 'Technická univerzita', 35, ['def_sci'], [slot(0.3)]],
    ['def_council', 'Vědecká rada', 35, ['def_uni'], [spirit('f_vedecka_rada')]],
  ] },
  { prio: 2, list: [
    ['def_unity', 'Národní jednota', 35, [], [stab(0.05), pp(30)], { ai: 3 }],
    ['def_prop', 'Národní propaganda', 35, ['def_unity'], [spirit('f_propaganda')]],
    ['def_demo', 'Demokratická cesta', 35, ['def_prop'], [party('democracy', 10), stab(0.03)], { excl: ['def_auth', 'def_left', 'def_neutral'] }],
    ['def_auth', 'Autoritářská cesta', 35, ['def_prop'], [party('fascism', 10), ws(0.04)], { excl: ['def_demo', 'def_left', 'def_neutral'] }],
    ['def_left', 'Lidová fronta', 35, ['def_prop'], [party('communism', 10), man(0.002)], { excl: ['def_demo', 'def_auth', 'def_neutral'] }],
    ['def_neutral', 'Neutralita', 35, ['def_prop'], [party('neutrality', 10), stab(0.04)], { ai: 15, excl: ['def_demo', 'def_auth', 'def_left'] }],
    ['def_jednota', 'Pevná vláda', 35, [], [spirit('f_narodni_jednota')], { any: ['def_demo', 'def_auth', 'def_left', 'def_neutral'] }],
    ['def_spy', 'Zpravodajská služba', 35, ['def_unity'], [pp(40)]],
  ] },
];
export const DEFAULT_BIG = big([...DEFAULT_B, ...XL_DEFAULT, ...ALT_DEFAULT]);   // M98: další větve; M100: politické cesty a modernizace
