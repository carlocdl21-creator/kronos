/* ==========================================================================
   Diagramma di Gantt a due bande:
   barra tratteggiata = baseline contrattuale, barra piena = avanzamento reale.
   ========================================================================== */

import { BASE } from "./baseline.js";
import { calc, intervallo } from "./calcoli.js";
import { d, iso, addDays, diffDays, fmtD, eur, el, clear } from "./util.js";

const MESI = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];

export function disegnaGantt(gbody, {fasi, oggi, px}){
  const {min:rawMin, max:rawMax} = intervallo(fasi, oggi);

  // si parte dal lunedì precedente, così le settimane cadono sulle colonne
  const dow = (d(rawMin).getUTCDay() + 6) % 7;
  const min = addDays(rawMin, -dow);
  const max = addDays(rawMax, 7);
  const giorni = diffDays(max, min) + 1;

  const LW = window.innerWidth < 640 ? 168 : 250;
  const TW = giorni * px;
  gbody.style.setProperty("--lw", LW + "px");
  gbody.style.setProperty("--tw", TW + "px");
  clear(gbody);

  /* ---- testata: mesi e settimane ---- */
  const head = el("div","ghead");
  const hl = el("div","glabel");
  hl.appendChild(el("span","lbl","Attività"));
  head.appendChild(hl);

  const sc = el("div","gscale");
  let cur = min;
  while(cur <= max){
    const dt = d(cur);
    if(dt.getUTCDate() <= 7 || cur === min){
      const primoProssimo = iso(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth()+1, 1)));
      const fineMese = primoProssimo > max ? max : addDays(primoProssimo, -1);
      const larghezza = (diffDays(fineMese, cur) + 1) * px;
      // con poco spazio si tiene il solo mese, senza l'anno
      const m = el("div","gmonth", larghezza < 66
        ? MESI[dt.getUTCMonth()]
        : `${MESI[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`);
      m.style.left  = diffDays(cur, min) * px + "px";
      m.style.width = larghezza + "px";
      sc.appendChild(m);
      cur = primoProssimo > max ? addDays(max, 1) : primoProssimo;
    } else {
      cur = addDays(cur, 1);
    }
  }
  for(let w = 0; w * 7 < giorni; w++){
    const wd = el("div","gweek", "S" + (w + 1));
    wd.style.left = w * 7 * px + "px";
    wd.style.width = 7 * px + "px";
    sc.appendChild(wd);
  }
  head.appendChild(sc);
  gbody.appendChild(head);

  /* ---- righe ---- */
  const gridline = `repeating-linear-gradient(to right,var(--line) 0 1px,transparent 1px ${7*px}px)`;

  for(const r of BASE){
    const c = (r.foglia && !r.continua) ? calc(r, fasi[r.id] || {}, oggi) : null;

    const row = el("div","grow");
    row.dataset.liv = r.liv;
    row.dataset.id = r.id;

    const lab = el("div","glabel");
    lab.style.setProperty("--ind", (r.liv * 12) + "px");
    lab.appendChild(el("span","num", String(r.n)));
    const nm = el("span","nm", r.nome);
    nm.title = `${r.nome} · ${fmtD(r.i)} → ${fmtD(r.f)} · ${r.durata} gg · ${eur(r.costo)}`;
    lab.appendChild(nm);
    row.appendChild(lab);

    const tr = el("div","gtrack");
    tr.style.backgroundImage = gridline;

    const b = el("div","gbar base");
    b.style.left  = diffDays(r.i, min) * px + "px";
    b.style.width = Math.max(3, (diffDays(r.f, r.i) + 1) * px) + "px";
    b.title = `Baseline: ${fmtD(r.i)} → ${fmtD(r.f)}`;
    tr.appendChild(b);

    if(c && (c.inizio || c.av > 0 || c.ritAvvio > 0)){
      let cls = c.sev === "crit" ? "s-crit" : (c.sev === "warn" ? "s-warn" : "s-ok");
      if(c.av === 0 && !c.inizio) cls = "s-idle";
      const rb = el("div","gbar real " + cls);
      rb.style.left  = diffDays(c.effI, min) * px + "px";
      rb.style.width = Math.max(3, (diffDays(c.effF, c.effI) + 1) * px) + "px";
      const fill = el("i");
      fill.style.width = c.av + "%";
      rb.appendChild(fill);
      rb.title = `Reale: ${fmtD(c.effI)} → ${fmtD(c.effF)} · avanzamento ${c.av}%`;
      tr.appendChild(rb);
    }
    row.appendChild(tr);
    gbody.appendChild(row);
  }

  const t = el("div","gtoday");
  t.style.left = (LW + diffDays(oggi, min) * px) + "px";
  gbody.appendChild(t);
}
