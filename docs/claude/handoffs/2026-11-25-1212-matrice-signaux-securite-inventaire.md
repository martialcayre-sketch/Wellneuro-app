# Handoff — 2026-11-25 — Matrice de consommation : table des signaux de sécurité

Lot `matrice-signaux-securite-inventaire` (file D, P2, lieu cloud), mené par
la passe de l'orchestrateur cloud `20261125-1209-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-e0tt90`, avancée en `--ff-only` sur
  `origin/main` à `6450f72a`.
- Un commit de lot, poussé ; PR en brouillon ouverte sur `main`.

## Objectif

Déclarer la table des signaux de sécurité dans `SOURCES_DE_SAVOIR`
(dette sans rang du plan, §8), régénérer `docs/claude/MATRICE_CONSOMMATION.md`,
ajouter un cas au banc. Déclaration d'inventaire pure.

## Décisions prises

- Identifiant `signaux-securite-anamnese`, module
  `web/src/lib/clinical/safetySignalsV1.ts`, symboles `SAFETY_SIGNALS_V1` et
  `SAFETY_SIGNALS_METADATA` (même forme que les tables voisines ; les
  appelants se trouvent aussi par l'import du module).
- Garde déclarée : `tableSignauxSecuriteSignee` dans le module même (patron
  de `fiches-usage-besoin2`) ; la matrice en dérive le verrou de donnée
  `validationExterne` et aucun drapeau.
- Source consommée (11 surfaces, dont la route du courrier d'adressage en
  direct) : pas de dormante, donc aucun arbitrage à écrire dans
  `consommation_decisions.json` — la clause de blocage du lot ne joue pas.
- Ligne de la dette dans `PLAN_WELLNEURO.md` §8 annotée « soldée », comme ses
  voisines (ligne de tableau, pas une fiche Fnn/Hnn : pas de fragment de
  journal).

## Fichiers modifiés

- `scripts/wn-matrice-consommation.mjs` (entrée de `SOURCES_DE_SAVOIR`)
- `scripts/wn-matrice-consommation.test.mjs` (un test sur ce dépôt)
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée, 26 sources)
- `docs/claude/PLAN_WELLNEURO.md` (ligne de dette soldée)
- `changelog.d/2026-11-25-matrice-signaux-securite-inventaire.md`
- ce handoff

## Validations exécutées

- `node --test scripts/wn-matrice-consommation.test.mjs` → 47/47 (dont
  fraîcheur du Markdown, existence des symboles et accesseurs, toute dormante
  arbitrée).
- `node scripts/wn-matrice-consommation.mjs --strict` → 0.
- T1 : `npm run check:rapide` → 0 (18 étapes vertes) ; `npm run check` → 0 (après `prisma generate`, absent du clone frais).
- T2/T3 non joués : interdits à la passe cloud, non exigés (outillage seul).

## Problèmes ouverts

- Aucun propre au lot.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

- Aucun merge, release-db, signature ni réponse à une question depuis la
  passe cloud ; pas de second lot.
- Aucune modification de `safetySignalsV1.ts` ni de ses appelants (logique
  clinique) ; aucune décision inventée dans `consommation_decisions.json`.
