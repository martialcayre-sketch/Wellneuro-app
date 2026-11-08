# Handoff — 2026-11-08 — File C, place 8 : release-db de BP-14 constatée, date seuil inscrite (F10, D-459)

## Branche et état du dépôt

- Branche `docs/bp14-constat-release-db`, créée depuis `origin/main`
  (`25f3cb9a`), worktree `.claude/worktrees/bp14-migration`.
- PR de doc seule : ni code, ni migration, ni chemin de release-db.
  Déclarée « prête @<sha> », mergée par l'intégrateur (D-373, D-454).
- #1930 (migration) est mergée (`2e624af0`) et sa release-db est constatée.

## Objectif

Point 3 de D-459 §8 : constat par conteneur de la release-db, puis date
seuil inscrite au journal de F10 et à la fin de D-459 (§5), avant toute
lecture des colonnes par BP-18a ou BP-24.

## Décisions prises

- Créneau et approbation de la release-db : le responsable, le 2026-11-08.
- Rouge du run 42528009082 lu comme « appliquée » : la garde anti-recul a
  joué à cause de #1925 et #1934, mergées pendant la release. Non relancé.

## Fichiers modifiés

- `docs/decisions/D-459.md` : constat ajouté à la fin.
- `docs/claude/plan-journal/F10/2026-11-08-01-constat-release-db-date-seuil.md` (neuf).
- Fiche LOT-14 (statut), ligne BP-14 de `CAMPAGNE.md`.
- `changelog.d/2026-11-08-bp14-constat-release-db.md` (neuf), ce handoff.
- Hors dépôt : lignes p28 (BioFlow) et a08 (file C).

## Validations exécutées

- Avant le merge de #1930, en lecture seule : cinq préflights à 0
  (one-off-9559) et garde à 1 praticien (one-off-6915). Étape 7 bis
  (déploiement, arbre fusionné, registre, `main` inchangé) et sonde à 0.
- Après la release : sentinelle `WN_RELEASE_DB_OK id=42528009082-1`
  (one-off-3975) ; étape « Vérification — migrate status » verte.
- Constat par conteneur (one-off-8612), en agrégats :
  - migration appliquée, une tentative, aucune non aboutie ;
  - `finished_at` = `2026-11-08T22:23:53.535Z` ;
  - 10/10 versions relues et 9/9 approbations avec auteur, 3 `draft`
    nulles, auteur = praticien actuel du dossier sur chaque ligne ;
  - deux fonctions présentes, EXECUTE retiré à PUBLIC.
- Première ligne des déploiements Scalingo : `25f3cb9a`, tête de `main`.
- T1 complet et anti-secrets : voir la PR.

## Problèmes ouverts

- Dette routée au plan §8 : release-db joue ses préflights APRÈS le
  déploiement du code. À traiter par la file de release.
- L'instant de déploiement de la PR de code reste à inscrire au journal de
  F10 (D-459 §5, deuxième temps).

## Prochaine action exacte

Lot suivant, file C : la PR de code de BP-14 (D-459 §3, §8 point 4).
- `creePar` posé à la création par la route des versions (branche `create`
  de l'upsert seule), par l'instantané JA de la route praticien et par
  l'activation JA ; nul depuis le portail (`actor` `'patient'`).
- `validePar` posé par les deux approbations de `diffusion/route.ts`.
- E-mail de session normalisé par `emailPraticien`, jamais venu de l'écran.
- Trois bancs : nominatif, historique (une ligne nulle ou déduite ne casse
  ni la diffusion, ni le portail, ni le calendrier), effacement.
- Puis inscrire au journal de F10 l'instant de son déploiement.

## Interdits encore actifs

- Aucun écran, export, IA ni route de lecture des deux colonnes (D-459 §7).
- `auth.ts` et les rôles intacts ; rien sous `web/src/lib/clinical/` ;
  lecteurs de `approvedBy` inchangés.
- Aucune seconde reprise : un nul ne se complète jamais (D-459 §5).
- Production en lecture seule, par conteneur, en agrégats ; aucun e-mail,
  identité ni identifiant de dossier au dépôt.
- La D-xxx de BP-18a et la règle signée sont de la main du responsable.
