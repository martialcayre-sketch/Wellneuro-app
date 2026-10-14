### Gouvernance : arbitrages de clôture de la revue CodeRabbit (D-291, 2026-10-14)

Documentation seule, sans code, sans migration, protection de `main` inchangée.

- CodeRabbit **n'est pas** un check obligatoire de `main` : son statut passe au
  vert même quand il saute la revue ; la condition de merge reste la revue lue
  sur le sha de tête.
- Copilot reste dans les extensions recommandées de l'éditeur.
- La case « Autofix » de la synthèse se désactive dans l'interface de
  CodeRabbit (geste du responsable) ; la règle « ne jamais la cocher » reste.
- **Une PR qui modifie `.coderabbit.yaml` est P1** : passe `wn-reviewer` avant
  le merge, pour vérifier qu'elle n'affaiblit pas la revue
  (`docs/claude/POLITIQUE_REVUE.md`, règle 1.10 de
  `.claude/rules/pr-revue-et-release-db.md`, plan §8 mis à jour).
