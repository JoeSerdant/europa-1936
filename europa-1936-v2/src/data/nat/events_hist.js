// Historické události (M44): příběhové události velmocí a sousedů ve stylu doby. Vlastní texty bez skutečných osob. Tvar jako v events.js.
import { HIST_DEMANDS } from '../dip/demands.js';
const E = (id, n, text, cond, opts, extra = {}) => ({ id, n, text, cond, opts, mtth: 1, cool: 0, ...extra });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const flag = (id) => ({ t: 'flag', id });
const fac = (k, n = 1) => ({ t: 'factory', k, n });

const ULT_TEXT = {
  annex: 'Mocný soused předložil ultimátum: vaše země se má vzdát samostatnosti a připojit se k němu. Jeho armády stojí u hranic a jeho vláda je rozhodnutá. Odmítnutí znamená válku.',
  cede: 'Mocný soused předložil ultimátum: požaduje odstoupení pohraničního území. Jeho armády stojí u hranic a jeho vláda je rozhodnutá. Odmítnutí znamená válku.',
};

export const HIST_EVENTS = [
  // ---- Německo ----
  E('ger_olympics', 'Velké sportovní slavnosti', 'Hlavní město hostí mezinárodní sportovní hry. Zahraniční návštěvníci i novináři chtějí vidět pečlivě připravenou podívanou.', { tags: ['GER'], from: 180, until: 260, noFlag: 'ger_olympics' }, [
    { n: 'Ukázat pořádek a sílu.', fx: [stab(0.04), pp(35), flag('ger_olympics')], ai: 2 },
    { n: 'Držet se zpátky.', fx: [pp(15), flag('ger_olympics')], ai: 1 },
  ], { mtth: 10 }),
  E('ger_fourplan', 'Plán soběstačnosti', 'Úředníci navrhují čtyřletý plán: umělé suroviny, rozšíření zbrojovek a omezení dovozu.', { tags: ['GER'], from: 150, until: 700, noFlag: 'ger_fourplan' }, [
    { n: 'Schválit plán.', fx: [fac('mil'), pp(-40), ws(0.03), flag('ger_fourplan')], ai: 2 },
    { n: 'Nechat průmysl, ať se rozhodne sám.', fx: [fac('civ'), flag('ger_fourplan')], ai: 1 },
  ], { mtth: 30 }),
  E('ger_union', 'Sjednocení s alpským sousedem', 'V sousední alpské zemi sílí hlasy po sjednocení. Vláda může zasáhnout, nebo počkat na vývoj.', { tags: ['GER'], from: 760, until: 1150, noFlag: 'ger_union' }, [
    { n: 'Podpořit sjednocení.', fx: [ws(0.06), stab(0.03), pp(40), flag('ger_union')], ai: 2 },
    { n: 'Vyčkat.', fx: [pp(20), flag('ger_union')], ai: 1 },
  ], { mtth: 25 }),
  E('ger_border_claims', 'Spor o pohraniční území', 'Německá menšina v pohraničí žádá autonomii a sousední vláda váhá. Zahraničí sleduje každý krok.', { tags: ['GER'], from: 950, until: 1330, noFlag: 'ger_border_claims' }, [
    { n: 'Vyvinout nátlak.', fx: [ws(0.07), pp(-30), flag('ger_border_claims')], ai: 2 },
    { n: 'Žádat jednání.', fx: [pp(30), stab(0.02), flag('ger_border_claims')], ai: 1 },
  ], { mtth: 20 }),
  // ---- Británie ----
  E('eng_rearm_debate', 'Spor o zbrojení', 'Parlament se přou, zda zvýšit výdaje na zbrojení, nebo šetřit na sociální programy.', { tags: ['ENG'], from: 400, until: 1100, noFlag: 'eng_rearm_debate' }, [
    { n: 'Zbrojit.', fx: [fac('mil'), pp(-35), stab(-0.02), flag('eng_rearm_debate')], ai: 2 },
    { n: 'Šetřit.', fx: [stab(0.04), pp(30), flag('eng_rearm_debate')], ai: 1 },
  ], { mtth: 30 }),
  E('eng_empire_trade', 'Říšské obchodní dohody', 'Dominia nabízejí výhodnější dodávky surovin za podporu v obraně.', { tags: ['ENG'], from: 200, until: 1000, noFlag: 'eng_empire_trade' }, [
    { n: 'Uzavřít dohody.', fx: [pp(40), fac('civ'), flag('eng_empire_trade')], ai: 2 },
    { n: 'Odmítnout.', fx: [stab(0.02), flag('eng_empire_trade')], ai: 0 },
  ], { mtth: 40 }),
  // ---- Francie ----
  E('fra_popular_front', 'Vlna sociálních reforem', 'Levicová koalice prosazuje čtyřicetihodinový týden a placené dovolené. Podnikatelé protestují.', { tags: ['FRA'], from: 120, until: 500, noFlag: 'fra_popular_front' }, [
    { n: 'Schválit reformy.', fx: [stab(0.06), pp(-30), flag('fra_popular_front')], ai: 2 },
    { n: 'Zmírnit je.', fx: [stab(0.02), fac('civ'), flag('fra_popular_front')], ai: 1 },
  ], { mtth: 15 }),
  E('fra_maginot', 'Dokončení obranné linie', 'Inženýři hlásí, že pohraniční opevnění je téměř hotové. Generálové žádají další peníze na výzbroj.', { tags: ['FRA'], from: 100, until: 900, noFlag: 'fra_maginot' }, [
    { n: 'Dofinancovat.', fx: [{ t: 'infra', n: 1 }, pp(-40), ws(0.03), flag('fra_maginot')], ai: 2 },
    { n: 'Přesunout peníze do tankových sil.', fx: [{ t: 'stock', eq: 'ltanky', n: 60 }, pp(-30), flag('fra_maginot')], ai: 1 },
  ], { mtth: 35 }),
  // ---- Itálie ----
  E('ita_empire_proclaimed', 'Vyhlášení říše v zámoří', 'Po vítězné kampani v africké zemi vláda slavnostně vyhlašuje novou říši.', { tags: ['ITA'], from: 120, until: 420, noFlag: 'ita_empire_proclaimed' }, [
    { n: 'Oslavit.', fx: [ws(0.08), stab(0.04), pp(40), flag('ita_empire_proclaimed')], ai: 2 },
  ], { mtth: 15 }),
  E('ita_axis', 'Dohoda o spolupráci', 'Spojení s Německem je na stole. Rozhodnutí ovlivní vztahy v celé Evropě.', { tags: ['ITA'], from: 220, until: 700, noFlag: 'ita_axis' }, [
    { n: 'Přijmout.', fx: [ws(0.05), pp(-20), flag('ita_axis')], ai: 2 },
    { n: 'Zůstat nezávislí.', fx: [stab(0.03), pp(30), flag('ita_axis')], ai: 1 },
  ], { mtth: 30 }),
  // ---- Sovětský svaz ----
  E('sov_collective', 'Hospodářské úspěchy a nedostatky', 'Úřady hlásí rekordní výrobu oceli, ale na venkově chybí zboží.', { tags: ['SOV'], from: 60, until: 800, noFlag: 'sov_collective' }, [
    { n: 'Podpořit těžký průmysl.', fx: [fac('mil'), stab(-0.03), flag('sov_collective')], ai: 2 },
    { n: 'Povolit zásobování měst.', fx: [stab(0.04), pp(25), flag('sov_collective')], ai: 1 },
  ], { mtth: 25 }),
  E('sov_officers', 'Reorganizace velení', 'Politické vedení chce přezkoumat spolehlivost důstojníků. Armáda je znepokojena.', { tags: ['SOV'], from: 250, until: 900, noFlag: 'sov_officers' }, [
    { n: 'Prověřit velení.', fx: [stab(0.03), ws(-0.03), pp(30), flag('sov_officers')], ai: 1 },
    { n: 'Nechat, jak to je.', fx: [pp(10), flag('sov_officers')], ai: 2 },
  ], { mtth: 30 }),
  // ---- Polsko, Československo, Španělsko, malé země ----
  E('pol_central_district', 'Středopolský průmyslový obvod', 'Vláda plánuje velký průmyslový obvod daleko od hranic.', { tags: ['POL'], from: 150, until: 900, noFlag: 'pol_central_district' }, [
    { n: 'Stavět.', fx: [fac('mil'), pp(-40), flag('pol_central_district')], ai: 2 },
    { n: 'Odložit.', fx: [pp(30), flag('pol_central_district')], ai: 1 },
  ], { mtth: 30 }),
  E('cze_skoda', 'Zbrojovky jako vývozní tahák', 'Domácí zbrojovky nabízejí zahraniční odběratelé velké zakázky.', { tags: ['CZE'], from: 60, until: 900, noFlag: 'cze_skoda' }, [
    { n: 'Přijmout zakázky.', fx: [pp(45), fac('mil'), flag('cze_skoda')], ai: 2 },
    { n: 'Zbraně nechat pro armádu.', fx: [{ t: 'stock', eq: 'ltanky', n: 50 }, flag('cze_skoda')], ai: 1 },
  ], { mtth: 25 }),
  E('spr_civil_war', 'Rozdělená země', 'Armáda i politici se rozdělují na dva tábory. Velení žádá rozhodnutí.', { tags: ['SPR'], from: 150, until: 700, flag: 'spr_tension', noFlag: 'spr_civil_war' }, [
    { n: 'Potlačit vzpouru.', fx: [stab(-0.1), ws(0.06), { t: 'man', v: 0.002 }, flag('spr_civil_war')], ai: 2 },
    { n: 'Hledat dohodu.', fx: [stab(-0.06), pp(30), flag('spr_civil_war')], ai: 1 },
  ], { mtth: 20 }),
  E('swe_ore', 'Poptávka po železné rudě', 'Zahraniční odběratelé nabízejí vysoké ceny za rudu. Vláda váží neutralitu a zisky.', { tags: ['SWE'], from: 300, until: 1500, noFlag: 'swe_ore' }, [
    { n: 'Prodávat všem.', fx: [pp(50), fac('civ'), flag('swe_ore')], ai: 2 },
    { n: 'Omezit vývoz.', fx: [stab(0.03), flag('swe_ore')], ai: 1 },
  ], { mtth: 35 }),
  E('tur_modernize', 'Modernizace armády', 'Vláda hledá dodavatele zbraní a poradce pro armádu.', { tags: ['TUR'], from: 100, until: 900, noFlag: 'tur_modernize' }, [
    { n: 'Zakoupit zbraně.', fx: [{ t: 'stock', eq: 'pusky', n: 900 }, pp(-35), flag('tur_modernize')], ai: 2 },
    { n: 'Postavit vlastní zbrojovku.', fx: [fac('mil'), pp(-30), flag('tur_modernize')], ai: 1 },
  ], { mtth: 30 }),
  // ---- obecné doby ----
  E('refugees', 'Uprchlíci', 'Válka a nepokoje v sousedství přivádějí tisíce uprchlíků na hranice.', { war: false, stabAbove: 0.4 }, [
    { n: 'Přijmout je.', fx: [{ t: 'man', v: 0.0006 }, stab(-0.02), pp(-15)], ai: 1 },
    { n: 'Uzavřít hranice.', fx: [stab(0.01), pp(10)], ai: 2 },
  ], { mtth: 500, cool: 600 }),
  E('arms_fair', 'Veletrh zbraní', 'Zbrojovky vystavují nové vzory a zveme zahraniční delegace.', { war: false }, [
    { n: 'Pozvat delegace.', fx: [pp(30), { t: 'boostslot', v: 0.1 }], ai: 2 },
    { n: 'Nechat si technologii pro sebe.', fx: [pp(10)], ai: 1 },
  ], { mtth: 450, cool: 500 }),
  E('cold_winter', 'Krutá zima', 'Mrazy a sněhové bouře sužují zemi. Zásoby paliva rychle klesají.', { stabBelow: 0.75 }, [
    { n: 'Rozdělit rezervy.', fx: [stab(0.03), pp(-25)], ai: 1 },
    { n: 'Šetřit pro armádu.', fx: [stab(-0.03), { t: 'stock', eq: 'auta', n: 40 }], ai: 2 },
  ], { mtth: 420, cool: 600 }),
  E('war_heroes', 'Hrdinové fronty', 'Zpravodajové oslavují odvahu vojáků a jejich velitelů.', { war: true, wsBelow: 0.85 }, [
    { n: 'Udělit vyznamenání.', fx: [ws(0.04), stab(0.02), pp(-10)], ai: 2 },
  ], { mtth: 160, cool: 220 }),
  E('war_bond', 'Válečné půjčky', 'Obyvatelé jsou vyzváni k nákupu válečných dluhopisů.', { war: true }, [
    { n: 'Zahájit sbírku.', fx: [pp(45), { t: 'factory', k: 'mil', n: 1 }, stab(-0.02)], ai: 2 },
    { n: 'Vyhnout se dalšímu zatížení.', fx: [stab(0.02)], ai: 1 },
  ], { mtth: 220, cool: 300 }),

  // ---- ultimáta (M68): událost vznikne jen naplánováním z `dip/demand.js`, když požadavek směřuje na hráče ----
  ...HIST_DEMANDS.map((d) => E(`ult_${d.id}`, `Ultimátum: ${d.n}`, ULT_TEXT[d.kind], { from: 999999 }, [
    { n: d.kind === 'annex' ? 'Přijmout a odevzdat zemi.' : 'Přijmout požadavek a odevzdat území.', fx: [{ t: 'ult', id: d.id, ok: 1 }], ai: 1 },
    { n: 'Odmítnout; hrozí válka.', fx: [{ t: 'ult', id: d.id, ok: 0 }], ai: 0 },
  ], { cool: 99999 })),
];

