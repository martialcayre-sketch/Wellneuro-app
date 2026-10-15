# Handoff — 2026-10-15 — BP-04 : l'attente nomme ses analytes (code de D-305)

## Branche et état Git

- Branche `feat/bp04-attente-analytes-d305`, depuis `origin/main` à
  `7a5969c3` (#1471, D-305), worktree `bio-ingest-cloture`.
- Une PR, sans migration, sans drapeau, sans release-db.

## Objectif

Coder BP-04 selon D-305 : codes d'analytes dans l'attente (V4 et C4),
vérification au catalogue, borne de D-190 §3 tenue par le serveur, lecture
« non typée » des attentes sans codes, bancs d'empreinte V4 et C4.

## Décisions prises

- `ProtocolWaitFor.analyteCodes` : exigé non vide par `buildProtocolDraft`
  (seul écrivain ; la relecture ne repasse pas par lui), dédupliqué et trié.
  Lecteur tolérant `estAttenteTypee` et libellé `LIBELLE_ATTENTE_NON_TYPEE`
  dans `clinical-engine/types.ts`, communs aux deux véhicules.
- C4 : `lireConditionBiologique` lit le champ ; présent mais malformé, la
  condition est illisible. L'atelier refuse une condition qui porte des codes.
- Route des versions : catalogue (`actif: true`), puis proposition
  re-dérivée à l'instant ; refus 422 `analyte_inconnu`,
  `attente_hors_proposition`, `proposition_indisponible`. Rien n'est lu quand
  la soumission ne pose aucune attente.
- Prédicat `ligneOuvreUneAttente` dans la feuille `vocabulaireStatuts.ts`,
  lu par la route et par l'écran.
- **Lecture de l'arbitrage 6, à faire confirmer par le responsable** : une
  action suspendue identique en tout point (égalité canonique) à celle de la
  version active n'est pas rejugée — sinon la révision après arbitrage se
  bloque dès que le bilan revenu fait passer la ligne « déjà documenté ».
  Première rédaction sur `actionId` + codes : réfutée par la contre-revue
  (P1, le constructeur renumérote depuis `action-1`), corrigée.

## Fichiers modifiés

- `web/src/lib/clinical-engine/{types,protocolDraft}.ts`, `protocolV4.test.ts`
- `web/src/lib/supplement-library/{decisionAvantBiologie,gouvernance}.ts`,
  `attenteC4.empreinte.test.ts` (neuf)
- `web/src/lib/biology-library/{attentesBornees.ts,attentesBornees.test.ts}`
  (neufs), `vocabulaireStatuts.ts`, `boucleRevision.test.ts`
- `web/src/app/api/praticien/protocoles/versions/route{,.test}.ts`,
  `web/src/app/api/praticien/regles/route.test.ts`
- `web/src/components/patient-cockpit/{ClinicalRuntimeSection,ProtocolMiniBuilder,ArbitrageBiologiquePanel}.tsx`
  et les bancs des deux derniers
- `web/e2e/biologie-arbitrage-revision.spec.ts`
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : la route consomme la
  table d'indications biologiques), fiche LOT-04, `CAMPAGNE.md`,
  `changelog.d/2026-10-15-bp04-attente-typee-code.md`

## Validations exécutées

- Empreintes de référence mesurées par une sonde jetable sur le code d'avant
  (V4 sans attente, V4 à attente non typée, lecture C4) ; bancs verts.
- T1 rapide et T1 complet (`npm run check`) verts après les correctifs de
  contre-revue.
- T2 (`npm run test:worktree -- --fast`) vert : 271 passés, 3 ignorés, dont
  le parcours d'arbitrage (code lu dans la proposition de PAT_SEED_02). Joué
  avant le correctif P1 (module pur + clause `actif`), couvert depuis par T1.
- Contre-revue `wn-reviewer` : huit affirmations confirmées, un P1 corrigé.
- Production, par conteneur, en agrégats (2026-10-15, 13 h 01) : 4 versions,
  aucune attente posée.

## Problèmes ouverts

- Arbitrage du responsable sur la lecture de l'arbitrage 6 (ci-dessus).
- Fenêtre résiduelle : le code en production pose encore des attentes sans
  codes jusqu'au déploiement ; recompter juste avant le merge.
- `reviseProtocolDraft`, sans appelant de production, lèverait sur une V4 non
  typée : piège pour un futur appelant.
- Un futur écran qui pré-remplirait depuis la version active devra afficher
  les codes que la proposition ne retient plus (à noter pour BP-16).

## Prochaine action exacte

Ouvrir la PR, attendre le CI (`node scripts/wn-attendre-ci.mjs <N>` en
fond), lire les trois sorties de revue CodeRabbit, recompter par conteneur,
merger, constater le déploiement.

## Interdits encore actifs

- Aucune règle, aucun seuil, aucun plafond ; aucune empreinte enregistrée ne
  bouge ; aucune attente posée par une machine.
- Réveil, état « à arbitrer », carte au Fil et date du contreseing : BP-16.
- Pas d'auto-merge sur une PR de lot ; un merge à la fois.
