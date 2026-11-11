# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Teikinui utilise cet outil personnel pour suivre ses propres candidatures. Consultation et mise à jour sur ordinateur et écran mobile. Aucun compte utilisateur, inscription ou panneau administrateur : ces fonctionnalités ont été explicitement annulées.

## Product Purpose

Rassembler les opportunités, statuts, contacts, notes et échéances de relance dans un suivi auto-hébergé. La tâche principale est de retrouver une candidature, connaître la prochaine action et mettre à jour son suivi sans perdre les informations saisies.

## Operating Context

- Interface française React, API Express et SQLite persistante dans le dossier local `./data` monté par Docker Compose.
- Usage local/auto-hébergé, non destiné à une exposition Internet anonyme. Compose publie son port sur localhost.
- Vue Kanban ou tableau, recherche, filtre de statut, tri, archives, exports CSV/JSON et relances à échéance.
- Le centre d’action montre les relances dues et permet de reporter de deux ou sept jours.
- Statistiques et graphiques fondés sur les données existantes, avec leurs limites explicites ; pas d’historique de réponse inventé.
- Un bookmarklet extrait au mieux une offre dans la page ouverte et présente un brouillon modifiable. L’enregistrement demande toujours confirmation.

## Capabilities and Constraints

- Préserver le CRUD, les champs, l’archivage/restauration, les statuts et le comportement des filtres et exports.
- Préserver le choix de thème et les palettes existantes. Le mode nuit est bleu ardoise/lavande, sans dominante verte.
- Conserver les avertissements sur les données personnelles, les limites des KPI et les limites du bookmarklet.
- Aucun service tiers à l’exécution de l’application, aucune police distante, aucune automatisation de candidature ou de scraping serveur.
- Ne pas lire/modifier les données réelles ni les secrets pendant les essais ; utiliser les bases temporaires des tests.
- Pas de migration de données, authentification, compte ou fonction métier nouvelle dans cette passe de design.

## Brand Commitments

Nom existant : « candidatures. » ; signature graphique existante « c. ». Conserver le ton français d’accompagnement, l’identité calme et les contenus existants. Cette passe documente et affine le système, sans nouvelle marque, promesse commerciale ou métaphore créative imposée.

## Evidence on Hand

Les composants et tokens dans `src/`, le README, les tests React/API et les scénarios Chromium sont les preuves disponibles. Les offres de `tests/fixtures/jobs/` et les candidatures générées par les tests sont fictives et ne constituent pas des témoignages. Aucune mesure de performance utilisateur ni certification d’accessibilité n’est établie.

## Product Principles

1. Le suivi et la prochaine action priment sur la décoration.
2. Les changements et imports restent sous contrôle de l’utilisateur.
3. Une information partielle ou une estimation doit être présentée comme telle.
4. La lisibilité, les actions clavier/tactiles et les petits écrans font partie du fonctionnement normal.
5. Préserver les données et les comportements existants avant d’affiner leur présentation.

## Accessibility & Inclusion

Préserver les noms accessibles, la navigation clavier, les confirmations de suppression, les libellés explicites et les préférences de mouvement réduit. Vérifier les contrastes dans les deux thèmes, le zoom et le reflow. Les tests automatisés ne remplacent pas une revue avec lecteurs d’écran et appareils physiques.
