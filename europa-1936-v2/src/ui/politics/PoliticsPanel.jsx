import { useState } from 'react';
import { useGameSlow } from '../store.js';
import { Portrait } from '../army/Portrait.jsx';
import { Icon } from '../common/Icon.jsx';
import { politicsOf, focusTree, spiritsOf, ADV_SLOTS, nextElection, formatDate, occupiedBy, occLawOf, hasCollab, collabBlock, OCC_LAWS, OCC_LAW_IDS, getWorld, mechsOf, MECHS, SPIRITS } from '../../engine/index.js';
import { COUNTRIES, IDEOLOGIES } from '../../data/countries.js';
import { Flag } from '../common/Flag.jsx';
import { playerIdx, changeLaw, hireAdv, dismissAdv, backParty, changeOccLaw, makeCollab, togglePanel } from '../actions.js';
import { fmtNum } from '../format.js';
import { Screen } from '../common/Screen.jsx';

const pct = (v) => `${Math.round(v * 100)} %`;
const MODS = { stab: 'stabilita', ws: 'podpora války', cons: 'spotřební zboží', build: 'stavby', prod: 'výroba', extract: 'těžba', imp: 'cena dovozu', man: 'lidská síla', research: 'výzkum' };
const MODS_ARMY = { atk: 'útok divizí', def: 'obrana divizí', planCap: 'strop plánování', planGain: 'rychlost plánování', supUse: 'spotřeba zásob', speed: 'rychlost divizí', orgRegen: 'obnova organizace', atkArm: 'útok obrněných', atkInf: 'útok pěchoty', defInf: 'obrana pěchoty', hillAtk: 'útok v kopcích', hillDef: 'obrana v kopcích' };
const MODS_DOC = { ...MODS_ARMY, fire: 'palba flotil', raid: 'nájezdy na konvoje', escort: 'krytí konvojů', patrol: 'síla hlídek', cas: 'podpora bojů ze vzduchu', bomb: 'bombardování' };   // F4: náčelníci štábů
const modText = (mod, army, doc) => [...Object.entries(mod || {}).map(([k, v]) => [MODS[k], v]), ...Object.entries(army || {}).map(([k, v]) => [MODS_ARMY[k], v]), ...Object.entries(doc || {}).map(([k, v]) => [MODS_DOC[k] || k, v])].map(([n, v]) => `${n} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`).join(', ');

function Meter({ label, value, target, hint, cls }) {
  return (
    <div className="pol-meter" title={hint}>
      <span><i>{label}</i><b>{pct(value)}</b><em>{target > value + 0.004 ? '▲' : target < value - 0.004 ? '▼' : ''} cíl {pct(target)}</em></span>
      <span className={`bar ${cls}`}><i style={{ width: `${(value * 100).toFixed(1)}%` }} /></span>
    </div>
  );
}

const LAW_ICON = { eco: 'industry', con: 'recruit', trd: 'trade' };
const ADV_ICON = { pol: 'politics', arm: 'army', ind: 'industry', sci: 'research' };

/** Volby slotu jako dlaždice (zákon nebo poradce): název, účinek, cena; aktivní zvýrazněná, zamčená s důvodem v nápovědě. */
function Picker({ options, onPick, mods, cost, activeText }) {
  return (
    <div className="pol-pick" role="group">
      {options.map((o) => (
        <button key={o.id} className={`pol-opt-tile ${o.active ? 'on' : ''}`} disabled={o.active || !!o.block} onClick={() => onPick(o.id)} aria-pressed={o.active} title={o.block || o.info}>
          <b>{o.n}</b>
          <span>{mods(o) || 'bez příplatků'}</span>
          <i>{o.active ? activeText : cost(o)}</i>
          {!o.active && o.block ? <em className="pol-block">{o.block}</em> : null}
        </button>
      ))}
    </div>
  );
}

const occMods = (l) => [l.r !== 1 ? `odboj ×${fmtNum(l.r, 2)}` : '', l.c !== 1 ? `poddajnost ×${fmtNum(l.c, 2)}` : '', l.res ? `těžba ${l.res > 0 ? '+' : ''}${Math.round(l.res * 100)} %` : '', l.pol ? `posádky ${Math.round(l.pol * 100)} %` : ''].filter(Boolean).join(' · ');

