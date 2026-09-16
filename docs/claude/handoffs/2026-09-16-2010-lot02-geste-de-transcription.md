# Handoff — 2026-09-16 — LOT-02 : le geste de transcription tient en consultation

Troisième lot de la campagne **ouverture du rayon Correspondance**, après
[[D-209]] (PR #1146) et [[D-210]] (PR #1148). Décision **D-212**. Aucune
migration, aucun champ neuf, aucun drapeau, aucune garde de route touchée.

Ce lot ne corrige aucune affirmation fausse à l'écran — les deux précédents s'en
sont chargés. Il corrige **ce que le geste perd** : un brouillon, la fin d'un
texte collé, l'ordre réel des échanges, et la différence entre un dossier vide et
un dossier illisible.

## Les six défauts fermés

| Défaut | Ce qu'il produisait |
|---|---|
| Le panneau est démonté à chaque changement d'onglet | une transcription en cours disparaît sans un mot |
| `maxLength` tronque un collage en silence | le texte consigné n'est pas celui qu'on a collé |
| Le fil se range sur `consigneLe` seul | une lettre de juin transcrite aujourd'hui passe devant septembre |
| Les dates suivent le fuseau de la machine | 00 h 30 à Paris s'affiche la veille côté serveur |
| Le champ médecin repart de zéro à chaque ligne | frappe répétée sur un texte libre non rectifiable |
| La section patient n'a aucune branche d'erreur | un échec de lecture se lit « aucun envoi » |

## Les trois choix qui méritent d'être défendus

**Le compteur du rail garde `consigneLe`, le fil passe à `echangeLe`.** C'est un
écart volontaire entre l'ordre de lecture et la mesure d'attente. `echangeLe` est
saisie à la main ; `consigneLe` est posée par la base et ne peut pas être
antidatée. Ranger le fil sur l'échange rend la chronologie vraie ; fonder une
**alerte** sur une date qu'on peut taper de travers ne l'est pas. L'écart est
écrit dans le code, dans la décision et ici — il ne se découvrira pas.

**La reprise du médecin est un bouton, pas un pré-remplissage.** Le cadrage
disait « se pré-remplit ». Un champ rempli par défaut se valide sans être lu, et
la ligne produite est **définitive** : aucune colonne `supersedes_*`, ni PATCH ni
DELETE. Une attribution fautive tient jusqu'à l'effacement du dossier. C'est le
même arbitrage ouvert depuis le cadrage, et tant qu'il n'est pas rendu, l'écran
doit rester du côté prudent.

**L'onglet monté retient le DOSSIER, pas un booléen.** Un simple drapeau ferait
charger le fil d'un dossier dont l'onglet n'a jamais été ouvert, sur un
changement de patient sans remontage — donc écrire une ligne au journal d'accès
pour une lecture que personne n'a demandée.

## Validation

- **T1 vert** — 138 bancs sur le domaine, 7 neufs.
- **T2 joué** : un changement d'UI ne se prouve pas par du Vitest.
- **Deux mutations, deux mutants tués** : retirer `timeZone` fait rougir le banc
  de fuseau **et lui seul** ; retirer `ordonnerFil` fait rougir les deux bancs
  d'ordre.
- **Le banc de fuseau a d'abord été écrit creux** et corrigé : 21 h 30 UTC et
  23 h 30 à Paris tombent le même jour civil, il passait avec ou sans le
  correctif. Il choisit désormais un instant qui **traverse minuit**. Il ne mord
  qu'en CI — la machine de développement partage le décalage de Paris —, ce qui a
  été vérifié en rejouant la suite sous `TZ=UTC`.
- **Un banc existant a été réécrit pour défendre le nouveau comportement** : il
  n'attendait qu'une alerte parce qu'une seule des deux sections refusait de
  rendre un échec de lecture comme un dossier vide.

## Réserves, inchangées ou nouvelles

- **L'appariement reste par dossier, jamais par médecin** ([[D-210]]).
- **Le rail ne se rafraîchit toujours pas en cours de session.**
- **L'énoncé de la pastille n'est éprouvé par aucun banc** : `SidebarRail` n'a
  aucun banc unitaire, et aucun E2E ne peut voir une pastille que le seed ne sait
  pas produire. Le *comptage* est tenu (route + mutation), pas l'*énoncé*.
- **La nav mobile vers ce rayon reste sans garde** : le second cas de
  `correspondance-rayon.spec.ts` est sauté sur iPhone 13, et `MobileBottomNav`
  n'a aucun banc.

Ces deux dernières se ferment ensemble, par une fixture de consignation dans
`e2e/helpers/db.ts` — l'état où la contradiction devient visible est précisément
celui que le dépôt ne sait pas produire. C'est un diff d'une autre finalité :
il part dans sa propre PR.

## Ce qui reste, et l'ordre

`LOT-03` (la lettre posable et l'ancrage à deux tables), qui **verrouille**
`LOT-04` — la lettre d'adressage, cœur de la campagne : six dossiers sur
vingt-cinq portent un signal qui suspend la décision, et aucune surface n'offre
le geste. Puis `LOT-05` (le registre rattrape le code) et `LOT-06` (la mesure,
parallèle).

Deux arbitrages restent ouverts et n'ont pas bougé : la colonne `supersedes_*`
(aucune rectification n'existe — ce lot vient d'en payer le prix en refusant un
pré-remplissage), et la journalisation de `recentes`.

Suivi : `~/Developer/suivi-rayon-correspondance.html`, tenu à jour à chaque PR.
