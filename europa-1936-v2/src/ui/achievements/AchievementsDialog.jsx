import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { ACHIEVEMENTS } from './list.js';
import { achDone } from './store.js';
import { setAchOpen } from '../actions.js';

/** Okno Úspěchy (M86): seznam všech úspěchů, splněné zvýrazněné. Otevírá se z nabídky ve hře. */
export function AchievementsDialog() {
  const open = useUi((s) => s.achOpen);
  if (!open) return null;
  const done = achDone();
  const n = ACHIEVEMENTS.filter((a) => done.has(a.id)).length;
  return (
    <div className="scrim" onClick={() => setAchOpen(false)}>
      <div className="panel dialog wide ach-dialog" role="dialog" aria-label="Úspěchy" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="sv-head"><h2><Icon name="victory" size={20} />Úspěchy <span className="muted">{n} z {ACHIEVEMENTS.length}</span></h2><button className="icon-btn" onClick={() => setAchOpen(false)} aria-label="Zavřít"><Icon name="close" /></button></header>
        <ul className="ach-list">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.id} className={done.has(a.id) ? 'done' : ''}>
              <Icon name={done.has(a.id) ? 'check' : 'victory'} size={18} />
              <div><b>{a.n}</b><span className="muted">{a.info}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
