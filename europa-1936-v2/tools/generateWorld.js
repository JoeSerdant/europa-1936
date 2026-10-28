// Generátor světa „Evropa 1936“ → src/data/world.json
// Spuštění: npm run world   (nejdřív jednou npm run world:fetch)
// Krok po kroku (každý krok je samostatný modul v tools/world/):
//   1) vlastníci   – rastr zemí z Natural Earth + převody na stav z r. 1936 + jezera + průlivy
//   2) státy       – geodetický růst ze semínek (tools/world/statesData.js)
//   3) provincie   – k-means + geodetický růst uvnitř států
//   4) moře        – námořní provincie
//   5) vektorizace – hranice (oblouky) mezi všemi oblastmi, hladké a sdílené
//   6) vlastnosti  – terén, řeky, města, vítězné body, železnice, přístavy, strategické regiony
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOwners } from './world/owners.js';
import { buildStates } from './world/statesStep.js';
import { buildRivers, buildProvinces } from './world/provincesStep.js';
import { buildSea } from './world/seaStep.js';
import { buildLabels, buildVectors } from './world/vectorStep.js';
import { renderPreview } from './world/preview.js';
import { svgPreview } from './world/svgPreview.js';
import { buildTerrain } from './world/terrainStep.js';
import { buildPlaces } from './world/placesStep.js';
import { buildAdjacency, buildPorts, buildRails } from './world/networkStep.js';
import { buildRegions } from './world/regionsStep.js';
import { mergeTinyProvinces, mergeTinySeas } from './world/tinyStep.js';
import { exportWorld } from './world/exportStep.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = process.env.PREVIEW_DIR || path.join(ROOT, 'tools/preview');
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const W = {};            // společný stav generátoru
log('1) vlastníci');
buildOwners(W, log);
log('2) státy');
buildStates(W, log);
log('3) řeky a provincie');
buildRivers(W, log);
buildProvinces(W, log);
mergeTinyProvinces(W, 24, log);
log('4) moře');
buildSea(W, log);
mergeTinySeas(W, 30, log);
// vlastník každé pevninské provincie (index do W.ownerTags)
{
  const { grid, ownerIdx, ownerTags } = W;
  W.provOwner = new Uint8Array(W.provs.length);
  for (let p = 1; p < W.provs.length; p++) W.provOwner[p] = ownerTags.indexOf(W.states[W.provs[p].state].owner);
}
log('5) štítky a vektorizace');
buildLabels(W, log);
buildVectors(W, log);
log('6) terén, města, vítězné body');
buildTerrain(W, log);
buildPlaces(W, log);
log('7) sousednosti, přístavy, železnice');
buildAdjacency(W, log);
buildPorts(W, log);
buildRails(W, log);
log('8) regiony a obyvatelstvo');
buildRegions(W, log);
log('9) zápis');
if (!process.env.NO_EXPORT) exportWorld(W, path.join(ROOT, 'src/data/world.json'), log);
export { W };

const STOP = process.env.STOP || '';
const KINDS = { 1: 'owners', 2: 'states', 3: 'provinces', 4: 'sea' };
if (STOP && KINDS[STOP]) renderPreview(W, KINDS[STOP], PREVIEW, log);
if (STOP === '5') svgPreview(W, PREVIEW, log);
