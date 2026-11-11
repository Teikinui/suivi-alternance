---
name: Candidatures
description: Système visuel existant du suivi personnel de candidatures, affiné sans rebranding.
colors:
  light-background: "#f6f8f6"
  light-surface: "#ffffff"
  light-surface-soft: "#f0f4f1"
  light-text: "#26352f"
  light-muted: "#55665c"
  light-border: "#e2e9e3"
  light-accent: "#277756"
  light-accent-soft: "#e3f2e9"
  dark-background: "#111827"
  dark-surface: "#1b2435"
  dark-surface-soft: "#232e42"
  dark-text: "#edf0f7"
  dark-muted: "#b0bdd0"
  dark-border: "#3a4861"
  dark-accent: "#c4b5fd"
  dark-accent-soft: "#34304e"
  dark-on-accent: "#191526"
  light-warning: "#8a4f20"
  light-warning-background: "#f7ead9"
  light-danger: "#9f4550"
  dark-warning: "#f4cf91"
  dark-warning-background: "#3b3040"
  dark-danger: "#f3a9ba"
  light-error: "#a33341"
  light-error-background: "#fff0f1"
  dark-error: "#ffc0cd"
  dark-error-background: "#432b40"
  light-personal-marker: "#54ac7c"
  light-backdrop: "#10261b85"
  dark-backdrop: "#080e1acc"
typography:
  headline:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.25
  title:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 650
  body:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  metadata:
    fontSize: "12px"
  supporting:
    fontSize: "13px"
  panel-summary:
    fontSize: "15px"
  modal-title:
    fontSize: "22px"
  modal-title-mobile:
    fontSize: "18px"
  headline-mobile:
    fontSize: "1.75rem"
  metric:
    fontSize: "2.25rem"
  metric-mobile:
    fontSize: "30px"
  weekly-goal:
    fontSize: "26px"
  brand-mobile:
    fontSize: "19px"
  brand-mark:
    fontSize: "28px"
  company-monogram:
    fontSize: "11px"
rounded:
  small: "4px"
  selected: "5px"
  badge: "6px"
  tag: "7px"
  section: "12px"
  control: "8px"
  button: "9px"
  card: "10px"
  panel: "14px"
  dialog: "18px"
spacing:
  compact: "8px"
  field: "12px"
  regular: "16px"
  panel: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-surface}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  panel:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.panel}"
---

# Design System: Candidatures

## Overview

Documentation du système déjà présent dans `src/styles.css` et `src/dashboard-extras.css`. Aucune nouvelle direction de marque n’est créée. L’interface est un outil de travail : hiérarchie lisible, repères de statut et actions explicites, avec un accent réservé aux actions principales et sélections.

Les surfaces légèrement arrondies et les bordures fines organisent les informations. Les thèmes clair et nuit appartiennent au même système ; la nuit est ardoise/lavande, pas une version verte du thème clair.

## Colors

Les tokens du frontmatter correspondent aux variables CSS réelles. Le texte principal et le texte secondaire doivent rester lisibles sur les trois surfaces du thème.

L’accent clair conserve sa fonction sur l’ajout et les sélections ; l’accent lavande le remplace en mode nuit. Les cinq couleurs de statut restent celles définies dans les classes `.status-0` à `.status-4`, avec texte et comptes explicites : le statut ne dépend jamais de la couleur seule. Les valeurs de ces palettes sont couvertes par les tests de non-régression.

Les relances dues utilisent une surface d’avertissement ; la suppression utilise une encre de danger. Ne pas utiliser l’accent clair sur les commandes du thème nuit.

## Typography

Police système existante, sans dépendance réseau. Une seule famille suffit pour les labels, données, titres et formulaires ; la marque « c. » conserve son traitement serif existant. Le code du bookmarklet utilise une police monospace locale.

Les nombres de KPI dominent leurs légendes. Le poste et l’entreprise doivent se distinguer du lieu, de la date et des notes. Les textes explicatifs ne doivent pas devenir illisibles pour gagner de la densité. La passe de polish utilise des métadonnées à 12–13px, des libellés et données principales à 14–16px et des titres d’outil fixes en rem. Sur mobile, les champs de saisie sont à 16px pour éviter le zoom automatique. Le monogramme d’entreprise à 11px est décoratif, masqué aux technologies d’assistance et doublé par le nom complet.

