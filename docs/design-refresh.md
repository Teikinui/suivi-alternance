# Première passe Impeccable

Branche : `feat/impeccable-design-refresh`, créée depuis `main` propre au commit `1b71ced6c7eb60cfb2ac89b58252a07be64c85e8`. Pas de merge vers main.

## Installation et méthode réellement utilisées

- Installateur officiel npm **impeccable@4.8.2**, provider **pi**, scope **project** ; skill version **4.8.2**, moteur **0.1.21**. Sources dans `.pi/skills/impeccable/`, licence incluse, binaire spécifique à la plateforme ignoré. Trois références ont seulement des espaces normalisés, avec notice explicite ; launchers préservés, mode exécutable Unix et fins de ligne adaptés aux deux plateformes.
- `SKILL.md` et références init/document, critique/audit, polish/adapt/operate et craft-floor chargés explicitement. `init` et `document` sont des workflows du skill : ils ont produit `PRODUCT.md`, `DESIGN.md` et `.impeccable/design.json` à partir du code et des décisions utilisateur, sans inventer une marque.
- Commande réelle `impeccable context --target src/App.jsx` exécutée via le launcher du projet. Aucun hook automatique actif dans cette session Pi : scans manuels explicites.
- Critique visuelle **Assessment A avant lecture du détecteur**, puis Assessment B mécanique. **⚠️ DEGRADED: single-context** : aucun outil de sous-agent disponible, pas de seconde revue indépendante revendiquée.
- Télémétrie désactivée dans `.impeccable/config.json` et `DO_NOT_TRACK=1` lors des commandes. Aucun mode live/Apply, agent externe ou génération d’image lancé.
- `tests/design-preview.mjs` sert la vraie application sur **127.0.0.1:3102**, avec six candidatures fictives et SQLite **en mémoire**. Aucun accès au vrai `./data`. Serveur arrêté après la revue.
- Préflight navigateur réel : mutation DOM possible, injection inline bloquée par la CSP. Aucun overlay fiable n’est revendiqué ; captures Playwright et détecteur rendu CLI utilisés, sans affaiblir la CSP.

## Critique initiale

**Design Health Score indicatif : 29/40.** Évaluation interne, sans test utilisateur ni certification.

| Heuristique | /4 |
|---|---:|
| Visibilité de l’état | 3 |
| Langage métier | 3 |
| Contrôle utilisateur | 3 |
| Cohérence | 3 |
| Prévention des erreurs | 3 |
| Reconnaissance | 3 |
| Efficacité | 3 |
| Minimalisme | 2 |
| Récupération d’erreurs | 3 |
| Aide | 3 |

**Points forts :** ajout identifiable, brouillons confirmés, annulation/restauration, centre de relances utile, aide sur les limites et palette nuit cohérente. Identité appropriée à un outil de suivi ; aucun rebranding nécessaire.

**P1 — Lisibilité et contrastes clairs.** Textes parfois de 8–12px ; secondaire `#728078` sur `#f0f4f1` : **3,73:1** ; relance `#a9682f` sur `#f7ead9` : **3,76:1** ; suppression `#b3656c` sur blanc : **4,20:1**. Relever l’échelle et renforcer les trois encres claires, sans changer les accents, statuts ou couleurs nuit.

**P2 — Cibles, parcours et adaptation.** Petits contrôles, long parcours avant le suivi, réduction des axes SVG, dernier KPI isolé et cadres de cartes imbriqués du Kanban. Cibles plus grandes, accès direct au suivi, axes mesurés et regroupements moins lourds ; conserver les groupes métier et les données.

Profils heuristiques : clavier/faible vision (contrastes et tabulation), mobile (cibles et champs), usage quotidien (accès au suivi). Pas de recherche utilisateur prétendue. Questions de marque non nécessaires : l’utilisateur avait déjà fixé l’identité à conserver et la portée ciblée.

Audit technique initial indicatif : accessibilité 2/4, performance 3/4, theming 3/4, responsive 2/4, intégrité 3/4, soit **13/20**. Les scores ne remplacent pas les vérifications ci-dessous.

Le snapshot de référence a été archivé localement avec `critique-storage write`, relu avec `latest --json`, puis fermé avec l’identité exacte renvoyée après résolution des deux priorités. Première critique : **29/40, aucune tendance encore disponible**. Les snapshots locaux sont ignorés par l’outil ; ce document conserve le rapport partageable, sans captures ni fichiers de session.

## Changements livrés

- Métadonnées à 12–13px, données/libellés principaux à 14–16px, titres hiérarchisés ; retrait des sur-titres décoratifs, pas des informations métier. Les monogrammes 11px sont décoratifs et masqués aux technologies d’assistance.
- Clair : `--muted: #55665c`, `--warning: #8a4f20`, `--danger: #9f4550`. Surfaces, accent vert et couleurs des statuts préservés. **Nuit ardoise/lavande inchangée**, sans vert dominant ; valeurs exactes couvertes par les tests existants.
- Icônes SVG locales décoratives, noms accessibles des commandes conservés. Cibles de commande ciblées ≥44px, focus visible, sélection/caret/scrollbar adaptés au thème, mouvement réduit préservé.
- Lien d’évitement clavier et lien visible vers le suivi ; région de tableau horizontal explicitement focusable.
- Dernier KPI pleine largeur sur écran compact ; wrapping des contenus et commandes ; champs mobiles à 16px. Le Kanban garde ses cinq statuts mais perd les cadres externes superflus des colonnes.
- SVG d’activité mesuré par ResizeObserver : texte à taille réelle, ticks plus espacés sur petit écran, huit points et description complète conservés. Aucun calcul métier changé.
- Scan Tailwind limité à `src/` pour éviter d’embarquer les classes des nouveaux outils/docs. Build local et Docker identiques : CSS **32,23 kB** (gzip 7,49), JS **273,44 kB** (gzip 85,19). Aucune nouvelle dépendance de l’application ou police distante.
- Documentation des valeurs réellement utilisées, y compris états d’erreur, matériaux transparents et ombres. Pas d’ignore de règle ajouté pour faire disparaître un défaut ; l’outil reconnaît l’accent lavande explicitement déclaré et n’applique donc pas son jugement générique anti-violet.

