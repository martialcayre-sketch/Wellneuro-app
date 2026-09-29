### Fiches d'assiette : la contre-revue adverse, et les journaux qui ne recopient plus le message d'une erreur (D-251) (2026-09-29)

- **Contre-revue Codex jouée** sur les lots 1 à 11 : aucun P0, quatre P1.
  Résultat et vérification de chaque trouvaille :
  `docs/claude/REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_2026-09-29.md`.
- **Corrigé : huit journaux recopiaient le message d'une erreur**, qui peut
  porter les arguments d'un appel Prisma (route de diffusion, ingestion des
  fiches, route des lectures du portail — le `logger` garde le message). Ils
  ne gardent plus que la classe et le code, sous une garde lue sur l'arbre
  TypeScript et quatre tests de comportement éprouvés par mutation.
- **Borné, sans migration** (arbitrage du responsable) : la base refuse une
  remise mal rattachée ou une version non validée ; les contrôles de contenu,
  le dossier clos et le caractère humain d'une validation ne tiennent que par
  l'application. Refermer l'espace de lecture prend effet au remplacement des
  conteneurs. Amendement de `D-251`.
- **Seconde passe décidée** : le contre-relecteur n'a joué aucune mutation ;
  une passe dédiée aux mutations suivra.
