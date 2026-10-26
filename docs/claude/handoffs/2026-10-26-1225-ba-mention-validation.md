# Handoff — 2026-10-26 — File C : ba, « Validé par votre praticien le … » (D-369, H35)

## Branche et état du dépôt

- Branche `lot/ba-mention-validee`, partie de `origin/main`, `origin/main`
  (91f53ad7, #1713) fusionné dedans ; worktree `act5-mineurs`, session
  concurrente, cycle en `git`/`gh` direct.
- Ni migration, ni drapeau, ni release-db.

## Objectif

Suite de la file C du plan. La place 7 (ak) attend sa fenêtre de constat (du
2026-11-01 au 2026-11-07, 17 h 56 heure de Paris), et la porte 18 tient
toutes les activations jusque-là. Le seul travail de la file faisable sans
geste du responsable était le lot de code de ba (préalable q22 de la page de
suivi, rang 1, hors file C) : la mention de D-369 §1 sur la page servie.

## Décisions prises

- Place 7 : la fenêtre n'est pas ouverte. Relu par conteneur que le renvoi
  existe toujours sur le dossier de test : une assignation ouverte depuis le
  jour 0 (agendas exclus), d'un instrument rempli avant le jour 0, sans réponse
  depuis. Rien d'autre n'a été fait sur la place 7.
- ba : la route `api/portail/protocole` sert `valideLe` (instant ISO de
  `approvedAt`) seulement quand une vue est servie. Rediffuser la même version
  est un no-op et garde la date ; une nouvelle version crée sa propre
  approbation et sa propre date (D-368 §4). La date est relue par
  `wn-reviewer`.
- Rendu : en tête de la page, sous l'en-tête et une seule fois, hors du
  détail replié, et en fin de cycle aussi. Jour civil de Paris, et « 1er » le
  premier du mois (usage typographique, pas un texte neuf).
- D-369 §2 « aucun chiffre » est lu comme « aucun score » : la date imposée
  par §1 en porte.

## Fichiers modifiés

- `web/src/app/api/portail/protocole/route.ts` et `route.test.ts`
- `web/src/lib/portail/texteMentionValidation.ts` et `.test.ts` (le banc
  relit la citation de D-369 §1)
- `web/src/components/patient-companion/PatientCompanionHome.tsx` et
  `.test.tsx`
- `web/src/lib/gamification-patient.guard.test.ts` (module déclaré dans
  `SURFACES_PATIENT`, remarque P2 de la revue)
- `changelog.d/2026-10-26-ba-mention-validation.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H35), `docs/claude/SESSION_LOG.md`, ce
  handoff.

## Validations exécutées

- T1 (`check:rapide`) vert.
- T2 (`test:worktree -- --fast`) vert avant la fusion de main : 15 134 tests
  Vitest et 300 E2E.
- Après la fusion : banc du garde de gamification et du module, verts.
- `wn-reviewer` : GO, ni P0 ni P1. Les deux P2 : le premier (garde de
  gamification) est corrigé ; le second (le découpage de D-369 suppose D-368
  juste après) est gardé, c'est l'idiome du banc de D-349.
- Anti-secrets : OK.

## Problèmes ouverts

- Constat par lecture de ba, sur la page servie d'un dossier de test, après
  le déploiement.
- Place 7 : constat D-353 §5 dans sa fenêtre. Personne ne doit remplir le
  questionnaire renvoyé avant la lecture en ligne par le responsable.

## Prochaine action exacte

CI de la PR, puis revue CodeRabbit de la tête, avec un verdict par
commentaire. Avant le merge, sonder les runs `release-db` non conclus (gel de
D-374 §5). Puis merge `--match-head-commit`, déploiement constaté, et constat
par lecture. Mettre à jour la page de suivi de la file C (q22).

## Interdits encore actifs

- Aucune migration ; aucun texte patient, seuil ou fenêtre inventés.
- Production lue par identifiant, depuis un conteneur seulement ; dans le
  dépôt, « un dossier de test », jamais son identifiant avec des mesures.
- Aucun lien d'artefact dans le dépôt.
- Aucun merge tant qu'un run `release-db` n'est pas conclu (D-374 §5) ; un
  merge à la fois.
