import { useEffect, useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { getWorld, industryOf, projectEta, BUILDINGS, buildRoom, fortRoom } from '../../engine/index.js';
import { playerIdx, closeSide, setIndTab, pickBuild, buildAt, cancelProject, moveProject, selectLabel } from '../actions.js';
import { fmtNum, fmtDays } from '../format.js';

// Stavby jako v HOI4 (M103): úzký panel vlevo – nejdřív budova, pak klik na stát na mapě (mapa v režimu Stavby ukazuje, kde to jde).
const KINDS = ['civ', 'mil', 'dok', 'inf', 'afb', 'radar', 'fort'];
const KIND_ICON = { civ: 'industry', mil: 'army', dok: 'navy', inf: 'supply', afb: 'air', radar: 'eye', fort: 'shield' };
const TABS = [{ id: 'build', name: 'Stavby' }, { id: 'prod', name: 'Výroba' }, { id: 'trade', name: 'Obchod' }];

/** Státy (pevnost: provincie) s nejvíc volného místa pro budovu `kind` – rychlá volba bez hledání na mapě. */
function bestPlaces(state, me, kind) {
  const w = getWorld(), out = [];
  if (BUILDINGS[kind].province) {
    for (let p = 1; p <= w.L; p++) if (state.ctrl[p] === me && state.stateOwner[w.provState[p]] === me && w.vp[p] > 0) { const r = fortRoom(state, p, me); if (r.n) out.push({ l: p, n: r.n, nm: w.provName(p), key: w.vp[p] }); }
  } else {
    for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === me) { const r = buildRoom(state, s, kind, me); if (r.n) out.push({ l: w.states[s].cap, n: r.n, nm: w.states[s].n, key: r.n }); }
  }
  return out.sort((a, b) => b.key - a.key || b.n - a.n).slice(0, 6);
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
          {list.map((b, i) => {
            const B = BUILDINGS[b.k];
            const eta = projectEta(state, me, b.id);
            const w = getWorld();
            return (
              <li key={b.id}>
                <Icon name={KIND_ICON[b.k] || 'build'} size={16} />
                <span className="bq-nm" title={`${B.n} · ${b.p ? w.provName(b.p) : w.states[b.s].n}`}><b>{b.p ? w.provName(b.p) : w.states[b.s].n}</b><i>{eta < 0 ? 'bez bodů' : fmtDays(eta)}</i></span>
                <button className="icon-btn sm" disabled={i === 0} onClick={() => moveProject(b.id, -Infinity)} aria-label="Na začátek fronty" title="Na začátek fronty"><Icon name="back" size={13} className="rot90" /></button>
                <button className="icon-btn sm" onClick={() => cancelProject(b.id)} aria-label={`Zrušit stavbu ${B.n}`} title="Zrušit"><Icon name="close" size={13} /></button>
                <span className="bar prog"><i style={{ width: `${((b.prog / B.cost) * 100).toFixed(1)}%` }} /></span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
