import { useEffect, useMemo, useState } from 'react';
import { useUi, useGame } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { mapController as mc } from '../map/controller.js';
import { lonLatOf } from '../map/sun.js';
import { Portrait } from '../army/Portrait.jsx';
import { COUNTRIES, IDEOLOGIES, TIER_NAMES, DIFF_NAMES } from '../../data/countries.js';

const REGIONS = [['eu', 'Evropa'], ['na', 'Sev. Amerika'], ['sa', 'Již. Amerika'], ['me', 'Blízký východ'], ['af', 'Afrika'], ['as', 'Asie'], ['oc', 'Oceánie']];

/** UI11: oblast země podle polohy hlavního města (jen pro filtr výběru, jako záložky v HOI4). */
export function regionOf(w, tag) {
  const cap = w.land[w.owners[w.ownerIdx[tag]].cap];
  const [lon, lat] = lonLatOf(cap.c[0], cap.c[1]);
  if (lon < -30) return lat > 7 ? 'na' : 'sa';
  if (lat < -12 && lon > 100) return 'oc';
  if (lon >= 60) return 'as';
  if (lon >= 34 && lat < 42) return 'me';
  if (lat < 35) return 'af';
  return 'eu';
}
import { allCountries, countryStats, getWorld, SCENARIOS, SCENARIO_IDS, RULES, RULE_IDS, DIFFICULTY, DIFF_IDS } from '../../engine/index.js';
import { goMenu, pickCountry, startGame, setAiOptions, INSETS } from '../actions.js';
import { fmtInt, fmtPop, fmtArea } from '../format.js';

