### Registre de certification des instruments du catalogue (2026-07-25)

Campagne « certification corpus des questionnaires », lot 1. Nouveau
`docs/claude/corpus/instrument_registry.json` : une entrée par questionnaire du
catalogue (63) portant des **axes séparés, jamais fusionnés** — forme publiée
de l'instrument (auteurs, année, items ; aucun DOI/PMID sans vérification),
version réellement servie (`description` laissée **null** tant que le banc du
lot 3 ne l'a pas établie contre le catalogue : la renseigner de mémoire ferait
disparaître les divergences déjà constatées sur Berlin, MFI-20 et PSQI),
traçabilité de la vérification bibliographique (`dateVerification`/`verifiePar`
null = référence identifiée mais non vérifiée), droits, qualité psychométrique
publiée `cosmin` (distincte des niveaux A/B/C/D WellNeuro, qui restent dans
`equilibre/constants.ts`), cycle de vie de certification (`repere` → … →
`publie`), politique de suivi, et flag factuel `sourceMonEquilibre` (11
instruments alimentent `BESOIN_SOURCES`). Nouveau
`docs/claude/corpus/measurement_evidence.json` (squelette des preuves
psychométriques, une ligne par étude × propriété).

Les règles de validation vivent dans un module pur
`scripts/lib/verifier_registre_instruments.js`, appelé par le garde CI et
couvert par son propre banc (`npm run registry-check`, 15 cas) : cohérence
catalogue↔registre, vocabulaires fermés, `sourceIds` et `driveMd` existants,
`sourceMonEquilibre` aligné sur `BESOIN_SOURCES` — extraction **scopée au bloc**
et qui échoue si elle ne trouve rien, plutôt que de rendre le garde muet. Le
garde entre au palier T1 (`npm run check`), leçon LOT-01b. Zéro changement
clinique : `questions.ts` et les fixtures sont intouchés.
