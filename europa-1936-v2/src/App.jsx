import { useUi } from './ui/store.js';
import { MapView } from './ui/map/MapView.jsx';
import { MainMenu } from './ui/menu/MainMenu.jsx';
import { CountrySelect } from './ui/menu/CountrySelect.jsx';
import { Hud } from './ui/hud/Hud.jsx';
import { Tooltip } from './ui/hud/Tooltip.jsx';
import { Help } from './ui/common/Help.jsx';
import { useGameLoop, useHotkeys } from './ui/hooks.js';
import { mapClick, contextClick, clickCounter, boxSelect, pickCountry, ownerTagAt } from './ui/actions.js';

/** Kořen aplikace: jedno trvalé plátno mapy a nad ním obrazovka podle `screen` (menu / výběr země / hra). */
export default function App() {
  const screen = useUi((s) => s.screen);
  useGameLoop(screen === 'game');
  useHotkeys();

  const inGame = screen === 'game';
  const onPick = (l, mods) => {
    if (inGame) mapClick(l, mods);
    else if (screen === 'select') { const tag = ownerTagAt(l); if (tag) pickCountry(tag); }
  };

  return (
    <div className={`app screen-${screen}`}>
      <MapView interactive={screen !== 'menu'} units={inGame} onPick={onPick} onCounter={inGame ? clickCounter : undefined} onBox={inGame ? boxSelect : undefined} onContext={inGame ? contextClick : undefined} />
      {screen === 'menu' && <MainMenu />}
      {screen === 'select' && <CountrySelect />}
      {screen === 'game' && <Hud />}
      {screen !== 'menu' && <Tooltip />}
      <Help />
    </div>
  );
}
