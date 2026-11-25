// Okupace (M38): veřejné rozhraní.
export { OCC } from './constants.js';
export { createOcc } from './setup.js';
export { occDay, needOf as garrisonNeed } from './day.js';
export { occupationOf, occResFactor } from './selectors.js';
export { occLawOf, hasCollab, occResShare, occupiedBy, setOccLaw, collabBlock, setCollab } from './laws.js';   // S7
export { OCC_LAWS, OCC_LAW_IDS, OCC_LAW_DEFAULT } from '../../data/occ/laws.js';
