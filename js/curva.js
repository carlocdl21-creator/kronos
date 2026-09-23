/* ══════════════════════════════════════════════════════════════════
   Curva a S dell'avanzamento economico cumulato.
   Due serie: quella di contratto (tratteggiata, grigia) e quella
   realizzata (piena, nera, ricostruita dalle barre reali dichiarate).
   La forbice fra le due è l'area grigia: è il ritardo, in punti.
   ══════════════════════════════════════════════════════════════════ */

import { TRACCIATE, COSTO_TRACCIATO } from "./baseline.js";
import { calc } from "./calcoli.js";
import { addDays, diffDays, iso, fmtD, el, clear, nf0 } from "./util.js";

const MESI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const SVGNS = "http://www.w3.org/2000/svg";
const M = {t:10, r:58, b:22, l:32};          // margini: a destra spazio per le etichette
const H = 146;

const nodo = (t, attr) => {
  const n = document.createElementNS(SVGNS, t);
  for(const k in attr) n.setAttribute(k, attr[k]);
  return n;
};

/** Frazione di lavorazione prevista dal contratto alla data t. */
function fraseContratto(r, t){
  const tot = diffDays(r.f, r.i) + 1;
  return Math.max(0, Math.min(1, (diffDays(t, r.i) + 1) / tot));
}

/** Frazione realizzata alla data t, ricostruita dalla barra reale e dall'avanzamento dichiarato. */
function frazioneReale(c, t, oggi){
  if(!c.av) return 0;
  const fine = c.av >= 100 ? c.effF : (oggi > c.effI ? oggi : c.effI);
  const tot = Math.max(1, diffDays(fine, c.effI) + 1);
  const quota = Math.max(0, Math.min(1, (diffDays(t, c.effI) + 1) / tot));
  return quota * c.av / 100;
}

