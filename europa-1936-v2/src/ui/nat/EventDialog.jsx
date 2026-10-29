import { useGame } from '../store.js';
import { EVENT_BY_ID, fxLinesOf } from '../../engine/index.js';
import { playerIdx, decideEvent } from '../actions.js';

/** Okno události: zobrazí první čekající událost hráče; volba provede účinky. Bez volby se nedá zavřít. */
export function EventDialog() {
  const pend = useGame((s) => (s.player ? s.nat.pend.find((p) => p.o === playerIdx(s)) || null : null));
  if (!pend) return null;
  const ev = EVENT_BY_ID[pend.id];
  return (
    <div className="scrim" role="presentation">
      <div className="panel dialog wide event-dialog" role="dialog" aria-label={ev.n} aria-modal="true">
        <h2>{ev.n}</h2>
        <p className="ev-text">{ev.text}</p>
        <div className="stack">
          {ev.opts.map((o, i) => {
            const lines = fxLinesOf(o.fx);
            return (
              <button key={i} className="ev-opt" onClick={() => decideEvent(pend.id, i)}>
                <b>{o.n}</b>
                {lines.length ? <span className="muted">{lines.join(' · ')}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
