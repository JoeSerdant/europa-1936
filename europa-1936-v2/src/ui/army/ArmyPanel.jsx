import { memo, useMemo, useRef, useState } from 'react';
import { uiStore, useUi, useGameSlow } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { abilityOf, ABILITIES, ABILITY_IDS, armyTree, divisionView, generalsOf, TRAITS, PLAN_MODES, MODE_NAMES } from '../../engine/index.js';
import {
  playerIdx, armyAbility, selectArmy, selectGroup, toggleDivision, setOpen, focusProvince, newArmy, newGroup, renameArmyTo, renameGroupTo, disbandArmyById,
  disbandGroupById, moveDivisionsToArmy, moveArmiesToGroup, setCommander, startPlanEdit, clearArmyPlan, setArmyPlanMode, ownSelected,
} from '../actions.js';
import { summarize, planText, pct, provName, RANK_NAMES, SKILLS } from './helpers.js';
import { ClsIcon, Bar, Status } from './parts.jsx';

// ---- přetahování (HTML5 drag & drop): co se právě táhne ----
let dragPayload = null;
const dragSource = (kind, ids) => ({
  draggable: true,
  onDragStart: (e) => { dragPayload = { kind, ids: typeof ids === 'function' ? ids() : ids }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', kind); e.stopPropagation(); },
  onDragEnd: () => { dragPayload = null; },
});
function useDrop(accept, onDrop) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const ok = () => !!dragPayload && dragPayload.kind === accept;
  return {
    over,
    props: {
      onDragOver: (e) => { if (ok()) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } },
      onDragEnter: () => { if (ok()) { depth.current++; setOver(true); } },
      onDragLeave: () => { if (ok() && --depth.current <= 0) { depth.current = 0; setOver(false); } },
      onDrop: (e) => { if (ok()) { e.preventDefault(); depth.current = 0; setOver(false); const p = dragPayload; dragPayload = null; onDrop(p.ids); } },
    },
  };
}

const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };
const additive = (e) => e.shiftKey || e.ctrlKey || e.metaKey;

/** Název s úpravou dvojklikem. */
function EditableName({ value, onCommit, className = 'nm' }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(value);
  if (!edit) {
    return <span className={className} title="Dvojklik = přejmenovat" onDoubleClick={(e) => { e.stopPropagation(); setText(value); setEdit(true); }}>{value}</span>;
  }
  const done = (ok) => { setEdit(false); if (ok && text.trim() && text.trim() !== value) onCommit(text); };
  return (
    <input className="rename" value={text} autoFocus maxLength={40} onClick={(e) => e.stopPropagation()} onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()} onBlur={() => done(true)}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); }} />
  );
}

// ---------------------------------------------------------------- velitelé
function GenLine({ gen }) {
  return (
    <span className="gen-line">
      <b>{RANK_NAMES[gen.gen.r]} {gen.gen.nm}</b>
      <span className="skills">{SKILLS.map(([k, n]) => <i key={k} title={`${n} ${gen.gen[k]}`}>{k === 'pl' ? 'Pl' : k === 'lg' ? 'Lg' : k === 'a' ? 'Ú' : 'O'}{gen.gen[k]}</i>)}</span>
    </span>
  );
}

function CommanderPicker({ kind, id, gens, current, onClose }) {
  const list = kind === 'group' ? gens.filter((g) => g.gen.r === 'M') : gens;
  return (
    <div className="picker" role="listbox" aria-label="Velitelé">
      {current ? <button className="pick-none" onClick={stop(() => { setCommander(kind, id, 0); onClose(); })}>Odvolat velitele</button> : null}
      {list.length === 0 && <p className="muted">{kind === 'group' ? 'Žádný polní maršál k dispozici.' : 'Žádný velitel k dispozici.'}</p>}
      {list.map((g) => (
        <button key={g.id} role="option" aria-selected={g.id === current} className={`pick ${g.id === current ? 'on' : ''}`}
          onClick={stop(() => { setCommander(kind, id, g.id); onClose(); })}>
          <GenLine gen={g} />
          <span className="pick-sub">
            úroveň {g.level}{g.gen.tr.length ? ` · ${g.gen.tr.map((t) => (TRAITS[t] ? TRAITS[t].n : t)).join(', ')}` : ''}
            {g.post && !(g.post.kind === kind && g.post.id === id) ? ' · velí jinde (bude přeložen)' : ''}
          </span>
        </button>
      ))}
    </div>
  );
}

