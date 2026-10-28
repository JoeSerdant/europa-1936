import { useEffect } from 'react';
import { useGame, useUi } from '../store.js';
import { TopBar } from './TopBar.jsx';
import { MapModes, Legend } from './MapModes.jsx';
import { GameMenu } from './GameMenu.jsx';
import { SidePanel } from '../army/SidePanel.jsx';
import { SelectionBar } from '../army/SelectionBar.jsx';
import { PlanBar } from '../army/PlanBar.jsx';
import { TemplateDesigner } from '../army/TemplateDesigner.jsx';
import { Toast } from '../common/Toast.jsx';
import { Minimap } from '../map/Minimap.jsx';
import { mapController as mc } from '../map/controller.js';
import { INSETS } from '../actions.js';

/** Rozhraní během hry: horní lišta, režimy, vysvětlivky, minimapa, boční panel, lišty výběru a plánu, nabídka. */
export function Hud() {
  const fresh = useGame((s) => s.paused && s.tick === 0);
  const side = useUi((s) => !!(s.panel || s.selected));
  useEffect(() => { mc.setInsets(INSETS.game); }, []);
  const right = side ? 394 : 14;               // střední lišty se středí mezi levým sloupcem a pravým panelem
  return (
    <>
      <TopBar />
      <MapModes />
      <div className="bottom-left">
        <Legend />
        <div className="panel mini"><Minimap /></div>
      </div>
      <SidePanel />
      <div className="top-mid" style={{ right }}><PlanBar /></div>
      <div className="bottom-mid" style={{ right }}>
        <Toast />
        {fresh && <div className="panel hint" role="status">Čas stojí. Spusťte ho <kbd>mezerníkem</kbd> nebo tlačítkem v horní liště.</div>}
        <SelectionBar />
      </div>
      <GameMenu />
      <TemplateDesigner />
    </>
  );
}
