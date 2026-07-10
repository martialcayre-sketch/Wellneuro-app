---
description: Lot R0 WellNeuro — réalignement documentaire sans modification de code applicatif.
---

# LOT R0 — Réalignement documentaire WellNeuro

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Mettre la documentation au niveau réel du code, sans modifier le code applicatif.

## Fichiers autorisés à lire

- `README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/claude/PROJET_CONTEXTE.md`
- `docs/claude/SESSION_LOG.md`
- `web/src/lib/auth.ts`
- routes patient/praticien strictement nécessaires si une affirmation documentaire doit être vérifiée

## Fichiers autorisés à modifier

- `README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/claude/PROJET_CONTEXTE.md`
- `docs/claude/SESSION_LOG.md`

## Points à documenter ou corriger

- Décommission Sheets/OAuth Sheets.
- Portail patient principal `/portail/[token]`.
- Cookie signé `wn_portail`.
- Hub « Mes questionnaires ».
- Pages autonomes par questionnaire.
- Consentement groupé au niveau accès/assignation.
- Flux legacy `/patient/[idAssignation]` seulement en compatibilité si encore présent.
- Registre relationnel questionnaires/packs.
- Roadmap R0-R6.

## Interdits

- Ne pas modifier `web/app/**`, `web/src/**`, `prisma/**`, migrations, scoring clinique.
- Ne pas ajouter de fonctionnalité.
- Ne pas créer de migration.

## Méthode

1. Lis uniquement les fichiers autorisés.
2. Liste les contradictions trouvées.
3. Liste les fichiers à modifier.
4. Attends validation avant modification.
5. Après validation, corrige uniquement la documentation.
6. Termine par fichiers modifiés, avant/après, points à tester, prochaine action recommandée.
