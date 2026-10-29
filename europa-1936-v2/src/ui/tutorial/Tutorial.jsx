import { useEffect, useRef, useState } from 'react';
import { gameStore, uiStore, useGame, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { playerIdx } from '../actions.js';
import { STEPS, currentStep } from './steps.js';
import { tutorialOn, setTutorial } from './prefs.js';

/** Průvodce: karta s aktuálním úkolem; kroky se odškrtávají podle toho, co hráč dělá. Vypnout lze křížkem nebo v nabídce. */
export function Tutorial() {
  const [on, setOn] = useState(tutorialOn());
  const latched = useRef(new Set());
  const [idx, setIdx] = useState(0);
  useGame((s) => (s.tick >> 3) + (s.ind.build.length << 20));     // občas přepočítat podle času a staveb
  const panel = useUi((s) => s.panel);
  const selected = useUi((s) => s.selected);
  const sel = useUi((s) => s.selDivs);
  const tab = useUi((s) => s.indTab);
  useEffect(() => {
    const g = gameStore.getState(), u = uiStore.getState();
    const me = playerIdx(g);
    if (!me) return;
    setIdx(currentStep(g, u, me, latched.current));
  });
  useEffect(() => { const h = () => setOn(tutorialOn()); window.addEventListener('e1936-tutorial', h); return () => window.removeEventListener('e1936-tutorial', h); }, []);
  void panel; void selected; void sel; void tab;
  const g = gameStore.getState();
  if (!on || !playerIdx(g)) return null;
  const done = idx >= STEPS.length;
  return (
    <section className="panel tutorial" role="status" aria-label="Průvodce">
      <header>
        <b>{done ? 'Průvodce dokončen' : `Průvodce ${idx + 1}/${STEPS.length}`}</b>
        <button className="icon-btn sm" onClick={() => { setTutorial(false); setOn(false); }} aria-label="Skrýt průvodce" title="Skrýt průvodce (zapnete ho v nabídce)"><Icon name="close" size={14} /></button>
      </header>
      <p>{done ? 'Základy máte. Další tipy: F1 (ovládání), konzole ~ a okna Q W E R T Y U I.' : STEPS[idx].text}</p>
      <span className="bar prog"><i style={{ width: `${Math.min(100, (idx / STEPS.length) * 100)}%` }} /></span>
    </section>
  );
}
