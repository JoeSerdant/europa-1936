import { Fragment } from 'react';
import { useUi, useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { togglePanel, toggleIndustry, playerIdx } from '../actions.js';
import { researchOf, natOf } from '../../engine/index.js';

// Hlavní lišta nabídek (jako v HOI4 vedle vlajky): klávesy Q W E R T Y U I jdou za sebou.
const ITEMS = [
  { id: 'politics', name: 'Vláda', icon: 'politics', key: 'Q', group: 'Stát' },
  { id: 'decisions', name: 'Rozhodnutí', icon: 'gavel', key: 'J' },
  { id: 'nat', name: 'Národní cíle', icon: 'flag', key: 'C' },
  { id: 'research', name: 'Výzkum', icon: 'research', key: 'W' },
  { id: 'dip', name: 'Diplomacie', icon: 'dip', key: 'E' },
  { id: 'trade', name: 'Obchod', icon: 'trade', key: 'R', ind: 'trade', group: 'Hospodářství' },
  { id: 'build', name: 'Stavby', icon: 'build', key: 'T', ind: 'build' },
  { id: 'prod', name: 'Výroba', icon: 'industry', key: 'Y', ind: 'prod' },
  { id: 'recruit', name: 'Nábor a rozmístění', icon: 'recruit', key: 'U', group: 'Vojsko' },
  { id: 'logistics', name: 'Logistika', icon: 'supply', key: 'I' },
  { id: 'spy', name: 'Zpravodajská agentura', icon: 'eye', key: 'G' },
  { id: 'doctrine', name: 'Důstojnický sbor (doktríny)', icon: 'general', key: 'K' },
  { id: 'design', name: 'Konstrukční kancelář (návrhy tanků, lodí a letadel)', icon: 'edit', key: 'B' },
  { id: 'air', name: 'Letectvo', icon: 'air', key: 'A' },
  { id: 'army', name: 'Armáda', icon: 'army', key: 'V' },
  { id: 'navy', name: 'Námořnictvo', icon: 'navy', key: 'M' },
  { id: 'log', name: 'Zprávy', icon: 'log', key: 'L', group: 'Deník' },
];

/** Vodorovná lišta oken pod horní lištou. */
export function MenuBar() {
  const panel = useUi((s) => s.panel);
  const tab = useUi((s) => s.indTab);
  // M101: tečka „čeká na vás“ – neběží národní cíl nebo je volný výzkumný slot
  const idle = useGameSlow((s) => {
    const me = playerIdx(s);
    if (!me) return '';
    return `${natOf(s, me).cur ? '' : 'nat'}|${researchOf(s, me).free > 0 ? 'research' : ''}`;
  }, 900);
  return (
    <nav className="menubar" aria-label="Hlavní nabídka">
      {ITEMS.map((m, i) => {
        const on = m.ind ? panel === 'industry' && tab === m.ind : panel === m.id;
        const wait = idle.split('|').includes(m.id);
        return (
          <Fragment key={m.id}>
            {m.group && i > 0 && <span className="mb-sep" aria-hidden="true" />}
            <button className={`${on ? 'on' : ''} ${wait ? 'wait' : ''}`} aria-pressed={on} aria-label={m.name} data-tip={`${m.name} · ${m.key}`}
              onClick={() => (m.ind ? toggleIndustry(m.ind) : togglePanel(m.id))}>
              <Icon name={m.icon} size={20} /><kbd>{m.key}</kbd>
              {wait && <i className="mb-dot" aria-hidden="true" />}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
