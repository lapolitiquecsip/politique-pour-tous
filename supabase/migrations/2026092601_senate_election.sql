-- ─────────────────────────────────────────────────────────────────────────────
-- Renouvellement du Sénat — avant, pendant, après.
--
-- Les sénatoriales ne se dépouillent pas comme une présidentielle : il n'existe
-- aucun flux officiel de voix en temps réel. Ce qui fait foi, et ce qui compte
-- pour le lecteur, c'est la LISTE DES ÉLUS — publiée par le Sénat lui-même dans
-- son open data (ODSEN_GENERAL.csv), mise à jour dès que les nouveaux mandats
-- commencent. Le résultat est donc calculé par DIFFÉRENCE entre deux états de
-- cette liste : celui de la veille du scrutin, et celui d'après.
--
-- D'où les trois tables :
--   · baseline  — le Sénat figé avant le vote (qui siège, où, dans quel groupe,
--                 et quels sièges sont remis en jeu) ;
--   · results   — le Sénat d'après, siège par siège, avec réélu / nouveau ;
--   · status    — l'état d'avancement, en une ligne, pour que la page sache
--                 quoi afficher sans lire les deux autres tables.
--
-- Écrites par scripts/update-senate-election.ts. Aucune saisie à la main : le
-- soir du scrutin, personne n'aura à toucher au site.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. L'état d'avant ────────────────────────────────────────────────────────
-- Photographie prise AVANT le scrutin, et plus jamais retouchée ensuite : c'est
-- elle qui permet de dire « réélu » ou « nouveau », et de mesurer ce que chaque
-- groupe gagne ou perd. Le script refuse de l'écrire une fois le scrutin passé,
-- pour qu'un rattrapage tardif ne vienne pas la remplacer par le résultat.
create table if not exists public.senate_election_baseline (
  election_date date not null,
  -- Matricule Sénat (« 19826F ») : identifiant stable, contrairement au nom.
  matricule text not null,
  first_name text,
  last_name text,
  -- Libellé ODSEN de la circonscription (« Seine-Maritime », « Guyane »).
  constituency text not null,
  -- Code résolu : 01…95, 2A, 2B, 971…978, 986…988, et 099 pour les Français
  -- établis hors de France. C'est lui qui relie un siège au fond de carte.
  dept_code text,
  political_group text,
  -- Ce siège est-il remis en jeu à ce scrutin ? (série concernée)
  renewable boolean not null default false,
  captured_at timestamptz not null default now(),
  primary key (election_date, matricule)
);

create index if not exists senate_baseline_renewable_idx
  on public.senate_election_baseline (election_date, renewable);

-- ── 2. L'état d'après ────────────────────────────────────────────────────────
-- Un siège renouvelé = une ligne. Réécrite à chaque passage tant que la liste
-- du Sénat bouge (les proclamations et les recours s'étalent sur plusieurs
-- jours), puis stable.
create table if not exists public.senate_election_results (
  election_date date not null,
  matricule text not null,
  first_name text,
  last_name text,
  -- Renseigné quand l'élu a déjà sa fiche sur le site, pour pouvoir y renvoyer.
  slug text,
  photo_url text,
  constituency text not null,
  dept_code text,
  political_group text,
  -- « reelu » si le matricule siégeait déjà la veille, « nouveau » sinon.
  outcome text not null check (outcome in ('reelu', 'nouveau')),
  -- Nombre de sièges de la circonscription, pour afficher « 3 sièges sur 3 ».
  seats integer,
  updated_at timestamptz not null default now(),
  primary key (election_date, matricule)
);

create index if not exists senate_results_dept_idx
  on public.senate_election_results (election_date, dept_code);

-- ── 3. Où en est-on ? ────────────────────────────────────────────────────────
-- Une seule ligne par scrutin. La page lit celle-ci en premier et n'appelle le
-- reste que si la phase le justifie.
create table if not exists public.senate_election_status (
  election_date date primary key,
  -- « avant »      : le scrutin n'a pas eu lieu ;
  -- « attente »    : il a eu lieu, le Sénat n'a pas encore publié la nouvelle
  --                  liste officielle (les mandats commencent le 1er octobre) ;
  -- « resultats »  : la liste a changé, les élus sont connus.
  phase text not null check (phase in ('avant', 'attente', 'resultats')),
  -- Circonscriptions et sièges remis en jeu.
  constituencies_total integer,
  seats_total integer,
  -- Sièges dont le titulaire est confirmé dans la nouvelle liste officielle.
  seats_confirmed integer,
  -- [{ code, label, seats }] — les circonscriptions qui votent. La page s'en
  -- sert pour colorer la carte et pour répondre « votre département vote-t-il ».
  -- Cette liste vient des données du Sénat, elle n'est pas écrite en dur.
  renewable jsonb,
  -- { « Les Républicains »: 131, … } sur l'ensemble du Sénat, avant et après.
  groups_before jsonb,
  groups_after jsonb,
  -- Empreinte de la liste ODSEN : tant qu'elle ne bouge pas, rien à réécrire.
  roster_hash text,
  source text,
  updated_at timestamptz not null default now()
);

-- ── Lecture publique ─────────────────────────────────────────────────────────
-- Un résultat d'élection est public par nature. L'écriture passe par la clé de
-- service du cron, jamais par le navigateur.
alter table public.senate_election_baseline enable row level security;
drop policy if exists "lecture publique" on public.senate_election_baseline;
create policy "lecture publique" on public.senate_election_baseline for select using (true);

alter table public.senate_election_results enable row level security;
drop policy if exists "lecture publique" on public.senate_election_results;
create policy "lecture publique" on public.senate_election_results for select using (true);

alter table public.senate_election_status enable row level security;
drop policy if exists "lecture publique" on public.senate_election_status;
create policy "lecture publique" on public.senate_election_status for select using (true);
