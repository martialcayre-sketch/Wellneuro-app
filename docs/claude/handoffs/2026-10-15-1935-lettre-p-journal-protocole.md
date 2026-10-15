# Handoff — lettre p (D-314), journal de lecture du protocole (CC-8)

## Branche et état Git

- Branche `docs/lettre-p-journal-protocole`, partie de `origin/main` 8b2ade90 (#1481).
- Commit b83e71e8 (D-314, registre, plan, fragment), plus ce handoff.
- `docs/claude/SESSION_LOG.md` porte une entrée locale (lettre ai, 2026-10-14)
  d'une autre session : hors du lot, laissée non indexée.

## Objectif

Écrire la lettre p et trancher le chemin le plus court vers ACT-1 (H70).

## Décisions prises (D-314, sept arbitrages du responsable)

- Ordre : ACT-1 n'attend que k, l, G-8, J2-cc8 et la porte 18, plus J2-base ;
  la release-db de CC-8 passe dès qu'elle est prête, sans attendre la file B ;
  CC-8 précède ai, en deux migrations séparées.
- Contenu : est « lu » la première ouverture du détail (déplié ou page) de
  chaque version diffusée (identifiant de `ProtocolDiffusionApproval`), sans
  date ; ni l'affichage de l'accueil ni la connexion.
- Praticien : régime D-297 §5, livré avec le code de ai ; d'ici là, constat
  par conteneur seulement. Compte du cabinet : son propre lot (F25, porte 6).
- Patient : aucun texte neuf ; la phrase de D-297 §4 couvrira le protocole
  avec la date.
- Constat sur main : porte 12 levée ; porte 16 fermée (≥ 2026-11-12) ;
  porte 21 se constate à la revue de la PR d'OF-2 ; CC-0 bloqué par S-2
  (jamais ouverte), puis c, d, M-2, porte 4.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-314)
- `docs/DOSSIER_RGPD.md` (rubrique 5, espèce `protocole` déclarée)
- `docs/claude/PLAN_WELLNEURO.md` (intro du rang 4, H59, H60, H70, file C
  place 1, file D ligne 4, lettres)
- `changelog.d/2026-10-15-lettre-p-journal-protocole.md`

## Validations exécutées

- T1 complet (`npm run check`) vert, 506 tests ; anti-secrets propre.

## Problèmes ouverts

- Ouvrir le détail du protocole modifie l'accueil du portail : surface
  servie avec ACT-1 (porte 18), derrière un drapeau éteint jusque-là.
- PR #1482 (fiche BP-12a) ouverte par une autre session : plus de
  dépendance d'ordre avec CC-8.

## Prochaine action exacte

1. PR de ce lot, `wn-attendre-ci` en fond, revue CodeRabbit sur la tête, merge.
2. Migration de CC-8 (une espèce au CHECK de `portail_lectures_patient`),
   **seulement sur demande du responsable** ; puis release-db, constat, code
   (détail replié, écrivain, ESPECES/`EspeceLecture`, vérification serveur).

## Interdits encore actifs

- Aucune migration sans demande ; une release-db à la fois, déploiement
  constaté avant le merge suivant.
- Ne pas committer l'entrée SESSION_LOG de l'autre session.
- Pas d'auto-merge ; approbation release-db : geste humain.
