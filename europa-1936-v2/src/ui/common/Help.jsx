import { useUi } from '../store.js';
import { setHelp } from '../actions.js';

const ROWS = [
  ['Posun mapy', ['tažení myší', 'šipky']],
  ['Přiblížení', ['kolečko myši', 'PageDown / PageUp']],
  ['Celá mapa', ['Home']],
  ['Označení oblasti', ['klik na provincii nebo moře']],
  ['Výběr jednotek', ['klik na žeton', 'Shift + tažení', 'dvojklik = celá armáda']],
  ['Rozkaz jednotkám (pohyb, útok)', ['pravé tlačítko myši']],
  ['Zastavit vybrané / zaměřit výběr', ['X', 'F']],
  ['Okna jako v HOI4: Vláda / Výzkum / Diplomacie / Obchod / Stavby / Výroba / Nábor / Logistika', ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I']],
  ['Armáda / Letectvo / Doktríny / Rozhodnutí / Cíle / Zprávy / Námořnictvo', ['V', 'A', 'K', 'J', 'C', 'L', 'M']],
  ['Přehled zemí', ['O']],
  ['Konzole s cheaty (help = seznam příkazů)', ['~', 'F2']],
  ['Zrušit výběr, zavřít okno', ['Esc']],
  ['Pauza', ['mezerník']],
  ['Rychlost hry', ['+', '−']],
  ['Mapový režim', ['1 – 9, 0']],
  ['Rychlé uložení / načtení', ['F6', 'F9']],
  ['Toto okno', ['F1', '?']],
];

/** Okno s přehledem ovládání. */
export function Help() {
  const open = useUi((s) => s.helpOpen);
  if (!open) return null;
  return (
    <div className="scrim" onClick={() => setHelp(false)}>
      <div className="panel dialog wide" role="dialog" aria-label="Ovládání" onClick={(e) => e.stopPropagation()}>
        <h2>Ovládání</h2>
        <dl className="keys">
          {ROWS.map(([what, keys]) => (
            <div key={what}>
              <dt>{what}</dt>
              <dd>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dd>
            </div>
          ))}
        </dl>
        <button className="btn primary" onClick={() => setHelp(false)} autoFocus>Zavřít</button>
      </div>
    </div>
  );
}