/** S7: okupované území jedné země – odboj a poddajnost, okupační zákon (slot s volbami) a kolaborantská vláda. */
function OccCard({ state, me, x, open, onOpen }) {
  const w = getWorld(), law = occLawOf(state, me, x.o), col = hasCollab(state, me, x.o), why = collabBlock(state, me, x.o);
  const options = OCC_LAW_IDS.map((id) => ({ id, ...OCC_LAWS[id], active: law.id === id }));
  return (
    <section className={`pol-law occ-card ${open ? 'open' : ''}`} aria-label={`Okupace: ${w.owners[x.o].name}`}>
      <button className="pol-slot" onClick={onOpen} aria-expanded={open} title={`${law.n}: ${law.info}`}>
        <span className="pol-slot-ic"><Flag tag={w.owners[x.o].tag} width={30} /></span>
        <span className="pol-slot-txt"><i>{w.owners[x.o].name} · {x.states.length} {x.states.length === 1 ? 'stát' : x.states.length < 5 ? 'státy' : 'států'}</i><b>{law.n}</b><em>{occMods(law) || 'bez příplatků'}</em></span>
      </button>
      <div className="occ-meters">
        <span title="Průměrný odboj: nad 50 % trpí garnizona, při slabé garnizoně hrozí povstání"><i>Odboj</i><span className="bar prog bad"><i style={{ width: `${Math.round(x.r * 100)}%` }} /></span><b>{Math.round(x.r * 100)} %</b></span>
        <span title="Průměrná poddajnost: víc surovin, méně odboje"><i>Poddajnost</i><span className="bar prog"><i style={{ width: `${Math.round(x.comp * 100)}%` }} /></span><b>{Math.round(x.comp * 100)} %</b></span>
        {col ? <span className="occ-col on" title="Kolaborantská vláda: poloviční odboj, rychlejší poddajnost, víc surovin"><Icon name="handshake" size={14} /> Kolaborantská vláda</span>
          : <button className="sbtn occ-col" disabled={!!why} onClick={() => makeCollab(x.o)} title={why || 'Poloviční odboj, rychlejší poddajnost a víc surovin'}><Icon name="handshake" size={14} /> Kolaborantská vláda</button>}
      </div>
      {open ? <Picker options={options} onPick={(id) => changeOccLaw(x.o, id)} mods={occMods} cost={() => 'zdarma'} activeText="platí" /> : null}
    </section>
  );
}

/** Zákon jako slot (UI jako v HOI4): ikona oboru, platný zákon, klik otevře volby. */
function Law({ cat, open, onOpen }) {
  const cur = cat.options.find((o) => o.active);
  return (
    <section className={`pol-law ${open ? 'open' : ''}`} aria-label={cat.n}>
      <button className="pol-slot" onClick={onOpen} aria-expanded={open} title={`${cat.n}: ${cur.info}`}>
        <span className="pol-slot-ic"><Icon name={LAW_ICON[cat.cat] || 'gavel'} size={26} /></span>
        <span className="pol-slot-txt"><i>{cat.n}</i><b>{cur.n}</b><em>{Object.keys(cur.mod).length ? modText(cur.mod) : 'bez příplatků'}</em></span>
      </button>
      {open ? <Picker options={cat.options} onPick={(id) => changeLaw(cat.cat, id)} mods={(o) => (Object.keys(o.mod).length ? modText(o.mod) : '')} cost={(o) => (o.pp ? `${o.pp} PM` : 'zdarma')} activeText="platí" /> : null}
    </section>
  );
}

