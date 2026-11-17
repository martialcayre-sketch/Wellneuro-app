# Handoff — besoin 5 : positions v0.3 signées, D-538 proposée (2026-11-17)

## Branche et état Git

- Branche `docs/besoin5-decision-bornes`, worktree `b-besoin4-decision-guide`,
  partie d'`origin/main` à `da40b54cd`. PR du lot : voir le titre de la
  branche ; documentation seulement.
- #2204 (LOT_075, MFI et MEQ) mergée le 2026-11-16.

## Objectif

Consigner les trois arbitrages du responsable sur les écarts relevés par les
positions v0.3 du besoin 5 (P26, P28), en une décision appliquée par J3-12f.

## Décisions prises

- Positions v0.3 signées par le responsable le 2026-11-17 (vingt-huit) ;
  P28 amendée sur trois faits relus, puis re-signée le même jour.
- `D-538` acceptée par le responsable le 2026-11-17 : questions `20261117-0140-b` (A), `0141-b` (B),
  `0142-b` (C), tranchées par le responsable sur la recommandation de la
  session, avis de Codex joint et concordant.
- Contre-revue de Codex des positions v0.3 : un P1 et six P2, tous traités
  (verdicts au dépôt privé des revues).

## Fichiers modifiés

- `docs/decisions/D-538.md` (neuf)
- `changelog.d/2026-11-17-besoin-5-decision-bornes.md` (neuf)
- `docs/claude/plan-journal/H15/2026-11-17-02-besoin-5-decision-bornes.md`
  (neuf)
- `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` (une phrase, renvoi)
- `docs/claude/PLAN_WELLNEURO.md` (deux lignes J3-12f, renvoi)

## Validations exécutées

- `cd web && npm run check` : code 0 (1047 tests passés, un ignoré), anti-secrets
  verts.
- Contre-revue de Codex sur `D-538` (`wn-codex-avis.mjs --mode revue`) : un
  P1 (forme opaque : population, catégories et cotes nommées) et un P2
  (guide au présent alors que la décision est proposée), tous deux corrigés.
- Lecture seule en production : passages des supports du cabinet relus par
  conteneur `scalingo run -d`.

## Problèmes ouverts

- Texte de la note du questionnaire de Horne à relire par le responsable
  avant J3-12f (`D-538` §3).
- Textes encore manquants au dossier du besoin 5 : la publication primaire
  du MFI-20, la validation française du MFI, la validation de Smets.

## Prochaine action exacte

Attendre le CI et la revue de PR-Agent, verdict pour chaque commentaire,
puis déclarer la PR prête pour l'intégrateur. Ensuite, le lot J3-12f
applique `D-538` après relecture de la note de Horne.

## Interdits encore actifs

- Aucune signature clinique à la place du responsable ; aucun avis collé
  pris pour son accord.
- Rien d'écrit en production : lecture seule par `scalingo run -d`.
- Forme opaque au dépôt (`D-251` §4) : ni texte de claim, ni valeur, ni
  seuil, ni borne.
- Rien n'est ingéré sans l'accord du responsable pour chaque envoi.
- La cible signée du 2026-10-18 n'est pas rouverte ; ne pas toucher au
  worktree `file-d1-suite`.
- Besoin 5 : l'auteur des signatures du 2026-11-16 reste indéterminé ; ne
  pas le rouvrir.
