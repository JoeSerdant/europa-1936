import { useEffect, useMemo, useState } from 'react';
import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { BATTALIONS, SUPPORT, GRID, EQUIP, deriveStats, validateTemplate } from '../../engine/index.js';
import { closeDesigner, updateDraft, saveDesigner } from '../actions.js';
import { fmtInt, fmtNum, fmtDays } from '../format.js';
import { placeBattalion, removeBattalion, toggleSupport, setName } from './designer.js';
import { ClsIcon } from './parts.jsx';
import { CLS_NAMES } from './helpers.js';

const rows = (n) => Array.from({ length: n }, (_, i) => i);

function Cell({ type, onPlace, onRemove, label }) {
  const def = type ? BATTALIONS[type] : null;
  return (
    <button className={`dz-cell ${def ? `on sym-${def.sym}` : ''}`} onClick={onPlace} onContextMenu={(e) => { e.preventDefault(); if (def) onRemove(); }}
      aria-label={def ? `${label}: ${def.n}` : `${label}: prázdné místo`} title={def ? `${def.n} (pravé tlačítko = odebrat)` : 'Položit vybraný prapor'}>
      {def ? <><b>{def.ab}</b><ClsIcon cls={def.sym} size={26} /></> : <Icon name="plus" size={16} />}
    </button>
  );
}

function UnitInfo({ def }) {
  if (!def) return <p className="muted">Vyberte prapor nebo rotu z nabídky.</p>;
  const need = Object.entries(def.need || {});
  return (
    <div className="dz-info">
      <b>{def.n}</b>
      <p>{def.info}</p>
      <div className="dz-nums">
        <span><i>Síla</i>{fmtNum(def.hp, 0)}</span>
        <span><i>Org.</i>{fmtNum(def.org, 0)}</span>
        <span><i>Muži</i>{fmtInt(def.men)}</span>
        <span><i>Útok</i>{fmtNum(def.soft, 1)}/{fmtNum(def.hard, 1)}</span>
        <span><i>Obrana</i>{fmtNum(def.def, 0)}</span>
        <span><i>Průraz</i>{fmtNum(def.brk, 1)}</span>
        {def.armor > 0 && <span><i>Pancíř</i>{fmtNum(def.armor, 0)}</span>}
        {def.spd < 99 && <span><i>Rychl.</i>{fmtNum(def.spd, 0)}</span>}
        <span><i>Výcvik</i>{fmtDays(def.days)}</span>
      </div>
      <div className="tpl-cost">{need.map(([e, n]) => <span key={e} className="cost" title={EQUIP[e].n}>{EQUIP[e].ab} {fmtInt(n)}</span>)}</div>
    </div>
  );
}

