import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { closePopup } from '../actions.js';

/** Vyskakovací oznámení vpravo (národní cíl splněn, výzkum, stavba, válka…): klik nebo × zavře, většina mizí sama. */
export function Popups() {
  const list = useUi((s) => s.popups);
  if (!list.length) return null;
  return (
    <div className="popups" aria-live="polite">
      {list.map((p) => (
        <article key={p.id} className={`popup ${p.tone} ${p.kind}`} role="status" aria-label={`${p.title}: ${p.text}`} onClick={() => closePopup(p.id)}>
          <div className="popup-ic"><Icon name={p.icon} size={26} /></div>
          <div className="popup-body">
            <h4>{p.title}</h4>
            <p className="popup-text">{p.text}</p>
            {p.lines.length > 0 && <ul>{p.lines.slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul>}
          </div>
          <button className="icon-btn" aria-label="Zavřít oznámení" onClick={(e) => { e.stopPropagation(); closePopup(p.id); }}><Icon name="close" size={16} /></button>
        </article>
      ))}
    </div>
  );
}
