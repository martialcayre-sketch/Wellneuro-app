# Handoff — 2026-11-13 — t49 : enquête alimentaire SiiN incomplète non calculée (D-517, D-403 §6, consigne `synthese-v35`)

## Branche et état Git

`feat/t49-siin-incomplete-non-calculee`, worktree `.claude/worktrees/t49-cadrage` (session concurrente). La branche n'avait aucun commit quand `main` a avancé. Elle a été recréée deux fois sur `origin/main` par `git switch -C`, sans merge ni rebase (liberté de cycle du 2026-11-11), en dernier sur `904caeed`.
- Commit du lot : `68cc8c75`.
- `origin/main` (`d9c4f769`, #2084, une ligne au §8 du plan, sans chevauchement) fusionné par `c4e0b465`, sur arbitrage du responsable du 2026-11-13.
- Ni migration ni changement de `schema.prisma`.
- Le diff touche `web/src/lib/clinical/` (un banc d'orientation) : **la release-db est proposée au merge**, sans migration, et attend l'approbation du responsable.

## Objectif

Appliquer [[D-403]] §6 (ligne t49 du §8 du plan, fiche H40) : l'enquête SiiN à 57 items ne se calcule plus dès qu'un item manque. Avant ce lot, le moteur `seuils_points` rendait un total et une bande dès une réponse.

## Décisions prises

- Cadrage : cinq questions cliniques, `20261113-2120-a` à `2124-a` (page D), avec l'avis Codex joint ([[D-505]] §5).
- Le responsable les a tranchées le 2026-11-13, chacune à l'option recommandée, et a fixé le texte « Enquête alimentaire incomplète : score non calculé. ».
- Sur (e), version du score inchangée, le responsable a retenu l'option contraire à l'avis Codex (changer la version, confiance moyenne).
- `D-517`, réservée par `wn-reserver-decision` :
  - les 57 items sont requis ; un seul manquant rend l'enquête non calculée (`scored: false`, ni total, ni bande) ;
  - les catégories descriptives restent servies avec leurs comptes ;
  - fiche, export et synthèse disent le texte validé ; consigne `synthese-v35` ;
  - la passation ne nourrit ni le besoin 1, ni le besoin 3 (motif `recueil_incomplet`), ni le rideau T0 ;
  - l'orientation ne tient plus la passation pour une réponse ;
  - aucune reprise de données ; `VERSION_SCORE_EQUILIBRE` reste `v17`.
- Le paragraphe de la consigne v35 est rédigé par la session et cité en entier en [[D-517]] §3. Le responsable n'a validé que le texte affiché.

## Fichiers modifiés

- **Moteur** :
  - `web/src/lib/questions.ts`, branche `seuils_points` ;
  - `web/src/lib/scoring/enqueteAlimentaireIncomplete.ts` (nouveau, module pur : texte et prédicat d'affichage) ;
  - `web/src/lib/doctrine/seuilsCatalogue.instantane.json` (étape `D-517` au `moteur`).
- **Lecteurs** : `web/src/lib/equilibre/score.ts` (motif du sous-score), `web/src/components/FichePatientPanel.tsx`, `web/src/lib/export-dossier/sectionQuestionnaires.ts`, `web/src/lib/anthropic.ts` (v35).
- **Bancs** :
  - nouveau : `enqueteAlimentaireIncomplete.test.ts` ;
  - complétés : `alimentaireSiin57.guard.test.ts`, `score.test.ts`, `preconditionsT0.test.ts`, `sectionQuestionnaires.test.ts`, `FichePatientPanel.test.tsx` ;
  - ajustés au moteur nouveau : `orientationRulesV1.test.ts`, `promptSousScores.guard.test.ts`, `passationVide.guard.test.ts`, `axeNonMesure.guard.test.ts` ;
  - empreintes v35 : `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`.
- **Docs** :
  - `docs/decisions/D-517.md` ;
  - `changelog.d/2026-11-13-d517-siin-incomplete-non-calculee.md` ;
  - `docs/questionnaires-drive-mapping.md` (ligne `Q_ALI_01`) ;
  - `docs/claude/PLAN_WELLNEURO.md` §8 (t49 soldée) ;
  - `docs/claude/plan-journal/H40/2026-11-13-01-incomplet-non-calcule-d517.md` ;
  - ce handoff.

## Validations exécutées

- Bancs touchés par le lot (67 fichiers, 1 865 tests), joués dans les deux positions de `WN_ALI_01_SIIN57` : verts, sauf le contrôle de l'instantané avant l'écriture de D-517, attendu, puis vert.
- Recomptage de production avant merge, le 2026-11-13 vers 21 h 50 UTC, par conteneur détaché en lecture seule, agrégats seulement : 20 SiiN à 57 items, toutes complètes ; 8 formes courtes ; **0 passation partielle**. Résultat identique au cadrage.
- Contre-revue Codex P0 en mode `revue` sur le diff `68cc8c75` : conforme, aucun constat. Codex dit ne pas pouvoir vérifier la normalisation des réponses vides. La session l'a vérifiée : `getVal` rend `null` pour `undefined`, `null` et la chaîne vide, et `NaN` pour une valeur non numérique, deux cas comptés manquants.
- T1 complet (`npm run check`) et suite Vitest entière drapeau allumé (`npm run test:siin57`) : résultats dans la PR.

## Problèmes ouverts

- Une passation partielle scorée AVANT le déploiement garderait son total et sa bande enregistrés à la fiche, à l'export et dans la synthèse ([[D-517]] §5). Il n'y en a aucune en production, mais le recomptage d'après déploiement doit le reconfirmer.
- Le paragraphe v35 de la consigne n'a pas été relu mot pour mot par le responsable (seul le texte affiché l'a été).
- Dettes héritées de t77, sans porteur : `ProtocolMiniBuilder.test.tsx` dépasse son délai sous charge en T3 ; le cockpit lit deux fois le corpus.

## Prochaine action exacte

1. PR (`--body-file`), avis Codex en commentaire, CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. Revue PR-Agent sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → `0`), sinon `wn-reviewer` ([[D-499]]) ; un verdict par commentaire ; « prête @<sha> » pour l'intégrateur.
3. Avant le merge, si plusieurs heures ont passé depuis le recomptage ci-dessus, le rejouer (même requête agrégée, en lecture seule). Une passation partielle trouvée ⇒ retour au responsable.
4. Après le merge :
   - release-db approuvée par le responsable (aucune migration) ;
   - constat par conteneur que la version servie porte `synthese-v35` ;
   - recomptage d'après déploiement.
5. Pages A et D :
   - ligne t49 soldée ;
   - questions `2120-a` à `2124-a` closes au merge ;
   - lot `t49-1` à `fait`.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`, jamais de `printenv` ; écriture par release-db approuvée seulement (`D-087`).
- Aucune migration ni modification de `schema.prisma` ; aucun seuil, poids ni borne inventé.
- Texte « Enquête alimentaire incomplète : score non calculé. » : toute retouche revient au responsable.
- Pas de pull, de merge ni de rebase d'une branche qui porte des commits sans arbitrage du responsable.
- Aucune identité réelle ; l'adresse de la page D jamais écrite dans le dépôt.
