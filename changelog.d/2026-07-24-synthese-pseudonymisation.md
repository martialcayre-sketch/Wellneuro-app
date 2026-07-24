### Sécurité

- **Synthèse IA — appel Anthropic pseudonymisé** (audit migration HDS,
  correctif immédiat n° 1). Le message envoyé à l'API ne porte plus la ligne
  `Patient : prénom nom` — seul identifiant direct du prompt ; le contexte
  clinique excluait déjà l'identité par construction. Une garde structurelle
  (`pseudonymisation.guard.test.ts`) échoue si l'identité y revient. La
  synthèse produite et son stockage en base sont inchangés.
