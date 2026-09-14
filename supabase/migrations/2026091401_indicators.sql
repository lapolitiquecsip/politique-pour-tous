-- ─────────────────────────────────────────────────────────────────────────────
-- Indicateurs officiels de l'onglet « Enjeux » — mis à jour automatiquement.
--
-- Une ligne = un chiffre suivi (chômage, dette, inflation…), avec sa valeur
-- courante, son historique, sa source et LA DATE À LAQUELLE L'INSTITUTION L'A
-- PUBLIÉ. Cette dernière est ce qui permet d'afficher « mis à jour le … » sans
-- mentir : elle vient du champ LAST_UPDATE de la source, pas de notre cron.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.indicators (
  -- Identifiant stable, choisi par nous : « eco_chomage », « eco_dette »…
  code text primary key,
  theme text not null,
  label text not null,
  -- Précision affichée sous le chiffre (« après 7,9 % au trimestre précédent »).
  sub text,
  value numeric,
  unit text,
  -- Période de la donnée, brute ('2026-Q2') et lisible ('T2 2026').
  period text,
  period_label text,
  -- Historique complet pour la courbe : [{ period, value }], du plus ancien au plus récent.
  history jsonb,
  source text not null,
  source_url text,
  -- Identifiant de la série chez le fournisseur (idBank INSEE, code Eurostat…).
  series_id text,
  provider text not null default 'insee',
  -- Date de publication ANNONCÉE PAR LA SOURCE, et non date de notre relevé.
  published_at date,
  -- Sens favorable, pour colorer la tendance. null = neutre.
  better_when text check (better_when in ('up', 'down')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists indicators_theme_idx on public.indicators (theme, sort_order);

-- Lecture publique : ce sont des statistiques officielles, rien de confidentiel.
alter table public.indicators enable row level security;
drop policy if exists "lecture publique" on public.indicators;
create policy "lecture publique" on public.indicators for select using (true);
