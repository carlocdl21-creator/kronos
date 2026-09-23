/* ==========================================================================
   Confronto fra cronoprogramma contrattuale e avanzamento reale:
   scostamenti in giorni, avanzamento atteso, avanzamento economico pesato.
   ========================================================================== */

import { BASE, TRACCIATE, COSTO_TRACCIATO, FINE_CONTRATTO, INIZIO_CONTRATTO } from "./baseline.js";
import { diffDays } from "./util.js";

/**
 * Stato di una singola attività rispetto alla baseline.
 * @param {object} r  riga della baseline
 * @param {object} f  dati reali dichiarati (può essere vuoto)
 * @param {string} oggi data odierna ISO
 */
export function calc(r, f = {}, oggi){
  const inizio = f.inizio || null;
  const fine   = f.fine || null;
  const av     = typeof f.avanz === "number" ? f.avanz : 0;

  const effI = inizio || r.i;
  const effF = fine || r.f;
  const dI = inizio ? diffDays(inizio, r.i) : 0;   // scostamento sull'avvio
  const dF = fine   ? diffDays(fine, r.f)   : 0;   // scostamento sul termine

  // avanzamento che la baseline prevede alla data odierna
  const tot  = diffDays(r.f, r.i) + 1;
  const pass = diffDays(oggi, r.i) + 1;
  const atteso = Math.max(0, Math.min(100, Math.round(pass / tot * 100)));

  // attività che doveva partire e non risulta avviata
  const ritAvvio = (!inizio && av === 0 && diffDays(oggi, r.i) > 0) ? diffDays(oggi, r.i) : 0;
  const scostAv = av - atteso;

  const stato = av >= 100 ? "completata"
              : av > 0 ? "corso"
              : (diffDays(oggi, r.i) >= 0 ? "attesa" : "futura");

  // Lo scostamento è la differenza visibile fra le due barre: se la barra
  // reale non coincide con quella di contratto, serve una giustificazione.
  const richiede = dI !== 0 || dF !== 0;
  const just = (f.giust || "").trim();
  // un solo criterio, lo stesso che colora la barra
  const sev = !richiede ? "ok" : (just ? "warn" : "crit");

  return {b:r, f, inizio, fine, av, effI, effF, dI, dF, atteso, scostAv, stato, ritAvvio, richiede, just, sev};
}

/** Le attività elementari tracciate che stanno sotto una riga di gruppo. */
export function foglieDi(r){
  const da = BASE.indexOf(r);
  if(da < 0) return [];
  const out = [];
  for(let k = da + 1; k < BASE.length; k++){
    if(BASE[k].liv <= r.liv) break;
    if(BASE[k].foglia && !BASE[k].continua) out.push(BASE[k]);
  }
  return out;
}

/** Tutte le attività tracciate, già confrontate. */
export function calcTutte(fasi, oggi){
  const out = {};
  for(const r of TRACCIATE) out[r.id] = calc(r, fasi[r.id] || {}, oggi);
  return out;
}

/** Quadro d'insieme della commessa. */
export function riepilogo(fasi, oggi){
  let pesoFatto = 0, pesoAtteso = 0, fineStimata = FINE_CONTRATTO, ultimoAgg = null;
  const ritardi = [], senzaGiust = [];

  for(const r of TRACCIATE){
    const c = calc(r, fasi[r.id] || {}, oggi);
    pesoFatto  += r.costo * c.av / 100;
    pesoAtteso += r.costo * c.atteso / 100;
    if(c.sev !== "ok") ritardi.push(c);
    if(c.richiede && !c.just) senzaGiust.push(c);
    if(c.effF > fineStimata) fineStimata = c.effF;
    const u = c.f.aggiornatoIl;
    if(u && (!ultimoAgg || u > ultimoAgg)) ultimoAgg = u;
  }
  return {
    avanz: COSTO_TRACCIATO ? pesoFatto / COSTO_TRACCIATO * 100 : 0,
    atteso: COSTO_TRACCIATO ? pesoAtteso / COSTO_TRACCIATO * 100 : 0,
    valore: pesoFatto,
    ritardi, senzaGiust,
    fineStimata,
    slittamento: diffDays(fineStimata, FINE_CONTRATTO),
    ultimoAgg
  };
}

/** Intervallo temporale da rappresentare nel diagramma. */
export function intervallo(fasi, oggi){
  let min = INIZIO_CONTRATTO, max = FINE_CONTRATTO;
  for(const r of BASE){ if(r.i < min) min = r.i; if(r.f > max) max = r.f; }
  for(const r of TRACCIATE){
    const c = calc(r, fasi[r.id] || {}, oggi);
    if(c.effI < min) min = c.effI;
    if(c.effF > max) max = c.effF;
  }
  if(oggi < min) min = oggi;
  if(oggi > max) max = oggi;
  return {min, max};
}
