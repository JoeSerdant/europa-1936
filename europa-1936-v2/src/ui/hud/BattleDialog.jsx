import { useMemo } from 'react';
import { useUi, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { ClsIcon, Bar } from '../army/parts.jsx';
import { RANK_NAMES, SKILLS, provName } from '../army/helpers.js';
import { battleView, getWorld, TERRAIN_CS } from '../../engine/index.js';
import { closeBattle } from '../actions.js';
import { fmtInt } from '../format.js';

const pct = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)} %`;

function Commander({ cmd }) {
  if (!cmd) return <p className="muted bt-cmd">Bez velitele</p>;
  return (
    <p className="bt-cmd"><b>{RANK_NAMES[cmd.r]} {cmd.nm}</b>
      <span className="skills">{SKILLS.map(([k, n]) => <i key={k} title={`${n} ${cmd[k] || 1}`}>{k === 'pl' ? 'Pl' : k === 'lg' ? 'Lg' : k === 'mn' ? 'Mn' : k === 'a' ? 'Ú' : 'O'}{cmd[k] || 1}</i>)}</span>
    </p>
  );
}

function Side({ title, side, tone }) {
  const w = getWorld();
  const o = side.o ? w.owners[side.o] : null;
  const sorted = [...side.units].sort((a, b) => (b.front - a.front) || (b.hp - a.hp));
  return (
    <section className={`bt-side ${tone}`} aria-label={title}>
      <header>{o ? <Flag tag={o.tag} width={34} /> : null}<div><h3>{title}</h3><span className="muted">{o ? o.name : '–'}</span></div></header>
      <Commander cmd={side.cmd} />
      <div className="bt-tot">
        <span title="Součet síly divizí"><i>Síla</i><b>{fmtInt(Math.round(side.hp))} / {fmtInt(Math.round(side.hpMax))}</b></span>
        <span title="Průměrná organizace"><i>Organizace</i><b>{pct(side.org)}</b></span>
        <span><i>Divizí</i><b>{side.units.length}</b></span>
      </div>
      <ul className="bt-units">
        {sorted.map((u) => (
          <li key={u.id} className={u.front ? 'front' : 'reserve'}>
            <ClsIcon cls={u.cls} size={26} />
            <span className="nm" title={u.tplName}>{u.name}</span>
            <span className="meters"><Bar v={u.hpPct} kind="hp" title={`Síla ${pct(u.hpPct)}`} /><Bar v={u.orgPct} kind="org" title={`Organizace ${pct(u.orgPct)}`} /></span>
            <span className="muted">{u.front ? 'fronta' : 'záloha'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Okno bitvy (M61): provincie a terén, postup útočníků, obě strany s veliteli a divizemi (fronta / záloha). Otevírá se z karty provincie. */
export function BattleDialog() {
  const id = useUi((s) => s.battle);
  const state = useGameSlow((s) => (id ? s : null), 500);
  const v = useMemo(() => (id && state ? battleView(state, id) : null), [id, state && state.mil.divs, state && state.mil.battles]);
  if (!id) return null;
  return (
    <div className="scrim" onClick={closeBattle}>
      <div className="panel dialog wide battle-dialog" role="dialog" aria-label="Bitva" onClick={(e) => e.stopPropagation()}>
        <header className="sv-head"><h2><Icon name="swords" size={20} />{v ? `Bitva o ${provName(v.p)}` : 'Bitva skončila'}</h2><button className="icon-btn" onClick={closeBattle} aria-label="Zavřít" title="Zavřít (Esc)"><Icon name="close" size={18} /></button></header>
        {v ? (
          <>
            <div className="bt-mid">
              <span className="muted">{TERRAIN_CS[v.terrain] || 'Terén'} · trvá {Math.floor(v.hrs / 24)} d {v.hrs % 24} h</span>
              <div className="bt-adv" role="meter" aria-label="Převaha útočníků" aria-valuenow={Math.round(v.adv * 100)} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: pct(v.adv) }} /><b>{pct(v.adv)}</b><u />
              </div>
              <span className="muted">{v.adv >= 0.5 ? 'Útočníci mají navrch.' : 'Obránci se drží.'}</span>
            </div>
            <div className="bt-cols">
              <Side title="Útočník" side={v.att} tone="att" />
              <Side title="Obránce" side={v.dep} tone="dep" />
            </div>
          </>
        ) : <p className="empty">Bitva už neprobíhá.</p>}
      </div>
    </div>
  );
}
