// S7: okupační zákony (vlastní názvy a čísla). Okupant volí zákon pro každou okupovanou zemi zvlášť (`occ.law['okupant-vlastník']`).
//  r    násobek cílového odboje            c    násobek růstu poddajnosti
//  res  příplatek k podílu těžby okupantovi (k podílu podle poddajnosti)
//  pol  posádky: síla posádkových jednotek jako podíl potřebné garnizony (tlumí odboj bez divizí)
//  mp   cena posádek v lidské síle (násobek `OCC.MP_LOSS`; ztráty rostou s odbojem)
export const OCC_LAWS = {
  vojenska: { n: 'Vojenská správa', info: 'Pořádek drží jen divize, které ve státě stojí. Bez zvláštních posádek a bez zvláštní těžby.', r: 1, c: 1, res: 0, pol: 0, mp: 0 },
  civilni: { n: 'Civilní správa', info: 'Místní úřady pracují dál pod dohledem; menší posádky, lidé se rychleji smíří.', r: 0.85, c: 1.2, res: -0.05, pol: 0.25, mp: 0.8 },
  mirna: { n: 'Mírná správa', info: 'Okupant šetří obyvatelstvo: nejnižší odboj a nejrychlejší poddajnost, ale málo surovin.', r: 0.65, c: 1.45, res: -0.12, pol: 0.15, mp: 0.4 },
  tvrda: { n: 'Tvrdá okupace', info: 'Rekvizice a represe: nejvíc surovin, ale odboj sílí a posádky platí krví.', r: 1.35, c: 0.55, res: 0.25, pol: 0.5, mp: 2 },
};
export const OCC_LAW_IDS = Object.keys(OCC_LAWS);
export const OCC_LAW_DEFAULT = 'vojenska';

/** Historické okupační zákony AI: okupant → { okupovaná země → zákon, default }. Ostatní země podle ideologie (`OCC_LAW_IDEO`). */
export const HIST_OCC_LAW = {
  GER: { SOV: 'tvrda', POL: 'tvrda', YUG: 'tvrda', GRE: 'tvrda', default: 'vojenska' },
  JAP: { CHI: 'tvrda', PRC: 'tvrda', default: 'vojenska' },
};
export const OCC_LAW_IDEO = { fascism: 'vojenska', communism: 'vojenska', democracy: 'civilni', neutrality: 'civilni' };
