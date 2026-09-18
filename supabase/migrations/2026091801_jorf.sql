-- ─────────────────────────────────────────────────────────────────────────────
-- Journal officiel du jour — réservé aux abonnés Pro.
--
-- Une ligne = une édition du JO « Lois et Décrets », c'est-à-dire une journée.
-- Le sommaire complet est stocké tel que la DILA le publie : rubriques, puis
-- sous-rubriques et ministères, puis les textes. On ne conserve pas le texte
-- intégral des actes — il pèse plusieurs mégaoctets par jour et Légifrance le
-- sert déjà : chaque entrée porte son identifiant, qui suffit à y renvoyer.
--
-- Source : flux OPENDATA de la DILA (echanges.dila.gouv.fr), livré deux fois par
-- jour. Légifrance refuse le scrapage (403) ; ce flux est la voie officielle.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.jorf_editions (
  -- Date de publication du JO : une édition par jour, c'est la clé naturelle.
  date date primary key,
  -- Numéro de l'édition dans l'année (« 0218 ») et intitulé officiel complet.
  num text not null,
  title text not null,
  -- Adresse ELI de l'édition chez Légifrance.
  eli_url text,
  -- Nombre total de textes publiés ce jour-là.
  text_count integer not null default 0,
  -- Répartition par nature : { "loi": 1, "decret": 3, "arrete": 61, … }
  counts jsonb,
  -- Sommaire complet : [{ titre, groupes: [{ titre, textes: [{ id, titre, nature }] }] }]
  sections jsonb,
  -- Résumé du jour, généré après coup. Reste nul tant qu'il n'a pas été produit :
  -- le sommaire, lui, est disponible dès l'ingestion.
  digest text,
  digest_at timestamptz,
  -- Fichier DILA d'où provient l'édition, et l'heure à laquelle il a été déposé.
  -- Sert à ne pas retélécharger ce qui a déjà été lu.
  source_file text,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists jorf_editions_date_idx on public.jorf_editions (date desc);

-- Lecture publique au niveau de la base : le Journal officiel EST public par
-- définition, et Légifrance le diffuse librement. Ce qui est réservé aux abonnés
-- Pro, c'est la mise en forme et le résumé quotidien — la réserve se fait donc
-- dans l'interface, comme pour les comptes rendus de commission.
alter table public.jorf_editions enable row level security;
drop policy if exists "lecture publique" on public.jorf_editions;
create policy "lecture publique" on public.jorf_editions for select using (true);
