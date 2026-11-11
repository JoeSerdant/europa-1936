// Bojové taktiky (M77): každý den bitvy si obě strany zvolí taktiku. Vlastní názvy, texty a čísla.
//  side   'att' útočník | 'dep' obránce      w  váha výběru (základní taktika je nejčastější)
//  atk    bonus vlastního útoku              def  bonus vlastní obrany          foe  postih útoku protivníka
//  beats  taktiky protivníka, které tato taktika ruší (jejich kladné účinky se neuplatní)
//  need   'arm' = váha se zdvojnásobí, má-li strana na frontě tankovou nebo motorizovanou divizi
export const TACTICS = {
  celni: { side: 'att', n: 'Čelní útok', info: 'Přímý nápor na celé šířce fronty, bez překvapení.', w: 4, atk: 0, def: 0, foe: 0, beats: [] },
  prulom: { side: 'att', n: 'Průlom', info: 'Soustředěný úder úzkým klínem: silnější útok, ale odkrytá křídla.', w: 2, atk: 0.15, def: -0.05, foe: 0, beats: ['protiutok'], need: 'arm' },
  obchvat: { side: 'att', n: 'Obchvat', info: 'Útok do boku: obránci střílejí hůř a hrozí jim obklíčení.', w: 2, atk: 0.08, def: 0, foe: 0.08, beats: ['zdrzovani'] },
  prepad: { side: 'att', n: 'Noční přepad', info: 'Útok za tmy zastihne obranu nepřipravenou.', w: 1.5, atk: 0.1, def: 0.05, foe: 0, beats: ['lecka'] },
  palba: { side: 'att', n: 'Soustředěná palba', info: 'Dlouhá dělostřelecká příprava před každým postupem.', w: 1.5, atk: 0.12, def: 0, foe: 0, beats: ['pruzna'] },
  linie: { side: 'dep', n: 'Držení linie', info: 'Obrana na připravených postaveních, krok za krokem.', w: 4, atk: 0, def: 0, foe: 0, beats: [] },
  pruzna: { side: 'dep', n: 'Pružná obrana', info: 'Ústup z první linie a úder na vyčerpaného útočníka.', w: 2, atk: 0, def: 0.12, foe: 0, beats: ['prulom'] },
  protiutok: { side: 'dep', n: 'Protiútok', info: 'Místní protiútoky berou útočníkovi dech, ale stojí síly.', w: 2, atk: 0.12, def: -0.05, foe: 0, beats: ['obchvat'] },
  lecka: { side: 'dep', n: 'Léčka', info: 'Skrytá postavení pustí útočníka blíž a spustí palbu z boku.', w: 1.5, atk: 0.1, def: 0, foe: 0, beats: ['palba'] },
  zdrzovani: { side: 'dep', n: 'Zdržovací boj', info: 'Obrana obětuje prostor za čas: těžko ji zasáhnout, ale sama skoro neútočí.', w: 1.5, atk: -0.1, def: 0.15, foe: 0, beats: ['prepad'] },
};
export const TACTIC_IDS = Object.keys(TACTICS);
export const ATT_TACTICS = TACTIC_IDS.filter((id) => TACTICS[id].side === 'att');
export const DEP_TACTICS = TACTIC_IDS.filter((id) => TACTICS[id].side === 'dep');