function CommanderRow({ kind, id, cmd, gens }) {
  const [pick, setPick] = useState(false);
  const g = cmd ? gens.find((x) => x.id === cmd) : null;
  return (
    <div className="cmd">
      <div className="cmd-main">
        {g ? <GenLine gen={g} /> : <span className="muted">{kind === 'group' ? 'Bez polního maršála' : 'Bez velitele'}</span>}
        <button className="sbtn" onClick={stop(() => setPick(!pick))} aria-expanded={pick}><Icon name="general" size={14} />{g ? 'Změnit' : 'Jmenovat'}</button>
      </div>
      {pick && <CommanderPicker kind={kind} id={id} gens={gens} current={cmd} onClose={() => setPick(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- řádky
const DivRow = memo(function DivRow({ id, view, sel }) {
  const ids = () => { const s = uiStore.getState().selDivs; return s.includes(id) ? ownSelected() : [id]; };
  return (
    <div className={`row div ${sel ? 'sel' : ''}`} {...dragSource('div', ids)}
      onClick={(e) => toggleDivision(id, additive(e))} onDoubleClick={() => focusProvince(view.p)} title={`${view.tplName} · ${provName(view.p)}`}>
      <ClsIcon cls={view.cls} />
      <span className="nm">{view.name}</span>
      <span className="meters"><Bar v={view.hpPct} kind="hp" title={`Síla ${pct(view.hpPct)}`} /><Bar v={view.orgPct} kind="org" title={`Organizace ${pct(view.orgPct)}`} /></span>
      <Status status={view.status} supply={view.supply} grace={view.graceHours} />
    </div>
  );
});

function PlanBlock({ id, army }) {
  const plan = army.plan;
  return (
    <div className="plan">
      <div className="plan-line"><Icon name="flag" size={14} /><span>{planText(plan)}</span>{plan && plan.auto ? <i className="tag">auto</i> : null}</div>
      {plan && plan.k === 'front' && (
        <div className="seg" role="group" aria-label="Režim útoku">
          {PLAN_MODES.map((m) => <button key={m} className={plan.mode === m ? 'on' : ''} onClick={stop(() => setArmyPlanMode(id, m))} title={MODE_HINTS[m]}>{MODE_NAMES[m]}</button>)}
        </div>
      )}
      <div className="plan-actions">
        <button className="sbtn" onClick={stop(() => startPlanEdit(id, 'area'))}><Icon name="shield" size={14} />Hájit oblast</button>
        <button className="sbtn" onClick={stop(() => startPlanEdit(id, 'front'))}><Icon name="attack" size={14} />Linie fronty</button>
        {plan && <button className="sbtn" onClick={stop(() => clearArmyPlan(id))}><Icon name="close" size={14} />Zrušit plán</button>}
      </div>
    </div>
  );
}
const MODE_HINTS = {
  careful: 'Útočí, až je armáda odpočatá a naplánovaná (půl stropu plánování, organizace 85 %).',
  balanced: 'Útočí, když má divize aspoň 65 % organizace.',
  rush: 'Útočí hned, jakmile má divize aspoň 35 % organizace.',
};

/** Schopnosti armády za velitelskou moc: aktivní schopnost s časem, nebo tlačítka pro použití. */
function AbilityRow({ id, state }) {
  const act = abilityOf(state, id);
  const cp = state.player ? state.cmd.cp[playerIdx(state)] : 0;
  return (
    <div className="detail-actions abil">
      {act ? <span className="muted">Aktivní: {ABILITIES[act.id].n} (ještě {Math.max(1, Math.ceil((act.until - state.tick) / 24))} d)</span>
        : ABILITY_IDS.map((k) => <button key={k} className="sbtn" disabled={cp < ABILITIES[k].cost} onClick={stop(() => armyAbility(id, k))} title={`${ABILITIES[k].info} Cena ${ABILITIES[k].cost}, trvá ${ABILITIES[k].days} d.`}>{ABILITIES[k].n}</button>)}
      <span className="muted" title="Velitelská moc">VM {Math.floor(cp)}</span>
    </div>
  );
}

function ArmyNode({ node, army, state, selSet, open, focus, gens }) {
  const id = node.id;
  const sum = useMemo(() => summarize(state, node.divs), [state.mil.divs, node.divs]);
  const sel = node.divs.length > 0 && node.divs.every((d) => selSet.has(d));
  const key = `a${id}`;
  const isOpen = open[key] !== undefined ? open[key] : focus === id;
  const drop = useDrop('div', (ids) => moveDivisionsToArmy(ids, id));
  const cmd = army.cmd ? gens.find((g) => g.id === army.cmd) : null;
  return (
    <div className="node army">
      <div className={`row head ${sel || focus === id ? 'sel' : ''} ${drop.over ? 'drop' : ''}`} {...drop.props} {...dragSource('army', [id])}
        onClick={(e) => selectArmy(id, { add: additive(e) })}>
        <button className={`fold ${isOpen ? 'open' : ''}`} aria-label={isOpen ? 'Sbalit' : 'Rozbalit'} aria-expanded={isOpen} onClick={stop(() => setOpen(key, !isOpen))}><Icon name="chevron" size={16} /></button>
        <EditableName value={army.nm} onCommit={(t) => renameArmyTo(id, t)} />
        <span className="count" title="Počet divizí">{node.divs.length}</span>
        <span className="meters"><Bar v={sum.hp} kind="hp" title={`Průměrná síla ${pct(sum.hp)}`} /><Bar v={sum.org} kind="org" title={`Průměrná organizace ${pct(sum.org)}`} /></span>
        <span className="flags">{sum.fight > 0 && <i className="fl fight" title={`${sum.fight} v boji`}>{sum.fight}</i>}{sum.lack > 0 && <i className="fl lack" title={`${sum.lack} bez zásob`}>{sum.lack}</i>}</span>
        <span className="sub">{cmd ? `${RANK_NAMES[cmd.gen.r]} ${cmd.gen.nm}` : 'bez velitele'} · {planText(army.plan)}</span>
      </div>
      {isOpen && (
        <div className="detail">
          <CommanderRow kind="army" id={id} cmd={army.cmd} gens={gens} />
          <PlanBlock id={id} army={army} />
          <AbilityRow id={id} state={state} />
          <div className="detail-actions"><button className="sbtn danger" onClick={stop(() => disbandArmyById(id))}><Icon name="trash" size={14} />Rozpustit armádu</button><span className="muted">divize zůstanou bez armády</span></div>
          {node.divs.map((d) => <DivRow key={d} id={d} view={divisionView(state, d)} sel={selSet.has(d)} />)}
          {node.divs.length === 0 && <p className="empty">Armáda nemá žádné divize. Vyberte divize na mapě a v dolní liště je přidejte, nebo je sem přetáhněte.</p>}
        </div>
      )}
    </div>
  );
}

function GroupNode({ node, group, state, selSet, open, focus, gens }) {
  const id = node.id;
  const key = `g${id}`;
  const isOpen = open[key] !== false;
  const nDivs = node.armies.reduce((n, a) => n + a.divs.length, 0);
  const sel = nDivs > 0 && node.armies.every((a) => a.divs.every((d) => selSet.has(d)));
  const drop = useDrop('army', (ids) => moveArmiesToGroup(ids, id));
  const cmd = group.cmd ? gens.find((g) => g.id === group.cmd) : null;
  return (
    <div className="node group">
      <div className={`row head group ${sel ? 'sel' : ''} ${drop.over ? 'drop' : ''}`} {...drop.props} onClick={(e) => selectGroup(id, { add: additive(e) })}>
        <button className={`fold ${isOpen ? 'open' : ''}`} aria-label={isOpen ? 'Sbalit' : 'Rozbalit'} aria-expanded={isOpen} onClick={stop(() => setOpen(key, !isOpen))}><Icon name="chevron" size={16} /></button>
        <EditableName value={group.nm} onCommit={(t) => renameGroupTo(id, t)} />
        <span className="count" title="Počet divizí">{nDivs}</span>
        <span className="sub">{node.armies.length} {node.armies.length === 1 ? 'armáda' : node.armies.length < 5 ? 'armády' : 'armád'} · {cmd ? `${RANK_NAMES[cmd.gen.r]} ${cmd.gen.nm}` : 'bez velitele'}</span>
      </div>
      {isOpen && (
        <div className="children">
          <CommanderRow kind="group" id={id} cmd={group.cmd} gens={gens} />
          {node.armies.map((a) => <ArmyNode key={a.id} node={a} army={state.mil.armies[a.id]} state={state} selSet={selSet} open={open} focus={focus} gens={gens} />)}
          <div className="detail-actions"><button className="sbtn danger" onClick={stop(() => disbandGroupById(id))}><Icon name="trash" size={14} />Rozpustit skupinu</button><span className="muted">armády zůstanou mimo skupiny</span></div>
        </div>
      )}
    </div>
  );
}

function LooseSection({ title, hint, children, count, accept, onDrop, openKey, open }) {
  const isOpen = open[openKey] !== false;
  const drop = useDrop(accept, onDrop);
  return (
    <div className="node loose">
      <div className={`row head group ${drop.over ? 'drop' : ''}`} {...drop.props} onClick={() => setOpen(openKey, !isOpen)}>
        <button className={`fold ${isOpen ? 'open' : ''}`} aria-label={isOpen ? 'Sbalit' : 'Rozbalit'} aria-expanded={isOpen} onClick={stop(() => setOpen(openKey, !isOpen))}><Icon name="chevron" size={16} /></button>
        <span className="nm">{title}</span>
        <span className="count">{count}</span>
        <span className="sub">{hint}</span>
      </div>
      {isOpen && <div className="children">{children}</div>}
    </div>
  );
}

/** Panel Armáda: strom skupin armád → armád → divizí s plány a veliteli. */
export function ArmyPanel() {
  const state = useGameSlow((s) => s, 300);
  const sel = useUi((s) => s.selDivs);
  const open = useUi((s) => s.open);
  const focus = useUi((s) => s.armyFocus);
  const me = playerIdx(state);
  const tree = me ? armyTree(state, me) : null;
  const selSet = useMemo(() => new Set(sel), [sel]);
  const gens = me ? generalsOf(state, me) : [];
  const all = useMemo(() => {
    if (!tree) return [];
    const ids = tree.loose.divs.slice();
    for (const a of tree.loose.armies) ids.push(...a.divs);
    for (const g of tree.groups) for (const a of g.armies) ids.push(...a.divs);
    return ids;
  }, [tree]);
  const sum = useMemo(() => summarize(state, all), [state.mil.divs, all]);
  if (!me) return <div className="army-panel"><p className="empty">Jako pozorovatel nevelíte žádné armádě.</p></div>;
  const nArmies = tree.loose.armies.length + tree.groups.reduce((n, g) => n + g.armies.length, 0);
  return (
    <div className="army-panel">
      <div className="army-sum">
        <span><b>{sum.n}</b> divizí</span><span><b>{nArmies}</b> armád</span>
        <span className={sum.fight ? 'hot' : ''}><b>{sum.fight}</b> v boji</span>
        <span className={sum.lack ? 'warn' : ''}><b>{sum.lack}</b> bez zásob</span>
      </div>
      <div className="army-actions">
        <button className="sbtn" onClick={() => newArmy(true)} title="Vytvoří armádu z vybraných divizí (nebo prázdnou)"><Icon name="plus" size={14} />Armáda</button>
        <button className="sbtn" onClick={() => newGroup()} title="Vytvoří prázdnou skupinu armád"><Icon name="plus" size={14} />Skupina armád</button>
        <span className="muted hint-r">dvojklik = přejmenovat · přetažení = přesun</span>
      </div>
      <div className="side-scroll" role="tree" aria-label="Armády">
        {tree.groups.map((g) => <GroupNode key={g.id} node={g} group={state.mil.groups[g.id]} state={state} selSet={selSet} open={open} focus={focus} gens={gens} />)}
        {(tree.loose.armies.length > 0 || tree.groups.length > 0) && (
          <LooseSection title="Armády mimo skupiny" hint="přetažením do skupiny" count={tree.loose.armies.length} accept="army" onDrop={(ids) => moveArmiesToGroup(ids, 0)} openKey="loose-armies" open={open}>
            {tree.loose.armies.map((a) => <ArmyNode key={a.id} node={a} army={state.mil.armies[a.id]} state={state} selSet={selSet} open={open} focus={focus} gens={gens} />)}
          </LooseSection>
        )}
        <LooseSection title="Divize bez armády" hint="neplní žádný plán" count={tree.loose.divs.length} accept="div" onDrop={(ids) => moveDivisionsToArmy(ids, 0)} openKey="loose-divs" open={open}>
          {tree.loose.divs.map((d) => <DivRow key={d} id={d} view={divisionView(state, d)} sel={selSet.has(d)} />)}
          {tree.loose.divs.length === 0 && <p className="empty">Všechny divize patří do armád.</p>}
        </LooseSection>
      </div>
    </div>
  );
}

