# E-mails d'authentification

Les fichiers `*.html` et `sujets.json` sont **générés** par `scripts/build-auth-emails.mjs` :
modifier le script, pas les fichiers.

Ils ne sont pas lus par le site : ils sont poussés vers Supabase Auth, qui les envoie
(via le SMTP Resend) à l'inscription, au mot de passe oublié, au lien de connexion et au
changement d'adresse.

## Mettre à jour

1. `node scripts/build-auth-emails.mjs`
2. Dans un dossier temporaire, un `supabase/config.toml` minimal qui ne déclare QUE les
   modèles (`project_id`, puis pour chaque modèle `[auth.email.template.<nom>]` avec
   `subject` et `content_path`), et une copie des `.html` à côté.
3. `npx supabase config push --project-ref rsudvwqgjesswmssqcvi --workdir <dossier> --yes`

`config push` ne touche que les propriétés déclarées : ne jamais pousser un
`config.toml` complet, il écraserait l'URL du site, les redirections et le SMTP.
