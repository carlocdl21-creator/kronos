-- ===========================================================================
-- KRONOS — verifica dell'installazione
-- Da eseguire nell'SQL Editor dopo schema.sql e codici.sql. Non modifica nulla.
-- Ogni riga deve dire "ok". Se una dice "MANCA", quella parte va rifatta.
-- ===========================================================================
with atteso as (
  select * from (values
    ('tabelle',          8, 'schema.sql non è passato per intero'),
    ('funzioni',         6, 'schema.sql non è passato per intero'),
    ('archivi file',     2, 'creare i bucket foto e documenti da Storage'),
    ('regole sui file',  3, 'creare le 3 regole da Storage → Policies'),
    ('codici d''invito', 2, 'codici.sql non è stato eseguito'),
    ('amministratori',   1, 'in codici.sql l''email non coincide con l''utenza')
  ) as t(cosa, quanti, rimedio)
),
trovato as (
  select 'tabelle' as cosa, count(*)::int as n
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('profili','fasi','foto','ddt','presenze',
                        'richieste','richieste_eventi','codici_invito')
  union all
  select 'funzioni', count(*)::int
    from information_schema.routines
   where routine_schema = 'public'
     and routine_name in ('ruolo','e_impresa','e_autorizzato',
                          'e_amministratore','registrati','mio_profilo')
  union all
  select 'archivi file', count(*)::int
    from storage.buckets where id in ('foto','documenti')
  union all
  select 'regole sui file', count(*)::int
    from pg_policies where schemaname = 'storage' and policyname like 'kronos_%'
  union all
  select 'codici d''invito', count(*)::int from public.codici_invito where attivo
  union all
  select 'amministratori', count(*)::int
    from public.profili where amministratore and attivo
)
select a.cosa,
       t.n || ' / ' || a.quanti as trovati,
       case when t.n >= a.quanti then 'ok' else 'MANCA → ' || a.rimedio end as esito
  from atteso a join trovato t using (cosa)
 order by case when t.n >= a.quanti then 1 else 0 end, a.cosa;
