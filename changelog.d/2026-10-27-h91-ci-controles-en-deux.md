### Outillage : le job `controles` du CI est coupé en deux (H91, temps 1) (2026-10-27)

- `controles` garde, dans leur ordre, les bancs node, la certification, la
  base, les contrats SQL et le seed.
- Un nouveau job, `typage-tests`, joue en parallèle le type-check, Vitest
  (forme courte, puis forme SIIN) et le lint. Il n'a pas de service
  PostgreSQL : aucun spec Vitest n'ouvre de base sans variable explicite.
- `verify` reste le seul check exigé : il attend et teste les trois jobs,
  `controles`, `typage-tests` et `e2e`.
- Mesures avant et après, médiane et p90 : fiche H91 du plan.
