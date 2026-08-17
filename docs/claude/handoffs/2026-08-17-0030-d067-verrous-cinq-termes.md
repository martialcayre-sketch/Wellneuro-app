# Handoff — 2026-08-17 — D-067 : les quatre verrous cliniques à cinq termes, signatures reposées

- **État** : implémenté sur `feat/d067-signatures-shaperimetre` (rebasée sur
  main post-#697, conflit DECISIONS.md résolu — D-067 au-dessus de D-066).
  4 928 tests verts ; T3 vert hors la signature WebKit `D-049`. `wn-reviewer` :
  **GO conditionnel à M1, soldé** — revue PAR MUTATION (worktree jetable).
- **Décision** : `D-067` (registre) — `shaPerimetre` littéral dans les quatre
  métadonnées, validation à cinq termes (booléen, date, forme ISO, claims,
  concordance SHA), re-signature des priorités au 2026-08-16, date
  d'orientation canonicalisée (jour attesté inchangé).

## Ce que la revue a prouvé par mutation, et qui est corrigé

- **M1 (bloquant)** : supprimer le cinquième terme du verrou contradictions
  laissait 1 441 tests verts — sur la seule table au drapeau déjà posé en
  production. Fermé : banc de péremption (`sha-perime` ⇒
  `contradictionsActives() === false`) avec témoin concordant.
- **M2** : le garde de source anti-tautologie de la biologie n'était pas
  étendu. Fermé : `shaPerimetreLitteral.guard.test.ts` — les quatre fichiers,
  ligne à ligne hors commentaires (la mise en garde « SURTOUT PAS » cite
  elle-même le motif interdit).
- **M3** : l'instruction « Re-signature praticien requise » au-dessus de
  `PRIORITY_RULES_SHA256` contredisait la re-signature faite — recalée.
- **M4** : colonne « Verrou » de `FEATURE_FLAGS.md` portée à cinq termes (le
  bloc gardé l'était déjà). Le garde documentaire reste borné au tableau à
  marqueurs — étendre à la colonne « Verrou » est une dette opportuniste.
- **m5/m6/m7** : `afterEach` restaurent `shaPerimetre` partout ; escaliers à
  cinq marches avec chaque terme isolé (claims compris) ; titres recalés.

## Vérifié par la revue, à ne pas refaire

Aucun hunk dans une région hachée (deux méthodes indépendantes) ; les quatre
littéraux recalculés depuis les modules réels — concordance exacte ; aucune
lecture directe de `validationExterne` hors verrou ; fenêtre 409 bornée aux
deux POST protocoles, aucun chemin de lecture, message français ; la date
d'orientation n'entre dans aucune empreinte.

## Assumé / nommé

- **Fenêtre 409 à chaud** (constat M5, 3ᵉ occurrence) : toute carte C1
  préparée avant déploiement et soumise après part en `chaine_c1_divergente` ;
  « Rechargez le cockpit », silencieuse comme les fois précédentes.
- **i8** : `chaineC1Fixture` pose `shaPerimetre = PRIORITY_RULES_SHA256`
  (constante vivante) — légitime pour simuler, mais les bancs passant par lui
  n'exerceront jamais la péremption.

## Reste du programme

PR-5 (dettes M-B, L-A, L-C/L-D) : empiler sur cette branche. PR-2/PR-3
(catalogue + règles/signature biologie) : suspendues à la **reconnexion du
connecteur MCP Supabase** (textes de claims 0178-055, 0044-003, 0239-004/010,
0154-054 ; lecture MAJ-4 des packs ; vérification post-release).
