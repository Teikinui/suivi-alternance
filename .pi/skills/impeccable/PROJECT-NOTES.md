# Installation projet Impeccable

Sources installées par l’installateur officiel : https://github.com/pbakaus/impeccable.
CLI npm : **4.8.2**. Skill : **4.8.2**. Moteur épinglé : **0.1.21**.
Licence Apache-2.0 et copyright Paul Bakaus : voir `LICENSE`.

Installation effectuée à la racine :

```sh
DO_NOT_TRACK=1 npx --yes impeccable@4.8.2 install --providers=pi --scope=project --yes
```

Les launchers installés sont conservés tels que fournis. Trois références (`extract.md`, `harden.md`, `optimize.md`) ont uniquement une normalisation d’espaces, signalée en tête de chaque fichier, pour passer `git diff --check` ; leurs instructions sont inchangées. Ce fichier et la copie de licence accompagnent l’installation. Le launcher Unix est versionné exécutable avec fins de ligne LF ; le launcher Windows conserve les CRLF. Le binaire propre à la plateforme dans `scripts/bin/` n’est pas versionné ; le launcher peut télécharger le moteur épinglé avec vérification de checksum. Les scripts navigateur fournis (dont `live-browser.js`, 564 400 octets) sont conservés comme entrées de l’outillage installé, pas comme sorties de build du projet. Aucun de ces outils n’est embarqué dans l’image de production.

Dans Pi, `/reload` découvre les nouveaux skills ; `/skill:impeccable init` charge explicitement le skill. Pendant cette passe, `SKILL.md` et ses références ont été lus explicitement dans la session, sans redémarrer l’agent : le chargement manuel est suffisant pour suivre les workflows. `init`/`document` sont des workflows du skill, pas des sous-commandes de la CLI npm. Ils ont produit `PRODUCT.md`, `DESIGN.md` et `.impeccable/design.json` à partir des décisions utilisateur et du code existants.

Le moteur `context` a été exécuté. Il ne détecte aucun hook automatique pour cette session Pi ; les scans `detect` sont donc lancés explicitement. Télémétrie désactivée dans `.impeccable/config.json` et via `DO_NOT_TRACK=1` lors des commandes.

Aucun mode live/Apply, sous-agent, génération d’image, modification de CSP ou écriture dans la configuration globale de Pi n’a été activé. `live` n’est pas nécessaire à ce projet : certains modes Apply peuvent lancer un agent externe ; ne pas les employer sans examiner les options et permissions de la documentation officielle.
