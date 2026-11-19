// Obtížnost (F3, jako v HOI4 pět stupňů): úpravy AI zemí proti běžné hře. Hráčovu zemi upravuje pravidlo „Vaše země“ (`RULES.bonus`).
//  prod  výroba a stavby (podíl)   res  rychlost výzkumu   divs  cílový počet divizí   man  lidská síla
//  army  vojenské bonusy všech divizí AI (klíče z `MOD_KEYS`)
// Stupně −1 a +1 odpovídají dřívější lehké a těžké obtížnosti (`aiLevel` 1 a 3).
export const DIFFICULTY = {
  '-2': { n: 'Nováček', info: 'AI země mají o 20 % slabší výrobu, stavby i výzkum, o 20 % méně divizí a jejich vojska bojují o 10 % hůř.', prod: -0.2, res: -0.2, divs: -0.2, man: 0, army: { atk: -0.1, def: -0.1 } },
  '-1': { n: 'Snadná', info: 'AI země mají o 10 % slabší výrobu, stavby i výzkum a o 10 % méně divizí.', prod: -0.1, res: -0.1, divs: -0.1, man: 0, army: null },
  '0': { n: 'Běžná', info: 'AI země bez úprav.', prod: 0, res: 0, divs: 0, man: 0, army: null },
  '1': { n: 'Těžká', info: 'AI země mají o 10 % silnější výrobu, stavby i výzkum a o 15 % více divizí.', prod: 0.1, res: 0.1, divs: 0.15, man: 0, army: null },
  '2': { n: 'Elitní', info: 'AI země mají o 25 % silnější výrobu a stavby, o 20 % rychlejší výzkum, o 30 % více divizí i o 15 % více lidské síly a jejich vojska bojují o 10 % lépe.', prod: 0.25, res: 0.2, divs: 0.3, man: 0.15, army: { atk: 0.1, def: 0.1 } },
};
export const DIFF_IDS = [-2, -1, 0, 1, 2];
