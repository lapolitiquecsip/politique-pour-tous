# Abonnement Pro — mise en service

L'offre Pro (24,99 €/mois) ajoute deux outils de veille : le **suivi des commissions
parlementaires** (Assemblée + Sénat) et la **veille réseaux sociaux des candidats**.
Mise en service faite le 2026-09-13, en mode Stripe TEST. Ce document retrace la
configuration et décrit ce qu'il reste à faire pour ouvrir la vente réelle.

**Reste à faire :** basculer Stripe en mode Live (§ 2), puis pousser le code sur `main`
— toute poussée déploie le site public, donc publier avec des liens de test reviendrait
à offrir des abonnements Pro à tout visiteur.

## 1. Migration de base de données — FAITE le 2026-09-13

Appliquée sur le projet `rsudvwqgjesswmssqcvi`. Pour mémoire,
`supabase/migrations/2026091301_pro_tier.sql` :

- ajoute `profiles.subscription_tier` (`free` / `elite` / `pro`) et bascule les membres
  premium existants en `elite` — personne ne perd son accès ;
- étend `commission_reports` (`chamber`, `analysis`, `speakers`, `topics`…) ;
- crée `candidate_social_accounts` et `candidate_social_snapshots`.

Tant qu'elle n'est pas appliquée, le site fonctionne : le hook d'abonnement et les
requêtes de commissions retombent sur l'ancien schéma. Simplement, personne ne peut
être « pro » et les nouvelles sections restent vides.

## 2. Produits Stripe — FAITS (mode TEST)

Les trois liens de paiement sont créés et intégrés dans `src/lib/constants.ts` :

| Formule | Périodicité | Lien |
|---|---|---|
| Elite | 3,99 €/mois | `test_dRmaEWfLW6443jdeOofMA02` |
| Pro | 24,99 €/mois | `test_fZu4gy7fqdww1b55dOfMA00` |
| Pro | 239 €/an | `test_6oU7sKfLW5003jd6hSfMA01` |

L'offre Elite est **mensuelle uniquement** : la clé `annually` est absente de
`STRIPE_LINKS.elite`, et c'est cette absence qui retire la bascule de la carte Elite.
Seule la carte Pro propose le choix mensuel/annuel.

⚠️ **Ces liens sont en mode TEST** (préfixe `test_`) : aucun paiement réel n'est
encaissé. Pour ouvrir la vente, recréer les trois liens en mode Live dans Stripe et
remplacer les URL — rien d'autre à changer dans le code.

Le webhook distingue les formules par le montant payé (seuil à 15 € : Elite = 3,99 €,
Pro = 24,99 € ou 239 €). Pour être indépendant du prix, renseigner le secret
`STRIPE_PRICE_PRO` avec les identifiants de prix Pro séparés par des virgules.

## 2 bis. Webhook — FAIT (à refaire à chaque modification)

La fonction déployée écrit `subscription_tier`, et l'endpoint webhook a été créé côté
Stripe en mode Test (événement `checkout.session.completed`) avec son secret de signature
reporté dans `STRIPE_WEBHOOK_SECRET`. Achat de test validé de bout en bout.

⚠️ **Les endpoints webhook sont séparés entre mode Test et mode Live.** En passant en
Live, il faudra recréer l'endpoint ET reporter le nouveau `whsec_` :

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref rsudvwqgjesswmssqcvi
npx supabase functions deploy stripe-webhook --project-ref rsudvwqgjesswmssqcvi --no-verify-jwt --use-api
```

Après toute modification de la fonction, la redéployer ainsi :

```bash
cd ~/Desktop/politique-pour-tous
npx supabase login                       # ouvre le navigateur, une seule fois
npx supabase functions deploy stripe-webhook --project-ref rsudvwqgjesswmssqcvi --no-verify-jwt
```

⚠️ **`--no-verify-jwt` est indispensable.** Stripe n'envoie pas de jeton Supabase : sans
ce drapeau, la fonction répondrait 401 à Stripe et **plus aucun abonnement ne serait
activé**. La version en ligne aujourd'hui est déployée ainsi (vérifié : un POST sans
en-tête d'autorisation atteint bien le code de la fonction).

Vérification après déploiement — doit répondre `400 Pas de signature` :

```bash
curl -i -X POST https://rsudvwqgjesswmssqcvi.supabase.co/functions/v1/stripe-webhook
```

Une réponse `401` signifie que le drapeau a été oublié : redéployer avec.

## 3. Secrets GitHub — FAITS

| Secret | Rôle | Statut |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | base | présent |
| `SUPABASE_SERVICE_ROLE_KEY` | écriture | présent |
| `ANTHROPIC_API_KEY` | analyses de commission | présent |
| `YOUTUBE_API_KEY` | veille YouTube | présent (créé le 2026-09-13) |

`YOUTUBE_API_KEY` est gratuite : console.cloud.google.com → activer *YouTube Data API
v3* → *Créer des identifiants* → clé d'API. Quota 10 000 requêtes/jour, la veille en
consomme moins de dix. Sans elle, aucune donnée YouTube n'est relevée — donc **aucune
vue**, qui est la métrique principale de la fonctionnalité.

## 4. Premiers remplissages — FAITS le 2026-09-13

Lancés en local. État obtenu :

- **commissions** : 514 réunions Assemblée (backend) + **103 Sénat** (12 semaines) ;
- **réseaux sociaux** : 51 comptes injectés, 51 relevés au premier passage, 0 échec.

Commandes, pour mémoire :

```bash
# Rattrapage Sénat (ingestion seule, gratuite)
npx tsx scripts/update-commissions.ts --weeks=52 --skip-analysis
# --refresh en plus pour relire des pages déjà connues (après correction du parseur) ;
# summary et analysis ne sont jamais écrasés.

