---
id: "LOT-07"
titre: "Clôture — déclarer 5.0, ou dire ce qui manque"
statut: "à_faire"
dépend_de: "LOT-00 à LOT-06"
---

# LOT-07 — Clôture : déclarer Wellneuro 5.0, ou nommer ce qui manque

## But

Rendre un verdict, pas une impression. Soit les six dettes sont fermées et 5.0 est
déclarable, soit il reste quelque chose — et ce quelque chose est nommé, daté,
avec son propriétaire.

Une campagne de clôture qui se termine par « globalement bon » n'a rien clos.

## Résultat observable

Un document `DECLARATION_5_0.md` qui, pour chacune des huit dettes de l'audit
d'entrée, dit : **fermée** (avec la preuve), **arbitrée et reportée** (avec la
date de revue), ou **ouverte** (avec le lot suivant qui la porte).

Et deux faits vérifiables, indépendants de tout jugement :

- aucune PR ouverte non justifiée — #435 et #372 sont soldées ;
- `node scripts/wn-etat-reel.mjs` ne signale aucun écart avec `.wn/state.json`.

## Périmètre

- Rassembler les résultats des lots 00 à 06.
- Écrire la déclaration, dette par dette.
- Solder les PR ouvertes.
- Collationner `changelog.d/`.
- `/wn-finish` puis `/wn-handoff write` — **sur la branche vivante**, avant la PR
  de campagne, jamais après le merge.

## Hors périmètre

- Toute nouvelle correction : ce qui est trouvé ici devient un lot, pas un patch.
- Lever G-TRUST-04.
- Déclarer close une dette dont la preuve manque — c'est exactement ce que ce lot
  existe pour empêcher.

## Fichiers probables

- `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md`
- `CAMPAGNE.md` (statuts de lots)
- `docs/claude/handoffs/2026-MM-JJ-HHMM-cloture-dettes-5-0.md`
- `changelog.d/`

## Interdits

- Pas de déclaration « fermée » sans artefact vérifiable en face.
- Pas de secret ni de donnée patient réelle.
- Pas d'édition manuelle de `ACTIVE_CAMPAIGN.md` (vue générée).
- Pas de merge de la PR de campagne sans lecture du code de sortie de
  `node scripts/wn-attendre-ci.mjs` — `0` est le seul code qui autorise à annoncer
  la PR prête.

## Étapes

- [ ] Rassembler les résultats des sept lots précédents.
- [ ] Écrire `DECLARATION_5_0.md`, dette par dette, preuve par preuve.
- [ ] Vérifier qu'aucune PR n'est ouverte sans justification.
- [ ] Rejouer `wn-etat-reel.mjs` : zéro écart.
- [ ] T3 complet.
- [ ] `/wn-finish`, puis `/wn-handoff write`.

## Tests

- T3 `npm run test:worktree` complet.
- `bash scripts/check_no_secrets.sh` sur le dépôt entier.
- `node scripts/wn-cycle.mjs` : la phase doit être cohérente avec la clôture.

## Critères de done

- [ ] `DECLARATION_5_0.md` couvre les huit dettes, sans case vide.
- [ ] Chaque « fermée » a sa preuve ; chaque « ouverte » a son lot suivant.
- [ ] #435 et #372 soldées.
- [ ] `wn-etat-reel.mjs` : zéro écart.
- [ ] Handoff produit sur la branche vivante.

## Résultats

À compléter à la clôture.
