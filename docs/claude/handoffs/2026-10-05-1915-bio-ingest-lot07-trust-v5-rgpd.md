# Handoff — 2026-10-05 — BIO-INGEST LOT-07 : `usage_ia` v5 et registre RGPD

## Branche et état Git

`docs/bio-ingest-lot07-trust-v5-rgpd`, depuis `main` a60f77ad. Migration du
LOT-07 (#1326) appliquée et constatée en production (handoff précédent).

## Objectif

`D-267` §8 : déclarer avant de relever. Servir « L'intelligence artificielle
dans Wellneuro » v5 et mettre le registre RGPD à jour, avant tout code
`bio-extraction-v2`.

## Décisions prises

- `usage_ia` v5, sans accusé, publiée le 2026-10-05 : seul le paragraphe du
  relevé change (intervalle et marque d'anomalie tels qu'imprimés, recopiés
  sans être complétés ; « l'outil ne déclare lui-même aucune valeur normale ou
  anormale »).
- `donnees_confidentialite` reste en v12 (`D-267` §8).
- Dossier RGPD : puce « Faits du laboratoire » au §2 ter (aucun flux nouveau,
  une donnée conservée au-delà de la purge), table santé, rubrique 8, note
  versée au réexamen AIPD (rubrique 13), sans rouvrir la conclusion du
  2026-10-04.
- `FEATURE_FLAGS.md` : la ligne `WN_BIO_INGEST_ENABLED` exige la v5 avant
  `bio-extraction-v2`.

## Fichiers modifiés

`web/src/lib/trust/contenus/registre.ts` et `.test.ts`, `docs/DOSSIER_RGPD.md`,
`docs/FEATURE_FLAGS.md`, fiche LOT-07 (case migration cochée),
`changelog.d/2026-10-05-bio-ingest-lot07-trust-v5-rgpd.md`, SESSION_LOG, ce
handoff.

## Validations exécutées

`vitest src/lib/trust` 72/72 ; `npm run check` vert ; T2 `--fast` lancé.

## Problèmes ouverts

- Intervalle de plus de 300 caractères : comportement à trancher au code.
- Questions BioFlow (Track C, axes, signataire NABM) inchangées.

## Prochaine action exacte

Merge, déploiement constaté (`D-248`), puis constat de la v5 servie (page
portail « informations » ou lecture du registre déployé) ; cocher la case
TRUST de la fiche. Ensuite seulement le code (`bio-extraction-v2`), passe
Codex obligatoire.

## Interdits encore actifs

- Pas de code d'extraction avant la v5 constatée en production.
- Rien sur `ResultatBiologique` ; aucun intervalle recalculé ni citable.
- Aucun nouveau pack biologique clinique ; aucune identité réelle.
