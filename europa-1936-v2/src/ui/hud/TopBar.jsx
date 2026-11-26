import { useEffect, useMemo, useRef, useState } from 'react';
import { gameStore, useGame, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { COUNTRIES } from '../../data/countries.js';
import { getWorld, countryName, countryStats, formatDate, formatClock, togglePause, setSpeed, divisionCount, manpowerOf, industryOf, transportsOf, worldTension, fuelOf, SPEEDS, FOCUS_BY_ID, researchOf } from '../../engine/index.js';
import { setHelp, setMenuOpen, openOverview, togglePanel, playerIdx } from '../actions.js';
import { fmtInt, fmtPop, fmtSpeed } from '../format.js';
import { uiScale } from '../scale.js';
import { targetBreakdown, ppBreakdown, manBreakdown, facBreakdown, fuelBreakdown, convoyBreakdown, logBreakdown } from './breakdown.js';
import { logRatios } from '../../engine/army/logistics.js';

/** UI2: bublina s rozpisem hodnoty (jako v HOI4) – titulek, hodnota s cílem, řádky zdrojů, dopady a popis. Počítá se až při najetí myší. */
function StatTip({ b, at }) {
  if (!b) return null;
  return (
    <div className="stat-tip" role="tooltip" style={{ left: at.x, top: at.y }}>
      <b className="st-title">{b.title}</b>
      {b.target != null ? <span className="st-now">Nyní {Math.round(b.value * 100)} % · cíl {Math.round(b.target * 100)} %</span> : null}
      <dl>{b.rows.map((r, i) => <div key={i}><dt>{r.n}</dt><dd className={r.tone || ''}>{r.v}</dd></div>)}</dl>
      {b.effects ? <><b className="st-sub">Dopady</b><dl>{b.effects.map((r, i) => <div key={i}><dt>{r.n}</dt><dd className={r.tone || ''}>{r.v}</dd></div>)}</dl></> : null}
      <p>{b.text}</p>
    </div>
  );
}

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
              onClick={() => gameStore.update(setSpeed, i)} aria-label={`Rychlost ${i}`} title={`Rychlost ${i}: ${fmtSpeed(SPEEDS[i])} (+ / −)`} />
          ))}
        </div>
      </div>
    </div>
  );
}

const getWorldIdx = (s) => getWorld().ownerIdx[s.player];

/** Kruhový ukazatel postupu (SVG). */
function Ring({ v, size = 44, children }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r;
  return (
    <span className="tb-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={r} className="bg" /><circle cx={size / 2} cy={size / 2} r={r} className="fg" style={{ strokeDasharray: `${c * Math.max(0, Math.min(1, v))} ${c}` }} /></svg>
      {children}
    </span>
  );
}

/** UI jako v HOI4: národní cíl vedle vlajky – kruh postupu, název a zbývající dny; klik otevře strom cílů. */
function FocusWidget() {
  const v = useGameSlow((s) => {
    const me = playerIdx(s);
    if (!me) return '';
    const c = s.nat.own[me].cur, f = c && FOCUS_BY_ID[c.id];
    return f ? `${f.n}|${Math.min(1, c.p / Math.max(1, f.days)).toFixed(3)}|${Math.max(0, Math.ceil(f.days - c.p))}` : '-';
  }, 900);
  if (!v) return null;
  const [n, p, d] = v === '-' ? ['Vyberte národní cíl', 0, ''] : v.split('|');
  return (
    <button className={`tb-focus ${v === '-' ? 'idle' : ''}`} onClick={() => togglePanel('nat')} title={v === '-' ? 'Neplní se žádný národní cíl – otevřít strom cílů (C)' : `Národní cíl: ${n} · zbývá ${d} dní (C)`}>
      <Ring v={+p}><Icon name="flag" size={18} /></Ring>
      <span><b>{n}</b><i>{d ? `${d} dní` : 'žádný cíl'}</i></span>
    </button>
  );
}

