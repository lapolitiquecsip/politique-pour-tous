-- ─────────────────────────────────────────────────────────────────────────────
-- Les débats et grandes émissions où est intervenu chaque candidat.
--
-- Le fil « Mes candidats suivis » ne montrait que la presse écrite. Un abonné qui
-- suit un candidat veut surtout savoir quand il a débattu, face à qui, et pouvoir
-- le revoir. Deux sources, toutes deux automatiques :
--   — les débats des primaires (primary_events, participants par slug) ;
--   — les débats et face-à-face diffusés par les grandes chaînes et radios,
--     retrouvés chaque jour sur YouTube (scripts/update-candidate-debates.ts).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.candidate_debates (
  candidate_id uuid not null references public.presidential_candidates(id) on delete cascade,
  -- « yt:<id vidéo> » ou « primaire:<id de l'événement> ». Un même débat concerne
  -- souvent plusieurs candidats : la clé est donc le couple (candidat, source).
  source_key text not null,
  -- debat : débat, duel, face-à-face ; emission : grand entretien d'une chaîne ;
  -- primaire : débat officiel d'une primaire.
  kind text not null check (kind in ('debat', 'emission', 'primaire')),
  title text not null,
  broadcaster text,
  date date,
  url text,
  video_id text,
  thumbnail_url text,
  -- Débat de primaire annoncé mais pas encore diffusé.
  a_venir boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (candidate_id, source_key)
);

create index if not exists candidate_debates_recent_idx
  on public.candidate_debates (candidate_id, date desc);

alter table public.candidate_debates enable row level security;
drop policy if exists "lecture publique" on public.candidate_debates;
create policy "lecture publique" on public.candidate_debates for select using (true);
