### Codex appelé par la session, par une commande fermée (D-505) (2026-11-12)

Outillage et doctrine de revue : ni code applicatif, ni clinique, ni migration, ni schéma.

- `D-505` amende la règle du 2026-08-21 (« contre-audit Codex : geste manuel ») : la session appelle Codex elle-même
  pour trois usages — la contre-revue P0, verdict déposé sur la PR ; l'avis joint à chaque question clinique, la
  décision restant au responsable ; l'accord sur une question ordinaire de périmètre borné, qui fait avancer la
  session et s'écrit dans la liste commune. Réponse du responsable à la question `20261112-1702-g`.
- `scripts/wn-codex-avis.mjs` est la seule voie d'appel. Il lance une commande fermée : `--ignore-user-config`, pas de
  shell, pas d'apps du compte, pas de plugins, pas de navigateur ni de recherche web, dossier vide, environnement
  réduit. Il refuse avant envoi un paquet qui porte un secret, une adresse e-mail réelle ou la recommandation de la
  session. Il relit le journal `--json` : un avis où Codex a lu ou lancé quoi que ce soit est non conforme. Son banc
  (`scripts/wn-codex-avis.test.mjs`) est branché dans `bancs-outillage-check`.
- `CLAUDE.md`, `docs/claude/POLITIQUE_REVUE.md` et `docs/ROLES_MACHINES.md` (liste commune) suivent ; le skill
  personnel `$wellneuro-pr-review` reste le repli.
