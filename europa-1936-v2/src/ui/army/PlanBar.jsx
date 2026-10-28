import { useUi, useGame } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { PLAN_MODES, MODE_NAMES } from '../../engine/index.js';
import { cancelPlanEdit, confirmPlan, setPlanTool, setEditMode, planSuggest, planClearLists } from '../actions.js';
import { plural } from '../format.js';

const MODE_HINTS = {
  careful: 'Útočí, až je plánování nahromaděné (půl stropu) a divize jsou odpočaté (organizace 85 %).',
  balanced: 'Útočí, když mají divize aspoň 65 % organizace.',
  rush: 'Útočí hned, jakmile mají divize aspoň 35 % organizace.',
};

/** Lišta úpravy plánu armády (nahoře uprostřed): nástroje pro výběr provincií na mapě, režim útoku, potvrzení. */
export function PlanBar() {
  const pe = useUi((s) => s.planEdit);
  const name = useGame((s) => (pe && s.mil.armies[pe.army] ? s.mil.armies[pe.army].nm : ''));
  if (!pe) return null;
  const front = pe.kind === 'front';
  const count = (n) => `${n} ${plural(n, 'provincie', 'provincie', 'provincií')}`;
  const ready = front ? pe.line.length > 0 : pe.area.length > 0;
  return (
    <section className="panel planbar" aria-label="Úprava plánu armády">
      <header>
        <b>{front ? 'Linie fronty' : 'Hájit oblast'}</b>
        <span>{name}</span>
      </header>
      <div className="plan-tools" role="group" aria-label="Nástroj">
        {front ? (
          <>
            <button className={pe.tool === 'line' ? 'on' : ''} onClick={() => setPlanTool('line')} aria-pressed={pe.tool === 'line'}>
              <i className="sw line" />Linie <em>{count(pe.line.length)}</em>
            </button>
            <button className={pe.tool === 'to' ? 'on' : ''} onClick={() => setPlanTool('to')} aria-pressed={pe.tool === 'to'}>
              <i className="sw to" />Cíle útoku <em>{count(pe.to.length)}</em>
            </button>
          </>
        ) : (
          <button className="on" aria-pressed="true"><i className="sw line" />Hájená oblast <em>{count(pe.area.length)}</em></button>
        )}
        <button className="sbtn" onClick={planSuggest} title="Doplní provincie podle skutečné fronty v okolí armády"><Icon name="target" size={14} />Použít aktuální frontu</button>
        <button className="sbtn" onClick={planClearLists} title="Vymaže zvolené provincie"><Icon name="trash" size={14} />Vymazat</button>
      </div>
      {front && (
        <div className="seg" role="group" aria-label="Režim útoku">
          {PLAN_MODES.map((m) => <button key={m} className={pe.mode === m ? 'on' : ''} onClick={() => setEditMode(m)} title={MODE_HINTS[m]} aria-pressed={pe.mode === m}>{MODE_NAMES[m]}</button>)}
        </div>
      )}
      <p className="plan-help">Klikejte na provincie na mapě: přidávají se a odebírají. <kbd>Shift</kbd> + klik vybere celý stát.{front ? ' Linie je to, co armáda drží; cíle jsou nepřátelské provincie k dobytí.' : ''}</p>
      <footer>
        <button className="btn" onClick={cancelPlanEdit}>Zrušit</button>
        <button className="btn primary" onClick={confirmPlan} disabled={!ready}>Potvrdit plán</button>
      </footer>
    </section>
  );
}
