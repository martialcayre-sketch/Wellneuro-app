# Handoff — 2026-10-23 — J1-cockpit-b : provenance datée, garde de frontière, Q9 et Q10

## Branche et état Git

- Branche `j1-cockpit-b-provenance`, partie d'`origin/main` (99166e2d,
  avancée en fast-forward avant tout commit), worktree `j3-12e-ingestion`
  (session concurrente, cycle en git/gh direct).
- Code, une PR (F59, rang 3, file A, r3_07) ; second et dernier lot de
  J1-cockpit après J1-cockpit-a (#1663).

## Objectif

D-333 §2 règle 1 (provenance datée de chaque chiffre du cockpit), règle 5 et
§6 (garde de frontière du portail), Q9 (mention du plafond D-106) et Q10
(retrait de `trajectoire[].valeur` et `momentum.delta` de l'API du portail).

## Décisions prises

Arbitrages du responsable, 2026-10-23, sur question à options (les quatre
options recommandées) :
- a. Repli natif « Source » sous les cinq cartes (indice, stabilité,
  réserve, clarté, momentum) : « Questionnaire(s) : CODE (réponse du
  JJ/MM/AAAA) », « Version du calcul : vN » ; momentum : « Écart de l'indice
  global entre l'état au T0 (…) et l'état au J21 (…) ». Provenance non
  établie : « Source non enregistrée », sans chiffre, distincte de « Non
  mesuré ». Le tableau des couvertures et le chip « Au tour précédent »
  restent hors lot (r3_08).
- b. Q9 : ligne visible sous la jauge de l'indice ; route `plafondApplique`
  (booléen seul).
- c. Q10 dans `lecturePatient.ts` (portail et aperçu praticien t07b), dates
  par `datesDesReponsesRetenues` (même sélection que
  `construireReponsesParQuestionnaire`) ; T3.
- d. Garde `frontierePortail.guard.test.ts` en trois volets : imports, liste
  fermée des clés servies (seuls `indiceGlobal`, `couverture` et l'id du
  besoin sont des nombres), `showValue={false}` sur toute jauge du portail.
Choix de l'assistant, signalé : la stabilité métabolique, hors du registre
des versions, dit « Formule non versionnée » plutôt que d'emprunter `v15`.

## Fichiers modifiés

- `web/src/lib/equilibre/depuisPrisma.ts` (+ test), `lecturePatient.ts`,
  `objetsCliniques.ts` (besoins 9 et 10 exportés ; le fichier, stocké en CRLF,
  est renormalisé en LF par `.gitattributes` — `diff -w
  --ignore-cr-at-eol` : 7 lignes réelles)
- `web/src/lib/equilibre/frontierePortail.guard.test.ts` (neuf)
- `web/src/lib/praticien/provenanceChiffre.ts` (neuf, feuille sans import)
  et son test
- `web/src/app/api/praticien/equilibre/route.ts` et son test
- `web/src/components/FichePatientPanel.tsx` et son test
- `web/src/components/patient/MonEquilibreAccueil.tsx` (type de la frise),
  fixture du test de l'aperçu praticien
- `changelog.d/2026-10-23-j1-cockpit-b-provenance.md`,
  `docs/claude/SESSION_LOG.md`

## Validations exécutées

- Bancs ciblés verts (route 21 cas, panneau, module, garde, depuisPrisma).
- Garde rouge sous huit mutations : valeur de trajectoire, écart du
  momentum, champ numérique ajouté, import d'`objetsCliniques` et d'un module
  du cockpit depuis `components/patient`, import relatif d'une route
  praticien, `showValue={false}` retiré, répertoire `components/patient*` non
  rangé. Fichiers restaurés.
- `wn-reviewer` : GO avec réserves, aucun P0. P1 corrigé : la garde couvre
  `patient-companion`, `patient-food-compass`, `patient-food-observation`,
  et rougit sur tout répertoire `components/patient*` non rangé
  (`patient-cockpit` exclu avec motif). P2 corrigés : nom accessible
  contextuel du geste, date du momentum dite « état au jalon », import nu de
  `@/lib/equilibre`, tests ajoutés (réserve, déduplication entre besoins,
  absence de repli sans réponses brutes).
- T1 complet vert ; T3 : voir la PR.

## Problèmes ouverts

- P2 écartés de ce lot : regex de la garde (import renommé de `ScoreGauge`,
  props étalées, imports transitifs) ; contrat à liste fermée limité à
  `api/patient/equilibre` (les autres routes du portail relèvent de la
  famille 1 ou n'importent aucun indice, ce que le volet imports garde).
- Règle 2 (formule versionnée `nom-vN`) : la stabilité reste « Formule non
  versionnée » jusqu'à elle.
- Porte 4 (poids égal de la stabilité) inchangée.

## Prochaine action exacte

CI en fond (`wn-attendre-ci`), revue CodeRabbit sur le sha de tête, verdict
par commentaire, aucune release-db en attente, merge. Puis page de la file A :
r3_07 « fait » ; mémoire audit-instruments.

## Interdits encore actifs

- Aucune formule, table, version, seuil ; aucune couleur ni mot qui juge
  (§2 règle 4) ; aucune migration.
- Au portail : retirer seulement, rien ajouter ni reformuler.
- La tolérance de la stabilité et « Repère de suivi » (J1-cockpit-a) restent
  jusqu'à la porte 4.
