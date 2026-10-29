import { useUi } from '../store.js';
import { setHelp } from '../actions.js';

const ROWS = [
  ['Posun mapy', ['tažení myší', 'W A S D', 'šipky']],
  ['Přiblížení', ['kolečko myši', 'Q / E', 'PageDown / PageUp']],
  ['Celá mapa', ['Home']],
  ['Označení oblasti', ['klik na provincii nebo moře']],
  ['Výběr jednotek', ['klik na žeton', 'Shift + tažení', 'dvojklik = celá armáda']],
  ['Rozkaz jednotkám (pohyb, útok)', ['pravé tlačítko myši']],
  ['Zastavit vybrané / zaměřit výběr', ['X', 'F']],
  ['Panel Armáda / Nábor / Průmysl / Výzkum / Politika', ['V', 'N', 'I', 'R', 'P']],
  ['Zrušit výběr, zavřít okno', ['Esc']],
  ['Pauza', ['mezerník']],
  ['Rychlost hry', ['+', '−']],
  ['Mapový režim', ['1 – 8']],
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
