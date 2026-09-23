/* ==========================================================================
   Baseline contrattuale — elaborato 3613_E_GE_1016 "Cronoprogramma lavori"
   rev. 00 del 13/07/2026, Studio Rinnova SRL STP.
   Le 31 righe riproducono fedelmente la WBS del cronoprogramma estimativo.

   liv: 0 = opera, 1 = categoria, 2 = gruppo, 3 = attività
   foglia: attività elementare tracciata in cantiere
   continua: voce a sviluppo continuo (non soggetta a % di avanzamento)
   ========================================================================== */

export const FINE_CONTRATTO = "2026-11-29";
export const INIZIO_CONTRATTO = "2026-08-01";
export const IMPORTO_LAVORI = 771395.62;

export const BASE = [
  {n:1,  id:"lotto2",     liv:0, nome:"LOTTO 2 · Asilo",                     durata:121, i:"2026-08-01", f:"2026-11-29", costo:771395.62},
  {n:2,  id:"cat_sic",    liv:1, nome:"Costi Sicurezza",                     durata:121, i:"2026-08-01", f:"2026-11-29", costo:25530.04},
  {n:3,  id:"sic",        liv:2, nome:"Costi Sicurezza",                     durata:121, i:"2026-08-01", f:"2026-11-29", costo:25530.04, foglia:true, continua:true},
  {n:4,  id:"og1",        liv:1, nome:"OG1 · Edifici civili e industriali",  durata:121, i:"2026-08-01", f:"2026-11-29", costo:399928.50},
  {n:5,  id:"og1_strut",  liv:2, nome:"Strutture",                           durata:52,  i:"2026-08-01", f:"2026-09-21", costo:75245.06},
  {n:6,  id:"fondazioni", liv:3, nome:"Fondazioni",                          durata:26,  i:"2026-08-01", f:"2026-08-26", costo:65007.51, foglia:true},
  {n:7,  id:"impermeab",  liv:3, nome:"Impermeabilizzazioni",                durata:5,   i:"2026-08-27", f:"2026-08-31", costo:7593.61,  foglia:true},
  {n:8,  id:"cop_strut",  liv:3, nome:"Copertura (strutture)",               durata:5,   i:"2026-09-17", f:"2026-09-21", costo:2643.94,  foglia:true},
  {n:9,  id:"og1_arch",   liv:2, nome:"Architettonico",                      durata:55,  i:"2026-09-20", f:"2026-11-13", costo:254204.09},
  {n:10, id:"cappotto",   liv:3, nome:"Cappotto",                            durata:26,  i:"2026-10-02", f:"2026-10-27", costo:38126.37, foglia:true},
  {n:11, id:"massetti",   liv:3, nome:"Massetti e sottofondi",               durata:5,   i:"2026-10-05", f:"2026-10-09", costo:13066.79, foglia:true},
  {n:12, id:"cartongesso",liv:3, nome:"Opere in cartongesso",                durata:30,  i:"2026-09-30", f:"2026-10-29", costo:53761.86, foglia:true},
  {n:13, id:"pavimenti",  liv:3, nome:"Pavimenti e rivestimenti",            durata:15,  i:"2026-10-10", f:"2026-10-24", costo:22070.59, foglia:true},
  {n:14, id:"serr_int",   liv:3, nome:"Serramenti interni",                  durata:5,   i:"2026-10-30", f:"2026-11-03", costo:19508.60, foglia:true},
  {n:15, id:"serr_est",   liv:3, nome:"Serramenti esterni",                  durata:10,  i:"2026-09-30", f:"2026-11-02", costo:50356.09, foglia:true},
  {n:16, id:"tinteggi",   liv:3, nome:"Tinteggi",                            durata:10,  i:"2026-11-04", f:"2026-11-13", costo:6847.00,  foglia:true},
  {n:17, id:"cop_arch",   liv:3, nome:"Copertura",                           durata:10,  i:"2026-09-20", f:"2026-09-29", costo:46474.03, foglia:true},
  {n:18, id:"linea_vita", liv:3, nome:"Linea vita",                          durata:2,   i:"2026-09-30", f:"2026-10-01", costo:3992.76,  foglia:true},
  {n:19, id:"og1_sist",   liv:2, nome:"Sistemazioni esterne",                durata:33,  i:"2026-10-28", f:"2026-11-29", costo:70479.35},
  {n:20, id:"sist_est",   liv:3, nome:"Sistemazioni esterne",                durata:33,  i:"2026-10-28", f:"2026-11-29", costo:48265.42, foglia:true},
  {n:21, id:"se_mecc",    liv:3, nome:"Impianto Meccanico (esterni)",        durata:20,  i:"2026-11-09", f:"2026-11-28", costo:14649.74, foglia:true},
  {n:22, id:"se_elett",   liv:3, nome:"Impianto Elettrico (esterni)",        durata:20,  i:"2026-11-09", f:"2026-11-28", costo:7564.19,  foglia:true},
  {n:23, id:"og11",       liv:1, nome:"OG11 · Impianti tecnologici",         durata:45,  i:"2026-10-02", f:"2026-11-15", costo:196476.95},
  {n:24, id:"og11_imp",   liv:2, nome:"Impianti",                            durata:45,  i:"2026-10-02", f:"2026-11-15", costo:196476.95},
  {n:25, id:"imp_mecc",   liv:3, nome:"Impianto Meccanico",                  durata:30,  i:"2026-10-17", f:"2026-11-15", costo:105285.30, foglia:true},
  {n:26, id:"imp_anti",   liv:3, nome:"Impianto Antincendio",                durata:15,  i:"2026-10-02", f:"2026-10-16", costo:9924.39,  foglia:true},
  {n:27, id:"imp_elett",  liv:3, nome:"Impianto Elettrico",                  durata:30,  i:"2026-10-17", f:"2026-11-15", costo:45426.01, foglia:true},
  {n:28, id:"imp_fv",     liv:3, nome:"Impianto Fotovoltaico",               durata:10,  i:"2026-10-02", f:"2026-10-11", costo:35841.25, foglia:true},
  {n:29, id:"os32",       liv:1, nome:"OS32 · Strutture in legno",           durata:16,  i:"2026-09-01", f:"2026-09-16", costo:149460.13},
  {n:30, id:"os32_strut", liv:2, nome:"Strutture",                           durata:16,  i:"2026-09-01", f:"2026-09-16", costo:149460.13},
  {n:31, id:"xlam",       liv:3, nome:"Xlam",                                durata:16,  i:"2026-09-01", f:"2026-09-16", costo:149460.13, foglia:true}
];

export const BY_ID = Object.fromEntries(BASE.map(r => [r.id, r]));
export const FOGLIE = BASE.filter(r => r.foglia);
/** attività soggette a dichiarazione di avanzamento */
export const TRACCIATE = FOGLIE.filter(r => !r.continua);
export const COSTO_TRACCIATO = TRACCIATE.reduce((a, r) => a + r.costo, 0);

export const STATI = {
  nuova:       {lab:"Nuova",           pill:"info"},
  presa:       {lab:"Presa in carico", pill:"warn"},
  lavorazione: {lab:"In lavorazione",  pill:"warn"},
  terminata:   {lab:"Terminata",       pill:"ok"}
};
