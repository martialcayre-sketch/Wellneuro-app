# Handoff — 2026-11-04 — t59 : fenêtres de fraîcheur de l'orientation, une par instrument (D-430)

## Branche et état du dépôt

- Branche `t59-fenetres-fraicheur`, poussée (PR #1849). Après le renvoi de
  l'intégrateur, `origin/main` 16f038a0 y a été FUSIONNÉ (arbitrage du
  responsable : fusion plutôt que rebase et force-push), sans conflit ; aucun
  des commits #1839 à #1854 ne touche les fichiers du lot, et l'empreinte
  recalculée après la fusion est inchangée ; worktree `.claude/worktrees/t59-fenetres-fraicheur`,
  session concurrente de la file A, cycle en `git`/`gh` direct.
- **Chemin de release-db** : `web/src/lib/clinical/**`. Le déploiement reste
  retenu jusqu'à une release-db approuvée par le responsable ([[D-044]]),
  puis un constat par conteneur. Aucune migration, aucun changement de
  `schema.prisma`.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge. La session suit ensuite la release-db jusqu'au
  constat (chemin release-db).

## Objectif

Appliquer [[D-430]] §2 et §3 : les quinze fenêtres de fraîcheur, une par
instrument, remplacent les 365 jours uniformes de D-180 point 3 portés par les
vingt règles de `ORIENTATION_RULES_V1` ; une table incomplète est refusée ; le
registre entre dans l'empreinte signée, et la table est re-signée.

## Décisions prises

- Aucune décision neuve : le lot exécute [[D-430]] §2 et §3.
- Registre `FENETRES_FRAICHEUR_ORIENTATION` : les quinze valeurs de §2,
  recopiées telles quelles (arbitrages du praticien, aucune source).
- Moteur : la fenêtre se lit par instrument, quelle que soit la règle qui le
  propose ; un membre de pack lit la sienne. Avec une horloge, un instrument
  sans fenêtre (ou à fenêtre illisible) ne couvre pas sa cible — choix
  d'implémentation aligné sur « composition de pack inconnue = jamais
  couverte » ; le refus de la table entière, que §3 prescrit, est porté par
  `tableSignee()`. Sans horloge, rien n'expire (comportement antérieur).
