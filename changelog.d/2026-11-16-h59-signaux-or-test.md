### J2-base : le filtre des signaux de sécurité du Fil est figé par un test (H59, D-528, 2026-11-16)

Lot de la file A, tests seuls. Aucun code de production ne change.

- Le Fil lit les passations de sécurité par un seul filtre : les
  questionnaires du catalogue, ou un instrument du cabinet (`CAB_`). Les faux
  Prisma des bancs existants rendaient ce qu'on leur posait, quel que soit
  ce filtre. Retirer l'une des deux branches serait resté vert, et le Fil
  aurait cessé en silence de lire une source.
- Un test de `signauxSecurite.parite.test.ts` exige désormais le filtre
  entier : les deux branches, bornées aux dossiers actifs du praticien de la
  session dont le suivi est ouvert. Le retrait de l'une ou l'autre branche, ou
  du périmètre du praticien, le fait rougir (mutations jouées puis annulées).
