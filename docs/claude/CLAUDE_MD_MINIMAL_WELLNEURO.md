# CLAUDE.md minimal — WellNeuro

Projet : WellNeuro, app santé neuronutrition.

Stack : Next.js 14 App Router, TypeScript, Prisma, PostgreSQL Supabase, NextAuth praticien.

Règles impératives :
- Aucun secret en dur.
- Tous les textes UI en français.
- Aucune donnée patient réelle.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin, Michel Dogne.
- Pas de migration Prisma/SQL/Supabase sans demande explicite et confirmation.
- Changements minimaux, pas de refactor large.
- Supabase en lecture seule sauf demande explicite d’écriture.

Routine :
- Lire la dernière entrée de `docs/claude/SESSION_LOG.md` au début d’un lot.
- Utiliser le flux campagne-first : `/wn-campaign-run`, `/wn-campaign next`, `/wn-plan`, puis `/wn-finish`.
- Considérer `/wn-r0` à `/wn-r6` comme commandes legacy (compatibilité), pas comme chemin principal.
- Ne jamais « analyser tout le projet » si le lot peut être limité.
