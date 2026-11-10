-- ===========================================================================
-- KRONOS — meteo e note sul giornale di cantiere
--
-- Da eseguire su un progetto già avviato. Chi installa schema.sql da zero
-- dopo questa modifica se le trova già.
--
-- Il meteo serve a giustificare i fermi: una giornata di pioggia o di neve
-- è la motivazione più frequente di uno scostamento sul cronoprogramma, e
-- averla scritta giorno per giorno vale più di una ricostruzione a posteriori.
-- Le note stanno sulla singola riga: servono al caso particolare del
-- singolo operaio (mezza giornata, infortunio, permesso), non alla giornata.
-- ===========================================================================

alter table public.presenze add column if not exists meteo text;
alter table public.presenze add column if not exists note  text;

-- Valori chiusi: il meteo si sceglie da un elenco, non si scrive a mano,
-- altrimenti "pioggia", "Pioggia" e "piovoso" diventano tre cose diverse.
do $$
begin
  alter table public.presenze
    add constraint presenze_meteo_valido
    check (meteo is null or meteo in ('soleggiato','pioggia','grandine','neve','vento'));
exception
  when duplicate_object then null;
end $$;

select count(*) || ' presenze in archivio' as giornale from public.presenze;
