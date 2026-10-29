// Skupiny výzbroje na obrazovce Výroba (jen rozhraní: řazení dlaždic a barva štítku). Klíče odpovídají EQUIP a SHIPS.
export const EQUIP_GROUPS = [
  { id: 'pech', n: 'Pěchota', color: '#86b86d', items: ['pusky', 'podpora'] },
  { id: 'del', n: 'Dělostřelectvo', color: '#d6b55c', items: ['dela', 'pdela'] },
  { id: 'mot', n: 'Motorizace', color: '#5d9bd1', items: ['auta'] },
  { id: 'obr', n: 'Obrnění', color: '#d9533a', items: ['vozy', 'ltanky', 'mtanky', 'htanky'] },
  { id: 'let', n: 'Letectvo', color: '#b86dd1', items: ['sti', 'bit', 'tac', 'str'], air: true },
  { id: 'nam', n: 'Námořnictvo', color: '#7fb5c9', items: ['dd', 'ca', 'bb', 'ss', 'tr'], naval: true },
];
