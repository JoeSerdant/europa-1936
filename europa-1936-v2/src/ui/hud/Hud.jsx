import { useEffect } from 'react';
import { useGame, useUi } from '../store.js';
import { TopBar } from './TopBar.jsx';
import { MapModes, Legend } from './MapModes.jsx';
import { GameMenu } from './GameMenu.jsx';
import { NotifyDialog } from './NotifyDialog.jsx';
import { SidePanel, FULL, DOCKED } from '../army/SidePanel.jsx';
import { SelectionBar } from '../army/SelectionBar.jsx';
import { ArmyBar } from '../army/ArmyBar.jsx';
import { PlanBar } from '../army/PlanBar.jsx';
import { TemplateDesigner } from '../army/TemplateDesigner.jsx';
import { EventDialog } from '../nat/EventDialog.jsx';
import { BattleDialog } from './BattleDialog.jsx';
import { Popups } from './Popups.jsx';
import { Banner } from './Banner.jsx';
import { NewsDialog } from './NewsDialog.jsx';
import { Tutorial, useTutorialOn } from '../tutorial/Tutorial.jsx';
import { EndDialog } from './EndDialog.jsx';
import { ConferenceDialog } from '../nat/ConferenceDialog.jsx';
import { OverviewDialog } from '../log/OverviewDialog.jsx';
import { AchievementsDialog } from '../achievements/AchievementsDialog.jsx';
import { IndustryPanel } from '../industry/IndustryPanel.jsx';
import { BuildPanel } from '../industry/BuildPanel.jsx';
import { RecruitPanel } from '../army/RecruitPanel.jsx';
import { ResearchPanel } from '../research/ResearchPanel.jsx';
import { PoliticsPanel } from '../politics/PoliticsPanel.jsx';
import { NatPanel } from '../nat/NatPanel.jsx';
import { DiplomacyPanel } from '../dip/DiplomacyPanel.jsx';
import { LogisticsPanel } from '../logistics/LogisticsPanel.jsx';
import { SpyPanel } from '../spy/SpyPanel.jsx';
import { DecisionsPanel } from '../decisions/DecisionsPanel.jsx';
import { DoctrinePanel } from '../doctrine/DoctrinePanel.jsx';
import { DesignPanel } from '../design/DesignPanel.jsx';
import { AirPanel } from '../air/AirPanel.jsx';
import { MenuBar } from './MenuBar.jsx';
import { Alerts } from './Alerts.jsx';
import { Console } from './Console.jsx';
import { Toast } from '../common/Toast.jsx';
import { Minimap } from '../map/Minimap.jsx';
import { mapController as mc } from '../map/controller.js';
import { INSETS } from '../actions.js';

/** Rozhraní během hry: horní lišta, režimy, vysvětlivky, minimapa, boční panel, lišty výběru a plánu, nabídka. */
export function Hud() {
  const fresh = useGame((s) => s.paused && s.tick === 0);
  const side = useUi((s) => !!((s.panel && !FULL.includes(s.panel)) || s.selected));
  const panel = useUi((s) => s.panel);
  const buildTab = useUi((s) => (s.panel === 'industry' && s.indTab === 'build') || DOCKED.includes(s.panel));   // M103/M105: panel vlevo nad mapou – minimapa a mapové režimy se schovají
  useEffect(() => { mc.setInsets(INSETS.game); }, []);
  const right = side ? 394 : 14;               // střední lišty se středí mezi levým sloupcem a pravým panelem
  const tutOn = useTutorialOn();
  // F2 B5: průvodce a nápověda „Čas stojí“ jsou v levém sloupci (nad minimapou), s otevřeným panelem vlevo vedle něj – nikdy nad lištou armád;
  // nápověda se ukáže jen s vypnutým průvodcem (jeho první krok říká totéž)
  const tips = (
    <>
      {fresh && !tutOn && <div className="panel hint" role="status">Čas stojí. Spusťte ho <kbd>mezerníkem</kbd> nebo tlačítkem v horní liště.</div>}
      <Tutorial />
    </>
  );
  return (
    <>
      <TopBar />
      {!buildTab && <MapModes />}
      {!buildTab && (
        <div className="bottom-left">
          {tips}
          <Legend />
          <div className="panel mini"><Minimap /></div>
        </div>
      )}
      <SidePanel />
      {panel === 'industry' && (buildTab ? <BuildPanel /> : <IndustryPanel />)}
      {panel === 'recruit' && <RecruitPanel />}
      {panel === 'research' && <ResearchPanel />}
      {panel === 'politics' && <PoliticsPanel />}
      {panel === 'nat' && <NatPanel />}
      {panel === 'dip' && <DiplomacyPanel />}
      {panel === 'logistics' && <LogisticsPanel />}
      {panel === 'air' && <AirPanel />}
      {panel === 'doctrine' && <DoctrinePanel />}
      {panel === 'design' && <DesignPanel />}
      {panel === 'decisions' && <DecisionsPanel />}
      {panel === 'spy' && <SpyPanel />}
      <div className="menurow"><MenuBar /><Alerts /></div>
      <Console />
      <div className="top-mid" style={{ right }}><PlanBar /></div>
      {buildTab && <div className={`tut-dock ${panel === 'industry' ? 'by-build' : `by-dock${panel === 'politics' ? ' wide' : ''}`}`}>{tips}</div>}
      <div className="bottom-mid" style={{ right }}>
        <Toast />
        <SelectionBar />
        <ArmyBar />
      </div>
      <Popups />
      <Banner />
      <BattleDialog />
      <GameMenu />
      <NotifyDialog />
      <TemplateDesigner />
      <EventDialog />
      <NewsDialog />
      <ConferenceDialog />
      <EndDialog />
      <OverviewDialog />
      <AchievementsDialog />
    </>
  );
}