- **Attestation de la re-signature** : le praticien a répondu « j'atteste »
  dans la session du lot, le 2026-11-04, sur l'empreinte
  `f10102a54de693b52882a69c8a2430c374772ff4a41951e982dfa91f86311ec7`, après
  relecture des quinze valeurs, du retrait des vingt `repetition` (règles
  hors `repetition` et grilles hachées à l'identique de `main`), et de la
  contre-revue Codex (PASSER). Recopie : `shaPerimetre` = cette valeur,
  `dateValidation` = `2026-11-04T00:00:00.000Z`. Ancienne empreinte
  `2a1f4840…` portée à la liste des anciens sha signés.
- Claims : les 23 de `claimsSource` relus en production le 2026-11-03
  (one-off détaché, lecture seule) — 23/23 `VALIDE`, `prescriptif`, actifs,
  `v1.0`, aucun supplanté.
- **D-433 (d59) reste hors de ce lot, arbitrage du responsable du
  2026-11-04.** Mergée pendant le lot (#1845), D-433 §8 rattachait son code
  au lot de D-430 §6 avec la même re-signature. Le responsable a choisi de
  livrer t59 tel quel, déjà signé et revu, et d'ouvrir D-433 en lot t60 :
  quatre fenêtres de déclencheur, lecture datée du déclencheur, statut « non
  évalué » et son motif au cockpit (libellé à soumettre), exhaustivité des
  déclencheurs au banc et à `tableSignee()`, seconde re-signature et seconde
  release-db. D'ici là, le déclencheur reste lu sans date, comme avant.
- d60 (consigne de la HAD) : constat, hors lot.

## Fichiers modifiés

- `web/src/lib/clinical/orientationRulesV1.ts` : retrait des vingt
  `repetition` et de leurs commentaires ; registre, `fenetreValide`,
  `instrumentsSansFenetre` ; empreinte `{ regles, grilles, fenetres }` ;
  métadonnées re-signées.
- `web/src/lib/clinical/orientationEngine.ts` : `EntreeOrientation.fenetres`,
  résolution par instrument dans `passationExploitable` et
  `cibleDejaCouverte`.
- `web/src/lib/clinical/orientationService.ts` : sixième terme de
  `tableSignee()` ; le moteur reçoit le registre haché.
- Tests : `orientationRulesV1.test.ts` (valeurs épinglées, exhaustivité et
  contre-épreuve, mutation d'une fenêtre, signature), `orientationEngine.test.ts`
  (fenêtre par instrument, jour anniversaire, sans fenêtre, pack),
  `orientationService.test.ts` (terme isolé du verrou, passation périmée).
- `docs/FEATURE_FLAGS.md` : date de signature (tableau épinglé), six termes.
- `changelog.d/2026-11-03-t59-fenetres-fraicheur-orientation.md`, ce handoff.

## Validations exécutées

- T1 complet vert (2095 tests) ; bancs d'orientation 223/223.
- T3 : 1 rouge en première passe (`verrousSignatureDocumentes.guard`, date
  du 2026-09-14 dans `docs/FEATURE_FLAGS.md`), corrigé ; rejoué vert
  (15863 tests, seconde suite 1713, sortie 0).
- Contre-revue Codex (dépôt privé des revues) : PASSER ; nuance du point 8
  corrigée (commentaires du moteur).
- `wn-reviewer` : PASSER, aucun P0. P1 attestation non tracée : corrigé (ce
  handoff) ; P2 commentaires périmés, `dejaRepondu` : corrigés ; P2 typage de
  `fenetres` : écarté (un seul appelant) ; P2 effet au déploiement : routé.
- Première déclaration « prête » renvoyée par l'intégrateur : aucune revue
  opposable (CodeRabbit en quota ; PR-Agent sur diff compressé, sortie 1 de
  `wn-revue-pr-agent.mjs` — la déclaration disait à tort « run complet »).
- CodeRabbit sur 6c7cb7d5 (13:05Z), trois remarques, toutes corrigées :
  exception du MEQ (365 jours) dans la note de déploiement ; six termes de
  `tableSignee()` dans `docs/FEATURE_FLAGS.md` ; identité de la cible pack
  dans le test du membre sans fenêtre.

## Problèmes ouverts

- **Effet au déploiement, voulu par D-430** : si `WN_ENABLE_ORIENTATION_NNPP2`
  vaut `1` et la table d'arrêt est exploitable, les cibles passent de
  365 jours à 7-90 jours (HAD, Epworth, Pichot, Cungi, DASS-21 à 7 jours) et
  reviennent avec « déjà renseigné ». Exception : le MEQ (`Q_SOM_05`) garde
  365 jours. `docs/FEATURE_FLAGS.md` donne le drapeau à `1` en production,
  relu sur Scalingo le 2026-09-13 ; son état du jour n'a pas été constaté
  (lecture des variables refusée en mode auto) : à relever au constat par
  conteneur.

## Prochaine action exacte

1. Après merge par l'intégrateur et approbation de la release-db : constat
   par `scalingo run -d` (`CONTAINER_VERSION` = sha mergé, aucune lecture de
   dossier), et état du drapeau d'orientation.
2. t59 → fait sur la page de la file A et dans la mémoire
   `suivi-file-a-artefact` (prochain identifiant de dette : t60).
3. Lot t60 : code de D-433, sur la base de ce lot une fois mergé.

## Interdits encore actifs

- Aucune migration ni changement de `schema.prisma`.
- Aucune fenêtre, aucun seuil, aucun facteur hors D-430 §2.
- Aucun seed ni E2E sur un dossier réel.
- Ne pas merger (essai D-373) ; ne pas coder D-433 dans ce lot ; d60 reste un constat.
