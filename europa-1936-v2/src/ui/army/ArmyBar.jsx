import { useMemo } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { getWorld, abilityOf, ABILITIES, ABILITY_IDS, PLAN_MODES, MODE_NAMES } from '../../engine/index.js';
import {
  playerIdx, selectArmy, setSelection, focusSelection, startPlanEdit, clearArmyPlan, setArmyPlanMode, armyAbility, newArmy, openPanel,
} from '../actions.js';
import { ClsIcon, Bar } from './parts.jsx';
import { Portrait } from './Portrait.jsx';
import { armyCards } from './armybar.js';
import { pct, RANK_NAMES } from './helpers.js';

const PLAN_ICON = { area: 'shield', front: 'flag', attack: 'attack' };
const PLAN_TIP = { '': 'Bez plánu', area: 'Hájí oblast', front: 'Drží linii fronty', attack: 'Útočí' };
const MODE_ICON = { careful: 'eye', balanced: 'swords', rush: 'attack' };
const MODE_TIP = {
  careful: 'Opatrně – útok až po odpočinku a naplánování',
  balanced: 'Vyváženě – útok od 65 % organizace',
  rush: 'Zteče – útok hned (od 35 % organizace)',
};
const additive = (e) => e.shiftKey || e.ctrlKey || e.metaKey;

/** Karta armády (M102): portrét velitele, zkratka, druh a počet divizí, proužky síly a organizace, ikony stavu. */
function ArmyCard({ c, color, on }) {
  const tip = [c.nm, c.gen ? `${RANK_NAMES[c.gen.r]} ${c.gen.nm}` : 'Bez velitele', `${c.n} divizí · síla ${pct(c.hp)} · organizace ${pct(c.org)}`, PLAN_TIP[c.plan],
    c.fight ? `V boji: ${c.fight}` : '', c.lack ? `Bez zásob: ${c.lack}` : ''].filter(Boolean).join('\n');
  return (
    <button className={`acard ${on ? 'on' : ''} ${c.fight ? 'fight' : ''}`} title={tip} aria-label={c.nm} aria-pressed={on}
      onClick={(e) => selectArmy(c.id, { add: additive(e) })} onDoubleClick={() => { selectArmy(c.id); focusSelection(); }}>
      <Portrait name={c.gen ? c.gen.nm : ''} rank={c.gen ? c.gen.r : ''} color={color} w={34} h={42} />
      <span className="acard-body">
        <b className="acard-nm">{c.short}</b>
        <span className="acard-n"><ClsIcon cls={c.cls} size={18} /><em>{c.n}</em></span>
        <Bar v={c.hp} kind="hp" /><Bar v={c.org} kind="org" />
      </span>
      <span className="acard-st">
        {c.plan ? <i className={`ast plan ${c.plan}`}><Icon name={PLAN_ICON[c.plan]} size={12} /></i> : null}
        {c.fight ? <i className="ast fight"><Icon name="swords" size={12} /></i> : null}
        {c.lack ? <i className="ast lack"><Icon name="supply" size={12} /></i> : null}
      </span>
    </button>
  );
}

