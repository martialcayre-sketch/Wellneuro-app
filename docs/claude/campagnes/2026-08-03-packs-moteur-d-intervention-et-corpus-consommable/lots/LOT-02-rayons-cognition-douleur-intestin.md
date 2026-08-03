---
id: "LOT-02"
titre: "Rayons cognition, douleur, intestin et premier appelant"
statut: "partiel — cognition/intestin livrés (PR #546), douleur (06) à_faire"
dépend_de: "LOT-01"
palier: "T2"
---

# LOT-02 — Rayons cognition, douleur, intestin et premier appelant

## But

Rendre consultables les notebooks 05, 06 et 07 dans la bibliothèque clinique —
**et les brancher à un écran qui les appelle vraiment**.

## La règle de ce lot

Aucun rayon nouveau sans consommateur dans le même lot. Le fichier
`rayonCorpus.ts` le dit déjà de lui-même : cinq rayons y sont déclarés et
inertes, seul `micronutrition` a un appelant. Ce lot ne fait pas passer le compte
de cinq à huit.

## Résultat observable

Un écran praticien affiche des claims des notebooks 05, 06 ou 07 sur une requête
de recherche, avec leur provenance.

## Périmètre

- Étendre `RAYON_VERS_NOTEBOOK` dans
  `web/src/lib/supplement-library/rayonCorpus.ts` :
  `cognition` → `05 — Cognition et mémoire`, `douleur` → `06 — Douleurs
  chroniques`, `intestin` → `07 — Axe intestin-cerveau`.
- Brancher au moins un appelant réel.

## Arbitrage à trancher dans le lot

Le rayon filtre **par notebook entier**, pas par source. Après le LOT-01, seules
les sources d'intervention de ces notebooks seront validées — le reste du
notebook restera en attente. Deux options :

1. restreindre le rayon aux sources du registre LOT-00 (rayon complet mais
   étroit) ;
2. assumer un rayon partiel, alimenté par ce qui est validé (comportement actuel
   du filtre, sans code nouveau).

L'option 2 est le comportement par défaut et ne coûte rien ; l'option 1 demande
un paramètre de filtre supplémentaire. Trancher sur l'usage clinique attendu, pas
sur la facilité.

## Hors périmètre

- Toute exposition patient.
- La validation des claims (LOT-01).
- Un rayon pour les notebooks 11 et 12.

## Fichiers probables

- `web/src/lib/supplement-library/rayonCorpus.ts`
- `web/src/lib/rag/claims/notebooks.ts`
- la surface praticien retenue comme appelant

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de rayon déclaré sans appelant.
- Pas de contournement du filtre `VALIDE`.
- Pas de refactor hors lot.

## Étapes

- [x] Trancher l'arbitrage rayon complet / rayon partiel et l'écrire. (option 2,
  rayon partiel — sans objet en pratique : 05 et 07 sont 100 % VALIDE)
- [x] Étendre le mapping. (cognition, intestin seulement — 06 non validé)
- [x] Brancher l'appelant.
- [x] Vérifier le comportement à vide (message, jamais une erreur).
- [x] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- Un rayon dont le notebook n'a aucun claim validé rend vide avec message, pas
  une erreur ni un filtre ignoré.
- Un rayon inconnu rend le message dédié `MESSAGE_RAYON_INCONNU`.
- Aucun claim non signé ne remonte.

## Critères de done

- [ ] Les trois rayons sont mappés et appelés. (2/3 — douleur/06 reste à faire,
  non validé en base au moment du lot)
- [x] Le comportement à vide est testé.
- [x] Aucun rayon sans appelant n'a été ajouté.

## Résultats

**Livré partiellement le 2026-08-03 (PR #546, mergée).** Notebooks 05
(« Cognition et mémoire », 1114 claims) et 07 (« Axe intestin-cerveau », 370
claims) vérifiés 100 % VALIDE en base (`execute_sql` direct, pas le doc
d'inventaire de la campagne qui porte sur un sous-ensemble différent) — ajoutés
à `RAYON_VERS_NOTEBOOK`. Notebook 06 (douleurs chroniques) volontairement
exclu : pas encore validé.

**Arbitrage tranché** : option 2 (rayon partiel, comportement par défaut du
filtre) — sans conséquence observable ici puisque les deux notebooks sont déjà
100 % validés, mais la question se reposera pour 06 si sa validation reste
incomplète au moment de le brancher.

**Appelant** : nouvelle section « Recherche corpus » dans
`dashboard/bibliotheque`, nouvelle route `/api/praticien/corpus/rayons`,
nouveau composant `RechercheCorpusRayonPanel` — pas le patron de
`RayonComplementsPanel` (catalogue produit), qui ne convenait pas à une
recherche libre par thème clinique. Flag dédié `WN_RECHERCHE_CORPUS_ENABLED`
(éteint par défaut), documenté dans `docs/FEATURE_FLAGS.md`.

**Défaut trouvé et corrigé avant merge (revue adversariale `wn-reviewer`)** :
la route validait `rayon` par une regex syntaxique seule, ce qui l'aurait
laissée servir n'importe quel rayon de `RAYON_VERS_NOTEBOOK` — micronutrition
compris — en contournant `WN_C4_ENABLED`. Corrigé par une allowlist dédiée
(`RAYONS_RECHERCHE_CORPUS`), testée. Corollaire retiré dans la même PR : un
couplage caché où `servirRayonCorpus` forçait `WN_C4_ENABLED` pour **tout**
rayon demandé — le gate produit vit désormais dans la couche accès de chaque
route, pas dans le service générique.

**Reste à faire** : brancher `douleur` (notebook 06) une fois ses claims
validés — même mapping, même route (déjà générique via
`RAYONS_RECHERCHE_CORPUS` à étendre), pas de nouveau lot nécessaire.
