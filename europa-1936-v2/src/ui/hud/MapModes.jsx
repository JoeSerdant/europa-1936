import { useUi } from '../store.js';
import { Icon } from '../common/Icon.jsx';
import { MODES, TERRAIN_COLORS, CLIMATE_COLORS, SUPPLY_CSS } from '../map/colors.js';
import { TERRAIN_CS, CLIMATE_CS } from '../../engine/index.js';
import { setMode } from '../actions.js';

/** Mapové režimy jako v HOI4: řada tlačítek s ikonami vedle minimapy (název a klávesa 1–0 v nápovědě). */
export function MapModes() {
  const mode = useUi((s) => s.mode);
  const cur = MODES.find((m) => m.id === mode) || MODES[0];
  return (
    <div className="mm" role="toolbar" aria-label="Mapové režimy" data-mode={cur.name}>
      {MODES.map((m, i) => { const key = i < 9 ? String(i + 1) : i === 9 ? '0' : ''; return (
        <button key={m.id} className={`mm-btn ${m.id === mode ? 'on' : ''}`} aria-pressed={m.id === mode} aria-label={m.name} title={`${m.name}${key ? ` (${key})` : ''}: ${m.hint}`} onClick={() => setMode(m.id)}>
          <Icon name={m.id} size={18} />
        </button>
      ); })}
    </div>
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
  } else if (mode === 'resistance' || mode === 'compliance') {
    body = (
      <>
        <div className="ramp"><div style={{ background: 'linear-gradient(90deg, rgb(98,176,92), rgb(214,68,48))' }} /><span>{mode === 'resistance' ? 'klid' : 'poddajné'}</span><span>{mode === 'resistance' ? 'vysoký odboj' : 'vzdorující'}</span></div>
        <p className="legend-note">Jen okupované státy. Garnizona (divize v okupovaném státě) odboj snižuje a poddajnost zrychluje.</p>
      </>
    );
  } else if (mode === 'weather') {
    body = <p className="legend-note">Bílá = mráz (zpomaluje pochod a obnovu organizace, snižuje útok), hnědá = bláto na jaře a na podzim, oranžová = vedro. Barvy se mění s ročním obdobím.</p>;
  } else if (mode === 'airsup') {
    body = (
      <>
        <div className="ramp"><div style={{ background: 'linear-gradient(90deg, rgb(214,68,48), rgb(156,122,70), rgb(98,176,92))' }} /><span>nepřítel</span><span>vaše převaha</span></div>
        <p className="legend-note">Převaha ve vzduchu nad strategickými regiony podle hlídek a stíhání (vaše strana proti nepřátelům). Při nepřátelské převaze vaše divize v regionu slábnou v útoku i obraně. Šedé regiony nikdo nehlídá.</p>
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
