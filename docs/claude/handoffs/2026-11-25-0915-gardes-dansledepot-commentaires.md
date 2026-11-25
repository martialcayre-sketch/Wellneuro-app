# Handoff — lot `gardes-dansledepot-commentaires` : commentaires de `dansLeDepot` (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-l0tno3`, tirée d'`origin/main` à bacfdf7f (passe cloud de l'orchestrateur,
  journal `20261125-0908-orch`).
- Carnet : le lot `gardes-dansledepot-commentaires` (file D, ordre 110, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `gardes-dansledepot-commentaires--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; les lignes `lu` appellent des gestes hors de ce lot.

## 2. Objectif

Corriger les commentaires de `dansLeDepot` dans deux gardes : ils disaient que le contrôle de fusion pose le
client Prisma généré en lien symbolique, alors qu'il le copie depuis la partie 11 d'`autonomie-pieges-restes`
(#2305, `scripts/wn-controle-fusion.mjs`, `materialiser`). Fiche : handoffs p11 §6 et p14 §6.

## 3. Décisions prises

- La compensation `dansLeDepot` et les deux contre-épreuves restent : elles valent pour tout arbre où le client
  serait relié hors du dépôt. Les commentaires le disent et citent #2305.
- Les noms de cas (`it(...)`) sont gardés : ils décrivent la contre-épreuve (un vrai lien), toujours exacte.
- Le commentaire de la contre-épreuve `atteintLePaquet` (lien `web/node_modules`) n'est pas touché : le contrôle
  de fusion relie toujours `node_modules`, il reste exact (et hors du périmètre du lot).

## 4. Fichiers modifiés

- `web/src/lib/bio-parcours/outillageBancs.guard.test.ts` — commentaire de `dansLeDepot`, commentaire de la
  contre-épreuve du client.
- `web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts` — mêmes deux commentaires.
- `changelog.d/2026-11-25-gardes-dansledepot-commentaires.md`, ce handoff.

## 5. Validations exécutées

- `npx vitest run` des deux gardes → 2 fichiers, 14 tests verts.
- T1 complet (`cd web && npm run check`) → code 0.
- T2/T3 non joués : interdits en passe cloud (consigne de l'orchestrateur) ; le diff ne touche que des
  commentaires.

## 6. Problèmes ouverts

- Toujours en suspens depuis la partie 11 : deux dossiers `wn-repro-imp-*` sous `$TMPDIR` du Mac.
- Les autres restes des handoffs p11 et p14 sont hors de ce lot.

## 7. Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0, un
verdict par commentaire, « prête @<sha> » ; l'intégrateur merge.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni réponse à une question, ni second lot, ni T2/T3.
- Aucune logique de garde ni `wn-controle-fusion.mjs` dans ce lot.
- Aucune identité réelle dans le dépôt ; aucun secret.
