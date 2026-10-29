// Události (M22). Vlastní texty; bez skutečných osob. Podmínky a účinky viz SPEC § 4e.
//  cond  tags, from/until (den hry), flag, noFlag, focus, war, stabBelow/Above, wsBelow/Above, law { obor: id }   mtth  střední doba do spuštění (dny)   cool  odstup opakování (dny), jinak jednorázová
//  opts  [{ n, fx, ai }]  ai = váha volby pro země bez hráče
import { HIST_EVENTS } from './events_hist.js';
const E = (id, n, text, cond, opts, extra = {}) => ({ id, n, text, cond, opts, mtth: 1, cool: 0, ...extra });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });

const BASE_EVENTS = [
  // ---- obecné ----
  E('harvest', 'Dobrá úroda', 'Příznivé počasí přineslo bohatou sklizeň. Ceny potravin klesají a lidé jsou spokojenější.', {}, [{ n: 'Výborně.', fx: [stab(0.03), pp(20)], ai: 1 }], { mtth: 600, cool: 700 }),
  E('strike', 'Stávka v průmyslu', 'Dělníci v továrnách požadují vyšší mzdy a kratší pracovní dobu.', { stabBelow: 0.62, war: false }, [
    { n: 'Vyjednávat.', fx: [pp(-30), stab(0.04)], ai: 2 },
    { n: 'Zasáhnout silou.', fx: [stab(-0.05), pp(20)], ai: 1 },
  ], { mtth: 260, cool: 365 }),
  E('breakthrough', 'Průlom ve výzkumu', 'Skupina inženýrů přišla s nápadem, který by mohl urychlit práci laboratoří.', {}, [
    { n: 'Podpořit právě běžící výzkum.', fx: [{ t: 'boostslot', v: 0.25 }], ai: 2 },
    { n: 'Vyplatit prémie a posílit prestiž.', fx: [pp(40)], ai: 1 },
  ], { mtth: 320, cool: 400 }),
  E('boom', 'Hospodářský růst', 'Zakázky přibývají a podnikatelé chtějí investovat do dalších závodů.', { stabAbove: 0.55, war: false }, [
    { n: 'Podpořit stavbu továrny.', fx: [{ t: 'factory', k: 'civ', n: 1 }], ai: 2 },
    { n: 'Vybrat daně navíc.', fx: [pp(50)], ai: 1 },
  ], { mtth: 520, cool: 600 }),
  E('shortage', 'Nedostatek surovin', 'Sklady surovin se plní pomaleji, než se čekalo.', { war: false, noFlag: 'shortage_seen' }, [
    { n: 'Zavést šetření.', fx: [stab(-0.02), pp(25), { t: 'flag', id: 'shortage_seen' }], ai: 1 },
    { n: 'Dovézt za každou cenu.', fx: [pp(-25), { t: 'flag', id: 'shortage_seen' }], ai: 2 },
  ], { mtth: 400 }),
  E('draft_unrest', 'Odpor proti odvodům', 'Branná povinnost je nepopulární. Poslanci žádají ústupky.', { law: { con: 'serv' }, stabBelow: 0.55 }, [
    { n: 'Ustoupit: omezený odvod.', fx: [{ t: 'law', cat: 'con', id: 'lim' }, stab(0.05)], ai: 1 },
    { n: 'Vydržet.', fx: [stab(-0.03), ws(0.03)], ai: 2 },
  ], { mtth: 90, cool: 400 }),
  E('war_fever', 'Válečné nadšení', 'Zprávy z fronty rozproudily veřejnost; dobrovolníků přibývá.', { war: true, wsBelow: 0.7 }, [
    { n: 'Využít nálady.', fx: [ws(0.05), { t: 'man', v: 0.001 }], ai: 1 },
  ], { mtth: 120, cool: 200 }),
  E('war_weary', 'Válečná únava', 'Dlouhá válka vyčerpává obyvatele a v ulicích sílí hlasy po míru.', { war: true, stabBelow: 0.5 }, [
    { n: 'Posílit propagandu.', fx: [pp(-40), ws(0.05)], ai: 2 },
    { n: 'Slíbit reformy.', fx: [stab(0.05), pp(-20)], ai: 1 },
  ], { mtth: 110, cool: 250 }),
  E('volunteers', 'Dar vlastenců', 'Obyvatelé sbírají prostředky a vybavení pro armádu.', { war: true }, [
    { n: 'Přijmout dar.', fx: [{ t: 'stock', eq: 'pusky', n: 800 }, { t: 'stock', eq: 'auta', n: 60 }], ai: 1 },
  ], { mtth: 150, cool: 300 }),
  E('accident', 'Průmyslová nehoda', 'Výbuch v závodě zpozdil dodávky a vyvolal otázky o bezpečnosti práce.', { war: false }, [
    { n: 'Zavést kontroly.', fx: [pp(-20), stab(0.02)], ai: 1 },
    { n: 'Zamést pod koberec.', fx: [stab(-0.02)], ai: 0 },
  ], { mtth: 700, cool: 700 }),
  // ---- národní ----
  E('ger_rhine', 'Vojska v demilitarizovaném pásmu', 'Vláda zvažuje poslat vojsko do pásma, kde to mírové smlouvy zakazují. Reakce sousedů jsou nejisté.', { tags: ['GER'], from: 60, until: 400, noFlag: 'rhine' }, [
    { n: 'Vstoupit.', fx: [ws(0.08), stab(0.04), pp(50), { t: 'flag', id: 'rhine' }], ai: 2 },
    { n: 'Vyčkat.', fx: [pp(30), { t: 'flag', id: 'rhine' }], ai: 1 },
  ], { mtth: 8 }),
  E('spr_tension', 'Rostoucí napětí', 'Politické tábory se radikalizují a ulice se plní demonstracemi.', { tags: ['SPR'], from: 150, noFlag: 'spr_tension' }, [
    { n: 'Zavést výjimečný stav.', fx: [stab(-0.08), ws(0.06), { t: 'flag', id: 'spr_tension' }], ai: 1 },
    { n: 'Vyjednávat.', fx: [stab(-0.12), pp(40), { t: 'flag', id: 'spr_tension' }], ai: 2 },
  ], { mtth: 25 }),
  E('fra_cabinet', 'Vládní krize', 'Vládní koalice se rozpadá a hlasování o důvěře je v nedohlednu.', { tags: ['FRA'], stabBelow: 0.52 }, [
    { n: 'Vytvořit nový kabinet.', fx: [pp(-40), stab(0.06)], ai: 1 },
    { n: 'Rozpustit parlament.', fx: [stab(0.02), pp(-20)], ai: 2 },
  ], { mtth: 100, cool: 365 }),
  E('eng_crown', 'Krize na trůnu', 'Otázka následnictví otřásá důvěrou v instituce.', { tags: ['ENG'], from: 300, until: 380, noFlag: 'eng_crown' }, [
    { n: 'Hledat kompromis.', fx: [stab(-0.03), pp(40), { t: 'flag', id: 'eng_crown' }], ai: 1 },
  ], { mtth: 10 }),
  E('ita_prestige', 'Zahraniční úspěchy', 'Kampaně v zámoří zvedají vlnu hrdosti doma.', { tags: ['ITA'], from: 90, until: 330, noFlag: 'ita_prestige' }, [
    { n: 'Využít nálady.', fx: [ws(0.06), stab(0.02), { t: 'flag', id: 'ita_prestige' }], ai: 1 },
  ], { mtth: 14 }),
  E('sov_plan_fx', 'Plnění plánu', 'Úřady hlásí, že pětiletka postupuje rychleji, než se očekávalo.', { tags: ['SOV'], from: 40, noFlag: 'sov_plan_fx' }, [
    { n: 'Rozšířit výrobu.', fx: [{ t: 'factory', k: 'mil', n: 1 }, { t: 'flag', id: 'sov_plan_fx' }], ai: 2 },
    { n: 'Rozšířit stavby.', fx: [{ t: 'factory', k: 'civ', n: 1 }, { t: 'flag', id: 'sov_plan_fx' }], ai: 1 },
  ], { mtth: 20 }),
  E('cze_fort_fx', 'Obrana hranic', 'Generální štáb žádá další prostředky na pohraniční opevnění.', { tags: ['CZE'], from: 20, noFlag: 'cze_fort_fx' }, [
    { n: 'Schválit.', fx: [{ t: 'infra', n: 1 }, pp(-30), ws(0.04), { t: 'flag', id: 'cze_fort_fx' }], ai: 2 },
    { n: 'Odložit.', fx: [pp(20), { t: 'flag', id: 'cze_fort_fx' }], ai: 1 },
  ], { mtth: 30 }),
  E('pol_reform', 'Vojenská reforma', 'Velení předkládá plán modernizace armády.', { tags: ['POL'], from: 30, noFlag: 'pol_reform' }, [
    { n: 'Podpořit.', fx: [{ t: 'man', v: 0.002 }, pp(-30), { t: 'flag', id: 'pol_reform' }], ai: 2 },
    { n: 'Odmítnout.', fx: [pp(30), { t: 'flag', id: 'pol_reform' }], ai: 1 },
  ], { mtth: 30 }),
];
export const EVENTS = [...BASE_EVENTS, ...HIST_EVENTS];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
