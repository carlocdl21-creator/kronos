-- ===========================================================================
-- KRONOS — storico degli avanzamenti (da eseguire su un progetto già avviato)
--
-- La riga in "fasi" dice com'è la lavorazione adesso; qui resta scritto ogni
-- passaggio: chi ha dichiarato cosa e quando. Niente si perde, nemmeno se
-- qualcuno sovrascrive per sbaglio il lavoro di un altro.
--
-- Chi ha installato lo schema da zero dopo questa modifica ce l'ha già.
-- ===========================================================================

create table if not exists public.fasi_storico (
  id         bigserial primary key,
  fase_id    text not null,
  inizio     date,
  fine       date,
  avanz      int,
  giust      text,
  chi        uuid references public.profili(id),
  quando     timestamptz not null default now()
);
create index if not exists storico_fase_idx on public.fasi_storico (fase_id, quando desc);

create or replace function public.registra_storico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.inizio is not distinct from old.inizio
     and new.fine   is not distinct from old.fine
     and new.avanz  is not distinct from old.avanz
     and new.giust  is not distinct from old.giust then
    return new;
  end if;
  insert into public.fasi_storico (fase_id, inizio, fine, avanz, giust, chi)
  values (new.id, new.inizio, new.fine, new.avanz, new.giust,
          coalesce(new.aggiornato_da, auth.uid()));
  return new;
end $$;

drop trigger if exists fasi_storico_trg on public.fasi;
create trigger fasi_storico_trg
  after insert or update on public.fasi
  for each row execute function public.registra_storico();

alter table public.fasi_storico enable row level security;

-- Lo leggono tutti gli autorizzati; scriverci non può nessuno,
-- se non il trigger qui sopra: lo storico non si corregge, si aggiunge.
drop policy if exists fasi_storico_lettura on public.fasi_storico;
create policy fasi_storico_lettura on public.fasi_storico
  for select to authenticated using (public.e_autorizzato());

grant select on public.fasi_storico to authenticated;

-- Fotografia di partenza: quello che c'è oggi entra nello storico.
insert into public.fasi_storico (fase_id, inizio, fine, avanz, giust, chi, quando)
select f.id, f.inizio, f.fine, f.avanz, f.giust, f.aggiornato_da, f.aggiornato_il
  from public.fasi f
 where not exists (select 1 from public.fasi_storico s where s.fase_id = f.id);

select count(*) || ' passaggi in archivio' as storico from public.fasi_storico;
