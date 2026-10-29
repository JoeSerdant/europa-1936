import { COUNTRIES } from '../../data/countries.js';

function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Vlajka země podle vrstev z data/countries.js (viz popis formátu tam). */
export function Flag({ tag, width = 36, className = '', title }) {
  const d = COUNTRIES[tag];
  const layers = d ? d.flag : [['r', '#555', 0, 0, 30, 20]];
  return (
    <svg className={`flag ${className}`} width={width} height={(width * 2) / 3} viewBox="0 0 30 20" role="img" aria-label={title || tag} preserveAspectRatio="none">
      {layers.map((l, i) => {
        switch (l[0]) {
          case 'r': return <rect key={i} fill={l[1]} x={l[2]} y={l[3]} width={l[4]} height={l[5]} />;
          case 'c': return <circle key={i} fill={l[1]} cx={l[2]} cy={l[3]} r={l[4]} />;
          case 'p': return <polygon key={i} fill={l[1]} points={l[2]} />;
          case 's': return <polygon key={i} fill={l[1]} points={star(l[2], l[3], l[4])} />;
          case 'l': return <line key={i} stroke={l[1]} strokeWidth={l[2]} x1={l[3]} y1={l[4]} x2={l[5]} y2={l[6]} />;
          default: return null;
        }
      })}
    </svg>
  );
}