/** Rozkazy vybrané armády (jen ikony s nápovědou): plán, režim útoku, zrušení, velitel, schopnosti. */
function ArmyOrders({ id, state }) {
  const army = state.mil.armies[id];
  const plan = army.plan;
  const act = abilityOf(state, id);
  const cp = Math.floor(state.cmd.cp[playerIdx(state)] || 0);
  return (
    <div className="aorders" role="toolbar" aria-label={`Rozkazy: ${army.nm}`}>
      <span className="ao-nm">{army.nm}</span>
      <button className={`ao ${plan && plan.k === 'area' ? 'on' : ''}`} data-tip="Hájit oblast" aria-label="Hájit oblast" onClick={() => startPlanEdit(id, 'area')}><Icon name="shield" size={18} /></button>
      <button className={`ao ${plan && plan.k === 'front' ? 'on' : ''}`} data-tip="Linie fronty a cíle útoku" aria-label="Linie fronty" onClick={() => startPlanEdit(id, 'front')}><Icon name="attack" size={18} /></button>
      {plan && plan.k === 'front' && <span className="ao-sep" />}
      {plan && plan.k === 'front' && PLAN_MODES.map((m) => (
        <button key={m} className={`ao mode ${plan.mode === m ? 'on' : ''}`} data-tip={MODE_TIP[m]} aria-label={MODE_NAMES[m]} onClick={() => setArmyPlanMode(id, m)}><Icon name={MODE_ICON[m]} size={16} /></button>
      ))}
      {plan && <button className="ao danger" data-tip="Zrušit plán" aria-label="Zrušit plán" onClick={() => clearArmyPlan(id)}><Icon name="close" size={16} /></button>}
      <span className="ao-sep" />
      <button className="ao" data-tip="Velitel a správa armád (V)" aria-label="Velitel" onClick={() => openPanel('army')}><Icon name="general" size={18} /></button>
      <span className="ao-sep" />
      {act ? <span className="ao-act" title={ABILITIES[act.id].info}><Icon name="target" size={14} />{ABILITIES[act.id].n} · {Math.max(1, Math.ceil((act.until - state.tick) / 24))} d</span>
        : ABILITY_IDS.map((k) => (
          <button key={k} className="ao abil" disabled={cp < ABILITIES[k].cost} data-tip={`${ABILITIES[k].n} – ${ABILITIES[k].info} (${ABILITIES[k].cost} VM, ${ABILITIES[k].days} d)`} aria-label={ABILITIES[k].n}
            onClick={() => armyAbility(id, k)}>{ABILITIES[k].n.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</button>
        ))}
      <span className="ao-cp" title="Velitelská moc">{cp}</span>
    </div>
  );
}

/** Lišta armád dole (M102, jako v HOI4): karty armád po skupinách, nad ní rozkazy armády, jejíž divize jsou vybrané. */
export function ArmyBar() {
  const state = useGameSlow((s) => s, 300);
  const sel = useUi((s) => s.selDivs);
  const planEdit = useUi((s) => !!s.planEdit);
  const me = playerIdx(state);
  const data = useMemo(() => armyCards(state, me), [state.mil, me]);
  if (!me || planEdit) return null;
  const color = getWorld().owners[me].color;
  const selSet = new Set(sel);
  const isOn = (c) => c.divs.length > 0 && c.divs.every((d) => selSet.has(d));
  // rozkazy: vybrané divize patří jediné vlastní armádě
  const armies = new Set(sel.map((d) => state.mil.divs[d] && state.mil.divs[d].o === me ? state.mil.divs[d].army : -1));
  const one = armies.size === 1 ? [...armies][0] : 0;
  const all = [...data.groups.flatMap((g) => g.cards), ...data.loose];
  if (!all.length && !data.free.length) return null;
  return (
    <div className="armybar-wrap">
      {one > 0 && state.mil.armies[one] && <ArmyOrders id={one} state={state} />}
      <nav className="armybar" aria-label="Armády">
        {data.groups.map((g) => (
          <section key={g.id} className="agroup" aria-label={g.nm}>
            <header title={g.gen ? `${RANK_NAMES[g.gen.r]} ${g.gen.nm}` : 'Bez polního maršála'}><Icon name="army" size={12} />{g.nm}</header>
            <div className="acards">{g.cards.map((c) => <ArmyCard key={c.id} c={c} color={color} on={isOn(c)} />)}</div>
          </section>
        ))}
        {data.loose.length > 0 && (
          <section className="agroup loose" aria-label="Armády mimo skupiny">
            <header><Icon name="army" size={12} />Samostatné</header>
            <div className="acards">{data.loose.map((c) => <ArmyCard key={c.id} c={c} color={color} on={isOn(c)} />)}</div>
          </section>
        )}
        {data.free.length > 0 && (
          <button className="acard free" title={`${data.free.length} divizí bez armády – kliknutím je vyberete`} aria-label="Divize bez armády" onClick={() => setSelection(data.free)}>
            <span className="free-n">{data.free.length}</span><Icon name="recruit" size={16} />
          </button>
        )}
        {sel.length > 0 && one === 0 && (
          <button className="acard add" title="Nová armáda z vybraných divizí" aria-label="Nová armáda z výběru" onClick={() => newArmy(true)}><Icon name="plus" size={22} /></button>
        )}
      </nav>
    </div>
  );
}