/** UI jako v HOI4: výzkumné sloty jako malé dlaždice s postupem; prázdný slot bliká. Klik otevře výzkum. */
function ResearchWidget() {
  const v = useGameSlow((s) => {
    const me = playerIdx(s);
    if (!me) return '';
    return researchOf(s, me).slots.map((x) => (x.id ? `${Math.min(1, x.p / Math.max(1, x.tech.days)).toFixed(2)}:${x.tech.n}:${Math.max(0, Math.ceil(x.eta))}` : '-')).join('|');
  }, 900);
  if (!v) return null;
  const slots = v.split('|');
  return (
    <button className="tb-research" onClick={() => togglePanel('research')} title="Výzkum (W)" aria-label="Výzkum">
      <Icon name="research" size={16} />
      <span className="tb-slots">
        {slots.map((x, i) => {
          if (x === '-') return <i key={i} className="free" title="Volný výzkumný slot" />;
          const [p, n, eta] = x.split(':');
          return <i key={i} title={`${n} · ${eta} dní`}><em style={{ height: `${Math.round(+p * 100)}%` }} /></i>;
        })}
      </span>
    </button>
  );
}

/** M101: změna číselné hodnoty – krátké bliknutí a vyletující rozdíl (jen když je změna aspoň `min`). */
function useDelta(num, min) {
  const prev = useRef(num), seq = useRef(0);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = num;
    if (num == null || p == null || Math.abs(num - p) < min) return undefined;
    const k = ++seq.current;
    setFx({ k, d: num - p });
    const t = setTimeout(() => setFx((f) => (f && f.k === k ? null : f)), 1700);
    return () => clearTimeout(t);
  }, [num, min]);
  return fx;
}

