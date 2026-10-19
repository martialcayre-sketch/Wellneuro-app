# Handoff — « Mon équilibre » : lot de cohérence du calcul (D-329)

## Branche et état Git

`feat/equilibre-coherence-calcul`, partie d'`origin/main` (d0601804).
Worktree `.claude/worktrees/equilibre-coherence`, session concurrente (cycle
en `git`/`gh` direct). PR sur `main`, sans migration.

## Objectif

Écrire le lot de cohérence que l'audit de D-312 (section 10 « Mesure ») a
rendu nécessaire, le seul qui ne dépend d'aucune des sept décisions des
dossiers de mesure : demande du responsable du 2026-10-18.

## Décisions prises

- D-329 : §1 un sous-score partiel ne mesure plus un besoin (5, 8, 10, 12),
  badges de preuve alignés ; §2 écart snapshot/routes fermé pour le cas
  audité, résidu nommé et non aligné (chaque direction change une sortie
  réelle) ; §3 « Calculé sur n besoins mesurés sur 12 » au cockpit, phrase sans
  chiffre au portail, assumée permanente tant que 2, 6, 7, 11 n'ont pas de
  source ; §4 version du score gardée (arbitrage du 2026-10-19 : v16/v17
  aurait fait dériver les cartes diffusées et éteint 3 protocoles).
- Options des sept décisions des dossiers de mesure, rendues le même soir
  (recommandations suivies, « non mesuré » pour 6, 7, 11) : consignées au
  dossier privé et à la fiche H15. Les décisions 1 à 4 partent avec le
  changement de sources, à la signature du guide (arbitrage du 2026-10-15).
- Hors lot : double compte SIIN52-55 (mapping), valeur des badges (signature
  ou retrait, question ouverte), référence du momentum du portail.

## Fichiers modifiés

- `web/src/lib/equilibre/score.ts` : `sousScoreComplet`, garde du lecteur de
  sous-score, `compterBesoinsMesures`.
- `web/src/lib/equilibre/constants.ts` : note motivant la version gardée
  (valeur inchangée).
- `web/src/lib/equilibre/natureIndiceGlobal.ts` : `mentionBesoinsMesures`,
  `MENTION_BESOINS_PARTIELS_PATIENT`.
- Route `web/src/app/api/praticien/equilibre` : `besoinsMesures`,
  `besoinsTotal`.
- `web/src/components/FichePatientPanel.tsx` (prop `base` d'`ObjetGauge`),
  `web/src/components/patient/MonEquilibreAccueil.tsx` (phrase).
- Tests : `score.test.ts`, `evidence.test.ts` (inversé : un axe partiel n'a
  plus de grade), `porteursSousScore.guard.test.ts`,
  route `praticien/equilibre`, `FichePatientPanel.test.tsx`,
  `MonEquilibreAccueil.test.tsx` (neuf).
- Docs : D-329, `changelog.d/2026-10-18-equilibre-coherence-calcul.md`, fiche
  H15, SESSION_LOG.

## Validations exécutées

- T3 complet vert sur 152a243f (6 min 31 s, E2E Chromium et WebKit) ; T1
  complet vert sur la tête après les corrections de revue ; après retrait du
  changement de version et fusion de `main` : banc d'empreinte figée (#1569)
  vert dans les deux formes, T1 et suites ciblées vertes.
- Contre-épreuves par mutation : garde retirée, 10 puis 6 bancs rouges.
- Contre-revue adverse `wn-reviewer` sur huit affirmations : sept confirmées,
  une nuancée (résidu §2 plus large que l'agenda, élargi au texte) ; aucun P0
  ni P1 ; quatre P2 traités (commentaire, mesure sur toutes les passations,
  phrase permanente assumée, trois tests ajoutés). GO avec réserves levées.
- Production, conteneurs en lecture seule, agrégats : aucune passation
  exploitable, historique compris, n'a d'axe servi partiel ; stock et
  lectures de jalons passés inchangés.

## Problèmes ouverts

- Dette D-329 §4 : la version du score entre dans l'empreinte des cartes de
  décision ; tout changement de version (dont le futur changement de sources)
  éteint les protocoles diffusés et exige leur réapprobation.

- Résidu D-329 §2 : complétude jugée sur la passation entière par le
  snapshot, sur les items lus par les routes. À trancher par un lot sur la
  complétude de l'agenda dans le snapshot.
- Badges de niveau de preuve : signer ou retirer (question au responsable).
- Un cycle figé v15 affiche « version de score : v15 » sur des valeurs
  recalculées par le moteur courant (antérieur au lot, relevé en revue).

## Prochaine action exacte

Merge de la PR après revue CodeRabbit de la tête, constat du déploiement ;
puis, au choix du responsable : lot d'ingestion des sources libres (décision
6), ou préparation du changement de sources des besoins 8, 9 et 12.

## Interdits encore actifs

- `BESOIN_SOURCES` intouché avant le changement de sources groupé (arbitrage
  du 2026-10-15).
- Aucun seuil, poids ou borne proposé ; dépôt public : forme opaque.
- Lecture de la production par conteneur seulement, agrégats, jamais un nom.
