import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { isUnlocked, templatesOf, templateView, queueOf, EQUIP, EQUIP_IDS, ARMY, getWorld } from '../../engine/index.js';
import { playerIdx, recruitSite, recruitDivisions, cancelTraining, openDesigner, removeTemplate } from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';
import { ClsIcon } from './parts.jsx';
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
          <span key={e} className={`cost ${(stock[e] || 0) < n ? 'lack' : ''}`} title={`${EQUIP[e].n}: potřeba ${fmtInt(n)}, ve skladu ${fmtInt(stock[e] || 0)}`}>{EQUIP[e].ab} {fmtInt(n)}</span>
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
    <ul className="queue">
      {rows.map((r) => {
        const tpl = state.mil.tpl[r.tpl];
        const v = templateView(state, r.tpl);
        const total = v ? v.days * 24 : 1;
        const left = r.done - state.tick;
        const frac = Math.max(0, Math.min(1, 1 - left / total));
        return (
          <li key={r.key}>
            <div className="q-top">
              <b>{tpl ? tpl.nm : 'Šablona'}{r.items.length > 1 ? ` × ${r.items.length}` : ''}</b>
              <span className="muted">{provName(r.p)} · zbývá {fmtDays(daysLeft(r, state.tick))}</span>
              <button className="icon-btn sm" onClick={() => cancelTraining(r.items[r.items.length - 1])} aria-label="Zrušit výcvik jedné divize" title="Zrušit jednu divizi (lidská síla a výzbroj se vrátí)"><Icon name="close" size={14} /></button>
            </div>
            <span className="bar prog"><i style={{ width: `${(frac * 100).toFixed(1)}%` }} /></span>
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
  if (!me) return <div className="recruit-panel"><p className="empty">Jako pozorovatel nenabíráte žádné divize.</p></div>;
  const man = state.mil.man[me] || 0;
  const stock = state.mil.stock[me] || {};
  const room = ARMY.QUEUE_MAX - state.mil.queue.length;
  const site = recruitSite(state, selected);
  const cap = getWorld().owners[me].cap;
  const used = (id) => state.mil.divs.some((d) => d && d.tpl === id) || state.mil.queue.some((q) => q.tpl === id);
  const queued = queueOf(state, me).length;
  return (
    <div className="recruit-panel">
      <section className="stock">
        <div className="man"><Icon name="population" size={20} /><span><i>Lidská síla</i><b>{fmtInt(man)}</b></span></div>
        <ul className="eq">
          {EQUIP_IDS.filter((e) => isUnlocked(state, me, EQUIP[e].unlock)).map((e) => (
            <li key={e} title={EQUIP[e].n}><i>{EQUIP[e].ab}</i><b>{fmtInt(stock[e] || 0)}</b></li>
          ))}
        </ul>
        <p className="site">Nové divize se objeví v provincii <b>{provName(site)}</b>{site === cap ? ' (hlavní město)' : ''}. Jiné místo zvolíte klikem na vlastní provincii na mapě.</p>
      </section>
      <div className="side-scroll">
        <div className="sec-head"><h3>Šablony divizí</h3><button className="sbtn" onClick={() => openDesigner(0)}><Icon name="plus" size={14} />Nová šablona</button></div>
        {ids.map((id) => <TemplateCard key={id} view={templateView(state, id)} man={man} stock={stock} room={room} used={used(id)} />)}
        <div className="sec-head"><h3>Ve výcviku{queued ? ` (${queued})` : ''}</h3></div>
        <Queue state={state} me={me} />
      </div>
    </div>
  );
}
