---
paths:
  - "web/src/lib/auth.ts"
  - "web/src/lib/patient-session.ts"
  - "web/src/lib/patient-access.ts"
  - "web/src/lib/portail/**"
---

# Authentification et accès

- Périmètre sensible : auth praticien (NextAuth, domaine `@wellneuro.fr`),
  session et accès patient (`patient-session.ts`, `patient-access.ts`), lien
  magique et token du portail (`web/src/lib/portail/`).
- Autoriser **avant** de lire les données ; valider côté serveur ; ne jamais
  faire confiance au client.
- Ne jamais journaliser token, cookie de session, email patient complet ou
  chaîne de connexion.
- Tout changement sur ce périmètre exige une revue adversariale
  `Agent(subagent_type: "wn-reviewer")` avant merge (règle portée par
  `/wn-merge`, valable même en régime transitoire) — la revue de diff ne voit
  pas ce que le changement **ne fait pas**.
- Palier de validation : T3 (`npm run test:worktree`) avant PR.
