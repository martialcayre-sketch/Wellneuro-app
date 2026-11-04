# Handoff — 2026-11-04 — t60 : fenêtre du questionnaire déclencheur de l'orientation (D-433)

## Branche et état du dépôt

- Branche `t60-fenetres-declencheur`, partie d'`origin/main` c5fa8304 ;
  worktree `.claude/worktrees/t59-fenetres-fraicheur` (réutilisé après le
  merge de t59), session concurrente de la file A, cycle en `git`/`gh` direct.
- **Chemin de release-db** : `web/src/lib/clinical/**`. Le déploiement reste
  retenu jusqu'à une release-db approuvée par le responsable ([[D-044]]),
  puis un constat par conteneur. Aucune migration, aucun changement de
  `schema.prisma`.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge. La session suit ensuite la release-db jusqu'au
  constat.

## Objectif

Coder [[D-433]] : quatre fenêtres de déclencheur au registre signé, lecture
datée du déclencheur dans le moteur, statut « non évalué » et son motif au
cockpit, exhaustivité des déclencheurs au banc et dans `tableSignee()`, et la
remarque P2 de `wn-reviewer` sur #1849 (`instrumentsSansFenetre` ignorait les
membres des packs) ; seconde re-signature de `ORIENTATION_RULES_V1`.

## Décisions prises

- Aucune décision neuve : le lot exécute [[D-433]] §1 à §6.
- Registre : `Q_MOD_01` 21, `Q_MOD_03` 14, `Q_INF_03` 14, `Q_ALI_01` 90,
  recopiées de §2 ; les quinze de [[D-430]] §2 intactes.
