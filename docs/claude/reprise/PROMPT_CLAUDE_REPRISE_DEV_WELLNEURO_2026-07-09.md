# Prompt Claude — Reprise dev WellNeuro après audit roadmap

Tu travailles sur le dépôt GitHub `martialcayre-sketch/Wellneuro-app`.

## Contexte

Le projet WellNeuro est une application de neuronutrition clinique avec :

- Next.js 14 App Router ;
- TypeScript ;
- Prisma 7 ;
- PostgreSQL Supabase ;
- NextAuth Google côté praticien ;
- portail patient permanent ;
- synthèse IA ;
- packs de questionnaires ;
- moteur « Mon équilibre ».

## Règles impératives

- Ne jamais écrire de secret en dur.
- Tous les textes UI doivent être en français.
- Ne jamais utiliser de données patient réelles.
- Seuls les patients fictifs autorisés sont :
  - Sophie Nicola ;
  - Jennifer Martin ;
  - Michel Dogne.
- Ne pas modifier la logique clinique ou les seuils de scoring sans demande explicite.
- Ne pas faire de migration Prisma sans demande explicite et confirmation.
- Changements minimaux, pas de refactor large.

## État réel à prendre en compte

Le code est plus avancé que certaines docs.

Fonctionnalités récentes à considérer comme déjà présentes :

- portail patient `/portail/[token]` ;
- cookie signé `wn_portail` ;
- hub `/portail/[token]/questionnaires` ;
- pages autonomes par questionnaire ;
- brouillon local ;
- reset de brouillon ;
- demande de correction enrichie ;
- consentement groupé traçable ;
- synthèse IA nourrie par fiche signalétique + anamnèse ;
- registre normalisé questionnaires/packs ;
- retrait du scope OAuth Google Sheets.

## Objectif de la prochaine session

Ne pas ajouter de nouvelle fonctionnalité métier.

Faire d'abord le lot :

# R0 — Réalignement documentaire

## Tâches

1. Lire :
   - `README.md`
   - `AGENTS.md`
   - `docs/roadmap.md`
   - `docs/claude/PROJET_CONTEXTE.md`
   - `docs/claude/SESSION_LOG.md`
   - `web/src/lib/auth.ts`
   - les routes praticien principales si nécessaire

2. Identifier les mentions obsolètes :
   - Google Sheets encore actif ;
   - `SHEET_ID` encore obligatoire ;
   - route `migrate-historique` encore active ;
   - ancien flux patient comme flux principal.

3. Mettre à jour uniquement les fichiers documentaires nécessaires.

4. Documenter clairement :
   - portail patient permanent ;
   - hub « Mes questionnaires » ;
   - flux legacy `/patient/[idAssignation]` conservé en compatibilité ;
   - décommission Sheets/OAuth ;
   - registre relationnel packs/questionnaires ;
   - prochaine roadmap R0 à R6.

5. Vérifier :
   - aucun secret ;
   - aucun changement de code ;
   - pas de donnée patient réelle ;
   - textes français.

## Sortie attendue

- Résumé des fichiers modifiés.
- Raisons des modifications.
- Points restant à tester.
- Prochaine action recommandée : R1 — validation E2E du parcours patient unifié.
