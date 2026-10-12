# Handoff — 2026-10-12 — Hygiène : contextes datés et snapshots de reprise archivés

## Branche et état Git

`docs/hygiene-archivage-contextes`, PR #1405, base `origin/main` (0 de retard).
Worktree `.claude/worktrees/hygiene-archivage`. Diff : 15 renommages purs +
14 références réécrites (chemin seul) + ce handoff + l'entrée `SESSION_LOG`.

## Objectif

Jouer le premier `repo-hygiene.sh apply-safe` réel, demandé par le responsable,
une fois le script portable sur macOS (#1394, `ec987b24`). #1390 (variante
« exige rg ») fermée comme remplacée par #1394.

## Décisions prises

- `apply-safe` seul, sans le mode `report-pr`. Aucun document supprimé : tout
  est déplacé (`git mv`), donc l'historique suit.
- Le handoff du 2026-09-09 garde son chemin d'origine : il décrit un état où le
  fichier cité n'était pas suivi par Git, le chemin d'archive rendait la phrase
  fausse (revue Copilot). Un handoff passé ne se réinterprète pas.
- Les quatre autres handoffs et les fragments de changelog suivent le
  déplacement : ce sont des pointeurs, pas des constats d'état.

## Fichiers modifiés

- `docs/claude/reprise/*` (4) → `docs/archive/reprise/`.
- 11 contextes datés de `docs/claude/` → `docs/archive/contextes/`.
- Références : `docs/DECISIONS.md`, `docs/TRUST_IA_FICHES_ASSIETTE.md`, quatre
  handoffs, quatre fragments `changelog.d/`, deux des documents déplacés.
- `changelog.d/2026-10-12-hygiene-archivage-contextes.md`, ce handoff,
  `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- `git grep` des 15 noms hors `docs/archive/` : aucune mention restante.
- Aucun lien relatif dans les documents déplacés.
- T1 complet (`npm run check`) vert ; `check_no_secrets.sh --staged` OK.
- CI de la PR : code 0 sur la tête poussée avant les corrections de revue.

## Problèmes ouverts

- Aucun lien depuis l'extérieur du dépôt (Claude Docs, artefacts, mémoire) n'a
  été relu : seuls les fichiers suivis ont été balayés.
- Le worktree `hygiene-apply-safe` contient un premier essai non commité,
  identique au contenu de la PR : à supprimer à la main (le garde refuse
  `--force` sur un arbre modifié).
- #1394 a été mergée sans entrée `SESSION_LOG` ni handoff, contrairement au
  contrôle de clôture (constaté ici, non rattrapé : sa trace est ce handoff).

## Prochaine action exacte

Attendre le CI sur la tête poussée, relire les commentaires en ligne, merger
(squash), constater que `main` porte `docs/archive/contextes/` ; puis supprimer
le worktree `hygiene-archivage` et le worktree `hygiene-apply-safe`.

## Interdits encore actifs

- Aucun document déplacé, fusionné ou archivé sans confirmation distincte :
  cette PR n'en vaut pas pour d'autres.
- Pas de `apply-safe` en copie principale ni sur une branche en retard sur
  `origin/main`.
- Aucune identité de dossier réel dans ce dépôt public.