export function disegnaCurva(box, {fasi, oggi, sc}){
  clear(box);
  const largh = Math.max(320, box.clientWidth || 720);
  const W = largh;
  const px = (W - M.l - M.r) / Math.max(1, sc.giorni - 1);
  const X = giorno => M.l + diffDays(giorno, sc.min) * px;
  const Y = pct => M.t + (100 - pct) / 100 * (H - M.t - M.b);

  /* ---- campionamento settimanale ---- */
  const punti = [];
  for(let g = 0; g <= sc.giorni - 1; g += 7) punti.push(addDays(sc.min, g));
  if(punti[punti.length - 1] !== sc.max) punti.push(sc.max);

  const serie = punti.map(t => {
    let prev = 0, real = 0;
    for(const r of TRACCIATE){
      prev += r.costo * fraseContratto(r, t);
      if(t <= oggi) real += r.costo * frazioneReale(calc(r, fasi[r.id] || {}, oggi), t, oggi);
    }
    return {
      t,
      prev: COSTO_TRACCIATO ? prev / COSTO_TRACCIATO * 100 : 0,
      real: t <= oggi ? (COSTO_TRACCIATO ? real / COSTO_TRACCIATO * 100 : 0) : null
    };
  });

  const svg = nodo("svg", {width:W, height:H, viewBox:`0 0 ${W} ${H}`, role:"img",
    "aria-label":"Curva a S dell'avanzamento: previsto dal contratto e realizzato"});

  /* ---- griglia orizzontale, volutamente poco marcata ---- */
  for(const v of [0,25,50,75,100]){
    svg.appendChild(nodo("line", {x1:M.l, x2:W - M.r, y1:Y(v), y2:Y(v),
      stroke:"#ececea", "stroke-width":1}));
    const et = nodo("text", {x:M.l - 7, y:Y(v) + 3.5, "text-anchor":"end",
      "font-size":9.5, fill:"#a1a1aa", "font-weight":600});
    et.textContent = v + "%";
    svg.appendChild(et);
  }

  /* ---- mesi sull'asse orizzontale ---- */
  const d0 = new Date(sc.min + "T00:00:00Z");
  let mese = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
  while(iso(mese) <= sc.max){
    const giorno = iso(mese) < sc.min ? sc.min : iso(mese);
    svg.appendChild(nodo("line", {x1:X(giorno), x2:X(giorno), y1:M.t, y2:H - M.b,
      stroke:"#f4f4f5", "stroke-width":1}));
    const et = nodo("text", {x:X(giorno) + 3, y:H - M.b + 13, "font-size":9.5,
      fill:"#a1a1aa", "font-weight":600});
    et.textContent = MESI[mese.getUTCMonth()] +
      (mese.getUTCMonth() === 0 || iso(mese) <= sc.min ? " " + mese.getUTCFullYear() : "");
    svg.appendChild(et);
    mese = new Date(Date.UTC(mese.getUTCFullYear(), mese.getUTCMonth() + 1, 1));
  }

  /* ---- forbice fra previsto e realizzato ---- */
  const conReale = serie.filter(p => p.real != null);
  if(conReale.length > 1){
    const su = conReale.map(p => `${X(p.t)},${Y(p.prev)}`).join(" ");
    const giu = conReale.slice().reverse().map(p => `${X(p.t)},${Y(p.real)}`).join(" ");
    svg.appendChild(nodo("polygon", {points:`${su} ${giu}`, fill:"#18181b", opacity:.07}));
  }

  /* ---- le due curve ---- */
  const linea = (pts, attr) => nodo("polyline", {
    points: pts.join(" "), fill:"none", "stroke-linejoin":"round", "stroke-linecap":"round", ...attr
  });
  svg.appendChild(linea(serie.map(p => `${X(p.t)},${Y(p.prev)}`),
    {stroke:"#71717a", "stroke-width":2, "stroke-dasharray":"6 4"}));
  if(conReale.length)
    svg.appendChild(linea(conReale.map(p => `${X(p.t)},${Y(p.real)}`),
      {stroke:"#0a0a0a", "stroke-width":2.5}));

  /* ---- data odierna ---- */
  if(oggi >= sc.min && oggi <= sc.max){
    svg.appendChild(nodo("line", {x1:X(oggi), x2:X(oggi), y1:M.t - 4, y2:H - M.b,
      stroke:"#0a0a0a", "stroke-width":1, "stroke-dasharray":"2 3", opacity:.5}));
  }

  /* ---- etichette diritte in testa alle curve, al posto di una legenda muta ---- */
  const ultimo = serie[serie.length - 1];
  const etPrev = nodo("text", {x:W - M.r + 6, y:Y(ultimo.prev) + 3.5, "font-size":10,
    fill:"#71717a", "font-weight":700});
  etPrev.textContent = "contratto";
  svg.appendChild(etPrev);

  const ultimoReale = conReale[conReale.length - 1];
  if(ultimoReale){
    const y = Y(ultimoReale.real);
    svg.appendChild(nodo("circle", {cx:X(ultimoReale.t), cy:y, r:4, fill:"#0a0a0a"}));
    const et = nodo("text", {x:X(ultimoReale.t) + 8, y:y + 3.5, "font-size":10,
      fill:"#0a0a0a", "font-weight":700});
    et.textContent = `realizzato ${nf0(ultimoReale.real)}%`;
    svg.appendChild(et);
  }

  /* ---- lettura al passaggio del mouse ---- */
  const cross = nodo("line", {y1:M.t, y2:H - M.b, stroke:"#0a0a0a", "stroke-width":1, opacity:0});
  svg.appendChild(cross);
  const pallaP = nodo("circle", {r:4, fill:"#fff", stroke:"#71717a", "stroke-width":2, opacity:0});
  const pallaR = nodo("circle", {r:4, fill:"#0a0a0a", opacity:0});
  svg.appendChild(pallaP); svg.appendChild(pallaR);

  const tip = el("div","curva-tip");
  tip.hidden = true;
  box.appendChild(tip);

  svg.addEventListener("pointermove", ev => {
    const q = svg.getBoundingClientRect();
    const gx = ev.clientX - q.left;
    let vicino = serie[0], dmin = Infinity;
    for(const p of serie){
      const d = Math.abs(X(p.t) - gx);
      if(d < dmin){ dmin = d; vicino = p; }
    }
    const x = X(vicino.t);
    cross.setAttribute("x1", x); cross.setAttribute("x2", x);
    cross.setAttribute("opacity", .18);
    pallaP.setAttribute("cx", x); pallaP.setAttribute("cy", Y(vicino.prev)); pallaP.setAttribute("opacity", 1);
    if(vicino.real != null){
      pallaR.setAttribute("cx", x); pallaR.setAttribute("cy", Y(vicino.real)); pallaR.setAttribute("opacity", 1);
    } else pallaR.setAttribute("opacity", 0);

    clear(tip);
    tip.appendChild(el("b", null, fmtD(vicino.t)));
    tip.appendChild(el("span", null, `contratto ${nf0(vicino.prev)}%`));
    if(vicino.real != null){
      tip.appendChild(el("span", null, `realizzato ${nf0(vicino.real)}%`));
      const d = vicino.real - vicino.prev;
      const r = el("span", d < -3 ? "male" : "bene",
        `${d >= 0 ? "+" : "−"}${nf0(Math.abs(d))} punti`);
      tip.appendChild(r);
    } else {
      tip.appendChild(el("span","muted","non ancora rilevato"));
    }
    tip.hidden = false;
    tip.style.left = Math.min(Math.max(8, x - 60), W - 150) + "px";
  });
  svg.addEventListener("pointerleave", () => {
    tip.hidden = true;
    cross.setAttribute("opacity", 0);
    pallaP.setAttribute("opacity", 0);
    pallaR.setAttribute("opacity", 0);
  });

  box.appendChild(svg);
}
