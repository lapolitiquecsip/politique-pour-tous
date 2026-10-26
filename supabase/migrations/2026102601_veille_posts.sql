-- ─────────────────────────────────────────────────────────────────────────────
-- Veille « idées de post » : l'agent qui repère sur le site chaque info qui
-- mérite un post Instagram ou LinkedIn et l'envoie par e-mail à l'équipe, avec
-- de quoi l'écrire (faits sourcés, angles, carrousel, texte LinkedIn).
--
-- Écrites par la fonction Edge `veille-posts`, jamais par le navigateur : aucune
-- politique RLS, seule la clé de service y accède.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.veille_posts (
  -- Identifiant stable de l'info : « loi:<id> », « petition:<id>:500000 »… Une
  -- info déjà vue n'est ni re-notée ni renvoyée.
  cle text primary key,
  source text not null,
  titre text not null,
  url text,
  lien_site text,
  date_objet timestamptz,
  -- Les faits tels que le site les a : seule matière autorisée pour le brouillon.
  faits text,
  -- 1 à 5 : 5 = événement majeur, 4 = mérite un post, en dessous = ignoré.
  importance smallint,
  raison text,
  -- Note fixée par une règle (loi promulguée, seuil de pétition…) ou par l'IA.
  methode text,
  brief jsonb,
  chiffres_a_verifier text[],
  -- a_noter → ignore | a_envoyer → envoye | echec | perime
  statut text not null default 'a_noter',
  tentatives int not null default 0,
  erreur text,
  detecte_le timestamptz not null default now(),
  envoye_le timestamptz
);

create index if not exists veille_posts_statut_idx on public.veille_posts (statut, detecte_le);
create index if not exists veille_posts_envoye_idx on public.veille_posts (envoye_le desc);

-- Curseur de lecture et instantané par source (signatures des pétitions,
-- propositions déjà connues, valeur des indicateurs…), plus le verrou d'exécution.
create table if not exists public.veille_posts_etat (
  source text primary key,
  curseur timestamptz,
  instantane jsonb,
  maj_le timestamptz not null default now()
);

alter table public.veille_posts enable row level security;
alter table public.veille_posts_etat enable row level security;
