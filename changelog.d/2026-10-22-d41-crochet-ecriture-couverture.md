### Crochet d'écriture : deux fichiers cliniques de plus sous « demande », dérogation du garde Bash retirée (plan D/41) (2026-10-22)

- `stopRulesLibelles.ts` et `questionnaires/alimentaire.ts` (qui pilote
  `VERSION_SCORE_EQUILIBRE`) demandent désormais confirmation à l'écriture,
  avec le motif clinique (`D-xxx`, `DC-17`/`DC-18`). La fixture
  `chaineC1Fixture` reste libre. Candidats du Socle LOT-02, tranchés par le
  responsable le 2026-10-21.
- `WN_ALLOW_RISKY_COMMAND=1` ne fait plus sortir le garde des commandes sans
  rien lire : la variable est retirée, et un banc vérifie qu'elle ne lève plus
  le refus.
- `CLAUDE.md`, `.claude/rules/hooks-garde-fous.md` et le commentaire de
  `scripts/wn-test-worktree.sh` alignés.
