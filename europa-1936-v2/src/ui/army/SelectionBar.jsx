import { useEffect, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { armyTree, divisionView, ARMY, getWorld } from '../../engine/index.js';
import {
  playerIdx, ownSelected, newArmy, addSelectionToArmy, removeSelectionFromArmy, stopSelected, disbandSelected, focusSelection, clearSelection,
} from '../actions.js';
import { fmtNum, plural } from '../format.js';
import { ClsIcon, Bar, Status } from './parts.jsx';
import { summarize, pct, provName, CLS_NAMES, RANK_NAMES } from './helpers.js';

function Fact({ label, children, title }) {
  return <span className="fact" title={title}><i>{label}</i><b>{children}</b></span>;
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

/** Dolní lišta s popisem vybraných jednotek a rychlými povely (vlastní jednotky) nebo jen údaji (cizí). */
export function SelectionBar() {
  const sel = useUi((s) => s.selDivs);
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

  return (
    <section className="panel selbar" aria-label="Vybrané jednotky">
      <header>
        {view ? <ClsIcon cls={view.cls} size={34} /> : <span className="sel-count">{ids.length}</span>}
        <div className="sel-title">
          <b>{view ? view.name : `${ids.length} ${plural(ids.length, 'divize', 'divize', 'divizí')}`}</b>
          <span>
            {mixedOwners ? 'Různé země' : <><Flag tag={owner.tag} width={18} /> {owner.name}</>}
            {view ? ` · ${view.tplName}` : ''}
            {view ? ` · ${provName(view.p)}` : ''}
          </span>
        </div>
        <button className="icon-btn sm" onClick={clearSelection} aria-label="Zrušit výběr" title="Zrušit výběr (Esc)"><Icon name="close" size={16} /></button>
      </header>
      <div className="sel-meters">
        <div><i>Síla</i><Bar v={sum.hp} kind="hp" title={`Síla ${pct(sum.hp)}`} /><b>{pct(sum.hp)}</b></div>
        <div><i>Organizace</i><Bar v={sum.org} kind="org" title={`Organizace ${pct(sum.org)}`} /><b>{pct(sum.org)}</b></div>
      </div>
      {view ? (
        <div className="sel-facts">
          <Fact label="Útok" title="Útok na měkké / tvrdé cíle">{fmtNum(view.stats.soft, 0)} / {fmtNum(view.stats.hard, 0)}</Fact>
          <Fact label="Obrana">{fmtNum(view.stats.def, 0)}</Fact>
          <Fact label="Průraz">{fmtNum(view.stats.brk, 0)}</Fact>
          <Fact label="Rychlost">{fmtNum(view.stats.speed, 0)}</Fact>
          <Fact label="Zkušenost">{view.xpName}</Fact>
          {view.dig >= 1 && <Fact label="Zakopání" title="Stupně zakopání (obrana +4 % za stupeň)">{Math.floor(view.dig)} / 5</Fact>}
          <Fact label="Zásobování" title="Podíl dodaných zásob"><span className={view.supply < 0.7 ? 'bad' : ''}>{pct(view.supply)}</span></Fact>
          <Status status={view.status} supply={view.supply} grace={view.graceHours} />
        </div>
      ) : (
        <div className="sel-facts">
          {Object.entries(sum.classes).map(([k, n]) => <span key={k} className="fact cls" title={CLS_NAMES[k]}><ClsIcon cls={k} size={22} /><b>{n}</b></span>)}
          {sum.fight > 0 && <Fact label="V boji">{sum.fight}</Fact>}
          {sum.moving > 0 && <Fact label="Na cestě">{sum.moving}</Fact>}
          {sum.retreat > 0 && <Fact label="Ústup">{sum.retreat}</Fact>}
          {sum.lack > 0 && <Fact label="Bez zásob"><span className="bad">{sum.lack}</span></Fact>}
        </div>
      )}
      {mine ? (
        <>
          <p className="sel-army">
            {army ? <><Icon name="army" size={14} /> {army.nm}{cmd ? ` · ${RANK_NAMES[cmd.r]} ${cmd.nm}` : ' · bez velitele'}</> : armyId === 0 ? 'Bez armády – neplní žádný plán.' : 'Divize z různých armád.'}
          </p>
          <div className="sel-actions">
            <button className="sbtn" onClick={() => newArmy(true)} title="Vytvoří novou armádu z vybraných divizí"><Icon name="plus" size={14} />Nová armáda</button>
            <button className="sbtn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu"><Icon name="army" size={14} />Do armády<Icon name="chevron" size={14} /></button>
            <button className="sbtn" disabled={!moving} onClick={() => stopSelected()} title="Zastaví pochod (X)"><Icon name="stop" size={14} />Zastavit</button>
            <button className="sbtn" onClick={focusSelection} title="Přesune pohled na vybrané divize (F)"><Icon name="focus" size={14} />Zaměřit</button>
            {armed ? (
              <>
                <button className="sbtn danger" onClick={() => { setArmed(false); disbandSelected(); }} autoFocus>Opravdu rozpustit</button>
                <button className="sbtn" onClick={() => setArmed(false)}>Zpět</button>
              </>
            ) : <button className="sbtn" onClick={() => setArmed(true)} title="Rozpustí vybrané divize (lidská síla se vrátí jen z části)"><Icon name="trash" size={14} />Rozpustit</button>}
          </div>
          {menu && <ArmyMenu state={state} me={me} ids={ownSelected(state, ids)} onClose={() => setMenu(false)} />}
        </>
      ) : (
        <p className="sel-army"><Icon name="flag" size={14} /> Cizí jednotky – jen k prohlídce.</p>
      )}
    </section>
  );
}
