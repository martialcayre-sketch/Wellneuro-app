### Arrêts, contradictions et conflits de sources : validité des claims constatée au service (D-491, t72, 2026-11-11)

Dette t72 (§8), versée par t66. Arbitrages du responsable du 2026-11-11 (questions 20261111-1552-a à 1555-a). Aucune
migration, aucune re-signature : `STOP_RULES_V1`, `CONTRADICTIONS_RULES_V1`, `CONFLITS_SOURCES_V1` et leurs empreintes
sont inchangées. `release-db` à approuver séparément.

- Critère de D-472 §2 (couple exact valide au corpus ET non supplanté), lu par un module partagé
  (`admissibiliteClaims.ts`).
- Règles d'arrêt : une règle dont un claim n'est pas admissible n'est pas passée au moteur et ne retire aucune
  exploration ; « Règle d’arrêt suspendue » est affiché au cockpit avec les claims concernés. Un corpus illisible
  n'autorise aucune extinction.
- Contradictions : le constat et le frein de l'extinction sont maintenus ; le cockpit ajoute « Réserve sur la source »
  et marque le claim en cause.
- Conflits de sources : le conflit reste servi et escaladé ; le cockpit ajoute « Registre de conflits à relire » et
  désigne le claim en cause.
- §8 du plan : la ligne t72 est corrigée (une règle d'arrêt est une règle d'extinction, D-053, pas un signal de
  sécurité DC-12) et soldée.
