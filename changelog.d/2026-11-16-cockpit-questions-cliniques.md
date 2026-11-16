### Cockpit : une question clinique se tranche aussi depuis le cockpit (D-531, 2026-11-16)

À la demande du responsable, le bouton de réponse du cockpit de la page de
suivi de la file D s'ouvre aux questions `clinique`, en plus des questions
`ordinaire`. La page le présente comme un arbitrage clinique et rappelle
que rien ne change en service avant la décision mergée.

- `docs/ROLES_MACHINES.md` : la session reporte une ligne `clinique` du
  cockpit au lieu de l'écarter ; l'autorité d'une réponse clinique couvre le
  cockpit. Une question `migration` se tranche toujours en séance.
- `scripts/lib/registres.mjs` : le rappel d'autorité des lots bloqués nomme
  le cockpit pour le clinique ; banc aligné.
- D-531 amende la dernière phrase de D-510 §6.
