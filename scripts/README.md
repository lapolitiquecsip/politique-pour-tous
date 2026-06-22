# Scraper d'Images pour le Tableau de Bord Exécutif

Ce script permet d'automatiser la récupération des portraits des ministres depuis Wikipédia et de les héberger sur votre propre stockage Supabase pour éviter les blocages de sécurité.

## Installation

1. Assurez-vous d'avoir les variables suivantes dans votre fichier `.env` à la racine du projet :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Installez les dépendances du script :
   ```bash
   cd scripts
   npm install
   ```

## Utilisation

Pour lancer le scraping et l'upload :
```bash
npm run scrape
```

## Fonctionnement
- Le script lit le fichier `src/lib/data/ministersBios.json`.
- Il télécharge les images Wikipédia avec des headers simulant un navigateur pour éviter les erreurs 403/429.
- Il upload les images sur le bucket Supabase `ministres-photos`.
- Il remplace les URLs Wikipédia par les URLs Supabase directement dans le fichier JSON.
