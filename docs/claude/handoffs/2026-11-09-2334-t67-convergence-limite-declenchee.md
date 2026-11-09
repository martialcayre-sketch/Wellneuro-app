# Handoff — t67 : quatrième limite de convergence, ORIENTATION_RULES_V1 re-signée (D-470)

## Branche et état Git

- `fix/t67-convergence-limite-declenchee`, partie de `origin/main` `8c93c962`.
- Commits : `e946ea7d9` (limite, décision, re-signature), `00be0c589`
  (état des signatures dans `docs/FEATURE_FLAGS.md`), puis la clôture (D-470 §5
  et ce handoff). Aucune PR ouverte au moment d'écrire.

## Objectif

Question `20261107-1748-a` : une carte `CONV-B<n>` cite comme « déclenchée » une
règle dont la recommandation peut être éteinte, écartée ou absente du panneau.
On garde la citation et on ajoute une limite à la table signée.

## Décisions prises

- D-470 (réservée par `wn-reserver-decision.mjs`) ; elle précise D-455 §1. Le
  double verrou vise l'activation globale de l'orientation (drapeau et
  signature), pas l'affichage de chaque recommandation.
- Texte de la limite validé par le responsable le 2026-11-09, après une
  correction de la seconde phrase. Il est placé en quatrième limite commune de
  `LIMITATIONS_CONVERGENCE`.
- Re-signature sur attestation du responsable (« j'atteste ») :
  `a9aaaf32…d914`. Contre-preuve : sans la limite, la table hache
  `16517749…` (l'empreinte signée du 2026-11-07). Aucun claim ajouté ni retiré.
- Revue `wn-reviewer` : GO, aucun P0 ni P1.
  - P2-1 (cible suspendue qui disparaîtrait sans bruit) : nommé en D-470 §5.
  - P2-3 (une ligne de vigilance de plus par carte en synthèse) : nommé en
    D-470 §5.
  - P2-2 (`regleId` replié dans le panneau) : écarté, comportement antérieur au
    lot, ergonomie hors périmètre.

## Fichiers modifiés

- `web/src/lib/clinical/convergenceV1.ts`, `convergenceEngine.test.ts`
  (instantané des textes).
- `web/src/lib/clinical/orientationRulesV1.ts`, `orientationRulesV1.test.ts`
  (`shaPerimetre`, `dateValidation`, anciennes empreintes).
- `docs/decisions/D-470.md`, `docs/decisions/D-455.md` (précision datée),
  `docs/FEATURE_FLAGS.md`.
- `changelog.d/2026-11-09-t67-convergence-limite-declenchee.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert.
- T3 complet (`npm run test:worktree`) vert sur `00be0c589` : Vitest 16 608
  passés, E2E 357 passés et 23 sautés, code de sortie 0. Le premier passage
  était rouge sur `verrousSignatureDocumentes.guard.test.ts`
  (`FEATURE_FLAGS.md`) ; c'est corrigé.

## Problèmes ouverts

- Aucun banc ne fige l'invariant « toute règle citée aboutit à une ligne
  visible, éteinte, écartée ou exclue ». C'est le trou nommé en D-470 §5.
- #1952 (F79, file B) est ouverte, avec une migration et un chemin clinique.
  Sa `release-db` doit passer avant le merge de t67.

## Prochaine action exacte

1. Ouvrir la PR (`--body-file`) ; CI par `node scripts/wn-attendre-ci.mjs <N>`
   en fond.
2. Revue sur la tête : CodeRabbit, puis Copilot (`wn-revue-copilot.mjs
   --quota`), puis PR-Agent. Un verdict pour chaque commentaire.
3. Poster « prête @<sha> » en commentaire de la PR. L'intégrateur merge, et
   seulement quand la `release-db` de #1952 est approuvée et qu'aucune autre
   `release-db` ni re-signature d'`ORIENTATION_RULES_V1` n'est en attente.
4. Après le merge : `release-db` de t67 à approuver par le responsable, puis
   constat par conteneur (`orientationActive()` vrai, empreinte servie
   `a9aaaf32…`). Ensuite seulement, la page de la file A passe t67 à « fait ».
5. Lot suivant : t66 (`propositionService`, claims non signés).

## Interdits encore actifs

- Pas de merge par la session (régime de l'intégrateur, D-454).
- Une seule `release-db` en attente à la fois, toutes files confondues.
- Pas de retouche du texte validé de la limite sans nouvelle décision.
- La ligne t67 ne passe pas à « fait » avant le merge, la `release-db`
  approuvée et le constat par conteneur.
