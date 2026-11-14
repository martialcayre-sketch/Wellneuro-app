### D-523 : autorisation permanente bornée d'écrire le schéma et les migrations non destructives sans approbation (2026-11-14)

À la demande du responsable, qui suit la recommandation de l'assistant.

- Toutes les sessions écrivent sans approbation :
  - `schema.prisma` ;
  - une migration non destructive, par Edit ou Write (CREATE, ADD COLUMN, index, contrainte, UPDATE ou DELETE avec WHERE).

  Elles lisent aussi `prisma migrate status|diff` sans demande.
- Restent à la confirmation du responsable :
  - une migration destructive (DROP, TRUNCATE, DELETE ou UPDATE sans WHERE, RENAME, ALTER … TYPE, MERGE, `EXECUTE` dynamique, déclencheur, règle ou RLS désarmés) ;
  - une migration écrite par Bash ;
  - `prisma migrate deploy|dev|reset|resolve`, `migrate diff --from-migrations|--shadow…|--config`, `db push` et `db execute` hors des enveloppes locales ;
  - toute écriture en production hors `release-db`.

  Le SQL destructif exécuté en Bash reste refusé.
- Le chemin vers la production ne change pas : Codex P0, `wn-reviewer`, sonde, `release-db`, constat par conteneur, une migration à la fois (D-520).
- Crochets :
  - `protect-wellneuro-files.mjs` juge une migration sur son contenu résultant, lexé comme PostgreSQL ; ce qu'il ne lit pas avec certitude demande. Les contournements des deux passes de Codex et de `wn-reviewer` sont fermés et éprouvés. Sur les 147 migrations du dépôt, 106 passent en silence ;
  - `block-risky-commands.mjs` laisse passer `migrate status|diff`, sauf `diff` avec `--from-migrations`, `--to-migrations`, `-o|--output`, `--shadow…` ou `--config`, ou une commande que le shell assemble ; une sortie Prisma versée dans autre chose qu'un lecteur demande ; `prisma@x` et une option avant la sous-commande ne masquent plus `migrate deploy` ni `db push` ; l'enveloppe locale devient `scripts/wn-dev-db.sh` (le script cité, `wn-local-migrate.sh`, n'existait plus) et ne dispense que seule ;
  - `guard-prisma-mcp.mjs` : seul son message change.

  Bancs étendus, un cas par motif destructif.
- `CLAUDE.md`, `.claude/rules/db-prisma.md`, `.claude/rules/hooks-garde-fous.md`, l'interdit n° 3 d'`AGENTS.md`, `.github/copilot-instructions.md` et `.github/instructions/prisma.instructions.md` amendés.
