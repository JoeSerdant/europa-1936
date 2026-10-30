// Uvolnění národů (M70): po pádu země (kapitulace v mírové konferenci, nebo ultimátum na zbytek země) může vítěz z jejích států vytvořit rezervní zemi
// (`data/ownersExtra.js`) jako svou loutku. `states` = jména států, které nový stát dostane (`null` = všechny zbylé neokupované státy).
export const RELEASES = {
  FRA: { tag: 'VIC', states: null },
  CZE: { tag: 'SLO', states: ['Západní Slovensko', 'Střední Slovensko', 'Východní Slovensko'] },
  YUG: { tag: 'CRO', states: ['Záhřeb', 'Lika', 'Bosna', 'Hercegovina', 'Dalmácie', 'Srem-Slavonie'] },
};
