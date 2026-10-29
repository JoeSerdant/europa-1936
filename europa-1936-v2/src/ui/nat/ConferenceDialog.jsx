import { useEffect } from 'react';
import { useGame } from '../store.js';
import { play } from '../sound.js';
import { getWorld } from '../../engine/index.js';
import { Flag } from '../common/Flag.jsx';
import { playerIdx, conferencePuppet, conferenceAnnex, conferenceSkip } from '../actions.js';
import { COUNTRIES } from '../../data/countries.js';

/** Mírová konference: po kapitulaci hráčova protivníka rozhodne hráč o jeho zbylých státech. */
export function ConferenceDialog() {
  const item = useGame((s) => s.dip.conf.find((c) => c.victor === playerIdx(s)) || null);
  const cid = item ? item.id : 0;
  useEffect(() => { if (cid) play('alert'); }, [cid]);
  const states = useGame((s) => (s.dip.conf.length && s.player ? s.stateOwner : null));
  if (!item) return null;
  const w = getWorld();
  const loser = w.owners[item.loser];
  const rump = states ? states.reduce((n, o) => n + (o === item.loser ? 1 : 0), 0) : 0;
  const info = COUNTRIES[loser.tag];
  return (
    <div className="scrim" role="presentation">
      <div className="panel dialog wide conference" role="dialog" aria-label="Mírová konference" aria-modal="true">
        <header className="conf-head"><Flag tag={loser.tag} width={44} /><div><h2>Mírová konference</h2><p className="muted">{loser.name} kapitulovala{info ? ` (${info.government})` : ''}.</p></div></header>
        <p>Okupovaná území připadla vítězům. Zbývá {rump} {rump === 1 ? 'stát' : rump < 5 ? 'státy' : 'států'} země {loser.name}. Co s nimi?</p>
        <div className="conf-opts">
          <button className="btn primary" onClick={() => conferencePuppet(item.id)}><b>Loutkový stát</b><span>Země zůstane, bude plnit vaše války a denně vám dá část lidské síly a politické moci. Později ji můžete anektovat.</span></button>
          <button className="btn" onClick={() => conferenceAnnex(item.id)}><b>Anektovat</b><span>Zbylé státy připadnou vám a země zanikne.</span></button>
          <button className="btn" onClick={() => conferenceSkip(item.id)}><b>Nechat být</b><span>Země zůstane kapitulovaná a bez moci.</span></button>
        </div>
      </div>
    </div>
  );
}
