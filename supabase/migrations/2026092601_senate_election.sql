-- ─────────────────────────────────────────────────────────────────────────────
-- Renouvellement du Sénat — le scrutin du 27 septembre 2026.
--
-- La source est le site officiel du Sénat consacré à ce scrutin
-- (senatoriales2026.senat.fr), qui expose l'index de ses circonscriptions en
-- JSON et publie, page par page, les élus avec leur nuance politique — nuances
-- attribuées par le ministère de l'Intérieur — et la mention « (sortant) »
-- pour les sénateurs reconduits.
--
-- C'est cette mention qui simplifie tout : savoir qui est réélu ne demande plus
-- de comparer deux états du Sénat, la source le dit elle-même. Une première
-- version de ce fichier prévoyait donc une table « baseline » figée avant le
-- vote ; elle est devenue inutile, et avec elle la course contre la montre du
-- dimanche soir.
--
-- Le fichier est écrit par scripts/update-senate-election.ts. Rien à saisir à
-- la main : les résultats encore en attente (second tour, contentieux) entrent
-- d'eux-mêmes au passage suivant.
-- ─────────────────────────────────────────────────────────────────────────────

-- Une ligne par siège pourvu.
create table if not exists public.senate_election_results (
  election_date date not null,
  -- Code de la circonscription : 01…95, 2A, 2B, 971…978, 986…988, et « ZZ »
  -- pour les Français établis hors de France, qui renouvellent six des douze
  -- sièges à chaque scrutin.
  dept_code text not null,
  constituency text not null,
  -- Le nom tel que le Sénat le publie (patronyme en capitales), et sa coupe en
  -- prénom / nom pour l'affichage et le rapprochement avec les fiches du site.
  full_name text not null,
  first_name text,
  last_name text,
  -- Renseignés dès que l'élu a une fiche sur le site. Pour les nouveaux, cela
  -- n'arrive qu'à la prise de fonctions, quand le Sénat les inscrit à son open
  -- data : la fiche est alors créée comme celle de n'importe quel sénateur.
  slug text,
  photo_url text,
  senate_matricule text,
  -- Nuance politique du ministère de l'Intérieur, et la couleur que le Sénat
  -- lui associe : reprendre la sienne évite d'inventer un code couleur qui
  -- contredirait la source sur la même information.
  nuance text,
  nuance_color text,
  -- « reelu » si le Sénat le note sortant, « nouveau » sinon.
  outcome text not null check (outcome in ('reelu', 'nouveau')),
  -- Contexte de la circonscription, répété sur chaque ligne pour éviter une
  -- seconde table qu'il faudrait joindre pour trois entiers.
  seats integer,
  electors integer,
  ballot text check (ballot in ('proportionnel', 'majoritaire')),
  source_url text,
  updated_at timestamptz not null default now(),
  primary key (election_date, dept_code, full_name)
);

create index if not exists senate_results_dept_idx
  on public.senate_election_results (election_date, dept_code);

-- Où en est le scrutin, en une ligne. La page lit celle-ci d'abord et ne
-- demande le détail que si le résultat existe.
create table if not exists public.senate_election_status (
  election_date date primary key,
  -- « avant » : le scrutin n'a pas eu lieu ; « attente » : il a eu lieu mais
  -- aucun résultat n'est encore publié ; « resultats » : les élus sont connus,
  -- même si quelques sièges restent en attente.
  phase text not null check (phase in ('avant', 'attente', 'resultats')),
  constituencies_total integer,
  seats_total integer,
  -- Sièges dont le titulaire est connu. L'écart avec seats_total est réel et
  -- doit se voir : au lendemain du scrutin il manquait la Polynésie française
  -- et un siège de Guyane.
  seats_known integer,
  new_count integer,
  reelected_count integer,
  -- [{ code, label, seats, known }] — les circonscriptions renouvelées, telles
  -- que le Sénat les liste. Aucune règle de série n'est écrite en dur nulle part.
  renewable jsonb,
  -- { « Divers droite »: 46, … } : les nuances des élus, avec leur couleur.
  nuances jsonb,
  -- Groupes du Sénat avant le renouvellement, relevés dans l'open data tant
  -- qu'il décrit encore l'ancienne assemblée. Sert au solde par groupe une fois
  -- les nouveaux sénateurs inscrits ; absent, la page s'en passe.
  groups_before jsonb,
  groups_after jsonb,
  source text,
  source_url text,
  updated_at timestamptz not null default now()
);

-- Lecture publique : un résultat d'élection l'est par nature. L'écriture passe
-- par la clé de service du cron, jamais par le navigateur.
alter table public.senate_election_results enable row level security;
drop policy if exists "lecture publique" on public.senate_election_results;
create policy "lecture publique" on public.senate_election_results for select using (true);

alter table public.senate_election_status enable row level security;
drop policy if exists "lecture publique" on public.senate_election_status;
create policy "lecture publique" on public.senate_election_status for select using (true);
