-- ─────────────────────────────────────────────────────────────────────────────
-- QG des agents (24/11/2026) : le guichet unique des demandes de validation.
--
-- Tout agent (LPCS ou DAEDALUS) qui veut agir à l'extérieur — publier, envoyer un
-- e-mail, fusionner du code, dépenser — dépose une DEMANDE ici. Le co-CEO (fonction
-- Edge `qg`) l'envoie sur le WhatsApp d'Hippolyte avec trois boutons ; la réponse
-- revient ici. Rien d'extérieur ne part sans statut « validee » : l'exécutant relit
-- ce statut juste avant d'agir.
--
-- Lecture et décision : le seul administrateur (table `administrateurs`, fonction
-- est_administrateur()) depuis l'application QG ; écriture des agents : clé de
-- service uniquement (tâches GitHub, fonctions Edge), jamais depuis un navigateur.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.qg_agents (
  id text primary key,                         -- « marketing.publication-instagram »
  prenom text not null,                        -- nom affiché (« Noémie »)
  societe text not null default 'lpcs' check (societe in ('lpcs', 'daedalus')),
  equipe text not null,                        -- direction | marketing | prospection | developpement | production
  role text not null,                          -- une phrase : ce qu'il fait
  outil text,                                  -- GitHub Actions, fonction Edge, Claude Code…
  rythme text,                                 -- « toutes les 15 min », « 8h et 19h »…
  actif boolean not null default true,
  dernier_passage timestamptz,
  dernier_etat text check (dernier_etat in ('ok', 'attention', 'panne')),
  dernier_message text,
  maj_le timestamptz not null default now()
);

create table if not exists public.qg_demandes (
  id uuid primary key default gen_random_uuid(),
  societe text not null default 'lpcs' check (societe in ('lpcs', 'daedalus')),
  equipe text not null,
  agent text not null,                         -- qg_agents.id (libre : un agent pas encore inscrit peut demander)
  action text not null,                        -- publier_instagram, envoyer_email, fusionner_pr…
  titre text not null,                         -- ce qu'on lit en premier sur WhatsApp
  resume text,                                 -- pourquoi, en deux phrases
  apercu jsonb not null default '{}'::jsonb,   -- { texte, image, lien, destinataire… } : ce qui partira EXACTEMENT
  risque text not null default 'normal' check (risque in ('faible', 'normal', 'eleve')),
  cout_estime numeric,                         -- en euros, si l'action coûte
  urgence boolean not null default false,
  statut text not null default 'a_valider'
    check (statut in ('a_valider', 'validee', 'refusee', 'a_modifier', 'executee', 'echec', 'expiree', 'annulee')),
  commentaire text,                            -- consigne d'Hippolyte (« Modifier : … »)
  cle text unique,                             -- anti-doublon : un agent ne redemande pas la même chose
  cree_le timestamptz not null default now(),
  expire_le timestamptz,                       -- au-delà, la demande n'est plus exécutable
  decide_le timestamptz,
  decide_par text check (decide_par in ('whatsapp', 'qg')),
  execute_le timestamptz,
  resultat jsonb,
  whatsapp_envoye_le timestamptz,
  whatsapp_message_id text,
  whatsapp_erreur text
);
create index if not exists qg_demandes_statut on public.qg_demandes (statut, cree_le desc);
create index if not exists qg_demandes_a_envoyer on public.qg_demandes (cree_le) where statut = 'a_valider' and whatsapp_envoye_le is null;

create table if not exists public.qg_activite (
  id bigserial primary key,
  le timestamptz not null default now(),
  societe text not null default 'lpcs',
  equipe text,
  agent text,
  genre text not null default 'info' check (genre in ('info', 'succes', 'attention', 'panne', 'decision')),
  message text not null,
  lien text,
  demande uuid references public.qg_demandes(id) on delete set null
);
create index if not exists qg_activite_le on public.qg_activite (le desc);

-- Petit état du co-CEO : dernier message reçu (fenêtre de 24 h de WhatsApp),
-- demande en attente d'une consigne « Modifier », récap envoyé…
create table if not exists public.qg_etat (
  cle text primary key,
  valeur jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now()
);

alter table public.qg_agents enable row level security;
alter table public.qg_demandes enable row level security;
alter table public.qg_activite enable row level security;
alter table public.qg_etat enable row level security;

drop policy if exists qg_agents_admin on public.qg_agents;
create policy qg_agents_admin on public.qg_agents for select to authenticated using (public.est_administrateur());
drop policy if exists qg_demandes_admin on public.qg_demandes;
create policy qg_demandes_admin on public.qg_demandes for select to authenticated using (public.est_administrateur());
drop policy if exists qg_activite_admin on public.qg_activite;
create policy qg_activite_admin on public.qg_activite for select to authenticated using (public.est_administrateur());
-- qg_etat : aucune politique, donc illisible hors clé de service.

-- La décision depuis l'application QG passe par cette fonction (et non par une
-- écriture directe) : seul l'administrateur décide, et seulement une demande en attente.
create or replace function public.qg_decider(p_id uuid, p_decision text, p_commentaire text default null)
returns public.qg_demandes language plpgsql security definer set search_path = public as $$
declare d public.qg_demandes;
begin
  if not public.est_administrateur() then raise exception 'réservé à l''administrateur'; end if;
  if p_decision not in ('validee', 'refusee', 'a_modifier') then raise exception 'décision inconnue : %', p_decision; end if;
  update qg_demandes set statut = p_decision, decide_le = now(), decide_par = 'qg',
    commentaire = coalesce(nullif(trim(p_commentaire), ''), commentaire)
  where id = p_id and statut in ('a_valider', 'a_modifier')
  returning * into d;
  if d.id is null then raise exception 'demande introuvable ou déjà décidée'; end if;
  insert into qg_activite (societe, equipe, agent, genre, message, demande)
  values (d.societe, d.equipe, d.agent, 'decision',
    case p_decision when 'validee' then 'Validé' when 'refusee' then 'Refusé' else 'À modifier' end || ' depuis le QG : ' || d.titre, d.id);
  return d;
end $$;
grant execute on function public.qg_decider(uuid, text, text) to authenticated;

-- Le QG se met à jour en direct (nouvelle demande, décision prise sur WhatsApp) : les lignes ne
-- sont diffusées qu'à qui peut les lire (RLS ci-dessus), donc à l'administrateur seul.
do $$ begin
  alter publication supabase_realtime add table public.qg_demandes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.qg_activite;
exception when duplicate_object then null; end $$;

-- Le co-CEO passe chaque minute : il envoie sur WhatsApp les demandes pas encore
-- envoyées et, le soir, le récap de la journée. Jeton dans le coffre :
--   select vault.create_secret('<jeton>', 'qg_token');   (= secret QG_TOKEN de la fonction)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('qg-co-ceo') where exists (select 1 from cron.job where jobname = 'qg-co-ceo');
select cron.schedule('qg-co-ceo', '* * * * *', $$
  select net.http_post(
    url := 'https://rsudvwqgjesswmssqcvi.supabase.co/functions/v1/qg?action=passage',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-qg-token', (select decrypted_secret from vault.decrypted_secrets where name = 'qg_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  -- Rien à faire s'il n'y a ni demande à envoyer ni récap dû : on n'appelle même pas la fonction.
  where exists (select 1 from public.qg_demandes where statut = 'a_valider' and whatsapp_envoye_le is null)
     or extract(minute from now() at time zone 'Europe/Paris') = 0;
$$);
