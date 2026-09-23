-- ===========================================================================
-- KRONOS — codici d'invito e prima utenza amministratrice
--
-- Da eseguire nell'SQL Editor DOPO schema.sql.
--
-- Ogni persona si registra da sola sul sito, con il codice del proprio lato:
-- il codice decide il ruolo, e chi ha quello della committenza non può
-- entrare come impresa. Nessuno entra però finché un amministratore non lo
-- abilita: il codice dice DA CHE PARTE stai, l'abilitazione dice SE entri.
-- ===========================================================================

-- ---------------------------------------------------------- i due codici --
-- Scadenza e numero massimo di usi limitano il danno se un codice gira.
insert into public.codici_invito (codice, ruolo, etichetta, scade_il, usi_max) values
  ('SA-4VLA-UKJQ-TP43',  'committenza', 'Stazione Appaltante e Direzione Lavori', current_date + 120, 8),
  ('IMP-DWF9-MNVC-9PNG', 'impresa',     'Impresa esecutrice e subappalti',        current_date + 120, 12)
on conflict (codice) do nothing;

-- ------------------------------------------------- prima utenza abilitata --
-- L'amministratore non può registrarsi da solo: non c'è ancora nessuno che
-- lo abiliti. Crea la TUA utenza dal pannello (Authentication → Users →
-- Add user, con Auto Confirm User spuntato), poi metti qui la tua email.
insert into public.profili (id, nome, ruolo, email, attivo, amministratore)
select id, 'Carlo De Luca', 'impresa', email, true, true
from auth.users where email = 'TUA-EMAIL@esempio.it'
on conflict (id) do update
  set attivo = true, amministratore = true, nome = excluded.nome;

-- ----------------------------------------------------------- verifiche --
select codice, ruolo, etichetta, usi || '/' || usi_max as usi, scade_il
  from public.codici_invito order by ruolo;

select p.nome, p.ruolo, u.email,
       case when p.attivo then 'abilitato' else 'in attesa' end as stato,
       case when p.amministratore then 'amministratore' else '' end as poteri
  from public.profili p join auth.users u on u.id = p.id
 order by p.attivo, p.creato_il;
