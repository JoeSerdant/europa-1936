// Dlouhé simulace celé hry (F2): nejsou součástí `npm test`, pouštějí se ručně `npm run sim -- <název>` (např. `npm run sim -- poland`).
// Zprávy se zapisují do `sim/out/` (není v gitu). Proměnné: SEED (semínko, výchozí 7), PLAYER (tag hráče, který nic nedělá; výchozí pozorovatel), HIST (0 = bez historické AI).
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: { environment: 'node', include: ['sim/**/*.sim.js'], testTimeout: 4 * 3600 * 1000 },
});
