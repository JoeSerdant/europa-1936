// Pomůcka: převede lon/lat obdélník na CROP=x,y,w,h v pixelech rastru. Použití: node tools/cropOf.js 5 47 20 55
import { makeGrid } from './world/grid.js';
const [lon0, lat0, lon1, lat1] = process.argv.slice(2).map(Number);
const g = makeGrid();
const pts = [g.toPx(lon0, lat0), g.toPx(lon1, lat0), g.toPx(lon0, lat1), g.toPx(lon1, lat1)];
const x0 = Math.floor(Math.min(...pts.map((p) => p[0]))), x1 = Math.ceil(Math.max(...pts.map((p) => p[0])));
const y0 = Math.floor(Math.min(...pts.map((p) => p[1]))), y1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
console.log(`${Math.max(0, x0)},${Math.max(0, y0)},${x1 - x0},${y1 - y0}`);
