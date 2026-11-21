### Garde des flux Anthropic : lecture allégée, plus d'instabilité sous charge (autonomie-pieges-restes, 2026-11-17)

Correctif de banc, sans code de production.

- `anthropicFluxBorne.guard.test.ts` (#2192) masquait chaînes et commentaires
  de chacun des quelque 2 200 fichiers de `src/` : ~1,5 s seul. Sous la
  charge du contrôle de fusion, il dépassait le délai Vitest de 5 s, puis
  passait au rejeu : il était donc jugé instable et bloquait les merges.
- Désormais, seuls les fichiers dont le texte brut contient un appel
  `messages.stream(` ou `messages.create(` sont masqués. Le masquage ne fait
  que retirer du texte, donc la garde n'est pas affaiblie. Le banc prend
  maintenant 85 ms.