function Pips({ n, total = 5 }) {
  return (
    <span className="pips" aria-label={`${n} z ${total}`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

/** Obrazovka výběru země (UI11 jako v HOI4): velmoci jako karty s portrétem a vlajkou, ostatní země jako mřížka vlajek se záložkami oblastí; mapa uprostřed, karta země vpravo. */
export function CountrySelect() {
  const pickTag = useUi((s) => s.pickTag);
  const aiDiff = useUi((s) => s.aiDiff);   // F3: pět stupňů obtížnosti
  const aiHist = useUi((s) => s.aiHist);
  const scenario = useUi((s) => s.scenario);
  const rules = useUi((s) => s.rules);
  const sc = SCENARIOS[scenario] || SCENARIOS[1936];
  const dead = !!pickTag && !!sc.dead && sc.dead.includes(pickTag);
  const owner = useGame((s) => s.stateOwner);
  const [region, setRegion] = useState('all');
  const { majors, others, regs } = useMemo(() => {
    const w0 = getWorld();
    const list = allCountries().filter((c) => COUNTRIES[c.tag]).map((c) => ({ ...c, reg: regionOf(w0, c.tag) })).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    return { majors: list.filter((c) => COUNTRIES[c.tag].tier === 1), others: list.filter((c) => COUNTRIES[c.tag].tier !== 1), regs: REGIONS.filter(([id]) => list.some((c) => c.reg === id && COUNTRIES[c.tag].tier !== 1)) };
  }, []);
  useEffect(() => {
    mc.stopDrift();
    mc.setInsets(INSETS.select);
    mc.flyToCountry(pickTag, 900, 0.3, 2.2);
    // jen při otevření obrazovky
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const w = getWorld();
  const info = COUNTRIES[pickTag];
  const stats = useMemo(() => countryStats({ stateOwner: owner }, pickTag), [owner, pickTag]);
  const ideo = IDEOLOGIES[info.ideology];
  const name = w.owners[w.ownerIdx[pickTag]].name;
  const capital = w.land[stats.capital];

  return (
    <>
      <aside className="panel select-list" aria-label="Seznam zemí">
        <header>
          <button className="icon-btn" onClick={goMenu} aria-label="Zpět do hlavního menu" title="Zpět"><Icon name="back" /></button>
          <h2>Vyberte zemi</h2>
        </header>
        <div className="scroll">
          <section aria-label="Velmoci">
            <h3>Velmoci</h3>
            <ul className="cs-majors">
              {majors.map((c) => (
                <li key={c.tag}>
                  <button className={c.tag === pickTag ? 'on' : ''} onClick={() => pickCountry(c.tag)} aria-pressed={c.tag === pickTag} aria-label={c.name} title={`${c.name} · ${COUNTRIES[c.tag].leader}`}>
                    <Portrait name={COUNTRIES[c.tag].leader} color={c.color} rank="M" w={64} h={78} />
                    <Flag tag={c.tag} width={56} />
                    <span className="nm">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Ostatní země">
            <nav className="cs-regs" role="tablist" aria-label="Oblast">
              <button role="tab" aria-selected={region === 'all'} className={region === 'all' ? 'on' : ''} onClick={() => setRegion('all')}>Vše</button>
              {regs.map(([id, n]) => <button key={id} role="tab" aria-selected={region === id} className={region === id ? 'on' : ''} onClick={() => setRegion(id)}>{n}</button>)}
            </nav>
            <ul className="cs-flags">
              {others.filter((c) => region === 'all' || c.reg === region).map((c) => (
                <li key={c.tag}>
                  <button className={c.tag === pickTag ? 'on' : ''} onClick={() => pickCountry(c.tag)} aria-pressed={c.tag === pickTag} aria-label={c.name} title={`${c.name} · ${TIER_NAMES[COUNTRIES[c.tag].tier]} · obtížnost ${DIFF_NAMES[COUNTRIES[c.tag].diff]}`}>
                    <Flag tag={c.tag} width={46} />
                    <span className="nm">{c.name}</span>
                    <Pips n={COUNTRIES[c.tag].diff} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>

      <aside className="panel country-card" aria-label={`Země ${name}`}>
        <div className="cc-head">
          <Flag tag={pickTag} width={118} className="big-flag" />
          <div>
            <h2>{name}</h2>
            <p>{info.government}</p>
          </div>
        </div>
        <div className="cc-body">
          <dl className="kv">
            <dt>Vůdce</dt><dd>{info.leader}</dd>
            <dt>Ideologie</dt><dd><span className="ideo"><i style={{ background: ideo.color }} />{ideo.name}</span></dd>
            <dt>Postavení</dt><dd>{TIER_NAMES[info.tier]}</dd>
            <dt>Hlavní město</dt><dd>{capital.k[0] ? capital.k[0][0] : capital.n}</dd>
            <dt>Obyvatelé</dt><dd>{fmtPop(stats.pop)}</dd>
            <dt>Plocha</dt><dd>{fmtArea(stats.area)}</dd>
            <dt>Provincie</dt><dd>{fmtInt(stats.provinces)} ve {fmtInt(stats.states)} státech</dd>
            <dt>Vítězné body</dt><dd><b className="gold">{fmtInt(stats.vp)}</b></dd>
            <dt>Obtížnost</dt><dd><Pips n={info.diff} /> <span className="diff">{DIFF_NAMES[info.diff]}</span></dd>
          </dl>
          <p className="blurb">{info.blurb}</p>
        </div>
        <footer>
          <div className="scn-opts" role="group" aria-label="Scénář">
            <span className="muted">Scénář</span>
            {SCENARIO_IDS.map((id) => <button key={id} className={`sbtn ${scenario === id ? 'primary' : ''}`} aria-pressed={scenario === id} onClick={() => setAiOptions({ scenario: id })} title={SCENARIOS[id].info}>{SCENARIOS[id].n}</button>)}
          </div>
          <p className="muted scn-info">{sc.info}</p>
          <div className="ai-opts" role="group" aria-label="Chování AI zemí">
            <span className="muted">Obtížnost</span>
            {DIFF_IDS.map((n) => (
              <button key={n} className={`sbtn ${aiDiff === n ? 'primary' : ''}`} aria-pressed={aiDiff === n} onClick={() => setAiOptions({ aiDiff: n })} title={DIFFICULTY[n].info}>{DIFFICULTY[n].n}</button>
            ))}
            <label className="ai-hist" title="Zapnuto: AI jde po historických kolejích (anšlus, Polsko 1939, Francie 1940, Barbarossa 22. 6. 1941 …). Vypnuto: volná historie – stejné události s posunem až o 4 měsíce, jen když země drží svůj politický kurz; každá hra je jiná."><input type="checkbox" checked={!!aiHist} onChange={(e) => setAiOptions({ aiHist: e.target.checked })} /> Historické plány</label>
          </div>
          <div className="rule-opts" role="group" aria-label="Pravidla hry">
            {RULE_IDS.map((id) => (
              <div key={id} className="rule-row" title={RULES[id].info}>
                <span className="muted">{RULES[id].n}</span>
                {RULES[id].opts.map(([v, t]) => { const cur = id in rules ? rules[id] : RULES[id].def; return <button key={v} className={`sbtn ${cur === v ? 'primary' : ''}`} aria-pressed={cur === v} onClick={() => setAiOptions({ rules: { ...rules, [id]: v } })}>{t}</button>; })}
              </div>
            ))}
          </div>
          <button className="btn primary big" disabled={dead} title={dead ? 'Tato země ve zvoleném scénáři už neexistuje.' : undefined} onClick={() => startGame(pickTag)}>Začít hru</button>
        </footer>
      </aside>
    </>
  );
}