/** Poradce jako slot s portrétem (vlastní silueta): klik otevře volby. */
function Advisor({ a, open, onOpen, hc = false }) {
  return (
    <section className={`pol-adv ${hc ? 'hc' : ''} ${open ? 'open' : ''}`} aria-label={a.n}>
      <div className="pol-slot adv">
        <button className="pol-slot-main" onClick={onOpen} aria-expanded={open} title={a.current ? `${a.n}: ${a.current.info}` : `${a.n}: neobsazeno – vyberte poradce`}>
          <span className={`pol-portrait ${a.current ? '' : 'empty'}`}>{a.current ? <Portrait name={a.current.n} w={40} h={50} /> : <Icon name={hc ? ADV_SLOTS[a.slot].icon : 'plus'} size={20} />}<i><Icon name={hc ? ADV_SLOTS[a.slot].icon : ADV_ICON[a.slot] || 'general'} size={12} /></i></span>
          <span className="pol-slot-txt"><i>{a.n}</i><b>{a.current ? a.current.n : 'Neobsazeno'}</b><em>{a.current ? modText(a.current.mod, null, a.current.doc) : 'klikněte a vyberte'}</em></span>
        </button>
        {a.current ? <button className="icon-btn sm" onClick={() => dismissAdv(a.slot)} aria-label={`Propustit: ${a.current.n}`} title="Propustit (cena se nevrací)"><Icon name="close" size={14} /></button> : null}
      </div>
      {open ? <Picker options={a.options} onPick={(id) => hireAdv(a.slot, id)} mods={(o) => modText(o.mod, null, o.doc)} cost={(o) => `${o.pp} PM`} activeText="ve službě" /> : null}
    </section>
  );
}

