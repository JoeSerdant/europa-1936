// Válečné cíle (M56): co chce útočník od války. Určují cenu a dobu ospravedlnění a možnosti mírové konference po kapitulaci protivníka.
//  pp, days  cena a doba ospravedlnění   opts  povolené volby konference (conquest: loutka/anexe; border: převzetí států; tribute: reparace)
export const WARGOALS = {
  conquest: { n: 'Podmanění', pp: 25, days: 30, opts: ['puppet', 'annex', 'skip'], info: 'Po vítězství můžete protivníka udělat loutkou, nebo anektovat.' },
  border: { n: 'Územní nároky', pp: 12, days: 15, opts: ['take', 'skip'], take: 3, info: 'Levnější a rychlejší: po vítězství převezmete až 3 nejcennější zbylé státy, protivník zůstane samostatný.' },
  tribute: { n: 'Ponížení', pp: 6, days: 8, opts: ['tribute', 'skip'], pp_gain: 60, info: 'Nejlevnější: protivník je poražen, zaplatí vám politickou moc a ztratí podporu války.' },
};
export const WARGOAL_IDS = Object.keys(WARGOALS);
