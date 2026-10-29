import { useMemo } from 'react';
import { gameStore, useGame } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { COUNTRIES } from '../../data/countries.js';
import { getWorld, countryName, countryStats, formatDate, formatClock, togglePause, setSpeed, divisionCount, manpowerOf, industryOf, transportsOf, worldTension } from '../../engine/index.js';
import { setHelp, setMenuOpen, openOverview } from '../actions.js';
import { fmtInt, fmtPop } from '../format.js';

/** Datum, hodiny a ovládání času. Samostatná komponenta: s během času se překresluje jen ona. */
function Clock() {
  const tick = useGame((s) => s.tick);
  const paused = useGame((s) => s.paused);
  const speed = useGame((s) => s.speed);
  return (
    <div className="tb-time">
      <div className="tb-date">
        <b>{formatDate(tick)}</b>
        <span>{formatClock(tick)}</span>
      </div>
      <div className="tb-speed">
        <button className={`pause ${paused ? 'is-paused' : ''}`} onClick={() => gameStore.update(togglePause)} aria-label={paused ? 'Spustit čas' : 'Pozastavit čas'} title="Pauza (mezerník)">
          <Icon name={paused ? 'play' : 'pause'} size={18} />
        </button>
        <div className="bars" role="group" aria-label="Rychlost hry">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} className={i <= speed ? (paused ? 'dim' : 'on') : ''} style={{ height: 7 + i * 3.4 }}
              onClick={() => gameStore.update(setSpeed, i)} aria-label={`Rychlost ${i}`} title={`Rychlost ${i} (+ / −)`} />
          ))}
        </div>
      </div>
    </div>
  );
}

const getWorldIdx = (s) => getWorld().ownerIdx[s.player];

function Stat({ icon, label, value, opt = false }) {
  return (
    <div className={`stat ${opt === 'wide' ? 'opt wide' : opt ? 'opt' : ''}`} title={label}>
      <Icon name={icon} size={18} />
      <span><i>{label}</i><b>{value}</b></span>
    </div>
  );
}

export function TopBar() {
  const tag = useGame((s) => s.player);
  const owner = useGame((s) => s.stateOwner);
  const stats = useMemo(() => (tag ? countryStats({ stateOwner: owner }, tag) : null), [tag, owner]);
  const info = tag ? COUNTRIES[tag] : null;
  const divisions = useGame((s) => (s.player ? divisionCount(s, s.player) : 0));
  const manpower = useGame((s) => (s.player ? manpowerOf(s, s.player) : 0));
  const stab = useGame((s) => (s.player ? Math.round(s.pol.own[getWorld().ownerIdx[s.player]].stab * 100) : 0));
  const ws = useGame((s) => (s.player ? Math.round(s.pol.own[getWorld().ownerIdx[s.player]].ws * 100) : 0));
  const pp = useGame((s) => (s.player ? Math.floor(s.pol.own[getWorld().ownerIdx[s.player]].pp) : 0));
  const ind = useGame((s) => s.ind);
  const ctrl = useGame((s) => s.ctrl);
  const fac = useMemo(() => {
    const s = gameStore.getState();
    if (!s.player) return null;
    const x = industryOf(s, s.player);
    return `${x.civ} / ${x.mil} / ${x.dok}`;
  }, [tag, owner, ind, ctrl]);
  const convoys = useGame((s) => (s.player ? transportsOf(s, getWorldIdx(s)).free : 0));
  const tension = useGame((s) => Math.round(worldTension(s) * 100));
  return (
    <header className="topbar">
      <div className="tb-country">
        {tag ? <Flag tag={tag} width={48} /> : <span className="flag-none" />}
        <div className="tb-name">
          <b>{tag ? countryName(tag) : 'Pozorovatel'}</b>
          <span>{info ? `${info.leader} · ${info.government}` : 'Hra bez vlastní země'}</span>
        </div>
      </div>
      <Clock />
      <div className="tb-right">
        {stats && (
          <div className="stats">
            <Stat icon="population" label="Obyvatelé" value={fmtPop(stats.pop)} opt="wide" />
            <Stat icon="provinces" label="Provincie" value={fmtInt(stats.provinces)} opt="wide" />
            <Stat icon="victory" label="Vítězné body" value={fmtInt(stats.vp)} />
            <Stat icon="army" label="Divize" value={fmtInt(divisions)} />
            <Stat icon="recruit" label="Lidská síla" value={fmtPop(manpower / 1000)} />
            <Stat icon="shield" label="Stabilita" value={`${stab} %`} opt />
            <Stat icon="swords" label="Podpora války" value={`${ws} %`} opt />
            <Stat icon="general" label="Politická moc" value={fmtInt(pp)} />
            <Stat icon="industry" label="Továrny civ. / vojen. / loděnic" value={fac} opt />
            <Stat icon="navy" label="Volné transporty" value={fmtInt(convoys)} opt />
            <Stat icon="regions" label="Napětí ve světě" value={`${tension} %`} opt />
          </div>
        )}
        <button className="icon-btn" onClick={openOverview} aria-label="Přehled zemí" title="Přehled zemí (O)"><Icon name="population" /></button>
        <button className="icon-btn" onClick={() => setHelp(true)} aria-label="Ovládání" title="Ovládání (F1)"><Icon name="help" /></button>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Nabídka" title="Nabídka (Esc)"><Icon name="menu" /></button>
      </div>
    </header>
  );
}
