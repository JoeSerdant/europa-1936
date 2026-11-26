import { useMemo, useState } from 'react';
import { useGameSlow, useUi } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { diplomacyOf, FAC_GOALS, DIP, AUTONOMY_NAMES, getWorld, EQUIP, EQUIP_IDS, capLimitOf, ideologyOf, divisionCount, WARGOALS, volBlock } from '../../engine/index.js';
import { EquipIcon } from '../industry/EquipIcon.jsx';
import { EQUIP_GROUPS } from '../../data/industry/groups.js';
import { IDEOLOGIES, COUNTRIES } from '../../data/countries.js';
import { playerIdx, annexOwnPuppet, tightenPuppet, loosenPuppet, justifyOn, declareWarOn, makePeaceWith, lendTo, guaranteeFor, revokeGuaranteeFor, requestAccessFrom, grantAccessTo, revokeAccessFrom, offerPactTo, breakPactWith, answerPactFrom, improveWith, demandFrom, foundBloc, inviteBloc, leaveBloc, blocGoal, kickBloc, selectLabel, volunteerIds, volunteersTo, recallVolunteersFrom, attacheTo, licenceFrom } from '../actions.js';
import { fmtNum } from '../format.js';
import { Screen } from '../common/Screen.jsx';

// UI (jako v HOI4): diplomacie jako mřížka karet zemí (vlajka, ukazatel vztahů, odznaky stavu) a detail vybrané země s akcemi
// jako dlaždicemi s ikonou a cenou – místo seznamu s řadami textových tlačítek. Data dává `diplomacyOf`, akce jsou v `ui/actions.js`.

const relCls = (r) => (r >= 25 ? 'good' : r <= -25 ? 'bad' : 'mid');

/** Odznaky stavu země: [klíč, ikona, nápověda]. */
function badgesOf(c) {
  const b = [];
  if (c.war) b.push(['war', 'swords', 'Ve válce s vámi']);
  if (c.ally) b.push(['ally', 'flag', 'Člen vašeho bloku']);
  if (c.garMine) b.push(['ally', 'shield', 'Zaručujete její nezávislost']);
  if (c.garTheirs) b.push(['ally', 'shield', 'Zaručuje vaši nezávislost']);
  if (c.pact) b.push(['ally', 'handshake', `Pakt o neútočení (${c.pact.days} dní)`]);
  if (c.access || c.accGiven) b.push(['ally', 'road', c.access ? 'Smíte projít jejím územím' : 'Smí projít vaším územím']);
  if (c.mine) b.push(['ally', 'chain', 'Vaše loutka']);
  else if (c.overlord) b.push(['cap', 'chain', 'Loutka jiné země']);
  if (c.capitulated) b.push(['cap', 'flag', c.exile ? 'Vláda v exilu' : 'Kapitulovala']);
  if (c.volAway) b.push(['ally', 'army', `Slouží tam ${c.volAway} vašich divizí`]);   // F4
  if (c.attMine) b.push(['ally', 'eye', 'Máte tam vojenského atašé']);
  if (c.just) b.push(['just', 'scroll', c.just.done ? 'Válka ospravedlněna' : `Ospravedlnění: ještě ${c.just.left} d`]);
  return b;
}

/** Ukazatel vztahů −100…+100: výplň od středu doleva (červeně) nebo doprava (zeleně). */
function RelGauge({ rel, big = false }) {
  const v = Math.max(-100, Math.min(100, rel));
  return (
    <span className={`rel-gauge ${big ? 'big' : ''}`} title={`Vztah ${v > 0 ? '+' : ''}${v}`} aria-label={`Vztah ${v}`}>
      <i className={v >= 0 ? 'pos' : 'neg'} style={v >= 0 ? { left: '50%', width: `${v / 2}%` } : { left: `${50 + v / 2}%`, width: `${-v / 2}%` }} />
      <b className={relCls(v)}>{v > 0 ? '+' : ''}{v}</b>
    </span>
  );
}

