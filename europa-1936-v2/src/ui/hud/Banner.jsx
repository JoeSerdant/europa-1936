import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { closeBanner } from '../actions.js';

/** Velký pruh uprostřed nahoře (M101): národní cíl splněn, výzkum dokončen, válka, mír… Klik zavře a ukáže další. */
export function Banner() {
  const b = useUi((s) => s.banners[0] || null);
  if (!b) return null;
  return (
    <div className="banner-wrap" aria-live="polite">
      <article key={b.id} className={`banner ${b.tone} ${b.kind}`} role="status" aria-label={`${b.title}: ${b.text}`} onClick={closeBanner}>
        <span className="banner-rays" aria-hidden="true" />
        <div className="banner-ic"><Icon name={b.icon} size={34} /></div>
        <div className="banner-body">
          <h3>{b.title}</h3>
          <p>{b.text}</p>
          {b.chips.length > 0 && <ul>{b.chips.map((c, i) => <li key={i} style={{ animationDelay: `${0.35 + i * 0.12}s` }}>{c}</li>)}</ul>}
        </div>
        <span className="banner-shine" aria-hidden="true" />
      </article>
    </div>
  );
}
