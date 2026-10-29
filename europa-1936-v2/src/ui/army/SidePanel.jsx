import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { openPanel, closeSide } from '../actions.js';
import { DossierView } from '../hud/Dossier.jsx';
import { ArmyPanel } from './ArmyPanel.jsx';
import { RecruitPanel } from './RecruitPanel.jsx';
import { IndustryPanel } from '../industry/IndustryPanel.jsx';
import { ResearchPanel } from '../research/ResearchPanel.jsx';
import { PoliticsPanel } from '../politics/PoliticsPanel.jsx';
import { NatPanel } from '../nat/NatPanel.jsx';

const TABS = [
  { id: null, name: 'Oblast', icon: 'provinces' },
  { id: 'army', name: 'Armáda', icon: 'army', key: 'V' },
  { id: 'recruit', name: 'Nábor', icon: 'recruit', key: 'N' },
  { id: 'industry', name: 'Průmysl', icon: 'industry', key: 'I' },
  { id: 'research', name: 'Výzkum', icon: 'research', key: 'R' },
  { id: 'politics', name: 'Politika', icon: 'politics', key: 'P' },
  { id: 'nat', name: 'Cíle', icon: 'flag', key: 'C' },
];

/**
 * Pravý panel se záložkami: Oblast (údaje o označené provincii), Armáda (strom velení), Nábor (šablony a výcvik) a Průmysl (stavby, výroba, obchod).
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
              <Icon name={t.icon} size={17} /><span className="lbl">{t.name}</span>
            </button>
          );
        })}
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít panel" title="Zavřít (Esc)"><Icon name="close" size={18} /></button>
      </nav>
      {panel === 'army' ? <ArmyPanel /> : panel === 'recruit' ? <RecruitPanel /> : panel === 'industry' ? <IndustryPanel /> : panel === 'research' ? <ResearchPanel /> : panel === 'politics' ? <PoliticsPanel /> : panel === 'nat' ? <NatPanel /> : <DossierView />}
    </aside>
  );
}
