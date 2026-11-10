# Candidatures

Votre outil personnel, auto-hébergé, pour suivre vos candidatures. Interface française responsive, palette vert sauge, thèmes clair/sombre et graphiques sans service externe. Aucune donnée de démonstration n’est injectée dans votre base.

## Démarrage avec Docker

Prérequis : Docker Engine / Docker Desktop **démarré**, en mode conteneurs Linux, et Docker Compose v2 ou supérieur. Depuis le dossier du projet :

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

Ouvrez **http://localhost:3000**. Le premier build nécessite Internet ; l’application fonctionne ensuite sans service tiers, police distante ou CDN.

```sh
curl http://localhost:3000/api/health
# {"status":"ok"}
docker compose down
# Arrêt des services, SANS suppression de ./data.
```

### Persistance impérative : `./data`

Compose monte **`./data:/app/data`** : c’est un **bind mount relatif au dossier du fichier `docker-compose.yml`**, pas un volume Docker nommé. La base est sur votre machine dans `./data/applications.sqlite`. SQLite peut également créer `applications.sqlite-wal` et `applications.sqlite-shm`.

Le dossier est créé automatiquement s’il n’existe pas. Le petit service `init-data` prépare ses droits (UID/GID 1000, dossier privé `700`) avant le lancement de l’application **non-root**. Sur Docker Desktop, le partage de fichiers doit autoriser ce dossier. Ne remplacez pas ce montage par un chemin système ou un dossier contenant d’autres données : `init-data` ajuste récursivement le propriétaire de ce seul montage.

Reconstruire l’image, redémarrer les conteneurs ou utiliser `docker compose down` ne supprime pas vos candidatures. **Supprimer le dossier `data` les supprime.** Il est exclu de Git et du contexte Docker, comme les secrets, bases et résultats temporaires. Aucun fichier `.env` n’est nécessaire.

### Sécurité / usage personnel

L’application n’a **pas de compte ni d’authentification** : elle est destinée à un utilisateur de confiance. Le port est publié uniquement sur **127.0.0.1**, pas sur tout le réseau. Ne l’exposez pas directement sur Internet. Pour un serveur distant, utilisez par exemple un tunnel SSH :

```sh
ssh -L 3000:127.0.0.1:3000 utilisateur@serveur
```

Pour une publication réseau, ajoutez d’abord un reverse proxy HTTPS avec authentification. Les données personnelles restent en SQLite, sans chiffrement applicatif ; protégez le disque et les sauvegardes. L’API valide les champs, refuse les liens autres que HTTP/HTTPS, utilise des requêtes préparées et refuse les écritures navigateur cross-origin. Le conteneur applicatif a un système de fichiers en lecture seule (hors données et `/tmp`), sans capacités Linux supplémentaires.

## Utilisation

- **Kanban** : À postuler, Candidature envoyée, Entretien prévu, Offre reçue, Refusé. Changez la colonne avec le sélecteur de statut de chaque carte (pas de glisser-déposer). Sur mobile, les colonnes sont empilées pour garder toutes les actions accessibles.
- **Tableau** : vue compacte, changement de statut et mêmes actions ; le tableau défile horizontalement sur petit écran.
- **Ajouter / modifier** : entreprise et poste obligatoires ; lien de l’offre, lieu/télétravail, date de candidature, salaire libre, contact, notes et date de prochaine relance facultatifs.
- **Relances** : dates affichées sur les cartes et dans le tableau, mise en évidence dès le jour prévu. Ce sont des rappels dans l’application, pas des notifications ou e-mails automatiques. Utilisez les notes pour l’historique des échanges.
- **Archiver** masque la candidature de la liste active sans la perdre ; l’onglet Archives permet de la restaurer ou de la supprimer. La suppression définitive demande confirmation.
- Recherche entreprise/poste insensible à la casse, filtre statut, tri par date de candidature (dates absentes en dernier).
- Le bouton lune/soleil mémorise votre thème dans ce navigateur ; le premier thème suit le système.

### Statistiques et graphiques

Les indicateurs portent sur **toutes les candidatures de l’onglet actif ou Archives**, sans dépendre des filtres de recherche.

