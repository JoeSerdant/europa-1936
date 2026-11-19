import { useEffect, useState } from 'react';
import { useUi, useGame } from '../store.js';
import { RULES, RULE_IDS, ruleOf } from '../../engine/index.js';
import { soundOn, setSound, soundVolume, setVolume, play } from '../sound.js';
import { tutorialOn, setTutorial } from '../tutorial/prefs.js';
import { setUi } from '../store.js';
import { edgeScrollOn, setEdgeScroll } from '../edge.js';
import { mapEffectsOn, setMapEffects } from '../map/prefs.js';
import { mapController } from '../map/controller.js';
import { goMenu, setHelp, setMenuOpen, openSaveDialog, setAchOpen, newsEnabled, setNewsEnabled, setNotifyOpen } from '../actions.js';
import { AUTOSAVE_OPTS, autoSaveEvery, setAutoSaveEvery } from '../saves.js';

/** Nabídka ve hře (Esc): pokračovat, ovládání, zpět do hlavního menu. */
export function GameMenu() {
  const open = useUi((s) => s.menuOpen);
  const rules = useGame((s) => (s ? s.rules : null));
  const [confirm, setConfirm] = useState(false);
  const [snd, setSnd] = useState(soundOn());
  const [tut, setTut] = useState(tutorialOn());
  const [edge, setEdge] = useState(edgeScrollOn());
  const [fx, setFx] = useState(mapEffectsOn());
  const [news, setNews] = useState(newsEnabled());
  const [vol, setVol] = useState(Math.round(soundVolume() * 100));
  const [auto, setAuto] = useState(autoSaveEvery());   // F3: interval automatického ukládání
  useEffect(() => { if (open) setNews(newsEnabled()); }, [open]);
  useEffect(() => { if (!open) setConfirm(false); }, [open]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={() => setMenuOpen(false)}>
      <div className="panel dialog" role="dialog" aria-label="Nabídka" onClick={(e) => e.stopPropagation()}>
        <h2>Nabídka</h2>
        <div className="stack">
          <button className="btn primary" onClick={() => setMenuOpen(false)} autoFocus>Pokračovat ve hře</button>
          <button className="btn" onClick={() => { setMenuOpen(false); openSaveDialog('save'); }}>Uložit hru</button>
          <button className="btn" onClick={() => { setMenuOpen(false); openSaveDialog('load'); }}>Načíst hru</button>
          <button className="btn" title="Tři automatická uložení na střídačku – přepisuje se nejstarší. Kliknutím změníte interval."
            onClick={() => { const i = AUTOSAVE_OPTS.findIndex(([id]) => id === auto); const next = AUTOSAVE_OPTS[(i + 1) % AUTOSAVE_OPTS.length][0]; setAutoSaveEvery(next); setAuto(next); }}>
            Automatické ukládání: {AUTOSAVE_OPTS.find(([id]) => id === auto)[1]}</button>
          <button className="btn" onClick={() => { setMenuOpen(false); setHelp(true); }}>Ovládání</button>
          <button className="btn" onClick={() => setAchOpen(true)}>Úspěchy</button>
          <button className="btn" aria-pressed={tut} onClick={() => { setTutorial(!tut); setTut(!tut); }}>Průvodce: {tut ? 'zapnutý' : 'vypnutý'}</button>
          <button className="btn" aria-pressed={edge} onClick={() => { setEdgeScroll(!edge); setEdge(!edge); setUi({ edgeScroll: !edge }); }}>Posun okrajem: {edge ? 'zapnutý' : 'vypnutý'}</button>
          <button className="btn" aria-pressed={snd} onClick={() => { setSound(!snd); setSnd(!snd); }}>Zvuk: {snd ? 'zapnutý' : 'vypnutý'}</button>
          <label className="menu-slider" title="Hlasitost zvukových efektů (hra nemá hudbu)">
            <span>Hlasitost efektů</span>
            <input type="range" min="0" max="100" step="5" value={vol} disabled={!snd} aria-label="Hlasitost efektů"
              onChange={(e) => { const v = +e.target.value; setVol(v); setVolume(v / 100); }} onPointerUp={() => play('notify')} onKeyUp={() => play('click')} />
            <b>{vol} %</b>
          </label>
          <button className="btn" title="U každé skupiny zpráv: jen deník, oznámit, nebo oznámit a pozastavit hru" onClick={() => setNotifyOpen(true)}>Nastavení upozornění…</button>
          <button className="btn" aria-pressed={news} title="Noviny ze světa (válka, kapitulace, změny vlád) – hra se při nich zastaví" onClick={() => { setNewsEnabled(!news); setNews(!news); }}>Noviny ze světa: {news ? 'zapnuté' : 'vypnuté'}</button>
          <button className="btn" aria-pressed={fx} title="Reliéf terénu, hloubka moře, den a noc a ztmavení mimo dohled" onClick={() => { setMapEffects(!fx); setFx(!fx); mapController.setEffects(!fx); }}>Efekty mapy: {fx ? 'zapnuté' : 'vypnuté'}</button>
          <p className="muted menu-rules" aria-label="Pravidla hry">Pravidla: {RULE_IDS.map((id) => `${RULES[id].n.toLowerCase()} ${(RULES[id].opts.find(([v]) => v === ruleOf({ rules }, id)) || [0, '?'])[1]}`).join(' · ')}</p>
          {confirm ? (
            <div className="confirm">
              <p>Neuložená hra se ztratí. Opravdu odejít do hlavního menu?</p>
              <button className="btn danger" onClick={goMenu}>Odejít do menu</button>
              <button className="btn" onClick={() => setConfirm(false)}>Zůstat ve hře</button>
            </div>
          ) : (
            <button className="btn" onClick={() => setConfirm(true)}>Hlavní menu</button>
          )}
        </div>
      </div>
    </div>
  );
}
