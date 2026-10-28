import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';
import '@fontsource/jost/700.css';
import '@fontsource/barlow-semi-condensed/400.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import './ui/theme.css';
import './ui/army/army.css';
import App from './App.jsx';
import { mapController } from './ui/map/controller.js';
import { gameStore, uiStore } from './ui/store.js';
import * as engine from './engine/index.js';

// ladicí přístup z konzole a z automatických kontrol: otevřít s ?debug
if (new URLSearchParams(window.location.search).has('debug')) window.__e1936 = { map: mapController, gameStore, uiStore, engine };

// zrnění mapy: jedna malá dlaždice šumu (bílé a černé tečky s nízkou průhledností) jako CSS proměnná; kreslí ji prohlížeč, ne plátno
function makeGrain() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    let s = 20260;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const v = (s >>> 24) / 255;
      const light = v > 0.5;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0;
      img.data[i + 3] = Math.round(Math.abs(v - 0.5) * 2 * 22);
    }
    g.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
  } catch { /* bez zrnění se hra obejde */ }
}
makeGrain();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
