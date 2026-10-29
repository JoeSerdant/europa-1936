// Stáhne veřejná geodata Natural Earth (public domain) do tools/cache. Spuštění: npm run world:fetch
// Zdroj: https://github.com/nvkelso/natural-earth-vector (GeoJSON, měřítko 1:10 m). Soubory se necommitují (tools/cache je v .gitignore);
// generátor světa (npm run world) je čte odtud. Existující soubory se nestahují znovu (smaž je, když chceš čerstvé).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools/cache');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

export const GEODATA = [
  'ne_10m_admin_0_countries',            // hranice dnešních států
  'ne_10m_populated_places_simple',      // města (jména, počet obyvatel)
  'ne_10m_lakes',                        // jezera
  'ne_10m_rivers_lake_centerlines',      // řeky
  'ne_10m_geography_regions_polys',      // pohoří, pouště a jiné krajinné oblasti
];

fs.mkdirSync(CACHE, { recursive: true });
for (const name of GEODATA) {
  const file = path.join(CACHE, `${name}.geojson`);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) {
    console.log(`${name}: už je (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
    continue;
  }
  const res = await fetch(`${BASE}/${name}.geojson`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  console.log(`${name}: staženo ${(buf.length / 1e6).toFixed(1)} MB`);
}
