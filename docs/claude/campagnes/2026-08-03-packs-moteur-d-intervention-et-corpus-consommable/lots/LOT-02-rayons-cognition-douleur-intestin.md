---
id: "LOT-02"
titre: "Rayons cognition, douleur, intestin et premier appelant"
statut: "à_faire"
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

- [ ] Trancher l'arbitrage rayon complet / rayon partiel et l'écrire.
- [ ] Étendre le mapping.
- [ ] Brancher l'appelant.
- [ ] Vérifier le comportement à vide (message, jamais une erreur).
- [ ] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- Un rayon dont le notebook n'a aucun claim validé rend vide avec message, pas
  une erreur ni un filtre ignoré.
- Un rayon inconnu rend le message dédié `MESSAGE_RAYON_INCONNU`.
- Aucun claim non signé ne remonte.

## Critères de done

- [ ] Les trois rayons sont mappés et appelés.
- [ ] Le comportement à vide est testé.
- [ ] Aucun rayon sans appelant n'a été ajouté.

## Résultats

À compléter à la clôture.
