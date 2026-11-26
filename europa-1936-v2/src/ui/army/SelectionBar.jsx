import { useEffect, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { armyTree, divisionView, ARMY, getWorld, marchEta, NAV } from '../../engine/index.js';
import { Portrait } from './Portrait.jsx';
import {
  playerIdx, ownSelected, newArmy, addSelectionToArmy, removeSelectionFromArmy, stopSelected, disbandSelected, focusSelection, clearSelection, toggleDivision, toggleRailMode,
} from '../actions.js';
import { fmtNum, plural, fmtEta } from '../format.js';
import { ClsIcon, Bar, Status } from './parts.jsx';
import { summarize, pct, CLS_NAMES, RANK_NAMES } from './helpers.js';

/** Údaj jako ikona s číslem (M102: méně textu, název je v nápovědě). */
function Chip({ icon, title, children, bad = false }) {
  return <span className={`chip ${bad ? 'bad' : ''}`} title={title}><Icon name={icon} size={15} /><b>{children}</b></span>;
}

/** Nabídka „Do armády“: seznam armád hráče, do kterých lze vybrané divize přesunout (vložená do lišty, ne plovoucí – panel má seříznuté rohy). */
function ArmyMenu({ state, me, ids, onClose }) {
  const tree = armyTree(state, me);
  const list = [];
  for (const g of tree.groups) for (const a of g.armies) list.push({ id: a.id, n: a.divs.length, group: state.mil.groups[g.id].nm });
  for (const a of tree.loose.armies) list.push({ id: a.id, n: a.divs.length, group: '' });
  const inArmy = (id) => ids.every((x) => state.mil.divs[x] && state.mil.divs[x].army === id);
  const anyArmy = ids.some((x) => state.mil.divs[x] && state.mil.divs[x].army);
  return (
    <div className="army-menu" role="menu" aria-label="Přidat do armády">
      {list.length === 0 && <p className="muted">Zatím nemáte žádnou armádu. Použijte „Nová armáda“.</p>}
      {list.map((a) => {
        const full = a.n + ids.length > ARMY.ARMY_CAP && !inArmy(a.id);
        return (
          <button key={a.id} role="menuitem" disabled={inArmy(a.id) || full} onClick={() => { addSelectionToArmy(a.id); onClose(); }}
            title={full ? `Armáda smí mít nejvýš ${ARMY.ARMY_CAP} divizí` : undefined}>
            <b>{state.mil.armies[a.id].nm}</b><span>{a.group ? `${a.group} · ` : ''}{a.n} {plural(a.n, 'divize', 'divize', 'divizí')}</span>
          </button>
        );
      })}
      {anyArmy && <button role="menuitem" className="off" onClick={() => { removeSelectionFromArmy(); onClose(); }}><b>Vyřadit z armády</b><span>divize zůstanou bez velení</span></button>}
    </div>
  );
}

/** Mini karta divize v mřížce výběru: značka druhu a proužky síly a organizace; klik vybere jen ji, Shift ji odebere. */
function MiniDiv({ id, state }) {
  const v = divisionView(state, id);
  return (
    <button className={`mdiv ${v.status}`} title={`${v.name} · ${v.tplName}\nSíla ${pct(v.hpPct)} · organizace ${pct(v.orgPct)}`} aria-label={v.name}
      onClick={(e) => toggleDivision(id, e.shiftKey || e.ctrlKey || e.metaKey)}>
      <ClsIcon cls={v.cls} size={22} />
      <Bar v={v.hpPct} kind="hp" /><Bar v={v.orgPct} kind="org" />
      {v.status === 'fighting' && <i className="mdiv-f"><Icon name="swords" size={10} /></i>}
    </button>
  );
}

const MINI_MAX = 36;

/** Dolní lišta vybraných jednotek (M102): u jedné divize ikony s čísly, u více mřížka mini karet; povely jen ikonami s nápovědou. */
export function SelectionBar() {
  const sel = useUi((s) => s.selDivs);
  const railMode = useUi((s) => s.railMode);
  const state = useGameSlow((s) => s, 300);
  const [menu, setMenu] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => { setMenu(false); setArmed(false); }, [sel]);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const ids = sel.filter((id) => state.mil.divs[id]);
  if (!ids.length) return null;
  const me = playerIdx(state);
  const w = getWorld();
  const first = state.mil.divs[ids[0]];
  const mine = !!me && ids.every((id) => state.mil.divs[id].o === me);
  const sum = summarize(state, ids);
  const view = ids.length === 1 ? divisionView(state, ids[0]) : null;
  const owner = w.owners[first.o];
  const moving = ids.some((id) => state.mil.divs[id].path.length > 0);
  const armies = new Set(ids.map((id) => state.mil.divs[id].army));
  const armyId = armies.size === 1 ? [...armies][0] : -1;
  const army = armyId > 0 ? state.mil.armies[armyId] : null;
  const cmd = army && army.cmd ? state.mil.gens[army.cmd] : null;
  const mixedOwners = sum.owners.size > 1;
  const march = mine && moving ? marchEta(state, ids) : null;   // F3: cíl a odhad příjezdu nejpomalejší divize
  const inPort = mine ? ids.map((id) => state.mil.divs[id]).filter((d) => d && w.portLevel[d.p] > 0) : [];   // S9: příprava vylodění v přístavu
  const prep = inPort.length ? Math.min(...inPort.map((d) => d.ip || 0)) : -1;

  return (
    <section className="panel selbar" aria-label="Vybrané jednotky">
      <header>
        {view ? <ClsIcon cls={view.cls} size={34} /> : <span className="sel-count">{ids.length}</span>}
        <div className="sel-title">
          <b>{view ? view.name : `${ids.length} ${plural(ids.length, 'divize', 'divize', 'divizí')}`}</b>
          <span>{mixedOwners ? 'Různé země' : <Flag tag={owner.tag} width={18} />}{view ? ` ${view.tplName}` : ''}{view && first.vo ? <em className="sel-vol" title={`Dobrovolníci země ${w.owners[first.vo].name}: bojují pod velením země ${owner.name}, doplňuje je jejich původní země`}><Flag tag={w.owners[first.vo].tag} width={16} /> dobrovolníci</em> : null}</span>
        </div>
        {view && <Status status={view.status} supply={view.supply} grace={view.graceHours} />}
        {mine && army && (
          <span className="sel-army-chip" title={`${army.nm}${cmd ? ` · ${RANK_NAMES[cmd.r]} ${cmd.nm}` : ' · bez velitele'}`}>
            <Portrait name={cmd ? cmd.nm : ''} rank={cmd ? cmd.r : ''} color={owner.color} w={22} h={27} />{army.nm}
          </span>
        )}
        <button className="icon-btn sm" onClick={clearSelection} aria-label="Zrušit výběr" title="Zrušit výběr (Esc)"><Icon name="close" size={16} /></button>
      </header>
      <div className="sel-meters">
        <div title={`Síla ${pct(sum.hp)}`}><Icon name="army" size={15} /><Bar v={sum.hp} kind="hp" /><b>{pct(sum.hp)}</b></div>
        <div title={`Organizace ${pct(sum.org)}`}><Icon name="flag" size={15} /><Bar v={sum.org} kind="org" /><b>{pct(sum.org)}</b></div>
        {prep >= 0 && (
          <div className="sel-prep" title={`Příprava vylodění ${pct(prep)} (nejméně připravená divize v přístavu). Na nepřátelské pobřeží lze vyplout od ${pct(NAV.PREP_MIN)}; čím lepší příprava, tím menší ztráta organizace při vylodění. Divize se připravuje, když stojí ve vlastním přístavu.`}>
            <Icon name="navy" size={15} /><Bar v={prep} kind="org" /><b>{pct(prep)}</b>
          </div>
        )}
      </div>
      {view ? (
        <div className="sel-chips">
          <Chip icon="attack" title="Útok na měkké cíle (pěchota)">{fmtNum(view.stats.soft, 0)}</Chip>
          <Chip icon="hardatk" title="Útok na tvrdé cíle (tanky)">{fmtNum(view.stats.hard, 0)}</Chip>
          <Chip icon="shield" title="Obrana">{fmtNum(view.stats.def, 0)}</Chip>
          <Chip icon="pierce" title="Průraz (útočná výdrž)">{fmtNum(view.stats.brk, 0)}</Chip>
          <Chip icon="speed" title="Rychlost (km/h)">{fmtNum(view.stats.speed, 0)}</Chip>
          <Chip icon="xp" title={`Zkušenost: ${view.xpName}`}><span className="xp-pips">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={view.xpLevel >= i ? 'on' : ''} />)}</span></Chip>
          {view.dig >= 1 && <Chip icon="dig" title="Zakopání (obrana +4 % za stupeň)">{Math.floor(view.dig)}/5</Chip>}
          <Chip icon="supply" title="Zásobování" bad={view.supply < 0.7}>{pct(view.supply)}</Chip>
        </div>
      ) : (
        <>
          <div className="sel-chips">
            {Object.entries(sum.classes).map(([k, n]) => <span key={k} className="chip" title={CLS_NAMES[k]}><ClsIcon cls={k} size={20} /><b>{n}</b></span>)}
            {sum.fight > 0 && <Chip icon="swords" title="V boji">{sum.fight}</Chip>}
            {sum.moving > 0 && <Chip icon="speed" title="Na pochodu">{sum.moving}</Chip>}
            {sum.retreat > 0 && <Chip icon="back" title="Ustupují" bad>{sum.retreat}</Chip>}
            {sum.lack > 0 && <Chip icon="supply" title="Bez zásob" bad>{sum.lack}</Chip>}
          </div>
          <div className="mdivs">
            {ids.slice(0, MINI_MAX).map((id) => <MiniDiv key={id} id={id} state={state} />)}
            {ids.length > MINI_MAX && <span className="mdiv more">+{ids.length - MINI_MAX}</span>}
          </div>
        </>
      )}
      {march && (march.hours >= 0 || march.fighting > 0) && (
        <div className="sel-march" title="Odhad podle rychlosti, terénu, počasí a železnice; bitvy cestou pochod prodlouží">
          <Icon name="speed" size={15} />
          {march.hours >= 0 ? <span>{ids.some((id) => state.mil.divs[id].rd) ? 'Vlakem do ' : 'Pochod do '}<b>{w.provName(march.dest)}</b> · příjezd asi za <b>{fmtEta(march.hours)}</b></span> : <span>Útok probíhá</span>}
          {march.fighting > 0 && march.hours >= 0 ? <em>{march.fighting} v boji</em> : null}
        </div>
      )}
      {mine && (
        <div className="sel-actions icons" role="toolbar" aria-label="Povely">
          <button className="ib" data-tip="Nová armáda z výběru" aria-label="Nová armáda" onClick={() => newArmy(true)}><Icon name="plus" size={18} /></button>
          <button className={`ib ${menu ? 'on' : ''}`} data-tip="Přesunout do armády" aria-label="Do armády" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu"><Icon name="merge" size={18} /></button>
          <button className="ib" data-tip="Zastavit pochod (X)" aria-label="Zastavit" disabled={!moving} onClick={() => stopSelected()}><Icon name="stop" size={18} /></button>
          <button className={`ib ${railMode ? 'on' : ''}`} data-tip="Přesun po železnici: pak pravým tlačítkem na cíl (nebo Alt + pravé tlačítko)" aria-label="Přesun po železnici" aria-pressed={railMode} onClick={toggleRailMode}><Icon name="road" size={18} /></button>
          <button className="ib" data-tip="Zaměřit (F)" aria-label="Zaměřit" onClick={focusSelection}><Icon name="focus" size={18} /></button>
          {armed
            ? <button className="ib danger on" data-tip="Opravdu rozpustit – klikněte znovu" aria-label="Opravdu rozpustit" autoFocus onClick={() => { setArmed(false); disbandSelected(); }}><Icon name="check" size={18} /></button>
            : <button className="ib danger" data-tip="Rozpustit divize" aria-label="Rozpustit" onClick={() => setArmed(true)}><Icon name="trash" size={18} /></button>}
        </div>
      )}
      {mine && menu && <ArmyMenu state={state} me={me} ids={ownSelected(state, ids)} onClose={() => setMenu(false)} />}
    </section>
  );
}
