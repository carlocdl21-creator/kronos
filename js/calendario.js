/* ══════════════════════════════════════════════════════════════════
   Selettore di data.

   Il calendario del browser non si può vestire: ogni sistema disegna il
   suo, minuscolo e fuori stile. Qui se ne disegna uno nostro, con i
   caratteri e i colori del resto dell'applicativo, bersagli grandi
   abbastanza per un dito guantato in cantiere, e due scorciatoie —
   oggi e ieri — che coprono quasi tutte le registrazioni del giornale.

   Il campo <input type="date"> resta nella pagina come deposito del
   valore: tutto il codice che legge $("mnData").value continua a
   funzionare senza saperne nulla.
   ══════════════════════════════════════════════════════════════════ */

import { el, clear, iso, d, addDays, todayISO } from "./util.js";

const GIORNI = ["lun","mar","mer","gio","ven","sab","dom"];
const INIZIALI = ["L","M","M","G","V","S","D"];
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];
const MESI_BREVI = ["gen","feb","mar","apr","mag","giu",
                    "lug","ago","set","ott","nov","dic"];

/** Lunedì = 0, domenica = 6: la settimana come la legge un cantiere. */
const indiceGiorno = giorno => (d(giorno).getUTCDay() + 6) % 7;

/** "gio 12 nov 2026" — per esteso ma corto, si legge a colpo d'occhio. */
function etichetta(giorno){
  if(!giorno) return "Scegli la giornata";
  const dt = d(giorno);
  return `${GIORNI[indiceGiorno(giorno)]} ${dt.getUTCDate()} ` +
         `${MESI_BREVI[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/**
 * Veste un <input type="date"> con il calendario dell'applicativo.
 * @param {HTMLInputElement} input il campo che custodisce il valore
 * @param {object} opzioni {rapidi: mostra "oggi" e "ieri"}
 */
export function collegaCalendario(input, {rapidi = true} = {}){
  if(!input || input.dataset.vestito) return;
  input.dataset.vestito = "1";
  input.hidden = true;
  input.tabIndex = -1;

  const bottone = el("button", "data-scelta");
  bottone.type = "button";
  bottone.setAttribute("aria-haspopup", "dialog");
  const testo = el("span", "data-testo");
  bottone.appendChild(el("i", "bi bi-calendar3"));
  bottone.appendChild(testo);
  bottone.appendChild(el("i", "bi bi-chevron-down freccia"));
  input.parentNode.insertBefore(bottone, input);

  // Il riquadro vive in fondo alla pagina: dentro la scheda verrebbe
  // tagliato dai bordi del modulo.
  const pop = el("div", "calendario");
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Scelta della giornata");
  pop.hidden = true;
  document.body.appendChild(pop);

  let meseMostrato = null;   // primo giorno del mese a video
  let aperto = false;

  const valore = () => input.value || "";

  function scrivi(giorno){
    input.value = giorno;
    input.dispatchEvent(new Event("input",  {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
    aggiornaBottone();
  }

  function aggiornaBottone(){
    const v = valore();
    testo.textContent = etichetta(v);
    bottone.classList.toggle("vuoto", !v);
    const oggi = todayISO();
    bottone.classList.toggle("oggi", v === oggi);
  }

  /* ───────────────────────── disegno ───────────────────────── */

  function disegna(){
    clear(pop);
    const oggi = todayISO();
    const scelto = valore();
    const base = d(meseMostrato);
    const anno = base.getUTCFullYear(), mese = base.getUTCMonth();

    /* testata: mese, anno e le due frecce */
    const hd = el("div", "cal-hd");
    const giu = el("button", "cal-nav"); giu.type = "button";
    giu.setAttribute("aria-label", "Mese precedente");
    giu.appendChild(el("i", "bi bi-chevron-left"));
    giu.addEventListener("click", () => { cambiaMese(-1); });

    const tit = el("span", "cal-mese", `${MESI[mese]} ${anno}`);

    const su = el("button", "cal-nav"); su.type = "button";
    su.setAttribute("aria-label", "Mese successivo");
    su.appendChild(el("i", "bi bi-chevron-right"));
    su.addEventListener("click", () => { cambiaMese(1); });

    hd.appendChild(giu); hd.appendChild(tit); hd.appendChild(su);
    pop.appendChild(hd);

    /* iniziali dei giorni */
    const righe = el("div", "cal-griglia");
    for(const i of INIZIALI) righe.appendChild(el("span", "cal-i", i));

    /* caselle vuote prima del primo del mese */
    const primo = iso(new Date(Date.UTC(anno, mese, 1)));
    for(let k = 0; k < indiceGiorno(primo); k++) righe.appendChild(el("span", "cal-vuota"));

    const quanti = new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
    for(let n = 1; n <= quanti; n++){
      const giorno = iso(new Date(Date.UTC(anno, mese, n)));
      const b = el("button", "cal-g");
      b.type = "button";
      b.textContent = String(n);
      b.dataset.giorno = giorno;
      b.setAttribute("aria-label", etichetta(giorno));
      if(indiceGiorno(giorno) >= 5) b.classList.add("festivo");
      if(giorno === oggi)   b.classList.add("adesso");
      if(giorno === scelto){ b.classList.add("scelto"); b.setAttribute("aria-current", "date"); }
      b.addEventListener("click", () => { scrivi(giorno); chiudi(); bottone.focus(); });
      righe.appendChild(b);
    }
    pop.appendChild(righe);

    /* scorciatoie: in cantiere si registra quasi sempre oggi o ieri */
    if(rapidi){
      const pie = el("div", "cal-pie");
      for(const [lab, giorno] of [["Oggi", oggi], ["Ieri", addDays(oggi, -1)]]){
        const b = el("button", "cal-rapido");
        b.type = "button";
        b.textContent = lab;
        if(valore() === giorno) b.classList.add("on");
        b.addEventListener("click", () => { scrivi(giorno); chiudi(); bottone.focus(); });
        pie.appendChild(b);
      }
      pop.appendChild(pie);
    }
  }

  function cambiaMese(passo){
    const b = d(meseMostrato);
    meseMostrato = iso(new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + passo, 1)));
    disegna();
    colloca();
  }

  /* ───────────────────── apertura e posizione ───────────────────── */

  function colloca(){
    const r = bottone.getBoundingClientRect();
    const h = pop.offsetHeight || 320;
    const w = pop.offsetWidth || 290;
    const sotto = window.innerHeight - r.bottom;
    const y = (sotto < h + 12 && r.top > h + 12) ? r.top - h - 6 : r.bottom + 6;
    pop.style.top = Math.max(8, y) + "px";
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
  }

  function apri(){
    if(aperto) return;
    const v = valore() || todayISO();
    const b = d(v);
    meseMostrato = iso(new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1)));
    pop.hidden = false;
    aperto = true;
    disegna();
    colloca();
    bottone.setAttribute("aria-expanded", "true");
    const scelto = pop.querySelector(".cal-g.scelto") || pop.querySelector(".cal-g.adesso");
    (scelto || pop.querySelector(".cal-g"))?.focus();
  }

  function chiudi(){
    if(!aperto) return;
    pop.hidden = true;
    aperto = false;
    bottone.setAttribute("aria-expanded", "false");
  }

  bottone.addEventListener("click", () => { aperto ? chiudi() : apri(); });

  document.addEventListener("pointerdown", ev => {
    if(!aperto) return;
    if(!pop.contains(ev.target) && !bottone.contains(ev.target)) chiudi();
  });

  pop.addEventListener("keydown", ev => {
    if(ev.key === "Escape"){ ev.preventDefault(); chiudi(); bottone.focus(); return; }
    const passi = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7};
    const p = passi[ev.key];
    if(!p) return;
    ev.preventDefault();
    const da = document.activeElement?.dataset?.giorno;
    if(!da) return;
    const meta = addDays(da, p);
    const b = d(meta);
    const stessoMese = iso(new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1))) === meseMostrato;
    if(!stessoMese){
      meseMostrato = iso(new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1)));
      disegna(); colloca();
    }
    pop.querySelector(`.cal-g[data-giorno="${meta}"]`)?.focus();
  });

  window.addEventListener("resize", () => { if(aperto) colloca(); });
  window.addEventListener("scroll", () => { if(aperto) colloca(); }, true);
  input.addEventListener("change", aggiornaBottone);

  aggiornaBottone();
}
