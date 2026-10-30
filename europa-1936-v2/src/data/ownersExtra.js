// Rezervní země (M69): vznikají za hry (občanská válka, vichistická vláda, uvolnění národů) a na začátku nemají žádné státy.
// Do světa se přidají za řadu zemí z `world.json` (indexy 36 a výš); hlavní město se najde podle jména provincie.
export const OWNERS_EXTRA = [
  { tag: 'NSP', name: 'Nacionalistické Španělsko', color: '#8c3b2a', capName: 'Burgos' },
  { tag: 'VIC', name: 'Vichistická Francie', color: '#6f86ad', capName: 'Clermont-Ferrand' },
  { tag: 'SLO', name: 'Slovensko', color: '#4d7a8c', capName: 'Bratislava' },
  { tag: 'CRO', name: 'Chorvatsko', color: '#a05a5a', capName: 'Záhřeb' },
];
