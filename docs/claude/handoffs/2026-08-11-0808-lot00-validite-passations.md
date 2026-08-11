# Handoff — 2026-08-11 — LOT-00 : la validité des passations, statut porté et geste praticien

## Branche et état Git

- Travail livré sur `campaign/2026-08-10-chaine-t0…/lot-00` puis `…/lot-00-suite`,
  mergé en quatre tranches vers `campaign/2026-08-10-chaine-t0…/integration`
  (#645, #647, #648). La migration est partie **en avance** vers `main` (#646).
- Ce handoff part en PR de doc séparée, depuis `origin/main` : la fenêtre de
  clôture a été fermée par le squash de #648.
- Session Mac (E2E disponibles). Les tranches 1–2 ont été produites en session
  distante, sans navigateur Playwright.

## But du lot

Aucune donnée invalidée ne doit continuer à alimenter un raisonnement clinique
(synthèse, orientation, équilibre/momentum, cockpit), et l'invalidation doit
devenir **un geste praticien tracé**, pas un déploiement de code.

## Livré

- **Migration `20260811030000_validite_questionnaire_reponses`** — cinq colonnes
  sur `questionnaire_reponses` (`statut_validite` défaut `VALID`, `invalide_le`,
  `invalide_par`, `motif_invalidation`, `supersedes_reponse_id`), index
  `(id_patient, statut_validite)`, et **CHECK** énumérant les cinq statuts
  (ajouté sur revue Copilot). **Appliquée en production**, release-db `success`,
  cinq colonnes vérifiées en base.
- **`web/src/lib/scoring/validite.ts`** — doctrine + `filtrerPassationsExploitables()`,
  derrière `WN_ENABLE_VALIDITE_PASSATIONS`. `VALID`/`AMBIGUOUS` alimentent le
  raisonnement ; `INVALID`/`SUPERSEDED`/`HISTORICAL_ONLY` en sortent, mais la
  ligne reste lisible partout ailleurs (inbox, audit, `dejaRepondu`). Champ
  absent ⇒ `VALID` : l'exclusion ne s'applique qu'à un statut explicitement porté.
- **Quatre consommateurs branchés** — synthèse (filtre *avant*
  `estAdministrableParLaRoute` : une passation exclue n'atteint ni le prompt ni
  `donneesEntree`), orientation (cinquième motif nul de `scoresPourOrientation`),
  équilibre/momentum (`depuisPrisma` : réponses par questionnaire, `resoudreDateT0`,
  historique), cockpit. Huit `select` Prisma remontent désormais `statutValidite`.
- **`web/src/lib/scoring/invalidation.ts`** — domaine pur : seules `VALID ↔ INVALID`
  sont posables depuis un écran ; motif obligatoire (5–500 caractères) pour
  retirer, interdit pour rétablir.
- **`POST /api/praticien/questionnaires/validite`** — 503 drapeau éteint, 401 si
  la session ne porte pas d'e-mail (sinon `invalidePar` serait vide), double
  vérification d'appartenance (patient du praticien, passation du patient),
  idempotente, journalisée.
- **UI inbox** — bandeau « Retirée du raisonnement clinique » + motif, gestes
  Retirer / Confirmer / Annuler / Rétablir, rendus **seulement** si le filtre est
  actif. Drapeau éteint : l'écran est strictement inchangé.
- Deux bancs longitudinaux dans `depuisPrisma.test.ts` : une re-passation laisse
  l'ancre T0 à la première date ; une passation `SUPERSEDED` la déplace.

## Trois exigences de la spec refusées, et pourquoi

1. **`SUPERSEDED` posé automatiquement à la re-passation** — refusé. Une re-mesure
   à J21 n'annule pas T0 : `construireHistoriqueEquilibre` reconstruit chaque
   jalon depuis les passations connues *à cette date-là*. Marquer l'ancienne
   ferait disparaître le point de départ, et avec lui tout le momentum.
   `SUPERSEDED` désigne un **remplacement décidé par le praticien**, jamais un
   geste du moteur.
2. **Absorber `passationsNonInterpretables.ts` dans `INVALID`** — refusé. Le
   registre dit autre chose : la passation a eu lieu, les réponses brutes sont
   vraies, mais le résultat calculé n'est pas une mesure — elle est donc
   transmise **nommée-mais-vidée**, ce qui laisse au praticien le signal « mesure
   à replanifier ». La convertir effacerait ce signal. Les deux se complètent.
3. **Script de reprise initialisant `INVALID` depuis le registre** — abandonné,
   conséquence directe du point 2.

## Validations exécutées

- Vitest complet vert : **4316 tests**, 21 ignorés. T1 vert. Anti-secrets vert.
- T2 (`--fast`) sur le Mac, sur `lot-00-suite` : **134 passés**, 2 échecs — les
  deux sur `portail-lien-magique`, un défaut de banc **antérieur au lot** et sans
  rapport avec lui (corrigé à part, PR #651).
- CI `verify` vert sur les trois PR ; production relue après release-db.

## Réserve ouverte — une seule, et elle est de spec

**La déduplication à la génération de synthèse n'est pas livrée** (« dernière
passation `VALID` par instrument »). Elle a été renvoyée au LOT-01 pendant la
session, mais **ce renvoi n'a jamais été écrit dans
`lots/LOT-01-gardefous-synthese-contradictions.md`** : en l'état, l'exigence est
orpheline et disparaîtrait au prochain lot. C'est le premier geste à poser.

## Prochaine action exacte

1. Écrire la déduplication dans le périmètre du LOT-01 (sinon elle se perd).
2. Ouvrir la PR de campagne `integration → main` : fusion vérifiée propre
   (`git merge-tree`), **aucun changement sous `web/prisma/`** — migration et
   `schema.prisma` sont déjà identiques des deux côtés (le triple point les
   affiche quand même : il compare à la base de fusion, pas à la pointe de `main`).
3. Décider de l'allumage de `WN_ENABLE_VALIDITE_PASSATIONS` — geste à part.

## Interdits encore actifs

- Ne jamais poser `SUPERSEDED` automatiquement à une re-passation.
- Ne pas absorber le registre des passations non interprétables.
- Zéro implicite : une passation exclue est **absente**, jamais comptée à 0.
- Allumer le drapeau active **à la fois** le filtre et la route d'invalidation.
- Aucun changement de scoring ni de seuil dans ce lot.
