// Suroviny (M19): tok za den. Těží se ve státech, spotřebovávají se při výrobě výzbroje, přebytek jde do obchodu.
//  geo: podle čeho se těžba na startu rozdělí mezi státy země ('pop' = průmyslová jádra, 'area' = rozlohou)
export const RESOURCES = {
  ocel:    { n: 'Ocel', ab: 'OCE', geo: 'pop' },
  hlinik:  { n: 'Hliník', ab: 'HLI', geo: 'pop' },
  ropa:    { n: 'Ropa', ab: 'ROP', geo: 'area' },
  wolfram: { n: 'Wolfram', ab: 'WOL', geo: 'area' },
  chrom:   { n: 'Chrom', ab: 'CHR', geo: 'area' },
  guma:    { n: 'Guma', ab: 'GUM', geo: 'area' },
};
export const RES_IDS = Object.keys(RESOURCES);
