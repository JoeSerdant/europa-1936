import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { openPanel, closeSide } from '../actions.js';
import { DossierView } from '../hud/Dossier.jsx';
import { ArmyPanel } from './ArmyPanel.jsx';
import { RecruitPanel } from './RecruitPanel.jsx';

const TABS = [
  { id: null, name: 'Oblast', icon: 'provinces' },
  { id: 'army', name: 'Armáda', icon: 'army', key: 'V' },
  { id: 'recruit', name: 'Nábor', icon: 'recruit', key: 'N' },
];

/**
 * Pravý panel se záložkami: Oblast (údaje o označené provincii), Armáda (strom velení) a Nábor (šablony a výcvik).
 * Je vidět, jen když je otevřená některá záložka nebo je označená oblast.
 */
export function SidePanel() {
  const panel = useUi((s) => s.panel);
  const selected = useUi((s) => s.selected);
  if (!panel && !selected) return null;
  const tall = !!panel;
  return (
    <aside className={`panel side ${tall ? 'tall' : ''}`} aria-label="Boční panel">
      <nav className="side-tabs" role="tablist" aria-label="Záložky panelu">
        {TABS.map((t) => {
          const on = (panel || null) === t.id;
          const off = t.id === null && !selected;
          return (
            <button key={t.name} role="tab" aria-selected={on} aria-disabled={off || undefined} className={`tab ${on ? 'on' : ''} ${off ? 'off' : ''}`}
              onClick={() => { if (!off) openPanel(t.id); }} title={off ? 'Klikněte na provincii na mapě' : t.key ? `${t.name} (${t.key})` : t.name}>
              <Icon name={t.icon} size={17} />{t.name}
            </button>
          );
        })}
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít panel" title="Zavřít (Esc)"><Icon name="close" size={18} /></button>
      </nav>
      {panel === 'army' ? <ArmyPanel /> : panel === 'recruit' ? <RecruitPanel /> : <DossierView />}
    </aside>
  );
}
