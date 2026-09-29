-- ─────────────────────────────────────────────────────────────────────────────
-- Les fiches pratiques de service-public.gouv.fr, et la réserve Pro du récap.
--
-- POURQUOI CES FICHES
-- « Tout sur un sujet » ne savait dire ni le montant d'une aide, ni l'article de
-- loi qui la fonde : la matière du site (Journal officiel récent, lois votées,
-- débats) dit ce qui CHANGE, jamais ce qui S'APPLIQUE. Or c'est ce que cherche
-- un abonné Pro qui tape « apprentissage » : 5 000 € d'aide, sous quelles
-- conditions, en vertu de quels articles du Code du travail.
--
-- Légifrance refuse toute lecture automatisée (mur Cloudflare, 403). Les fiches
-- de service-public.gouv.fr viennent du même éditeur — la DILA — et sont publiées
-- en données ouvertes, sans clé : chacune expose les montants EN VIGUEUR, tenus
-- à jour par l'administration, et la liste exacte des textes qui la fondent, avec
-- leur lien Légifrance (« Code du travail : articles L6243-1 à L6243-1-2 »,
-- « Décret n° 2026-168 du 6 mars 2026 »).
--
-- Écrite par scripts/update-fiches-pratiques.ts, lue par la fonction Edge
-- topic-brief. Aucune lecture depuis le navigateur.
-- ─────────────────────────────────────────────────────────────────────────────

-- Recherche insensible aux accents. On tape « electricite » ou « pret a taux
-- zero » sans y penser ; la configuration `french` seule ne retrouverait alors
-- aucune fiche, puisque toutes écrivent « électricité » et « prêt à taux zéro ».
create extension if not exists unaccent with schema extensions;

do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'fr_sans_accent') then
    create text search configuration public.fr_sans_accent (copy = pg_catalog.french);
    alter text search configuration public.fr_sans_accent
      alter mapping for hword, hword_part, word with extensions.unaccent, french_stem;
  end if;
end $$;

create table if not exists public.fiches_pratiques (
  -- Identifiant service-public : F23556, F2918…
  id text primary key,
  -- « Fiche d'information », « Fiche Question-réponse », « Fiche Comment faire si »
  type text,
  -- Particuliers, Professionnels, Associations : une même fiche peut servir les trois.
  audiences text[] not null default '{}',
  title text not null,
  description text,
  -- Le fil d'Ariane, « Ressources humaines › Aides à l'embauche › Apprentis » :
  -- il situe la fiche et pèse dans la recherche.
  chemin text,
  -- Le texte intégral, mis à plat en texte balisé légèrement (titres, puces,
  -- tableaux). Les montants y figurent tels que l'administration les publie.
  body text,
  -- Les textes de référence : [{titre, url, complement}]. C'est la liste des
  -- « lois précises » — codes, lois, décrets, arrêtés — avec leur lien Légifrance.
  refs jsonb not null default '[]'::jsonb,
  -- Simulateurs, formulaires et téléservices officiels : [{titre, url, type}].
  services jsonb not null default '[]'::jsonb,
  url text,
  -- Dernière mise à jour, et dernière modification « importante » selon la DILA
  -- (un changement de montant, de condition) : ce qui dit au lecteur que le
  -- chiffre affiché est bien le chiffre actuel.
  modified_at date,
  important_at date,
  -- Empreinte du contenu : la synchro quotidienne n'écrit que ce qui a changé.
  hash text,
  synced_at timestamptz not null default now(),
  recherche tsvector generated always as (
    setweight(to_tsvector('public.fr_sans_accent'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('public.fr_sans_accent'::regconfig, coalesce(description, '') || ' ' || coalesce(chemin, '')), 'B') ||
    setweight(to_tsvector('public.fr_sans_accent'::regconfig, coalesce(body, '')), 'D')
  ) stored
);

create index if not exists fiches_pratiques_recherche_idx
  on public.fiches_pratiques using gin (recherche);

-- Données publiques, mais servies par la fonction Edge seule : aucune politique
-- n'est ouverte, la clé de service passe outre.
alter table public.fiches_pratiques enable row level security;

-- Les fiches les plus pertinentes pour un sujet.
--
-- Une fiche dont le TITRE contient le sujet passe devant une fiche qui ne le cite
-- qu'en passant dans son corps : sans ce bonus, « apprentissage » ramenait en tête
-- les fiches les plus longues, qui le mentionnent vingt fois sans en traiter.
-- Parmi celles-là, `ts_rank_cd` (densité des occurrences, normalisée par la
-- longueur) met devant la fiche de fond — « Contrat d'apprentissage », « Aides à
-- l'embauche » — plutôt que les questions-réponses de trois paragraphes, que le
-- simple `ts_rank` favorisait. Une fiche d'information garde en plus une petite
-- avance sur une question-réponse, plus étroite par nature.
create or replace function public.search_fiches_pratiques(q text, lim int default 8)
returns table (
  id text, type text, audiences text[], title text, description text, chemin text,
  body text, refs jsonb, services jsonb, url text, modified_at date, important_at date,
  score real
)
language sql
stable
set search_path = public, extensions
as $$
  with requete as (select websearch_to_tsquery('public.fr_sans_accent'::regconfig, q) as tq)
  select f.id, f.type, f.audiences, f.title, f.description, f.chemin,
         f.body, f.refs, f.services, f.url, f.modified_at, f.important_at,
         (ts_rank_cd(f.recherche, r.tq, 1)
           + case when to_tsvector('public.fr_sans_accent'::regconfig, f.title) @@ r.tq then 1 else 0 end
           + case when f.type ilike 'Fiche d''information%' then 0.2 else 0 end
         )::real as score
  from public.fiches_pratiques f, requete r
  where f.recherche @@ r.tq
  order by score desc
  limit greatest(1, least(lim, 20));
$$;

revoke all on function public.search_fiches_pratiques(text, int) from public, anon, authenticated;
grant execute on function public.search_fiches_pratiques(text, int) to service_role;

-- ── « Tout sur un sujet » devient une rubrique Pro ───────────────────────────
-- L'outil s'adresse désormais à un usage professionnel (montants en vigueur,
-- textes applicables) : la lecture du cache suit la fonction Edge, qui n'admet
-- plus que le niveau Pro.
drop policy if exists "lecture abonnes" on public.topic_briefs;
drop policy if exists "lecture pro" on public.topic_briefs;
create policy "lecture pro" on public.topic_briefs
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.subscription_tier = 'pro'
    )
  );
