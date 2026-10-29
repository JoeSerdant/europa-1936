// Malé vlastní ikony (jednoduché čáry, 24×24). `name` odpovídá klíči v ICONS; vyplněné ikony mají hodnotu s předponou '#'.
const ICONS = {
  political: 'M6 21V4M6 5h12l-3.2 4L18 13H6',
  terrain: 'M2.5 19 9 8l4 6.2 2.6-3.6L21.5 19z',
  states: 'M4 5h6.5v6.5H4zM13.5 4H20v7h-6.5zM4 14.5h7V20H4zM14 14h6v6h-6z',
  regions: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM3.4 12h17.2M12 3.2c3.4 3.2 3.4 14.4 0 17.6M12 3.2c-3.4 3.2-3.4 14.4 0 17.6',
  population: 'M9 10.6a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zM3 20c0-3.9 2.7-6 6-6s6 2.1 6 6M16.2 4.9a2.8 2.8 0 0 1 0 5.4M17.5 14.3c2.2.6 3.5 2.5 3.5 5.7',
  victory: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  provinces: 'M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9zM12 12l7.8-4.5M12 12 4.2 7.5M12 12v9',
  menu: 'M4 7h16M4 12h16M4 17h16',
  help: 'M9.2 9.2a2.9 2.9 0 1 1 4.6 2.3c-1 .7-1.8 1.2-1.8 2.7M12 17.4v.6',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M14.5 5.5 8 12l6.5 6.5',
  play: '#M8 5v14l11-7z',
  pause: '#M7 5h3.6v14H7zM13.4 5H17v14h-3.6z',
  // armáda (M18)
  army: 'M3.5 6.5h17v11h-17zM3.5 6.5l17 11M3.5 17.5l17-11',
  recruit: 'M9 10.6a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zM3 20c0-3.9 2.7-6 6-6s6 2.1 6 6M18 7.5v6M15 10.5h6',
  supply: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM17 19.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
  industry: 'M3 20V11l5 3v-3l5 3V5h3.5v15zM3 20h18M7 17h1M11 17h1M15 17h1',
  research: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8',
  politics: 'M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z',
  dip: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8 12.5l2.7 2.7L16.5 9',
  log: 'M5 4h14v16H5zM8.5 9h7M8.5 12.5h7M8.5 16h4',
  navy: 'M3 15h18l-3 4H6zM12 4v7M9 8h6M6 11h12v4M17 5l3 2-3 2',
  build: 'M3 20h18M6 20V9l6-5 6 5v11M10 20v-6h4v6M9 11h6',
  trade: 'M4 8h14l-3.5-3.5M20 16H6l3.5 3.5M12 11v2',
  chevron: 'M8 10l4 4 4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5',
  edit: 'M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19zM14.5 6.5l3 3',
  flag: 'M6 21V4M6 5h12l-3.2 4L18 13H6',
  swords: 'M5 4l11 11M19 4L8 15M4 19l3-3M20 19l-3-3',
  target: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  stop: 'M7 7h10v10H7z',
  focus: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  general: 'M12 3l2.4 5 5.4.7-4 3.8 1 5.4L12 15.2 7.2 17.9l1-5.4-4-3.8 5.4-.7z',
  shield: 'M12 3l7 3v5.2c0 4.6-3 8.1-7 9.8-4-1.7-7-5.2-7-9.8V6z',
  attack: 'M4 12h13M12 6.5 18 12l-6 5.5M4 6v12',
};

export function Icon({ name, size = 20, className = '' }) {
  const d = ICONS[name] || '';
  const filled = d.startsWith('#');
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={filled ? d.slice(1) : d} />
    </svg>
  );
}
