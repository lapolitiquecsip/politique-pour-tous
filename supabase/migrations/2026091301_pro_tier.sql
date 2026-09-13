-- ─────────────────────────────────────────────────────────────────────────────
-- Abonnement PRO (24,99 €) : niveau d'accès, suivi des commissions parlementaires
-- et veille réseaux sociaux des candidats à la présidentielle.
-- À appliquer sur Supabase (SQL editor ou `supabase db push`).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. NIVEAU D'ABONNEMENT ──────────────────────────────────────────────────────
-- On garde is_premium (utilisé partout) et on ajoute le niveau fin à côté.
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'elite', 'pro'));

-- Les membres déjà premium passent en « elite » (personne ne perd son accès).
update public.profiles
   set subscription_tier = 'elite'
 where is_premium is true and subscription_tier = 'free';

-- 2. COMMISSIONS PARLEMENTAIRES ───────────────────────────────────────────────
-- La table commission_reports existe déjà (Assemblée). On l'étend pour accueillir
-- le Sénat et l'analyse détaillée réservée aux abonnés Pro.
alter table public.commission_reports
  add column if not exists chamber text not null default 'AN'
    check (chamber in ('AN', 'SENAT')),
  -- Analyse structurée Pro : { contexte, points_cles[], chiffres[], positions[], suites, citations[] }
  add column if not exists analysis jsonb,
  -- Orateurs relevés dans le compte rendu : [{ name, role, turns }]
  add column if not exists speakers jsonb,
  add column if not exists topics text[],
  add column if not exists word_count integer,
  add column if not exists analyzed_at timestamptz;

create index if not exists commission_reports_chamber_date_idx
  on public.commission_reports (chamber, meeting_date desc);
create index if not exists commission_reports_commission_idx
  on public.commission_reports (commission);

-- 3. COMPTES RÉSEAUX SOCIAUX DES CANDIDATS ────────────────────────────────────
-- Comptes personnels ET comptes de soutien (mouvements, collectifs de campagne).
create table if not exists public.candidate_social_accounts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.presidential_candidates(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'x', 'tiktok', 'instagram', 'bluesky', 'facebook')),
  handle text not null,
  url text,
  -- « official » = compte de la personne ; « support » = compte de soutien / mouvement.
  kind text not null default 'official' check (kind in ('official', 'support')),
  label text,
  -- Identifiant natif de la plateforme (channel id YouTube, DID Bluesky…).
  external_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (candidate_id, platform, handle)
);

create index if not exists candidate_social_accounts_candidate_idx
  on public.candidate_social_accounts (candidate_id);

-- 4. RELEVÉS QUOTIDIENS ───────────────────────────────────────────────────────
-- Un relevé par compte et par jour. Les tendances 7 j / 30 j sont calculées par
-- différence entre deux relevés : on ne stocke jamais une tendance figée.
create table if not exists public.candidate_social_snapshots (
  id bigserial primary key,
  account_id uuid not null references public.candidate_social_accounts(id) on delete cascade,
  captured_on date not null default current_date,
  followers bigint,
  total_views bigint,
  posts bigint,
  -- Vues cumulées des contenus publiés dans les 30 derniers jours (YouTube).
  period_views bigint,
  period_posts integer,
  engagement bigint,
  -- « ok » = chiffre frais ; « stale » = dernier chiffre connu ; « unavailable » =
  -- la source n'a rien rendu. L'interface n'affiche JAMAIS un chiffre en « unavailable ».
  status text not null default 'ok' check (status in ('ok', 'stale', 'unavailable')),
  source text,
  created_at timestamptz not null default now(),
  unique (account_id, captured_on)
);

create index if not exists candidate_social_snapshots_account_date_idx
  on public.candidate_social_snapshots (account_id, captured_on desc);

-- 5. LECTURE PUBLIQUE ─────────────────────────────────────────────────────────
-- Le site lit avec la clé anon ; le filtrage Pro se fait côté applicatif comme
-- pour les résumés premium existants. Les écritures passent par la service role.
alter table public.candidate_social_accounts enable row level security;
alter table public.candidate_social_snapshots enable row level security;

drop policy if exists "lecture publique" on public.candidate_social_accounts;
create policy "lecture publique" on public.candidate_social_accounts
  for select using (true);

drop policy if exists "lecture publique" on public.candidate_social_snapshots;
create policy "lecture publique" on public.candidate_social_snapshots
  for select using (true);
