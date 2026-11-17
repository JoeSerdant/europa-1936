import { useEffect } from 'react';
import { useGame } from '../store.js';
import { play } from '../sound.js';
import { getWorld, confClaims, confFor } from '../../engine/index.js';
import { Flag } from '../common/Flag.jsx';
import { playerIdx, conferencePuppet, conferenceAnnex, conferenceRelease, conferenceSkip, conferenceTake, conferenceTribute, conferenceClaim, conferenceClaimsDone } from '../actions.js';
import { COUNTRIES } from '../../data/countries.js';
import { RELEASES } from '../../data/dip/releases.js';

/** Dražba (M95): účastníci s body, státy poraženého s cenou pro hráče, dosavadní zisky. */
function Bidding({ game, item }) {
  const w = getWorld(), me = playerIdx(game);
  const rows = confClaims(game, item.id);
  return (
    <>
      <p>Vítězové se střídají a za body si berou státy poraženého. Stát, který okupujete, vás stojí polovinu hodnoty, sousední plnou. Co si nikdo nevezme, zůstane poraženému.</p>
      <section className="conf-parts" aria-label="Účastníci konference">
        {item.order.map((c) => (
          <span key={c} className={`conf-part ${c === me ? 'me' : ''} ${item.pass.includes(c) ? 'passed' : ''}`}>
            <Flag tag={w.owners[c].tag} width={22} /><b>{w.owners[c].name}</b><i>{item.pts[c]} b.</i>{item.pass.includes(c) ? <em className="muted">pas</em> : null}
          </span>
        ))}
      </section>
      <section className="conf-claims" aria-label="Státy na stole">
        <div className="sec-head"><h3>Státy na stole</h3><span className="muted">vaše body: <b>{item.pts[me] || 0}</b></span></div>
        <ul>
          {rows.map((r) => (
            <li key={r.s} className={r.block ? 'off' : ''}>
              <span>{r.name}</span>
              <i className="muted">{r.occ ? `okupuje ${w.owners[r.occ].name}` : 'neokupovaný'}</i>
              <i className="muted">{r.cost != null ? `${r.cost} b.` : '—'}</i>
              <button className="sbtn" disabled={!!r.block} title={r.block || 'Stát připadne vám'} onClick={() => conferenceClaim(item.id, r.s)}>Získat</button>
            </li>
          ))}
        </ul>
      </section>
      {item.log.length ? <p className="muted conf-log">Rozděleno: {item.log.map((x) => `${w.states[x.s].n} → ${w.owners[x.c].name}`).join(', ')}</p> : null}
      <div className="conf-opts">
        <button className="btn primary" onClick={() => conferenceClaimsDone(item.id)}><b>Pas</b><span>Už si nic dalšího neberete; ostatní pokračují bez vás.{item.top !== me ? ` O zbytku země rozhodne ${w.owners[item.top].name}.` : ' Potom rozhodnete o zbytku země.'}</span></button>
      </div>
    </>
  );
}

/** Mírová konference (M95, obdoba HOI4): dražba států za body a rozhodnutí hlavního vítěze o zbytku poraženého. */
export function ConferenceDialog() {
  const item = useGame((s) => confFor(s, playerIdx(s)));
  const cid = item ? item.id : 0;
  useEffect(() => { if (cid) play('alert'); }, [cid]);
  const game = useGame((s) => (s.dip.conf.length && s.player ? s : null));
  if (!item || !game) return null;
  const w = getWorld();
  const loser = w.owners[item.loser];
  const rump = game.stateOwner.reduce((n, o) => n + (o === item.loser ? 1 : 0), 0);
  const info = COUNTRIES[loser.tag];
  return (
    <div className="scrim" role="presentation">
      <div className="panel dialog wide conference" role="dialog" aria-label="Mírová konference" aria-modal="true">
        <header className="conf-head"><Flag tag={loser.tag} width={44} /><div><h2>Mírová konference</h2><p className="muted">{loser.name} kapitulovala{info ? ` (${info.government})` : ''}.</p></div></header>
        {item.ph === 'bid' ? <Bidding game={game} item={item} /> : (
          <>
            <p>Dražba skončila. Zbývá {rump} {rump === 1 ? 'stát' : rump < 5 ? 'státy' : 'států'} země {loser.name}. Co s nimi?</p>
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
          </>
        )}
      </div>
    </div>
  );
}