/** Okno pro návrh nebo úpravu šablony divize: pluky × prapory, podpůrné roty a živé statistiky. */
export function TemplateDesigner() {
  const dz = useUi((s) => s.designer);
  const [brush, setBrush] = useState('pesi');
  const [peek, setPeek] = useState(null);       // prapor/rota, na kterou se ukazuje myší
  const [error, setError] = useState('');
  useEffect(() => { setError(''); setBrush('pesi'); setPeek(null); }, [dz && dz.tplId, !!dz]);
  const draft = dz ? dz.draft : null;
  const stats = useMemo(() => (draft && draft.reg.length ? deriveStats(draft) : null), [draft]);
  const problem = useMemo(() => (draft ? validateTemplate(draft) : null), [draft]);
  if (!dz) return null;

  const edit = (next) => { if (next !== draft) { setError(''); updateDraft(next); } };
  const save = () => { const err = saveDesigner(); if (err) setError(err); };
  const info = peek ? (BATTALIONS[peek] || SUPPORT[peek]) : (BATTALIONS[brush] || SUPPORT[brush]);

  return (
    <div className="scrim" role="presentation">
      <div className="panel dialog designer" role="dialog" aria-label="Návrhář divize" aria-modal="true">
        <header className="dz-head">
          <h2>{dz.tplId ? 'Upravit šablonu' : 'Nová šablona divize'}</h2>
          <input className="dz-name" value={draft.nm} maxLength={40} aria-label="Název šablony" placeholder="Název divize"
            onChange={(e) => edit(setName(draft, e.target.value))} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') closeDesigner(); }} />
          <button className="icon-btn" onClick={closeDesigner} aria-label="Zavřít návrhář" title="Zavřít (Esc)"><Icon name="close" size={18} /></button>
        </header>
        <div className="dz-body">
          <section className="dz-left">
            <h3>Pluky a prapory</h3>
            <div className="dz-grid" role="group" aria-label="Pluky">
              {rows(GRID.cols).map((c) => (
                <div className="dz-col" key={c}>
                  <span className="dz-col-head">{c + 1}. pluk</span>
                  {rows(GRID.rows).map((r) => {
                    const type = draft.reg[c] ? draft.reg[c][r] : undefined;
                    // prázdné místo ukazujeme jen na prvním volném řádku pluku (pluk nemá mezery) a v prvním volném pluku
                    const free = !type && ((draft.reg[c] && r === draft.reg[c].length) || (!draft.reg[c] && c === draft.reg.length && r === 0));
                    if (!type && !free) return <span className="dz-cell ghost" key={r} aria-hidden="true" />;
                    return <Cell key={r} type={type} label={`${c + 1}. pluk, řádek ${r + 1}`}
                      onPlace={() => (type && type === brush ? edit(removeBattalion(draft, c, r)) : edit(placeBattalion(draft, c, r, brush)))}
                      onRemove={() => edit(removeBattalion(draft, c, r))} />;
                  })}
                </div>
              ))}
            </div>
            <p className="muted dz-hint">Klikem položíte vybraný prapor. Klik na stejný prapor ho odebere, pravé tlačítko také.</p>
            <h3>Podpůrné roty <i>{draft.sup.length} / {GRID.support}</i></h3>
            <div className="dz-support" role="group" aria-label="Podpůrné roty">
              {rows(GRID.support).map((i) => {
                const t = draft.sup[i];
                const d = t ? SUPPORT[t] : null;
                return (
                  <button key={i} className={`dz-cell sup ${d ? 'on' : ''}`} onClick={() => d && edit(toggleSupport(draft, t))} disabled={!d}
                    aria-label={d ? `Odebrat: ${d.n}` : 'Volné místo pro rotu'} title={d ? `${d.n} (klik = odebrat)` : 'Volné místo – vyberte rotu vpravo'}>
                    {d ? <b>{d.ab}</b> : <Icon name="plus" size={14} />}
                  </button>
                );
              })}
            </div>
            <div className="dz-stats" aria-label="Výsledné statistiky">
              {stats ? (
                <>
                  <span className="dz-cls"><ClsIcon cls={stats.cls} size={28} />{CLS_NAMES[stats.cls]}</span>
                  <dl>
                    <div><dt>Síla</dt><dd>{fmtNum(stats.hp, 0)}</dd></div>
                    <div><dt>Organizace</dt><dd>{fmtNum(stats.org, 0)}</dd></div>
                    <div><dt>Útok (měkký / tvrdý)</dt><dd>{fmtNum(stats.soft, 0)} / {fmtNum(stats.hard, 0)}</dd></div>
                    <div><dt>Obrana</dt><dd>{fmtNum(stats.def, 0)}</dd></div>
                    <div><dt>Průraz</dt><dd>{fmtNum(stats.brk, 0)}</dd></div>
                    <div><dt>Pancíř / průraz zbraní</dt><dd>{fmtNum(stats.armor, 0)} / {fmtNum(stats.pierce, 0)}</dd></div>
                    <div><dt>Rychlost</dt><dd>{fmtNum(stats.speed, 0)}</dd></div>
                    <div><dt>Šířka v bitvě</dt><dd>{fmtNum(stats.width, 0)}</dd></div>
                    <div><dt>Zásoby za hodinu</dt><dd>{fmtNum(stats.sup, 2)}</dd></div>
                    <div><dt>Lidská síla</dt><dd>{fmtInt(stats.men)}</dd></div>
                    <div><dt>Výcvik</dt><dd>{fmtDays(stats.days)}</dd></div>
                  </dl>
                  <div className="tpl-cost">{Object.entries(stats.need).map(([e, n]) => <span key={e} className="cost" title={EQUIP[e].n}>{EQUIP[e].ab} {fmtInt(n)}</span>)}</div>
                </>
              ) : <p className="muted">Položte aspoň jeden prapor.</p>}
            </div>
          </section>
          <section className="dz-right">
            <h3>Prapory</h3>
            <ul className="dz-palette" aria-label="Druhy praporů">
              {Object.entries(BATTALIONS).map(([id, d]) => (
                <li key={id}>
                  <button className={`dz-pick ${brush === id ? 'on' : ''}`} disabled={!!d.unlock} onClick={() => setBrush(id)}
                    onMouseEnter={() => setPeek(id)} onMouseLeave={() => setPeek(null)} onFocus={() => setPeek(id)} onBlur={() => setPeek(null)} aria-pressed={brush === id}>
                    <b>{d.ab}</b><span>{d.n}</span>{d.unlock ? <i>výzkum</i> : null}
                  </button>
                </li>
              ))}
            </ul>
            <h3>Podpůrné roty</h3>
            <ul className="dz-palette" aria-label="Druhy podpůrných rot">
              {Object.entries(SUPPORT).map(([id, d]) => (
                <li key={id}>
                  <button className={`dz-pick ${draft.sup.includes(id) ? 'on' : ''}`} disabled={!!d.unlock || (!draft.sup.includes(id) && draft.sup.length >= GRID.support)}
                    onClick={() => edit(toggleSupport(draft, id))} onMouseEnter={() => setPeek(id)} onMouseLeave={() => setPeek(null)} onFocus={() => setPeek(id)} onBlur={() => setPeek(null)} aria-pressed={draft.sup.includes(id)}>
                    <b>{d.ab}</b><span>{d.n}</span>{d.unlock ? <i>výzkum</i> : null}
                  </button>
                </li>
              ))}
            </ul>
            <UnitInfo def={info} />
          </section>
        </div>
        <footer className="dz-foot">
          <p className="dz-error" role="alert">{error || (problem && draft.reg.length ? problem : '')}</p>
          <button className="btn" onClick={closeDesigner}>Zrušit</button>
          <button className="btn primary" onClick={save} disabled={!!problem}>Uložit šablonu</button>
        </footer>
      </div>
    </div>
  );
}
