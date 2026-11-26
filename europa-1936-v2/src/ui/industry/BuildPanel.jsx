import { useEffect, useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { getWorld, industryOf, projectEta, BUILDINGS, buildRoom, fortRoom } from '../../engine/index.js';
import { playerIdx, closeSide, setIndTab, pickBuild, buildAt, cancelProject, moveProject, selectLabel } from '../actions.js';
import { fmtNum, fmtDays } from '../format.js';
import { queueFlow } from './flow.js';

// Stavby jako v HOI4 (M103): úzký panel vlevo – nejdřív budova, pak klik na stát na mapě (mapa v režimu Stavby ukazuje, kde to jde).
const KINDS = ['civ', 'mil', 'dok', 'inf', 'rail', 'afb', 'radar', 'aa', 'nb', 'hub', 'fort', 'cfort'];   // S8: protiletadlová obrana   // F4c: námořní základna, zásobovací uzel, pobřežní pevnost; S6: železnice
const KIND_ICON = { civ: 'industry', mil: 'army', dok: 'navy', inf: 'supply', afb: 'air', radar: 'eye', aa: 'target', nb: 'ship', hub: 'box', fort: 'shield', cfort: 'flag', rail: 'road' };
const TABS = [{ id: 'build', name: 'Stavby' }, { id: 'prod', name: 'Výroba' }, { id: 'trade', name: 'Obchod' }];

/** Státy (pevnost: provincie) s nejvíc volného místa pro budovu `kind` – rychlá volba bez hledání na mapě. */
function bestPlaces(state, me, kind) {
  const w = getWorld(), out = [];
  if (BUILDINGS[kind].province) {
    const hungry = new Map();   // S6: železnice – provincie s vlastními divizemi bez plných zásob
    if (kind === 'rail') for (const d of state.mil.divs) if (d && d.o === me && d.sup < 0.99) hungry.set(d.p, (hungry.get(d.p) || 0) + 1);
    for (let p = 1; p <= w.L; p++) if (state.ctrl[p] === me && state.stateOwner[w.provState[p]] === me && (kind === 'cfort' ? w.portLevel[p] > 0 : kind === 'rail' ? hungry.has(p) || w.vp[p] > 2 : w.vp[p] > 0)) { const r = fortRoom(state, p, me, kind); if (r.n) out.push({ l: p, n: r.n, nm: w.provName(p), key: (hungry.get(p) || 0) * 10 + w.vp[p] + w.portLevel[p] }); }
  } else {
    for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === me) { const r = buildRoom(state, s, kind, me); if (r.n) out.push({ l: w.states[s].cap, n: r.n, nm: w.states[s].n, key: r.n }); }
  }
  return out.sort((a, b) => b.key - a.key || b.n - a.n).slice(0, 6);
}

/** Řada továren projektu (F4f, jako v HOI4): plné = civilní továrny, které na stavbě pracují, prázdné = kolik by jich stavba ještě vzala. */
function FacRow({ f }) {
  const cells = [];
  for (let i = 0; i < f.facMax; i++) {
    const part = Math.max(0, Math.min(1, f.fac - i));
    cells.push(<i key={i} className={part >= 0.999 ? 'on' : part > 0 ? 'part' : ''} style={part > 0 && part < 0.999 ? { '--p': `${Math.round(part * 100)}%` } : undefined} />);
  }
  return <span className="bq-fac" title={`Civilní továrny na stavbě: ${fmtNum(f.fac, 1)} z nejvýš ${f.facMax} (${fmtNum(f.pts, 1)} z ${fmtNum(f.cap, 1)} bodů za den)`}>{cells}</span>;
}

