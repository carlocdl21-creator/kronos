-- ===========================================================================
-- KRONOS — schema dell'archivio condiviso (Supabase / PostgreSQL)
--
-- Da eseguire UNA VOLTA nell'SQL Editor del progetto Supabase.
-- Crea tabelle, regole di accesso per ruolo (RLS) e i due bucket dei file.
--
-- Ruoli:
--   'impresa'     → impresa esecutrice: scrive cronoprogramma, foto, bolle,
--                   presenze; aggiorna lo stato delle richieste.
--   'committenza' → Stazione Appaltante e Direzione Lavori: sola lettura su
--                   tutto, con la sola facoltà di inoltrare richieste e note.
--
-- Le regole valgono lato server: qualunque tentativo di scrittura fuori ruolo
-- viene respinto dal database, non soltanto nascosto nell'interfaccia.
-- ===========================================================================

-- ---------------------------------------------------------------- profili --
create table if not exists public.profili (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  ruolo      text not null check (ruolo in ('impresa','committenza')),
  creato_il  timestamptz not null default now()
);

-- Ruolo dell'utente collegato. SECURITY DEFINER per poter essere usata
-- dentro le policy senza ricorsione su profili.
create or replace function public.ruolo()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select ruolo from public.profili where id = auth.uid()), 'nessuno');
$$;

create or replace function public.e_impresa() returns boolean
language sql stable as $$ select public.ruolo() = 'impresa' $$;

create or replace function public.e_autorizzato() returns boolean
language sql stable as $$ select public.ruolo() in ('impresa','committenza') $$;

-- ------------------------------------------------------------------ fasi --
-- Una riga per attività del cronoprogramma. L'id è quello della baseline
-- (js/baseline.js): 'fondazioni', 'xlam', 'cop_strut', ...
create table if not exists public.fasi (
  id             text primary key,
  inizio         date,
  fine           date,
  avanz          int not null default 0 check (avanz between 0 and 100),
  giust          text not null default '',
  giust_data     timestamptz,
  aggiornato_il  timestamptz not null default now(),
  aggiornato_da  uuid references public.profili(id)
);

-- ------------------------------------------------------------------ foto --
create table if not exists public.foto (
  id          uuid primary key default gen_random_uuid(),
  fase_id     text,
  didascalia  text,
  path        text not null,
  nome_file   text,
  tipo        text,
  creato_da   uuid references public.profili(id),
  creato_il   timestamptz not null default now()
);
create index if not exists foto_fase_idx on public.foto (fase_id);

-- ------------------------------------------------------------------- ddt --
-- Archivio dei documenti di trasporto: soltanto il file caricato.
create table if not exists public.ddt (
  id           uuid primary key default gen_random_uuid(),
  path         text not null,
  nome_file    text,
  tipo         text,
  creato_da    uuid references public.profili(id),
  creato_il    timestamptz not null default now()
);
create index if not exists ddt_data_idx on public.ddt (creato_il desc);

-- -------------------------------------------------------------- presenze --
-- Una riga per ogni operaio presente in una giornata.
create table if not exists public.presenze (
  id           uuid primary key default gen_random_uuid(),
  data         date not null,
  nome         text,
  cognome      text,
  ore          numeric(4,1) not null default 0 check (ore >= 0 and ore <= 24),
  fase_id      text,
  impresa      text,
  creato_da    uuid references public.profili(id),
  creato_il    timestamptz not null default now()
);
create index if not exists presenze_data_idx on public.presenze (data desc, cognome);

-- -------------------------------------------------------------- richieste --
create table if not exists public.richieste (
  id         uuid primary key default gen_random_uuid(),
  titolo     text not null,
  testo      text not null,
  stato      text not null default 'nuova' check (stato in ('nuova','presa','lavorazione','terminata')),
  fase_id    text,
  priorita   text not null default 'normale' check (priorita in ('normale','alta','urgente')),
  scadenza   date,
  creato_da  uuid references public.profili(id),
  creato_il  timestamptz not null default now()
);

