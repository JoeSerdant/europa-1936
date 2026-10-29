import { useLayoutEffect, useRef } from 'react';
import { useUi, useGame, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { getWorld, TERRAIN_CS, divisionView } from '../../engine/index.js';
import { summarize, pct, CLS_NAMES, STATUS_NAMES } from '../army/helpers.js';

// poslední poloha kurzoru (sleduje se vždy, aby bublina při zobrazení nevyskočila v rohu)
const pointer = { x: -999, y: -999 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
}

/** Řádky o jednotkách pod kurzorem: jedna divize podrobně, hromádka souhrnně. */
function UnitLines({ ids, state }) {
  const first = state.mil.divs[ids[0]];
  if (!first) return null;
  const w = getWorld();
  const owner = w.owners[first.o];
  const sum = summarize(state, ids);
  const view = ids.length === 1 ? divisionView(state, ids[0]) : null;
  const mixed = sum.owners.size > 1;
  return (
    <>
      <b>{view ? view.name : `${ids.length} ${ids.length < 5 ? 'divize' : 'divizí'}`}</b>
      <span>{mixed ? 'Různé země' : <><Flag tag={owner.tag} width={20} /> {owner.name}</>}{view ? ` · ${view.tplName}` : ''}</span>
      <span>Síla {pct(sum.hp)} · Organizace {pct(sum.org)}</span>
      <span>{view ? STATUS_NAMES[view.status] : Object.entries(sum.classes).map(([k, n]) => `${CLS_NAMES[k]} ${n}`).join(', ')}</span>
      <i className="tip-sep" />
    </>
  );
}

/** Bublina u kurzoru: jednotky (je-li nad žetonem), název oblasti a vlastník. Polohu mění přímo v DOM, takže pohyb myši nepřekresluje React. */
export function Tooltip() {
  const hover = useUi((s) => s.hover);
  const units = useUi((s) => s.hoverUnits);
  const owner = useGame((s) => s.stateOwner);
  const ctrl = useGame((s) => s.ctrl);
  const state = useGameSlow((s) => s, 400);
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const place = () => {
      const x = Math.min(pointer.x + 18, window.innerWidth - el.offsetWidth - 8);
      const y = Math.min(pointer.y + 20, window.innerHeight - el.offsetHeight - 8);
      el.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
    };
    place();
    window.addEventListener('pointermove', place, { passive: true });
    return () => window.removeEventListener('pointermove', place);
  }, [hover, units]);

  if (!hover && !units) return null;
  const w = getWorld();
  if (hover && w.isSea(hover) && !units) {
    return <div ref={ref} className="tooltip"><b>{w.seaName(hover)}</b><span>{w.seaRegions[w.sea[hover - w.L].r]}</span></div>;
  }
  const land = hover && w.isLand(hover) ? w.land[hover] : null;
  if (!land && !units) return null;
  const own = land ? w.owners[owner[land.s]] : null;
  const ctl = land && ctrl[hover] !== owner[land.s] ? w.owners[ctrl[hover]] : null;
  return (
    <div ref={ref} className="tooltip">
      {units && <UnitLines ids={units} state={state} />}
      {land && (
        <>
          <b className={units ? 'small' : ''}>{land.n}</b>
          <span><Flag tag={own.tag} width={20} /> {own.name} · {w.states[land.s].n}</span>
          {units && <span>{TERRAIN_CS[land.t]}</span>}
          {ctl && <span>Obsazeno: <Flag tag={ctl.tag} width={20} /> {ctl.name}</span>}
        </>
      )}
    </div>
  );
}
