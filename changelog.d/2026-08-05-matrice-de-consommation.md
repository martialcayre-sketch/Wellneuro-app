### Ajouté

- **Matrice de consommation du savoir, générée depuis le code**
  (`node scripts/wn-matrice-consommation.mjs --markdown` →
  `docs/claude/MATRICE_CONSOMMATION.md`). Elle répond à une question que
  l'inventaire des corpus ne posait pas : *qu'est-ce qui est consommé, par
  quelle surface, et le patient le voit-il ?* La colonne des surfaces est
  dérivée des imports — une source sans appelant y apparaît avec une surface
  **vide**, au lieu d'être omise en silence comme dans un tableau rédigé.
- **Registre d'arbitrages** `docs/claude/corpus/consommation_decisions.json` :
  un verdict daté (`a_brancher`, `dormante`, `a_retirer`) par source dormante.
  Une source qui s'endort sans décision fait échouer le banc en CI et
  `--strict` en code 2 — la dette se voit le jour où elle naît.

### Corrigé

- La liste des rayons de corpus est désormais **lue dans `rayonCorpus.ts`** au
  lieu d'être recopiée : un rayon ajouté à `RAYON_VERS_NOTEBOOK` entre seul
  dans la matrice, dormant. C'est la classe de défaut de #546 puis #552, où une
  liste maintenue à la main avait exposé des rayons derrière le mauvais
  drapeau.

### Constaté

- **Six sources dormantes sur dix-neuf.** La plus coûteuse : la bibliothèque de
  biologie fonctionnelle — les 987 actes NABM V105 sont en base depuis le
  2026-07-26, et **aucun fichier hors de `web/src/lib/biology-library/` ne les
  touche**. `WN_CB_ENABLED` garde une porte qui ne mène nulle part. Verdict
  `a_brancher`, porté par la campagne du rayon biologie.
- Cinq rayons de corpus (biologie, nutrition, sommeil, stress, humeur) restent
  sans appelant : corpus prêts, allowlist `RAYONS_RECHERCHE_CORPUS`
  délibérément limitée à cognition/douleur/intestin. Verdict `dormante`, avec
  raison et date de réexamen — l'élargir est une décision praticien.