function Stat({ icon, label, value, opt = false, hint = '', num = null, min = 1, unit = '', tip = null }) {
  const fx = useDelta(num, min);
  const sign = fx ? (fx.d > 0 ? 'up' : 'down') : '';
  const [open, setOpen] = useState(null);
  const enter = (e) => {
    if (!tip) return;
    const r = e.currentTarget.getBoundingClientRect(), k = uiScale();
    const x = Math.min(r.left / k, window.innerWidth / k - 380);
    setOpen({ x: Math.max(6, x), y: r.bottom / k + 6 });
  };
  const s = open && tip ? gameStore.getState() : null;
  const o = s && s.player ? getWorld().ownerIdx[s.player] : 0;
  return (
    <div className={`stat ${opt === 'wide' ? 'opt wide' : opt ? 'opt' : ''} ${sign}`} title={tip ? undefined : hint || label} aria-label={label} onPointerEnter={enter} onPointerLeave={() => setOpen(null)}>
      <Icon name={icon} size={18} />
      <span><i>{label}</i><b key={fx ? fx.k : 0}>{value}</b></span>
      {fx && <em key={fx.k} className={`stat-fly ${sign}`}>{fx.d > 0 ? '+' : '−'}{fmtInt(Math.abs(fx.d))}{unit}</em>}
      {o ? <StatTip b={tip(s, o)} at={open} /> : null}
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
  const cp = useGame((s) => (s.player ? Math.floor(s.cmd.cp[getWorld().ownerIdx[s.player]]) : 0));
  const pp = useGame((s) => (s.player ? Math.floor(s.pol.own[getWorld().ownerIdx[s.player]].pp) : 0));
  const ind = useGame((s) => s.ind);
  const ctrl = useGame((s) => s.ctrl);
  const fac = useMemo(() => {
    const s = gameStore.getState();
    if (!s.player) return null;
    const x = industryOf(s, s.player);
    return `${x.civ} / ${x.mil} / ${x.dok}`;
  }, [tag, owner, ind, ctrl]);
  const facN = fac ? fac.split(' / ').reduce((a, x) => a + Number(x), 0) : null;
  const convoys = useGame((s) => (s.player ? transportsOf(s, getWorldIdx(s)).free : 0));
  const xp = useGame((s) => { const e = s.player ? s.doc.own[getWorld().ownerIdx[s.player]] : null; return e ? `${Math.floor(e.xp.land)} / ${Math.floor(e.xp.air)} / ${Math.floor(e.xp.sea)}` : ''; });
  const fuel = useGame((s) => { if (!s.player) return ''; const f = fuelOf(s, getWorldIdx(s)); return `${Math.floor(f.stock)}|${f.gain.toFixed(1)}|${f.use.toFixed(1)}|${f.low ? 1 : 0}`; });
  const [fuelStock, fuelGain, fuelUse, fuelLow] = fuel ? fuel.split('|') : [];
  const tension = useGame((s) => Math.round(worldTension(s) * 100));
  const logi = useGame((s) => { if (!s.player) return 100; const r = logRatios(s, getWorld().ownerIdx[s.player]); return Math.round(Math.min(r.tr, r.tk) * 100); });
  return (
    <header className="topbar">
      <div className="tb-country">
        {tag ? <button className="tb-flag" onClick={() => togglePanel('politics')} title="Vláda (Q)" aria-label="Vláda"><Flag tag={tag} width={58} /></button> : <span className="flag-none" />}
        <div className="tb-name">
          <b>{tag ? countryName(tag) : 'Pozorovatel'}</b>
          <span>{info ? `${info.leader} · ${info.government}` : 'Hra bez vlastní země'}</span>
        </div>
      </div>
      {tag && <FocusWidget />}
      {tag && <ResearchWidget />}
      <div className="tb-right">
        {stats && (
          <div className="stats">
            <Stat icon="population" label="Obyvatelé" value={fmtPop(stats.pop)} opt="wide" />
            <Stat icon="provinces" label="Provincie" value={fmtInt(stats.provinces)} opt="wide" />
            <Stat icon="victory" label="Vítězné body" value={fmtInt(stats.vp)} num={stats.vp} />
            <Stat icon="army" label="Divize" value={fmtInt(divisions)} num={divisions} />
            <Stat icon="recruit" label="Lidská síla" value={fmtPop(manpower / 1000)} tip={manBreakdown} />
            <Stat icon="shield" label="Stabilita" value={`${stab} %`} num={stab} min={3} unit=" %" opt tip={(st, o) => targetBreakdown(st, o, 'stab')} />
            <Stat icon="swords" label="Podpora války" value={`${ws} %`} num={ws} min={3} unit=" %" opt tip={(st, o) => targetBreakdown(st, o, 'ws')} />
            <Stat icon="general" label="Politická moc" value={fmtInt(pp)} num={pp} min={10} tip={ppBreakdown} />
            <Stat icon="army" label="Velitelská moc" value={fmtInt(cp)} opt />
            <Stat icon="industry" label="Továrny civ. / vojen. / loděnic" value={fac} num={facN} opt tip={facBreakdown} />
            <Stat icon="general" label="Zkušenosti: armáda / letectvo / námořnictvo" value={xp} opt="wide" />
            <Stat icon="navy" label="Volné transporty" value={fmtInt(convoys)} opt tip={convoyBreakdown} />
            <Stat icon="road" label="Logistika" value={`${logi} %`} num={logi} min={5} unit=" %" opt tip={logBreakdown} />
            {fuel && <Stat icon="supply" label="Palivo" hint={`Palivo: zásoba ${fuelStock}, výroba ${fuelGain} a spotřeba ${fuelUse} za den${fuelLow === '1' ? ' (nedostatek)' : ''}`} value={fuelStock} opt tip={fuelBreakdown} />}
            <Stat icon="regions" label="Napětí ve světě" value={`${tension} %`} num={tension} min={3} unit=" %" opt />
          </div>
        )}
        <button className="icon-btn" onClick={openOverview} aria-label="Přehled zemí" title="Přehled zemí (O)"><Icon name="population" /></button>
        <button className="icon-btn" onClick={() => setHelp(true)} aria-label="Ovládání" title="Ovládání (F1)"><Icon name="help" /></button>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Nabídka" title="Nabídka (Esc)"><Icon name="menu" /></button>
      </div>
      <Clock />
    </header>
  );
}
