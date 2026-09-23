-- ===========================================================================
-- KRONOS — creazione delle utenze
--
-- Gli account si creano dal pannello Supabase:
--   Authentication → Users → Add user → Create new user
--   (indicare email e password, e spuntare "Auto Confirm User")
--
-- Subito dopo, per ciascun account, eseguire qui l'assegnazione del ruolo
-- sostituendo email e nome. L'id viene ricavato da solo dall'email.
-- ===========================================================================

-- ---------------------------------------------------- impresa esecutrice --
insert into public.profili (id, nome, ruolo)
select id, 'Impresa esecutrice', 'impresa'
from auth.users where email = 'impresa@esempio.it'
on conflict (id) do update set nome = excluded.nome, ruolo = excluded.ruolo;

-- -------------------------------------------------- stazione appaltante --
insert into public.profili (id, nome, ruolo)
select id, 'Comune di Marcaria – RUP', 'committenza'
from auth.users where email = 'rup@esempio.it'
on conflict (id) do update set nome = excluded.nome, ruolo = excluded.ruolo;

-- ---------------------------------------------------- direzione lavori --
insert into public.profili (id, nome, ruolo)
select id, 'Direzione Lavori', 'committenza'
from auth.users where email = 'dl@esempio.it'
on conflict (id) do update set nome = excluded.nome, ruolo = excluded.ruolo;

-- Verifica finale: elenco delle utenze abilitate.
select p.nome, p.ruolo, u.email, p.creato_il
from public.profili p join auth.users u on u.id = p.id
order by p.ruolo, p.nome;