/** Karta projektu ve frontě: ikona budovy, místo, druh, továrny, postup a dny do konce; posun ve frontě a zrušení. */
function QueueCard({ b, i, n, eta, flow }) {
  const B = BUILDINGS[b.k], w = getWorld();
  const place = b.p ? w.provName(b.p) : w.states[b.s].n;
  const share = Math.min(1, b.prog / B.cost);
  const idle = !flow || flow.pts <= 0;
  return (
    <li className={`bq-card ${idle ? 'idle' : ''}`}>
      <button className="bq-ic" onClick={() => selectLabel(b.p || w.states[b.s].cap, true)} title={`${B.n} – ukázat na mapě`} aria-label={`Ukázat ${place} na mapě`}><Icon name={KIND_ICON[b.k] || 'build'} size={22} /></button>
      <span className="bq-nm"><b title={place}>{place}</b><small>{B.n}</small></span>
      <span className="bq-eta" title="Dny do dokončení při současném přísunu bodů">{eta < 0 ? 'čeká' : fmtDays(eta)}</span>
      <span className="bq-btns">
        <button className="icon-btn sm" disabled={i === 0} onClick={() => moveProject(b.id, -Infinity)} aria-label="Na začátek fronty" title="Na začátek fronty"><Icon name="back" size={13} className="rot90" /></button>
        <button className="icon-btn sm" disabled={i === n - 1} onClick={() => moveProject(b.id, 1)} aria-label="O místo níž" title="O místo níž"><Icon name="chevron" size={13} /></button>
        <button className="icon-btn sm" onClick={() => cancelProject(b.id)} aria-label={`Zrušit stavbu ${B.n}`} title="Zrušit"><Icon name="close" size={13} /></button>
      </span>
      {flow && <FacRow f={flow} />}
      <span className="bar prog bq-prog" title={`Postaveno ${Math.round(share * 100)} %`}><i style={{ width: `${(share * 100).toFixed(1)}%` }} /><em>{Math.round(share * 100)} %</em></span>
    </li>
  );
}

export function BuildPanel() {
  const state = useGameSlow((s) => s, 300);
  const kind = useUi((s) => s.buildKind);
  const me = playerIdx(state);
  useEffect(() => () => pickBuild(null), []);   // panel zavřen → konec stavění klikáním
  const sum = useMemo(() => (me ? industryOf(state, me) : null), [state.ind, state.stateOwner, state.ctrl, state.pol, me]);
  const best = useMemo(() => (me && kind ? bestPlaces(state, me, kind) : []), [state.ind, state.stateOwner, state.ctrl, me, kind]);
  if (!me || !sum) return null;
  const list = sum.build;
  const flow = queueFlow(list, sum.points);
  return (
    <aside className="panel build-panel" aria-label="Stavby">
      <header className="bp-head">
        <Icon name="build" size={20} /><h2>Stavby</h2>
        <span className="bp-pts" title="Body stavby za den (civilní továrny po spotřebním zboží a dovozu)">{fmtNum(sum.points, 0)}<small>/den</small></span>
        <button className="icon-btn sm" onClick={closeSide} aria-label="Zavřít" title="Zavřít (Esc)"><Icon name="close" size={16} /></button>
      </header>
      <nav className="bp-tabs" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={t.id === 'build'} className={t.id === 'build' ? 'on' : ''} onClick={() => setIndTab(t.id)}>{t.name}</button>)}
      </nav>
      <div className="bp-grid" role="radiogroup" aria-label="Budova">
        {KINDS.map((k) => {
          const B = BUILDINGS[k];
          return (
            <button key={k} role="radio" aria-checked={kind === k} className={`bp-tile ${kind === k ? 'on' : ''}`} onClick={() => pickBuild(kind === k ? null : k)}
              title={`${B.n}: ${B.info} Cena ${B.cost} bodů, nejdřív za ${B.days} dní.`} aria-label={B.n}>
              <Icon name={KIND_ICON[k]} size={24} /><span>{B.n}</span><small>{B.cost}</small>
            </button>
          );
        })}
      </div>
      {kind ? (
        <div className="bp-hint">
          <p><b>{BUILDINGS[kind].n}</b> – klikněte na {BUILDINGS[kind].province ? 'provincii' : 'zelený stát'} na mapě. <kbd>Shift</kbd> zaplní vše, <kbd>Esc</kbd> ukončí.</p>
          {best.length > 0 && (
            <ul className="bp-best" aria-label="Doporučená místa">
              {best.map((b) => (
                <li key={b.l}>
                  <button onClick={() => { buildAt(b.l); }} onDoubleClick={() => selectLabel(b.l, true)} title="Klik = postavit zde, dvojklik = ukázat na mapě">
                    <span>{b.nm}</span><em>{b.n}</em><Icon name="plus" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : <p className="bp-hint muted">Vyberte budovu a klikejte na státy na mapě.</p>}
      <div className="bp-qhead"><h3>Fronta{list.length ? ` (${list.length})` : ''}</h3></div>
      {!list.length ? <p className="empty">Nic se nestaví.</p> : (
        <ul className="queue bp-queue">
          {list.map((b, i) => <QueueCard key={b.id} b={b} i={i} n={list.length} eta={projectEta(state, me, b.id)} flow={flow.get(b.id)} />)}
        </ul>
      )}
    </aside>
  );
}
