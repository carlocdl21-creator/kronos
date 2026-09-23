-- ===========================================================================
-- KRONOS — revoca i codici in circolazione e ne emette di nuovi
--
-- Da usare quando un codice è finito dove non doveva: in una chat sbagliata,
-- in un documento condiviso, nelle mani di qualcuno che ha lasciato l'impresa.
-- Chi è già registrato e abilitato non viene toccato: continua a entrare.
-- ===========================================================================

update public.codici_invito set attivo = false where attivo;

insert into public.codici_invito (codice, ruolo, etichetta, scade_il, usi_max)
values
  (public.nuovo_codice('SA'),  'committenza',
   'Stazione Appaltante e Direzione Lavori', current_date + 120, 8),
  (public.nuovo_codice('IMP'), 'impresa',
   'Impresa esecutrice e subappalti',        current_date + 120, 12);

-- I nuovi codici da consegnare. I vecchi non funzionano più.
select ruolo, codice, etichetta, scade_il
  from public.codici_invito where attivo order by ruolo;
