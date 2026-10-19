# Handoff — Banc PostgreSQL de l'étiquetage en lot (D-325)

## Branche et état Git

`test/banc-etiquetage-lot`, partie de `origin/main` (c60aa78d et suivants).
Une PR, une finalité.

## Objectif

Éprouver le vrai écrivain `etiqueterClaimsLot` contre PostgreSQL. C'était la
réponse 4A du responsable : un lot de suivi, après l'étiquetage de la
vitamine D.

## Décisions prises

- Le banc est un fichier `.ts` lancé par `prisma/runWithAlias.js`, sur le
  modèle du banc de l'écrivain NABM. Il est branché au CI et à T3.
- L'écrivain normalise les clés (besoins triés et dédoublonnés) avant de
  comparer : « 4, 2 » et « 2, 4 » sont les mêmes clés.

## Fichiers modifiés

- `web/scripts/banc-etiquetage-lot-prisma.test.ts` (nouveau)
- `web/src/lib/rag/claims/revue.ts` (normalisation)
- `web/src/lib/rag/claims/revue.test.ts`
- `.github/workflows/ci.yml`
- `scripts/wn-test-worktree.sh`
- fragment de changelog, SESSION_LOG, ce handoff

## Validations exécutées

- Banc joué sur une base locale migrée : 6 cas sur 6 verts. Avant la
  correction, le cas 2 était rouge.
- Vitest de `revue.test.ts` : 67 sur 67.
- T1 complet et T2 : voir la PR.

## Problèmes ouverts

- La ligne « Nature » de D-325 dit encore qu'aucune clé n'est posée par
  l'assistant, ce qui contredit le §5 amendé. Le texte est à écrire par le
  responsable.
- `.claude/settings.json` est modifié localement par `/permissions` (règle
  d'autorisation Chrome du responsable). Il n'est pas committé.

## Prochaine action exacte

CI vert, puis revue CodeRabbit sur la tête, puis merge par l'API avec le sha
de tête. Ensuite, le dossier zinc.

## Interdits encore actifs

- Aucune écriture en base de production hors des routes de l'atelier.
- La signature d'un claim n'est pas déléguée (D-325 §5).
- Aucun contenu clinique au dépôt (D-251 §4).
