// Jako `vitest.config.js`, ale s profilem CPU (Node `--cpu-prof`) do `sim/out/prof/` – rozbor, které funkce zabírají čas (F2 A2).
// Spuštění: `npx vitest run --config sim/vitest.prof.config.js perf`.
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.js';

export default mergeConfig(base, defineConfig({ test: { execArgv: ['--cpu-prof', '--cpu-prof-dir=sim/out/prof'], maxWorkers: 1 } }));