/** Karta země v mřížce. */
function Card({ c, on, onPick }) {
  const badges = badgesOf(c);
  const ring = c.just && !c.just.done ? c.just : null;
  return (
    <button className={`dip-card ${on ? 'on' : ''} ${c.war ? 'war' : ''} ${c.ally ? 'ally' : ''}`} onClick={onPick} aria-pressed={on} aria-label={`${c.name}: vztah ${c.rel}`}>
      <span className="dc-flag"><Flag tag={c.tag} width={46} /></span>
      <span className="dc-nm">{c.name}</span>
      <RelGauge rel={c.rel} />
      <span className="dc-badges">
        {badges.slice(0, 4).map(([k, ic, t], i) => <i key={i} className={`dc-b ${k}`} title={t}><Icon name={ic} size={13} /></i>)}
        {ring ? <i className="dc-b just" title={`Ospravedlnění: ještě ${ring.left} d`}>{ring.left} d</i> : null}
      </span>
    </button>
  );
}

/** Dlaždice akce: ikona, název, cena; zakázaná ukáže důvod v nápovědě. */
function Act({ icon, n, cost, onClick, block, tone = '', hint = '' }) {
  return (
    <button className={`dip-act ${tone}`} disabled={!!block} onClick={onClick} title={block || hint || n} aria-label={n}>
      <Icon name={icon} size={20} />
      <b>{n}</b>
      {cost ? <i>{cost}</i> : null}
    </button>
  );
}

/** Půjčka a pronájem: dlaždice výzbroje se siluetou a počtem; klik pošle podíl skladu spojenci. */
function Lend({ c, stock }) {
  return (
    <div className="dip-lend-grid" role="group" aria-label="Půjčka a pronájem">
      {EQUIP_IDS.filter((id) => (stock?.[id] || 0) > 0).map((id) => {
        const n = Math.floor((stock[id] || 0) * DIP.LEND_MAX);
        return (
          <button key={id} className="dip-lend-tile" disabled={n < 1} onClick={() => lendTo(c.tag, id)} title={`Poslat ${n} ks (${Math.round(DIP.LEND_MAX * 100)} % skladu): ${EQUIP[id].n}`}>
            <span className="ab">{EQUIP[id].ab}</span><b>+{n}</b>
          </button>
        );
      })}
    </div>
  );
}

const groupColor = (k) => (EQUIP_GROUPS.find((g) => g.items.includes(k)) || EQUIP_GROUPS[0]).color;

/** F4: dobrovolníci nebo expediční sbor (vybrané divize, jinak jedna volná), povolání zpět a vojenský atašé. */
function Help({ c, state, me }) {
  useUi((s) => s.selDivs);   // výběr divizí mění, co se pošle
  const ids = c.volKind ? volunteerIds(state, me, c.o) : [];
  const block = c.volKind ? volBlock(state, me, c.o, ids) : null;
  const exp = c.volKind === 'exp';
  return (
    <div className="dip-acts">
      {c.volKind ? <Act icon="army" n={exp ? 'Expediční sbor' : 'Dobrovolníci'} cost={exp ? `${ids.length} vybraných divizí` : `${ids.length || 1} div. · volno ${c.volLeft}/${c.volCap}`} onClick={() => volunteersTo(c.tag)}
        block={block} hint={exp ? 'Předá vybrané divize (zůstanou na místě); bojují pod velením spojence, doplňujete je vy.' : 'Pošle vybrané divize (nebo jednu volnou) do hlavního města země; bojují pod jejím velením, doplňujete je vy a zkušenosti z bojů máte vy.'} /> : null}
      {c.volAway > 0 ? <Act icon="flag" n={`Povolat zpět (${c.volAway})`} onClick={() => recallVolunteersFrom(c.tag)} hint="Divize se vrátí domů (ty v boji až po bitvě)." /> : null}
      {c.attMine ? <Act icon="eye" n="Povolat atašé" onClick={() => attacheTo(c.tag, true)} />
        : <Act icon="eye" n="Vojenský atašé" cost={`${DIP.ATT_PP} PM`} onClick={() => attacheTo(c.tag)} block={c.attBlock} hint={`Pozorovatel v cizí válce: vaše armáda získává zkušenosti, divize země mají útok a obranu +${Math.round(DIP.ATT_ATK * 100)} %.`} />}
    </div>
  );
}

