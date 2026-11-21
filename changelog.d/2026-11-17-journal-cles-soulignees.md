### Journal : le récit du patient et le résumé praticien sont de nouveau masqués (file D, 2026-11-17)

- `sanitizeLogData.ts` compare chaque clé sous sa forme normalisée, sans
  soulignés ni majuscules. Or les entrées `narratif_patient` et
  `resume_praticien` de la liste des clés bloquées étaient écrites avec leurs
  soulignés : elles ne correspondaient jamais, et ces deux champs pouvaient
  partir au journal en clair.
- La liste est désormais normalisée dès sa construction : toute entrée,
  quelle que soit sa graphie, correspond. Un test couvre les graphies
  `snake_case` et `camelCase` des quatre champs de restitution.
- Défaut relevé par `wn-reviewer` pendant la revue de #2215 et routé par la
  file B.
