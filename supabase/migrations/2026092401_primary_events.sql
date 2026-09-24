-- ─────────────────────────────────────────────────────────────────────────────
-- Débats et votes des primaires (2027).
--
-- Une ligne = un rendez-vous : un débat télévisé, ou un vote des adhérents. Les
-- deux se suivent de la même façon — on annonce, puis on rend compte — et les
-- séparer en deux tables obligerait à écrire deux fois la même mécanique.
--
-- Le remplissage est HYBRIDE, à dessein :
--   • l'annonce vient d'un fichier tenu à la main (src/lib/data/primaires.json),
--     parce qu'aucune API ne publie « LR débattra le 12 novembre sur LCI » ;
--   • la vidéo, elle, est retrouvée toute seule après coup par recherche YouTube.
-- Voir scripts/update-primary-debates.ts
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.primary_events (
  -- Identifiant lisible, choisi dans le fichier d'annonces : « lr-debat-1 ».
  id text primary key,
  -- Intitulé exact de la primaire, tel qu'il figure dans la colonne `category`
  -- de presidential_candidates : c'est ce qui relie un débat à ses candidats.
  primaire text not null,
  -- « droite », « gauche », « ecologistes »… pour colorer et regrouper.
  camp text,
  -- « debat » ou « vote ».
  type text not null default 'debat' check (type in ('debat', 'vote')),
  titre text not null,
  date_prevue date not null,
  heure text,
  -- Chaîne ou plateforme de diffusion, quand elle est connue.
  diffuseur text,
  -- Slugs des candidats attendus, tels qu'ils figurent dans presidential_candidates.
  participants text[] not null default '{}',
  statut text not null default 'a_venir' check (statut in ('a_venir', 'diffuse', 'annule')),

  -- Retransmission, retrouvée automatiquement une fois le rendez-vous passé.
  video_id text,
  video_url text,
  video_title text,
  video_published_at timestamptz,

  -- Média téléchargeable légitimement, s'il en existe un : c'est la seule voie
  -- vers un résumé écrit. Une vidéo YouTube n'en est pas une — ses conditions
  -- d'utilisation interdisent d'en extraire le son.
  media_url text,
  resume text,
  resume_at timestamptz,

  -- Annonce officielle : communiqué du parti, page de la chaîne.
  source_url text,
  updated_at timestamptz not null default now()
);

create index if not exists primary_events_date_idx on public.primary_events (date_prevue desc);
create index if not exists primary_events_primaire_idx on public.primary_events (primaire, date_prevue desc);

-- Lecture publique : le calendrier et les retransmissions n'ont rien de réservé.
-- Seul le résumé écrit relève de l'offre Pro, et la réserve se fait dans
-- l'interface, comme pour les comptes rendus de commission.
alter table public.primary_events enable row level security;
drop policy if exists "lecture publique" on public.primary_events;
create policy "lecture publique" on public.primary_events for select using (true);