/** F4: licence na lepší výzbroj – dlaždice se siluetou, úrovní (vaše → jejich) a cenou. */
function Licences({ c }) {
  return (
    <div className="dip-lic-grid" role="group" aria-label="Licence">
      {c.lic.map((l) => (
        <button key={l.k} className="dip-lic-tile" disabled={!!l.block} onClick={() => licenceFrom(c.tag, l.k)} aria-label={`Licence: ${l.n}`}
          title={l.block ? `${l.n}: ${l.block}` : `${l.n}: úroveň ${l.mine} → ${l.theirs} za ${l.cost} PM`}>
          <span className="eq-tile" style={{ '--g': groupColor(l.k), width: 40, height: 40 }} aria-hidden="true"><EquipIcon eq={l.k} size={32} color="var(--paper)" /></span>
          <span className="lic-lv"><i>{l.mine}</i><em>›</em><b>{l.theirs}</b></span>
          <i className="lic-cost">{l.cost} PM</i>
        </button>
      ))}
    </div>
  );
}

/** Detail vybrané země: záhlaví s vlajkou a ukazateli, odznaky a akce po skupinách. */
function Detail({ c, state, me, onClose }) {
  const w = getWorld();
  const ideo = IDEOLOGIES[ideologyOf(state, c.o)];
  const divs = divisionCount(state, c.tag), mine = divisionCount(state, w.owners[me].tag);
  const badges = badgesOf(c);
  return (
    <section className="dip-detail" aria-label={`Detail: ${c.name}`}>
      <header className="dd-head">
        <Flag tag={c.tag} width={84} />
        <div className="dd-title">
          <h3>{c.name}</h3>
          <span className="muted">{COUNTRIES[c.tag]?.government || ''}{ideo ? <> · <i className="ideo-dot" style={{ background: ideo.color }} />{ideo.name}</> : null}</span>
          <span className="muted">{c.faction ? <><Icon name="flag" size={13} /> {c.faction.nm} ({c.faction.mem.length})</> : 'Bez bloku'}</span>
        </div>
        <button className="icon-btn sm" onClick={() => selectLabel(w.owners[c.o].cap, true)} title="Ukázat hlavní město na mapě" aria-label="Ukázat"><Icon name="target" size={16} /></button>
        <button className="icon-btn sm" onClick={onClose} title="Zavřít detail" aria-label="Zavřít detail"><Icon name="close" size={16} /></button>
      </header>
      <div className="dd-meters">
        <div><span className="muted">Vztah</span><RelGauge rel={c.rel} big /></div>
        <div title={`Divize: ${c.name} ${divs}, vy ${mine}`}><span className="muted">Síla armády</span>
          <span className="force-bar"><i className="me" style={{ width: `${(100 * mine) / Math.max(1, mine + divs)}%` }} /><i className="them" /></span>
          <b className="force-nums">{mine} : {divs}</b>
        </div>
        {c.war ? <div><span className="muted">Válečné skóre</span><b className={c.score >= 0 ? 'good' : 'bad'}>{c.score > 0 ? '+' : ''}{fmtNum(c.score * 100, 0)} %</b></div> : null}
      </div>
      {badges.length > 0 && <div className="dd-badges">{badges.map(([k, ic, t], i) => <span key={i} className={`dd-badge ${k}`}><Icon name={ic} size={14} />{t}</span>)}</div>}

      <h4>Válka</h4>
      <div className="dip-acts">
        {c.war ? <Act icon="handshake" n="Navrhnout mír" onClick={() => makePeaceWith(c.tag)} block={c.peaceBlock} />
          : c.canDeclare ? <Act icon="swords" n="Vyhlásit válku" tone="danger" onClick={() => declareWarOn(c.tag)} />
            : c.goals.map((g) => <Act key={g.id} icon="scroll" n={`Ospravedlnit: ${g.n}`} cost={`${g.pp} PM · ${g.days} d`} onClick={() => justifyOn(c.tag, g.id)} block={g.block} />)}
        {!c.war && c.demands.map((dm) => <Act key={dm.id} icon="gavel" n={`Ultimátum: ${dm.n}`} cost={`přesila ${fmtNum(dm.have, 1)}× / ${dm.need}×`} tone="danger" onClick={() => demandFrom(c.tag, dm.id)} block={dm.block} />)}
      </div>
      {c.just && !c.just.done ? <div className="just-bar" title="Ospravedlňování války"><i style={{ width: `${Math.round(100 * (1 - c.just.left / Math.max(1, ...c.goals.map((g) => WARGOALS[g.id]?.days || 30))))}%` }} /><span>Ospravedlnění – ještě {c.just.left} dní</span></div> : null}
      {!c.war && !c.canDeclare && c.justifyBlock && !c.just ? <p className="pol-block">{c.justifyBlock}</p> : null}

      {!c.war && (
        <>
          <h4>Diplomacie</h4>
          <div className="dip-acts">
            <Act icon="heart" n="Zlepšit vztahy" cost={`+${DIP.IMPROVE_GAIN} · ${DIP.IMPROVE_PP} PM`} onClick={() => improveWith(c.tag)} block={c.improveBlock} />
            {!c.ally && (c.pact
              ? <Act icon="handshake" n="Vypovědět pakt" tone="danger" onClick={() => breakPactWith(c.tag)} block={c.pact.breakBlock} />
              : <Act icon="handshake" n="Pakt o neútočení" cost={`${DIP.NAP_PP} PM · ${c.pactOdds ? 'přijme' : 'odmítne'}`} onClick={() => offerPactTo(c.tag)} block={c.pactBlock} />)}
            {c.garMine ? <Act icon="shield" n="Zrušit záruku" onClick={() => revokeGuaranteeFor(c.tag)} />
              : <Act icon="shield" n="Zaručit nezávislost" cost={`${DIP.GAR_PP} PM`} onClick={() => guaranteeFor(c.tag)} block={c.garBlock} />}
            <Act icon="flag" n="Pozvat do bloku" cost={c.vote ? `hlasy pro ${Math.round((100 * c.vote.yes) / Math.max(0.1, c.vote.yes + c.vote.no))} %` : ''} onClick={() => inviteBloc(c.tag)} block={c.inviteBlock}
              hint={c.vote ? `Hlasování členů (váha podle továren, vedoucí dvojnásob): ${c.vote.list.map((v) => `${getWorld().owners[v.o].name} ${v.y ? 'pro' : 'proti'} (${v.w})`).join(', ')}` : ''} />
            {c.kick ? <Act icon="close" n="Vyloučit z bloku" tone="danger" onClick={() => kickBloc(c.tag)} block={c.kick.block} hint="O vyloučení hlasují ostatní členové podle vztahů k vylučovanému." /> : null}
            {!c.access && <Act icon="road" n="Požádat o přístup" cost={`${DIP.ACC_PP} PM`} onClick={() => requestAccessFrom(c.tag)} block={c.accBlock} />}
            {c.accMine ? <Act icon="road" n="Odvolat přístup" onClick={() => revokeAccessFrom(c.tag)} />
              : !c.accGiven && <Act icon="road" n="Dát přístup" cost="zdarma" onClick={() => grantAccessTo(c.tag)} block={c.giveBlock} />}
          </div>
        </>
      )}

      {c.mine && (
        <>
          <h4>Loutka · {AUTONOMY_NAMES[c.auLevel]}</h4>
          <div className="au-bar" title={`Autonomie ${Math.round(c.au)} %`}><i style={{ width: `${Math.round(c.au)}%` }} /><span>autonomie {Math.round(c.au)} %</span></div>
          <div className="dip-acts">
            <Act icon="chain" n="Utáhnout kontrolu" cost={`${DIP.AU_TIGHT_PP} PM · −${DIP.AU_TIGHT}`} onClick={() => tightenPuppet(c.tag)} block={c.tightBlock} />
            <Act icon="heart" n="Uvolnit kontrolu" cost={`+${DIP.AU_LOOSE}`} onClick={() => loosenPuppet(c.tag)} block={c.looseBlock} />
            <Act icon="crown" n="Anektovat loutku" tone="danger" onClick={() => annexOwnPuppet(c.tag)} block={c.annexBlock} />
          </div>
        </>
      )}

      {!c.war && (c.fighting || c.volAway > 0 || c.attMine) && (<><h4>Vojenská pomoc</h4><Help c={c} state={state} me={me} /></>)}
      {!c.war && c.lic.length > 0 && (<><h4>Licence na výzbroj</h4><Licences c={c} /></>)}
      {c.friend && (<><h4>Půjčka a pronájem</h4><Lend c={c} stock={state.mil.stock[me]} /></>)}
    </section>
  );
}

