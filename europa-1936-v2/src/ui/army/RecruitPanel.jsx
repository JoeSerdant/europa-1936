import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { isUnlocked, templatesOf, templateView, queueOf, EQUIP, EQUIP_IDS, ARMY, getWorld, BATTALIONS, SUPPORT } from '../../engine/index.js';
import { playerIdx, closeSide, hideFull, recruitSite, recruitDivisions, cancelTraining, openDesigner, removeTemplate } from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';
import { ClsIcon } from './parts.jsx';
import { EqChip, eqColor } from '../industry/EqChip.jsx';
import { EquipIcon } from '../industry/EquipIcon.jsx';
import { provName, CLS_NAMES } from './helpers.js';

/** Kolik divizí z této šablony lze zařadit hned (muži, výzbroj, místo ve frontě), nejvýš 20. */
export function affordable(view, man, stock, room) {
  let n = Math.min(20, room, view.men ? Math.floor(man / view.men) : 20);
  for (const e in view.need) n = Math.min(n, Math.floor((stock[e] || 0) / view.need[e]));
  return Math.max(0, n);
}

function Stat({ label, value, title }) {
  return <span className="stat-cell" title={title}><i>{label}</i><b>{value}</b></span>;
}

/** Miniatura složení šablony (F4g, jako v HOI4): pluky jako sloupce značek praporů, podpůrné roty pod nimi. */
function Composition({ tpl }) {
  return (
    <div className="tpl-comp" aria-label="Složení divize">
      <span className="tc-regs">
        {tpl.reg.map((col, c) => (
          <span key={c} className="tc-col">{col.map((t, r) => <span key={r} className="tc-bat" title={BATTALIONS[t] ? BATTALIONS[t].n : t}><ClsIcon cls={BATTALIONS[t] ? BATTALIONS[t].sym : 'inf'} size={20} /></span>)}</span>
        ))}
      </span>
      {tpl.sup.length > 0 && <span className="tc-sup">{tpl.sup.map((t) => <span key={t} className="tc-s" title={SUPPORT[t] ? SUPPORT[t].n : t}>{SUPPORT[t] ? SUPPORT[t].ab : t}</span>)}</span>}
    </div>
  );
}

function TemplateCard({ view, man, stock, room, used }) {
  const st = view.stats;
  const can = affordable(view, man, stock, room);
  const needs = Object.entries(view.need);
  return (
    <article className="tpl-card" aria-label={view.tpl.nm}>
      <header>
        <ClsIcon cls={st.cls} size={30} />
        <div className="tpl-title">
          <b>{view.tpl.nm}</b>
          <span>{CLS_NAMES[st.cls]} · výcvik {fmtDays(view.days)}</span>
        </div>
        <button className="icon-btn sm" onClick={() => openDesigner(view.id)} aria-label={`Upravit šablonu ${view.tpl.nm}`} title="Upravit šablonu"><Icon name="edit" size={16} /></button>
        <button className="icon-btn sm" onClick={() => removeTemplate(view.id)} aria-label={`Smazat šablonu ${view.tpl.nm}`} title={used ? 'Šablonu používají divize nebo výcvik' : 'Smazat šablonu'} disabled={used}><Icon name="trash" size={16} /></button>
      </header>
      <Composition tpl={view.tpl} />
      <div className="tpl-stats">
        <Stat label="Síla" value={fmtNum(st.hp, 0)} title="Síla divize (hit pointy)" />
        <Stat label="Org." value={fmtNum(st.org, 0)} title="Organizace" />
        <Stat label="Útok" value={`${fmtNum(st.soft, 0)}/${fmtNum(st.hard, 0)}`} title="Útok na měkké / tvrdé cíle" />
        <Stat label="Obrana" value={fmtNum(st.def, 0)} title="Obrana" />
        <Stat label="Průraz" value={fmtNum(st.brk, 0)} title="Průraz fronty" />
        <Stat label="Rychl." value={fmtNum(st.speed, 0)} title="Rychlost (pěšák = 4)" />
      </div>
      <div className="tpl-cost" aria-label="Cena">
        <span className={`cost ${man < view.men ? 'lack' : ''}`} title="Lidská síla"><Icon name="population" size={14} />{fmtInt(view.men)}</span>
        {needs.map(([e, n]) => (
          <EqChip key={e} e={e} n={n} lack={(stock[e] || 0) < n} title={`${EQUIP[e].n}: potřeba ${fmtInt(n)}, ve skladu ${fmtInt(stock[e] || 0)}`} />
        ))}
      </div>
      <div className="tpl-actions">
        <button className="sbtn primary" disabled={can < 1} onClick={() => recruitDivisions(view.id, 1)} title="Zařadit jednu divizi do výcviku">Zařadit</button>
        <button className="sbtn" disabled={can < 5} onClick={() => recruitDivisions(view.id, 5)} title="Zařadit pět divizí do výcviku">× 5</button>
        <span className="muted">{can > 0 ? `hned lze ${can}` : man < view.men ? 'chybí lidská síla' : room < 1 ? 'výcvik je plný' : 'chybí výzbroj'}</span>
      </div>
    </article>
  );
}