- Moteur (choix d'implémentation, présentés au responsable avant le code) :
  un déclencheur qui lit une passation hors fenêtre (ou sans fenêtre) se juge
  sur les seules passations fraîches ; atteint → la règle continue ; sinon il
  n'est pas évalué. Un déclencheur lu frais et non atteint écarte la règle
  (ET faux sur donnée fraîche). Une branche fraîche atteinte d'un `ou` suffit.
  Un vieux score sous le seuil laisse aussi la règle non évaluée (`DC-24`).
  Sans horloge, rien ne change (§5). Règles d'arrêt, contradictions, priorités
  et biologie lisent toujours sans date (hors périmètre de D-433).
- **Libellé du cockpit validé par le responsable** (question à options, le
  2026-11-04, « version complète ») : titre « Règles non évaluées : passation
  trop ancienne » ; ligne « {titre}, rempli le {date} : au-delà de sa fenêtre
  de {n} jours. {k} règle(s) non évaluée(s). » ; identifiants des règles ;
  « Une passation trop ancienne ne vaut ni signal ni absence de trouble : ces
  règles ne sont ni déclenchées ni écartées. La faire repasser reste votre
  décision. » ; état vide « Aucune exploration n'est proposée sur les
  passations à jour. Certaines règles n'ont pas pu être évaluées
  (ci-dessous). ». Non soumis : « sans fenêtre de fraîcheur connue », cas que
  `tableSignee()` rend inatteignable en production.
- P2 de #1849 : une suggestion de pack se nomme dans `instrumentsSansFenetre`
  (composition en base, invérifiable à la signature) → la table se refuse.
  Aucune règle ne vise de pack : rien ne change en production.
- **Attestation de la re-signature** : le praticien a répondu « j'atteste »
  dans la session du lot, le 2026-11-04, sur l'empreinte
  `a86301126b40d44be88463052741e12b91deb677f31f8134b7211423a41ebd20`, après
  relecture des quatre valeurs et de la contre-preuve (règles, grilles et
  quinze fenêtres de D-430 hachent encore `f10102a5…f86311ec7`). Recopie :
  `shaPerimetre` = cette valeur, `dateValidation` inchangée
  (`2026-11-04T00:00:00.000Z`) ; `f10102a5…` portée aux anciens sha signés.
  Aucun claim ajouté ni retiré (relus le 2026-11-03 pour t59).

## Fichiers modifiés

- `web/src/lib/clinical/orientationRulesV1.ts` : quatre fenêtres,
  `instrumentsSansFenetre` (déclencheurs, packs), métadonnées re-signées.
- `web/src/lib/clinical/orientationEngine.ts` : `PassationPerimee`,
  `RegleNonEvaluee`, `evaluerOrientationDetaillee` (`evaluerOrientation` en
  délègue la première moitié), `dansLaFenetre` partagé cible/déclencheur.
- `web/src/lib/clinical/orientationService.ts`,
  `web/src/app/api/praticien/orientation/route.ts` : `reglesNonEvaluees`
  servi, vide jamais absent.
- `web/src/components/patient-cockpit/OrientationPanel.tsx` : bloc des règles
  non évaluées, dans les deux branches de rendu.
- Tests : `orientationRulesV1.test.ts` (dix-neuf valeurs, sept déclencheurs,
  contre-épreuve des quatre, `ou`, pack, sha épinglé),
  `orientationEngine.test.ts` (bloc D-433 ; déclencheur frais dans les bancs
  D-430), `orientationService.test.ts` et `route.test.ts` (`Date` figée au
  2026-07-21, fenêtres de banc, cas pack de la route hors refus des packs,
  cas périmé servi), `OrientationPanel.test.tsx` (libellé, deux branches).
- `docs/FEATURE_FLAGS.md` (sixième terme élargi),
  `changelog.d/2026-11-04-t60-fenetre-declencheur-orientation.md`, ce handoff.

## Validations exécutées

- T1 complet : Vitest vert (1716 + 2375). Un rouge **hors lot** dans
  `node --test` : parité `BANCS_BALAYAGE` de `scripts/wn-controle-fusion.test.mjs`
  — `CaptureRepas.test.tsx` (#1857, d0f1017b, déjà sur `main`) n'y est pas
  inscrit. Routé (voir problèmes ouverts).
- T3 vert sur c4b79c68 : séquence CI complète, E2E Chromium + WebKit, 11 min
  11 s, sortie 0.
- `wn-reviewer` : PASSER, aucun P0/P1 ; empreinte et contre-preuve recalculées
  indépendamment. P2-1 routé au responsable (question) ; P2-2 routé (suite) ;
  P2-3 écarté (§4 « comme pour la cible », comptage hérité de D-430) ; P2-4
  écarté (la règle n'a effectivement pas été évaluée) ; P2-5 : deux bancs
  ajoutés (Q_MOD_03 à 14/15 jours sur le registre réel, écartées + non
  évaluées en liste vide), le troisième (règle d'arrêt) écarté, hors périmètre.

## Problèmes ouverts

- **Q1 (P2-1), au responsable** : une proposition écartée dont la règle devient
  non évaluée quitte le repli « écartées » (le geste reste en base). Même
  mécanisme qu'avant pour une cible qui n'est plus proposée. Acceptable au
  regard de D-433 §3 (« ne masque pas une plainte déjà portée à l'attention du
  praticien ») ? Sinon, lot de suite.
- P2-2, suite : `buildBlocOrientation` (`synthese/generation.ts`) ne dit rien
  des règles non évaluées au modèle ; D-433 §8 ne vise que le cockpit.
- Rouge hors lot : `CaptureRepas.test.tsx` absent de `BANCS_BALAYAGE`
  (`scripts/wn-controle-fusion.mjs`), à la file qui porte #1857 (H83).
- Effet au déploiement : avec le drapeau à `1`, une règle dont le déclencheur
  dépasse sa fenêtre cesse de proposer et paraît « non évaluée » au cockpit.

## Prochaine action exacte

1. PR, CI (`wn-attendre-ci`), revue CodeRabbit sur la tête (dérogation à
   proposer au responsable après deux refus de quota), commentaires lus.
2. Déclarer « prête @<sha> » ; ne pas merger (essai D-373).
3. Après le merge par l'intégrateur et l'approbation de la release-db :
   constat par `scalingo run -d` (`CONTAINER_VERSION`, drapeau
   d'orientation ; aucune lecture de dossier).
4. t60 → fait sur la page de la file A et dans la mémoire
   `suivi-file-a-artefact` (prochain identifiant de dette : t61).

## Interdits encore actifs

- Aucune migration ni changement de `schema.prisma`.
- Aucune fenêtre, aucun seuil, aucun facteur hors D-430 §2 et D-433 §2.
- Aucun seed ni E2E sur un dossier réel.
- Ne pas merger (essai D-373).