## Détecteurs réellement exécutés

Launcher : `.pi/skills/impeccable/scripts/impeccable`, avec `DO_NOT_TRACK=1`.

| Cible | Avant | Après | Exit final |
|---|---|---|---:|
| `detect --json src/` | 86 advisories : 57 tailles, 20 arrondis, 9 couleurs ; aucun primary finding | **0** | 0 |
| `detect --json --viewport 390x844 http://127.0.0.1:3102` | 58 : 27 undersized-ui-text, 26 tiny-text, 5 nested-cards | **0** | 0 |
| `detect --json --viewport 1440x900 http://127.0.0.1:3102` | Pas de baseline chiffrée | **0** | 0 |

Les advisories source initiaux incluaient une documentation de tokens partielle ; leur baisse ne signifie pas 86 défauts UI corrigés. Le scan source seul est limité au regex : **il ne vaut pas audit rendu**. Les scans URL complètent ce contrôle, sans valoir certification globale d’accessibilité. Les JSON bruts et captures restent dans les dossiers locaux ignorés.

## Validation finale

| Vérification | Résultat |
|---|---|
| `npm test` | **22 API + 121 Vitest réussis**, aucun échec ou skip |
| `npm run test:e2e` | Build réussi + **30 tests Chromium réussis**, desktop/mobile |
| `npm run design:detect` | Réussite ; 11 fichiers source scannés, aucun signalement |
| `npm audit` | **0 vulnérabilité connue** dans les dépendances npm de l’application |
| `docker compose config --quiet` | Réussite ; publication hôte loopback existante préservée |
| `docker build -t suivi-alternance:design-refresh-check .` | Réussite multi-stage ; mêmes assets que le build local |
| Smoke Docker | UID **1000**, réseau `none`, aucun volume ni port publié, SQLite mémoire vide ; health/frontend/CSS **200**, outillage/docs absents de l’image |
| Revue | Diff source et exclusions examinés ; `git diff --check` réussi |

Les six nouveaux scénarios (trois exécutés sur chaque projet desktop/mobile) couvrent 320/390/768/1440px, longs contenus sans débordement global, taille réelle des axes, lien d’évitement clavier, tableau défilant au clavier, formulaire mobile, cibles, touch simulé et mouvement réduit. Les scénarios existants vérifient CRUD/rechargement, archives, filtres, relances, préférences, exports, imports et erreurs. Les tests de contraste ajoutent les textes clairs ≥4,5:1 aux vérifications nuit existantes (textes ≥4,5:1 et éléments graphiques ciblés ≥3:1).

**Limites :** Chromium émulé, sans appareil physique, Safari/Firefox, lecteur d’écran, audit WCAG complet ou benchmark de forte volumétrie. Aucun résultat n’est revendiqué pour ces vérifications non effectuées. La capture visuelle ne remplace pas ces tests.

## Revue additionnelle — 12 novembre 2026

Skill projet rechargé (`context --target src/App.jsx`, références critique/audit/polish). Assessment A visuelle avant les nouveaux résultats du détecteur ; **⚠️ DEGRADED: single-context**, sans sous-agent disponible. Captures fraîches clair/nuit, source et tableau réel examinés sur données fictives en mémoire. L’identité, les groupes métier et l’accès direct au suivi restent appropriés : aucune refonte justifiée.

**Un défaut P2 concret :** les en-têtes `th` et commandes `.table-actions button` étaient encore à **11px**, sous le plancher documentaire de 12px pour ces textes. Valeurs confirmées dans Chromium ; nouvelle assertion de régression d’abord en échec sur les deux projets (11 reçu, 12 attendu). Seules ces deux déclarations passent à **12px** ; aucun changement de couleurs, contenu ou comportement.

Critique indicative : **30/40**, dix heuristiques à 3/4 ; audit indicatif **15/20**, cinq dimensions à 3/4. Le défaut local identifié est corrigé, sans prétendre à une certification. Alex conserve l’accès direct et les commandes ; Sam et Casey bénéficient de libellés de tableau alignés sur l’échelle existante. Questions skipped: 1 Priority Issue, périmètre déjà autorisé.

Validation après correction : **8 scénarios Chromium ciblés réussis** (design-refresh et theme, desktop/mobile), build réussi ; scans Impeccable source et dashboard rendu à 390×844 / 1440×900 : **0 signalement**, exit 0. Le scan URL ouvre le Kanban par défaut ; le tableau est donc contrôlé séparément : textes à 12px en clair/nuit sur 390 et 1440px, sans débordement global, et défilement clavier testé. Captures après correction examinées. Aucun ignore de règle ajouté.

Aperçu local arrêté après vérification ; snapshots/captures restent ignorés. `STATUS.md`, préexistant et non suivi, est laissé intact et exclu du commit. Pas de modification métier, données, secrets ou merge. Restent non vérifiés : appareils physiques, autres moteurs et lecteurs d’écran.

## Périmètre protégé

Aucun admin/auth/compte, changement de serveur, logique métier partagée, schéma, migration, dépendance/lockfile ou exposition réseau. Aucun accès/modification aux données réelles ni secrets. Binaires plateforme, dépendances, captures, caches, rapports de test et sorties de build exclus du commit. Sources/licence du skill conservées comme outillage de développement, exclues du contexte Docker.
