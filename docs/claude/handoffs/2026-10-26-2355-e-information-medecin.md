# Handoff — lot (e) de D-283 §10 : l'information du médecin dans chaque lettre (D-377)

## Branche et état du dépôt

- Branche `lot/e-d377-phrase-medecin`, worktree `j3-12e-ingestion`, partie
  de `origin/main` (58bb608d). Aucune migration. Un fichier sous
  `web/src/lib/clinical/` (`courrierAdressage.ts`) : le merge lance une
  release-db, qui attend l'approbation du responsable (D-044 §3, D-374 §2).

## Objectif

Code du lot (e) de D-283 §10, texte écrit par D-377 : chaque lettre adressée
à un médecin porte la phrase validée sur ses coordonnées et ses droits.

## Décisions prises

- Texte : D-377 §1, mot pour mot ; apostrophes typographiques, comme le reste
  des lettres.
- Placement, arbitré par le responsable le 2026-10-26 (question à options) :
  dernier paragraphe du corps, juste avant « Avec mes remerciements… », dans
  les trois lettres. Lecture littérale « juste avant la signature » écartée.
- Une constante unique, `correspondance/informationMedecin.ts`, qui lit
  `GOUVERNANCE_TRUST.contactDroits` (D-377 §2). Elle n'est pas dans
  `signature.ts` : celui-ci est atteint par un composant client via le
  registre des gabarits.
- Le registre signé des gabarits ne porte que les messages au patient : les
  trois lettres n'y sont pas, aucune version n'y change.

## Fichiers modifiés

- `web/src/lib/correspondance/informationMedecin.ts` (+ test, neufs).
- `web/src/lib/clinical/courrierAdressage.ts`,
  `web/src/lib/biology-library/courrier.ts`,
  `web/src/lib/correspondance/courrierComplement.ts` : la phrase avant la
  politesse ; leurs bancs (place de la phrase, texte exact du courrier
  complément).
- `web/src/lib/trust/gouvernance.ts` : en-tête, premier consommateur.
- `docs/claude/PLAN_WELLNEURO.md` (H26), `changelog.d/2026-10-26-e-information-medecin.md`,
  SESSION_LOG.

## Validations exécutées

- Vitest ciblé (correspondance, lettres, trust, documents, routes des trois
  courriers, composants patient) : 3283 verts.
- T1 : vert. T3 : séquence CI complète verte en 9 min 5 s (E2E Chromium et
  WebKit, 300 verts), sur 58bb608d ; main fusionnée ensuite (#1723, docs
  seules).
- `/code-review medium` : six constats, tous écartés avec motif (PR) — dont
  le bundle client : les trois générateurs ne sont importés que par des
  routes et des modules serveur qui chargent déjà `node:crypto`.

## Problèmes ouverts

- Les lettres déjà consignées gardent leur texte, sans la phrase : D-377 §2
  vise chaque lettre nouvelle.
- Code de (a) (D-378, nouvelle version de « Vos données personnelles ») :
  à ranger, lié à bg.

## Prochaine action exacte

CI en fond, CodeRabbit sur la tête, aucun run release-db non conclu (D-374
§5, gel intégral), merge, release-db approuvée par le responsable,
déploiement observé.

## Interdits encore actifs

- Gel intégral jusqu'à la sonde H88 : aucun merge tant qu'un run
  `release-db` n'est pas conclu. Jamais d'auto-merge.
- Ne pas toucher les PR et branches des autres sessions (#1717, #1721,
  `lot/t45-profil-acides-gras`).
