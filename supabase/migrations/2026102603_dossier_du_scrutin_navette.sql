-- Le dossier d'un vote, pour afficher son analyse approfondie.
--
-- legislative_scrutins ne garde que les votes rattachés aux étapes d'un dossier,
-- surtout des amendements : le vote final « sur l'ensemble » y manque souvent.
-- Un abonné qui ouvrait un texte adopté voyait alors le résumé court au lieu de
-- l'analyse, faute de dossier. scrutin_navette relie chacun de ces votes finaux à
-- son dossier (celui de l'étape la plus avancée) : on s'y rabat.
create or replace function public.public_dossier_du_scrutin(p_scrutin text)
returns uuid
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(
    (select dossier_id from public.legislative_scrutins where official_id = p_scrutin and dossier_id is not null limit 1),
    (select dossier_id from public.scrutin_navette where scrutin_id = p_scrutin and dossier_id is not null limit 1)
  );
$$;