function daysLeft(q, tick) { return Math.max(0, Math.ceil((q.done - tick) / 24)); }

function Queue({ state, me }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const q of queueOf(state, me)) {
      const key = `${q.tpl}:${q.p}:${q.done}`;
      const r = map.get(key);
      if (r) r.items.push(q.id); else map.set(key, { key, tpl: q.tpl, p: q.p, done: q.done, items: [q.id] });
    }
    return [...map.values()].sort((a, b) => a.done - b.done);
  }, [state.mil.queue, me]);
  if (!rows.length) return <p className="empty">Nic se necvičí. Zařaďte divize z některé šablony.</p>;
  return (
    <ul className="queue q-cards">
      {rows.map((r) => {
        const tpl = state.mil.tpl[r.tpl];
        const v = templateView(state, r.tpl);
        const total = v ? v.days * 24 : 1;
        const left = r.done - state.tick;
        const frac = Math.max(0, Math.min(1, 1 - left / total));
        return (
          <li key={r.key} className="q-card">
            <ClsIcon cls={v ? v.stats.cls : 'inf'} size={34} />
            <div className="q-mid">
              <div className="q-top">
                <b>{tpl ? tpl.nm : 'Šablona'}</b>{r.items.length > 1 && <em className="q-n" title="Počet divizí">× {r.items.length}</em>}
                <span className="muted" title="Místo nasazení">{provName(r.p)}</span>
              </div>
              <span className="bar prog q-bar" title={`Výcvik ${Math.round(frac * 100)} %`}><i style={{ width: `${(frac * 100).toFixed(1)}%` }} /><em>{fmtDays(daysLeft(r, state.tick))}</em></span>
            </div>
            <button className="icon-btn sm" onClick={() => cancelTraining(r.items[r.items.length - 1])} aria-label="Zrušit výcvik jedné divize" title="Zrušit jednu divizi (lidská síla a výzbroj se vrátí)"><Icon name="close" size={14} /></button>
          </li>
        );
      })}
    </ul>
  );
}

/** Záložka Nábor: sklady a lidská síla, šablony divizí (zařazení do výcviku, úpravy) a fronta výcviku. */
export function RecruitPanel() {
  const state = useGameSlow((s) => s, 500);
  const selected = useUi((s) => s.selected);
  const me = playerIdx(state);
  const ids = useMemo(() => (me ? templatesOf(state.mil, me) : []), [state.mil.tpl, me]);
  if (!me) return <div className="prod-screen recruit-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nenabíráte žádné divize.</p></div></div>;
  const man = state.mil.man[me] || 0;
  const stock = state.mil.stock[me] || {};
  const room = ARMY.QUEUE_MAX - state.mil.queue.length;
  const site = recruitSite(state, selected);
  const cap = getWorld().owners[me].cap;
  const used = (id) => state.mil.divs.some((d) => d && d.tpl === id) || state.mil.queue.some((q) => q.tpl === id);
  const queued = queueOf(state, me).length;
  return (
    <div className="prod-screen recruit-panel" role="dialog" aria-label="Nábor a rozmístění">
      <header className="prod-head">
        <h2><Icon name="recruit" size={22} />Nábor a rozmístění</h2>
        <div className="man"><Icon name="population" size={22} /><span><i>Lidská síla</i><b>{fmtInt(man)}</b></span></div>
        <p className="site">Nové divize se objeví v provincii <b>{provName(site)}</b>{site === cap ? ' (hlavní město)' : ''}. </p>
        <button className="sbtn" onClick={hideFull} title="Okno se schová; označte vlastní provincii a znovu otevřete Nábor (N)"><Icon name="target" size={14} />Zvolit místo na mapě</button>
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít okno" title="Zavřít (Esc)"><Icon name="close" size={20} /></button>
      </header>
      <div className="prod-body">
        <div className="prod-cols rec-cols">
          <div className="prod-left rec-deploy">
            <div className="sec-head"><h3>Ve výcviku{queued ? ` (${queued})` : ''}</h3><span className="muted">fronta náboru a rozmístění</span></div>
            <Queue state={state} me={me} />
            <section className="stock">
              <div className="sec-head"><h3>Sklad výzbroje</h3></div>
              <div className="stk-grid">
                {EQUIP_IDS.filter((e) => isUnlocked(state, me, EQUIP[e].unlock)).map((e) => {
                  const n = stock[e] || 0;
                  return <span key={e} className={`stk-tile ${n ? '' : 'zero'}`} title={`${EQUIP[e].n} ve skladu`}><EquipIcon eq={e} size={34} color={eqColor(e)} /><b>{fmtInt(n)}</b></span>;
                })}
              </div>
            </section>
          </div>
          <aside className="prod-right rec-tpls">
            <div className="sec-head"><h3>Šablony divizí ({ids.length})</h3><button className="sbtn" onClick={() => openDesigner(0)}><Icon name="plus" size={14} />Nová šablona</button></div>
            <div className="tpl-grid">
              {ids.map((id) => <TemplateCard key={id} view={templateView(state, id)} man={man} stock={stock} room={room} used={used(id)} />)}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
