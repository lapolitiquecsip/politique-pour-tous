-- ─────────────────────────────────────────────────────────────────────────────
-- Recherche dans le Journal officiel — un texte par ligne.
--
-- jorf_editions garde le sommaire d'une journée dans une seule colonne JSONB,
-- ce qui est parfait pour afficher une édition et inutilisable pour chercher :
-- un « ilike » sur du JSONB lit la totalité des éditions à chaque frappe, et
-- aucun index ne peut l'aider. Cette table aplatit donc le même sommaire à
-- raison d'une ligne par texte, avec un index plein texte français.
--
-- Elle est DÉRIVÉE, pas maîtresse : scripts/update-jorf.ts la réécrit à chaque
-- passage à partir de jorf_editions.sections. En cas de doute, c'est le
-- sommaire qui fait foi, et relancer le script suffit à les réaccorder.
--
-- Volume attendu : environ 80 textes par jour, soit ~25 000 lignes par an.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.jorf_texts (
  -- Identifiant Légifrance du texte (« JORFTEXT000054888133 »), stable et unique.
  id text primary key,
  -- Édition dans laquelle il a paru.
  edition_date date not null references public.jorf_editions (date) on delete cascade,
  -- Position dans le sommaire : rubrique (« Décrets, arrêtés, circulaires »)
  -- puis groupe (le ministère, ou l'autorité émettrice).
  rubrique text,
  groupe text,
  titre text not null,
  -- « loi », « decret », « arrete », « decision », « avis »… voir natureDe().
  nature text,
  -- Ce que le texte fait, en une phrase.
  explication text,
  -- D'où vient cette phrase : « notice » (note officielle de l'administration),
  -- « ia » (résumé généré), « renvoi » (le JO ne publie qu'un pointeur).
  source_explication text,
  updated_at timestamptz not null default now()
);

create index if not exists jorf_texts_date_idx on public.jorf_texts (edition_date desc);
create index if not exists jorf_texts_nature_idx on public.jorf_texts (nature, edition_date desc);

-- Colonne de recherche, calculée par la base : elle ne peut pas diverger de ce
-- qu'elle indexe. Le dictionnaire « french » apporte la racinisation (chercher
-- « nomination » trouve « nominations ») et ignore les mots vides.
--
-- L'intitulé ET l'explication sont indexés : un professionnel cherche tantôt le
-- libellé officiel, tantôt ce que le texte fait. Le titre pèse plus lourd (A)
-- que l'explication (B), pour qu'une correspondance dans l'intitulé remonte.
alter table public.jorf_texts
  drop column if exists recherche;
alter table public.jorf_texts
  add column recherche tsvector
  generated always as (
    setweight(to_tsvector('french', coalesce(titre, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(explication, '')), 'B')
  ) stored;

create index if not exists jorf_texts_recherche_idx on public.jorf_texts using gin (recherche);

-- Lecture publique, comme jorf_editions : la réserve aux abonnés Pro se fait
-- dans l'interface, au même endroit et de la même façon que pour le sommaire.
alter table public.jorf_texts enable row level security;
drop policy if exists "lecture publique" on public.jorf_texts;
create policy "lecture publique" on public.jorf_texts for select using (true);