/** S10: společné cíle bloku – splněné (bonus), rozpracované s postupem a nabídka pro vedoucího jako dlaždice. */
function BlocGoals({ g, ldr }) {
  if (!g) return null;
  const bonus = (id) => Object.entries(FAC_GOALS[id].mod).map(([k, v]) => `${MOD_N[k] || k} +${Math.round(v * 100)} %`).join(', ');
  return (
    <div className="bloc-goals" aria-label="Společné cíle bloku">
      {g.done.map((id) => <span key={id} className="bg-tile done" title={`${FAC_GOALS[id].n} – splněno. Bonus pro všechny členy: ${bonus(id)}.`}><Icon name={FAC_GOALS[id].icon} size={16} /><Icon name="check" size={12} /></span>)}
      {g.act.map((x) => (
        <span key={x.id} className="bg-tile act" title={`${FAC_GOALS[x.id].n}: ${FAC_GOALS[x.id].info} Odměna: ${bonus(x.id)}.${ldr ? ' Klik cíl zruší.' : ''}`} onClick={ldr ? () => blocGoal(x.id, false) : undefined} role={ldr ? 'button' : undefined}>
          <Icon name={FAC_GOALS[x.id].icon} size={16} /><span className="bg-bar"><i style={{ width: `${Math.min(100, (100 * x.cur) / x.need)}%` }} /></span>
        </span>
      ))}
      {ldr && g.open.filter((x) => !x.block).map((x) => (
        <button key={x.id} className="bg-tile pick" onClick={() => blocGoal(x.id)} title={`Zvolit společný cíl: ${FAC_GOALS[x.id].n}. ${FAC_GOALS[x.id].info} Postup ${Math.round(x.cur)} / ${x.need}. Odměna: ${bonus(x.id)}.`} aria-label={`Zvolit cíl ${FAC_GOALS[x.id].n}`}>
          <Icon name={FAC_GOALS[x.id].icon} size={16} /><Icon name="plus" size={11} />
        </button>
      ))}
    </div>
  );
}
const MOD_N = { man: 'lidská síla', prod: 'výroba', research: 'výzkum', stab: 'stabilita', build: 'stavby' };

