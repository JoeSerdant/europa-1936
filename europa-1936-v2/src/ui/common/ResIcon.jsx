// UI: vlastní ikony surovin (jednoduché vektory 24×24 v barvě suroviny) – ocel, hliník, ropa, wolfram, chrom, guma.
export const RES_LOOK = {
  ocel: { c: '#9fb0c0', d: 'M3 15h18l-3 4H6zM5 15l2-5h10l2 5M8 10l1-3h6l1 3' },
  hlinik: { c: '#cfd8e2', d: 'M4 17h16v3H4zM6 13h12v4H6zM8 9h8v4H8z' },
  ropa: { c: '#d9a441', d: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z' },
  wolfram: { c: '#b58ce0', d: 'M12 3l7 5v8l-7 5-7-5V8zM12 3v18M5 8l14 8M19 8 5 16' },
  chrom: { c: '#7fd3c2', d: 'M12 2l3 7h7l-5.6 4.2L18.5 21 12 16.5 5.5 21l2.1-7.8L2 9h7z' },
  guma: { c: '#8fc47a', d: 'M12 21V9M12 9c0-4 3-6 7-6 0 4-3 6-7 6zM12 13c0-3-2.5-5-6-5 0 3 2.5 5 6 5zM9 21h6' },
};

/** Ikona suroviny `r` (velikost `size`, barva podle suroviny). */
export function ResIcon({ r, size = 22 }) {
  const l = RES_LOOK[r] || { c: 'currentColor', d: 'M6 6h12v12H6z' };
  return (
    <svg className="res-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={l.c} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d={l.d} fill={l.c} fillOpacity="0.22" />
    </svg>
  );
}
