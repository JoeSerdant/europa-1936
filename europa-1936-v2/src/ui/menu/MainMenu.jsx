import { useEffect } from 'react';
import { mapController as mc } from '../map/controller.js';
import { goSelect, startGame, setHelp, openSaveDialog, INSETS } from '../actions.js';
import { VERSION_LABEL } from '../../version.js';

// dva pohledy, mezi kterými se mapa v pozadí pomalu pohybuje (zbytek obrazovky zakrývá levý sloupec)
function startDrift() {
  mc.setInsets({ l: Math.round(mc.cam.w * 0.34), r: 0, t: 0, b: 0 });
  const a = mc.viewForBox([300, 360, 2060, 1520], 0, 1.3);
  const b = mc.viewForBox([760, 420, 2330, 1420], 0, 1.3);
  mc.startDrift([{ ...a, zoom: a.zoom * 1.06 }, { ...b, zoom: b.zoom * 1.18 }], 90000);
}

/** Hlavní menu: nad pomalu se pohybující mapou. */
export function MainMenu() {
  useEffect(() => {
    startDrift();
    const onResize = () => startDrift();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); mc.stopDrift(); mc.setInsets(INSETS.menu); };
  }, []);
  return (
    <div className="menu">
      <div className="menu-col">
        <header className="cartouche">
          <h1>Evropa 1936</h1>
          <p>Velká strategie od Atlantiku po Perský záliv</p>
        </header>
        <nav className="menu-buttons" aria-label="Hlavní menu">
          <button className="btn primary big" onClick={goSelect}>Nová hra</button>
          <button className="btn big" onClick={() => openSaveDialog('load')}>Načíst hru</button>
          <button className="btn big" onClick={() => startGame(null)}>Prohlížet mapu</button>
          <button className="btn big" onClick={() => setHelp(true)}>Ovládání</button>
        </nav>
        <footer>{VERSION_LABEL}</footer>
      </div>
    </div>
  );
}
