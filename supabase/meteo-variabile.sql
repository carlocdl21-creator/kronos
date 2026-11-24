-- ===========================================================================
-- KRONOS — "Tempo variabile" fra i valori del meteo
--
-- Il vincolo elenca i valori ammessi: senza allargarlo, il salvataggio di
-- una presenza con tempo variabile verrebbe rifiutato dal database.
-- ===========================================================================

alter table public.presenze drop constraint if exists presenze_meteo_valido;
alter table public.presenze
  add constraint presenze_meteo_valido
  check (meteo is null or meteo in ('soleggiato','variabile','pioggia','grandine','neve','vento'));

select meteo, count(*) as presenze from public.presenze group by meteo order by meteo;
