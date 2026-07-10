---
applyTo: "web/prisma/**,web/src/lib/prisma.ts,web/src/app/api/**/*.ts"
---

# Prisma, API et données

- Aucune modification de `schema.prisma`, migration ou SQL sans demande explicite et confirmation distincte.
- Supabase reste en lecture seule sauf demande explicite d’écriture.
- Authentifier et autoriser les routes praticien.
- Valider les entrées serveur ; ne jamais faire confiance au client.
- Ne jamais journaliser token, email patient complet, chaîne de connexion ou corps clinique sensible.
- Préserver la compatibilité des données existantes et éviter toute suppression destructive.
- Pour les lectures de packs, respecter la stratégie registre relationnel puis fallback legacy tant qu’elle est documentée comme active.