create table if not exists public.richieste_eventi (
  id            uuid primary key default gen_random_uuid(),
  richiesta_id  uuid not null references public.richieste(id) on delete cascade,
  testo         text not null,
  ruolo         text,
  creato_da     uuid references public.profili(id),
  creato_il     timestamptz not null default now()
);
create index if not exists eventi_richiesta_idx on public.richieste_eventi (richiesta_id, creato_il);

-- ===========================================================================
-- REGOLE DI ACCESSO
-- ===========================================================================

alter table public.profili           enable row level security;
alter table public.fasi              enable row level security;
alter table public.foto              enable row level security;
alter table public.ddt               enable row level security;
alter table public.presenze          enable row level security;
alter table public.richieste         enable row level security;
alter table public.richieste_eventi  enable row level security;

-- profili: ogni utente autorizzato vede l'elenco (serve per mostrare i nomi),
-- nessuno lo modifica dall'applicativo.
drop policy if exists profili_lettura on public.profili;
create policy profili_lettura on public.profili
  for select to authenticated using (public.e_autorizzato());

-- Lettura di tutto il cantiere per entrambi i ruoli.
do $$
declare t text;
begin
  foreach t in array array['fasi','foto','ddt','presenze','richieste','richieste_eventi'] loop
    execute format('drop policy if exists %I on public.%I', t || '_lettura', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.e_autorizzato())',
      t || '_lettura', t);
  end loop;
end $$;

-- Scrittura riservata all'impresa su cronoprogramma, foto, bolle e presenze.
do $$
declare t text;
begin
  foreach t in array array['fasi','foto','ddt','presenze'] loop
    execute format('drop policy if exists %I on public.%I', t || '_scrittura', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.e_impresa()) with check (public.e_impresa())',
      t || '_scrittura', t);
  end loop;
end $$;

-- Richieste: le inoltra la committenza; l'impresa ne aggiorna soltanto lo stato.
drop policy if exists richieste_inserimento on public.richieste;
create policy richieste_inserimento on public.richieste
  for insert to authenticated
  with check (public.ruolo() = 'committenza' and creato_da = auth.uid());

drop policy if exists richieste_stato on public.richieste;
create policy richieste_stato on public.richieste
  for update to authenticated
  using (public.e_impresa()) with check (public.e_impresa());

drop policy if exists richieste_ritiro on public.richieste;
create policy richieste_ritiro on public.richieste
  for delete to authenticated
  using (public.ruolo() = 'committenza' and creato_da = auth.uid());

-- Eventi: entrambi i ruoli possono annotare, sempre a proprio nome.
drop policy if exists eventi_inserimento on public.richieste_eventi;
create policy eventi_inserimento on public.richieste_eventi
  for insert to authenticated
  with check (public.e_autorizzato() and creato_da = auth.uid());

-- ===========================================================================
-- ARCHIVIO FILE
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('foto','foto',false), ('documenti','documenti',false)
on conflict (id) do nothing;

drop policy if exists kronos_file_lettura on storage.objects;
create policy kronos_file_lettura on storage.objects
  for select to authenticated
  using (bucket_id in ('foto','documenti') and public.e_autorizzato());

drop policy if exists kronos_file_scrittura on storage.objects;
create policy kronos_file_scrittura on storage.objects
  for insert to authenticated
  with check (bucket_id in ('foto','documenti') and public.e_impresa());

drop policy if exists kronos_file_rimozione on storage.objects;
create policy kronos_file_rimozione on storage.objects
  for delete to authenticated
  using (bucket_id in ('foto','documenti') and public.e_impresa());

-- ===========================================================================
-- AGGIORNAMENTI IN TEMPO REALE
-- ===========================================================================

do $$
declare t text;
begin
  foreach t in array array['fasi','foto','ddt','presenze','richieste','richieste_eventi'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
