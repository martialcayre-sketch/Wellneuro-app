# Handoff — 2026-09-20 — La consignation du drapeau des assiettes indiquées

## 1. Branche et état Git

- Branche `wn-consignation-drapeau-assiettes-2026-09-20`, partie d'`origin/main`
  à `f4512705` (`D-237`).
- **Lot repris d'une session voisine**, sur demande du responsable.
  `developer-e5` a écrit, mergé et posé `D-237` ; elle m'a laissé la main **sans
  rien écrire** — sa branche locale de consignation n'a aucun commit, rien à
  réconcilier.
- Lot **documentaire seul**. **Aucun geste de production** : le drapeau était
  déjà posé quand j'ai repris.
- **Aucun `D-NNN`** : une consignation d'exploitation, pas un arbitrage. Même
  forme que les autres lignes de `FEATURE_FLAGS.md`.

## 2. Objectif de la session

Consigner la pose de `WN_ASSIETTES_INDIQUEES` — dernier reste du § 10 de
`D-237`, dont les quatre premières étapes étaient faites.

## 3. Décisions prises

**Le verdict est POSÉ ET CONSTATÉ**, et il a changé EN COURS DE LOT. Écrit
« non constaté » le 2026-09-20, il l'est resté **21 heures** — jusqu'à ce qu'une
session praticien ouvre la sous-vue le 2026-09-21 à 05:31 UTC et que le journal
porte enfin la route. **Le lot garde la trace des deux états** plutôt que de
présenter le second comme s'il avait toujours été vrai : c'est la discipline
d'attente qui a produit le constat, pas un correctif.

**Le handoff mergé n'est pas réécrit.** Son § 6 porte un compte faux (57 au lieu
de 59) et son § 9 dit « le drapeau n'est pas posé ». Les deux se corrigent **dans
la consignation**, pas dans le document : un handoff dit l'état à l'heure où il
est écrit.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** — la ligne de `FEATURE_FLAGS.md`, qui annonçait encore « fermé, neuf
  et éteint à la livraison » pour un drapeau posé depuis le matin.
- **N'atteint pas** — le constat de comportement. **Et ce n'est pas un oubli** :
  la route teste la session AVANT le verrou (401 dans les deux états, ordre des
  gardes vérifié), donc aucune sonde anonyme ne distingue ; et le seul témoin
  possible — la ligne du journal — **n'a pas pu se produire**, le dernier geste
  praticien datant de la veille de la pose.
- **N'atteint pas** — ce que le praticien verra réellement. Cinq des sept lignes
  passent par `Q_GAS_01` ; la doctrine de `D-236` le dit hors du pack de base,
  `QUESTIONNAIRE_OVERRIDES` le liste au socle. **Ni l'un ni l'autre relu en
  production.**

## 5. Fichiers modifiés

- `docs/FEATURE_FLAGS.md` — la colonne d'état de `WN_ASSIETTES_INDIQUEES`.
- `changelog.d/2026-09-20-consignation-drapeau-assiettes.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## 6. Validations exécutées

- **Sonde du journal d'accès, par conteneur détaché, relue par moi et non reprise
  du pair** (`one-off-7130`, 11:18 UTC) : `journal_acces_dossiers` porte **4 450
  lignes**, **0** pour la route du lot, **dernier geste praticien le 2026-09-19 à
  11:21** — donc avant la pose.
- **Contenance et environnement relus** : `f4512705` déployé deux fois en
  `success` (02:02:42, 02:08:24 UTC) ; `WN_ASSIETTES_INDIQUEES=true`.
- `node --test scripts/wn-coherence-etat.test.mjs` — 29/29.
- T3 non rejoué : aucun fichier sous `web/`.

## 7. Problèmes ouverts

- **`D-233` consigne un mécanisme que la mesure réfute** — « rang 64 de création
  de **contexte** » alors que le bras C de la PR #1184 (contexte unique, page
  neuve) bloque aussi au rang 64, ce qui **exclut le contexte comme compteur**.
  Le compteur porte sur la création de **page**, et le corps de #1184 l'écrit.
  Signalé par `developer-03`, vérifié sur pièce. **Onze occurrences, cinq
  fichiers.** Lot suivant ; ne pas le mélanger à celui-ci.
- ~~Le témoin du drapeau reste à venir~~ — **arrivé le 2026-09-21 à 05:31 UTC**.
- **LA CARTE N'OFFRE NI SÉLECTION NI VALIDATION, et c'est la première fois que
  le manque est dit DEPUIS L'ÉCRAN.** Il est **conforme** — `D-237` §7 pose que
  la route n'expose aucun POST et que la carte ne porte aucun bouton, LOT-02
  restant suspendu à deux arbitrages. Ce qui est neuf n'est donc pas le fait,
  c'est **son origine** : jusqu'ici la limite était déduite du code ; elle est
  maintenant formulée par l'usage, au premier dossier servi. Daté ici pour que
  l'arbitrage de LOT-02 ait sa date de demande, et non seulement sa date
  d'écriture.
  > **Rapporté par la session voisine le 2026-09-21, et NON vérifié ici** : les
  > deux arbitrages seraient désormais rendus — `B2` le 2026-09-18 ([[D-230]]) et
  > `B1` ce jour (retrait d'`attachFoodCompassRef`), ce qui débloquerait LOT-01
  > puis LOT-02. **Écrit comme un rapport, pas comme un fait** : une session ne
  > source pas l'arbitrage d'une autre, et « le responsable a tranché » se source
  > ou se tait. À constater au registre avant de s'en servir.
- **Réserve préexistante, non corrigée** : `bundleClient.guard.test.ts` ne lit
  que les spécifieurs `@/lib/clinical/…` ; la chaîne `PropositionBilanPanel`
  (`'use client'`) le traverse par un module voisin, et crypto-browserify comme
  `ORIENTATION_RULES_V1` partent au chunk client du cockpit depuis le
  2026-08-18. Élargir le garde le rougit immédiatement — c'est un lot.
- **`catalogueConduitesV1`** : signée le 2026-09-17, aucun consommateur.

## 8. Prochaine action exacte

1. Revue lue **aux trois emplacements**, puis merge `--squash --subject`.
2. **Le lot de correction de `D-233`**, séparé.
3. ~~Le jour où un praticien ouvre la sous-vue~~ — **fait le 2026-09-21** : la
   ligne est passée à « constaté », avec sa date et ses chiffres.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- **Aucun geste de production sans autorisation explicite du responsable, pour
  ce geste-là** — une autorisation donnée à une autre session n'atteste rien, et
  l'accord d'un pair n'est pas une autorisation.
- `retries` interdit à Playwright ; un rouge WebKit du CI ne se relance jamais.
- Force-push et arbitrages restent à demander. Autorisation Git courante jusqu'au
  **2026-09-24**.
