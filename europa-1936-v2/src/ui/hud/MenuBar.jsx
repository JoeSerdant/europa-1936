import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { togglePanel, toggleIndustry } from '../actions.js';

// Hlavní lišta nabídek (jako v HOI4 vedle vlajky): klávesy Q W E R T Y U I jdou za sebou.
const ITEMS = [
  { id: 'politics', name: 'Vláda', icon: 'politics', key: 'Q' },
  { id: 'decisions', name: 'Rozhodnutí', icon: 'gavel', key: 'J' },
  { id: 'nat', name: 'Národní cíle', icon: 'flag', key: 'C' },
  { id: 'research', name: 'Výzkum', icon: 'research', key: 'W' },
  { id: 'dip', name: 'Diplomacie', icon: 'dip', key: 'E' },
  { id: 'trade', name: 'Obchod', icon: 'trade', key: 'R', ind: 'trade' },
  { id: 'build', name: 'Stavby', icon: 'build', key: 'T', ind: 'build' },
  { id: 'prod', name: 'Výroba', icon: 'industry', key: 'Y', ind: 'prod' },
  { id: 'recruit', name: 'Nábor a rozmístění', icon: 'recruit', key: 'U' },
  { id: 'logistics', name: 'Logistika', icon: 'supply', key: 'I' },
  { id: 'spy', name: 'Zpravodajská agentura', icon: 'eye', key: 'G' },
  { id: 'doctrine', name: 'Důstojnický sbor (doktríny)', icon: 'general', key: 'K' },
  { id: 'air', name: 'Letectvo', icon: 'air', key: 'A' },
  { id: 'army', name: 'Armáda', icon: 'army', key: 'V' },
  { id: 'navy', name: 'Námořnictvo', icon: 'navy', key: 'M' },
  { id: 'log', name: 'Zprávy', icon: 'log', key: 'L' },
];

/** Vodorovná lišta oken pod horní lištou. */
export function MenuBar() {
  const panel = useUi((s) => s.panel);
  const tab = useUi((s) => s.indTab);
  return (
    <nav className="menubar" aria-label="Hlavní nabídka">
      {ITEMS.map((m) => {
        const on = m.ind ? panel === 'industry' && tab === m.ind : panel === m.id;
        return (
          <button key={m.id} className={on ? 'on' : ''} aria-pressed={on} aria-label={m.name} title={`${m.name} (${m.key})`}
            onClick={() => (m.ind ? toggleIndustry(m.ind) : togglePanel(m.id))}>
            <Icon name={m.icon} size={20} /><kbd>{m.key}</kbd>
          </button>
        );
      })}
    </nav>
  );
}
