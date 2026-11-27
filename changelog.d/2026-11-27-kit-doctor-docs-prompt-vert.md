### Documentation : prose du prompt de contre-revue Codex sans motif de secret (lot kit-doctor-docs-prompt-vert)

- Le prompt de contre-revue des mutations (`docs/claude/campagnes/2026-09-30-bio-ingest/`) ne cite plus le motif
  d'affectation de `DATABASE_URL` tel quel. Il dit désormais d'exporter d'abord la variable, puis de lancer la
  commande : une commande copiée seule ne vise plus une autre base.
- La ligne `docs/` de `wn-kit-doctor` reste rouge sur un handoff historique, qui ne se réécrit pas. Ce rouge est
  accepté par le responsable (2026-11-27) ; aucune exemption ni détection affaiblie.
