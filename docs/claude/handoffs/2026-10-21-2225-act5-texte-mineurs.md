# Handoff — ACT-5 : texte des mineurs (2B) servi, J2-conf tenu (D-340)

## Branche et état du dépôt

- Branche `lot/act5-mineurs`, worktree `act5-mineurs`, partie de `origin/main`
  (bf6d2235). Sans migration, sans `schema.prisma`, sans drapeau.

## Objectif

File C, place 5 (H78) : servir les textes des mineurs de G-11 (#1441), après
avoir établi l'état de J2-conf (F45), préalable entier d'ACT-5.

## Décisions prises

- Relevé de J2-conf le 2026-10-21 : non fait. Quatre arbitrages du
  responsable (questions à options, recommandations prises), transcrits en
  `D-340` (numéro libre sur main au bf6d2235) :
  - r faite : registre des instruments existant reconnu ; la déclaration
    Q_ALI_09 du 2026-09-16 tient lieu de signature ;
  - at hors du périmètre d'ACT-5, reste au rang 1 ;
  - lot de code J2-conf fondu dans ACT-5 (banc de la surface) ;
  - 2B seul, sur l'écran de pause du mineur ; 2A avec J3-mineurs (H79).
- J3-mineurs suit ACT-5 (plan H79 inchangé) : la page de suivi disait
  l'inverse, corrigée (a05, q17).

## Fichiers modifiés

- `web/src/lib/patient/texteMineurs.ts` (+ `texteMineurs.test.ts`).
- `web/src/components/patient/DateNaissanceEcran.tsx` (`EcranCircuitMineur`).
- `web/src/app/portail/[token]/page.test.tsx` (attente du nouveau texte).
- `docs/DECISIONS.md` (D-340), `docs/claude/PLAN_WELLNEURO.md` (H28, F45,
  H78, H79, deux lignes de r), `changelog.d/2026-10-21-act5-texte-mineurs.md`,
  SESSION_LOG.

## Validations exécutées

- Vitest ciblé (`texteMineurs`, `src/app/portail/`) : 17 fichiers, 158 tests
  verts ; T1 rapide vert ; relecture wn-reviewer : aucun bloquant, trois points
  corrigés (lookbehind retiré pour Safari < 16.4, banc du dossier clos et
  rendus mineur / clos / majeur ajoutés, écart des deux voix consigné) ;
  T1 complet et T2 `--fast` avant le commit (résultat dans la PR).

## Problèmes ouverts

- at et as (F45) ; les 15–17 ans (avocat, D-284) ; circuit des droits des
  mineurs (D-283 §5).
- 2B ne nomme ni la pause de l'envoi des analyses biologiques ni le contact du
  praticien (l'ancien texte les nommait) ; le refus des routes et de l'écran de
  dépôt (`MESSAGE_CIRCUIT_MINEUR`, au vouvoiement) dit toujours « Votre
  praticien reprendra contact avec vous » : deux voix pour le mineur, à aligner
  avec J3-mineurs ou sur décision du responsable (D-340 §5).
- Le banc refuse les titres de 2A dans le code servi : J3-mineurs devra
  l'ajuster en servant 2A.

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; lecture consignée du
texte servi dans l'image déployée ; plan H78 et page de suivi a05 → fait.

## Interdits encore actifs

- Aucune fenêtre, aucun seuil, aucune règle clinique ; aucune migration sans
  accord ; un merge à la fois ; regarder main et les release-db en attente
  juste avant le merge ; revérifier D-340 libre sur main au merge.
