import { useEffect, useMemo } from 'react';
import { useUi, useGame } from '../store.js';
import { Flag } from '../common/Flag.jsx';
import { Icon } from '../common/Icon.jsx';
import { mapController as mc } from '../map/controller.js';
import { COUNTRIES, IDEOLOGIES, TIER_NAMES, DIFF_NAMES } from '../../data/countries.js';

const TIER_HEADS = { 1: 'Velmoci', 2: 'Regionální mocnosti', 3: 'Malé státy' };
import { allCountries, countryStats, getWorld, SCENARIOS, SCENARIO_IDS } from '../../engine/index.js';
import { goMenu, pickCountry, startGame, setAiOptions, INSETS } from '../actions.js';
import { fmtInt, fmtPop, fmtArea } from '../format.js';

function Pips({ n, total = 5 }) {
  return (
    <span className="pips" aria-label={`${n} z ${total}`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

/** Obrazovka výběru země: seznam vlevo, mapa uprostřed (klik na zemi ji vybere), karta země vpravo. */
export function CountrySelect() {
  const pickTag = useUi((s) => s.pickTag);
  const aiLevel = useUi((s) => s.aiLevel);
  const aiHist = useUi((s) => s.aiHist);
  const scenario = useUi((s) => s.scenario);
  const sc = SCENARIOS[scenario] || SCENARIOS[1936];
  const dead = !!pickTag && !!sc.dead && sc.dead.includes(pickTag);
  const owner = useGame((s) => s.stateOwner);
  const groups = useMemo(() => {
    const list = allCountries().filter((c) => COUNTRIES[c.tag]);
    return [1, 2, 3].map((tier) => ({
      tier,
      items: list.filter((c) => COUNTRIES[c.tag].tier === tier).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    })).filter((g) => g.items.length);
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
          {groups.map((g) => (
            <section key={g.tier}>
              <h3>{TIER_HEADS[g.tier]}</h3>
              <ul>
                {g.items.map((c) => (
                  <li key={c.tag}>
                    <button className={c.tag === pickTag ? 'on' : ''} onClick={() => pickCountry(c.tag)} aria-pressed={c.tag === pickTag}>
                      <Flag tag={c.tag} width={34} />
                      <span className="nm">{c.name}</span>
                      <Pips n={COUNTRIES[c.tag].diff} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
            <span className="muted">AI zemí</span>
            {[[1, 'Lehká'], [2, 'Běžná'], [3, 'Těžká']].map(([n, t]) => (
              <button key={n} className={`sbtn ${aiLevel === n ? 'primary' : ''}`} aria-pressed={aiLevel === n} onClick={() => setAiOptions({ aiLevel: n })} title={n === 2 ? 'Běžná obtížnost' : n === 1 ? 'AI zemí je o 10 % slabší v průmyslu a výzkumu' : 'AI zemí je o 10 % silnější v průmyslu a výzkumu'}>{t}</button>
            ))}
            <label className="ai-hist" title="Historické sklony AI k válkám a blokům (např. napětí kolem Československa a Polska)"><input type="checkbox" checked={!!aiHist} onChange={(e) => setAiOptions({ aiHist: e.target.checked })} /> Historické plány</label>
          </div>
          <button className="btn primary big" disabled={dead} title={dead ? 'Tato země ve zvoleném scénáři už neexistuje.' : undefined} onClick={() => startGame(pickTag)}>Začít hru</button>
        </footer>
      </aside>
    </>
  );
}
