import { useEffect, useState } from 'react';
import { useUi, useGame, useGameSlow } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { getWorld, diplomacyOf, DIP, TERRAIN_CS, CLIMATE_CS, divisionsByProvince, stateIndustry, BUILDINGS, BUILDING_IDS, RESOURCES } from '../../engine/index.js';
import { selectLabel, setSelection, declareWarOn, makePeaceWith, playerIdx, buildIn, justifyOn } from '../actions.js';
import { fmtInt, fmtNum, fmtPop, fmtArea, plural } from '../format.js';

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
  if (!ids || !ids.length) return null;
  const by = new Map();
  for (const id of ids) {
    const d = state.mil.divs[id];
    if (!d) continue;
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

/** Průmysl státu: kategorie, sloty, továrny, těžba; hráč může ve svém státě zadat stavbu. Překresluje se jen při změně průmyslu. */
function StateIndustry({ s }) {
  const state = useGameSlow((g) => g, 600);
  const info = stateIndustry(state, s);
  const me = playerIdx(state);
  if (!info) return null;
  const mine = me && state.stateOwner[s] === me && state.ctrl[getWorld().states[s].cap] === me;
  const res = Object.entries(info.res);
  return (
    <section className="state-ind">
      <h3>Průmysl státu</h3>
      <dl className="kv">
        <Row label="Kategorie">{info.cat.n} · sloty {info.used}/{info.slots}</Row>
        <Row label="Továrny">{info.civ} civilních · {info.mil} vojenských</Row>
        {info.inf > 0 && <Row label="Infrastruktura">+{info.inf}</Row>}
        {res.length > 0 && <Row label="Těžba">{res.map(([r, n]) => `${RESOURCES[r].n} ${fmtNum(n, 1)}`).join(' · ')}</Row>}
        {info.queued.length > 0 && <Row label="Rozestavěno">{info.queued.length}</Row>}
      </dl>
      {mine && (
        <div className="ind-btns">
          {BUILDING_IDS.map((k) => (
            <button key={k} className="sbtn" onClick={() => buildIn(s, k)} title={BUILDINGS[k].info}><Icon name="plus" size={14} />{BUILDINGS[k].n}</button>
          ))}
        </div>
      )}
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
        <button className="sbtn" disabled={!c.canJustify} title={c.justifyBlock || undefined} onClick={() => justifyOn(tag)}>Ospravedlnit válku ({DIP.JUST_PP} PM)</button>
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
  return (
    <>
      <div className="head">
        <h2>{o.n}</h2>
        <div className="sub">{st.n} · {regionName}</div>
      </div>
      <div className="body">
        <dl className="kv">
          <Row label="Vlastník"><span className="who"><Flag tag={own.tag} width={22} />{own.name}</span></Row>
          {ctrl[p] !== owner[o.s] && <Row label="Kontrola"><span className="who"><Flag tag={ctl.tag} width={22} />{ctl.name}</span></Row>}
          {cap && <Row label="Postavení">hlavní město</Row>}
          <Row label="Terén">{TERRAIN_CS[o.t]}</Row>
          <Row label="Podnebí">{CLIMATE_CS[climate]}</Row>
          <Row label="Obyvatelé">{fmtPop(o.p)}</Row>
          <Row label="Plocha">{fmtArea(o.a)}</Row>
          {o.v > 0 && <Row label="Vítězné body"><b className="gold">{o.v}</b></Row>}
          {o.h && <Row label="Přístav">{PORT_NAMES[o.h[1]] || `úroveň ${o.h[1]}`} · {w.seaName(o.h[0])}</Row>}
          <Row label="Železnice">{rail ? `úroveň ${rail} z 5` : 'žádná'}</Row>
        </dl>
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
        <StateIndustry s={o.s} />
      </div>
    </>
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
