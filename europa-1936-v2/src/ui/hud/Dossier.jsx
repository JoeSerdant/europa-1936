import { useEffect, useState } from 'react';
import { useUi, useGame, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { fogOn, visibleLand, seesDivision, seesFleet, getWorld, fleetsInSea, diplomacyOf, TERRAIN_CS, CLIMATE_CS, divisionsByProvince, stateIndustry, occupationOf, fortOf, weatherAt, BUILDINGS, RESOURCES, personaOf } from '../../engine/index.js';
import { selectLabel, setSelection, declareWarOn, makePeaceWith, playerIdx, setIndTab, openPanel, pickBuild, justifyOn, selectFleet, openBattle } from '../actions.js';

/** Otevře panel Stavby (bez přepínání – už otevřený zůstane). */
const openBuild = () => { setIndTab('build'); openPanel('industry'); };
import { fmtInt, fmtNum, fmtPop, fmtArea, plural } from '../format.js';
import { ResIcon } from '../common/ResIcon.jsx';

const KIND_NOTE = ['', 'přes řeku', 'průliv'];
const PORT_NAMES = ['', 'malý přístav', 'přístav', 'velký přístav', 'hlavní námořní přístav', 'světový přístav'];

function maxRail(w, p) {
  let m = 0;
  for (let k = w.rails.start[p]; k < w.rails.start[p + 1]; k++) if (w.rails.level[k] > m) m = w.rails.level[k];
  return m;
}

function Row({ label, children }) {
  return <><dt>{label}</dt><dd>{children}</dd></>;
}

function Chips({ items }) {
  return (
    <div className="chips">
      {items.map((c) => (
        <button key={c.l} className="chip" onClick={() => selectLabel(c.l, true)} title={c.note || undefined}>
          {c.name}{c.note ? <i>{c.note}</i> : null}
        </button>
      ))}
    </div>
  );
}

/** Jednotky stojící v provincii, po zemích; klik je vybere (cizí jen k prohlídce). Překresluje se nejvýš ~2,5× za sekundu. */
function ProvinceUnits({ p }) {
  const state = useGameSlow((s) => s, 400);
  const ids = divisionsByProvince(state).get(p);
  const hidden = fogOn(state) && !visibleLand(state, getWorld().ownerIdx[state.player])[p];   // M76: mlha války
  if (hidden) return <section><h3>Jednotky v provincii</h3><p className="muted">Mlha války: do této provincie nevidíte.</p></section>;
  if (!ids || !ids.length) return null;
  const by = new Map();
  for (const id of ids) {
    const d = state.mil.divs[id];
    if (!d || !seesDivision(state, d.o, d.p)) continue;
    if (by.has(d.o)) by.get(d.o).push(id); else by.set(d.o, [id]);
  }
  const w = getWorld();
  return (
    <section>
      <h3>Jednotky v provincii</h3>
      <div className="chips">
        {[...by].map(([o, list]) => (
          <button key={o} className="chip chip-flag" onClick={() => setSelection(list)} title="Vybrat tyto divize">
            <Flag tag={w.owners[o].tag} width={18} />{w.owners[o].name}<i>{list.length} {plural(list.length, 'divize', 'divize', 'divizí')}</i>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Úroveň jako řada teček (vyplněné = postaveno, obrys = rozestavěno). */
function Pips({ n, max, q = 0 }) {
  return <span className="st-pips">{Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : i < n + q ? 'q' : ''} />)}</span>;
}

/**
 * Karta průmyslu státu (UI jako v HOI4): stavební sloty jako dlaždice s ikonou (civilní, vojenské továrny, loděnice, rozestavěné s postupem,
 * volné), sdílené budovy s úrovní (infrastruktura, letiště, radar) a těžba surovin jako ikony. Hráč ve svém státě otevře panel Stavby.
 */
function StateIndustry({ s }) {
  const state = useGameSlow((g) => g, 600);
  const info = stateIndustry(state, s);
  const me = playerIdx(state);
  if (!info) return null;
  const mine = me && state.stateOwner[s] === me && state.ctrl[getWorld().states[s].cap] === me;
  const res = Object.entries(info.res).filter(([, n]) => n > 0);
  const q = (k) => info.queued.filter((b) => b.k === k);
  const slotQ = info.queued.filter((b) => BUILDINGS[b.k].slot);
  const tiles = [
    ...Array.from({ length: info.civ }, () => ({ k: 'civ' })), ...Array.from({ length: info.mil }, () => ({ k: 'mil' })), ...Array.from({ length: info.dok }, () => ({ k: 'dok' })),
    ...slotQ.map((b) => ({ k: b.k, pct: b.prog / BUILDINGS[b.k].cost })),
  ];
  const free = Math.max(0, info.slots - tiles.length);
  return (
    <section className="state-ind">
      <h3>Průmysl státu <i className="muted">{info.cat.n} · sloty {info.used}/{info.slots}</i></h3>
      <div className="st-slots" aria-label={`Sloty: ${info.civ} civilních, ${info.mil} vojenských továren, ${info.dok} loděnic, ${free} volných`}>
        {tiles.map((t, i) => (
          <span key={i} className={`st-slot ${t.k} ${t.pct != null ? 'q' : ''}`} title={`${BUILDINGS[t.k].n}${t.pct != null ? ` – rozestavěno ${Math.round(t.pct * 100)} %` : ''}`}>
            <Icon name={t.k === 'dok' ? 'ship' : 'industry'} size={16} />
            {t.pct != null ? <i style={{ height: `${Math.round(t.pct * 100)}%` }} /> : null}
          </span>
        ))}
        {Array.from({ length: free }, (_, i) => <span key={`f${i}`} className="st-slot free" title="Volný stavební slot" />)}
      </div>
      <div className="st-shared">
        <span title={`${BUILDINGS.inf.n}: úroveň ${info.inf} z ${BUILDINGS.inf.max}`}><Icon name="road" size={15} /><Pips n={info.inf} max={BUILDINGS.inf.max} q={q('inf').length} /></span>
        <span title={`${BUILDINGS.afb.n}: úroveň ${info.afb} z ${BUILDINGS.afb.max}`}><Icon name="plane" size={15} /><Pips n={info.afb} max={BUILDINGS.afb.max} q={q('afb').length} /></span>
        <span title={`${BUILDINGS.radar.n}: úroveň ${info.radar} z ${BUILDINGS.radar.max}`}><Icon name="eye" size={15} /><Pips n={info.radar} max={BUILDINGS.radar.max} q={q('radar').length} /></span>
        {info.port ? <span title={`${BUILDINGS.nb.n}: úroveň ${info.nb} z ${BUILDINGS.nb.max} – opravy lodí`}><Icon name="ship" size={15} /><Pips n={info.nb} max={BUILDINGS.nb.max} q={q('nb').length} /></span> : null}
        <span title={info.hub ? `${BUILDINGS.hub.n}: postaven` : `${BUILDINGS.hub.n}: není`}><Icon name="box" size={15} /><Pips n={info.hub} max={1} q={q('hub').length} /></span>
      </div>
      {res.length > 0 && (
        <div className="st-res">{res.map(([r, n]) => <span key={r} title={`${RESOURCES[r].n}: těžba ${fmtNum(n, 1)} za den`}><ResIcon r={r} size={20} /><b>{fmtNum(n, 1)}</b></span>)}</div>
      )}
      {mine && (   /* F2 B6: stavby se zadávají jen v panelu Stavby (vybrat budovu, klikat na mapu) – tady jen odkaz */
        <div className="ind-btns"><button className="sbtn" onClick={openBuild} title="Otevře panel Stavby: vyberte budovu a klikejte na státy na mapě"><Icon name="build" size={14} />Stavby (T)</button></div>
      )}
    </section>
  );
}

/** Pevnost v provincii: úroveň, rozestavěné stavby a (u vlastní provincie) tlačítko stavby. */
function ProvinceFort({ p }) {
  const state = useGameSlow((g) => g, 700);
  const me = playerIdx(state);
  const lv = fortOf(state, p), cf = (state.ind.cf && state.ind.cf[p]) || 0;   // F4c: pobřežní pevnost
  const queued = state.ind.build.filter((b) => b.p === p && b.k === 'fort').length;
  const mine = me && state.ctrl[p] === me && state.stateOwner[getWorld().provState[p]] === me;
  if (!lv && !queued && !mine) return null;
  return (
    <section className="prov-fort">
      <h3>Pevnost</h3>
      <dl className="kv">
        <Row label="Úroveň">{lv} z {BUILDINGS.fort.max}{queued ? ` · rozestavěno ${queued}` : ''}</Row>
        {cf ? <Row label="Pobřežní">{cf} z {BUILDINGS.cfort.max}{cf >= BUILDINGS.cfort.max ? ' · vylodění nemožné' : ''}</Row> : null}
      </dl>
      {mine && lv + queued < BUILDINGS.fort.max && (   /* F2 B6: pevnost se staví v panelu Stavby – odkaz otevře panel s vybranou pevností */
        <div className="ind-btns"><button className="sbtn" onClick={() => { openBuild(); pickBuild('fort'); }} title={`${BUILDINGS.fort.info} Otevře panel Stavby s vybranou pevností – klikněte na provincii.`}><Icon name="shield" size={14} />Pevnost v panelu Stavby</button></div>
      )}
    </section>
  );
}

/** Probíhající bitva v provincii: krátký souhrn a tlačítko do okna bitvy (M61). */
function ProvinceBattle({ p }) {
  const b = useGameSlow((g) => g.mil.battles.find((x) => x && x.p === p) || null, 700);
  if (!b) return null;
  return (
    <section className="prov-battle">
      <h3>Bitva</h3>
      <dl className="kv"><Row label="Útočníci / obránci">{b.att.length} / {b.dep.length} divizí</Row><Row label="Trvá">{Math.floor(b.hrs / 24)} d {b.hrs % 24} h</Row></dl>
      <div className="ind-btns"><button className="sbtn" onClick={() => openBattle(b.id)}><Icon name="swords" size={14} />Okno bitvy</button></div>
    </section>
  );
}

/** Okupace státu: odboj, poddajnost a garnizona (jen když je stát okupovaný). */
function StateOccupation({ s }) {
  const state = useGameSlow((g) => g, 800);
  const o = occupationOf(state, s);
  if (!o) return null;
  return (
    <section className="state-occ">
      <h3>Okupace</h3>
      <dl className="kv">
        <Row label="Odboj"><span className="bar hp occ-bar"><i style={{ width: `${o.r * 100}%`, background: '#d44430' }} /></span> {Math.round(o.r * 100)} %</Row>
        <Row label="Poddajnost"><span className="bar org occ-bar"><i style={{ width: `${o.c * 100}%`, background: '#62b05c' }} /></span> {Math.round(o.c * 100)} %</Row>
        <Row label="Garnizona">{o.n} z {o.need} divizí</Row>
      </dl>
    </section>
  );
}

/** Vztah hráče k vlastníkovi oblasti: ospravedlnění, vyhlášení války a bílý mír (vyhlášení a mír na dvojí klik, aby se nestalo omylem). */
function WarSection({ idx, name }) {
  const state = useGameSlow((s) => s, 600);
  const me = playerIdx(state);
  const [armed, setArmed] = useState(false);
  useEffect(() => { setArmed(false); }, [idx, me]);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!me || me === idx) return null;
  const c = diplomacyOf(state, me).list.find((x) => x.o === idx);
  if (!c) return null;
  const tag = c.tag;
  const confirm = () => { setArmed(false); if (c.war) makePeaceWith(tag); else declareWarOn(tag); };
  return (
    <section className="war-sec">
      <h3>Vztah k zemi {name}</h3>
      <p className={c.war ? 'war-state on' : 'war-state'}>{c.war ? 'Jste ve válce.' : c.ally ? 'Jste ve stejném bloku.' : c.capitulated ? 'Země kapitulovala.' : 'Jste v míru.'} Vztah {c.rel > 0 ? '+' : ''}{c.rel}.</p>
      {c.war || c.canDeclare ? (
        armed ? (
          <div className="confirm-row">
            <button className={`sbtn ${c.war ? '' : 'danger'}`} onClick={confirm} autoFocus>{c.war ? 'Ano, navrhnout bílý mír' : 'Ano, vyhlásit válku'}</button>
            <button className="sbtn" onClick={() => setArmed(false)}>Zpět</button>
          </div>
        ) : (
          <button className={`sbtn ${c.war ? '' : 'danger'}`} disabled={c.war && !!c.peaceBlock} title={c.war ? c.peaceBlock || undefined : 'Zapojí se i členové bloků'} onClick={() => setArmed(true)}>{c.war ? 'Navrhnout bílý mír' : 'Vyhlásit válku'}</button>
        )
      ) : c.ally || c.capitulated ? null : c.just ? (
        <p className="muted">Ospravedlňuje se: zbývá {c.just.left} d.</p>
      ) : (
        <div className="ind-btns">{c.goals.map((g) => <button key={g.id} className="sbtn" disabled={!!g.block} title={g.block || `${g.info} ${g.days} dní.`} onClick={() => justifyOn(tag, g.id)}>Ospravedlnit: {g.n} ({g.pp} PM)</button>)}</div>
      )}
      {c.war && armed && <p className="muted">Okupované provincie se vrátí původním držitelům a cizí jednotky odejdou domů.</p>}
      {c.war && c.peaceBlock && !armed && <p className="pol-block">{c.peaceBlock}</p>}
    </section>
  );
}

function LandDossier({ p, owner, ctrl }) {
  const w = getWorld();
  const o = w.land[p];
  const own = w.owners[owner[o.s]];
  const ctl = w.owners[ctrl[p]];
  const st = w.states[o.s];
  const [regionName, climate] = w.regions[o.r - 1];
  const rail = maxRail(w, p);
  const nb = [];
  w.forLandNeighbors(p, (q, kind, len) => nb.push({ l: q, name: w.provName(q), note: KIND_NOTE[kind], len }));
  nb.sort((a, b) => b.len - a.len);
  const seas = [];
  w.forCoast(p, (s, len) => seas.push({ l: s, name: w.seaName(s), len }));
  seas.sort((a, b) => b.len - a.len);
  const cap = w.owners[owner[o.s]].cap === p;
  const tick = useGameSlow((g) => g.tick, 5000);
  const weather = weatherAt(tick, p);
  const ai = useGame((g) => g.ai), me = useGame((g) => g.player);
  const style = ai && ai.level && own.tag !== me ? personaOf({ ai }, owner[o.s]) : null;   // F3: styl velení AI země
  return (
    <>
      <div className="head st-head">
        <Flag tag={own.tag} width={54} />
        <div className="st-title">
          <h2>{o.n}</h2>
          <div className="sub">{st.n} · {regionName}</div>
        </div>
        {o.v > 0 && <span className="st-vp" title={`Vítězné body: ${o.v}`}><Icon name="victory" size={15} />{o.v}</span>}
        {cap && <span className="st-cap" title="Hlavní město"><Icon name="crown" size={16} /></span>}
      </div>
      <div className="body">
        <div className="st-owner">
          <span className="who" title="Vlastník"><Flag tag={own.tag} width={22} />{own.name}</span>
          {ctrl[p] !== owner[o.s] && <span className="who occ" title="Provincii drží (okupuje)"><Icon name="swords" size={13} /><Flag tag={ctl.tag} width={22} />{ctl.name}</span>}
          {style && <span className="muted" title={style.info}>Velení AI: {style.n}</span>}
        </div>
        <div className="st-chips">
          <span title="Terén"><Icon name="terrain" size={15} />{TERRAIN_CS[o.t]}</span>
          <span title="Podnebí"><Icon name="regions" size={15} />{CLIMATE_CS[climate]}</span>
          <span title="Počasí"><Icon name="weather" size={15} />{weather.label}, {Math.round(weather.t)} °C</span>
          <span title="Obyvatelé"><Icon name="population" size={15} />{fmtPop(o.p)}</span>
          <span title="Plocha"><Icon name="provinces" size={15} />{fmtArea(o.a)}</span>
          <span title={rail ? `Železnice: úroveň ${rail} z 5` : 'Bez železnice'}><Icon name="road" size={15} />{rail ? <Pips n={rail} max={5} /> : 'bez železnice'}</span>
          {o.h && <span title={`${PORT_NAMES[o.h[1]] || `Přístav úrovně ${o.h[1]}`} · ${w.seaName(o.h[0])}`}><Icon name="ship" size={15} /><Pips n={o.h[1]} max={5} /></span>}
        </div>
        <ProvinceBattle p={p} />
        <ProvinceFort p={p} />
        <ProvinceUnits p={p} />
        <WarSection idx={owner[o.s]} name={own.name} />
        {o.k.length > 0 && (
          <section>
            <h3>Města</h3>
            <ul className="cities">
              {o.k.slice(0, 6).map((c) => <li key={c[0]}><span>{c[0]}</span><i>{fmtPop(c[1])}</i></li>)}
            </ul>
          </section>
        )}
        <section>
          <h3>Sousední provincie</h3>
          <Chips items={nb} />
        </section>
        {seas.length > 0 && (
          <section>
            <h3>Pobřeží</h3>
            <Chips items={seas} />
          </section>
        )}
        <section className="state-sum">
          <h3>Stát {st.n}</h3>
          <p>{st.v.length} {plural(st.v.length, 'provincie', 'provincie', 'provincií')} · {fmtPop(st.p)} · {fmtArea(st.a)}</p>
        </section>
        <StateOccupation s={o.s} />
        <StateIndustry s={o.s} />
      </div>
    </>
  );
}

/** Flotily v mořské oblasti, po zemích; klik na vlastní vybere flotilu (M27). */
function SeaFleets({ l }) {
  const state = useGameSlow((g) => g, 500);
  const me = playerIdx(state);
  const list = fleetsInSea(state, l).filter((f) => seesFleet(state, f.o, l, f.ships));   // M76: mlha války
  if (!list.length) return null;
  const w = getWorld();
  return (
    <section>
      <h3>Flotily v oblasti</h3>
      <div className="chips">
        {list.map((f) => (
          <button key={f.id} className="chip chip-flag" onClick={() => f.o === me && selectFleet(f.id)} title={f.o === me ? 'Vybrat flotilu' : 'Cizí flotila'}>
            <Flag tag={w.owners[f.o].tag} width={18} />{f.nm}<i>{f.n} lodí</i>
          </button>
        ))}
      </div>
    </section>
  );
}

/** F4c: miny v mořské oblasti podle zemí. */
function SeaMines({ l }) {
  const mn = useGameSlow((g) => (g.nav.mn && g.nav.mn[l]) || null, 800);
  if (!mn || !Object.keys(mn).length) return null;
  const w = getWorld();
  return (
    <section>
      <h3>Miny v oblasti</h3>
      <div className="chips">{Object.entries(mn).map(([o, n]) => <span key={o} className="chip chip-flag" title="Miny poškozují nepřátelské flotily a ohrožují konvoje; odstraní je torpédoborce na misi Odminování"><Flag tag={w.owners[+o].tag} width={18} />{w.owners[+o].name}<i>{Math.round(n)}</i></span>)}</div>
    </section>
  );
}

function SeaDossier({ l }) {
  const w = getWorld();
  const s = w.sea[l - w.L];
  const near = [];
  const seas = [];
  w.forSeaNeighbors(l, (q, len) => seas.push({ l: q, name: w.seaName(q), len }));
  for (let k = w.seaCoast.start[l - w.L]; k < w.seaCoast.start[l - w.L + 1]; k++) near.push({ l: w.seaCoast.to[k], name: w.provName(w.seaCoast.to[k]), len: w.seaCoast.len[k] });
  seas.sort((a, b) => b.len - a.len);
  near.sort((a, b) => b.len - a.len);
  return (
    <>
      <div className="head">
        <h2>{s.n}</h2>
        <div className="sub">{w.seaRegions[s.r]}</div>
      </div>
      <div className="body">
        <dl className="kv">
          <Row label="Druh">mořská oblast</Row>
          <Row label="Plocha">{fmtArea(s.a)}</Row>
          <Row label="Pobřežních provincií">{fmtInt(near.length)}</Row>
        </dl>
        <SeaFleets l={l} />
        <SeaMines l={l} />
        {seas.length > 0 && <section><h3>Sousední moře</h3><Chips items={seas.slice(0, 14)} /></section>}
        {near.length > 0 && <section><h3>Pobřeží</h3><Chips items={near.slice(0, 18)} /></section>}
      </div>
    </>
  );
}

/** Obsah záložky Oblast: podrobnosti o označené provincii nebo mořské oblasti. */
export function DossierView() {
  const sel = useUi((s) => s.selected);
  const owner = useGame((s) => s.stateOwner);
  const ctrl = useGame((s) => s.ctrl);
  if (!sel) return <p className="empty">Klikněte na provincii nebo moře.</p>;
  const w = getWorld();
  return (
    <div className="dossier">
      {w.isSea(sel) ? <SeaDossier l={sel} /> : <LandDossier p={sel} owner={owner} ctrl={ctrl} />}
    </div>
  );
}