## Layout

Conteneur principal plafonné à 1680px, marges latérales proportionnelles. En-tête, introduction et action d’ajout, KPI, centre d’action, graphiques, panneaux complémentaires repliables, puis suivi des candidatures.

Le Kanban a cinq colonnes sur écran large et se replie verticalement sur mobile ; les colonnes vides y sont réduites à l’en-tête. Les colonnes n’ont pas de cadre de carte supplémentaire : seul leur en-tête est teinté et les candidatures conservent leur surface. Sur écran compact, le cinquième KPI occupe une ligne complète. Un lien visible et un lien d’évitement clavier donnent accès directement au suivi sans réordonner le dashboard. Le tableau conserve ses colonnes et un défilement local sur écran étroit. Ne pas masquer les fonctionnalités pour faire rentrer le contenu. Le tableau défilant est focusable au clavier. Les libellés des graphiques gardent une taille réelle lisible grâce à une viewBox mesurée ; seuls certains ticks de l’axe horizontal sont espacés davantage sur mobile, sans supprimer de point ni de donnée accessible.

Les formulaires ont deux colonnes puis une sur mobile. Les régions logiques gardent un espacement distinct des champs d’une même section. Aucune barre ou animation décorative nouvelle.

## Elevation & Depth

Profondeur surtout donnée par les surfaces et bordures. Ombre ambiante très faible sur les panneaux ; ombre plus marquée pour les dialogues et notifications. Les dialogues utilisent le top layer natif et un backdrop existant, sans affaiblir la CSP pour des outils de design.

## Shapes

Contrôles et boutons légèrement arrondis, panneaux et dialogues plus généreux. Les actions secondaires conservent une bordure. Les arrondis ne doivent pas transformer toutes les données en pastilles décoratives. Les commandes ciblées ont une cible minimale de 44px ; la checklist peut utiliser un carré de 20px dans un label cliquable d’au moins 44px.

## Components

- **Boutons :** une commande d’ajout principale, actions secondaires lisibles, focus clavier visible, états désactivés préservés. Icônes SVG décoratives de `src/Icon.jsx` : même grille 24×24 et trait 1,75, noms d’action toujours portés par le texte ou le label du contrôle. Les sur-titres décoratifs ont été retirés ; les titres et contenus métier sont conservés.
- **Champs :** label associé, fond du thème, bordure et focus cohérents. Les champs obligatoires restent indiqués et validés.
- **Cartes :** entreprise, poste, informations secondaires, statut et commandes ; conserver les données et liens externes sécurisés.
- **Navigation :** onglets actifs/archives et commutateur Kanban/tableau, avec états accessibles et ordre clavier stable.
- **Centre d’action :** `<details>` natif, échéances et reports explicites ; ne pas changer les dates ou le tri pour une raison visuelle.
- **Graphiques :** mêmes données et descriptions accessibles ; ne pas fabriquer une courbe différente pour améliorer une capture.
- **Dialogues :** titre, annulation, fermeture clavier et confirmation explicite ; le brouillon importé reste non enregistré.
- **Notifications :** message visible et annoncé, bouton de fermeture, mouvement réduit respecté.

## Do's and Don'ts

### Do
- Préserver les palettes et libellés de statuts testés, et l’accent lavande du mode nuit.
- Corriger les contrastes et les tailles au niveau du token ou composant approprié.
- Vérifier les écrans vides, peuplés, filtrés, les erreurs et les chaînes longues avec des données fictives.
- Tester clavier, zoom, touch targets et défilement local, pas uniquement une grande capture desktop.

### Don'ts
- Ne pas ajouter de compte, authentification, panneau admin, métrique ou promesse commerciale.
- Ne pas télécharger de police, inventer d’imagerie ni affaiblir la CSP.
- Ne pas réécrire la voix ou les faits du produit sous couvert de polish.
- Ne pas consulter ou modifier `./data` pour produire les captures.
