# Handoff — 2026-11-11 — PR-Agent : runs GitHub bloqués sans job

## Branche et état Git

- `fix/pr-agent-runs-sans-job`, worktree propre à la session, depuis
  `origin/main` `68293eb17`. Aucun changement d'une autre session.
- Correctif du lecteur uniquement ; aucun workflow ni protection modifié.

## Objectif

Diagnostiquer les trois runs signalés et rétablir la preuve PR-Agent sans
admettre une commande ayant pu remplacer la revue complète.

## Décisions prises

- Lire `jobs?filter=all&per_page=100`, paginé, pour les candidats encore
  `queued` et sans conclusion. Cette lecture suit celle des commentaires.
- Seule une réponse complète et cohérente à zéro job permet d'écarter ce
  candidat ; diagnostic explicite. Un job même ancien garde le blocage.
- Toute erreur ou réponse illisible donne 2. Aucun filtre par identifiant,
  acteur, titre ou ancienneté. Les commandes sur la PR restent bloquantes.
- Ne pas changer les déclencheurs du workflow ni supprimer la condition (d).

## Fichiers modifiés

- Lecteur `scripts/wn-revue-pr-agent.mjs` et son banc.
- Règle `.claude/rules/pr-revue-et-release-db.md` §1.6.
- Fragments changelog, H93 et ce handoff.

## Validations exécutées

- API : les trois runs signalés sont `queued`, sans conclusion ni job.
- Banc ciblé : 52 tests verts, dont erreurs API, pagination incohérente,
  tentative antérieure ayant un job, statut différent et commande sur la PR.
- Même collecte API rejouée avec les deux lecteurs sur #1994,
  tête `70c9e8f81a92f6f1a1f9fa78618de5d6a49e576f`, run `43101010775` :
  ancien code 1, nouveau code 0 ; (a), (b), (c) identiques.
- Quatrième run trouvé dans cette collecte : `43097270199`, même état et
  zéro job sur toutes les tentatives.
- T1 rapide, T1 complet, anti-secrets et revue indépendante : résultats
  consignés dans la PR avant déclaration prête.

## Problèmes ouverts

- Les runs ne sont pas annulés. Pour `43097978201`, le 2026-11-11 à
  22:10 UTC : force-cancel 409, « Cannot cancel a workflow run that has not
  been queued yet » ; DELETE 403, « Could not delete the workflow run ».
  Request IDs : `484C:1702:2AFD9C7:4103F18:6AF4E7C4` et
  `4846:17BB0C:5D31B22:8C0422D:6AF4E7D0`.
- La documentation GitHub décrit ce symptôme :
  <https://docs.github.com/en/actions/how-tos/troubleshoot-workflows#canceling-workflows>.
  Le support GitHub peut nettoyer l'état serveur ; aucun ticket envoyé.
- La fenêtre de collecte des runs sur commentaire (une heure avant le
  début de la revue) est préexistante et inchangée. La comparaison sur une
  revue historique prouve la correction sans compter sur leur vieillissement.

## Prochaine action exacte

CI et revue de tête, avec revue indépendante du garde. Après merge,
vérifier le lecteur de main sur #1994 et une revue courante. Pour le
nettoyage serveur, transmettre au support les quatre run IDs, les deux
request IDs et le diagnostic ci-dessus si le responsable le demande.

## Interdits encore actifs

- Aucun secret ni fichier `.env*` lu, affiché ou modifié.
- Aucune migration, écriture en production, donnée patient ou règle clinique.
- Aucun feu vert sur une lecture impossible ni assimilation d'un run vide
  à une revue. Les quatre conditions de revue demeurent.
