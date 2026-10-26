-- ─────────────────────────────────────────────────────────────────────────────
-- Veille « idées de post » : un seul récapitulatif par jour, à 21 h (Paris).
--
-- Demande de l'équipe : pas d'alertes dans la journée, mais chaque soir toutes les
-- idées de post du jour — et seulement des infos sorties ce jour-là.
--   jour      le jour (heure de Paris) où l'info est sortie : publication, vote, JO…
--   recap_le  quand l'idée est partie dans le récapitulatif
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.veille_posts
  add column if not exists jour date,
  add column if not exists recap_le timestamptz;

update public.veille_posts
  set jour = (coalesce(date_objet, detecte_le) at time zone 'Europe/Paris')::date
  where jour is null;

create index if not exists veille_posts_jour_idx on public.veille_posts (jour, statut);

-- pg_cron compte en UTC : 19 h 05 et 20 h 05 UTC encadrent 21 h à Paris, en hiver
-- comme en été. La fonction n'envoie qu'à 21 h, heure de Paris, et une fois par jour.
select cron.unschedule('veille-posts-recap') where exists (select 1 from cron.job where jobname = 'veille-posts-recap');

select cron.schedule('veille-posts-recap', '5 19,20 * * *', $$
  select net.http_post(
    url := 'https://rsudvwqgjesswmssqcvi.supabase.co/functions/v1/veille-posts?recap=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-veille-token', (select decrypted_secret from vault.decrypted_secrets where name = 'veille_posts_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$$);