# Analyses détaillées, par paquets (appelle l'API Anthropic — voir le coût plus bas)
npx tsx scripts/update-commissions.ts --skip-scrape --analyses=25

# Comptes réseaux sociaux : vérification puis injection
npx tsx scripts/verify-candidate-socials.ts
npx tsx scripts/update-social-stats.ts --seed
```

En local, ces scripts ont besoin de `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY` et
`ANTHROPIC_API_KEY` dans `.env.local` (fichier ignoré par git), chargés par
`set -a && . ./.env.local && set +a`. En CI, les secrets GitHub suffisent.

Ensuite, les deux crons GitHub prennent le relais tous les jours
(`update-commissions.yml` à 5 h 20, `update-social-stats.yml` à 6 h 40).

**Les tendances réseaux sociaux n'apparaissent qu'au bout de deux jours de relevés**, et
les variations sur 30 jours au bout d'un mois : une tendance est une différence entre
deux relevés, jamais une valeur stockée.

## 5. Coût des analyses de commission

Chaque analyse lit le compte rendu intégral (souvent 50 000 à 90 000 caractères, soit
15 000 à 25 000 jetons) et appelle `claude-opus-5`. Compter environ **0,10 à 0,15 € par
réunion analysée**. Le cron est plafonné à 10 analyses par nuit (~1 €/nuit) ; le
rattrapage initial de l'historique se règle avec `--analyses=N`, à doser selon le budget.

Pour réduire la note, baisser l'effort ou changer de modèle dans
`scripts/update-commissions.ts` (constante du bloc `anthropic.messages.stream`).

## 6. Fragilité assumée des sources réseaux sociaux

| Plateforme | Source | Solidité |
|---|---|---|
| YouTube | API officielle Data v3 | stable — seule source donnant les **vues cumulées** |
| Bluesky | API publique AT Protocol | stable, sans clé |
| TikTok | page publique du profil | fonctionne, mais dépend du gabarit de page |
| Instagram | endpoint web public | souvent bloqué depuis un runner CI (429) |
| X | — | plus aucune source gratuite depuis la fermeture de l'API |

Chaque relevé porte son propre statut (`ok` / `stale` / `unavailable`). Quand une source
casse, l'interface affiche « source indisponible » et **jamais** un chiffre périmé
présenté comme frais. C'est le point non négociable d'un produit vendu à des
professionnels : ils doivent pouvoir distinguer « pas de donnée » de « zéro ».

Pour couvrir X, TikTok et Instagram de façon garantie, il faut un fournisseur payant
(Social Blade Business API, Favikon, Modash). Le branchement se fait dans
`scripts/update-social-stats.ts`, un adaptateur par plateforme — `readX()` est déjà
isolée et prête à être remplacée.

## 7. Ajouter ou corriger un compte suivi

`src/lib/data/candidate-socials.json` est la liste de référence. Elle se régénère avec
`scripts/verify-candidate-socials.ts`, qui n'accepte un compte que si la page interrogée
confirme le nom **et** que le compte est certifié ou dépasse 5 000 abonnés — sans quoi on
publierait des comptes usurpateurs, qui recopient les noms à l'identique.

Quand un compte réel n'est pas trouvé (les identifiants du type `@mlp_officiel` ne se
devinent pas), l'ajouter dans la table `HANDLES` en tête du script, puis relancer :

```bash
npx tsx scripts/verify-candidate-socials.ts le-pen   # vérifie un seul candidat
```
