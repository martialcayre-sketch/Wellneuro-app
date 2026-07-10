---
description: Détermine automatiquement le prochain lot WellNeuro R0-R6 depuis SESSION_LOG, roadmap et état Git, puis démarre en mode plan token-économe.
---

# WellNeuro — Auto lot

## Contexte minimal injecté

Dernière trace session si disponible :

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`

Roadmap actuelle si disponible :

!`test -f docs/roadmap.md && grep -n "R[0-6]" docs/roadmap.md | head -n 80 || true`

État Git :

!`git status --short`

## Règles projet impératives

- Application WellNeuro : Next.js 14 App Router, TypeScript, Prisma, PostgreSQL Supabase, NextAuth.
- Code principal : `web/`.
- Tous les textes UI en français.
- Aucun secret en dur.
- Aucune donnée patient réelle.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin, Michel Dogne.
- Aucune migration Prisma/SQL/Supabase sans demande explicite et confirmation.
- Changements minimaux, pas de refactor large.
- Opérations Supabase en lecture seule sauf demande explicite d’écriture.

## Mission

1. Détermine le prochain lot logique R0 à R6 à partir du contexte injecté.
2. N’exécute pas encore de changement large.
3. Lis seulement les fichiers indispensables au lot choisi.
4. Présente :
   - lot choisi ;
   - pourquoi ;
   - fichiers à lire ;
   - fichiers potentiellement modifiables ;
   - interdits ;
   - plan court ;
   - critères de validation.
5. Attends validation humaine avant toute modification de code.

Si le prochain lot est ambigu, choisis le lot le plus conservateur : audit/documentation/test avant développement.