/** Koláčový graf podpory stran (SVG), vládnoucí strana vytažená. */
function PartyPie({ rows }) {
  let a = -Math.PI / 2;
  const R = 54, C = 60;
  return (
    <svg className="pol-pie" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Podpora stran">
      {rows.map((r) => {
        const da = (r.pct / 100) * Math.PI * 2;
        if (da <= 0.001) return null;
        const mid = a + da / 2, off = r.gov ? 4 : 0;
        const cx = C + Math.cos(mid) * off, cy = C + Math.sin(mid) * off;
        const x1 = cx + Math.cos(a) * R, y1 = cy + Math.sin(a) * R;
        a += da;
        const x2 = cx + Math.cos(a) * R, y2 = cy + Math.sin(a) * R;
        const d = da >= Math.PI * 2 - 0.001 ? `M ${C - R} ${C} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0` : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${da > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
        return <path key={r.id} d={d} fill={IDEOLOGIES[r.id].color} stroke="#0b121a" strokeWidth="1.2"><title>{`${IDEOLOGIES[r.id].name}: ${r.pct.toFixed(1)} %`}</title></path>;
      })}
      <circle cx={C} cy={C} r="24" fill="#0f1821" />
    </svg>
  );
}

/** F4/UI4: vrchní velení jako řada slotů (jako „Vojenský štáb“ v HOI4) – klik na slot otevře náčelníky jako dlaždice. */
function HighCommand({ list, open, setOpen }) {
  return (
    <div className="pol-row hc-row">
      {list.map((a) => <Advisor key={a.slot} a={a} hc open={open === `h${a.slot}`} onOpen={() => setOpen(open === `h${a.slot}` ? '' : `h${a.slot}`)} />)}
    </div>
  );
}

/** F4: příští volby (jen demokracie): datum a odpočet, za války odklad. */
function Elections({ state, me }) {
  const day = nextElection(state, me);
  if (day == null) return null;
  const left = day - Math.floor(state.tick / 24);
  return (
    <p className="lc-elect" title="Ve volbách převezme vládu strana s víc než polovinou podpory; jinak demokraté vládnou dál se silným nebo slabým mandátem (stabilita).">
      <Icon name="politics" size={14} /> Volby: {formatDate(day * 24)}{left > 0 ? ` (za ${left} d)` : ' (dnes)'}{state.mil.wars.some(([a, b]) => a === me || b === me) ? ' · za války se odkládají' : ''}
    </p>
  );
}

/** UI14: tlačítko národního cíle u portrétu (jako v HOI4) – plněný cíl s postupem, nebo výzva k výběru; klik otevře strom cílů. */
function FocusButton({ state, me }) {
  const cur = state.nat.own[me] && state.nat.own[me].cur;
  const f = cur ? focusTree(state, me).find((x) => x.status === 'active') : null;
  return (
    <button className={`lc-focus ${f ? '' : 'idle'}`} onClick={() => togglePanel('nat')} title={f ? `Národní cíl: ${f.n} · zbývá ${Math.ceil(f.days - f.p)} dní` : 'Vyberte národní cíl (C)'}>
      <Icon name="flag" size={20} />
      <span><i>Národní cíl</i><b>{f ? f.n : 'Vyberte národní cíl'}</b></span>
      {f ? <span className="bar prog"><i style={{ width: `${(f.p / f.days) * 100}%` }} /></span> : null}
    </button>
  );
}

/** Karta státu vlevo: portrét vůdce (vlastní silueta), vláda, podpora ideologií a „národní duchové“ (platné zákony, poradci, splněné cíle). */
function LeaderCard({ tag, p, spirits, state, me }) {
  const info = COUNTRIES[tag];
  const pa = p.parties, gov = IDEOLOGIES[pa.gov];
  return (
    <aside className="leader-card" aria-label="Vůdce a vláda">
      <div className="lc-top">
        <div className="lc-portrait" aria-hidden="true">
          <Portrait name={info.leader} color={getWorld().owners[me].color} rank="L" w={120} h={140} />
          <span className="lc-flag"><Flag tag={tag} width={34} /></span>
        </div>
        <FocusButton state={state} me={me} />
      </div>
      <h3>{info.leader}</h3>
      <p className="muted">{pa.gov === info.ideology ? info.government : `Vláda: ${gov.name}`}</p>
      <div className="lc-parties">
        <PartyPie rows={pa.rows} />
        <ul className="lc-ideo" aria-label="Podpora stran">
          {pa.rows.map((r) => (
            <li key={r.id} className={r.gov ? 'main' : ''} title={`${IDEOLOGIES[r.id].name}: ${r.pct.toFixed(1)} %${r.gov ? ' (vládnoucí strana)' : ''}`}>
              <i style={{ background: IDEOLOGIES[r.id].color }} /><span>{IDEOLOGIES[r.id].name}</span><b>{Math.round(r.pct)} %</b>
              <button type="button" className="mini" aria-label={`Podpořit stranu ${IDEOLOGIES[r.id].name}`} title={r.block || `Podpořit: ${pa.cost} PM, +${pa.gain} bodů`} disabled={!!r.block} onClick={() => backParty(r.id)}>+</button>
            </li>
          ))}
        </ul>
      </div>
      <Elections state={state} me={me} />
      {pa.risk && <p className="lc-warn" role="alert">Hrozí převrat: strana „{IDEOLOGIES[pa.rival].name}“ se blíží vládnoucí straně.</p>}
      <h4>Národní duch</h4>
      <ul className="lc-spirits">
        {spirits.map((x) => <li key={x.k} className={x.kind} title={`${x.n}: ${x.hint}`} aria-label={x.n}><Icon name={x.icon} size={20} /></li>)}
        {!spirits.length && <li className="muted none">Zatím žádný</li>}
      </ul>
    </aside>
  );
}

/** Otevřený slot (zákon nebo poradce) – stav komponenty, ne hry. */
const usePick = () => useState('');

/** S4: národní mechanika – ukazatel s pásmy (značky hranic), aktuální pásmo a jeho duch v nápovědě. */
function MechCard({ m }) {
  const M = MECHS[m.id], sp = m.band.spirit ? SPIRITS[m.band.spirit] : null;
  return (
    <section className={`mech-card ${m.active ? '' : 'off'}`} aria-label={M.n} title={M.info}>
      <header><b>{M.n}</b><span className={`mech-band ${sp ? sp.tone : ''}`} title={sp ? `${sp.n}: ${sp.info} ${modText(sp.mod, sp.army)}` : 'Bez zvláštních účinků'}>{m.band.n}</span></header>
      <div className="mech-gauge" aria-label={`${M.g} ${Math.round(m.v)} %`}>
        <i style={{ width: `${m.v}%` }} />
        {M.bands.filter((b) => b.min > 0).map((b) => <em key={b.min} style={{ left: `${b.min}%` }} />)}
      </div>
      <div className="mech-ends"><span>{M.lo}</span><b>{M.g} {Math.round(m.v)}</b><span>{M.hi}</span></div>
      <p className="muted">{m.active ? 'Ukazatel posouvají rozhodnutí (okno Rozhodnutí, záložka Národní).' : 'Mechanika teď neběží.'}</p>
    </section>
  );
}

/** Záložka Politika: stabilita, podpora války, politická moc (PM), zákony a poradci. */
export function PoliticsPanel() {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  if (!me) return <div className="prod-screen politics-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou politiku.</p></div></div>;
  const p = politicsOf(state, me);
  const [open, setOpen] = usePick();
  const occ = occupiedBy(state, me);   // S7
  const mechs = mechsOf(state, me);   // S4
  const spirits = spiritsOf(state, me).map((x) => ({ k: `s${x.id}`, n: x.days ? `${x.n} (${x.days} d)` : x.n, kind: `spirit ${x.tone}`, icon: x.tone === 'bad' ? 'resistance' : x.tone === 'mixed' ? 'chain' : 'flag', hint: `${x.info} ${modText(x.mod, x.army)}${x.days ? ` · ještě ${x.days} dní` : ''}` }));   // UI14: jen národní duchové jako ikony (zákony a poradci mají sloty)
  return (
    <Screen cls="politics-panel" title="Politika" icon="politics" head={(
      <section className="pol-head" aria-label="Souhrn politiky">
        <Meter label="Stabilita" value={p.stab} target={p.target.stab} cls="hp" hint={`Výstup továren a staveb ×${fmtNum(p.stabMult, 2)}`} />
        <Meter label="Podpora války" value={p.ws} target={p.target.ws} cls="org" hint="Odemyká přísnější zákony a ovlivňuje příliv lidské síly" />
        <div className="pol-pp" title="Politická moc: platí se jí zákony a poradci"><Icon name="general" size={18} /><b>{Math.floor(p.pp)}</b><span className="muted">PM · +{p.income} za den</span></div>
        <p className="muted pol-sum">Výroba ×{fmtNum(p.out, 2)} · lidská síla ×{fmtNum(p.man, 2)} · spotřební zboží {pct(p.cons)}</p>
      </section>
    )}>
      <div className="prod-body">
        <div className="prod-cols pol-cols">
          <LeaderCard tag={state.player} p={p} spirits={spirits} state={state} me={me} />
          <div className="prod-left">
            <div className="sec-head"><h3>Zákony a vláda</h3><span className="muted">klikněte na slot a vyberte</span></div>
            <div className="pol-row law-grid">
              {p.laws.map((c) => <Law key={c.cat} cat={c} open={open === `l${c.cat}`} onOpen={() => setOpen(open === `l${c.cat}` ? '' : `l${c.cat}`)} />)}
              {p.advisors.filter((a) => !ADV_SLOTS[a.slot].hc).map((a) => <Advisor key={a.slot} a={a} open={open === `a${a.slot}`} onOpen={() => setOpen(open === `a${a.slot}` ? '' : `a${a.slot}`)} />)}
            </div>
            <div className="sec-head"><h3>Vojenský štáb</h3><span className="muted">náčelníci štábů: bonusy armády, námořnictva a letectva</span></div>
            <HighCommand list={p.advisors.filter((a) => ADV_SLOTS[a.slot].hc)} open={open} setOpen={setOpen} />
            {mechs.length ? <>
              <div className="sec-head"><h3>Národní mechanika</h3><span className="muted">zvláštní vnitřní situace země</span></div>
              <div className="mech-grid">{mechs.map((m) => <MechCard key={m.id} m={m} />)}</div>
            </> : null}
            {occ.length ? <>
              <div className="sec-head"><h3>Okupovaná území</h3><span className="muted">okupační zákon, odboj a poddajnost podle země</span></div>
              <div className="occ-grid">{occ.map((x) => <OccCard key={x.o} state={state} me={me} x={x} open={open === `o${x.o}`} onOpen={() => setOpen(open === `o${x.o}` ? '' : `o${x.o}`)} />)}</div>
            </> : null}
          </div>
        </div>
      </div>
    </Screen>
  );
}
