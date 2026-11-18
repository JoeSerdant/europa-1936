import { useGame, useUi } from '../store.js';
import { confFor } from '../../engine/index.js';
import { Scene } from '../art/Scene.jsx';
import { closeNews, setNewsEnabled, playerIdx } from '../actions.js';

/** Novinová zpráva ze světa (M101): titulek, ilustrace, perex a text; hra stojí, dokud ji hráč nezavře. */
export function NewsDialog() {
  const n = useUi((s) => s.news[0] || null);
  const more = useUi((s) => s.news.length - 1);
  // konference a události hráče mají přednost – noviny počkají, až je vyřídí
  const busy = useGame((s) => { const me = playerIdx(s); return !!me && (!!confFor(s, me) || s.nat.pend.some((p) => p.o === me)); });
  if (!n || busy) return null;
  return (
    <div className="scrim news-scrim" role="presentation">
      <article key={n.id} className="news-paper" role="dialog" aria-modal="true" aria-label={n.headline}>
        <header className="news-mast"><span>{n.date}</span><b>{n.paper}</b><span>Zvláštní vydání</span></header>
        <h2 className="news-head">{n.headline}</h2>
        <Scene kind={n.art} className="news-art" />
        {n.sub && <p className="news-sub">{n.sub}</p>}
        {n.body && <p className="news-body">{n.body}</p>}
        <footer>
          <label className="news-off"><input type="checkbox" onChange={(e) => setNewsEnabled(!e.target.checked)} /> Nezobrazovat noviny</label>
          <button className="btn primary" autoFocus onClick={closeNews}>{more > 0 ? `Další zpráva (${more})` : 'Rozumím'}</button>
        </footer>
      </article>
    </div>
  );
}