- **Total** : nombre de candidatures de cet onglet.
- **Taux de réponse** : `(entretiens prévus + offres reçues + refus) / candidatures hors « À postuler » × 100`, arrondi ; 0 si aucune candidature envoyée. C’est une estimation à partir du statut actuel, pas une mesure de l’historique des réponses.
- **Entretiens / refus** : nombres actuellement dans ces statuts.
- **Courbe d’activité** : candidatures datées regroupées par semaine (lundi à dimanche) sur les 8 dernières semaines, semaine courante incluse. Dates absentes et futures ignorées. La date de candidature renseignée fait foi, même si le statut est ensuite modifié.
- **Répartition** : nombres et pourcentages par statut ; les arrondis peuvent ne pas totaliser exactement 100 %.

## Sauvegarde fiable

La méthode simple et cohérente consiste à **arrêter l’application avant de copier l’intégralité du dossier**. Ne copiez pas seulement le fichier `.sqlite` à chaud : des transactions peuvent encore se trouver dans le WAL.

### Linux / macOS / Git Bash

```sh
docker compose stop app
mkdir -p backups
tar -czf backups/candidatures-$(date +%Y%m%d-%H%M%S).tar.gz data
docker compose up -d
```

### Windows PowerShell

```powershell
docker compose stop app
New-Item -ItemType Directory -Force backups | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Compress-Archive -Path ./data -DestinationPath "./backups/candidatures-$stamp.zip"
docker compose up -d
```

Si vous lancez Node sans Docker, arrêtez également `npm start` / `npm run dev` avant la copie. Rangez une copie de l’archive **hors de cette machine**, idéalement chiffrée. `backups/` est ignoré par Git et Docker. Testez régulièrement une restauration.

## Restauration et migration vers une autre machine

1. Sur la source, sauvegardez selon la procédure ci-dessus. Conservez également la version du code (`package-lock.json`, Dockerfile, etc.).
2. Sur la destination, installez Docker et copiez/clônez le code. **Ne démarrez pas encore l’application.**
3. Si une base existe déjà sur la destination, arrêtez `app`, sauvegardez-la puis déplacez son dossier `data` en dehors du projet. Ne fusionnez pas deux dossiers de bases.
4. Extrayez l’archive **à la racine du projet**, pour retrouver exactement `./data/applications.sqlite`, et non `./data/data/applications.sqlite`.

   ```sh
   # Linux/macOS/Git Bash, archive copiée dans backups/ :
   tar -xzf backups/candidatures-AAAAmmjj-HHMMSS.tar.gz
   # PowerShell :
   # Expand-Archive ./backups/candidatures-AAAAmmjj-HHMMSS.zip -DestinationPath .
   ```

5. Démarrez `docker compose up --build -d`. `init-data` remet les droits Linux nécessaires. Vérifiez `/api/health`, les candidatures actives ET les archives, puis effectuez un redémarrage pour confirmer la persistance.
6. Gardez l’ancienne sauvegarde jusqu’à validation. Pour revenir en arrière, arrêtez l’application puis restaurez **ensemble** la sauvegarde et la version de code correspondante.

SQLite est portable entre Windows, Linux et macOS : aucune exportation SQL n’est nécessaire pour ce transfert. Le schéma actuel est **v1** (`PRAGMA user_version`), créé sans effacement au premier démarrage. Il n’existe pas encore de version antérieure à migrer ; toute future évolution du schéma devra ajouter une migration explicite avant de changer cette version. N’ouvrez pas une base d’une version plus récente avec un ancien code sans restauration de sa sauvegarde.

## Développement sans Docker

Prérequis : **Node.js 24+**, qui fournit `node:sqlite` sans module natif supplémentaire.

```sh
npm ci
npm run dev
# Interface : http://localhost:5173 ; API : http://localhost:3000
```

Vite transmet `/api` à Express. Pour le mode production local :

```sh
npm run build
npm start
# http://localhost:3000
```

Variables optionnelles du serveur : `PORT` (3000), `DB_PATH` (`./data/applications.sqlite`). En mode développement, gardez le port API 3000 ou adaptez le proxy dans `vite.config.js`. Le serveur Node écoute sur toutes les interfaces ; pour un accès personnel isolé, préférez Compose et son port limité à localhost.

## Tests et vérifications

```sh
npm ci
npm test                     # API/SQLite + logique métier + interface React
npm run build                # Bundle de production
npm audit                    # Audit des dépendances verrouillées
npx playwright install chromium
npm run test:e2e             # Vrai Chromium : desktop + mobile, build inclus
docker compose config --quiet
# Avec le moteur Docker démarré :
docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/health
```

