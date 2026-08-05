---
id: "LOT-03"
titre: "Fermer sum_decimal, count_threshold et ecab"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-03 — Fermer les trois moteurs de scoring encore ouverts

## But

#566 (PSQI) et #567 (TFD) ont fermé une classe de défaut : **une bande
d'interprétation lue sur un instrument incomplet**. Les commits eux-mêmes
reconnaissent que `sum_decimal`, `count_threshold` et `ecab` restent exposés à la
même classe conceptuelle. Ils ne sont simplement pas encore ciblés par une règle
d'orientation publiée.

La règle est explicite au cadrage : **on les corrige avant de les relier à une
règle**, jamais après. Une règle branchée sur un moteur ouvert transforme un
défaut latent en décision clinique fausse.

## Résultat observable

Pour chacun des trois moteurs : un recueil partiel ne produit **jamais** une bande
d'interprétation ni un score présenté comme comparable. Le comportement de
dégradation est le même que celui retenu pour le TFD et le PSQI, et il est
démontré par un test qui rougit si la garde est retirée.

## Périmètre

- `sum_decimal`, `count_threshold`, `ecab` dans `web/src/lib/instruments.ts` et
  `web/src/lib/questions.ts`.
- Aligner sur la garde déjà retenue (#566, #567) — **pas** une troisième variante.
- Vérifier en production (`execute_sql`, lecture seule) s'il existe des passations
  partielles sur les instruments concernés : cela dit si le défaut est théorique
  ou déjà réalisé.

## Hors périmètre

- Le moteur `subscore` (8 instruments, dont 4 avec bandes d'axe) — arbitrage
  distinct, explicitement écarté au handoff du 2026-08-04.
- Toute modification de seuil clinique.
- Brancher une règle d'orientation sur ces moteurs.

## Fichiers probables

- `web/src/lib/instruments.ts`, `web/src/lib/instruments.test.ts`
- `web/src/lib/questions.ts`
- `web/src/lib/questionnaires/*.ts`
- `changelog.d/2026-08-05-trois-moteurs-recueil-partiel.md`

## Interdits

- Pas de modification de seuil ni de bande sans demande explicite.
- Pas de migration.
- Pas de refactor du moteur `subscore`.

## Étapes

- [ ] Inventorier les instruments servis par chacun des trois moteurs.
- [ ] Lire la production : passations partielles existantes ?
- [ ] Appliquer la garde, à l'identique de #566/#567.
- [ ] Passe de mutation : retirer chaque garde doit faire rougir un test.
- [ ] Revue adversariale (`wn-reviewer`) — lot clinique.
- [ ] T3 `npm run test:worktree`.

## Tests

- Un test par moteur, sur un recueil partiel : pas de bande, pas de score
  comparable.
- Un test de non-régression sur recueil complet : le score reste identique.
- Passe de mutation documentée dans le lot.

## Critères de done

- [ ] Les trois moteurs refusent la bande sur recueil partiel.
- [ ] La passe de mutation est jouée et consignée.
- [ ] Le constat de production (partiels existants ou non) est écrit.
- [ ] Revue adversariale rendue GO.
- [ ] `changelog.d/` posé (changement de comportement clinique).

## Résultats

À compléter à la clôture.
