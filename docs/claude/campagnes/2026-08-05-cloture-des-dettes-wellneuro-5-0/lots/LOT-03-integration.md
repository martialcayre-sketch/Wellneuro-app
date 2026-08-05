---
id: "LOT-03"
titre: "Fermer sum_decimal, count_threshold et ecab"
statut: "fait"
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

**2026-08-05.** Le lot tel que rédigé pointait le mauvais fichier
(`web/src/lib/instruments.ts` — homonyme sans calcul de bande, les trois
moteurs sont en fait dans `web/src/lib/questions.ts`) et visait un diff périmé
d'une version : #568 a ajouté un mécanisme distinct (« plancher garanti »,
`severiteCroissante`) par-dessus la garde de base d'#566/#567. Les deux sont
indépendants dans le code — la garde de base seule (`bms_average` comme
gabarit) suffit au résultat observable exigé ; le plancher exigerait un
arbitrage clinique sur le sens de chaque grille, volontairement laissé hors
périmètre (conforme à l'interdit « pas de modification de bande sans demande
explicite »).

Les trois moteurs (`count_threshold` → `Q_INF_05`, `ecab` → `Q_NEU_08`,
`sum_decimal` → `Q_GEO_05`/QDRS) ne produisent plus de bande d'interprétation
sur recueil incomplet ; le total/count reste servi. Calcul du total inchangé
ligne à ligne (diff limité à l'ajout des compteurs `missing`/`repondus` et au
gate de `interp`). Cas `EC10` (ecab, item inversé) vérifié explicitement : un
`EC10` absent n'ajoute rien au total et compte comme `missing`, distinct d'un
`EC10 = 0` qui ajoute 1 et compte comme `repondus` — un test compare les deux
passations à total identique (9) pour prouver que c'est la complétude qui
décide, pas la valeur.

Constat de production (`execute_sql`, lecture seule, 2026-08-05) : une seule
réponse en base sur les trois instruments — `Q_INF_05`, recueil **complet**
(11/11 items). Aucune réponse pour `Q_GEO_05` ni `Q_NEU_08`. Le défaut était
théorique, pas réalisé.

Passe de mutation jouée deux fois indépendamment (exécution, puis revue
adversariale qui a refait le geste elle-même plutôt que de croire le rapport) :
rouge confirmé sur les trois moteurs, vert restauré ensuite. T1 et T3
(`test:worktree` complet, CI complète) verts — 364 fichiers / 3945 tests.

Revue `Agent(wn-reviewer)`, opus : **GO**. Trois points mineurs non bloquants,
non corrigés dans ce lot (changements minimaux) : commentaires devenus faux
dans `orientationEngine.ts:213` et `orientationRulesV1.ts:229` (déclarent ces
trois moteurs « encore ouverts » — ils publient désormais `missing`, donc déjà
couverts par `comptesDuRecueil`) ; les trois boucles n'appliquent pas
`evalConditionnel` comme `sumItems` (latent, aucun conditionnel sur ces
instruments aujourd'hui) ; le texte de `noteRecueil` est dupliqué à l'identique
dans les trois blocs (divergence future possible). Question ouverte non
résolue ici : l'UI praticien affiche-t-elle déjà le champ `note` pour ces
instruments (mécanisme partagé avec PSQI/TFD, pré-existant — pas vérifié,
hors périmètre de ce lot).