const FILTERS = [['all', 'Vše'], ['war', 'Válka'], ['ally', 'Spojenci'], ['near', 'Sousedé']];

/** Záložka Diplomacie: mřížka karet zemí (filtr, hledání), detail vybrané země a váš blok. */
export function DiplomacyPanel() {
  const state = useGameSlow((s) => s, 700);
  const me = playerIdx(state);
  const [name, setName] = useState('');
  const [pick, setPick] = useState(-1);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const d = useMemo(() => (me ? diplomacyOf(state, me) : null), [state.dip, state.mil.wars, state.pol, state.ctrl, state.stateOwner, state.tick, me]);
  const near = useMemo(() => {   // sousedé po souši (podle kontroly provincií)
    const w = getWorld(), out = new Set();
    if (!me) return out;
    for (let p = 1; p <= w.L; p++) if (state.ctrl[p] === me) w.forLandNeighbors(p, (q2) => { const c = state.ctrl[q2]; if (c && c !== me) out.add(c); });
    return out;
  }, [state.ctrl, me]);
  if (!me) return <div className="prod-screen dip-panel"><div className="prod-body"><p className="empty">Jako pozorovatel nevedete žádnou diplomacii.</p></div></div>;
  const all = [...d.list].sort((a, b) => (b.war - a.war) || (b.ally - a.ally) || (near.has(b.o) - near.has(a.o)) || (b.rel - a.rel));
  const ql = q.trim().toLowerCase();
  const list = all.filter((c) => (filter === 'war' ? c.war : filter === 'ally' ? c.ally || c.garMine || c.pact || c.mine : filter === 'near' ? near.has(c.o) : true) && (!ql || c.name.toLowerCase().includes(ql)));
  const cur = pick > 0 ? all.find((c) => c.o === pick) || null : null;   // detail až po kliknutí na kartu (u kraje se vysune vedle panelu)
  const f = d.faction;
  return (
    <Screen cls="dip-panel" title="Diplomacie" icon="dip" head={(
      <div className="dip-held" title={`Kapitulace při ${Math.round(capLimitOf(me).share * 100)} % území v rukou nepřítele`}>
        <span className="muted">Území v rukou nepřátel</span>
        <span className="held-bar"><i style={{ width: `${Math.min(100, d.held.share * 100)}%` }} /><em style={{ left: `${capLimitOf(me).share * 100}%` }} /></span>
        <b>{fmtNum(d.held.share * 100, 0)} %</b>
      </div>
    )}>
      <div className="prod-body">
        <div className="prod-cols dip-cols">
          <div className="prod-left">
            <div className="dip-tools">
              <div className="seg" role="group" aria-label="Filtr zemí">
                {FILTERS.map(([id, t]) => <button key={id} className={`sbtn ${filter === id ? 'primary' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{t}</button>)}
              </div>
              <input className="dip-search" type="search" value={q} placeholder="Hledat zemi" aria-label="Hledat zemi" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            </div>
            {d.offers.length > 0 && (
              <section className="dip-offers" aria-label="Diplomatické nabídky">
                {d.offers.map((x) => (
                  <div key={x.tag} className="offer-card">
                    <Flag tag={x.tag} width={34} /><Icon name="handshake" size={20} />
                    <span><b>{x.name}</b> nabízí pakt o neútočení<i className="muted"> · ještě {x.left} d</i></span>
                    <button className="icon-btn sm ok" onClick={() => answerPactFrom(x.tag, true)} aria-label="Přijmout" title="Přijmout"><Icon name="check" size={16} /></button>
                    <button className="icon-btn sm" onClick={() => answerPactFrom(x.tag, false)} aria-label="Odmítnout" title="Odmítnout"><Icon name="close" size={16} /></button>
                  </div>
                ))}
              </section>
            )}
            <section aria-label="Blok" className="dip-bloc">
              <h4>Váš blok</h4>
              {f ? (
                <>
                  <div className="q-top"><Icon name="flag" size={18} /><b>{f.nm}</b><button className="sbtn" onClick={leaveBloc} title="Opustit blok">Opustit</button></div>
                  <div className="bloc-flags">{f.mem.map((o) => <span key={o} className={`bloc-mem ${o === f.ldr ? 'ldr' : ''}`} title={`${getWorld().owners[o].name}${o === f.ldr ? ' – vedoucí' : ''}`}><Flag tag={getWorld().owners[o].tag} width={34} />{o === f.ldr ? <Icon name="crown" size={12} /> : null}</span>)}</div>
                  <BlocGoals g={d.goals} ldr={f.ldr === me} />
                </>
              ) : d.capitulated ? <p className="muted">Země kapitulovala.</p> : (
                <div className="dip-found">
                  <input type="text" value={name} maxLength={30} placeholder="Název bloku" aria-label="Název bloku" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  <button className="sbtn primary" disabled={!d.canFound} onClick={() => foundBloc(name)} title={`Založit blok: ${DIP.FAC_PP} PM`}>Založit blok</button>
                </div>
              )}
            </section>
            <div className="dip-grid" role="list" aria-label={`Země (${list.length})`}>
              {list.map((c) => <Card key={c.o} c={c} on={cur && cur.o === c.o} onPick={() => setPick(pick === c.o ? -1 : c.o)} />)}
              {!list.length && <p className="empty">Žádná země neodpovídá filtru.</p>}
            </div>
          </div>
          <aside className={`prod-right dip-side ${cur ? 'open' : ''}`}>
            {cur ? <Detail c={cur} state={state} me={me} onClose={() => setPick(-1)} /> : <p className="empty">Vyberte zemi.</p>}
          </aside>
        </div>
      </div>
    </Screen>
  );
}
