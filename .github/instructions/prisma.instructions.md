---
applyTo: "web/prisma/**,web/src/lib/prisma.ts,web/src/app/api/**/*.ts"
---

# Prisma, API et données

- `schema.prisma` et les migrations non destructives s'écrivent sans approbation (`D-523`, 2026-11-14). Une migration destructive (DROP, TRUNCATE, DELETE/UPDATE sans WHERE, renommage, changement de type, SQL dynamique, garde désarmée, droits ouverts à `public`/`anon`/`authenticated`), une migration écrite par un shell ou toute écriture en production hors `release-db` restent soumises à une demande explicite et une confirmation distincte.
- La base de production reste en lecture seule sauf demande explicite d’écriture.
- Authentifier et autoriser les routes praticien.
- Valider les entrées serveur ; ne jamais faire confiance au client.
- Ne jamais journaliser token, email patient complet, chaîne de connexion ou corps clinique sensible.
- Préserver la compatibilité des données existantes et éviter toute suppression destructive.
- Pour les lectures de packs, respecter la stratégie registre relationnel puis fallback legacy tant qu’elle est documentée comme active.
