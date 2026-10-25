# Handoff — 2026-10-25 — File D : lettres ad, bc, ba (D-367 à D-369)

## Branche et état du dépôt

- Branche `docs/lettres-ad-bc-ba`, partie de `origin/main` (21822e93, merge de
  #1693), worktree `file-d1-suite`. Session concurrente, cycle en `git`/`gh`
  direct.
- Documentation seule : aucune migration, aucun drapeau, aucune release-db.

## Objectif

Second lot de la séance file D « lettres en attente » : écrire les trois
lettres validées par le responsable le 2026-10-24 (ad, bc, ba), liées entre
elles par leurs renvois.

## Décisions prises

- ad (D-367) : un cycle, pas de phases ; `phases` fermé ; « programme » défini
  comme l'ensemble des éléments de la version servie (question à options).
- bc (D-368) : ajout par nouvelle version datée, approbation propre avant
  d'être servie, seul un pivot relance (D-255) ; BP-23 (brouillon non diffusé)
  hors champ.
- ba (D-369) : libellé « Validé par votre praticien le … » ; message de départ
  hors de ba (questions à options) ; texte validé mot pour mot.
- Lot 1 (#1693) mergé le 2026-10-25 sous D-364 à D-366 après trois
  renumérotations (numéros pris sur main pendant l'attente de CodeRabbit) ;
  texte patient de bg complété deux fois sur arbitrage du responsable
  (ce que la version garde ; « retire » au lieu d'une promesse d'absence) ;
  relecture du PDF par le praticien ajoutée au §2 de D-364.
- Page D mise à jour après #1693 : m08, m15 faits ; m16 cadre écrit ; b11 fait ;
  b15, b21, b06 remis à jour.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-367, D-368, D-369).
- `docs/claude/PLAN_WELLNEURO.md` (registre, D.3, fiches H34, H35, H49, H53).
- `changelog.d/2026-10-25-lettres-ad-bc-ba.md`, `docs/claude/SESSION_LOG.md`,
  ce handoff.

## Validations exécutées

- `cd web && npm run check` (T1 complet, dont `decisions-check`) ;
  `bash scripts/check_no_secrets.sh --staged`. Résultats dans la PR.

## Problèmes ouverts

- ba : lot de code (mention en tête de `PatientCompanionHome.tsx`) à ranger,
  rang 1.
- Numérotation : #1704 (t45) réservait D-364, prise par #1693 ; elle devra
  renuméroter. Les numéros de ce lot peuvent encore bouger avant le merge
  (le contrôle refuse un trou).

## Prochaine action exacte

Après le merge : page D (lignes de ad, bc, ba), puis propositions suivantes —
cb, textes (a) et (e) de D-283, aw, texte d'az.

## Interdits encore actifs

- Production en lecture seule ; aucun checkout hors de ce worktree.
- Rien n'entre au registre, au plan ou à la page D sans validation explicite
  du responsable, lettre par lettre.
- Aucun seuil, dose, poids ou borne inventé.
- Hors périmètre : D/22, D/23, D/51, D/3, t35, dossier magnésium, et toute
  exécution de code qu'une lettre décide.
