# Handoff — t75, D-478 : supplantation des claims cités par une fiche d'assiette (surface patient)

## Branche et état Git

- Branche `feat/t75-fiches-assiette-supplantation`, worktree
  `.claude/worktrees/t75-fiches-assiette-supplantation`, créée depuis origin/main
  1a393528, puis avancée en `--ff-only` sur dc0cbed1 (t74 #1981 mergée entre-temps),
  avant tout commit.
- Premier commit 09020299 ; les corrections de revue et ce handoff sont dans le
  commit suivant. PR à ouvrir.

## Objectif

Dette t75 (§8), inscrite par t73 (D-476 §5). `claimsValidesEtLeursTextes`
exigeait `statut = 'VALIDE'` sans `superseded_at IS NULL`. Un claim encore
VALIDE mais supplanté pouvait donc fonder une fiche diffusée au patient.

## Décisions prises

- Le responsable a validé le cadrage le 2026-11-11 :
  - prédicat ajouté DANS la requête unique, après le bloc recopié de
    `claimsValidesAuCorpus` ;
  - refus par `claim_non_valide`, sans substitution de version ni nouveau mécanisme.
- Textes : la question `20261111-1005-a` de la liste commune (page D) a reçu la
  réponse « Aligner sur D-472/D-476 ». Les trois textes de l'écran du
  responsable sont alignés ; aucun texte patient ne change.
- Aucune release-db : aucun chemin de `release-db.yml` n'est touché (D-478 §5).
- Lecture de production avant le code : one-off-8014 du 2026-11-11 à 14:48 UTC,
  en lecture seule, agrégats seulement. 7 versions, 3 remises, 36 clés citées,
  0 supplantée : effet nul au déploiement.

## Fichiers modifiés

- `web/src/lib/fiches-assiette/claimsCites.ts` (prédicat), `controle.ts` (motif),
  `lecture.ts` (commentaire de type).
- `web/src/components/fiches-assiette/RelectureFicheAssiette.tsx` (deux libellés).
- Tests : `ingestion.test.ts`, `RelectureFicheAssiette.test.tsx`.
- `docs/decisions/D-478.md`, `changelog.d/2026-11-11-t75-fiches-assiette-supplantation.md`,
  `docs/claude/PLAN_WELLNEURO.md` §8 (ligne t75 soldée).

## Validations exécutées

- Vitest ciblé (fiches-assiette, composants, portail) : vert, 264 tests.
- T1 complet (`npm run check`) : vert sur 09020299, après `prisma generate`
  dans le worktree neuf.
- `wn-reviewer` : GO, ni P0 ni P1. Les verdicts sont en D-478 §7.
- T3 (`npm run test:worktree`) : ROUGE en local, deux fois, sur deux bancs
  différents et étrangers au lot.
  - Run 1, sur 09020299 : Vitest vert (16 737) et 356 E2E verts.
    - Un E2E WebKit rouge : `e2e/portail-bilan.spec.ts:147`, sur iPhone 13.
    - Le `page.reload` a émis la navigation `/portail/…/bilan` sans recevoir
      de réponse. Ce n'est pas la signature D-049, car une requête est partie.
    - Le banc ne remet aucune fiche et ne passe pas par l'écran du responsable.
  - Run 2, sur 22a85165 : un Vitest rouge sur une borne de durée,
    `export-dossier/masquage.test.ts` (201 ms pour 200). Il passe seul,
    164/164. Les E2E n'ont pas été joués.
  - Pas de troisième rejeu : le CI arbitre le segment E2E sur la tête.
- Fusion arbitrée de origin/main (#1987, trois fichiers de doc H15, sans
  recouvrement) : aa69e14b.

## Problèmes ouverts

- T3 local rouge, hors lot (voir plus haut) : le CI doit être vert, E2E compris, sur la tête.
- Revue de tête : CodeRabbit (quota 1/h), puis Copilot, puis PR-Agent.
- P0 clinique : la passe Codex manuelle relève du responsable, avant le merge.

## Prochaine action exacte

1. Ouvrir la PR (`--body-file`). Lancer `node <worktree>/scripts/wn-attendre-ci.mjs <N>` en fond.
2. Demander `@coderabbitai review`, puis donner un verdict à chaque sortie : synthèse, corps, en ligne, focus areas.
3. Si `main` a bougé sur le plan, réconcilier par arbitrage. Puis déclarer « prête @<sha> » à l'intégrateur.
4. Après le merge et le déploiement ordinaire, faire le constat par conteneur :
   - vérifier l'ascendance (`git merge-base --is-ancestor`) ;
   - « du corpus aujourd » doit être présent dans `.next/server` ;
   - « pas VALIDE au corpus aujourd » doit en être absent.
5. Passer t75 à « fait » sur la page A et dans la mémoire `suivi-file-a-artefact`. Clore la question `20261111-1005-a` (`pr`, `merge_le`).

## Interdits encore actifs

- Pas de merge par la session : l'intégrateur merge (D-454).
- Ne toucher ni à `web/src/lib/rag/claims/validite.ts` ni à `web/src/lib/supplement-library/`.
- Pas de migration ni de `schema.prisma`.
- Aucune identité réelle.
- Lecture de la prod uniquement par `scalingo run -d`.
- Pas de pull, merge ou rebase automatique (l'avance `--ff-only` d'une branche vide n'en est pas une).
