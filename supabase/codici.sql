-- ===========================================================================
-- KRONOS — codici d'invito e prima utenza amministratrice
--
-- Da eseguire nell'SQL Editor DOPO schema.sql.
--
-- Ogni persona si registra da sola sul sito, con il codice del proprio lato:
-- il codice decide il ruolo, e chi ha quello della committenza non può
-- entrare come impresa. Nessuno entra però finché un amministratore non lo
-- abilita: il codice dice DA CHE PARTE stai, l'abilitazione dice SE entri.
--
-- I codici NON sono scritti qui dentro: li genera il database ed è l'ultima
-- query a stamparli. Questo file sta in un repository pubblico, e un codice
-- scritto nel codice sorgente è un codice già bruciato.
-- ===========================================================================

-- Codice leggibile al telefono: niente caratteri che si confondono
-- (0/O, 1/I/L, 2/Z, 5/S, 8/B).
create or replace function public.nuovo_codice(prefisso text)
returns text
language plpgsql
volatile
as $$
declare
  alfabeto text := 'ACDEFGHJKMNPQRTUVWXY3479';
  parti text[] := '{}';
  gruppo text;
  i int; j int;
begin
  for i in 1..3 loop
    gruppo := '';
    for j in 1..4 loop
      gruppo := gruppo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    parti := parti || gruppo;
  end loop;
  return prefisso || '-' || array_to_string(parti, '-');
end $$;

-- ---------------------------------------------------------- i due codici --
-- Ne crea uno per lato solo se non ce n'è già uno valido: si può rieseguire.
-- Scadenza e numero massimo di usi limitano il danno se un codice gira.
insert into public.codici_invito (codice, ruolo, etichetta, scade_il, usi_max)
select public.nuovo_codice('SA'), 'committenza',
       'Stazione Appaltante e Direzione Lavori', current_date + 120, 20
 where not exists (select 1 from public.codici_invito
                    where ruolo = 'committenza' and attivo
                      and (scade_il is null or scade_il >= current_date));

insert into public.codici_invito (codice, ruolo, etichetta, scade_il, usi_max)
select public.nuovo_codice('IMP'), 'impresa',
       'Impresa esecutrice e subappalti', current_date + 120, 30
 where not exists (select 1 from public.codici_invito
                    where ruolo = 'impresa' and attivo
                      and (scade_il is null or scade_il >= current_date));

-- ------------------------------------------------- prima utenza abilitata --
-- L'amministratore non può registrarsi da solo: non c'è ancora nessuno che
-- lo abiliti. Crea la TUA utenza dal pannello (Authentication → Users →
-- Add user, con Auto Confirm User spuntato), poi metti qui la tua email.
insert into public.profili (id, nome, ruolo, email, attivo, amministratore)
select id, 'Nome Cognome', 'impresa', email, true, true
from auth.users where email = 'TUA-EMAIL@esempio.it'
on conflict (id) do update
  set attivo = true, amministratore = true, nome = excluded.nome;

-- ------------------------------------------- ANNOTA I CODICI CHE ESCONO --
select ruolo, codice, etichetta, usi || '/' || usi_max as usi, scade_il
  from public.codici_invito
 where attivo order by ruolo;

select p.nome, p.ruolo, u.email,
       case when p.attivo then 'abilitato' else 'in attesa' end as stato,
       case when p.amministratore then 'amministratore' else '' end as poteri
  from public.profili p join auth.users u on u.id = p.id
 order by p.attivo, p.creato_il;
