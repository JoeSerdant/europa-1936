// Historická ultimáta a oportunistické války (M68). Vlastní obsah: země `tag` ve dnech hry `from`–`until` (0 = 1. 1. 1936) požaduje od `target`
// buď celou zemi (`annex`), nebo vyjmenované státy (`cede`, jména států ze světa). AI ultimátum vznese, jen když má přesilu `ratio`-násobek
// proti obráncům (s přidanými zaručiteli), takže ho cíl přijme; odmítnuté ultimátum dá útočníkovi hotové ospravedlnění války.
//  after  id předchozího požadavku téže dvojice, který musel být přijat   release  ze zbytku země se uvolní národ podle `data/dip/releases.js` (M70)
export const HIST_DEMANDS = [
  { id: 'anschluss', n: 'Sjednocení s alpským sousedem', tag: 'GER', target: 'AUS', kind: 'annex', from: 795, until: 1100, ratio: 2 },
  { id: 'sudety', n: 'Pohraniční území s německou menšinou', tag: 'GER', target: 'CZE', kind: 'cede', states: ['Sudety-západ', 'Sudety-sever', 'Sudety-východ'], from: 980, until: 1150, ratio: 1.3 },
  { id: 'cze_rump', n: 'Zbytek československého státu', tag: 'GER', target: 'CZE', kind: 'annex', after: 'sudety', from: 1160, until: 1300, ratio: 1.4, release: true },
  { id: 'memel', n: 'Přístavní území na pobřeží Baltu', tag: 'GER', target: 'LIT', kind: 'cede', states: ['Klaipėda'], from: 1170, until: 1300, ratio: 2.5 },
  { id: 'albania', n: 'Připojení Albánie', tag: 'ITA', target: 'ALB', kind: 'annex', from: 1185, until: 1400, ratio: 3 },
  { id: 'denmark', n: 'Ochrana severního souseda', tag: 'GER', target: 'DEN', kind: 'annex', from: 1555, until: 1700, ratio: 3 },
  { id: 'bessarabia', n: 'Východní hranice Rumunska', tag: 'SOV', target: 'ROM', kind: 'cede', states: ['Besarábie-sever', 'Besarábie-střed', 'Budžak'], from: 1635, until: 2100, ratio: 1.6 },
  { id: 'baltic_est', n: 'Bezpečnost severozápadní hranice', tag: 'SOV', target: 'EST', kind: 'annex', from: 1630, until: 2100, ratio: 3 },
  { id: 'baltic_lat', n: 'Bezpečnost severozápadní hranice', tag: 'SOV', target: 'LAT', kind: 'annex', from: 1630, until: 2100, ratio: 3 },
  { id: 'baltic_lit', n: 'Bezpečnost severozápadní hranice', tag: 'SOV', target: 'LIT', kind: 'annex', from: 1630, until: 2100, ratio: 3 },
];

export const DEMAND_BY_ID = Object.fromEntries(HIST_DEMANDS.map((d) => [d.id, d]));

/**
 * Oportunistické války: země `tag` ve dnech `from`–`until` napadne `target`, jehož území už z velké části drží nepřátelé (aspoň `AI.JACKAL_SHARE` bodů),
 * má-li s ním společnou hranici a převahu `ratio`. Bez ospravedlnění; zaručitelé cíle se nepřidávají.
 */
export const HIST_JACKALS = [
  { tag: 'SOV', target: 'POL', from: 1200, until: 1700, ratio: 1.5 },
  { tag: 'ITA', target: 'FRA', from: 1450, until: 1900, ratio: 1.2 },
  { tag: 'HUN', target: 'YUG', from: 1600, until: 2400, ratio: 1.2 },
  { tag: 'BUL', target: 'YUG', from: 1600, until: 2400, ratio: 1.2 },
  { tag: 'BUL', target: 'GRE', from: 1600, until: 2400, ratio: 1.2 },
  { tag: 'HUN', target: 'ROM', from: 1500, until: 2400, ratio: 1.2 },
];
