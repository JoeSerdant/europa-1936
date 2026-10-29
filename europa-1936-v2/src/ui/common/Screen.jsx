import { Icon } from './Icon.jsx';
import { closeSide } from '../actions.js';

/** Rám okna přes celou obrazovku (styl obrazovky Průmysl): záhlaví s názvem, volitelným obsahem uprostřed a zavíráním. */
export function Screen({ cls, title, icon, head, children }) {
  return (
    <div className={`prod-screen ${cls}`} role="dialog" aria-label={title}>
      <header className="prod-head">
        <h2><Icon name={icon} size={22} />{title}</h2>
        {head}
        <button className="icon-btn close" onClick={closeSide} aria-label="Zavřít okno" title="Zavřít (Esc)"><Icon name="close" size={20} /></button>
      </header>
      {children}
    </div>
  );
}
