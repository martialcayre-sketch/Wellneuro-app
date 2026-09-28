# Handoff — 2026-09-28 — Fiches d'assiette : le drapeau d'émission posé, clôture du lot 8

## 1. Branche et état Git

`docs/d251-ouverture-drapeau-fiches`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`e6f1dd70` (#1245, lot 8). PR de documentation seule. Un merge à la fois.

## 2. Objectif

Consigner la pose de `WN_FICHES_ASSIETTE` en production, décidée par le
responsable avant les conditions du §10 de `D-251`. Clore le lot 8, et fixer
la règle d'ouverture de la lecture avant le lot 9.

## 3. Décisions prises

- **Ordre du responsable, rendu en session** : « ouvre le drapeau, termine le
  lot 8 et ouvre le lot 9 ». Il suit son constat : la phase 5 « Actions » du
  poste de pilotage n'est pas assez développée pour mener un protocole réel
  jusqu'au bout.
- **Choix de mise en œuvre de la session**, consigné dans l'amendement de
  `D-251` du 2026-09-28 au soir : les lots 9 et 10 se construisent sous un
  second drapeau, `WN_FICHES_ASSIETTE_LECTURE`, livré fermé. Il reprend les
  conditions du §10 : les sept fiches validées, l'espace de lecture constaté,
  le document TRUST sur l'IA publié, une contre-revue adverse. Sans lui, la
  première remise deviendrait lisible au merge du lot 10, avant le document
  TRUST. **Le responsable peut revenir sur ce choix.**
- La parade de `D-112` change de forme : le premier protocole servi de bout en
  bout le sera drapeau ouvert.

## 4. Fichiers modifiés

- `docs/DECISIONS.md` : l'amendement de `D-251` du 2026-09-28 au soir.
- `docs/FEATURE_FLAGS.md` : la ligne de `WN_FICHES_ASSIETTE` (pose, ordre tenu,
  état à la pose, constat en attente).
- `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md` : la dette de la chaîne
  d'approbations, mise à jour (le chemin servi est désormais le chemin
  verrouillé).
- `changelog.d/2026-09-28-fiches-assiette-ouverture-emission.md` (fragment de
  changelog).
- `docs/claude/handoffs/2026-09-28-2135-fiches-assiette-ouverture-emission.md`
  (ce handoff).
- `docs/claude/SESSION_LOG.md` (entrée de clôture).

## 5. Validations exécutées

- **Le lot 8 est en service** : `e6f1dd70` a été déployé avec succès, fin du
  build à 14:07:04 UTC, sans recul des déploiements précédents.
- **État avant la pose, constaté par conteneur** (lecture seule, agrégats) :
  - sept versions v1, dont une seule validée (`WN-SRC-0297`, épargne
    digestive) ;
  - 0 approbation de diffusion, 0 remise, 0 chaîne à deux têtes ;
  - un seul brouillon de protocole, l'épisode d'observation alimentaire.
- **Pose** :
  - variable relue absente avant l'opération ;
  - `env-set` à 18:41:51 UTC, puis `env-get` relu à `true` ;
  - les conteneurs n'avaient pas été recréés par l'`env-set`. `scalingo
    restart web` les a recréés à 18:58:08 UTC, ce que `scalingo ps` confirme.
- **Sondes après la pose** : 307 à la racine, 401 anonyme sur la route de
  diffusion. Ce 401 ne prouve rien du drapeau, car l'identité est relue avant.
- T1 : voir la PR.

## 6. Problèmes ouverts

- **Le constat par le comportement manque.** Son témoin est la section « Fiches
  d'assiette que ce clic remettra au patient », dans la sous-vue Diffusion,
  vue lors d'une session praticien. D'ici là, écrire « posé », pas « constaté ».
- **La phase « Actions » : le constat du responsable reste à cadrer avec lui.**
  Faits relevés dans le code par la session, qui ne remplacent pas son
  constat :
  - le constructeur repart d'un brouillon vide à chaque version : la version
    active n'est pas reprise ;
  - trois actions au plus (`D-105`) ;
  - les trois plans sont en texte libre, sans catalogue d'actions ;
  - un « complément à explorer » ne porte ni produit, ni forme, ni dose.
- **Les six autres fiches attendent la relecture du responsable**, au rayon
  « Fiches conseils ».

## 7. Prochaine action exacte

Le lot 9 : le service patient des fiches remises, sous
`WN_FICHES_ASSIETTE_LECTURE` fermé :
- servir la remise en cours de chaque fiche ;
- mention de retrait quand la version est retirée ;
- mention « ne fait plus partie de votre protocole actuel » quand l'assiette a
  quitté le protocole.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- `WN_FICHES_ASSIETTE_LECTURE` reste fermé jusqu'aux conditions du §10 : sept
  fiches validées, espace de lecture constaté, document TRUST sur l'IA publié,
  contre-revue adverse.
- Lecture de production par conteneur seulement, par identifiant ou agrégat.