Les tests API utilisent une base mémoire et des fichiers temporaires isolés. Les tests navigateur démarrent leur propre serveur sur **127.0.0.1:3100**, avec une base temporaire, jamais vos données de `./data`. Ils couvrent création, modification, statut, archives, restauration, suppression, rechargement, recherche, graphiques, thème et absence de débordement horizontal global. Captures clair/sombre pour desktop/mobile dans `test-results/` (non versionné). Ce sont des captures de contrôle du rendu, pas des comparaisons pixel à pixel.

### Recette manuelle réaliste

1. Créer une candidature avec tous les champs ; recharger pour vérifier sa présence.
2. Changer le statut en « Entretien prévu », modifier les notes et vérifier les graphiques.
3. Tester recherche entreprise/poste, filtre, tri puis vue Tableau.
4. Archiver, retrouver dans Archives, restaurer ; tester annulation puis confirmation de suppression.
5. Basculer sombre/clair, recharger, tester sur mobile ou fenêtre étroite.
6. Avec Docker, conserver une candidature de test, exécuter `docker compose down` puis `docker compose up -d` et vérifier qu’elle reste présente ; vérifier également le montage via `docker compose config`.
7. Sauvegarder, restaurer sur une copie isolée du projet et confirmer les données.

### Dépannage

- Erreur `dockerDesktopLinuxEngine` / connexion au daemon : démarrez Docker Desktop en mode Linux et attendez que `docker info` fonctionne.
- Port 3000 déjà pris : arrêtez l’autre programme ou changez seulement le port hôte dans Compose (`127.0.0.1:3001:3000`).
- Base non accessible : vérifiez le partage Docker Desktop, l’espace disque et les droits ; relancez `docker compose up -d` pour exécuter la préparation du dossier.
- Interface vide ou API indisponible : consultez `docker compose logs app` et `/api/health`. Une erreur de chargement est affichée avec un bouton Réessayer.

## Résultats de vérification de cette livraison

Sur Windows avec Node 24, les commandes ont réellement été exécutées :

| Vérification | Résultat |
| --- | --- |
| `npm test` | 22 tests API/SQLite + 12 tests React/métier réussis |
| `npm run build` | Build Vite réussi (JS ~239 kB, ~75 kB gzip) |
| `npm run test:e2e` | 4 tests Chromium réussis : desktop et mobile, captures clair/sombre inspectées |
| `npm audit` | 0 vulnérabilité signalée |
| `docker compose config --quiet` | Réussite ; montage local `./data` confirmé par la configuration résolue |
| `docker compose build` | Tenté, bloqué par le moteur Docker Desktop Linux arrêté (`dockerDesktopLinuxEngine` introuvable) |

**Limite de validation :** l’image et le cycle démarrage/redémarrage Docker ne sont pas validés en exécution tant que le moteur n’est pas disponible. La persistance SQLite après fermeture/réouverture est couverte par les tests API. Lancez la recette Docker ci-dessus une fois Docker Desktop démarré.

## Architecture

```text
.
├── Dockerfile                 # Build multi-stage, runtime Node non-root
├── docker-compose.yml         # App + préparation des droits, bind mount ./data
├── package.json / package-lock.json
├── index.html / vite.config.js / playwright.config.js
├── server/
│   ├── index.js               # Démarrage et arrêt propre
│   ├── app.js                 # API Express, validation, sécurité, fichiers statiques
│   └── db.js                  # SQLite, WAL, schéma v1
├── shared/domain.js           # Statuts, filtres, calculs statistiques
├── src/
│   ├── main.jsx
│   ├── App.jsx                # Kanban/tableau, formulaires, archives, thème
│   ├── Charts.jsx             # Courbe hebdomadaire et répartition
│   └── styles.css             # Tailwind + composants responsive
├── tests/
│   ├── api.test.js / domain.test.js / App.test.jsx / setup.js
│   ├── e2e-server.js
│   └── e2e/app.spec.js
└── data/                      # Créé automatiquement, jamais versionné
```

API JSON : `GET /api/health`, `GET /api/applications[?archived=true]`, `POST /api/applications`, `PATCH /api/applications/:id`, `DELETE /api/applications/:id`. Réponses d’erreur `{ "error": "message" }`. L’archivage/restauration utilise `PATCH { "archived": true/false }`.
