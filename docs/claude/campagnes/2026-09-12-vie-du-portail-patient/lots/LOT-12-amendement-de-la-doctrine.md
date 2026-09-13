---
id: "LOT-12"
titre: "amendement-de-la-doctrine"
statut: "terminé — #1067 fusionnée ; D-175 pris au merge, sans collision"
dépend_de: "LOT-07 à LOT-11 (le code est renversé ; le registre ne l'était pas)"
---

# LOT-12 — Le registre dit que D-172 s'est trompée, et D-175 prend la suite

**Documentation seule. Aucun comportement ne change.** Ce lot ferme la campagne
par le seul endroit qui n'avait pas encore été corrigé : le registre des
décisions. Le code avait déjà été renversé (LOT-07 à LOT-11) ; `D-172` continuait
pendant ce temps d'affirmer, en tête du registre actif, l'exact contraire de ce
qui a été livré.

## Pourquoi amender plutôt que réécrire

`docs/DECISIONS.md` est append-only. Une décision fausse ne s'efface pas : elle
se lit avec ce qu'elle a cru, sinon elle n'apprend rien à personne. `D-093` porte
déjà trois amendements selon le même principe.

L'amendement est placé **avant les métadonnées**, immédiatement sous le titre.
Le titre de `D-172` contient sa propre erreur — « consigner n'est pas
assigner » —, et un lecteur qui s'arrêterait là repartirait avec l'inverse de ce
que le responsable voulait. Une note en pied n'aurait pas suffi.

## Ce que l'amendement dit, en quatre temps

1. **L'erreur, nommée sans atténuation.** La demande énumérait les tâches ;
   l'énumération ÉTAIT la demande, pas le piège. Le verdict du responsable,
   rendu devant l'écran livré : la déception.
2. **Comment un écart d'audit a servi d'interdiction.** `A6-R1` / `E11`
   proscrivent un hub EMPILÉ. Une liste ordonnée d'un seul geste mis en avant
   n'est pas cela. La portée a été étendue d'un cran — assez pour transformer un
   garde-fou en refus de ce qui était demandé. Et les quatre arbitrages soumis
   ensuite portaient tous sur le journal : **aucun ne rouvrait le renversement**,
   donc le cadrage approuvé était déjà penché.
3. **Ce qui est retiré**, points 1 à 6 : journal, route, écran, drapeau
   `WN_PORTAIL_JOURNAL`, table `portail_journal_reperes`.
4. **Ce qui survit**, et c'est la part qui valait : le point 7 — une surface
   fermée par son propre drapeau ne produit AUCUNE ligne, même le drapeau
   porteur allumé — repris tel quel par `lecturesAttendues.ts`, où `null`
   (surface close) ne se confond pas avec `[]` (surface ouverte et vide).

Le `Statut` de `D-172` porte désormais « renversé le jour même par `D-175` ».

## D-175 — ce qu'elle pose

La règle unique du fil : **une tâche est un geste que le patient peut poser
MAINTENANT, et elle disparaît quand il l'a posé.** Six points : la règle,
l'interdiction d'inventer une condition de disparition (chaque espèce en avait
déjà une, éprouvée ailleurs), l'unicité de la dérivation (`calculerActionRecommandee`
retirée), le remplacement plutôt que l'ajout, l'accusé de lecture par version
avec écho vérifié au serveur, et l'aveu que `portail_lectures_patient` rend un
décompte POSSIBLE là où sa devancière le rendait impossible — borné trois fois,
et gardé par un test qui n'est pas une contrainte de base.

## Ce qui est consigné, et qu'on n'aurait pas trouvé autrement

`D-175` se termine sur ce que la méthode n'a pas pu attraper : l'ordre des tâches
a été livré faux, et **le banc censé le protéger affirmait la violation sous un
titre qui la niait**. Aucune mutation ne pouvait le voir — la mutation éprouve le
code contre les bancs, jamais les bancs contre eux-mêmes. C'est un E2E de
parcours qui l'a trouvé.

## Numéro pris au merge

`D-175` est libre au moment d'écrire ; le numéro se confirme au merge, comme
toujours. Sept collisions les 2026-09-08 et 09 ont montré que cette friction est
le prix d'un registre unique, et qu'elle est voulue.
