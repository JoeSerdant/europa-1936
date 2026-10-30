// Scénáře (M39): výchozí body hry. `1936` je základ; ostatní jsou úpravy základního stavu (data, žádný kód):
//  tick     počáteční čas hry (hodiny od 1. 1. 1936)       transfer  státy přecházejí na jiného vlastníka ({ to, states })
//  dead     země, které zanikly (kapitulované, bez jednotek)  growth   násobky růstu zemí: ind (továrny), mil (vojenské továrny navíc), army, air, navy
//  xp       nejmenší zkušenost jednotek podle zemí (0–1)
//  tech     do kterého roku mají země hotové technologie podle velikosti (tier)   factions, wars: bloky a války na začátku
export const SCENARIOS = {
  1936: { id: '1936', n: 'Leden 1936', info: 'Klidné předválečné roky. Čas na výstavbu průmyslu, zbrojení a diplomacii.', tick: 0 },
  1939: {
    id: '1939', n: 'Září 1939', info: 'Německo napadlo Polsko, Británie a Francie vyhlásily válku. Rakousko a Československo zanikly, země jsou vyzbrojené.',
    tick: 32184,
    dead: ['AUS', 'CZE', 'ALB'],
    transfer: [
      { to: 'GER', from: 'AUS' },
      { to: 'GER', from: 'CZE', except: ['Podkarpatská Rus'] },
      { to: 'HUN', states: ['Podkarpatská Rus'] },
      { to: 'ITA', from: 'ALB' },
    ],
    growth: {
      GER: { ind: 1.5, mil: 2.4, army: 2.4, air: 2.2, navy: 1.5 },
      ITA: { ind: 1.25, mil: 1.5, army: 1.3, air: 1.4, navy: 1.2 },
      ENG: { ind: 1.35, mil: 2.0, army: 2.5, air: 2.4, navy: 1.15 },
      FRA: { ind: 1.2, mil: 1.5, army: 1.2, air: 1.5, navy: 1.1 },
      SOV: { ind: 1.6, mil: 2.2, army: 2.0, air: 2.0, navy: 1.4 },
      POL: { ind: 1.15, mil: 1.3, army: 1.0, air: 1.0, navy: 1 },
      default: { ind: 1.1, mil: 1.2, army: 1.15, air: 1.2, navy: 1.05 },
    },
    xp: { GER: 0.5, FRA: 0.3, ENG: 0.3, SOV: 0.3, ITA: 0.25, POL: 0.2 },   // zkušenost jednotek (0–1) nejméně
    tech: { 1: 1939, 2: 1938, 3: 1937 },
    factions: [
      { nm: 'Osa Berlín–Řím', ldr: 'GER', mem: ['GER', 'ITA'] },
      { nm: 'Spojenci', ldr: 'ENG', mem: ['ENG', 'FRA', 'POL'] },
    ],
    wars: [['GER', 'POL', 'att'], ['ENG', 'GER'], ['FRA', 'GER']],   // třetí položka „att“ = útočník
    pp: 150,
  },
};
export const SCENARIO_IDS = Object.keys(SCENARIOS);
