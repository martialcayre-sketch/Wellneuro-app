### Mention « Tous droits réservés » à la racine du dépôt, contenus tiers exclus nommément (2026-11-15)

Réponse du responsable à `20261114-1825-d` : aucune licence, rendue explicite. La licence définitive se rechoisit après l'avis juridique, hors session.

- `LICENSE` à la racine : « © 2026 Wellneuro. Tous droits réservés. » Aucune licence n'est accordée, et le contenu est fourni sans garantie. Le titulaire est « Wellneuro », choix du responsable : l'identité juridique exacte n'est pas dans le dépôt.
- Une section « Contenus tiers » exclut nommément :
  - les textes d'instruments (`web/src/lib/questionnaires/`) ;
  - les quatre skills tiers de `.claude/skills/` et celui de `.agents/skills/` ;
  - les référentiels publics, fixtures NABM comprises ;
  - les dépendances.
- `"license": "UNLICENSED"` dans `package.json`, `web/package.json` et l'entrée racine de `web/package-lock.json` ; `private: true` est gardé.
- Examen du bundle livré au navigateur (réserve de l'avis Codex) : le minificateur de Next.js retire tous les commentaires de licence, et aucune mention tierce n'est servie (`docs/claude/propositions/2026-11-14-orchestration-5-licence/examen-bundle-navigateur.md`). Le remède, un fichier de mentions tierces généré au build, est inscrit au carnet (`licences-tierces-bundle`).
- Le verrou de résolution des imports (`resolutionImports.guard.test.ts`) admet la clé `license` : c'est une métadonnée sans effet sur la résolution.
- Aucune concession de droits, aucun code applicatif.
