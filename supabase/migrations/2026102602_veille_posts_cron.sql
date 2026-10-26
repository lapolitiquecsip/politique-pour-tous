-- ─────────────────────────────────────────────────────────────────────────────
-- Veille « idées de post » : un passage toutes les quinze minutes.
--
-- Les crons GitHub partent avec des heures de retard ; pg_cron, lui, tourne dans
-- la base, à l'heure. Il appelle la fonction Edge `veille-posts` avec le jeton
-- rangé dans le coffre (vault) sous le nom « veille_posts_token » — créé à part,
-- jamais écrit dans le dépôt :
--   select vault.create_secret('<jeton>', 'veille_posts_token');
-- Le même jeton est le secret VEILLE_POSTS_TOKEN de la fonction.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('veille-posts') where exists (select 1 from cron.job where jobname = 'veille-posts');

select cron.schedule('veille-posts', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://rsudvwqgjesswmssqcvi.supabase.co/functions/v1/veille-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-veille-token', (select decrypted_secret from vault.decrypted_secrets where name = 'veille_posts_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$$);

-- Les réponses de pg_net s'accumulent dans net._http_response ; pg_net les purge
-- seul au bout de six heures. Rien à faire de plus.
