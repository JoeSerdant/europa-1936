import { useEffect } from 'react';
import { useGame } from '../store.js';
import { play } from '../sound.js';
import { getWorld, confClaims } from '../../engine/index.js';
import { Flag } from '../common/Flag.jsx';
import { playerIdx, conferencePuppet, conferenceAnnex, conferenceRelease, conferenceSkip, conferenceTake, conferenceTribute, conferenceClaim, conferenceClaimsDone } from '../actions.js';
import { COUNTRIES } from '../../data/countries.js';
import { RELEASES } from '../../data/dip/releases.js';

/** Mírová konference: po kapitulaci hráčova protivníka rozhodne hráč o jeho zbylých státech. */
export function ConferenceDialog() {
  const item = useGame((s) => s.dip.conf.find((c) => c.victor === playerIdx(s)) || null);
  const cid = item ? item.id : 0;
  useEffect(() => { if (cid) play('alert'); }, [cid]);
  const states = useGame((s) => (s.dip.conf.length && s.player ? s.stateOwner : null));
  const game = useGame((s) => (s.dip.conf.length && s.player ? s : null));
  if (!item) return null;
  const w = getWorld();
  const loser = w.owners[item.loser];
  const rump = states ? states.reduce((n, o) => n + (o === item.loser ? 1 : 0), 0) : 0;
  const info = COUNTRIES[loser.tag];
  const claims = game ? confClaims(game, item.id) : [];
  return (
    <div className="scrim" role="presentation">
      <div className="panel dialog wide conference" role="dialog" aria-label="Mírová konference" aria-modal="true">
        <header className="conf-head"><Flag tag={loser.tag} width={44} /><div><h2>Mírová konference</h2><p className="muted">{loser.name} kapitulovala{info ? ` (${info.government})` : ''}.</p></div></header>
        <p>Okupovaná území připadla vítězům. Zbývá {rump} {rump === 1 ? 'stát' : rump < 5 ? 'státy' : 'států'} země {loser.name}. Co s nimi?</p>
        {item.pts > 0 && claims.length > 0 ? (
          <section className="conf-claims" aria-label="Územní zisky za body">
            <div className="sec-head"><h3>Územní zisky</h3><span className="muted">vaše body: <b>{item.pts}</b> (za území, které jste dobyli)</span></div>
            <ul>
              {claims.map((r) => (
                <li key={r.s}><span>{r.name}</span><i className="muted">{r.value} b.</i>
                  <button className="sbtn" disabled={!!r.block} title={r.block || 'Stát připadne vám'} onClick={() => conferenceClaim(item.id, r.s)}>Získat</button></li>
              ))}
            </ul>
          </section>
        ) : null}
        {item.ph === 'claims' ? (
          <div className="conf-opts">
            <button className="btn primary" onClick={() => conferenceClaimsDone(item.id)}><b>Hotovo</b><span>O zbytku země rozhodne hlavní vítěz ({w.owners[item.top].name}).</span></button>
          </div>
        ) : (
        <div className="conf-opts">
          {(item.g || 'conquest') === 'conquest' && <>
            <button className="btn primary" onClick={() => conferencePuppet(item.id)}><b>Loutkový stát</b><span>Země zůstane, bude plnit vaše války a denně vám dá část lidské síly a politické moci. Později ji můžete anektovat.</span></button>
            {item.rel ? <button className="btn" onClick={() => conferenceRelease(item.id)}><b>Uvolnit národ: {w.owners[w.ownerIdx[RELEASES[loser.tag].tag]].name}</b><span>Z části států vznikne nová loutka a zbytek anektujete.</span></button> : null}
            <button className="btn" onClick={() => conferenceAnnex(item.id)}><b>Anektovat</b><span>Zbylé státy připadnou vám a země zanikne.</span></button>
          </>}
          {item.g === 'border' && <button className="btn primary" onClick={() => conferenceTake(item.id)}><b>Převzít státy</b><span>Převezmete až 3 nejcennější zbylé státy, země zůstane samostatná.</span></button>}
          {item.g === 'tribute' && <button className="btn primary" onClick={() => conferenceTribute(item.id)}><b>Válečné odškodné</b><span>Země zaplatí politickou moc a ztratí podporu války, jinak zůstane samostatná.</span></button>}
          <button className="btn" onClick={() => conferenceSkip(item.id)}><b>Nechat být</b><span>Země zůstane kapitulovaná a bez moci.</span></button>
        </div>
        )}
      </div>
    </div>
  );
}
