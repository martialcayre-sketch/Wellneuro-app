---
paths:
  - "web/src/app/**"
  - "web/src/components/**"
  - "web/src/**/*.css"
---

# Frontend et UI

- Tous les textes visibles sont en français (labels, messages d'erreur,
  placeholders).
- Respecter le design system WellNeuro existant et ses tokens sémantiques ;
  ne pas créer un nouveau composant si un composant `web/src/components/ui`
  répond déjà au besoin.
- Concevoir tactile et mobile avant les interactions dépendant du survol.
- Préserver accessibilité clavier, focus visible, contrastes et libellés
  explicites.
- Données d'exemple : uniquement Sophie Nicola, Jennifer Martin, Michel Dogné.
- Ne pas modifier l'API, le scoring ou Prisma pour résoudre un problème
  purement visuel.
- Un changement d'UI se vérifie en rejouant les E2E (T2 :
  `npm run test:worktree -- --fast`) — une suite Vitest verte ne prouve rien
  sur les parcours.
