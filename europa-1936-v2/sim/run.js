// Společný běh simulací (F2): hra s AI ve všech zemích, volitelně pasivní hráč (vybere první volbu událostí, na konferencích pasuje, potvrdí konec hry).
import fs from 'node:fs';
import path from 'node:path';
import { createGame, getWorld, advance, chooseEvent, confFor, confSkip, ackEnd, formatDate } from '../src/engine/index.js';

export const env = () => ({
  seed: +(process.env.SEED || 7),
  player: process.env.PLAYER || null,
  hist: process.env.HIST !== '0',
});

/** Spustí hru a volá `onDay(state, den)` po každém dni; `onDay` vrací true = konec. Vrací poslední stav. */
export function simulate({ seed, player, hist }, days, onDay) {
  const w = getWorld();
  let s = createGame({ player, aiLevel: 2, seed, hist });
  const me = player ? w.ownerIdx[player] : 0;
  for (let d = 1; d <= days; d++) {
    s = advance(s, 24);
    if (me) {
      for (const p of s.nat.pend.filter((x) => x.o === me)) s = chooseEvent(s, me, p.id, 0);
      for (let k = 0; k < 5; k++) { const c = confFor(s, me); if (!c) break; s = confSkip(s, c.id); }
    }
    if (s.end && !s.end.ack) s = ackEnd(s);
    if (onDay && onDay(s, d)) break;
  }
  return s;
}

export const tagOf = (o) => (o ? getWorld().owners[o].tag : '-');
export const dateOf = (s) => formatDate(s.tick);

/** Zapíše zprávu simulace do `sim/out/<název>-<semínko>[-<hráč>][-nohist].txt` (vitest výpisy z testů schovává) a vrátí cestu. */
export function writeReport(name, cfg, lines) {
  const dir = path.join(process.cwd(), 'sim', 'out');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${cfg.seed}${cfg.player ? `-${cfg.player}` : ''}${cfg.hist ? '' : '-nohist'}.txt`);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}
