import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { MODES, TERRAIN_COLORS, CLIMATE_COLORS, SUPPLY_CSS } from '../map/colors.js';
import { TERRAIN_CS, CLIMATE_CS } from '../../engine/index.js';
import { setMode } from '../actions.js';

/** Svislá lišta mapových režimů (vlevo). */
export function MapModes() {
  const mode = useUi((s) => s.mode);
  return (
    <nav className="rail" aria-label="Mapové režimy">
      {MODES.map((m, i) => (
        <div className="rail-item" key={m.id}>
          <button className={m.id === mode ? 'on' : ''} onClick={() => setMode(m.id)} aria-label={m.name} aria-pressed={m.id === mode}>
            <Icon name={m.id} size={22} />
          </button>
          <span className="tip"><b>{m.name}</b><i>{m.hint}</i><kbd>{i + 1}</kbd></span>
        </div>
      ))}
    </nav>
  );
}

const RAMP_CSS = 'linear-gradient(90deg, rgb(243,236,212), rgb(233,196,120), rgb(214,140,60), rgb(170,82,38), rgb(96,44,30))';
const GOLD_CSS = 'linear-gradient(90deg, rgb(120,120,112), rgb(201,162,74), rgb(255,214,90))';

/** Vysvětlivky ke zvolenému mapovému režimu (nad minimapou). */
export function Legend() {
  const mode = useUi((s) => s.mode);
  let body = null;
  if (mode === 'terrain') {
    body = (
      <ul className="swatches">
        {TERRAIN_COLORS.map((c, i) => <li key={i}><span style={{ background: c }} />{TERRAIN_CS[i]}</li>)}
      </ul>
    );
  } else if (mode === 'regions') {
    body = (
      <ul className="swatches two">
        {Object.entries(CLIMATE_COLORS).map(([k, c]) => <li key={k}><span style={{ background: c }} />{CLIMATE_CS[k]}</li>)}
      </ul>
    );
  } else if (mode === 'population') {
    body = <div className="ramp"><div style={{ background: RAMP_CSS }} /><span>řídce</span><span>hustě</span></div>;
  } else if (mode === 'victory') {
    body = <div className="ramp"><div style={{ background: GOLD_CSS }} /><span>bez bodů</span><span>hodnotné město</span></div>;
  } else if (mode === 'supply') {
    body = (
      <>
        <div className="ramp"><div style={{ background: SUPPLY_CSS }} /><span>skoro bez zásob</span><span>dobré zásobování</span></div>
        <p className="legend-note">Ukazuje, kolik zásob dorazí z hlavního města a železničních uzlů do vašich provincií. Cizí provincie jsou ztlumené.</p>
      </>
    );
  } else if (mode === 'industry') {
    body = (
      <>
        <div className="ramp"><div style={{ background: RAMP_CSS }} /><span>bez továren</span><span>průmyslové jádro</span></div>
        <p className="legend-note">Barva ukazuje počet továren (civilních i vojenských) ve státě. Stavět lze v panelu Průmysl (I) nebo na kartě státu.</p>
      </>
    );
  } else if (mode === 'states') {
    body = <p>Odstíny rozlišují jednotlivé státy – stát je jednotka vlastnictví.</p>;
  }
  if (!body) return null;
  const m = MODES.find((x) => x.id === mode);
  return (
    <section className="panel legend" aria-label="Vysvětlivky">
      <h3>{m.name}</h3>
      {body}
    </section>
  );
}
