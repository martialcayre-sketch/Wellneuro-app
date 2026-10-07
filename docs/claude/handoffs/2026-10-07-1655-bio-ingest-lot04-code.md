# Handoff — 2026-10-07 — BIO-INGEST LOT-04 : code de la transmission patient (PR 3)

## Git

Branche `feat/bio-ingest-lot04-transmission-patient`, issue de main 8782a47e.
PR à ouvrir. Lot : 2026-09-30-bio-ingest / LOT-04.

## Objectif

Code de `D-269` sous `WN_BIO_PORTAIL_ENABLED` éteint, avec les textes
`usage_ia` v6 et `donnees_confidentialite` v13.

## Décisions

- Portail : route `api/portail/comptes-rendus` (GET statuts, POST dépôt),
  page `comptes-rendus`, lien du hub. Ordre §5 tenu, plafonds rejugés sous
  verrou par dossier. Statut dérivé, précision écrite dans `D-269`.
- Praticien :
  - « Voir le document » : route `import/document`, journalisée, avec
    `nosniff`, une image servie sous `sandbox`, et 410 une fois purgé.
    Ajoutée sur le **P1 de `wn-reviewer`**, arbitré par le responsable :
    visionneuse dans ce lot.
  - « Écarter ce document », motif fermé.
  - Retrait refusé sur un document d'origine patient.
  - Carte du Fil `compte_rendu_transmis`, non écartable.
- Écart, carte et visionneuse restent sous `WN_BIO_INGEST_ENABLED` seul : un
  document déjà transmis garde son recours si le portail est rééteint.
- P2 de la revue corrigés :
  - validation après écart : 409 `document_ecarte` ;
  - redépôt d'un fichier écarté : `document_deja_ecarte`.
- Accepté par le responsable : la v13 exige un accusé, donc tous les patients
  repassent par « Avant de commencer » au déploiement, drapeau éteint
  compris. C'est écrit dans `FEATURE_FLAGS` et dans le changelog.

## Fichiers

Voir le diff : libs `transmission*`, `ecart`, `decisions`, `retrait`,
`lecture` ; routes `portail/comptes-rendus`, `import/ecart`,
`import/document` ; `cartes.ts`, la route du Fil et `FilDuJour` ; le panneau
d'import ; l'écran patient ; `registre.ts` ; les gardes (staging, importeurs,
masquage) ; `FEATURE_FLAGS`, `DECISIONS`, la fiche, le changelog.

## Validations

- T1 vert.
- T2 vert avant la visionneuse. Rejoué sur l'état final (voir la PR).
- Revue `wn-reviewer` : go pour un merge drapeau éteint.

## Ouvert

- **Les `changeSummary` de la v6 et de la v13 sont à relire par le
  responsable dans la PR**, avant le merge.
- Hors lot :
  - banc sur base réelle pour deux dépôts concurrents au plafond moins un ;
  - un P2002 Prisma 7 levé dans une transaction interactive.

## Prochaine action exacte

1. PR, CI (`wn-attendre-ci`), lecture des commentaires, relecture des
   résumés par le responsable, merge.
2. Constat du déploiement, puis de la v6 et de la v13 servies (`D-248`).
3. Allumage de `WN_BIO_PORTAIL_ENABLED` : geste du responsable, constaté
   par son effet.

## Interdits actifs

Aucune extraction au dépôt. Aucune valeur montrée au patient. Pas de
`prisma format`. Aucune écriture SQL en production. Aucun nom de patient.
