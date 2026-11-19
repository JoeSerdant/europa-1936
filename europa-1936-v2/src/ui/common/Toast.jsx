import { useUi } from '../store.js';

/** Krátké oznámení (chyba příkazu, potvrzení). Mizí samo; `key` zajistí nové zobrazení při každé zprávě. */
export function Toast() {
  const t = useUi((s) => s.toast);
  if (!t) return null;
  return <div className={`panel toast ${t.kind === 'error' ? 'err' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'} key={t.id}>{t.text}</div>;
}
