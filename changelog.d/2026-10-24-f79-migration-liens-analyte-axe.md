### Liens analyte-axe : la migration des dix-sept liens signés (D-351 §4-§6, F79, 2026-10-24)

- Une migration de données écrit les dix-sept liens signés de D-351 en un
  seul bloc, tout ou rien : chaque lien n'entre que si son claim est encore
  certifié, actif, non supplanté et en v1.0. Si un seul manque, rien n'est
  écrit.
- Le niveau de preuve devient facultatif. Les dix-sept liens n'en portent
  pas, ce qui signifie « non gradé ». Une lettre hors A-D reste refusée.
- Un même analyte ne peut plus porter à la fois un lien actif vers un
  nutriment et un lien actif vers un axe : la base refuse le second (D-348
  §5).
- Sur une base sans corpus (CI, postes de développement), la migration
  n'écrit aucun lien. Un banc la rejoue sur des claims de fixture, puis
  vérifie que la liste exacte passe et que tout écart échoue.
- Aucun écran ne change : rien ne lit encore ces liens. Le code qui les
  affichera viendra après le constat en production.
