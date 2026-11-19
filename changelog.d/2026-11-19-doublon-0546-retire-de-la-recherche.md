### Corpus : le manuscrit WN-SRC-0546, doublon de sa version publiée, ne remonte plus en recherche (D-490, H15, 2026-11-19)

- Migration non destructive : les claims signés de `WN-SRC-0546` sont exclus de
  la recherche par la marque `exclu_recherche` de `D-490` (statut, signataire et
  date de signature inchangés), chacun avec son acte `exclusion_recherche` au
  journal ; ses passages passent inactifs. La même étude ne sort plus deux fois
  à côté de `WN-SRC-0564`. Rien n'est supprimé ; l'acte se défait (rétablir
  l'exclusion depuis l'atelier, réactiver les passages).
- Aucune colonne, aucun objet de schéma, aucun code applicatif. Un banc rejoue
  la migration sur des fixtures de mêmes identifiants (CI et `test:worktree`).
