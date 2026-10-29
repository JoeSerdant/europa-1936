// Průvodce hrou (M40): kroky s podmínkou splnění odvozenou ze stavu hry a rozhraní. Čistá data a funkce (bez Reactu), aby šly testovat.
// `done(game, ui, me)` vrací true, když hráč krok splnil; průvodce si splněné kroky pamatuje.
export const STEPS = [
  { id: 'time', text: 'Spusťte čas mezerníkem nebo tlačítkem v horní liště. Rychlost měníte klávesami + a −.', done: (g) => !g.paused || g.tick > 0 },
  { id: 'select', text: 'Klikněte na provincii na mapě: vpravo se ukážou údaje o oblasti. Mapu posouváte tažením nebo šipkami, přibližujete kolečkem.', done: (g, u) => u.selected > 0 },
  { id: 'build', text: 'Otevřete Stavby (T), vyberte svůj stát a zadejte stavbu továrny: civilní továrny staví, vojenské vyrábějí.', done: (g, u, me) => g.ind.build.some((b) => b.o === me) },
  { id: 'prod', text: 'Ve Výrobě (Y) přidělte volné vojenské továrny linkám: bez výzbroje nejde nabírat divize.', done: (g, u) => u.indTab === 'prod' && u.panel === 'industry' },
  { id: 'research', text: 'Ve Výzkumu (W) zahajte technologii. Každý slot zkoumá jednu.', done: (g, u, me) => g.tech.own[me].slots.some(Boolean) },
  { id: 'focus', text: 'V Národních cílech (C) zahajte cíl: dává trvalé bonusy a události.', done: (g, u, me) => !!g.nat.own[me].cur || Object.keys(g.nat.own[me].done).length > 0 },
  { id: 'recruit', text: 'V Náboru (U) zařaďte divize do výcviku. Nová divize se objeví v hlavním městě.', done: (g, u, me) => g.mil.queue.some((q) => q.o === me) },
  { id: 'army', text: 'Klikněte na žeton své divize na mapě a pravým tlačítkem na provincii ji pošlete na pochod. Shift + tažení vybere víc žetonů.', done: (g, u) => u.selDivs.length > 0 },
  { id: 'dip', text: 'V Diplomacii (E) vidíte vztahy a bloky. Válku nejdřív ospravedlníte (stojí politickou moc a čas), pak ji vyhlásíte.', done: (g, u) => u.panel === 'dip' },
  { id: 'doc', text: 'Armáda, letectvo i námořnictvo sbírají zkušenosti za doktríny (K). Rozhodnutí (J) jsou jednorázové akce za politickou moc.', done: (g, u) => u.panel === 'doctrine' || u.panel === 'decisions' },
];

/** Index prvního nesplněného kroku (po latch množině `latched`); STEPS.length = hotovo. */
export function currentStep(game, ui, me, latched = new Set()) {
  for (let i = 0; i < STEPS.length; i++) {
    if (latched.has(STEPS[i].id)) continue;
    if (STEPS[i].done(game, ui, me)) { latched.add(STEPS[i].id); continue; }
    return i;
  }
  return STEPS.length;
}
