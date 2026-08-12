# LOT-08 — un lot d'accueil pour ce que la campagne traînait

- **Branche** : `campagne-lot-08-extinction-operante`, vivante, non mergée.
  Partie de `f4a8bae4`, `origin/main` contenu.
- **Campagne** : chaîne T0 opérationnelle. **Le lot courant reste LOT-04** — ce
  diff ne le déplace pas.
- **Nature** : planification de campagne, aucun code, aucune décision clinique.
  `D-054` est *exigée* par le nouveau lot, elle n'est pas écrite ici.

## Le fait qui a corrigé le cadrage

La PR #669 s'appelle « LOT-04 — Candidats d'intervention déterministes (chaîne
C1) », mais son diff ne contient **que l'ouverture du lot** : quatre fichiers de
bookkeeping (`.wn/state.json`, `CAMPAGNE.md`, la fiche du lot,
`ACTIVE_CAMPAIGN.md`). Aucune ligne de code. **Le LOT-04 est ouvert et non
livré** — il n'y avait donc aucune clôture en retard à rattraper, contrairement
à ce que le titre du commit laisse lire. Un titre de PR n'est pas un état de
livraison ; `git show --stat` tranche en une commande.

## Ce que le diff pose

Un **LOT-08 « Extinction opérante »**, seul lot créé, qui rassemble les trois
dettes qui n'en font qu'une : STOP-STR est écrite, testée, et **ne peut rien
éteindre**. Son déclencheur porteur `Q_STR_01` passe par `group_majority`, qui
ne publie ni `missing` ni `repondus` ; `totalSousScore` rend un total dès un
item par groupe (trois réponses sur vingt et une produisaient la bande la plus
favorable) ; la garde de complétude du moteur d'arrêt refuse donc d'éteindre.
Le lot y ajoute `D-053 §5` (une contradiction ouverte doit **empêcher**
l'extinction — dette sans code, un frein absent ne retient rien) et la
distinction éteinte/recommandée dans `verifierRestitutionOrientation`, qui
n'a aujourd'hui **aucune notion d'extinction** en 171 lignes : c'est la
consigne du prompt qui protège, et une consigne n'est pas une garde.

Le lot dépend du LOT-03, est parallélisable avec le LOT-04, et **s'exécute
avant le LOT-05** : les deux étendent le même garde de restitution.

## Ce qui a été routé plutôt qu'empilé

- **Ancienneté de l'exclusion `dejaRepondu`** → question ouverte de campagne.
  Non codable : aucun chiffre fondé au dépôt, la fenêtre de fraîcheur a déjà
  été écartée pour ce motif (`DC-19`, `DC-20`). C'est un arbitrage praticien.
- **Vigilances de synthèse du LOT-01** → périmètre du LOT-05 (même garde LLM).
- **E2E du parcours nominal T0** → périmètre du LOT-07, avec son obstacle
  nommé : les trois patients autorisés sont tous centraux, en peupler un
  déplace quatre bancs dont une capture pixel.
- **T0 irrévocable** → backlog, lot propre classe Prisma/Auth, hors campagne.

## Ce qui reste ouvert

`D-054` doit trancher un point qui n'est pas cosmétique : publier les comptes
est indolore, mais **toucher à `total` quand le recueil est incomplet déplace
une interprétation clinique déjà servie en production**. Le lot le pose comme
arbitrage explicite, pas comme effet de bord.

## Validation

T1 vert (313/313), audit de campagnes `ok: true` — 0 erreur, l'unique warning
(`duplicate_lot_ordinal`) est étranger, il porte sur `2026-07-11-refonte-ux`.
`wn-coherence-etat` 24/24. Diff purement documentaire : aucun test ne lit un
`.md`, le palier reste T1.
