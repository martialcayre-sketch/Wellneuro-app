# Handoff — 2026-08-16 — D-060 implémentée, et sept instruments du catalogue biologie ne déclenchent rien

- **État** : `D-060` (disjonction du contrat de déclenchement) implémentée sur
  `feat/d060-disjonction-declencheurs`. T3 complet **vert** deux fois (2 min 07
  puis 2 min 11), E2E Chromium + WebKit compris — le blocage `D-049` ne s'est
  pas manifesté sur ce diff. `wn-reviewer` : **NO-GO puis GO** après
  correctifs. PR à ouvrir.
- **Contexte amont** : première des cinq PR du programme LOT-06 arrêté le
  2026-08-16 (disjonction → migration catalogue → règles + signature biologie →
  signatures restantes → dettes de revue). Prérequis des six panels « X ou Y »
  du catalogue niveau 1.

## Ce que la revue a trouvé, et qui valait le NO-GO

Le cœur tenait : la garde fail-closed a résisté à l'attaque, la garde du moteur
d'arrêt est le même prédicat au même grain, et les `responseId` des cartes de
décision sont inchangés (donc pas de `409 chaine_c1_divergente`). Ce qui
bloquait était en périphérie, et c'était plus grave que le cœur :

1. **Cinq gardes anti-dérive étaient devenues aveugles au `ou`.** Ouvrir le
   type à toutes les tables ne suffisait pas : les gardes filtraient sur le type
   du déclencheur *racine*, et un nœud `ou` — ni zone, ni comparaison, ni
   drapeau — était sauté en silence. Deux d'entre elles protègent le patient :
   une règle d'arrêt écrite sous `ou` aurait pu **éteindre une recommandation
   sur une bande défavorable** sans faire rougir le CI.
2. **Le banc anti-vacuité que j'avais écrit pour éviter ce défaut était
   lui-même vacué** : il assertait le `return` du helper, jamais son câblage.

Correctif retenu : chaque garde devient une fonction qui rend ses fautes,
appelée sur la table réelle **et** sur une règle fabriquée qui cache la faute
sous une branche. Discriminance **vérifiée empiriquement**, pas raisonnée : en
retirant les aplatissements, exactement les contre-épreuves rougissent (4 puis
1 pour `Q_ALI_01`), tout le reste reste vert.

## Découverte hors périmètre — bloquante pour PR-2 et PR-3

Document dédié :
`docs/claude/propositions/2026-08-15-catalogue-biologie-niveau-1/RESERVE-instruments-non-declenchables.md`.

**Sept des dix-sept instruments déclencheurs du catalogue ne peuvent pas
allumer leur panel**, pour deux raisons distinctes :

- **Cinq sont suspendus** (`actif: false`, et **0 passation** en production
  vérifié par lecture MCP) : `Q_NEU_06`, `Q_GEO_03`, `Q_GEO_04`, `Q_GEO_05`,
  `Q_GEO_06`. Ils sont morts en toutes formes, pas seulement sous `ou` —
  `scoresRecalculesPourRaisonnement` rend `null` avant même le calcul. En
  conséquence **`PANEL_MEMOIRE_1` et `PANEL_NEURODEG_1` sont entièrement
  morts** : tous leurs déclencheurs sont dans cette liste.
- **Deux sont vivants en feuille mais inertes en branche** : le HAD
  (`Q_NEU_11`) ne publie aucun compte sur ses sous-scores `A`/`D`
  (`questions.ts:2832-2841`, vérifié à la source), l'IBS-SSS (`Q_GAS_02`) non
  plus. Cela ampute `PANEL_HUMEUR_1`, `PANEL_ANXIETE_1` (qui n'aurait plus
  qu'un déclencheur) et `PANEL_DIGESTIF_1`.

C'est l'incarnation concrète de `D-060` §6 : `{ou:[X]}` est plus restrictif que
`X`. Le HAD en est le cas d'école.

**Trois arbitrages praticien à poser avant d'écrire les règles** — aucun ne se
tranche depuis le code : que faire des deux panels morts (les écrire quand même
avec une condition jamais remplie, les retenir, ou réactiver les instruments) ;
que faire des branches HAD et IBS-SSS (les écrire malgré l'inertie, ou faire
publier leurs comptes par ces moteurs — lot de scoring touchant des instruments
certifiés) ; et si `PANEL_ANXIETE_1` doit garder un `ou` à un seul membre.

**Réserve annexe de transcription** : le tableau des zones du §F.2 de la
proposition écrit « `warning` (5-21) » pour `Q_GEO_03` — c'est l'étendue de
score, pas la bande (la grille publie `warning` 5-14, `danger` 15-21). Le §B
fait foi, pas la colonne du §F.2 : une transcription littérale manquerait la
démence probable.

## Réserves de revue, aucune bloquante pour cette PR

| # | Réserve | Échéance |
|---|---|---|
| RV-1 | **Banc** d'inertie des branches `ou` (l'instrument publie-t-il ses comptes ?). Un audit est un instantané ; l'inertie est silencieuse et un moteur peut cesser de publier six mois plus tard. Vaut aussi mise en CI de la clause opératoire de `D-060` §6, aujourd'hui en prose. | **prérequis dur PR-2** |
| RV-2 | `indicationsBiologieV1` et `contradictionsV1` n'ont **aucune garde de forme** sur leurs déclencheurs — or PR-2 écrira le premier `ou` du dépôt dans la première. Rien à recâbler : une garde à écrire. | PR-2 |
| RV-3 | *(fermée dans cette PR)* contre-épreuve ajoutée à `formeCroiseeQAli01.guard.test.ts`. | — |
| RV-4 | `orientationRulesV1.test.ts:696` — inventaire non aplati (`declencheurs[0].type`). Sans effet : c'est un décompte, pas un interdit. | opportuniste |
| RV-5 | `MATRICE_CONSOMMATION` 7→5 pour la table d'orientation. Aucune consommation perdue : `chaineC1.ts` n'importe plus le type, ce qui rallonge d'un saut le chemin vers les deux routes `protocoles`, au-delà de `PROFONDEUR_MAX = 3`. Réserve nommée `D-060` §8. | lot dédié |
| RV-6 | La perte d'un constat de contradiction (branche atteinte sans `idReponse`) est **silencieuse** — à remonter le jour où une surface « pourquoi rien ? » existera. | lot dédié |

## Vérification faite au passage, utile à PR-3

Les **49 claims** cités par la proposition de catalogue sont tous `VALIDE`,
actifs, non superseded (lecture MCP `rag_corpus_claims`). Aucun écart.
`WN-CL-0239-005` est `prescriptif = false` en base, ce qui confirme
indépendamment la raison pour laquelle la proposition l'écarte.

## Reste du programme LOT-06, inchangé

PR-2 migration catalogue (schéma + données, `release-db`), PR-3 règles +
signature biologie, PR-4 signatures restantes (re-signature priorités,
`shaPerimetre` aux quatre tables, date orientation ISO), PR-5 dettes de la revue
du 2026-08-16 (M-B, L-A, L-C/L-D). **PR-2 et PR-3 sont suspendues aux trois
arbitrages praticien ci-dessus.**
