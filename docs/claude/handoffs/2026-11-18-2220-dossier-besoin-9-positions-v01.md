# Handoff — 2026-11-18 — dossier de preuve du besoin 9, étape 4 : positions v0.1 et liste d'étiquetage préparée (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-etiquetage-positions`, tirée d'`origin/main` 5e4e0f9b (#2241). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel » du responsable du 2026-11-18 (question `20261118-2130-b`). `git` et `gh` en direct.

## Objectif

Lot `besoin9-dossier-etape4` du carnet (file B, ordre 95) : étiqueter les claims `VALIDE` du besoin 9 (délégation `D-325` §5), rédiger les positions v0.1 au dossier privé, préparer la contre-revue. Documentation seule.

## Décisions prises

- Lecture de la boîte B : un seul message non lu (`merge_fait` de #2241), accusé. Aucun report de réponse du cockpit.
- Les 107 claims externes sont tous `VALIDE` (one-off-3196 pour les statuts des 93 premiers ; lecture des 14 de `0601` et `0622` incluse dans la même série, validateurs lus au one-off-312). Étiquetage **sélectif** : seuls les claims cités par les positions (179 : 106 externes, 19 PSS-10, 54 de cours).
- Positions P1 à P35, gabarit des besoins 4 et 5. P26 (règle « protocole d'urgence » du guide) : règle du guide « partiellement étayée, non signable en l'état ». Aucune dose, aucun seuil hors claims.
- **Étiquetage non appliqué** : le navigateur de la session n'est pas connecté à l'atelier (page de connexion). Se connecter est un geste d'authentification : non fait, laissé au responsable.
- Question `20261118-2132-b` (parts 60/20/20) écrite ouverte, `clinique`, avis Codex à l'aveugle : A, confiance moyenne. Message `20261118-2131-b` à la file A (reprise de J3-12f).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-18-01-dossier-besoin-9-positions-v01.md`, `changelog.d/2026-11-18-dossier-besoin-9-positions-v01.md`, ce handoff.
- Hors dépôt : onglet « Positions v0.1 » du dossier privé ; dépôt privé des revues, dossier `besoin9-stress/` (4 pièces) ; carnet, questions et registre de la page de la file D ; bloc-notes `b9/` de la session (requêtes, `liste.txt`, pièces).

## Validations exécutées

- Lectures prod en lecture seule, transactions annulées : one-off-3196 (statuts), one-off-312 (validateurs), one-off-3858 (textes externes), one-off-8734 (corpus de cours), un conteneur pour les textes complets des claims de cours, un autre pour `0601` et `0622`. Tous les identifiants cités existent (script de contrôle).
- Codex à l'aveugle (D-505) sur la question des parts : conforme, 37 s.
- T1 complet et revue de la PR : résultats dans la PR.

## Problèmes ouverts

- Se connecter à l'atelier (`/dashboard/corpus`) dans Chrome, puis coller la liste d'étiquetage (annexe de l'onglet, 179 lignes) : geste délégué, session connectée requise.
- Le responsable doit confirmer qu'il est l'auteur de la validation en série des 107 claims (23 h 35 à 23 h 40 UTC le 2026-11-16), comme pour les 37 du besoin 5 dont l'auteur est resté indéterminé.
- Lancer Codex sur `besoin9-stress/` du dépôt privé des revues (geste du responsable), puis verdicts et v0.2.
- Écart de 14 claims entre le décompte des handoffs (107) et la première lecture (93) : expliqué, ce sont `0601` et `0622`, ajoutés aux positions après la revue de la PR.
- Réponse du responsable à `20261118-2132-b`.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`), revue PR-Agent prouvée (`wn-revue-pr-agent.mjs`) ou `wn-reviewer`, un verdict par remarque, relire la boîte B, puis « prête @<sha> ».
2. Au merge : lot `besoin9-dossier-etape4` à `fait` après l'étiquetage et la contre-revue, sinon le laisser `pris`/`bloque` avec son motif.
3. Reprendre au besoin 3 quand le besoin 9 attend la signature.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucun rubricage, aucune borne au dépôt (`D-251` §4). Aucun code clinique, aucune migration. La signature ne se délègue pas (`DC-16`).
- Aucune écriture de corpus hors étiquetage délégué ; aucune authentification à la place du responsable.
- L'URL du dossier privé et du dépôt des revues reste hors dépôt.
