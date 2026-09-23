/* ==========================================================================
   Archivio condiviso su Supabase: autenticazione, database e file.
   Tutti i controlli di ruolo sono applicati anche lato server dalle policy
   RLS definite in supabase/schema.sql: quanto si nasconde nell'interfaccia
   resta comunque vietato al database.
   ========================================================================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CONFIG } from "./config.js";

const SEC_URL = 3600;               // durata dei collegamenti firmati ai file
const urlCache = new Map();         // path -> {url, scade}

export function creaStoreSupabase(){
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  let profili = {};                 // id -> {nome, ruolo}
  let canale = null;

  /* Il proprio profilo passa da una funzione del database, non dalla tabella:
     così si legge anche quando non si è ancora abilitati. */
  async function profiloMio(){
    const { data, error } = await sb.rpc("mio_profilo");
    if(error) throw error;
    return data || null;
  }

  const CHIAVE_CODICE = "kronos.codice-invito";

  function bucketDi(path){
    return path?.startsWith("documenti/") ? CONFIG.BUCKET_DOCUMENTI : CONFIG.BUCKET_FOTO;
  }
  function chiaveDi(path){
    return path.replace(/^(foto|documenti)\//, "");
  }

  return {
    mode: "supabase",
    utente: null,
    sb,

    /** Stato dopo l'accesso: "dentro", "in_attesa", "senza_profilo" o null. */
    statoRegistrazione: null,

    async init(){
      const { data } = await sb.auth.getSession();
      if(!data?.session) { this.statoRegistrazione = null; return false; }
      return await this.sistema(data.session.user);
    },

    /** Riconosce chi ha appena fatto accesso e decide se può entrare. */
    async sistema(utenteAuth){
      let p = await profiloMio();

      // registrazione lasciata a metà: il codice è stato messo da parte
      if(!p){
        let inSospeso = null;
        try{ inSospeso = JSON.parse(localStorage.getItem(CHIAVE_CODICE) || "null"); }catch(e){}
        if(inSospeso?.codice){
          try{
            await sb.rpc("registrati", {p_codice: inSospeso.codice, p_nome: inSospeso.nome || ""});
            p = await profiloMio();
          }catch(e){ /* codice non più valido: si rifà la registrazione */ }
          try{ localStorage.removeItem(CHIAVE_CODICE); }catch(e){}
        }
      }

      if(!p){ this.statoRegistrazione = "senza_profilo"; this.utente = null; return false; }
      if(!p.attivo){ this.statoRegistrazione = "in_attesa"; this.utente = null; return false; }

      this.statoRegistrazione = "dentro";
      this.utente = {
        id: utenteAuth.id, email: utenteAuth.email,
        nome: p.nome, ruolo: p.ruolo, amministratore: Boolean(p.amministratore)
      };
      return true;
    },

    async entra(email, password){
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
      const ok = await this.sistema(data.user);
      if(!ok) throw new Error(this.statoRegistrazione === "in_attesa"
        ? "IN_ATTESA" : "SENZA_PROFILO");
      return this.utente;
    },

    /** Crea l'utenza e, se la sessione parte subito, registra il profilo. */
    async registra({email, password, nome, codice}){
      const { data, error } = await sb.auth.signUp({
        email, password, options: { data: { nome } }
      });
      if(error) throw error;
      // con la conferma via email attiva non c'è ancora sessione: il codice
      // viene messo da parte e usato al primo accesso
      try{
        localStorage.setItem(CHIAVE_CODICE, JSON.stringify({codice, nome}));
      }catch(e){}
      if(!data.session) return { confermaEmail: true };
      const r = await sb.rpc("registrati", {p_codice: codice, p_nome: nome});
      if(r.error) throw r.error;
      try{ localStorage.removeItem(CHIAVE_CODICE); }catch(e){}
      await this.sistema(data.user);
      return { confermaEmail: false, stato: this.statoRegistrazione };
    },

    /* ---- amministrazione delle utenze ---- */
    async utenze(){
      const { data, error } = await sb.from("profili")
        .select("id,nome,ruolo,email,attivo,amministratore,creato_il")
        .order("attivo").order("creato_il");
      if(error) throw error;
      return data || [];
    },
    async abilita(id, si = true){
      const { error } = await sb.from("profili").update({ attivo: si }).eq("id", id);
      if(error) throw error;
    },
    async rifiuta(id){
      const { error } = await sb.from("profili").delete().eq("id", id);
      if(error) throw error;
    },
    async entraDemo(){ throw new Error("Modalità dimostrativa non disponibile: archivio condiviso attivo."); },

    async esci(){
      canale?.unsubscribe();
      canale = null;
      urlCache.clear();
      await sb.auth.signOut();
      this.utente = null;
    },

    async carica(){
      const [p, f, ft, dd, pr, rq, ev] = await Promise.all([
        sb.from("profili").select("id,nome,ruolo"),
        sb.from("fasi").select("*"),
        sb.from("foto").select("*").order("creato_il", {ascending:false}),
        sb.from("ddt").select("*").order("creato_il", {ascending:false}),
        sb.from("presenze").select("*").order("data", {ascending:false}),
        sb.from("richieste").select("*").order("creato_il", {ascending:false}),
        sb.from("richieste_eventi").select("*").order("creato_il", {ascending:true})
      ]);
      for(const r of [p,f,ft,dd,pr,rq,ev]) if(r.error) throw r.error;

      profili = Object.fromEntries((p.data||[]).map(x => [x.id, x]));
      const nome = id => profili[id]?.nome || "—";

      const fasi = {};
      for(const r of f.data || []){
        fasi[r.id] = {
          inizio:r.inizio, fine:r.fine, avanz:r.avanz ?? 0,
          giust:r.giust || "", giustData:r.giust_data,
          aggiornatoIl:r.aggiornato_il, autore:nome(r.aggiornato_da)
        };
      }
      const eventiPer = {};
      for(const e of ev.data || []){
        (eventiPer[e.richiesta_id] ||= []).push({
          at:e.creato_il, autore:nome(e.creato_da), ruolo:e.ruolo, testo:e.testo
        });
      }
      return {
        fasi,
        foto: (ft.data||[]).map(r => ({
          id:r.id, faseId:r.fase_id, didascalia:r.didascalia, path:r.path,
          nomeFile:r.nome_file, tipo:r.tipo, autore:nome(r.creato_da), creatoIl:r.creato_il
        })),
        ddt: (dd.data||[]).map(r => ({
          id:r.id, path:r.path, nomeFile:r.nome_file, tipo:r.tipo,
          autore:nome(r.creato_da), creatoIl:r.creato_il
        })),
        presenze: (pr.data||[]).map(r => ({
          id:r.id, data:r.data, nome:r.nome, cognome:r.cognome, ore:Number(r.ore)||0,
          lavorazione:r.lavorazione, impresa:r.impresa, autore:nome(r.creato_da), creatoIl:r.creato_il
        })),
        richieste: (rq.data||[]).map(r => ({
          id:r.id, titolo:r.titolo, testo:r.testo, stato:r.stato, faseId:r.fase_id,
          priorita:r.priorita, scadenza:r.scadenza, autore:nome(r.creato_da),
          creatoIl:r.creato_il, eventi:eventiPer[r.id] || []
        }))
      };
    },

    /* ----------------- cronoprogramma ----------------- */
    async salvaFase(id, b){
      const { error } = await sb.from("fasi").upsert({
        id, inizio:b.inizio, fine:b.fine, avanz:b.avanz,
        giust:b.giust, giust_data:b.giustData,
        aggiornato_il:new Date().toISOString(), aggiornato_da:this.utente.id
      });
      if(error) throw error;
    },

    /* ----------------- file ----------------- */
    async urlFile(path){
      if(!path) return null;
      const c = urlCache.get(path);
      if(c && c.scade > Date.now()) return c.url;
      const { data, error } = await sb.storage.from(bucketDi(path))
        .createSignedUrl(chiaveDi(path), SEC_URL);
      if(error) return null;
      urlCache.set(path, { url:data.signedUrl, scade: Date.now() + (SEC_URL - 120)*1000 });
      return data.signedUrl;
    },
    async blobFile(path){
      const { data, error } = await sb.storage.from(bucketDi(path)).download(chiaveDi(path));
      if(error) throw error;
      return data;
    },

    async caricaFoto(file, {faseId, didascalia}){
      const key = `${faseId || "generale"}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/[^\w.\-]+/g,"_")}`;
      const up = await sb.storage.from(CONFIG.BUCKET_FOTO)
        .upload(key, file, { contentType:file.type, upsert:false });
      if(up.error) throw up.error;
      const { error } = await sb.from("foto").insert({
        fase_id:faseId || null, didascalia:didascalia || null, path:"foto/" + key,
        nome_file:file.name, tipo:file.type, creato_da:this.utente.id
      });
      if(error){ await sb.storage.from(CONFIG.BUCKET_FOTO).remove([key]); throw error; }
    },
    async eliminaFoto(f){
      const { error } = await sb.from("foto").delete().eq("id", f.id);
      if(error) throw error;
      if(f.path) await sb.storage.from(CONFIG.BUCKET_FOTO).remove([chiaveDi(f.path)]);
      urlCache.delete(f.path);
    },

    /* ----------------- bolle e DDT ----------------- */
    async aggiungiDdt(file){
      const key = `ddt/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/[^\w.\-]+/g,"_")}`;
      const up = await sb.storage.from(CONFIG.BUCKET_DOCUMENTI)
        .upload(key, file, { contentType:file.type, upsert:false });
      if(up.error) throw up.error;
      const { error } = await sb.from("ddt").insert({
        path:"documenti/" + key, nome_file:file.name, tipo:file.type, creato_da:this.utente.id
      });
      if(error){
        await sb.storage.from(CONFIG.BUCKET_DOCUMENTI).remove([key]);
        throw error;
      }
    },
    async eliminaDdt(r){
      const { error } = await sb.from("ddt").delete().eq("id", r.id);
      if(error) throw error;
      if(r.path) await sb.storage.from(CONFIG.BUCKET_DOCUMENTI).remove([chiaveDi(r.path)]);
      urlCache.delete(r.path);
    },

    /* ----------------- presenze ----------------- */
    async aggiungiPresenza(p){
      const { error } = await sb.from("presenze").insert({
        data:p.data, nome:p.nome || null, cognome:p.cognome || null, ore:p.ore,
        lavorazione:p.lavorazione || null, impresa:p.impresa || null, creato_da:this.utente.id
      });
      if(error) throw error;
    },
    async eliminaPresenza(p){
      const { error } = await sb.from("presenze").delete().eq("id", p.id);
      if(error) throw error;
    },

    /* ----------------- richieste ----------------- */
    async aggiungiRichiesta(r){
      const { data, error } = await sb.from("richieste").insert({
        titolo:r.titolo, testo:r.testo, stato:"nuova", fase_id:r.faseId || null,
        priorita:r.priorita, scadenza:r.scadenza || null, creato_da:this.utente.id
      }).select("id").single();
      if(error) throw error;
      await sb.from("richieste_eventi").insert({
        richiesta_id:data.id, testo:"richiesta inoltrata",
        ruolo:this.utente.ruolo, creato_da:this.utente.id
      });
    },
    async aggiungiEvento(r, testo, nuovoStato){
      if(nuovoStato){
        const { error } = await sb.from("richieste").update({ stato:nuovoStato }).eq("id", r.id);
        if(error) throw error;
      }
      const { error } = await sb.from("richieste_eventi").insert({
        richiesta_id:r.id, testo, ruolo:this.utente.ruolo, creato_da:this.utente.id
      });
      if(error) throw error;
    },

    /* ----------------- tempo reale ----------------- */
    onCambio(cb){
      try{
        canale = sb.channel("kronos-commessa")
          .on("postgres_changes", { event:"*", schema:"public" }, () => cb())
          .subscribe();
      }catch(e){ /* senza realtime resta il riallineamento periodico */ }
      return () => { canale?.unsubscribe(); canale = null; };
    }
  };
}
