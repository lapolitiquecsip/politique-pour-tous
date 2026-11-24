-- Vidéo des réunions de commission lue SUR LE SITE (24/11/2026).
-- Les deux assemblées diffusent leurs enregistrements en MP4 ouvert à l'intégration (l'Assemblée
-- propose elle-même le code d'intégration ; Access-Control-Allow-Origin: *). On garde l'adresse du
-- fichier et l'instant où commence la réunion dans ce fichier (le Sénat filme avant l'ouverture, et
-- une vidéo couvre parfois plusieurs points de l'ordre du jour).
alter table public.commission_reports
  add column if not exists video_mp4 text,
  add column if not exists video_debut real,
  add column if not exists video_verifie_at timestamptz;

comment on column public.commission_reports.video_mp4 is 'Fichier MP4 officiel de la réunion (Vodalys AN / videos.senat.fr), lu par le lecteur du site.';
comment on column public.commission_reports.video_debut is 'Instant (s) du début de la réunion dans le fichier MP4.';
comment on column public.commission_reports.video_verifie_at is 'Dernière recherche du fichier vidéo (scripts/videos-commissions.ts).';
