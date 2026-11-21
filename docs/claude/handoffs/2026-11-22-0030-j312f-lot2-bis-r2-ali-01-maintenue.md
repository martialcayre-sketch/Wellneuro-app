# Handoff — 2026-11-22 — J3-12f, lot 2 bis : R2-ALI-01 maintenue, condition de convergence du besoin 1 exclue (D-555), table à re-signer

## Branche et état Git

- Branche `docs/j312f-lot2-bis-r2-ali-01-maintenue`, créée directement sur `origin/main` (tête `9f77744be`) ; un commit local de documentation (`781d8148d`), le reste en cours d'indexation. **Rien n'est poussé.** Le travail du lot 2 d'origine (suspension) est gardé en commit local `2885634e8` sur `fix/j312f-lot2-suspension-r2-ali-01`, sans push ni PR : il resservira si la recherche du déclencheur ne trouve aucune source certifiée.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. Aucune PR avant la signature.

## Objectif

Appliquer la réponse du responsable du 2026-11-22 (`20261122-0003-b`, option intermédiaire de la question T3) : `R2-ALI-01` reste publiée avec sa suggestion ; la condition de convergence `Q_ALI_01` → besoin 1 cesse de compter, rattachement gardé ; le responsable re-signe la table ; recherche du déclencheur dans la famille du besoin 4 ; écart revu à l'allumage de `WN_CONSTAT_BESOIN`.

## Décisions prises

- `D-555` (numéro réservé à la rédaction), **proposée** : amende `D-549` en entier, précise `D-548` §5.5. L'écart avec `D-516` est dit **indirect** ; la tension avec `D-516` §5.5 (aucune tranche sur la mesure dérivée sans provenance) est écrite, aucun seuil proposé.
- Mécanisme retenu : une ligne dans `EXCLUSIONS_CONVERGENCE_V1` (`Q_ALI_01` / besoin 1), mécanisme existant relu par le moteur à l'ouverture et au compte. Écartés : la liste « sans compte », un champ neuf du moteur, le statut de la règle.
- Provenance du rattachement non corrigée dans ce lot (une seule différence dans la signature) : elle part avec le lot de réécriture.

## Fichiers modifiés

- `web/src/lib/clinical/convergenceV1.ts` (une ligne d'exclusion, commentaire) ; tests : `exclusionQAli01Besoin1.guard.test.ts` (neuf), `clinical-engine/tableOrientationHorsEmpreinteCartes.guard.test.ts` (repris du lot 2, retourné), `convergenceEngine.test.ts`, `orientationRulesV1.test.ts`.
- `docs/decisions/D-555.md` (neuf), pointeurs au pied de `D-548` et `D-549` ; fragment journal H15 `2026-11-22-01` ; `changelog.d/2026-11-22-j312f-r2-ali-01-maintenue.md` ; ce handoff.

## Validations exécutées

- `npx vitest run` complet : 18 388 passés, 2 rouges voulus (les deux bancs de signature de `orientationRulesV1.test.ts`, tant que la table n'est pas re-signée). `check:rapide` : même deux rouges.
- Preuve par banc : la table sans la ligne hache `6088b3c6…` (signature du 2026-11-19) ; avec la ligne, `a28e99e636bc28df98c7dab06080eb69d7e85160640a52e1069b3187059c7fc0`. Banc comportemental : cliché, revue et carte de décision ont les mêmes empreintes avec et sans la ligne. Banc d'imports élargi à `lib/equilibre`.
- Production, par conteneur en lecture seule, agrégats : 18 dossiers avec l'enquête, 7 en zone défavorable, 5 frais (90 jours) et complets : cinq constats de convergence vers le besoin 1 disparaissent (borne haute) ; aucun effet sur les propositions ; version du score inchangée.
- Gardes docs : numérotation des décisions, journal du plan, anti-secrets, collate.
- Chemin P0, un passage chacun : contre-revue Codex (`--mode revue`) : deux P2, corrigés (garde d'imports qui tolère un commentaire dans `import(…)` ; contre-épreuve étendue aux claims et à la limite du besoin 1). `wn-reviewer` : aucun P1 ; P2 corrigés (motif de l'exclusion qui affirmait au présent que la source du besoin 1 était déjà la mesure dérivée, avant la vague 1 ; limite du banc comportemental dite, avec un banc ajouté sur le service des contradictions) ; question au responsable sur le silence du constat retiré (D-555 §7, point 3) ; P3 pris (exclusion par instrument entier, synthèses déjà générées, renvoi §7, coquille d'empreinte).

## Problèmes ouverts et prochaine action

- **La signature de la table d'orientation reste au responsable** : poser `dateValidation` et `shaPerimetre` à l'empreinte ci-dessus, et la constante du banc. Les deux bancs rouges le disent.
- Après la signature seulement : T3, sonde `wn-sonde-release-db` (le chemin clinique déclenche release-db), PR avec `--body-file`, CI, revue PR-Agent, déclaration « prête @sha ».
- Lot de réécriture de `R2-ALI-01` (famille du besoin 4, méthode `D-312`) ; sans source certifiée, reprise du lot 2 local. Revue de l'écart à l'allumage de `WN_CONSTAT_BESOIN`.
- Vague 1 de `D-548` : la condition cesse de compter avant elle, comme son §5.5 le voulait.

## Interdits encore actifs

- Aucune signature par l'assistant ; aucun rejet, étiquetage ni écriture en production hors l'ingestion accordée ; aucun code clinique, seuil ni `BESOIN_SOURCES` au-delà de la ligne d'exclusion ; aucun texte de claim ni donnée patient au dépôt (`D-251` §4) ; production lue seulement par conteneur `scalingo run -d`, en lecture ; pas de push du commit local du lot 2.
