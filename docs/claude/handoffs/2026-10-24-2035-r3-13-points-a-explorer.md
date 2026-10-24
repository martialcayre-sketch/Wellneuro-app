# Handoff — 2026-10-24 — r3_13 : « Points à explorer » acté au portail (Q11, D-355)

## Branche et état du dépôt

- Branche `r3-13-points-a-explorer`, partie de `origin/main` (290c2dcf),
  worktree `j3-12e-ingestion`. Session concurrente, cycle en `git`/`gh`
  direct.

## Objectif

Lot r3_13 de la file A (F59, audit Q11) : acter ou retirer par une D-xxx la
section « Points à explorer avec votre praticien » de l'accueil « Mon
équilibre », qui trie les besoins mesurés par couverture croissante et en
garde trois.

## Décisions prises

- Constat : la fiche SP-CONV LOT-05, la maquette
  `mon-equilibre-qualitatif.html`, la `CAMPAGNE.md` et la PR #294 ne
  renomment que le libellé ; aucune n'écrit de motif clinique du tri.
- Le responsable a tranché par deux questions à options : **acter**, en
  nommant une exception à D-333 §2 r4, motif « matière de dialogue » (formule
  du commentaire LOT-05). Une première réponse contradictoire (« acter » et
  « rien à la place ») a été levée par une seconde question explicite.
- D-355 : troisième famille d'exceptions à la règle du portail (amende D-333
  §1), bornée — trois besoins mesurés au plus, sans chiffre, sans mot ni
  couleur qui juge, sous ce libellé. Toute extension demande une décision.
- Écran inchangé : pas de texte à relire.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-355).
- `web/src/components/patient/MonEquilibreAccueil.tsx` (deux commentaires).
- `web/src/components/patient/MonEquilibreAccueil.test.tsx` (banc D-355).
- `changelog.d/2026-10-24-r3-13-points-a-explorer-actes.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Banc du composant (6 tests) et `frontierePortail.guard` : verts.
- T1 complet (`npm run check`) vert, après un `prisma generate` : le client
  du worktree ignorait les modèles de #1679, et le premier T1 était rouge
  sur les types.
- T2 (`npm run test:worktree -- --fast`) vert : 881 fichiers Vitest, 296 E2E.
  Le premier T2 avait tous ses tests verts, mais il est sorti en code 1 sur une
  erreur non gérée : un minuteur Radix focus-scope dans
  `PatientPreview.test.tsx`, après le démontage. Ce fichier rejoué seul trois
  fois est vert, et l'erreur n'a pas reparu au second T2. C'est un
  intermittent hors du lot.
- `/code-review medium` : quatre constats. Trois corrigés : « couverture
  renseignée, zéro compris » à la place de « non nulle » ; test de l'égalité
  et du zéro ; garde de chiffre remplacée par l'égalité exacte du texte et par
  un rendu identique pour chaque item. Un écarté : le `?? 0` redondant du tri
  existant, code hors du lot, l'égalité étant désormais testée.
- `lib/equilibre` est inchangé : ni T3 ni `wn-reviewer`.

## Problèmes ouverts

- Hors lot : r3_09 (Q1, attend J3-12b), r3_10 (Q5, attend J3-12g), r3_12
  (Q7, attend J2-mom), r3_14 (Q12, étapes E67 et H64), t33, t36, les deux
  points t43 encore ouverts.
- Un lot distinct pourrait un jour montrer ici la priorité posée par le
  praticien (D-279) : non ouvert, non demandé.

## Prochaine action exacte

CI en fond (`wn-attendre-ci`), revue CodeRabbit sur le sha de tête, un
verdict par commentaire, aucune `release-db` en attente, puis merge
(`--repo`, `--match-head-commit`). Ensuite, r3_13 « fait » sur la page de la
file A et dans la section « Suivi des lots » de la page « Instruments des
12 besoins », et mise à jour des mémoires.

## Interdits encore actifs

- Aucune formule, table, version ni seuil ; aucune couleur ni aucun mot qui
  juge la valeur (D-333 §2 r4, exception D-355 bornée) ; aucune migration ;
  aucun drapeau ; `lib/equilibre` intouché.
- `frontierePortail.guard` vert ; aucun texte d'écran sans relecture du
  responsable.
- Production en lecture seule ; aucun merge sans une revue de CodeRabbit sur
  le sha de tête.
