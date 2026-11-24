-- QG : chaque agent rangé dans son service (Parlement & lois, Votes…) et son portrait.
-- `source` dit où lire son état : « github:<dépôt>:<fichier.yml> », « cycle:<script> »,
-- « fonction:<nom> », « coffre:<fiche> » — relu par la tâche qui tient l'organigramme à jour.
alter table public.qg_agents
  add column if not exists service text,
  add column if not exists service_nom text,
  add column if not exists metier text,
  add column if not exists avatar text,
  add column if not exists source text,
  add column if not exists ordre int not null default 0;
