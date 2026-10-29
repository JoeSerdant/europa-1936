import { useEffect } from 'react';
import { useGame } from '../store.js';
import { play } from '../sound.js';
import { ackGameEnd, goMenu } from '../actions.js';
import { formatDate } from '../../engine/index.js';

const TEXT = {
  win: { title: 'Vítězství', lead: 'Váš blok ovládá polovinu světa. Válka je rozhodnuta.' },
  lose: { title: 'Porážka', lead: 'Vaše země kapitulovala. Další dějiny se píšou bez vás.' },
  time: { title: 'Konec války', lead: 'Je 1. ledna 1946. Poválečný svět je rozdělen.' },
};

/** Konec hry: shrnutí (podíl světa, pořadí, skóre) a volba pokračovat nebo odejít do menu. */
export function EndDialog() {
  const end = useGame((s) => s.end);
  const shown = !!end && !end.ack;
  useEffect(() => { if (shown) play('end'); }, [shown]);
  if (!end || end.ack) return null;
  const t = TEXT[end.kind];
  return (
    <div className="scrim end-scrim" role="presentation">
      <div className={`panel dialog wide end-dialog ${end.kind}`} role="dialog" aria-label={t.title} aria-modal="true">
        <h2>{t.title}</h2>
        <p>{t.lead}</p>
        <dl className="end-stats">
          <div><dt>Datum</dt><dd>{formatDate(end.tick)}</dd></div>
          <div><dt>Podíl světa (blok a loutky)</dt><dd>{Math.round(end.share * 1000) / 10} %</dd></div>
          <div><dt>Pořadí zemí</dt><dd>{end.rank}.</dd></div>
          <div><dt>Body pod kontrolou</dt><dd>{end.vp}</dd></div>
          <div><dt>Skóre</dt><dd>{end.score}</dd></div>
        </dl>
        <div className="stack">
          <button className="btn primary" onClick={ackGameEnd}>Pokračovat ve hře</button>
          <button className="btn" onClick={goMenu}>Hlavní menu</button>
        </div>
      </div>
    </div>
  );
}
