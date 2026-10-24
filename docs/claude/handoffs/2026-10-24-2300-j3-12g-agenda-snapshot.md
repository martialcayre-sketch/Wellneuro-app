# Handoff — 2026-10-24 — J3-12g : l'agenda du sommeil entre au snapshot (D-358)

## Branche et état du dépôt

- Branche `docs/j3-12g-prealables-agenda`, partie de `origin/main`
  (66132bc6), worktree `j3-12e-ingestion`. Session concurrente, cycle en
  `git`/`gh` direct.

## Objectif

Lot J3-12g de la file A (résidu de D-329 §2), qui ouvre r3_10 (Q5, audit
F59) : lever ses deux préalables (inventaire « rubrique de l'agenda → lecteurs
du moteur », compte des diffusions actives), faire trancher le responsable,
puis aligner le snapshot.

## Décisions prises

- Inventaire : le snapshot écartait l'agenda entier pour une seule rubrique
  absente ou nulle ; les routes et la chaîne C1 recalculent l'indice sans
  filtre. Compte par conteneur (lecture seule) : 13 agendas clôturés, 2 à
  indice, un seul accepté par le snapshot ; 3 des 4 approbations actives sur
  un épisode à agenda écarté.
- Arbitrages du responsable (questions à options, une reformulée à sa
  demande) : deux lots, J3-12g d'abord ; tout agenda clôturé est complet au
  snapshot ; réapprobation après déploiement, sans changement de version ;
  inventaire au dossier de proposition.

## Fichiers modifiés

- `web/src/lib/clinical-engine/clinicalSnapshot.ts` (prédicat
  `agendaSommeilCloture`, appelé par `hasExploitableRawAnswers`).
- `web/src/lib/clinical-engine/clinicalSnapshot.test.ts` (dix cas, dont un
  contrôle négatif hors agenda).
- `docs/DECISIONS.md` (D-358),
  `docs/claude/propositions/2026-10-24-j3-12g-completude-agenda/README.md`,
  `docs/claude/PLAN_WELLNEURO.md` (deux lignes),
  `changelog.d/2026-10-24-j3-12g-agenda-sommeil-snapshot.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Banc du snapshot : 29 tests verts ; prédicat désactivé, les trois cas visés
  rougissent (agenda d'avant v4, `null`, agenda court).
- Suites `clinical-engine`, `equilibre`, `patient-cockpit` : 93 fichiers
  verts, aucune empreinte figée touchée.
- T1 rapide vert ; T1 complet (`npm run check`) vert.
- T3 (`npm run test:worktree`) vert sur adb173bf : 881 fichiers Vitest
  (14 865 tests), 28 fichiers d'intégration, 296 E2E, 9 min 22 s. Un premier
  T3, lancé pendant deux autres T3 de sessions concurrentes, s'était arrêté
  sur `scripts/wn-etat-reel.test.mjs` ; ce banc rejoué seul était vert (10/10),
  et le second T3 l'a passé : intermittent hors du lot.
- `/code-review medium` : huit constats. Corrigés : nombre de nuits exigé
  entier et non négatif, chaînes refusées (la clôture n'écrit que des nombres
  et des `null` ; aucune chaîne en production) ; bancs zéro nuit, négatif,
  fractionnaire, chaîne, objet imbriqué ; libellé « null » du banc ; D-358 §5
  dit que les trois approbations relèvent de deux dossiers. Écartés avec
  motif : zéro nuit accepté (c'est la sortie de la clôture, et le besoin 5
  reste non mesuré, banc dédié) ; pas de liste de rubriques attendues
  (`Q_SOM_09` n'est écrit que par la clôture — la route de soumission le
  refuse, `api/patient/submit/route.ts:118` — et le scoring garde ses refus) ;
  branche par identifiant plutôt qu'une propriété de catalogue (refactoring
  hors périmètre de D-358) ; imports du banc déjà présents ; « en PR » au
  plan, vrai à l'ouverture de la PR de ce lot.

## Problèmes ouverts

- Après déploiement : trois cartes approuvées (deux dossiers) dérivent ;
  réapprobation par le praticien, puis constat par conteneur (D-358 §5). La
  liste nominative est hors du dépôt (page de suivi de la file A).
- Hors lot : r3_10 (lot suivant), r3_09, r3_12, r3_14, t33, les deux points
  t43 ouverts.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>` en fond), revue CodeRabbit sur le
sha de tête, merge ; lister les release-db `waiting` avant le merge ;
observer le déploiement ; prévenir le responsable pour la réapprobation ;
constat par conteneur ; mettre à jour les pages de la file A et
« Instruments des 12 besoins ».

## Interdits encore actifs

- Aucune migration, aucun drapeau ; production en lecture seule.
- Ni le scoring `agenda_sommeil`, ni `questions.ts`, ni la version du score.
- Aucun texte d'écran sans relecture du responsable (r3_10 en aura) ; aucune
  couleur ni mot qui juge la valeur (D-333 §2 r4) ; `frontierePortail` verte.
- Jamais de nom ni d'e-mail de dossier ; identifiants sans métrique.
