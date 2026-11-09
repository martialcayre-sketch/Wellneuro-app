# Handoff — 2026-11-09 — File C, place 8 suite : BP-14, PR de code de l'identité d'auteur (F10, D-459 §3, §6, §8 point 4)

## Branche et état du dépôt

- Branche `feat/bp14-code-identite-auteur`, créée depuis `origin/main`
  (`a07e67c9`) et avancée par `--ff-only` jusqu'à `664bc25d` (#1950, puis
  #1942, avant tout commit du lot). Worktree `.claude/worktrees/bp14-code`.
- PR ordinaire, sans migration ni `schema.prisma`. Déclarée « prête @<sha> »,
  mergée par l'intégrateur (D-373, D-454).
- Le worktree `bp14-migration` n'a plus de travail en cours et peut être
  retiré.

## Objectif

D-459 §8 point 4 : les cinq écritures du §3, l'auteur nul du portail et les
trois bancs. Aucun lecteur des colonnes (§7).

## Décisions prises

- Instantané JA : `creePar` est un champ facultatif de l'entrée de
  `saveJaObservationSnapshot`. La persistance l'impose nul quand `actor` vaut
  `'patient'`, même si un auteur lui est passé. La règle du §3 tient donc
  dans le domaine, pas seulement dans la route.
- Activation JA : `creePar` est un champ obligatoire (`string | null`) de
  `JaActivationInput`. Une seule route l'appelle, et l'oubli ne compile pas.
- Versions : `{ ...toDraftCreateInput(…), creePar }` dans la branche `create`
  seule. `toDraftCreateInput` (`lib/protocol/versioning.ts`) n'est pas
  touché.
- Banc historique : une garde statique (lectures par `select`, colonnes non
  nommées hors des trois écrivains) plus un banc de comportement sur le
  portail et le calendrier. La lecture de la diffusion est tenue par la
  garde.
- Registre : la phrase de D-459, déjà posée le 2026-11-07, reçoit une phrase
  sur l'entrée en écriture et sur la fenêtre nulle avant le déploiement.
- T3 joué en entier. Il couvre le périmètre de T2, qui n'a pas été rejoué à
  part.

## Fichiers modifiés

- Code : `api/praticien/protocoles/versions/route.ts`,
  `api/praticien/protocoles/diffusion/route.ts`,
  `api/praticien/ja/observations/route.ts`,
  `api/praticien/ja/activation/route.ts`,
  `lib/food-observation/persistence.ts`.
- Bancs : les tests des cinq routes, dont `diffusion/route.fiches.test.ts`
  pour la transaction, et la route du portail JA ;
  `persistence.coherence.test.ts`, `persistence.activation.test.ts`,
  `lib/patient/effacement.test.ts` et
  `lib/protocol/identiteAuteur.historique.test.ts` (neuf).
- Docs : `docs/DOSSIER_RGPD.md` (rubrique 5) ;
  `changelog.d/2026-11-09-bp14-code-identite-auteur.md` ;
  `docs/claude/plan-journal/F10/2026-11-09-01-pr-code-identite-auteur.md` ;
  statut de LOT-14 ; ligne BP-14 de `CAMPAGNE.md` ; ce handoff.
- Hors dépôt : lignes p28 (BioFlow) et a08 (file C).

## Validations exécutées

- Bancs ciblés : 24 fichiers, 348 tests verts, plus `effacement.test.ts`.
- T1 complet vert (`check`, anti-secrets compris).
- T3 : voir la PR.
- Grep des colonnes : seuls les trois écrivains les nomment. Les 46 lectures
  des deux tables passent par `select`, et aucune relation n'est incluse.
- Revues (wn-reviewer, CodeRabbit ou PR-Agent) : voir la PR.

## Problèmes ouverts

- L'instant du déploiement de cette PR n'est pas encore inscrit. D'ici là,
  une ligne neuve reste nulle (§5, deuxième temps).
- #1942 (migration BP-12b) est sur `main`. Sa release-db peut geler les
  merges : c'est la sonde de l'intégrateur qui en décide.
- Dette de la file de release, toujours au plan §8 : release-db joue ses
  préflights après le déploiement du code.

## Prochaine action exacte

Après le merge par l'intégrateur, lire `scalingo --app wellneuro deployments`
et relever la première ligne dont le commit contient le merge (vérifié par
`git merge-base --is-ancestor`). Inscrire son instant dans un fragment du
journal de F10 et dans un constat à la fin de D-459 (§5), par une PR de doc.
Passer LOT-14 « livré », puis mettre à jour les lignes p28 et a08.

## Interdits encore actifs

- Aucun écran, export, IA ni route de lecture des deux colonnes (D-459 §7) ;
  aucun drapeau.
- `auth.ts` et les rôles restent intacts. Rien sous `web/src/lib/clinical/`.
  Les lecteurs de `approvedBy` restent inchangés.
- Aucune seconde reprise : un nul ne se complète jamais (§5). Les fonctions
  `identite_auteur_*` ne sont pas appelées.
- Production en lecture seule, par conteneur, en agrégats. Aucun e-mail,
  aucune identité ni identifiant de dossier au dépôt.
- La D-xxx de BP-18a et la règle signée sont de la main du responsable.
