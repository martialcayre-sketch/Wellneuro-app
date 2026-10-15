# Handoff — 2026-10-15 — D-281 §5 : Fil du jour et prévol comptés par l'attente d'avis

## Branche et état Git

- Branche `feat/d281-fil-prevol-attente-avis`, depuis `origin/main` 8b2ade90,
  worktree `d281-lot3-portail` (session concurrente, cycle en git/gh direct).
- Un commit de lot ; PR à ouvrir, CI par `wn-attendre-ci`, revue CodeRabbit sur
  la tête, merge, déploiement constaté.

## Objectif

Le Fil du jour (carte « Signalement ») et le prévol du copilote comptaient
l'effet indésirable « non traité » par statut (`recu`/`en_cours`). Ils
appliquent désormais la règle du panneau TRUST : un signalement qui reçoit un
avis reste non traité tant qu'aucun verdict n'est en tête de chaîne, quel que
soit son statut. Plan §8, ligne « compté par statut » ; file A, fiche t21.

## Décisions prises

- Une seule règle : `effetsNonTraites` (module pur
  `web/src/lib/trust/pauseEffetIndesirable.ts`), bâtie sur
  `signalementsEnAttente` ; le panneau TRUST la réutilise, comportement
  inchangé. Lecture serveur commune : `lireEffetsNonTraites(where)`
  (`pauseEffetIndesirableServeur.ts`). Candidats : statut ouvert OU
  rattachement non nul OU programme visé non nul ; verdicts lus par
  `reportId` des seuls candidats avec avis.
- Aucun verrou : actif dès le déploiement, comme le compteur du panneau.
- Fil : effets lus sur les patients ACTIFS du praticien, plus récents
  d'abord, borne de dix après la sélection (revue P2-1). Avant : `take: 10`
  sans scope ni ordre.

## Fichiers modifiés

- `web/src/app/api/praticien/fil/route.ts` et `route.test.ts`
- `web/src/app/api/praticien/copilote/prevol/route.ts` et `route.test.ts`
- `web/src/app/api/praticien/trust/route.ts`
- `web/src/lib/trust/pauseEffetIndesirable.ts` et `.test.ts`
- `web/src/lib/trust/pauseEffetIndesirableServeur.ts`
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : le prévol devient une
  surface indirecte du corpus clinique par le nouvel import)
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldée, mise à jour F66),
  `changelog.d/2026-10-15-d281-fil-prevol-attente-avis.md`

## Validations exécutées

- Suites ciblées (fil, prévol, trust, lib/trust) : 254 tests verts.
- T1 (`check:rapide`) vert ; T1 complet (`check`) avant commit.
- T2 (`test:worktree -- --fast`) : 1re passe rouge sur la seule fraîcheur de
  la matrice de consommation, régénérée ; 2e passe verte en 5 min 34 s. Les
  deux P2 appliqués ensuite ne touchent qu'un filtre de requête et des tests
  unitaires (ciblés rejoués, verts).
- Revue `wn-reviewer` (chemin de sécurité) : Go, aucun P0/P1.

## Problèmes ouverts

- Revue P2-4 (hors périmètre, défaut antérieur) : au Fil,
  `trustPrivacyIncident` et `trustRightsRequest` restent en `take: 10` sans
  scope praticien ni ordre — même éviction inter-praticiens. À router au §8.
- Revue P2-3 : le panneau compte dans `take: 100` ; Fil et prévol sans borne.
  Mêmes comptes sous ce seuil.
- Restes de l'étape 4 : désignation illisible au dépôt (§8, t22), autres restes.

## Prochaine action exacte

Ouvrir la PR, attendre le CI (`node scripts/wn-attendre-ci.mjs <N>` en fond),
lire la revue CodeRabbit sur la tête, merger, constater le déploiement, puis
page de suivi de la file A : t21 → fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` dans ce lot.
- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Pas d'auto-merge sur une PR de lot ; un merge à la fois, déploiement constaté.
