# Plan WellNeuro 6.0 : la feuille de route unique

Décision de forme : `D-285` (lettre cq). Version du 2026-10-13, établie sur
`origin/main` 193b614c (#1416). Ce fichier est la seule feuille de route du
dépôt. Il remplace `docs/ROADMAP_PRODUIT.md`,
`docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md`,
`docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`,
`docs/claude/ROADMAP_AGENT_PLAN.md`, `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md`
(ses dettes vivantes sont au §8) et la file d'attente
`docs/claude/campagnes/FILE_ATTENTE.md` ; leur sort est écrit au §9 et au §11.
Il absorbe la feuille de route BioFlow
(`docs/architecture/bioflow/BIOFLOW_ROADMAP.md`, fiches Fnn), qui garde ses
règles de parallélisme ; ses gates G1 à G3 sont levés.

**Mise à jour (2026-10-14)** : état reporté au 2026-10-14 sur `origin/main` 474e9d67 (#1444), par lignes datées ; le reste du texte vaut au 2026-10-13. Les chemins ci-dessus sont ceux d'avant le versement : les cinq feuilles de route sont sous `docs/archive/roadmap-updates/`, bandeau « Archivé le 2026-10-14 » (PR 4, #1421) ; la file d'attente est supprimée, son texte reste dans l'historique Git (PR 5, #1422). Les citations de la file et des anciens chemins que le plan garde (§6, §8, §11) sont des adresses d'historique.

**Forme opaque.** Le dépôt est public : ce plan ne porte que des identifiants
(lettres a à cq, lots BP-nn, portes 1 à 30, rangs, places de la file C, fiches
Fnn et Hnn), des mécanismes et des renvois `D-xxx`. L'objet détaillé de chaque
lot, les textes du responsable à signer, les coûts et les constats se lisent
hors dépôt ; un texte n'entre ici qu'avec sa `D-xxx`. Aucune identité, aucun
constat de production hors agrégat déjà publié au registre `docs/DECISIONS.md`.

## §0 Lecture

### Comment lire ce plan

1. L'ordre conduit, le calendrier suit. Les rangs et les portes font foi ; une
   date n'est qu'un repère (arbitrage du 2026-10-12).
2. Rang 0 : aucun préalable. Rang n : tous les préalables sont de rang
   strictement inférieur. Une porte de geste se lève par le responsable et
   compte au rang 0 ; une porte de constat ne se lève par aucun geste, ce
   qu'elle tient s'ouvre au fait constaté. Une ligne « si migration » passe au
   rang 4 au plus tôt, sauf BP-09. Dans un rang, la hiérarchie départage :
   h1 sécurité et vérité de l'affichage, h2 consultation, h3 patient,
   h4 cabinet, h5 confort. Six précisions, qui ne changent aucun ordre :
   (i) un texte du responsable, et la PR de textes qui le porte (S-3), comptent
   au rang 0 même s'ils suivent un autre texte de rang 0 ; entre eux, l'ordre
   des PR départage (ci avant S-3 et b ; l'effectif de masquage avant tout
   compte sur plusieurs dossiers) ; (ii) une chaîne nommée comme un seul lot
   (J2-bio au rang 4 : BP-12a, BP-11, BP-13, BP-15 ; J3-bio au rang 5 :
   BP-12b, BP-14, BP-17, BP-18a, BP-18b) porte le rang du lot comme rang au
   plus tôt de chacun de ses pas ; à l'intérieur, l'ordre des release-db tient
   lieu de préalable, un pas ne démarre qu'après le précédent ; de même pour
   un pas qu'une fiche déclare « après X » du même rang ; (iii) dans la
   file C, le rang est un rang au plus tôt ; les places 1 à 5 ne se permutent
   jamais ; les places 6 à 11 suivent l'ordre proposé, sauf si l'un est prêt
   avant un autre, la porte 18 restant la seule contrainte entre elles ;
   (iv) une variante « 4 au plus tôt si migration » ne crée pas de ligne de
   table, elle se lit dans la fiche ; (v) les tables d'entrée s'impriment par
   file ; l'exécution dans un rang suit la hiérarchie, posée ligne à ligne au
   cadrage de chaque rang ; (vi) « porte DC-44 et DC-48 » (F07) est une garde
   doctrinale, non une porte numérotée.
3. Chaque lot, élément ou geste porte une fiche. Au dépôt, elle est réduite à
   six champs : identifiant et piste ; rang ; portes et préalables ; migration
   et release-db ; décisions et textes (par leurs identifiants) ; critère de
   fin. L'objet détaillé, l'effet visible, le coût et la provenance restent
   hors dépôt.
4. Deux séries de fiches. Fnn : les 79 fiches de la feuille de route BioFlow.
   Hnn : les 84 fiches hors biologie. Quand une fiche et sa table d'entrée
   diffèrent, la table d'entrée fait foi.
5. Les files. File A : cosmétique et noyau, c'est-à-dire tout le code hors
   biologie. File B : biologie structurelle (BIO-PARCOURS, BIO-INGEST, panels,
   Track C). File C : activations patient, une à la fois, avec constat entre
   chacune (porte 18). File D : gestes du responsable (textes, signatures, sources,
   approbations, constats) et objets sans file (ménage d'exploitation, questions
   ouvertes, dettes sans lot) : ce qui n'est ni A, ni B, ni C est en D (arbitrage
   du responsable du 2026-10-14). Dans les tables d'entrée, « geste » se lit
   « file D ». Pour une fiche Fnn, « file A » se lit « file D »,
   « file B » se lit « file B », « file C » ne change pas ; la file se lit
   dans la table d'entrée de son rang.
6. Dans chaque rang : une table d'entrée (tout ce qui est à ce rang, avec sa
   fiche), puis les fiches dont le premier élément est à ce rang, dans l'ordre
   file A, file B, file C, file D. Une fiche qui court sur plusieurs rangs
   apparaît dans la table de chaque rang, une seule fois en fiche.
7. Marques : [Hypothese] = rang proposé, non acquis, à confirmer au cadrage du
   rang ; [A verifier] = non relu à la source.
8. Alias, pour la recherche au cadrage : G-1 et RK-9 vont avec M-1 (F66) ;
   G-2 avec M-3 (F54) ; J1-nabm avec S-7 (F54) ; G-4 avec M-2 (F59, H32).
   « Track C » (BioFlow) n'est pas « file C » (activations) ; « R6 » nu et
   « 6.0-B » nu sont ambigus, toujours qualifier. « File D » n'est ni une
   décision D-xxx, ni D2 (lettre j), ni D4 ou D7 (avec K-05a ; RAG dynamique) ;
   ses lignes sans rang se citent D/1, D/2… (§4, D.4).

### Le décompte

- Fiches : 163, soit 79 fiches Fnn et 84 fiches Hnn. Gelées en §6 : 7 fiches
  Fnn ; closes : 2 (F42, F43, G3 clos par #1416), rangées après la table
  « Livré ».
- Fiches par rang de première apparition : rang 0 : 42 ; rang 1 : 29 ;
  rang 2 : 11 ; rang 3 : 7 ; rang 4 : 16 ; rang 5 : 17 ; rang 6 : 9 ;
  rang 7 : 8 ; rang 8 : 4 ; rang 9 : 3 ; rang 10 : 6 ; rang T : 2 ; gelées : 7.
- Lignes des tables d'entrée des rangs : 210. Fiches de gestes du responsable
  dans les rangs : 65.
- Portes : 30 (§1). Gelés : 33 lignes et 7 fiches (§6). Abandonnés :
  32 lignes (§7). Dettes : 64 lignes (§8), dont 10 soldées.
- Clôtures (§9) : 11 campagnes à fermer ou à reprendre en forme (PR 2),
  3 maintenues (PR 3), 15 lignes de textes périmés (PR 6).
- Décisions (§10) : 72 lettres à écrire, 5 lettres déjà écrites, 12 lignes de
  D-xxx de lot ou de fonction en biologie, 20 D-xxx hors biologie,
  10 signatures et approbations. Lettre neuve : aucune.
- Versement : six PR (§11).
- **Mise à jour (2026-10-14)** : décompte du 2026-10-13, non recompté. Depuis : quatre lettres écrites (ci par D-286, #1425 ; a, b, g par D-287, D-288, D-289, #1430), gardées dans « Lettres à écrire » avec leur marque et ajoutées à « Lettres déjà écrites » (§10) ; les six PR du versement mergées (§11) ; neuf lignes ajoutées au §8 (trois par la PR 5, deux par D-290, #1440, quatre reports datés du 2026-10-14).
- **Mise à jour (2026-10-14, file D)** : la file D entre au plan (§0, points 5, 6 et 8 ; arbitrage du responsable du 2026-10-14). Le §4 devient « La file D » : sa table par rang garde sa forme (cq, M-5 (1/2), k, u, G-8 et le texte (f) de D-283 marqués faits ; préalables de M-1 nommés) et il reçoit à sa fin cinq sous-tables : D.1 faisables (21 lignes, 22 depuis #1448), D.2 constats en attente (9), D.3 bloqués (20, 19 depuis #1448), D.4 sans rang (D/1 à D/50), D.5 échéances et gelés (7). Vingt lignes ajoutées au §8 (dix-huit dettes techniques, deux au titre de l'information des patients), trois lignes du §8 précisées (D-TRUST-05, 07, 08). Les sept intertitres « Gestes du responsable » des rangs deviennent « File D : gestes du responsable » ; F66 reçoit l'étape 3 (#1447). Dix-huit registres hors plan portent une ligne « Versé au plan le 2026-10-14 », quatre documents tenus à jour une ligne de renvoi ; les numéros de ligne que le plan cite dans ces vingt-deux fichiers se lisent sur 85b95dcc. Le reste n'est pas recompté.

### La base

- `origin/main` = 193b614c (#1416, G3 levé), 2026-10-13. Les lignes du dépôt
  citées dans les fiches valent pour 36f82cf1 (#1411), sauf mention « sur
  f3ddbd3d », « sur 26706d17 » ou « sur 193b614c ».
- Dernière décision au registre avant ce plan : D-284. Ce plan entre avec
  D-285. Toute décision neuve s'écrit « D-xxx » avec sa lettre ; son numéro se
  réserve dans main au moment de l'écrire.
- Lettres prises : a à az, ba à bh, ca à cq. Lettres déjà écrites en D-xxx : i
  (D-280, pour les seuils de 8B seulement), ck (D-282, G3 clos par #1416), cp et l pour
  l'essentiel (D-283), cq (D-285). Prochaine lettre libre : cr.
- Production : 105 migrations appliquées, schéma à jour, aucune migration en
  vol (constat du 2026-10-13) ; aucune branche distante ne porte de migration
  absente de main.
- Acquis non reposés : les arbitrages du responsable rendus en séance les
  2026-10-11, 2026-10-12 et 2026-10-13 ; D-282 à D-284.
- **Mise à jour (2026-10-14)** : `origin/main` = 474e9d67 (#1444). Dernière décision au registre : D-291 (gouvernance des PR, #1440, #1444) ; depuis, D-292 et D-293 (#1446), D-294 (BP-09, #1448). Lettres écrites depuis ce plan : ci (D-286, #1425), a (D-287), b (D-288), g (D-289) (#1430) ; prochaine lettre libre : cr. Une migration mergée depuis : D-284 lot (j), #1426 ; sa release-db n'est consignée nulle part sur main [A verifier] (porte 9). Acquis non reposés : s'y ajoutent les arbitrages du responsable du 2026-10-14, consignés par D-286 à D-289 et aux handoffs du jour.

## §1 Les portes

Trente portes. Une porte de geste compte au rang 0 ; une porte de constat ou de campagne s'ouvre au fait et prend le rang au plus tôt après son fait ; son consignataire est le responsable (lecture par conteneur, en agrégats, ou lecture consignée d'un texte), sauf les portes 20 et 21, constatées par la revue de PR ; la fiche que la porte tient porte le critère observable.

| n° | objet | levée par | état au 2026-10-13 |
|---|---|---|---|
| 1 | Constat initial en conteneur, en agrégats | S-1, Q-1 (rang 0) : F40, H06 | levée en partie le 2026-10-12 ; restaient le premier import v5 commenté et le premier accusé usage_ia v8 (critère réaligné sur les versions en service le 2026-10-23, sur arbitrage du responsable ; il nommait v4 et v7) ; **levée le 2026-10-23** : les deux constatés par conteneur, en agrégats (F40) |
| 2 | Décisions d'ordre mergées : deux files, une activation à la fois, restauration | a, b, g par la PR S-3 (rang 0) : F01, H05, F04 | levée le 2026-10-14 : a, b, g écrites par D-287, D-288, D-289, mergées par la PR S-3 (#1430) |
| 3 | Radar sans zéro décidé | M-6, ac (rang 0) : H12 | **levée le 2026-10-18** : texte écrit le 2026-10-15 (D-301) ; J2-radar livré (#1531), « non mesuré » constaté à l'écran par l'E2E, déploiement 586db8fc constaté |
| 4 | Sources à fournir : poids égal, seuils, fidélité, quantités, axes | le responsable (rang 0) : H08 | en partie : D-280 source les seuils de 8B ; règle du milieu levée ; restent poids égal, seuils du sommeil hors 8B et de « Mon équilibre », fidélité, quantités, axes ; liste de ce qu'il faut fournir préparée le 2026-10-15 (H08) |
| 5 | K-05a et D4 : liste fermée et déclaration des sites IA | le responsable (rang 0) : F46 | levée le 2026-10-15 : D4 (D-299, #1467) puis K-05a, liste fermée des neuf fichiers IA de `web/src` (`web/src/lib/sitesAppelIa.guard.test.ts`), chacun rattaché à `docs/DOSSIER_RGPD.md` |
| 6 | Doctrine du cockpit chiffré et de l'adhésion signée | M-2, G-4 (rang 2), sur c et d (rang 1) : F59, H32 | **levée le 2026-10-23** : D-333 et D-334 signées telles quelles par le responsable (M-2), niveau médian ordinal de D-334 §4 compris ; premier lot libéré : J1-cockpit-a (F59) |
| 7 | SAF-EI-01 signée, puis déploiement constaté | M-1 (rang 3), puis J1-sécu (rang 4) : F66 | **levée le 2026-10-18** : SAF-EI-01 amendée signée le 2026-10-17 (M-1, #1528) ; commit de signature en service, constaté dans l'image déployée 9aec4a5b (J1-sécu) |
| 8 | Essai de restauration réussi | K-18a (0), G-7 (1) : F04 | levée le 2026-10-14 : G-7 joué et réussi (#1462 ; écart HDS consigné à F04, essai retenu par le responsable) ; portée et procédure écrites par D-289 (#1430) |
| 9 | release-db approuvée, sentinelle, constat, une à une | le responsable, à chaque migration | constatée pour #1397 (2026-10-11) et pour le lot 2 de D-281 (2026-10-13) ; constatée pour BP-09 le 2026-10-14 (#1448 : release-db approuvée hors usage, run 38612283121 vert, sentinelle liée, constat par conteneur one-off-204, base à jour relue par one-off-4921) ; migration de D-284 lot (j) mergée le 2026-10-14 (#1426), release-db consignée le 2026-10-15 : run 38527276005, approuvé par le responsable (« D-284 §5, lot j »), release appliquée par one-off-5372 (sentinelle `WN_RELEASE_DB_OK id=38527276005-1`, 2026-10-14 07:30:01 UTC), vérification `migrate status` verte ; le run finit rouge par sa garde anti-recul, voulue (tête dépassée par #1427 pendant le run), sans effet sur la base ; déploiements constatés : f3d3fcbd (#1426) à 07:22 UTC, 5f7e2f16 (#1427) à 07:40 UTC ; migration finie à 07:30 UTC, relue par conteneur pendant G-7 (#1462) ; constatée pour le formulaire d'avant de D-281 le 2026-10-15 (#1464 : run 38649200510 vert, sentinelle liée, migration appliquée par one-off-9362, base à jour relue par one-off-4547) ; constatée pour le gel du patient de D-281 le 2026-10-15 (#1474 : run 38718890105, sentinelle `id=38718890105-1`, `migrate status` à jour par conteneur, 109 migrations) ; constatée pour le verrou de course de D-281 le 2026-10-15 (#1476 : run 38746811654, sentinelle `id=38746811654-1` par one-off-9963, `migrate status` à jour par one-off-7924, 110 migrations, production sur 8bc48e55) ; constatée pour EF-3b le 2026-10-15 (#1478 : run 38770021810 vert, sentinelle liée, migration appliquée par one-off-3935, base relue par one-off-9138) ; constatée pour CC-8 le 2026-10-16 (#1490 : run 38821976094 vert, approuvé par le responsable, sentinelle `WN_RELEASE_DB_OK id=38821976094-1`, migration appliquée par one-off-6113 à 23:43:22 UTC, une tentative ; base relue par one-off-7920 : CHECK à cinq espèces, validé, aucune migration non aboutie ; déploiement 2086fa7b en tête) |
| 10 | NABM signée : 8 analytes, puis liste étendue | S-7 (0), M-3 (1), M-3b (1), M-3c (2), f (2), G-3 (3) : F54 | non levée : **8 sur 8 le 2026-10-17** — 5 liaisons signées (2026-10-15), constats « aucun acte » (V105) de `BIO_HOMOCYSTEINE` (2026-10-16), `BIO_CAR` et `BIO_AG_ERYTHROCYTAIRES` (2026-10-17), relus par conteneur ; M-3c clos ; f lit les remboursements dans la proposition (D-316) ; reste G-3 (liste étendue), entamée par le constat de `BIO_INDEX_OMEGA3` |
| 11 | Bandes de bruit signées, instrument par instrument | G-10 (0), v (1) : H13 | non levée ; instruments arrêtés le 2026-10-15 (H13), références à fournir |
| 12 | D2 mergée | j (rang 0) : F63 | levée au merge de D-306 (lettre j, écrite le 2026-10-15) |
| 13 | Textes communs : CGU, registre, circuit des droits, Patient Hub | k (0) : F77 ; l, écrite pour l'essentiel par D-283 (§2 durées, §6 droits) ; u (1) : H37 ; G-8 (2) : H50 | **levée le 2026-10-14** : k (D-292), u (D-293), G-8 (procédure des droits écrite, `docs/DOSSIER_RGPD.md` rubrique 9) ; restes de l en H26 |
| 14 | Accusé de lecture daté décidé (renverse) | ai (rang 2) : H51 | **levée le 2026-10-14 par D-297** (texte patient du §4 validé tel quel) |
| 15 | K-02 servi : premier check-in sur un protocole approuvé | constat, rang 2 au plus tôt, après d | fermée au 2026-10-13 ; lecture « porte 15 pour le code de bf » confirmée par le responsable le 2026-10-14, instruction au rang 0 (handoff de la PR 2, #1419) |
| 16 | Clôture du LOT-02 de l'agenda du sommeil | campagne, rang 1 au plus tôt : H27 | fermée : lectures repères 2026-10-29 puis 2026-11-12 |
| 17 | Durée du dossier patient fixée | le responsable, sur conseil (porte 28) | **levée le 2026-10-13 par D-283 §2 (#1411)** pour la base active (jusqu'à la clôture, ou 5 ans après le dernier contact) et l'archive intermédiaire (10 ans) ; le point de départ de l'archive reste à valider par un conseil avant toute mise en œuvre (D-283 §2, §10 b) |
| 18 | Texte patient accepté, puis activation précédente constatée | b (rang 0), à chaque activation : H05 | critère : un premier vrai dossier servi, sans anomalie, constaté par identifiant en conteneur, jamais une fixture ; pour une ouverture qui ne vise que certains dossiers : lecture consignée du texte en ligne ; aucune activation faite ; places 12 et suivantes : l'encart bd dès qu'il est prêt, puis l'ordre de préparation ; règle écrite par D-288 (#1430) |
| 19 | BP-18a puis BP-18b livrés | campagne, J3-bio (rang 5) : F12, F13 | non levée |
| 20 | K-11 : premier écran qui compare deux passations du même instrument | revue de PR, après J2-mom (rang 2), donc rang 3 au plus tôt | fermée ; tient cf et la phrase de tendance ch (H72) |
| 21 | K-22 : premier lecteur d'épisode hors domaine | revue de PR, au fait | fermée |
| 22 | Premier dossier à deux jalons mesurés | constat, au fait | fermée |
| 23 | Signature des contenus de BP-12a, BP-12b, BP-17 | le responsable, dans le lot, avant son merge | non levée |
| 24 | Palier 1 sorti, BP-26 clos, garde K-19 verte | J2-base (rang 4) : H59 | en partie : BP-26 clos (D-276, #1392) ; palier 1 non sorti |
| 25 | Constats sans item (analyte à deux dates, règle NU, PH-0, signal H3) | au fait | fermée ; ces branches restent fermées |
| 26 | Accord du responsable sur la séance de constats | acquis | levée |
| 27 | À chaque PR : CI vert (code 0), commentaires en ligne lus, clôture avant la PR | chaque PR | règle permanente |
| 28 | Préalables hors liste : avis d'un conseil (aucun DPO désigné ; obligation close à cette échelle par D-284 §6, reste une analyse datée d'une page à revoir à tout changement d'échelle), K-26 volet 2, R-151, fiche BP-09, fiches relues, règle signée et C4, « sa D-xxx », conseil sur la durée | le responsable (rang 0) : H09 | non levée ; fiche BP-09 écrite, fichiers listés, validée par le responsable le 2026-10-14 (`lots/LOT-09-annulation-resultat.md`) |
| 29 | Format réel du laboratoire pilote : réponse écrite | réponse du laboratoire ; relance écrite, geste de rang 0 : F41 | gelée, déclencheur nommé ; flux laboratoire fermé |
| 30 | Décision asynchrone durable (worker, réconciliation ; ex-« G3 ») | le responsable | **levée le 2026-10-13 par D-282 (#1410)**, porte de geste (la décision) : file durable en base, processus de fond, reprise automatique une fois, fantômes réconciliés en continu ; lots 2 à 5 mergés le même jour (#1412, #1414, #1415, #1416) ; mise en service constatée et G3 levé (D-282 §8) ; fiches closes F42 et F43 |

## §2 La séquence par rang

Chaque rang porte une table d'entrée, puis ses fiches (file A, file B, file C, file D). Les rangs des fiches Fnn sont ceux de la feuille de route BioFlow, ajustés par les arbitrages acquis ; les rangs des fiches Hnn suivent les arbitrages acquis, sinon ils portent [Hypothese]. Le chemin critique : rang 0, ci (sa PR propre, avant le merge de b ; fait, #1425), puis a et S-3 (fait, #1430) → rang 1, BP-07 (clos le 2026-10-14, #1438) et portail de D-281 → rang 2, signatures de BP-07 (posées dans le lot, #1435, #1438), BP-09 (fiche validée, #1442), validation de D-281 → rang 3, release-db de BP-09, signature M-1 → rang 4, BP-12a, BP-11, BP-13, BP-15, J1-sécu (porte 7) → rang 5, J3-bio → rang 6, BP-24 → rang 8, BP-21b.

### Livré au 2026-10-13 (sans fiche)

| identifiant | objet | PR | date |
|---|---|---|---|
| BP-25 (D-273) | plafond d'actions porté à sept, repli en proportion | #1367 | 2026-10-08 |
| 10A, D-275 §1 | encart d'urgence sur les questionnaires qui parlent de suicide | #1370 | 2026-10-09 |
| 10A, D-275 §3 | le Fil du jour signale les constats de sécurité ouverts | #1373 | 2026-10-09 |
| 10A, D-275 §2 | lettre d'adressage couvrant un constat (migration seule), puis suspension de la décision | #1374, #1375 | 2026-10-10 |
| 10A, D-277 | idées suicidaires : message au patient, courriel au praticien | #1393 | 2026-10-10 |
| BIO-INGEST, LOT-12 | clôture de la campagne ; sauvegardes déclarées au patient en v14 | #1391 | 2026-10-10 |
| BP-26 (D-276) | qualification différée, aucune fonction retirée | #1392 | 2026-10-10 |
| 11A, D-278 §1 | effet indésirable « incertain » : numéros d'urgence, conseil de consulter | #1395 | 2026-10-10 |
| 11A, D-278 §2 | extinction du stress liée au DASS-21 en « Normal » | #1396 | 2026-10-10 |
| 11A, D-278 §3 (BF-4) | commentaires du laboratoire : migration (release-db constatée le 2026-10-11), usage_ia v7, extraction v4, acte de lecture | #1397, #1398, #1400, #1401 | 2026-10-11 |
| LOT-11 du sommeil | le rappel du matin dit où toucher, selon le téléphone | #1399 | 2026-10-11 |
| 5A (D-279) | la priorité posée par le praticien : migration, puis code | #1402, #1403 | 2026-10-11, 2026-10-12 |
| 8B (D-280) ; lettre i pour 8B | restriction de sommeil et « Peu couvert » suivent des seuils sourcés | #1404 | 2026-10-12 |
| S-1, en partie | constat initial en agrégats, première partie | sans PR | 2026-10-12 |
| Hygiène | contextes datés et instantanés de reprise archivés | #1405 | 2026-10-12 |
| D-281, lot 1 | SAF-EI-01 amendée avant signature | #1406 | 2026-10-12 |
| LOT-12 du sommeil, arbitrage | la forme d'une maquette, sans son instrument | #1407 | 2026-10-13 |
| D-281, lot 2 | migration ; release-db approuvée et constatée (104 migrations) | #1408 | 2026-10-13 |
| D-282, lot 1 (lettre ck) | G3 ouvert : file durable, processus de fond ; lève la porte 30 | #1410 | 2026-10-13 |
| D-283 (lettre cp, l pour l'essentiel) | trous RGPD tranchés ; lève la porte 17 | #1411 | 2026-10-13 |
| D-282, lots 2 à 4 | file durable (migration appliquée), processus de fond surveillé, mise en service constatée (surveillance, `scale worker:1`, drapeau) | #1412, #1414, #1415 | 2026-10-13 |
| D-282, lot 5 | un seul chemin de lecture, la file ; `after()` retiré ; G3 levé (D-282 §8) | #1416 | 2026-10-13 |

**Fiches closes, gardées pour les renvois (G3, D-282 §8)**

#### F42 · Worker durable, porte 30
- **Identifiant, piste** : G3 ; ingest et plateforme (P1).
- **Rang** : clos (#1416) ; voir Mise à jour.
- **Portes, préalables** : porte 30 « décision asynchrone durable » ; imports en échec comptés par motif (F40). Elle libère aussi PF-3 et l'extraction en lot.
- **Migration, release-db** : probable (file PostgreSQL) ; portes 8 et 9.
- **Décisions, textes** : lettre ck : quoi part en file, où attend le document, combien de temps, qui reprend ; clause « une charge utile en file conserve un document de santé, D-258 ne la couvre pas » [A verifier]. Aucun microservice, aucun Python.
- **Critère de fin** : un import tué en cours se clôt seul ; invariant testé ; constat en agrégats.
- **Mise à jour (2026-10-13)** : G3 clos. Porte 30 levée par D-282 (#1410), qui tient lieu de ck ; cinq lots mergés le 2026-10-13 (#1412, #1414, #1415, #1416) : migration appliquée, processus de fond surveillé (`worker` au `Procfile`, signal de vie), mise en service constatée par conteneur sur un dossier de test, puis `after()` retiré : la route demande toujours à la file (D-282 §8). Le drapeau `WN_BIO_EXTRACTION_ASYNC` n'est plus lu ; le retirer de Scalingo est un geste du responsable, sans effet. Restent, hors G3, au §8 : dossier clos pendant l'attente, TEMPS 3, bancs hérités du lot 3. Suite nommée par D-282 §8 : lot (j) de D-284 (H26).
- **Mise à jour (2026-10-14)** : deux restes hors G3 soldés par #1418 (D-282 §9), sans migration : une lecture demandée retient la clôture du dossier ; l'enregistrement des lignes s'ordonne avec l'effacement (TEMPS 3). Restent hors G3 : les bancs hérités du lot 3 et la base locale. Le critère de fin vaut tel quel.

#### F43 · Réconciliation des imports fantômes
- **Identifiant, piste** : imports restés « en cours » ; ingest.
- **Rang** : clos avec F42 (#1414, #1416) ; voir Mise à jour.
- **Portes, préalables** : porte 30. B2 borne déjà l'effet visible : « lecture interrompue » au-delà de cinq minutes, clos au geste suivant ou à la purge (`docs/claude/campagnes/2026-09-30-bio-ingest/lots/LOT-12-cloture.md:42-64`).
- **Migration, release-db** : selon F42.
- **Décisions, textes** : aucune seule ; tranchée dans ck, qui dit ce qui reste « fantôme » après B2.
- **Critère de fin** : aucun import « en cours » au-delà de sa péremption, constaté en agrégats ; ou « B2 suffit » écrit dans ck.
- **Mise à jour (2026-10-13)** : dégelée avec F42 par D-282 : la réconciliation des fantômes tourne en continu dans le processus de fond (D-282 §5.4), entrée au lot 3 (#1414), en service depuis la mise en service du lot 4 (D-282 §8). Close avec F42. Le critère de fin vaut tel quel.

### Rang 0 : aucun préalable

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| S-2 | doctrine du cockpit et de l'adhésion rédigée | A | aucune | non | H01 |
| S-4 | « Relire » ouvre le bon dossier ; lien « Composer » | A | aucune | non | H02 |
| R:Graphie | « Wellneuro » au menu du cockpit | A | aucune | non | H03 |
| cq | décision de forme du plan unique : D-285, faite | geste | aucune | non | H04 |
| a, S-3 | décisions d'ordre ; pilotage remis à l'heure | geste | lève 2 | non | F01 |
| b | une activation à la fois ; règles de la file C | geste | lève 2, 18 | non | H05 |
| K-18a, g | sauvegarde écrite ; portée de l'essai de restauration | geste | 26 ; lève 8 | non | F04 |
| S-1, biologie | premier import v5, accusés v8, mutations versées | geste | 1 | non | F40 |
| S-1, hors biologie | vérifications renvoyées au premier constat | geste | 1 | non | H06 |
| R:Comptage T0 | dossiers bloqués avant T0, comptés en conteneur | geste | aucune | non | H07 |
| porte 4 | sources à fournir | geste | lève 4 | non | H08 |
| K-05a, D4 | liste fermée des sites IA | geste | lève 5 | non | F46 |
| porte 28 | avis, fiches et règles hors liste | geste | lève 28 | non | H09 |
| m | encart de sécurité sur les CAB_ (fait le 2026-10-15 : D-303) | geste | aucune | non | H10 |
| n | garde de dose resserrée (fait le 2026-10-15 : D-304) | geste | aucune | non | H11 |
| z | mineurs, garde d'âge, date de naissance (fait le 2026-10-15 : D-302) | geste | aucune | non | F45 |
| ac | radar sans zéro (fait le 2026-10-15 : D-301) | geste | lève 3 | non | H12 |
| G-10 | sources de fidélité, une par instrument | geste | 11 | non | H13 |
| j | D2, règle de dépendance (fait le 2026-10-15 : D-306) | geste | lève 12 | non | F63 |
| q | aperçu médecin sous garde, remise tracée (fait le 2026-10-15 : D-307) | geste | 27 | non | F38 |
| s | onglet Biologie, statut posé, deux marques (fait le 2026-10-15 : D-308 ; liste des statuts à écrire) | geste | aucune | non | F57 |
| aa | courrier de remboursement (fait le 2026-10-15 : D-309) | geste | aucune | non | F55 |
| ab | EF-0 : trancher Q3 (fait le 2026-10-15 : D-310) | geste | aucune | non | H14 |
| w | guide des 12 besoins réécrit sur sources (méthode écrite le 2026-10-15 : D-312 ; guide à réécrire) | geste | aucune | non | H15 |
| S-7 | liste des 8 analytes NABM partagés (fait le 2026-10-15, F54) | geste | 10 | non | F54 |
| k | CGU unique ; usage_ia v7 (version à l'origine de la fiche ; la v1 des conditions reprend la version en vigueur à l'activation, v8 au 2026-10-14) ; fait, D-292 du 2026-10-14 | geste | 13 | non | F77 |
| h | Boussole retirée ; exception à D-276 §1 | geste | aucune | non | H16 |
| av | contenu biologique du document au médecin (fait le 2026-10-15 : D-311) | geste | aucune | non | F33 |
| l, trace d'import | trace d'import conservée comme le dossier | geste | 17, 13 | non | F44 |
| comportement voulu | « Reprendre cette charge » sur un brouillon gonflé | geste | 28 | non | F76 |
| effectif | effectif de masquage des agrégats | geste | aucune | non | F25 |
| copie datée | accord de sous-traitance d'Anthropic, copie datée | geste | aucune | non | F47 |
| cj | rationalisation des packs biologiques | geste | aucune | non | F49 |
| écarts d'unité | lecture des écarts d'unité textuels | geste | aucune | non | F60 |
| ci | amendement de D-276 : cinq déclencheurs | geste | aucune | non | F67 |
| co | réexamen de l'AIPD (fait le 2026-10-15 : D-313 ; neuf critères à cocher) | geste | aucune | non | F68 |
| cp | revue des trous RGPD (écrite par D-283) | geste | aucune | non | F69 |
| ca | cadrage de la refonte de l'agenda du sommeil (fait le 2026-10-15 : D-300) | geste | aucune | non | H17 |
| bg | flux de l'export vers l'assistant externe du responsable | geste | avec 5 | non | H18 |
| bf, instruction | une décision par indicateur hebdomadaire | geste | aucune | non | H19 |
| gestes RGPD | archivages, relance d'effacement, dossier v8 | geste | aucune | non | H20 |
| relance du laboratoire | relance écrite du laboratoire pilote | geste | 29 | non | F41, en §6 |
| G-11 | textes patient de la collecte et des mineurs (l écrite par D-283) ; fait, validés le 2026-10-14 | geste | aucune | non | H38 |

**File A**

#### H01 · S-2 : PR de doctrine du cockpit et de l'adhésion
- **Identifiant, piste** : S-2, Q-2 ; cockpit ; file A (lot documentaire du noyau).
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : textes de c (F59) et de d (H32), à relire par le responsable ; T2 et contre-revue P0.
- **Critère de fin** : PR mergée, T2 vert, contre-revue P0 lue.
- **Mise à jour (2026-10-20)** : c et d rédigées en `D-333` (cockpit chiffré) et `D-334` (doctrine d'adhésion), acceptées telles quelles par le responsable le même jour (gestes c et d faits) ; arbitrages du même jour : l'échelle E4 vit avec les constats par point d'étape (C2B, A8-4 intacte), le niveau médian se calcule par point d'étape, les exceptions du portail sont deux familles déjà au code (repères de parcours, représentations sans valeur, dont la jauge E10). Contre-revue P0 (wn-reviewer) intégrée : SP-MET garde « jamais un score » (un comptage n'en est pas un), exceptions du portail en deux familles déjà au code, dette « stable » de D-058 §3 nommée. Fragment, commentaires d'`adhesion.ts` et registre des frontières (A1, A6-R2, SP-MET) mis à jour. Reste : signature M-2 (rang 2), qui lève la porte 6.

#### H02 · S-4 : « Relire » et « Composer »
- **Identifiant, piste** : S-4, Q-4 ; cockpit ; file A, frontière commune.
- **Rang** : 0.
- **Portes, préalables** : aucun ; frontière commune, une PR à la fois.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : banc `cartes.test.ts` vert, T2.
- **Mise à jour (2026-10-14)** : fait par #1424 : « Relire » porte l'identifiant du dossier, banc `cartes.test.ts` réécrit ; « Composer le document » dans la minute d'après ; T1 complet et T2 verts. Suite par #1429 (arbitrage du 2026-10-14 sur un commentaire de revue de #1424) : sans version active du protocole, la minute d'après propose aussi « Composer le document » ; `pretPourDiffusion` reste faux. Aucune migration, aucune décision, aucune règle clinique.

#### H03 · R:Graphie : le nom au menu
- **Identifiant, piste** : R:Graphie ; cockpit ; file A.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : menu changé, constaté.
- **Mise à jour (2026-10-14)** : menu changé par #1427 (une ligne du rail ; bases visuelles Desktop régénérées) ; T1 complet vert ; aucune décision, aucune migration, aucun drapeau. Le constat du menu en service n'est pas consigné sur main [A verifier].

**File D : gestes du responsable**

#### H04 · cq : décision de forme du plan unique
- **Identifiant, piste** : lettre cq ; un seul fichier de plan ; file d'attente supprimée ; adresse de routage des revues = le plan ; archivage par déplacement avec bandeau ; gels sous déclencheur nommé ; abandons datés ; pilotage ; geste du responsable (registre).
- **Rang** : 0, fait (D-285).
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : D-285 au registre, fragment `changelog.d/` ; texte rédigé dans le lot, accepté par le responsable ; fichier `docs/claude/PLAN_WELLNEURO.md`.
- **Critère de fin** : PR 1 du versement mergée (§11), CI code 0, commentaires en ligne lus, plan au dépôt sous forme opaque.
- **Mise à jour (2026-10-14)** : PR 1 mergée (57ab15ed, #1417), quatre remarques de revue corrigées ; PR 2 à 6 mergées (#1419 à #1423) : la lettre cq n'a plus de reste au versement (§10, §11).

#### F01 · Lettre a et PR S-3 : pilotage réaligné
- **Identifiant, piste** : D-a et S-3 ; parcours.
- **Rang** : 0.
- **Portes, préalables** : aucun ; lève la porte 2 avec b et g.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre a ; textes de `docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:4`, :6, :91-98, `.wn/state.json` et `docs/architecture/bioflow/BIOFLOW_ROADMAP.md:15-21` corrigés ; forme du plan unique à confirmer.
- **Critère de fin** : PR mergée, T1 complet vert, BP-07 désigné prochain lot dans l'état du cycle.
- **Mise à jour (2026-10-13)** : forme du plan unique tranchée par D-285 (cq, H04) : un seul fichier, file supprimée, archivage par déplacement. La PR S-3 suit la PR de ci (F67).
- **Mise à jour (2026-10-14)** : lettre a écrite : D-287 (#1430), acceptée par le responsable, après ci (D-286, #1425) ; porte 2 levée avec b et g. Les textes de pilotage que la fiche désigne étaient déjà réalignés par la PR 3 du versement (#1420), BP-07 désigné prochain lot dans l'état du cycle (D-287 §4).

#### H05 · b : une activation à la fois, et les règles de la file C
- **Identifiant, piste** : lettre b (D-b, R:b, T-5) ; file C ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : ci (F67), geste de rang 0, mergée dans sa PR propre avant b, parce que b touche le second compte, l'un des cinq déclencheurs ; puis portée par la PR S-3 avec a et g (porte 2 ; F01), qui n'est pas élargie. Un test d'intrusion humain précède tout second compte praticien (D-283 §7). Places 12 et suivantes de la file C : la conduite passe devant (bd dès qu'il est prêt), puis l'ordre de préparation, une à la fois.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre b, de la main du responsable.
- **Critère de fin** : lettre mergée par S-3 ; porte 2 levée avec a et g.
- **Mise à jour (2026-10-14)** : lettre b écrite : D-288 (#1430), après ci (D-286, #1425) ; porte 2 levée avec a et g. Elle pose la règle de la porte 18 (§1-2), l'ordre des places (§3 : cc compte comme une place, après l'encart bd), le formulaire de D-281 hors file (§4), et ferme le second compte praticien jusqu'au 2027-10-11, levée par une D-xxx seulement, précédée d'un test d'intrusion humain (§5). Aucune activation faite (§6).

#### F04 · G-7 : essai de restauration
- **Identifiant, piste** : K-18a, D-g, G-7 ; parcours (porte commune).
- **Rang** : K-18a et D-g au rang 0, G-7 au rang 1.
- **Portes, préalables** : porte 26 (acquise) ; lève la porte 8.
- **Migration, release-db** : non ; préalable de toute migration après BP-09 (porte 8). D-g écrit « essai de restauration avant toute migration » ; sa portée est acquise : l'essai précède toute migration qui suit BP-09 ; #1408 (D-281 lot 2) et #1412 (D-282 lot 2) ont mergé sans essai, par le fait, sous cette lecture.
- **Décisions, textes** : lettre g, qui écrit la portée acquise : essai de restauration réussi avant toute migration suivant BP-09 ; rien n'y reste à trancher.
- **Critère de fin** : restauration réussie, constatée.
- **Mise à jour (2026-10-14)** : lettre g écrite : D-289 (#1430) : portée (§1) et procédure (§2) ; commandes exactes au `docs/RUNBOOK.md` dans le lot G-7. D-289 §1 compte aussi #1426 (D-284 lot j), avec #1408 et #1412, parmi les migrations mergées avant l'essai, par le fait. G-7 n'est pas joué ; porte 8 non levée (état à cette date, périmé par la mise à jour suivante).
- **Mise à jour (2026-10-14, G-7)** : essai joué et réussi, porte 8 levée (#1462). Sauvegarde quotidienne de l'hébergeur du 2026-10-14, 00:00 UTC, restaurée dans une base temporaire de la même région (`docs/RUNBOOK.md`, « Essai de restauration (G-7) », script `scripts/wn-g7-restauration.sh`) : `pg_restore` sans erreur, 12 s ; dernière migration de la copie égale à celle de la production à l'heure de la sauvegarde ; 107 tables sur 109, les deux absentes créées par les deux seules migrations finies après la sauvegarde (D-284 lot j à 07:30 UTC, BP-09 à 18:15 UTC) ; 79 tables à comptes égaux, 28 en écart, tous positifs, écritures postérieures à la sauvegarde. Base temporaire détruite le jour même, suppression constatée ; jeton API temporaire révoqué par le responsable (journal d'activité de l'hébergeur, 21:52 UTC). **Écart à D-289 §2.2** : l'application temporaire a été créée sans `--hds-resource`, donc hors du périmètre que couvre le certificat du fournisseur ; la copie y a séjourné 13 minutes au plus (21:25 à 21:38 UTC), sur le seul compte du responsable, puis a été détruite. Arbitrage du responsable du 2026-10-15 : pas une violation au sens de l'art. 4.12 (ni accès, ni altération, ni perte), écart consigné ici et au dossier RGPD, noté au registre hors dépôt ; l'essai est retenu ; le RUNBOOK impose désormais `--hds-resource`, contrôlé avant la restauration.

#### F40 · S-1 : premier import v5, accusés v8, mutations versées
- **Identifiant, piste** : S-1 (reste) ; verser les constats des mutations de BIO-INGEST ; ingest.
- **Rang** : 0, au fait : il faut un premier dépôt (constat en agrégats du 2026-10-12).
- **Portes, préalables** : aucun ; la D-xxx de l'effectif (F25) passe avant tout compte sur plusieurs dossiers.
- **Migration, release-db** : non ; la release-db de #1397 est appliquée et constatée depuis le 2026-10-11.
- **Décisions, textes** : aucune.
- **Critère de fin** : constat versé en agrégats, sans identifiant couplé à des métriques : commentaires relevés, signaux « non transcrit », imports en échec par motif, accusés v8 ; porte 1 levée en entier (versions réalignées le 2026-10-23 : le critère nommait l'import v4 et les accusés v7).
- **Mise à jour (2026-10-14)** : [A verifier] le titre et le critère nomment l'import v4 et les accusés v7 ; depuis #1428 la lecture est de procédé `bio-extraction-v5`, sans repli sur le document, et #1431 publie `usage_ia` v8 (accusé recueilli au dépôt, comme v6 et v7). Le constat attendu au premier usage réel porte sur un masquage puis un import v5 ; la vérification qu'aucun import v4 n'est né après le merge de #1428 n'est pas consignée. Critère à relire par le responsable ; rien n'est réécrit ici.
- **Mise à jour (2026-10-22, k05)** : relu ; un réalignement des versions suffit, la nature du critère ne change pas. « Import v4 commenté » se lit « import v5 commenté » : v5 change l'entrée (pages masquées), le schéma et les règles de lecture restent ceux de v4, relevé des commentaires compris (`web/src/lib/biology-library/import/extraction.ts:40-46`). « Accusés v7 » se lit « accusés v8 » : la v8 se recueille sur l'écran de dépôt, comme les v6 et v7 (`web/src/lib/trust/contenus/registre.ts`, en-tête de `USAGE_IA_V8`). La vérification qui manquait est consignée : lecture par conteneur en lecture seule (one-off-5070 et one-off-2498), aucun import d'un procédé autre que `bio-extraction-v5` lancé après le merge de #1428 (2026-10-14, 08:29 UTC) ; imports sur 5 dossiers distincts au total ; accusés `usage_ia` sur 3 dossiers distincts, sous l'effectif de cinq, répartition par version masquée (D-298). Le texte du critère et de la porte 1 n'est pas réécrit ; le constat S-1 reste au responsable.
- **Mise à jour (2026-10-23, constat S-1)** : arbitrages du responsable : critère réécrit en v5 et v8, constat joué par l'assistant. Lecture par conteneur en lecture seule (one-off-3792), en agrégats, effectif de cinq appliqué (D-298). Sur l'ensemble des imports (5 dossiers distincts) : aucun signal « non transcrit », ni sur le compte rendu ni sur une ligne (commentaire, intervalle, marquage) ; des imports en échec, dont la répartition par motif reste masquée : chaque motif porte sur moins de cinq dossiers. Imports v5 : premier import v5 commenté constaté (au moins un compte rendu dont les commentaires sont relevés). Accusés `usage_ia` v8 : premier accusé constaté. Les répartitions par version, des imports comme des accusés (effectif de 3 dossiers), restent masquées : chaque version porte sur moins de cinq dossiers. **Porte 1 levée.** F40 reste ouverte sur les mutations versées (D/25, passe Codex du responsable).

#### H06 · S-1, part hors biologie : vérifications versées au premier constat
- **Identifiant, piste** : S-1, part hors biologie.
- **Rang** : 0 ; fait en partie le 2026-10-12.
- **Portes, préalables** : porte 1 ; applique l'effectif de masquage de cinq, acquis ; sa décision (F25), geste de rang 0, se merge avant le premier compte sur plusieurs dossiers : D-298 (cinq dossiers distincts, répartition masquée en dessous, constats écrits compris).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune ; un reste que le code ne permet pas de vérifier passe au bloc des gelés (§6) avec son déclencheur.
- **Critère de fin** : chaque vérification versée en agrégats, par identifiant, jamais par nom ; lecture seule par conteneur.

#### H07 · R:Comptage T0 : dossiers bloqués avant T0
- **Identifiant, piste** : R:Comptage T0 ; protocole ; geste du responsable (constat).
- **Rang** : 0.
- **Portes, préalables** : aucun ; effectif de masquage acquis ; sa décision (F25), geste de rang 0, se merge avant le comptage : D-298.
- **Migration, release-db** : non.
- **Décisions, textes** : une D-xxx du délai, après le comptage ; sa lettre se prend alors, cr si aucune ne couvre l'objet.
- **Critère de fin** : un nombre agrégé versé ; aucune carte avant le délai décidé.
- **Mise à jour (2026-10-24, outil livré)** : script de conteneur `web/scripts/constatAvantT0.ts`, en lecture seule (il refuse de lire hors `default_transaction_read_only`). Population : dossiers actifs portant au moins une assignation, sans épisode T0. Les préconditions s'évaluent par le chemin des trois routes (`preconditionsT0PourPatient`, jalon T0). Sortie en agrégats, masquée par `agregerConstatAvantT0` (D-298) : effectif, avec et sans T0, bloqués et prêts, dossiers par condition dure manquante, quartiles d'ancienneté des bloqués, sans tranche. Reste : le constat en conteneur après déploiement, puis la D-xxx du délai.
- **Mise à jour (2026-10-24, constat versé)** : lecture par conteneur en lecture seule (one-off-5061, image 172c4672), agrégats D-298, dossiers de test réels compris (D-075).
  - **Effectif** : 24 dossiers actifs portant au moins une assignation, dont 12 avec T0 et 12 sans T0.
  - **Bloqués** : les 12 dossiers sans T0 le sont tous ; aucun n'est prêt à confirmer.
  - **Conditions dures manquantes** : second rideau 12, rideau T0 9, synthèse validée 5, anamnèse consignée 0.
  - **Ancienneté des bloqués**, depuis la première assignation : premier quartile 31 jours, médiane 48, troisième quartile 83.
  - **Critère de fin atteint** (un nombre agrégé versé). Aucune carte et aucun délai proposés : la D-xxx du délai revient au responsable, sur ce compte.

#### H08 · Porte 4 : sources à fournir
- **Identifiant, piste** : porte 4 ; règle du milieu levée ; seuils de 8B sourcés par D-280 ; cockpit, alimentation, sommeil ; geste du responsable.
- **Rang** : 0 (porte de geste).
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune valeur dérivée par l'assistant (DC-01, DC-19) ; chaque source tient c (F59), am (H33), al (H57), cm (F51) et la décision de seuils_points (H40).
- **Critère de fin** : chaque source versée avec sa référence.
- **Mise à jour (2026-10-15)** : ce qu'il faut fournir, objet par objet (aucune valeur proposée) : poids égal des besoins d'une strate (`equilibre/score.ts`, moyenne simple ; D-106 motive par les fondations critiques, sans source), une référence ou un motif signé (DC-21), pour c ; bornes de l'indice du sommeil (durée, efficacité, régularité, qualité, planchers de 14 et 7 nuits, `questions.ts`), une référence par borne ou un paramètre technique déclaré, pour c ; palier 70 de « Mon équilibre » (34 est signé, D-106), une référence ou le maintien déclaré « repère du cabinet », pour c ; recueil alimentaire partiel (seuils_points, E31), une décision sourcée ; table des quantités, une source puis une signature ligne à ligne, pour am ; axes alimentaires, définition sourcée et bande signée par axe, pour al ; axes biologiques, liste fermée signée, pour cm. Fidélité : voir H13.

#### F46 · K-05a : ligne de l'extraction de biologie
- **Identifiant, piste** : K-05a avec D4 ; liste fermée des sites IA ; ingest.
- **Rang** : 0, geste ; fait le 2026-10-15 (D4 puis K-05a).
- **Portes, préalables** : porte 26 (acquise) ; lève la porte 5.
- **Migration, release-db** : non.
- **Décisions, textes** : ligne de déclaration du site d'extraction, à écrire dans K-05a (D-256 A4, usage_ia v7 ; fournisseur ; périmètre du document).
- **Critère de fin** : liste fermée et déclaration mergées.
- **Mise à jour (2026-10-13)** : « document entier, identité comprise » se lit daté : D-284 §5 impose le retrait de l'identité du document avant l'envoi, lot (j) de H26 ; le G3 est clos (#1416), (j) est libre ; d'ici là le flux reste nominatif, exposition assumée et datée.
- **Mise à jour (2026-10-14)** : depuis le lot 2 du masquage (#1428), seules les pages masquées par le praticien partent, jamais le document d'origine ; `usage_ia` v8 le dit au patient (#1431) ; le masquage est manuel. Déploiement du lot 2 non consigné sur main [A verifier]. La ligne de K-05a reste à écrire, son périmètre par le responsable.
- **Mise à jour (2026-10-15)** : arbitrages du responsable du 2026-10-14 : K-05a est un banc à liste fermée sur **tous** les sites d'appel IA de `web/src` (sept au 2026-10-14), chacun rattaché à une ligne de `docs/DOSSIER_RGPD.md`, un site non déclaré rougit la CI ; D4 passe d'abord. D4 fait : D-299, OpenAI déclaré au registre et dans « Vos données personnelles » v18 (accusé exigé), flux inchangé. Reste K-05a, PR propre ; la ligne de l'extraction de biologie y lit l'état courant (pages masquées, `usage_ia` v8), non la formule v7.
- **Mise à jour (2026-10-15, K-05a)** : banc `web/src/lib/sitesAppelIa.guard.test.ts`, liste fermée de neuf fichiers (appel par SDK, appel direct, client, adresse en dur) : Anthropic (client partagé, synthèse, priorité, « Ce que j'ai compris de vous », extraction de biologie, deux appels de l'atelier du corpus) et OpenAI (recherche du corpus, sa constante d'adresse). Chaque flux d'un sous-traitant est tenu sur sa ligne du tableau de la rubrique 6 ; l'extraction l'est en plus sur la phrase des pages masquées (§2 ter). L'atelier du corpus (`rag/claims`, Anthropic, aucune donnée de patient envoyée par l'application ; la réponse collée, champ libre, part telle quelle), présent dans le code depuis le 2026-07-23 et jamais déclaré, l'est en rubrique 7. Hors périmètre : `tools/`, `scripts/` ; un appel dont l'adresse ne nomme aucun fournisseur relève de la revue. Porte 5 levée.

#### H09 · Porte 28 : préalables hors liste
- **Identifiant, piste** : porte 28 ; confiance et outillage ; geste du responsable.
- **Rang** : 0 (porte de geste).
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : avis écrits versés au registre ; échéance 2027-06-30 pour les trous qui restent ouverts (D-265 §4 ; D-283 §9).
- **Critère de fin** : chaque préalable versé, daté.

#### H10 · m : encart de sécurité sur les CAB_
- **Identifiant, piste** : lettre m (D-m) ; encart de sécurité sur les CAB_ (NF-7) ; sécurité ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun ; NF-7 attend aussi D2 mergée (porte 12) et se sert dans J2-base (H59).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre m, de la main du responsable.
- **Critère de fin** : lettre mergée ; NF-7 servi dans J2-base.
- **Mise à jour (2026-10-15)** : m écrite par D-303 sur arbitrage du responsable : à la publication d'un instrument du cabinet, déclaration obligatoire « pose une question sur le suicide : oui / non » ; oui ⇒ encart signé de D-275 sur chacun de ses écrans ; sans réponse, pas de publication. Aucun instrument du cabinet en production au 2026-10-14 (conteneur). Reste NF-7 (J2-base, après la porte 12).

#### H11 · n : garde de dose resserrée
- **Identifiant, piste** : lettre n (D-n) ; garde de dose resserrée (EF-3b) ; sécurité ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non pour la lettre ; EF-3b porte la migration de J2-base, en tête du rang 4 par la hiérarchie h1.
- **Décisions, textes** : lettre n, de la main du responsable ; aucune valeur de dose proposée par l'assistant.
- **Critère de fin** : lettre mergée ; EF-3b servi dans J2-base, release-db constatée.
- **Mise à jour (2026-10-15)** : n écrite par D-304 sur arbitrage du responsable : la garde reconnaît aussi « nombre + unité + par jour, par prise, par kilo » (aujourd'hui « 200 mg par jour » se valide par lot) ; posologies sans nombre non visées ; aucune valeur de dose. Reste EF-3b : relevé par conteneur des affirmations déjà validées par lot qui portent une dose, puis migration de la fonction et release-db.
- **Mise à jour (2026-10-15, EF-3b)** : D-304 amendée sur arbitrage du responsable après la revue P1 (semaine, mois, kilogramme, 24 h, journalier, hebdomadaire, mensuel, chaque jour, au coucher ; fréquence avant la dose, §2 bis). Relevé fait par conteneur sur la règle amendée : 150 affirmations signées par lot, deux portent une dose hors du garde existant (apports moyens quotidiens en EPA et DHA rapportés à un ANC), signalées (D-304 §4), ni reprises ni dévalidées ; les 66 qui portent un chiffre lues une à une : aucune posologie ; aucune affirmation en attente. Migration `20261015140000_rag_claim_garde_dose_v1` écrite (famille 6 de `rag_claim_porte_seuil`, contrat `rag_claim_garde_dose_v1.sql` au CI), en PR seule, en tête des release-db du rang 4. Reste : la release-db de `20261015130000` (D-281 §5, #1476) constatée d'abord, une à la fois ; puis merge, release-db approuvée, constat par conteneur.
- **Mise à jour (2026-10-15, EF-3b livré)** : mergé par #1478 (6be60c33), après la release-db de #1476 constatée (`20261015130000` finie à 15:21:55 UTC). Release-db approuvée par le responsable : run 38770021810 vert, garde anti-recul comprise ; sentinelle `WN_RELEASE_DB_OK id=38770021810-1` ; migration finie à 16:57:08 UTC (one-off-3935, une tentative) ; déploiement 6be60c33 en tête de la liste Scalingo. Constat par conteneur (one-off-9138) : commentaire de `rag_claim_porte_seuil` nommant D-304, fonction IMMUTABLE ; une dose sous une forme que D-304 reconnaît (nombre et unité de dose, avec une fréquence ou un poids de sa liste), écrite avant ou après la fréquence, ferme la voie rapide ; une posologie hors de ces formes (sans nombre, §3, ou sans unité de dose, « 2 gélules par jour ») ne la ferme pas ; aucune affirmation en attente. Les deux références d'apport signées par lot (WN-CL-0033-019, WN-CL-0033-020, source WN-SRC-0033) : relecture une à une décidée par le responsable le 2026-10-15, par « Remettre en attente » dans l'atelier du corpus (transition d'annulation existante, sans migration). Critère de fin de H11 tenu pour la part EF-3b.

#### F45 · Date de naissance au dépôt et garde d'âge
- **Identifiant, piste** : lettres z, as, at ; J2-conf ; ingest.
- **Rang** : z au rang 0 ; at au rang 1 au plus tôt [Hypothese] ; J2-conf au rang 2 ; as au rang 10, place 6 de la file C.
- **Portes, préalables** : porte 18 pour as ; K-05a (F46) pour at ; porte 17.
- **Migration, release-db** : non pour J2-conf ; selon pour as.
- **Décisions, textes** : la transmission reste ouverte ; au dépôt, le patient est invité à saisir ou confirmer sa date ; rien de neuf pour un mineur avant le consentement. La date lue est une donnée d'identité : registre IA, nouvelle version de « L'IA dans Wellneuro », nouveau contrat d'extraction constaté sur un import réel. La garde sans saisie reste à trancher dans as.
- **Critère de fin** : garde jouée en banc sur fixtures, puis constat par identifiant ; rubrique « Cas des mineurs » renseignée (`docs/DOSSIER_RGPD.md:1274`).
- **Mise à jour (2026-10-13)** : D-283 §5 puis D-284 §3, §4 et §7 : seuil des mineurs à 18 ans, acquis ; un dossier sans date de naissance se voit demander sa date à la prochaine connexion, questionnaires et biologie en pause tant qu'elle manque (lot (h) de H26, qui remplace (d)) ; la fiche signalétique reste ouverte pour la saisir ; la lettre z garde son objet, son seuil est acquis. Rubrique « Cas des mineurs » : `docs/DOSSIER_RGPD.md:1307` sur 36f82cf1.
- **Mise à jour (2026-10-14)** : lot (h) codé (garde d'âge `lib/patient/gardeAge.ts`, étape date au portail, gardes serveur) ; la garde d'âge de z existe donc pour les surfaces en service ; as, at et J2-conf inchangés.
- **Mise à jour (2026-10-15)** : z écrite par D-302 sur arbitrage du responsable : D-284 §3-4 entérinés ; la date de naissance devient obligatoire à la création d'un dossier par le praticien (facultative au code aujourd'hui) ; lot de code sans migration à placer ; as, at, J2-conf et le circuit des mineurs inchangés.
- **Mise à jour (2026-10-18)** : lot de code de z livré, sans migration : la création d'un dossier par le praticien exige une date de naissance valide au sens de la garde d'âge (règle de la saisie au portail : format, 1900 au plus tôt, réelle, non future), au formulaire et au serveur ; un mineur se crée et reste sous la garde ; dossiers anciens et PATCH de la fiche inchangés. as, at, J2-conf et le circuit des mineurs inchangés.
- **Mise à jour (2026-10-21, J2-conf pour ACT-5)** : relevé : non fait (r jamais consignée, at non faite, lot sans objet écrit). Arbitrages du responsable (D-341) : r faite (registre existant reconnu, H28) ; at hors du périmètre d'ACT-5 (aucune lecture IA dans les textes des mineurs), reste au rang 1 avec ses gestes ; le lot de code J2-conf est fondu dans le lot d'ACT-5 (bancs `lib/patient/texteMineurs.test.ts` et `app/portail/[token]/page.test.tsx` : texte rendu au seul dossier mineur ouvert, ni au majeur, ni au dossier clos ; aucun instrument servi, tenu par la pause des routes inchangée). J2-conf tenu pour ACT-5 par arbitrage ; le critère de fin de cette fiche (rubrique « Cas des mineurs », constat par identifiant) reste celui de at et as, qui restent ouvertes.
- **Mise à jour (2026-10-22, restes)** : arbitrages du responsable (D-342). at remplacée : aucune lecture de la date par l'IA (son masquage tient, D-284 §5) ; l'écran de masquage affiche la date du dossier, à comparer au compte rendu avant de la noircir (lot de code sans migration, D-342 §3). as close : garde sans saisie tranchée par D-284 §3, invitation au dépôt sans objet (dépôt fermé sans date), correction par « Faire corriger une information » puis par le praticien (D-342 §4). Repère « Mineur, accord parental attendu » dans la liste des patients (lot de code sans migration, D-342 §2). Critère de fin : les bancs sur fixtures tiennent lieu de constat par identifiant ; F45 se clôt aux lots du repère et de at livrés et à la rubrique 4 renseignée, où ne restent que les 15–17 ans, préalable de J3-mineurs (D-342 §5, §7).
- **Mise à jour (2026-10-22, repère livré)** : la ligne d'un dossier en suivi dont la date dit un mineur porte « Mineur, accord parental attendu » dans la liste des patients (`components/ui/PatientRow.tsx`, même règle que l'écran du mineur au portail ; banc `PatientRow.test.tsx`) ; sans migration ni drapeau (D-342 §2). Reste la date au masquage (D-342 §3) et la rubrique 4.
- **Mise à jour (2026-10-22, at remplacée, livrée)** : l'écran de masquage affiche la date de naissance du dossier au format des comptes rendus (JJ/MM/AAAA), à comparer avant de la noircir, ou dit qu'aucune date lisible n'est au dossier (`components/patient-cockpit/MasquageIdentite.tsx`, `phraseDateDossier`) ; la route du compte rendu la sert avec lui (`lib/biology-library/import/lecture.ts`, seul champ lu du patient) ; elle ne part pas au service de lecture. Sans migration ni drapeau (D-342 §3). Les deux lots de D-342 sont livrés ; F45 ne garde que la rubrique 4 (15–17 ans, préalable de J3-mineurs).
- **Mise à jour (2026-10-22, rubrique 4)** : avis préparatoire écrit, confronté au dépôt ; arbitrages du responsable (D-344) : rubrique 4 réécrite en version provisoire ; « un seul titulaire suffit » et « aucun secret opposable » suspendus ; trois demandeurs de droits (étape 7) ; texte 2B gardé jusqu'à l'avis ; avocat consulté maintenant (six questions, grille des dix réponses provisoires en annexe). F45 se clôt à la réponse de l'avocat reportée dans la rubrique.

#### H12 · ac et J2-radar : radar sans zéro
- **Identifiant, piste** : lettre ac (M-6, D-ac, R:ac), puis J2-radar.
- **Rang** : ac au rang 0 ; J2-radar au rang 1.
- **Portes, préalables** : ac : aucun ; J2-radar : ac ; lève la porte 3.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ac, de la main du responsable.
- **Critère de fin** : « non mesuré » constaté à l'écran ; banc de `DetailBesoinsPanel.tsx:58`.
- **Mise à jour (2026-10-15)** : ac écrite par D-301 (texte accepté tel quel) : un besoin non mesuré est un axe sans point, nommé « non mesuré » ; constat au code : `DetailBesoinsPanel.tsx:58` trace `couverture ?? 0`. Reste J2-radar (rang 1), qui lève la porte 3.
- **Mise à jour (2026-10-18, J2-radar)** : livré sans migration. L'axe d'un besoin non mesuré reste sur le radar, sans point, son libellé porte « non mesuré », et le contour s'y interrompt (module pur `components/ui/scoreRadarPoints.ts`, forme personnalisée de `ScoreRadar` : recharts 3.9 traçait une valeur absente au centre). Bancs : règle pure, `Polygon` réel de recharts avec contre-épreuve, E2E `e2e/fiche-radar-besoins.spec.ts` qui constate « non mesuré » à l'écran. La porte 3 se lève au déploiement.

#### H13 · G-10, v, J2-bandes, J3-bandes : fidélité et bandes de bruit
- **Identifiant, piste** : G-10.
- **Rang** : G-10 au rang 0 ; v au rang 1 ; J2-bandes au rang 2 ; J3-bandes au rang 3.
- **Portes, préalables** : G-10 : aucun ; v : G-10 ; J2-bandes : v ; J3-bandes : J2-bandes, G-10 ; lève la porte 11.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre v, de la main du responsable ; une source test-retest par instrument, de la main du responsable ; publication dans BANDES_DE_BRUIT.
- **Critère de fin** : bandes publiées en banc ; un mot seulement là où la bande est signée.
- **Mise à jour (2026-10-15)** : instruments arrêtés par le responsable pour G-10 : enquête alimentaire (Q_ALI_01, besoins 1 et 3), DNST (Q_INF_03, 10 et 12), hyperexcitabilité (Q_INF_01, 4), mode de vie (Q_MOD_01, 5), HADS (Q_NEU_11, 8). Répétitions constatées en production le 2026-10-10, en dossiers : 5, 3, 2, 2, 0. Aucune source test-retest au corpus pour eux ; aucune bande signée (`BANDES_DE_BRUIT` vide, non publiée). À fournir : une référence test-retest par instrument, ou un paramètre technique déclaré comme tel (DC-20). La bande se porte par besoin : la règle d'un besoin lu par plusieurs instruments se tranche dans v.
- **Mise à jour (2026-10-21, fait nouveau relevé par le cadrage H84)** : la liste d'instruments arrêtée le 2026-10-15 ne couvre pas les sources que J3-12f installera pour les besoins 8, 9 et 12 (H15, décisions 1 à 4 du 2026-10-18 ; sources ingérées par J3-12e et ses compléments). G-10 se complète de ces sources après le changement de version, avant v ; aucune bande n'est signée d'ici là.

#### F63 · Module BioFlow publié
- **Identifiant, piste** : lettre j (D2, règle de dépendance) ; J3-bioflow : un premier lecteur hors biologie ; socle.
- **Rang** : j au rang 0, J3-bioflow au rang 1.
- **Portes, préalables** : porte 12 ; effet de la NABM non tranché, ne retient pas la chaîne (question écartée le 2026-10-13).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre j ; un module publié exige un contrat, pas seulement un index consommé ; clauses CF-1, NF-1, NU-1, PF-0, DV-0 à nommer dans j.
- **Critère de fin** : garde de dépendance verte ; module lu par un premier lecteur hors biologie.
- **Mise à jour (2026-10-15)** : j écrite par D-306 : module publié = entrée publiée, tables, drapeaux, un lecteur hors domaine ; imports directs en dérogations datées ; clauses PF-0, CF-1, NF-1, NU-1, DV-0 ; garde = banc à liste fermée des imports de la biologie avec J3-bioflow, K-19 général au palier 2 ; porte 12 levée au merge. Le critère « garde de dépendance verte » se lit : banc BioFlow vert.
- **Mise à jour (2026-10-17)** : J3-bioflow livré en une PR, sans migration : entrée publiée `biology-library/publie.ts` (fichiers, 25 tables, 6 drapeaux) ; premier lecteur hors biologie, la route de clôture d'un dossier (`patients/cycle-de-vie`), converti à l'entrée seule ; banc `bioflowPublie.guard.test.ts` vert : 20 dérogations datées du 2026-10-17 sous plafond figé, import neuf rouge.

#### F38 · q et J2-med : aperçu médecin tracé, remise au patient
- **Identifiant, piste** : lettre q ; trackc.
- **Rang** : q au rang 0 ; J2-med au rang 1, ou 4 au plus tôt si la migration se confirme (règle).
- **Portes, préalables** : porte 27 ; si migration, G-7, porte 9, place dans G-6.
- **Migration, release-db** : selon [A verifier].
- **Décisions, textes** : lettre q ; « la signature ne qualifie rien », un envoi direct vers un tiers serait un déclencheur.
- **Critère de fin** : aperçu tracé au Fil ; remise journalisée.
- **Mise à jour (2026-10-15)** : q écrite par D-307 : « Imprimer » demande une confirmation puis écrit une ligne datée au Fil ; l'aperçu n'est pas tracé ; remise par téléchargement du patient, journalisé (patron D-262) ; rien vers un tiers.
- **Mise à jour (2026-10-18)** : la migration est confirmée, et J2-med passe au rang 4, avec ses arbitrages du jour : un seul lot ; impression bloquée par la règle de la correspondance médecin ; chaque téléchargement journalisé ; le patient reçoit l'instantané de la dernière impression ; conservation la vie du dossier. PR 1, la migration `documents_medecin_imprimes_v1` : deux tables en ajout seul, contrat SQL négatif, effacement nommé, déclaration RGPD avant les tables. Restent la release-db et son constat, puis la PR 2 : route d'impression gardée, ligne au Fil, « Pour votre médecin » au portail derrière un drapeau éteint.
- **Mise à jour (2026-10-18, code)** : la migration a été mergée (#1560), puis appliquée et constatée par conteneur (run 39144243510). La PR 2 livre :
  - l'impression confirmée, servie dès le déploiement, recomposée au serveur et gardée par le partage relu sous verrou (refus sans trace, dossier clos refusé) ;
  - la ligne « Document pour le médecin imprimé le … » au Fil ;
  - « Pour votre médecin » au portail, derrière `WN_DOCUMENT_MEDECIN_PATIENT` éteint, avec chaque téléchargement journalisé et rien de servi sans accord.

  Reste, avant d'allumer le drapeau : la relecture des textes du portail par le responsable, puis un constat sur un dossier de test.
- **Mise à jour (2026-10-19)** : #1564 mergée et déployée. Arbitrages du responsable :
  - textes du portail validés tels quels ;
  - une synthèse imprimée ne se vide ni ne se rejette ;
  - portail ouvert, la confirmation d'impression l'annonce ;
  - constat en trois gestes (le responsable imprime, l'assistant allume, le responsable télécharge), puis relecture par conteneur.

  Reste le constat, puis le drapeau.
- **Mise à jour (2026-10-19, constat)** : #1573 a été mergée et déployée. Le constat a été fait sur un dossier de test : l'impression puis les téléchargements depuis le portail ont été relus par conteneur et concordent. `WN_DOCUMENT_MEDECIN_PATIENT` est **allumé** depuis le 2026-10-19. F38 est livrée.

#### F57 · Onglet « Biologie » de la fiche patient
- **Identifiant, piste** : lettre s ; socle.
- **Rang** : s au rang 0 ; code au rang 4 avec J2-base.
- **Portes, préalables** : porte 12 (D2 mergée) ; G-7 ; porte 9 ; porte 24 pour le palier 2.
- **Migration, release-db** : non pour l'onglet ; voir F58 pour le statut posé.
- **Décisions, textes** : lettre s, de la main du responsable, complétée par les arbitrages acquis (deux marques « validé »).
- **Critère de fin** : onglet constaté par le responsable ; écrans de biologie regroupés ; aucun statut calculé en banc.
- **Mise à jour (2026-10-15)** : s écrite par D-308 : onglet « Biologie », écrans déplacés depuis « Trajectoire » et le protocole, sans doublon ; statut posé pris dans une liste fermée écrite par le responsable (D-xxx propre, avant le code de F58 ; écart à la recommandation « texte libre ») ; deux marques datées ; commentaires du laboratoire déjà servis par la série (BP-03).
- **Mise à jour (2026-10-17)** : PR 1 livrée sans migration : onglet « Biologie » (`?onglet=biologie`), encart « Estimé et mesuré » déménagé depuis « Trajectoire », sans doublon ; cartes du Fil (compte rendu à lire, transmis) redirigées vers l'onglet. Reste la PR 2 : proposition de bilan et arbitrage biologique, aujourd'hui sous la phase « Actions ». Statut posé et deux marques datées : F58.
- **Mise à jour (2026-10-17, PR 2)** : D-319, sur arbitrage du responsable (« Proposition seule ») : la proposition de bilan déménage dans l'onglet « Biologie » (`components/biologie/PropositionBilanSection.tsx`), lue à l'ouverture puis gardée montée ; l'arbitrage biologique reste dans la phase Actions, l'onglet compte les actions qui l'attendent et y renvoie (« Ouvrir l'arbitrage »). D-308 §1 amendée pour cette exception. Sans migration. Reste F58 (statut posé et deux marques datées), après la liste du responsable.

#### F55 · BF-7 et BF-8 : code d'acte et courrier de remboursement
- **Identifiant, piste** : BF-7 (code d'acte ligne à ligne au courrier) et BF-8 (courrier de remboursement) ; panels.
- **Rang** : aa au rang 0 ; code au rang 4 avec J3-base.
- **Portes, préalables** : f et G-3 (porte 10) ; G-7 et porte 9 pour BF-8 ; porte 16 pour d'autres parts de J3-base.
- **Migration, release-db** : BF-8 oui, rang 4.
- **Décisions, textes** : lettre aa, de la main du responsable. Garde : un analyte signé hors du millésime courant affiche un libellé fixé par aa ; la liaison se relit avant.
- **Critère de fin** : courrier rendu sous la garde non prescriptive ; release-db constatée.
- **Mise à jour (2026-10-13)** : f et G-3 (porte 10), G-7 et la porte 9 s'appliquent à la part code (rang 4, avec J3-base), non à la lettre aa, qui n'a aucun préalable.
- **Mise à jour (2026-10-15)** : aa écrite par D-309 : aucun montant ; code d'acte par ligne ; « remboursement non évalué » écrit ; « Hors nomenclature » seul (mention « à la charge du patient » retirée) ; toutes les lignes au médecin, `regimeDocumentaire` retirée. La garde « hors du millésime courant » est l'état « Hors nomenclature ».
- **Mise à jour (2026-10-17)** : D-309 §2 et §3 exécutés par la lettre f (D-316 §3) : le courrier dit « Remboursement non évalué : … » et « Hors nomenclature : … », une fois par courrier, des analyses distinctes (D-316 §5). Restent au rang 4, avec J3-base : §1 (code d'acte par ligne, groupe et conditions en mots) et §4 (retrait de `regimeDocumentaire`).

#### H14 · ab : EF-0, trancher Q3
- **Identifiant, piste** : lettre ab (D-ab) ; EF-0 : trancher Q3 ; cockpit ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ab, de la main du responsable.
- **Critère de fin** : choix écrit, mergé ; EF-0 servi dans J3-base (H61).
- **Mise à jour (2026-10-15)** : ab écrite par D-310 : atelier après la Bibliothèque, sans « 4.0 » ; entrée « Connaissances » pour lire le corpus, distincte de la signature (écart à la recommandation).
- **Mise à jour (2026-10-18)** : EF-0 servi par L4 et L5 (#1546, D-324) : critère de fin atteint.

#### H15 · w et J3-12b : guide des 12 besoins
- **Identifiant, piste** : lettre w (D-w, G-9), puis J3-12c et J3-12b ; cockpit ; geste du responsable (w), puis file A (J3-12c, J3-12b).
- **Rang** : w au rang 0 ; J3-12c au rang 1, avant le deuxième dossier de preuve ; J3-12b au rang 1.
- **Portes, préalables** : w : le temps du responsable ; J3-12b : w.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre w, de la main du responsable.
- **Critère de fin** : guide signé ; onglet « Les 12 besoins » réorganisé et servi ; J3-12c : clés posées à la signature, relues par conteneur, puis les 92 claims du fer étiquetés.
- **Mise à jour (2026-10-15)** : méthode de w écrite par D-312 : trame à six champs par besoin ; un dossier de preuve hors dépôt par besoin, au modèle de celui du besoin 2 (BP-07), lu en production par conteneur, verdicts claim par claim du responsable ; 60/20/20 jamais signé tel quel. Le guide reste à réécrire de sa main ; J3-12b suit.
- **Mise à jour (2026-10-16, J3-12c décrit)** : audit des 12 besoins joué le 2026-10-15 (prod lue par conteneur, agrégats, artefact privé) : 8 besoins sur 12 nourris (2, 6, 7, 11 non évalués), aucun lien claim → besoin en base, 28 règles de code citent un besoin et un claim, BP-07 ne couvre que le fer. Huit arbitrages du responsable le même soir (artefact §9, consignés en mémoire, ne se reposent pas) : (1) ordre : achever le besoin 2, puis 1, 4, 5, 9, puis 3, 8, 10, 12, puis 6, 7, 11 ; (2) liste fermée du besoin 2 : les huit du guide (fer fait ; zinc, magnésium érythrocytaire, iode, sélénium, vitamine D, B9, B12 active) plus polyphénols et antioxydants, cofacteurs hors liste écartés ; (3) lien claim → besoin par clés de métadonnée posées à la signature dans l'atelier, sans table ni migration, forme = besoins servis + rubrique de la chaîne d'usage, jamais la population ; (4) 60/20/20 redéfini à la signature du guide, en un seul bump de version avec les changements de sources, `BESOIN_SOURCES` intouché avant ; (5) seuils non sourcés retirés du guide, réintroduits par le dossier qui les fonde ; (6) écarts d'instruments tranchés dossier par dossier ; (7) fibres, prébiotiques et probiotiques au besoin 4. Un lot de code en découle, **J3-12c** (file A, rang 1, sans migration), qui précède le deuxième dossier de preuve. Objet : la route de décision des claims (`web/src/app/api/praticien/corpus/claims/decision/route.ts`, lib `deciderClaim` de `web/src/lib/rag/claims/revue.ts`) accepte deux clés optionnelles, `besoins` (liste non vide d'entiers de 1 à 12, les clés de `BESOIN_SOURCES`) et `rubrique` (une valeur d'une liste fermée de la chaîne d'usage : indication, lecture, options, précautions, suivi, adressage), écrites dans la colonne `metadata` (jsonb, existante depuis la migration `20260722150000_rag_corpus_claims_v1`) dans la même transaction que la signature et recopiées dans la ligne de journal ; une action distincte `etiqueter` pose ou corrige les clés d'un claim déjà VALIDE sans toucher statut, signataire ni date, journalisée dans `rag_corpus_claim_decisions` ; la liste fermée des rubriques vit dans un module pur avec son banc, la route refuse en 422 toute rubrique ou tout besoin hors liste ; l'atelier (`web/src/components/corpus/AtelierCorpusPanel.tsx`) porte la saisie (douze besoins à cocher, rubrique choisie) à la signature individuelle et sur un claim de l'onglet Validés ; la validation par lot (voie rapide) ne pose aucune clé. Les clés restent facultatives à la route (un claim peut ne servir aucun besoin) ; c'est le dossier de preuve qui les exige pour chaque claim qu'il cite. [A verifier] la liste des rubriques est celle que BP-12a fixe en base (D-314 §8, arbitrage 13), relue au moment du lot. Ensuite, geste du responsable (file D) depuis l'atelier : ré-étiquetage des 92 claims du fer cités par BP-07, rubrique par rubrique d'après le dossier privé, puisque les rubriques n'existent pas au dépôt (`D-251` §4). Critère de fin de J3-12c : un claim signé avec ses clés relu par conteneur ; puis les 92 étiquetés, constatés en agrégats par rubrique, avant la première signature du deuxième dossier. Décisions : amendement de D-312 (§5, forme des clés et liste fermée) dans la PR du lot, sur les arbitrages rendus. Le deuxième dossier (micronutriment du besoin 2 désigné par le responsable parmi vitamine D, zinc et magnésium) suit le modèle exact de BP-07 (LOT-07) : lecture prod par conteneur, rubriques, population, verdicts proposés, conflits, positions d'expert, contre-revue, forme opaque au dépôt.
- **Mise à jour (2026-10-16, deuxième dossier de preuve ouvert)** : micronutriment désigné par le responsable le 2026-10-16 : la vitamine D (analyte le plus partagé du catalogue, liaison NABM signée). Dossier privé hors dépôt, au modèle de BP-07, remis le même jour pour verdicts. Forme opaque (`D-251` §4) : mécanismes et agrégats seulement. Corpus lu en production par conteneur en lecture seule (one-off 8622, 5409, 5738 et suivants, vers 22:30-23:00 UTC), sans écriture : champ lexical par expression régulière sur le texte normalisé des claims (noms de la vitamine, formes, métabolites), puis seconde lecture par termes voisins ; chaque nombre d'un claim chiffré confronté à son passage par requête (présence de la chaîne), les passages des claims de dose et de précaution relus en entier. Agrégats : 189 claims actifs dans le champ, tous `VALIDE`, 85 sources ; 157 cités au dossier par rubrique de la chaîne d'usage (indication, lecture, options, précautions, suivi, adressage), dont un claim hors champ repéré par les termes voisins ; 33 non cités, gardés ; 304 nombres vérifiés, un écart (un effectif non retrouvé tel quel) ; verdicts proposés : 141 à signer, 14 à relire, 2 hors parcours, 0 rejet ; 5 brouillons de dose et de précaution extraits de passages, non déposés ; 8 conflits déclarés, dont un de sécurité (complément sans dosage, même question que C4 du fer) et un de périmètre (formes pharmaceutiques, hors médicament) ; 8 positions d'expert à rédiger ; 6 sources externes nommées au dossier (titres), aucune ingérée. Contre-revue adverse `wn-reviewer` sur onze affirmations : cinq confirmées, six réfutées et corrigées au dossier (deux populations d'un cas clinique pédiatrique, paraphrases resserrées, trois claims remontés de « hors parcours » en rubrique, une unité et une fréquence non portées par le claim retirées) ; GO avec réserves, réserves levées. Rien n'est écrit en base : aucune signature, aucun brouillon déposé, aucune clé posée ; J3-12c précède la première signature. **Identifiants cités** (157, v1.0, sans rubrique) : WN-CL-0032-024, WN-CL-0032-025, WN-CL-0032-026, WN-CL-0032-027, WN-CL-0038-015, WN-CL-0044-015, WN-CL-0048-011, WN-CL-0057-019, WN-CL-0057-021, WN-CL-0057-022, WN-CL-0057-023, WN-CL-0062-002, WN-CL-0062-012, WN-CL-0062-028, WN-CL-0062-042, WN-CL-0063-010, WN-CL-0070-003, WN-CL-0075-006, WN-CL-0076-017, WN-CL-0105-005, WN-CL-0116-014, WN-CL-0123-020, WN-CL-0123-023, WN-CL-0124-006, WN-CL-0125-007, WN-CL-0139-011, WN-CL-0140-003, WN-CL-0147-006, WN-CL-0147-007, WN-CL-0147-008, WN-CL-0147-009, WN-CL-0147-010, WN-CL-0147-018, WN-CL-0147-019, WN-CL-0147-020, WN-CL-0147-021, WN-CL-0147-022, WN-CL-0150-006, WN-CL-0150-007, WN-CL-0154-054, WN-CL-0161-017, WN-CL-0161-050, WN-CL-0161-051, WN-CL-0161-052, WN-CL-0161-053, WN-CL-0161-054, WN-CL-0163-009, WN-CL-0164-032, WN-CL-0164-033, WN-CL-0164-034, WN-CL-0164-035, WN-CL-0164-040, WN-CL-0164-044, WN-CL-0165-037, WN-CL-0166-033, WN-CL-0166-049, WN-CL-0167-022, WN-CL-0167-033, WN-CL-0167-034, WN-CL-0172-033, WN-CL-0172-034, WN-CL-0172-035, WN-CL-0172-036, WN-CL-0172-037, WN-CL-0172-038, WN-CL-0172-039, WN-CL-0174-045, WN-CL-0174-048, WN-CL-0174-049, WN-CL-0177-002, WN-CL-0178-053, WN-CL-0178-054, WN-CL-0178-075, WN-CL-0178-079, WN-CL-0194-002, WN-CL-0194-003, WN-CL-0200-006, WN-CL-0234-017, WN-CL-0235-013, WN-CL-0236-016, WN-CL-0236-026, WN-CL-0238-001, WN-CL-0239-002, WN-CL-0239-003, WN-CL-0239-004, WN-CL-0239-005, WN-CL-0239-006, WN-CL-0239-007, WN-CL-0239-008, WN-CL-0239-009, WN-CL-0239-010, WN-CL-0239-011, WN-CL-0239-012, WN-CL-0239-013, WN-CL-0239-014, WN-CL-0242-014, WN-CL-0250-008, WN-CL-0251-015, WN-CL-0282-002, WN-CL-0282-014, WN-CL-0282-016, WN-CL-0282-017, WN-CL-0283-002, WN-CL-0283-004, WN-CL-0312-012, WN-CL-0312-013, WN-CL-0312-018, WN-CL-0313-009, WN-CL-0314-007, WN-CL-0315-014, WN-CL-0315-019, WN-CL-0317-006, WN-CL-0317-010, WN-CL-0319-009, WN-CL-0321-007, WN-CL-0323-010, WN-CL-0323-011, WN-CL-0323-032, WN-CL-0326-009, WN-CL-0327-011, WN-CL-0328-010, WN-CL-0329-003, WN-CL-0329-011, WN-CL-0331-009, WN-CL-0333-020, WN-CL-0333-030, WN-CL-0336-026, WN-CL-0342-011, WN-CL-0344-026, WN-CL-0345-009, WN-CL-0346-013, WN-CL-0348-018, WN-CL-0349-015, WN-CL-0349-020, WN-CL-0350-024, WN-CL-0350-026, WN-CL-0355-017, WN-CL-0361-009, WN-CL-0362-013, WN-CL-0362-018, WN-CL-0363-012, WN-CL-0366-011, WN-CL-0369-014, WN-CL-0369-027, WN-CL-0374-008, WN-CL-0374-010, WN-CL-0376-012, WN-CL-0376-016, WN-CL-0377-015, WN-CL-0378-012, WN-CL-0386-002, WN-CL-0386-013, WN-CL-0386-025, WN-CL-0387-018, WN-CL-0388-008, WN-CL-0388-011, WN-CL-0388-016. Suite, dans l'ordre : verdicts du responsable au dossier ; feu vert pour le dépôt des brouillons « en attente » (envoi approuvé) ; J3-12c ; signatures dans l'atelier avec clés ; positions v0.1 puis v0.2 signée (BP-12b) ; sources externes sur approbation ; constat par conteneur, puis seconde mise à jour de cette fiche.
- **Mise à jour (2026-10-16, entrée des dossiers du besoin 2 au BioFlow, quatre arbitrages)** : le responsable retient la lecture suivante, sur questions à options. Les dossiers de preuve du besoin 2 (zinc, magnésium érythrocytaire, B9, B12, iode, sélénium, après la vitamine D) servent deux consommateurs avec une seule signature de claim : le guide (lettre w) et les fiches d'usage du premier parcours « exploration du besoin 2 » (F05, BP-12a, F02). La signature des contenus de fiche reste distincte et requise dans le lot, avant son merge (porte 23) ; la validation des claims est une étape à part. Les deux circuits restent séparés : l'entrée au BioFlow ne touche ni `BESOIN_SOURCES` ni les parts 60/20/20. Polyphénols et antioxydants n'ont aucun analyte au catalogue : ils restent côté guide et assiette, sans entrée biologique, jusqu'à une décision clinique sourcée. (1) **Entrée dans les fiches** : même question, fiches ajoutées. BP-12a code une fiche par question clinique et par usage (`lots/LOT-12-fiches-usage.md`) ; chaque dossier clos ajoute ses fiches à la question existante, un lot de contenu par micronutriment, en réutilisant les hypothèses et les populations déjà signées et en n'en ajoutant que si le dossier l'exige. Écartés : une question propre par micronutriment ; un seul lot après les huit dossiers. [A verifier] qu'une fiche ajoutée n'exige aucune migration (structure en code, actes en ajout seul), à relire au lot. (2) **Lien claim → analyte** : il reste dans la structure signée de la fiche, qui cite déjà ses codes d'analyte et ses claims ; J3-12c reste à deux clés, besoins et rubrique. Écarté : une troisième clé posée par claim. (3) **Analytes sans acte** : l'iodurie, le sélénium et la B12 active n'ont aucun acte candidat (liste de M-3b, relue le 2026-10-15) et attendent le constat « aucun acte » de M-3c ; leurs dossiers s'ouvrent sans l'attendre, le dossier se fondant sur les claims et non sur la nomenclature. Les folates érythrocytaires (acte candidat, groupe au choix) et la B12 totale (acte candidat, isolé) se signent par G-3 quand le responsable le décide. (4) **Ordre des dossiers après la vitamine D** : zinc, magnésium érythrocytaire, B9 et B12, puis iode et sélénium. Renvois : F05 (BP-12a) reçoit les fiches ainsi ajoutées en lots de contenu ; F02 (BP-07) reste le modèle des dossiers.
- **Mise à jour (2026-10-17, dossier de la vitamine D, rien en base)** : forme opaque (`D-251` §4), identifiants, mécanismes et agrégats seulement. Les 17 décisions du dossier privé sont renseignées par le responsable ; deux contre-expertises indépendantes hors dépôt rouvrent 8 points, dont 1 sans proposition retenue ; les propositions sont consignées au dossier privé, à confirmer par le responsable. 4 documents de référence (textes réglementaires et santé publique) lus en direct, titres au dossier privé ; un claim réglementaire (`WN-CL-0062-002`) ne concorde avec aucun d'eux. Brouillons : 5, dont 0 déposé, 2 abandonnés, 3 à corriger. Mise en service recommandée en deux niveaux : information et orientation d'abord, conduites chiffrées fermées jusqu'à une source de correction ingérée. Sources externes à ingérer : liste au dossier privé, titres seuls à l'ingestion, sur approbation du responsable. 0 signature, 0 clé, 0 source ingérée ; J3-12c précède toujours la première signature. [A verifier] les rubriques de J3-12c face à la liste fermée de 10 rubriques que BP-12a fixe en base (D-314 §8) : vocabulaires différents, arbitrage à poser avant d'écrire le lot.
- **Mise à jour (2026-10-17, J3-12c, migration)** : D-321 (amende D-312, §5 neuf) sur deux arbitrages du responsable du 2026-10-17 (questions à options) : les rubriques des clés sont les dix des fiches d'usage (`RUBRIQUES_FICHE_USAGE`, D-314 §8), ce qui lève l'« [A verifier] » ci-dessus — le dossier de la vitamine D se reclasse de six en dix avant sa signature ; l'étiquetage d'un claim déjà signé a son propre type d'acte au journal (`etiquetage`), d'où une migration (`20261017100000_rag_claim_decisions_etiquetage_v1`, CHECK seul, aucune donnée touchée, contrat négatif en CI). Lot en deux temps : migration (release-db, constat par conteneur), puis code consommateur (route, `deciderClaim`, atelier).
- **Mise à jour (2026-10-17, J3-12c, code)** : migration #1521 appliquée par release-db (run 39036065120, sentinelle `WN_RELEASE_DB_OK`) et constatée par conteneur le 2026-10-17 (une tentative, deux CHECK validés, `migrate status` à jour) ; code livré dans la PR de suite : clés posées à la signature individuelle et par l'acte « Étiqueter » de l'onglet « Validés », clés héritées affichées et reprises à la re-validation, ingestion qui refuse `besoins` et `rubrique`. Reste le geste du responsable : l'étiquetage des 92 claims du fer, avant la première signature du dossier de la vitamine D (D-321 §8).
- **Mise à jour (2026-10-18, mesure des besoins)** : l'audit de D-312 a reçu le 2026-10-17 une section « Mesure » (constat, aucune correction ni seuil ; code relu, production lue par conteneur en lecture seule, agrégats seuls ; contre-revues `wn-reviewer` et Codex consignées) qui décrit la chaîne de calcul de « Mon équilibre » (passation exploitable → source → besoin → strate → total 60/20/20 renormalisé, fondations critiques, niveau de preuve par source) et relève trois divergences mécaniques observées, indépendantes l'une de l'autre, dont le caractère défectueux reste à arbitrer : les sources à sous-score (`subscore`, `had`) rendent un total dès un item répondu, seul le porteur du besoin 3 exige ses items ; le snapshot clinique écarte les passations incomplètes que les routes du cockpit et du portail gardent ; le momentum compare la première mesure du dossier au jalon le plus récent. Latent en production (aucun recueil partiel de ces instruments, un seul jalon de mesure en base), donc aucune validation empirique possible à ce jour. Le 2026-10-18, un dossier de mesure hors dépôt couvre les six besoins sans source validée ou à source contestée (6, 7, 8, 9, 11, 12) : instruments candidats, psychométrie publiée, droits d'usage, charge pour le patient, écarts entre la cotation du code et la cotation publiée (PSS-10 en 1-5 avec paliers « source Drive » contre 0-4 sans seuil ; échelle de Cungi), avis et contre-avis sur un score par besoin ; contre-revue adverse par workflow (22 affirmations : 0 confirmée telle quelle, 19 nuancées, 2 réfutées, 1 non vérifiable ; complétude partielle). Le registre des instruments ne porte aucune cotation COSMIN et `measurement_evidence.json` ne couvre qu'un instrument : l'extension du socle passera par une ingestion approuvée. Sept décisions laissées au responsable (cotation de la PSS-10 ; sort de deux sources de stress ; source du besoin 8 ; source du besoin 12, aujourd'hui un proxy issu du guide ; besoins 6, 7, 11 : scorer ou évaluer en entretien ; extension du socle ; sources fermées à obtenir) ; l'ordre du 2026-10-15 (besoin 2 d'abord) n'est pas déplacé. Trois lots de code en découlent, à décrire sous `D-xxx` quand les cases seront cochées : cohérence du calcul (garde des sous-scores partiels, double compte SIIN52-55 entre besoins 1 et 3, écart snapshot/API, total « sur n besoins mesurés », badges de preuve signés ou retirés), le seul qui ne dépend d'aucune case ; changement de sources des besoins 9 et 12 en un seul bump de version ; ingestion des sources libres du dossier (notices WN-SRC, lignes `measurement_evidence.json`). Rien n'a été écrit au code ni en base.
- **Mise à jour (2026-10-18, options retenues et lot de cohérence, D-329)** : les sept décisions des dossiers de mesure sont rendues le même soir par le responsable (questions à options, recommandations suivies) : PSS-10 recodée en 0-40, paliers retirés ; deux sources de stress sorties du calcul du besoin 9, réponses archivées ; besoin 8 sur le seul versant dépressif de la HAD, renommé « contexte dépressif » ; besoin 12 sur une sous-échelle de mode de vie déjà collectée, proxy du guide retiré ; besoins 6, 7 et 11 affichés « non mesuré » jusqu'à une définition signée ; lot d'ingestion dédié des sources en accès libre ; sources fermées fournies par le responsable. Les quatre premières changent des sources : elles partent ensemble, en un seul changement de version, avec la redéfinition du 60/20/20 à la signature du guide (arbitrage du 2026-10-15). Le lot de cohérence, lui, est livré sous D-329 sans toucher le mapping : un sous-score partiel ne mesure plus un besoin (besoins 5, 8, 10, 12 ; badges de preuve alignés), le total dit sur combien de besoins il est établi (compte au cockpit, phrase sans chiffre au portail), version du score gardée sur arbitrage du responsable du 2026-10-19 : une nouvelle étiquette aurait fait dériver les cartes de décision diffusées (rejouées par le portail) et éteint 3 protocoles, alors qu'aucune passation en production n'est touchée ; dette nommée en D-329 §4 pour le prochain changement de sources. L'écart snapshot/routes est fermé pour le cas audité ; un résidu (complétude de l'agenda du sommeil jugée sur la passation entière par le snapshot) reste nommé dans D-329 §2, faute d'une direction sans effet sur une sortie réelle. Restent hors du lot : le double compte entre besoins 1 et 3 (part avec le changement de sources), la valeur des badges de preuve (signature ou retrait, question ouverte), la référence du momentum du portail.
- **Mise à jour (2026-10-18, dossier de la vitamine D signé)** : forme opaque (`D-251` §4), identifiants, mécanismes et agrégats seulement. Trois séances de décisions du responsable (2026-10-17, puis 2026-10-18 matin et après-midi, sur questions à options) tranchent tous les points du dossier privé, y compris les conflits que les sources externes ont ouverts avec des repères du corpus ; aucun point ne reste « à relire ». Verdicts au dossier sur les 157 claims cités : 130 retenus, 14 rejetés, 13 hors parcours. Sources externes : 7 notices au registre (`WN-SRC-0512` à `0518`, titre seul, #1542), 3 lots ingérés sur approbation de chaque envoi par le responsable (`LOT_018_2026-10-18` à `LOT_020_2026-10-18`), 41 passages mot pour mot, 82 claims ; trois contre-revues adverses `wn-reviewer` avant envoi (deux NO-GO corrigés, un GO aux corrections appliquées) ; les 82 claims sont signés par le responsable dans l'atelier. Aucune source de correction n'est ingérée : les conduites chiffrées de correction restent fermées, comme recommandé le 2026-10-17. Positions d'expert : 8, en v0.1 puis v0.2 au dossier privé, validées par le responsable le 2026-10-18, signature transcrite par l'assistant sur son instruction ; la v0.2 fait foi. Constat par conteneur le 2026-10-18, lecture seule : les 157 claims cités et les 82 claims externes sont `VALIDE`, aucun ne porte de clé `besoins` ni `rubrique` ; les verdicts de rejet ne sont pas encore appliqués en base ; 41 passages sur 7 sources. Migration de J3-12c (`20261017100000_rag_claim_decisions_etiquetage_v1`) constatée appliquée en production le 2026-10-17 : l'étiquetage est ouvert. Suite, dans l'ordre : (1) étiquetage par le responsable, dans l'atelier, des claims retenus et des claims externes, constaté en agrégats par rubrique ; (2) application en base des verdicts de rejet, geste du responsable ; (3) fiches de la vitamine D ajoutées à la question existante (F05, BP-12a), en lot de contenu ; (4) deux alignements entre dossiers notés au dossier privé, repris par le dossier du magnésium ; (5) dossier suivant : le zinc (ordre du 2026-10-16). Rubriques : les dix des fiches d'usage, celles de la liste fermée de BP-12a (D-321 §5, qui a levé le [A verifier] du 2026-10-17) ; le reclassement du dossier, rédigé en six rubriques, est une action distincte, préalable à l'étiquetage, sur une correspondance arbitrée par le responsable le 2026-10-18.
- **Mise à jour (2026-10-18, étiquetage en lot, D-325)** : l'onglet des claims validés de l'atelier en compte plusieurs milliers, par pages de cinquante, sans recherche par identifiant : étiqueter un dossier claim par claim n'y est pas praticable. Sur deux arbitrages du responsable du même jour (questions à options), D-325 amende D-321 §5 et §6 : un geste « étiquetage en lot » dans l'atelier (liste collée, aperçu relu, confirmation), tout ou rien, un acte `etiquetage` par claim au journal, au nom du praticien, sans migration ni changement de statut ; correspondance des six rubriques abandonnées vers les dix des fiches d'usage (adressage → Limites), non codée : la liste se prépare reclassée. Liste du dossier de la vitamine D préparée au dossier privé (194 claims, besoin 2 ; les claims rejetés, hors parcours et ceux des autres micronutriments n'y sont pas). Suite : merge du lot, constat du déploiement, puis le geste, délégable à l'assistant depuis la session du responsable (D-325 §5, amendé par lui le même jour), et constat par conteneur en agrégats par rubrique ; application des rejets en base sous la même règle.
- **Mise à jour (2026-10-20, lots des 12 besoins répartis par file)** : quatre arbitrages du responsable du 2026-10-19 (questions à options, après une contre-expertise externe des quatre points restés ouverts, vérifiée au code avant d'être posée). (1) Les badges de niveau de preuve sont masqués sur les deux écrans praticien qui les affichent, sans toucher la table : les grades entrent dans le snapshot clinique, donc dans l'empreinte des cartes de décision, et modifier la table ferait dériver les protocoles diffusés ; une table révisée sera soumise à la signature avec le changement de sources. (2) Le changement de version du score s'accompagne de la réapprobation des protocoles diffusés (option retenue pour la dette de D-329 §4), dossier par dossier, préparée avant le déploiement : chaque clic peut remettre des fiches et une lettre et déclenche une annonce neutre au patient ; entre le déploiement et le clic, le patient lit que son accompagnement n'est pas consultable, sans perte de données. (3) Le résidu de D-329 §2 (complétude de l'agenda du sommeil jugée par le snapshot) reste en l'état ; il se traite en lot séparé, après l'inventaire de ce que le moteur lit de l'agenda (le marquage « hors barème » n'agit que sur le prédicat du snapshot, mais le rideau T0 lit l'agenda). (4) Ordre : badges, puis ingestion des sources de mesure en accès libre, puis changement de sources ; le responsable fournit les sources fermées en parallèle. Le changement de sources attend aussi la signature du guide (w), avec laquelle il part en un seul changement de version (arbitrage du 2026-10-15). Depuis la mise à jour précédente : étiquetage en lot du dossier de la vitamine D fait le 2026-10-19 et rejets appliqués, constatés par conteneur ; l'étiquetage du fer reste à faire. Lots des 12 besoins par file, état au 2026-10-20 (les identifiants J3-12d à J3-12h sont neufs) :
- **Mise à jour (2026-10-21, état des gestes et chaîne besoin → leviers, D-338)** : depuis la mise à jour précédente, trois gestes sont faits et constatés par conteneur : l'étiquetage du fer le 2026-10-20 (la liste finale du dossier BP-07 compte 84 claims après verdicts — rejetés et hors parcours retirés, brouillons et claims d'une position ajoutés —, 82 étiquetés et 2 déjà porteurs ; un claim rejeté ; 84 sur 84 conformes à la relecture du 2026-10-21 ; l'écart avec les « 92 claims cités » de la clôture se réconcilie au dossier privé) ; les sources fermées fournies et ingérées (`WN-SRC-0567` à `0570`, #1615, lots `LOT_047` à `LOT_050`), ce qui lève ce préalable de J3-12f ; le dossier du zinc clos le 2026-10-21 (`LOT_021`, #1612, claims étiquetés). Le 2026-10-21, un cadrage de la suite des 12 besoins (architecte, contre-revue adverse, version corrigée ; faits de production lus par conteneur, agrégats seuls) a établi que l'aval ne lit les besoins qu'à travers les `needIds` de deux tables signées (besoins 1, 3, 4, 5, 8, 9) et que les besoins 2, 6, 7, 10, 11 et 12 ne commandent aucun levier ; il a aussi relevé que toute retouche d'une table signée re-signe son périmètre entier et fait dériver les cartes de décision diffusées, au même coût qu'un changement de version. Sept arbitrages du responsable (questions à options, recommandations suivies) en découlent, consignés par D-338 et portés par la fiche H84 ; les lots des 12 besoins ci-dessous ne changent pas, sauf que les règles aval par besoin et toute clé posée sur une table signée existante partent regroupées avec J3-12f et sa réapprobation.
- **Mise à jour (2026-10-22, dossier du magnésium érythrocytaire clos)** : forme opaque (`D-251` §4), identifiants, mécanismes et agrégats seulement. Séances de décisions du responsable des 2026-10-21 et 2026-10-22 (questions à options) : dix décisions de dossier, quatre écarts ouverts par les sources externes, quatre claims « à relire » ; aucun point ne reste ouvert. Sources externes : 3 notices au registre (`WN-SRC-0571` à `0573`, #1632), deux sources déjà au registre relues pour leurs lignes du magnésium ; 1 lot ingéré sur approbation (`LOT_051_2026-10-21`, 10 passages, 25 claims) ; brouillons de l'assistant : 6 déposés sur accord de chaque envoi, dont un réduit aux teneurs concordantes après confrontation à la table Ciqual 2025 (non ingérée) ; contre-revues `wn-reviewer` et Codex consignées au dossier privé ; tous les claims déposés signés par le responsable dans l'atelier. Étiquetage en lot par délégation (D-325 §5), constaté par conteneur : 206 claims en deux gestes, 559 claims `VALIDE` portent désormais le besoin 2 ; un rejet motivé appliqué en base. Positions d'expert : 8, en v0.1, v0.2 puis v0.3 au dossier privé, v0.2 et v0.3 signées par l'assistant sur instruction écrite du responsable ; la v0.3 fait foi. Les quatre dossiers attendus par D-314 §10 (fer, vitamine D, zinc, magnésium érythrocytaire) sont clos : la structure des fiches d'usage (F05, BP-12a) peut s'écrire et se signer. Suite : cette structure, puis le dossier B9 et B12 (ordre du 2026-10-16).

| lot | objet | file | rang | préalables | migration | état |
|---|---|---|---|---|---|---|
| J3-12c | clés `besoins` et `rubrique` posées à la signature d'un claim ; étiquetage en lot (D-325) | A | 1 | aucun | oui (appliquée) | fait (#1521, #1525, #1554) |
| D-329 | cohérence du calcul de « Mon équilibre » | A | 1 | aucun | non | fait (#1566), déployé le 2026-10-19 |
| J3-12d | badges de niveau de preuve masqués sur les deux écrans praticien, table intacte, sans changement de version ; D-332 et fragment `changelog.d/2026-10-20-j3-12d-badges-preuve-masques.md` | A | 1 | aucun | non | fait (#1592, D-332), déployé le 2026-10-20 |
| J3-12e | ingestion des sources de mesure en accès libre (décision 6 du 2026-10-18) au registre et au corpus, sur approbation de chaque envoi par le responsable ; 15 notices `WN-SRC-0540` à `0554`, lots `LOT_030` à `LOT_035` (88 passages, 104 claims, 19 signés), 4 lignes `measurement_evidence.json` toutes `inconnu` ; restent deux articles fermés à fournir et une étude non ingérée ; compléments : `0560` à `0570` (#1610, #1611, #1615), plus rien à fournir au 2026-10-21 | A | 1 | J3-12d (ordre), fait | non | fait (#1605), déployé le 2026-10-20 |
| J3-12b | guide transcrit, onglet « Les 12 besoins » réorganisé | A | 1 | w | non | attente |
| J3-12f | changement de sources des besoins 8, 9 et 12 (décisions 1 à 4 du 2026-10-18), 60/20/20 redéfini, double compte des besoins 1 et 3 retiré, table des niveaux de preuve révisée, en un seul changement de version ; liste de réapprobation préparée dossier par dossier (fiches, lettre, annonce) ; D-xxx et fragment ; emporte les retouches regroupées des tables signées (règles aval par besoin, clés sur tables existantes — D-338 §2) | A | 2 | J3-12e, fait ; sources fermées fournies (fait, #1615) ; w signé ; table des niveaux de preuve signée | non | attente |
| J3-12g | complétude de l'agenda du sommeil au snapshot (résidu de D-329 §2) | A | sans rang | inventaire « rubrique de l'agenda → lecteurs du moteur » ; compte des diffusions actives | non | attente |
| J3-12h | garde sur le complément ciblé chez le mineur et chez la personne enceinte ou allaitante : courrier au médecin remis et tracé avant l'entrée au programme, sans attendre sa réponse (règle du responsable du 2026-10-17 ; destinataire : le professionnel qui suit la grossesse, à défaut le médecin traitant, P5 v0.3 du fer) ; cadrée par D-345 (`docs/claude/propositions/2026-10-22-j3-12h-garde-complement-cible/README.md`) : case « ciblé » sur l'action de complément, remise au patient dans le clic, accord de partage exigé, mineur refusé jusqu'à J3-mineurs | A | sans rang | P6 v0.4 du magnésium signée (pour sa seconde situation) | oui (trace de remise) | cadré ; lot 1 livré le 2026-10-23 (nature du complément au contrat V4, table des déclencheurs signée le 2026-10-23, garde pure, sans appelant) ; lot 2 (migration de la liste du courrier et de la trace de remise, `courriers_complement_remises_v1`) mergé (#1679) et appliqué en production le 2026-10-24, constaté par conteneur ; lot 3 (courrier, remise au clic, refus, case « ciblé ») livré sous `WN_COURRIER_COMPLEMENT` éteint (D-358 : texte validé, couverture par inclusion) ; reste le lot 4 (lecture du courrier au portail, accusé, annonce), puis un passage de bout en bout sur un dossier de test avant l’ouverture du drapeau |
| dossiers du besoin 2 | zinc, puis magnésium érythrocytaire, puis B9 et B12, puis iode et sélénium (ordre du 2026-10-16), au modèle de BP-07, hors dépôt ; étiquetage en lot à la clôture de chacun | B | 1 | aucun | non | zinc clos le 2026-10-21 (`LOT_021`, #1612) ; magnésium érythrocytaire clos le 2026-10-22 (`LOT_051`, #1632) ; B9 et B12 à ouvrir |
| fiches d'usage du besoin 2 | lots de contenu de la question du besoin 2, un par dossier clos (F05) | B | 4 au plus tôt [Hypothese] | structure de BP-12a signée, à la clôture des dossiers fer, vitamine D, zinc et magnésium (D-314 §10) | non | préalable levé le 2026-10-22 (quatre dossiers clos) : structure à écrire et signer |
| w | guide des 12 besoins, de la main du responsable | geste | 0 | dossiers de preuve | non | en cours |
| étiquetage du fer | 92 claims, besoins servis et rubrique | geste | 1 | aucun | non | fait le 2026-10-20 (84 claims après verdicts, 84 sur 84 constatés le 2026-10-21) |
| sources fermées | sources des dossiers de mesure à fournir par le responsable, deux d'abord (liste au dossier privé) | geste | 1 | aucun | non | fait (`WN-SRC-0567` à `0570`, #1615) |
| position d'expert du fer | amendement v0.3, en conflit avec la règle du 2026-10-17 (au dossier privé) | geste | 1 | aucun | non | fait : P5 v0.3 signée le 2026-10-21 |
| position d'expert du magnésium | amendement v0.4 de P6 : la seconde situation propre au magnésium passe d'un adressage à « courrier, puis complément » (D-345 §2, au dossier privé) | geste | 1 | aucun | non | fait : v0.4 signée pour le responsable le 2026-10-23 (préalable de J3-12h levé) |
| table des niveaux de preuve | signature d'une table révisée | geste | 2 | J3-12e, fait | non | attente |
| réapprobation | protocoles diffusés, dossier par dossier, juste après le déploiement de J3-12f | geste | 2 | J3-12f | non | attente |
| dossiers des autres besoins | 1, 4, 5, 9, puis 3, 8, 10, 12, puis 6, 7, 11 (ordre du 2026-10-15) ; définitions signées des besoins 6, 7 et 11, qui restent « non mesuré » d'ici là | geste | sans rang | besoin 2 achevé | non | attente |
| momentum | référence de la première mesure du dossier, troisième divergence de la section « Mesure » (limite nommée par D-113 §2) | geste | sans rang | lettre o (H30) | non | rattaché à la lettre o le 2026-10-21 (« une seule date de départ partout ») ; rien avant elle, la limite reste écrite au code |

File C : aucun lot. La phrase sans chiffre du portail est livrée par D-329 ; aucune activation patient ne dépend de ces lots.

#### F54 · Liaisons NABM signées
- **Identifiant, piste** : S-7, M-3, M-3b, M-3c, f, G-3 ; panels.
- **Rang** : S-7 au rang 0, M-3 et M-3b au 1, M-3c et f au 2, G-3 au 3.
- **Portes, préalables** : porte 10 ; 0 liaison signée à ce jour (`docs/archive/cadrages/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:53`). Ne retient ni BP-07 ni BP-09 ; retient BF-7 et BF-8. Effet sur la publication du module : non tranché, ne retient pas la chaîne.
- **Migration, release-db** : non pour le code qui passe la carte ; véhicule d'écriture des liaisons à préciser (`docs/archive/cadrages/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:188-189`).
- **Décisions, textes** : lettre f ; « BF-3 désigne la façade A ; les correspondances NABM prennent un autre nom, sous D-f ».
- **Critère de fin** : 8 liaisons signées en base, puis la liste étendue ; une liaison signée sort de « non évalué » pour elle seule [A verifier].
- **Mise à jour (2026-10-15, S-7 fait)** : les 8 analytes les plus partagés, comptés en panels actifs, par conteneur en lecture seule le 2026-10-14 vers 22:55 UTC (catalogue seul, aucune donnée de patient ; égal à la migration `20260817090000_catalogue_biologie_niveau_1_donnees`) : 15 panels actifs, 78 items, 35 analytes, 0 liaison analyte ↔ acte, 0 signée. Rang : `BIO_VITAMINE_D_25OH` et `BIO_FERRITINE` (8 panels), `BIO_ZINC_PLASMATIQUE` et `BIO_CRP_US` (6), `BIO_MAGNESIUM_ERYTHROCYTAIRE` (5), `BIO_CAR` et `BIO_AG_ERYTHROCYTAIRES` (4), `BIO_HOMOCYSTEINE` (3) ; le suivant est à 2, la coupure est nette. Aucun candidat d'acte n'est proposé : l'analyte ne porte ni code d'acte ni LOINC, et un rapprochement par libellé est exclu (arbitrage du 2026-10-05, `schema.prisma`, modèle `BiologyAnalyteNabm`). Pour M-3, le responsable lit lui-même la nomenclature importée (`biology_nabm_actes`, 987 actes V105) et signe chaque couple avec sa nature (`isole`, `groupe_et`, `groupe_ou`) ; plusieurs des 8 peuvent relever d'un acte de groupe. Deux trous, routés ici : (1) **aucun véhicule d'écriture** des liaisons n'existe (ni route, ni script, ni migration de données) ; M-3 en demande un, migration de données relue puis release-db (D-087) ou outil praticien, à décider avant la signature ; (2) la proposition ne passe pas la carte des remboursements au moteur (`web/src/lib/biology-library/propositionService.ts:222`) : une liaison signée ne sort de « non évalué » que dans le catalogue, pas dans la proposition, sans code à écrire (critère de fin ci-dessus).
- **Mise à jour (2026-10-15)** : véhicule de M-3 arrêté par le responsable : un écran praticien (recherche de l'acte par son code dans la nomenclature importée, nature, signature et date posées par le serveur, patron de la route de décision des claims) ; pas de migration (la table existe, l'application contourne la RLS) ; lot de code en file A, rang 1, avant la signature des 8 ; réutilisable pour la liste étendue. Écarté : migration de données (release-db à chaque lot, adresse du signataire au dépôt public).
- **Mise à jour (2026-10-15, lot de code de M-3 livré)** : écran dans la fiche d'analyte du rayon biologie (Bibliothèque), section « Correspondances à la nomenclature » : code de l'acte tapé (quatre chiffres), acte rendu par le serveur dans le millésime courant, nature choisie, signataire (e-mail de session) et date posés par le serveur, décision prise sur l'état vu (`etat_divergent` sinon) ; refus d'un acte absent ou inactif ; retrait confirmé qui rend la ligne à l'état de proposition, sans suppression ni journal (aucune table, migration exclue). Routes `nabm/acte` et `nabm/correspondances` sous `WN_CB_ENABLED` ; `web/src/lib/biology-library/correspondancesNabm.ts`. Reste à M-3 : la signature des 8, geste du responsable sur la production ; la porte 10 se constate ensuite par conteneur (lignes signées de `biology_analyte_nabm`). Le trou (2) ci-dessus reste à f. Réserves de la revue du lot (`wn-reviewer`, GO avec réserves) : **(R1) aucun journal** — un retrait ou une nouvelle signature efface le signataire précédent sans trace ; acceptable tant que la proposition ne lit pas les remboursements (`propositionService.ts:222`), mais brancher la carte des remboursements (f) suppose d'abord un journal en ajout seul, donc une migration ; (R2) course étroite entre la lecture du millésime et l'écriture, sans transaction, contre un import NABM concurrent ; (R3) la relecture du catalogue après signature (`RayonBiologiePanel.tsx`) n'a pas de banc.
- **Mise à jour (2026-10-15, signature des 8 et liste étendue)** : constat par conteneur en lecture seule (one-off-7864, vers 19:55 UTC) : 5 liaisons signées, toutes « acte isolé », signataire `@wellneuro.fr`, acte actif dans la V105 : `BIO_FERRITINE` 1213, `BIO_VITAMINE_D_25OH` 1139, `BIO_ZINC_PLASMATIQUE` 2003, `BIO_MAGNESIUM_ERYTHROCYTAIRE` 0584, `BIO_CRP_US` 1804. Aucun libellé de la V105 ne nomme les 3 autres (`BIO_CAR`, `BIO_AG_ERYTHROCYTAIRES`, `BIO_HOMOCYSTEINE`) : rien à signer, ils restent « non évalué » jusqu'à M-3c. **Arbitrages du responsable (2026-10-15)**, sur sa demande d'un rapprochement préparé automatiquement puis validé, qui amende celui du 2026-10-05 (« jamais inférés d'un libellé ») : l'assistant cherche les candidats dans les libellés de la nomenclature importée, vérifie chaque code présent et actif au millésime courant et recopie son libellé tel quel ; rien n'est signé sans le responsable. (1) Véhicule des propositions : une liste relue, versée au code par PR, que l'écran affiche pré-remplie (code, libellé, nature) pour une signature en un clic ; aucune ligne en base avant la signature, sans migration. Écarté : migration de données (release-db à chaque liste). (2) Analytes sans acte : constat signé « aucun acte dans la nomenclature », qui les fait passer à « hors nomenclature » ; modification du schéma et migration, groupées avec le journal R1. Écarté : les laisser « non évalué ». Candidats préparés le même jour, par conteneur (catalogue seul), pour les 77 autres analytes du catalogue (85 au total) : 52 avec un acte candidat, dont 8 à juger (technique, milieu ou contenu d'un acte de groupe absents du libellé ; l'import ne garde que le libellé) ; 17 sans acte ; 7 valeurs calculées (ratios, DFG, non-HDL) ; 1 regroupement (bilan hépatique). Parmi les 27 analytes restants des panels actifs, 12 sans acte. Deux lots en découlent. **M-3b** (file A, rang 1, sans migration) : la liste dans le code, relue au millésime courant au moment du lot, et l'affichage pré-rempli ; critère de fin : chaque analyte à candidat montre sa proposition dans sa fiche, la signature restant celle de M-3. **M-3c** (file A, rang 2, migration puis code consommateur, release-db une à la fois) : journal des signatures en ajout seul (R1) et constat signé « aucun acte », dérivé en `hors_nomenclature` par `remboursable.ts` ; avant f ; critère de fin : migration appliquée et constatée, puis un constat signé relu par conteneur. G-3 devient la signature de la liste étendue, après M-3b, et après M-3c pour les analytes sans acte.
- **Mise à jour (2026-10-15, lot de code de M-3b livré)** : relecture par conteneur en lecture seule (one-off-3651, vers 20:50 UTC, catalogue seul) : millésime V105 (987 actes), 85 analytes actifs, chaque code candidat présent et actif ; 5 liaisons signées, dont `BIO_ZINC_PLASMATIQUE` 2003 et `BIO_MAGNESIUM_ERYTHROCYTAIRE` 0584 désormais en « groupe au choix » (re-signées vers 19:58 UTC), les 3 autres en « acte isolé ». La liste entre au code, module pur `web/src/lib/biology-library/candidatsNabm.ts` (millésime de préparation V105) : 85 analytes, 28 à libellé explicite, 20 dans un acte de groupe, 9 à juger (les 8 de la liste étendue et `BIO_CRP_US`), 20 sans acte (les 17 et les 3 de S-7), 7 valeurs calculées, 1 regroupement ; chaque candidat porte code, nature proposée et motif. `lireCorrespondancesAnalyte` rend les candidats résolus au millésime courant : un acte absent ou inactif n'est pas proposé, un couple qui a déjà une ligne (signée ou proposition) non plus, ni un analyte inactif. La fiche d'analyte les affiche (acte lu par le serveur, motif, « À juger », nature présélectionnée et modifiable, bouton « Signer cette proposition », POST de M-3 inchangé) ; sans acte, calculé ou regroupement : une mention d'information, sans signature. Aucune migration, aucune ligne en base avant la signature. Critère de fin de M-3b atteint au merge ; G-3 (signature de la liste étendue) devient le geste du responsable, M-3c reste au rang 2.
- **Mise à jour (2026-10-16, M-3c, PR 1 : migration seule)** : **trois arbitrages du responsable** (2026-10-16, à ne pas reposer) : (1) le constat « aucun acte » ne vaut que pour le millésime constaté — au suivant, l'analyte repasse « non évalué » jusqu'à un nouveau constat ; (2) signature d'acte et constat s'excluent, chacun refusé tant que l'autre existe (retrait d'abord, deux gestes journalisés) ; (3) la base refuse tout changement de signature ou de constat sans ligne de journal dans la même transaction, même par script — conséquence acceptée : entre la release-db et le déploiement de la PR 2, signer et retirer depuis la fiche d'analyte échouent (ne pas jouer G-3 dans cette fenêtre). Choix sans question : aucune reprise des signatures antérieures au journal (un retrait recopie ce qu'il efface) ; constat en table neuve, pas en colonnes de l'analyte (panne du catalogue avant la release-db sinon). Migration `20261016100000_nabm_journal_constats_v1` : `biology_analyte_nabm_journal` (ajout seul, quatre actes à forme fixée, UPDATE/DELETE/TRUNCATE refusés, date, ordre et transaction posés par la base, acte d'une signature présent et actif au millésime courant), `biology_analyte_nabm_constats` (au plus un par analyte, millésime vu égal au courant, analyte actif, pas de modification), exclusion par verrou consultatif (espace 292, READ COMMITTED seul), signature non modifiable en place et datée par la base, `TRUNCATE` refusé dès qu'une ligne est signée, triggers de contrainte différés « pas sans journal » et concordance de la dernière ligne de journal avec l'état final ; RLS sans politique ; contrat `nabm_journal_constats_v1_negatif.sql` au CI (motif de chaque refus vérifié, 23 mutations le font échouer), banc à deux sessions `banc-nabm-exclusion-deux-sessions.test.mjs` (CI et T3), banc d'import NABM adapté. Revue `wn-reviewer` : GO avec réserves, P1 (troncature) et P2 corrigés dans la PR. **Routé à la PR 2** : la course avec un import NABM concurrent (R2 ci-dessus) — millésime et acte lus sans verrou face à `importNabm.ts`, dont le contrôle des signatures orphelines peut manquer une signature commise juste après lui (piste : verrou de partage sur `biology_catalog_versions_courantes` à l'écriture du journal). **Trois contraintes pour la PR 2** (contre-revue, N-3) : (a) un `updateMany` qui ne trouve aucune ligne (`etat_divergent`) doit annuler la transaction — un journal déjà écrit et validé sans le geste échoue au COMMIT par la concordance, en 500 ; (b) retrait puis nouvelle signature : les lignes de journal s'écrivent dans l'ordre des gestes ; (c) la date de signature vient de la base : la relire avant de la rendre à l'écran, sinon le `verifieLeVu` du retrait ne concorde jamais. Pendant la fenêtre entre la release-db et la PR 2, la route de M-3 rend un 500 « Erreur technique. », rien n'est écrit. Reste à M-3c : merge (après la release-db de #1490, une à la fois), release-db approuvée par le responsable, constat par conteneur, puis la PR 2 (écriture du journal à chaque signature et retrait, date de signature relue en retour d'écriture, bouton « Constater : aucun acte » pour les analytes `aucun_acte` de la liste, dérivation `hors_nomenclature` dans `remboursable.ts` ; `propositionService.ts` reste à f) ; critère de fin : un constat signé relu par conteneur.
- **Mise à jour (2026-10-16, M-3c, PR 1 appliquée puis PR 2 : code consommateur)** : PR 1 mergée (#1493, fcb66bb0) après la release-db de #1490 ; release-db approuvée par le responsable (run 38862348825, sentinelle `WN_RELEASE_DB_OK id=38862348825-1`) ; constat par conteneur en lecture seule (vers 06:54 UTC) : migration appliquée, `migrate status` à jour (113 migrations), les deux tables sous RLS sans politique, douze triggers armés dont les trois différés, 0 ligne de journal, 0 constat, 5 signatures intactes ; premier déploiement = fcb66bb0. **PR 2** : `correspondancesNabm.ts` écrit chaque signature et chaque retrait avec sa ligne de journal dans une transaction (le retrait recopie la signature effacée), relit la date posée par la base avant de la rendre (N-3 c), juge l'état vu avant la ligne de journal et annule la transaction si l'écriture ne touche aucune ligne (N-3 a) ; un geste par transaction, ses lignes dans l'ordre des gestes (N-3 b) ; `deciderConstat` pose et retire le constat (analyte « aucun acte » de la liste seulement, millésime vu = courant, exclusion avec la signature lue en raisons `signature_presente` et `constat_present`) ; route `api/praticien/biologie/nabm/constats` ; `remboursable.ts` dérive `hors_nomenclature` d'un constat du millésime courant, `non_evalue` sinon ; `catalogue.ts` passe constat et millésime ; la fiche d'analyte affiche « Constater : aucun acte dans la nomenclature (V105) », le constat et « Retirer le constat », ou « Constat périmé (V105) — à renouveler au millésime V106 ». **R2 fermée pour l'écrivain de l'application** : chaque geste prend un verrou de partage sur `biology_catalog_versions_courantes`, que l'import (`SHARE ROW EXCLUSIVE`) attend et fait attendre, puis le verrou consultatif de l'analyte ; attente bornée à 3 s (`lock_timeout`), au-delà refus `import_en_cours` sans écriture (l’attente du verrou de l’analyte, elle, se dit `etat_divergent` — revue CodeRabbit) ; READ COMMITTED explicite. Une écriture SQL hors de l'application ne prend pas ce verrou. Revue `wn-reviewer` : GO avec réserves, quatre P2 corrigés dans la PR (attente bornée, isolation explicite, prédicat « constat valable » écrit une fois dans `remboursable.ts`, portée de R2 précisée). **À signaler au cadrage de f** : un analyte constaté passera, dans le document patient, de « non évalué » au texte « non pris en charge » de `documentPatient.ts` — c'est un texte patient. **Arbitrage du responsable (2026-10-16, revue CodeRabbit de #1496, à ne pas reposer)** : le constat n'est permis que sur le millésime où la liste préparée a été relue (`MILLESIME_LISTE_NABM`, V105). L'API le refuse sinon (`liste_a_relire`) et la fiche retire le bouton en disant pourquoi (« Constat indisponible : la liste … a été préparée sur le millésime V105, la nomenclature courante est le millésime V106 ») ; après un import V106, plus aucun constat jusqu'à une PR qui relit la liste. Les candidats à signer de M-3b ne changent pas (relus acte par acte au millésime courant). Écartés : s'en remettre à l'attestation du praticien ; reporter la décision avant la V106. **À l'import d'une V106** : relire `candidatsNabm.ts` (candidats et « aucun acte ») et porter `MILLESIME_LISTE_NABM` au nouveau millésime, par PR. Bancs : Vitest (onze mutations rougissent) et banc de l’écrivain contre PostgreSQL `banc-nabm-gestes-prisma.test.ts` au CI et en T3 (contre-épreuve sans journal, dix cas, six mutations rougissent). `propositionService.ts` intouché (lettre f). Reste à M-3c : merge (après la release-db de #1488, une à la fois), déploiement constaté, puis le premier constat signé par le responsable, relu par conteneur (critère de fin) ; G-3 redevient jouable au déploiement.
- **Mise à jour (2026-10-16, M-3c clos, critère de fin atteint)** : PR 2 livrée par #1496 (code consommateur) et #1499 (constat refusé hors du millésime de la liste relue), déployée. Le responsable a posé le constat « aucun acte dans la nomenclature » de `BIO_HOMOCYSTEINE` sur la V105 ; relu par conteneur en lecture seule le 2026-10-16 au soir, avec sa ligne de journal concordante (ordre 2 : le n° 1 a été consommé par une tentative annulée, la séquence ne revient pas en arrière). `BIO_CAR` et `BIO_AG_ERYTHROCYTAIRES` restent à constater (geste du responsable) ; G-3 est jouable. Porte 10 : 6 sur 8.
- **Mise à jour (2026-10-17, lettre f livrée, D-316)** : la proposition de bilan (`propositionService.ts`) passe au moteur la carte des remboursements, dérivée par `deriverRemboursement` comme la fiche d'analyte (correspondances signées vers un acte actif du millésime courant, constats « aucun acte » du millésime courant) ; le trou (2) de la mise à jour du 2026-10-15 est fermé et le critère « une liaison signée sort de non évalué pour elle seule » atteint. **Quatre arbitrages du responsable (2026-10-17, à ne pas reposer)** : (1) document patient, hors nomenclature : « Non remboursé par l'assurance maladie : … », « (resterait à votre charge) » retiré ; (2) document patient, autres états : « Remboursement par l'assurance maladie non vérifié à ce jour : … » et « Remboursé seulement s'il est demandé avec d'autres examens : … », rien pour une analyse remboursable ; (3) courrier : D-309 §2-§3 avancés (« Remboursement non évalué », « Hors nomenclature » seul), §1 et §4 restent au rang 4 ; (4) cockpit : état par analyse aux libellés de la fiche d'analyte (feuille pure `libellesRemboursement.ts`), limite « non évalué » nommant les analyses restantes des lignes proposées, absente sinon. Forme fixée sans question par une mesure (D-316 §5) : les mentions se disent une fois par document, des analyses distinctes — ligne à ligne, le banc du courrier montait à 8 759 caractères, au-delà de la borne de consignation (8 000) ; au catalogue réel (relu par conteneur le 2026-10-17, catalogue seul : 15 panels actifs, 78 éléments, 35 analyses distinctes), les 13 panels proposables tous proposés et tout non évalué : 7 348 au courrier, 7 691 au document patient. Bancs : Vitest sur les quatre états, la limite, la carte (signée, constat courant, constat périmé, acte inactif, proposition non signée, sans nomenclature) ; contre-épreuve, onze mutations rougissent. Sans migration. Revue `wn-reviewer` : GO avec réserves ; P1 tranché par le responsable (2026-10-17, à ne pas reposer) : une correspondance signée orpheline (acte absent ou inactif au millésime courant, ou nomenclature non importée) reste « hors nomenclature », donc « Non remboursé » au patient, cas écrit dans D-316 §1 sans changer la règle — inatteignable aujourd'hui ; **à l'import d'une V106**, avec la relecture de `candidatsNabm.ts`, décider s'il s'aligne sur le constat périmé (« non évalué »). P2 corrigés (fixture de la route, limite dédoublonnée par code) ; marge de 4 % au document patient et millésime NABM absent de l'ancre du texte consigné : limites connues (D-316 §5), la seconde routée au rang 4 (J3-base). Reste à F54 : constats de `BIO_CAR` et `BIO_AG_ERYTHROCYTAIRES`, puis G-3 (liste étendue).
- **Mise à jour (2026-10-17, D-320)** : retour du responsable sur l'écran de signature (le code d'acte ne se trouve pas sans connaître la nomenclature). L'encart « Ajouter une correspondance » cherche désormais les actes du millésime courant par leur libellé (tous les mots, accents ignorés, ou début du code ; 25 au plus, actifs d'abord) ; le praticien choisit, relit l'acte par son code et signe par le même geste — rien n'est rapproché sans lui (l'arbitrage du 2026-10-05 vise ce que l'assistant prépare). Aucune signature, aucun constat, aucune migration. Les analyses groupées, que la signature révèle mal représentées, sont cadrées en F80. G-3 (liste étendue) peut s'appuyer sur cette recherche.
- **Constat (2026-10-17, les 8 de la porte 10)** : lecture par conteneur en lecture seule (one-off-9118, catalogue seul, millésime courant V105). Quatre constats « aucun acte » signés au millésime V105 : `BIO_HOMOCYSTEINE` (2026-10-16), puis `BIO_CAR`, `BIO_INDEX_OMEGA3` et `BIO_AG_ERYTHROCYTAIRES` (2026-10-17, entre 10 h 43 et 10 h 45 UTC), chacun avec sa ligne de journal concordante (ordres 2, 4, 6, 8, aucune effacée) et aucune signature concurrente ; 5 liaisons signées, inchangées. **Les 8 analytes de la porte 10 sont couverts** (5 signées, 3 constats) ; `BIO_INDEX_OMEGA3` est hors des 8 et entame G-3. La porte 10 reste fermée sur G-3 (liste étendue), qui conditionne la part code de F55 (BF-7, BF-8). Ces constats passent dans la proposition sans autre geste : la lettre f les lit (D-316).

#### F77 · Lettre k : « L'IA dans Wellneuro » v7 dans les CGU
- **Identifiant, piste** : lettre k ; trust.
- **Rang** : 0.
- **Portes, préalables** : arbitrages CGU du 2026-10-10, acquis.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre k, de la main du responsable. Fait : la v7 a été validée le 2026-10-11 sans nouvel accusé demandé ; k dit si la CGU change cela.
- **Critère de fin** : k mergée ; un accusé demandé se constate en agrégats dans S-1 (F40).
- **Mise à jour (2026-10-14)** : [A verifier] le titre de la fiche dit v7 ; `usage_ia` v8 est publiée par #1431 (une phrase change, accusé recueilli au dépôt). Quelle version k vise est au responsable.
- **Mise à jour (2026-10-14)** : k écrite par D-292, texte validé tel quel par le responsable : `docs/claude/propositions/2026-10-14-k-conditions-utilisation/README.md`. Les quatre textes d'information deviennent les « Conditions d'utilisation de votre espace Wellneuro », accusées à chaque version ; le texte de l'IA est donc accusé dès ACT-1 (H70), qui seul les sert. D-269 §6 amendée : le filet au dépôt exige l'accusé des conditions. Durées de D-283 §2 renvoyées à une version suivante. Version visée (question ci-dessus) : chaque texte entre dans sa version en vigueur au jour de l'activation (D-292 §5), soit `usage_ia` v8 au 2026-10-14.

#### H16 · h et J1-alim : la Boussole retirée
- **Identifiant, piste** : lettre h (M-4, G-5, D-h, R:h), puis J1-alim (FC-4) ; Boussole alimentaire retirée du portail ; exception nommée à D-276 §1 ; amende D-250 ; dettes D-C5-01 à D-C5-04 rattachées ; alimentation ; geste du responsable (h), puis file A (J1-alim).
- **Rang** : h au rang 0 ; J1-alim au rang 1, 4 au plus tôt si une migration se confirme.
- **Portes, préalables** : h : constat Alimentation (FC-0 joué) ; J1-alim : h ; si migration : G-7, porte 9.
- **Migration, release-db** : selon ; migration non écrite.
- **Décisions, textes** : lettre h, de la main du responsable.
- **Critère de fin** : page retirée, constatée ; D-C5-01 à 04 soldées à la livraison (`DETTE_C5.md:10-13`).

#### F33 · av : contenu biologique du document remis au médecin
- **Identifiant, piste** : lettre av ; contenu, voie de remise, régime documentaire ; complète q et ae ; trackc.
- **Rang** : 0, file A.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : texte de la main du responsable. Par défaut, le courrier existant seul : proposition d'explorations non prescriptive, gabarit sans IA, remise manuelle, aucun résultat. Deux questions à trancher dans le texte d'av avant ax. Gabarit imprimable commun avec bh (rendu imprimable du protocole) : non tranché.
- **Critère de fin** : texte signé et mergé.
- **Mise à jour (2026-10-13)** : les questions écartées ne se reposent pas : leur objet se tranche dans le texte de la lettre av, de la main du responsable [Hypothese] ; le défaut d'av est le courrier existant seul ; le gabarit imprimable commun avec bh se tranche dans le texte d'av, à défaut chacun garde le sien [Hypothese].
- **Mise à jour (2026-10-15)** : av écrite par D-311 : courrier existant seul ; bilan composé non ouvert (lot ax) ; bh garde son gabarit ; mentions de remboursement selon D-309.

#### F44 · Trace d'import conservée comme le dossier
- **Identifiant, piste** : lettre l ; ingest.
- **Rang** : texte au rang 0 ; code et textes au rang 1 proposé [Hypothese].
- **Portes, préalables** : porte 17 (durée du dossier fixée, geste) ; lettre l mergée (D-l au rang 0, une part de la porte 13). La porte 13 entière (D-u, G-8) n'est pas requise.
- **Migration, release-db** : non a priori [Hypothese].
- **Décisions, textes** : lettre l, une seule durée, celle du dossier ; deux circuits distincts : le compte rendu transmis reste sous D-258, la collecte documentaire suit la durée du dossier, sans IA ; rubrique 8 du registre ; « Vos données personnelles » mis à jour ; elle absorbe la D-xxx de la collecte documentaire.
- **Critère de fin** : rubrique 8 sans trou pour ces tables ; texte servi et constaté.
- **Mise à jour (2026-10-13)** : D-283 §2 tranche la trace d'import : les lignes validées suivent le dossier ; les lignes écartées ou jamais décidées s'effacent 30 jours après le dépôt, comme le document ; les travaux de la file durable, à 30 jours. Porte 17 levée par D-283 ; le point de départ de l'archive reste à valider par un conseil. Le texte de rang 0 devient le texte patient des durées (D-283 §10 a) ; le code devient la purge à 30 jours des lignes non validées (D-283 §10 c). Voir H26.
- **Mise à jour (2026-10-17, code livré)** : D-318, sur quatre arbitrages du responsable (questions à options) : à J+30, lignes écartées ou jamais décidées effacées, puis chaque extraction restée sans ligne validée avec ses travaux terminés ; d'un compte rendu sans ligne validée ne reste que la trace du dépôt (date, empreinte, doublon reconnu) ; la lecture consignée d'un compte rendu mixte reste ; l'écart emporte les lignes aussitôt ; une extraction ou un travail de la file ouvert diffère tout au passage horaire suivant. D-258 amendée (« décidables sans le document » caduque). Sans migration ; banc sur base réelle en CI (`scripts/banc-purge-echeance.test.ts`). Production lue par conteneur le 2026-10-17 : 10 comptes rendus, aucun de 30 jours, première échéance le 2026-11-02. Reste : « Vos données personnelles » v12 dit encore « valeurs relevées et décisions » conservées — à corriger dans le texte des durées (D-283 §10 a), signé par le responsable ; constat de la première purge après le 2026-11-02.
- **Mise à jour (2026-10-24, texte patient corrigé)** : la phrase est corrigée en « Vos données personnelles » v20, sur texte validé par le responsable le même jour : date du dépôt et empreinte ; pour chaque valeur validée, la trace de sa lecture (outil, décision) ; valeurs écartées ou sans décision effacées au plus tard à 30 jours, aussitôt à l'écart. Accusé exigé. Les conditions d'utilisation passent en v3 (D-292 §5, partie 3 = v20), avec l'e-mail `conditions_utilisation@3`, né validé ; son envoi aux patients suivis reste un geste du responsable. Reste : constat de la première purge après le 2026-11-02.
- **Mise à jour (2026-10-21, file D)** : le geste de la lettre l est clos sur D-283 §2 (arbitrage du responsable) : la part validée de la trace d'import suit le dossier, le reste est purgé à 30 jours (D-318, en service). Restent à cette fiche le code et les textes déjà nommés ci-dessus, suivis avec BioFlow.

#### F76 · « Reprendre cette charge » sur un brouillon gonflé
- **Identifiant, piste** : reste de BP-25 (D-273 ; `docs/claude/SESSION_LOG.md:9677-9678`) ; parcours.
- **Rang** : comportement voulu écrit par le responsable au rang 0 proposé [Hypothese], geste ; correctif au rang 1 proposé [Hypothese], file B.
- **Portes, préalables** : le texte du responsable du comportement voulu, dans la fiche du correctif (porte 28).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx si le correctif ne change pas D-273 ; sinon une D-xxx et son fragment. D-273 « quatre termes » inchangée (F14).
- **Critère de fin** : banc « actions vierges supprimées » vert selon le texte du responsable ; aucune version enregistrée touchée.
- **Mise à jour (2026-10-21, comportement voulu)** : tranché par le responsable : le barème de charge ignore les actions vides. Le correctif passe en file A, avec sa D-xxx et son fragment ; critère de fin inchangé.
- **Mise à jour (2026-10-21, code livré)** : D-339 (amende D-273 §5) : une action où rien n'est saisi n'entre dans aucun terme de `mesurerProtocole` ; une action sans type mais saisie compte toujours. Banc « actions vierges supprimées » vert (`ProtocolMiniBuilder.test.tsx`) ; aucune ligne de barème ni signature touchée, aucune version enregistrée touchée (une action du contrat porte un type). Fiche soldée.

#### F25 · Effectif de masquage des agrégats
- **Identifiant, piste** : constante de D-266 §14 ; parcours.
- **Rang** : D-xxx propre au rang 0 proposé [Hypothese], sans attendre la doctrine de d (rang 1) ; y au rang 3.
- **Portes, préalables** : aucun ; due avant tout constat sur plusieurs dossiers et avant BP-21a.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de l'effectif, reprise du texte de d et y ; l'écart « cinq cycles » contre « cinq dossiers » se règle dans ce texte.
- **Critère de fin** : D-xxx mergée ; comptes masqués sous cinq en banc.
- **Mise à jour (2026-10-14)** : D-298 rédigée et acceptée : cinq dossiers distincts, jamais cinq cycles (séance du 2026-10-12, réponse 3) ; l'effectif reste affiché, répartitions et statistiques masquées en dessous ; écrans praticien et constats écrits dans le dépôt. Le repère de cabinet servi compte encore des cycles : lot de code au §8, file A, avant y (H58). Le banc « sous cinq » vient avec ce lot et avec y.
- **Mise à jour (2026-10-18, t24)** : le repère de cabinet compte désormais les dossiers distincts (D-298 §5) : masqué sous cinq cycles comparables ou sous cinq dossiers, médiane par jalon masquée quand ses valeurs viennent de moins de cinq dossiers, l'écran dit les deux effectifs et pourquoi un jalon manque. Banc « sous cinq » : un patient à cinq cycles, quatre dossiers à cinq cycles, un jalon à trois dossiers. Sans migration.

#### F47 · DPA Anthropic : copie datée
- **Identifiant, piste** : DPA et clauses types intégrés aux Conditions commerciales, sans signature distincte ; ingest et trust.
- **Rang** : 0 proposé [Hypothese], geste.
- **Portes, préalables** : aucun ; échéance du 2027-06-30 (`docs/DECISIONS.md:1710-1713`).
- **Migration, release-db** : non.
- **Décisions, textes** : archiver une copie datée ; relancer sur la date d'opposabilité et les traitements antérieurs (`docs/rgpd/DEMANDE_DPA_ANTHROPIC.md:121-127`) ; réécrire le trou 1 du §6 de `docs/DOSSIER_RGPD.md` et la ligne 14 de sa rubrique 6. Ne jamais écrire « signé ».
- **Critère de fin** : copie au registre ; réserve sur la localisation de l'inférence et la rétention instruite ou maintenue par écrit.
- **Mise à jour (2026-10-13)** : D-284 §5 et §6 : clauses contractuelles types ; la copie datée s'accompagne d'une analyse d'impact du transfert, à rédiger (lot (j), H26).
- **Mise à jour (2026-10-14)** : le code du lot (j) est mergé (#1426, #1428, #1431) ; l'analyse d'impact du transfert n'est pas versée : elle reste de la main du responsable, archivée avec la copie datée.

#### F49 · Décision de rationalisation des packs biologiques
- **Identifiant, piste** : PR 1 de l'audit ; panels.
- **Rang** : 0 proposé [Hypothese], file A.
- **Portes, préalables** : aucun ; d'ici là, aucun nouveau pack clinique (`docs/architecture/bioflow/BIOFLOW_ROADMAP.md:65-68`).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre cj, de la main du responsable ; aucune D-xxx n'existe.
- **Critère de fin** : décision mergée ; gel levé ou maintenu par écrit.
- **Mise à jour (2026-10-14)** : D-296 rédigée : analyte unité canonique, quinze panels classés (neuf axes cliniques, un gabarit optionnel, trois indications ou populations, deux motifs « non indiqué »), gel rendu permanent ; aucune conversion avant F53. Ouvre F50 et F51.

#### F60 · Série par analyte : commentaires du laboratoire, deux unités
- **Identifiant, piste** : commentaires du laboratoire aussi sous la série ; socle.
- **Rang** : 4 avec BP-03 (F15) pour les commentaires ; 5 proposé [Hypothese] pour les deux unités ; lecture des écarts d'unité avec le responsable, geste au rang 0 proposé [Hypothese].
- **Portes, préalables** : BP-03 ; D-157.
- **Migration, release-db** : non.
- **Décisions, textes** : dans s ; les écarts d'unité textuels du constat d'usage se lisent avec le responsable hors agrégats, avant le code de la série (rang 4).
- **Critère de fin** : commentaire sous la valeur concernée ; aucun calcul.
- **Mise à jour (2026-10-17)** : la part « commentaires » est livrée par BP-03 (#1466, fiche LOT-03, arbitrage 4 : commentaire de la ligne lue sous sa valeur, recopié tel qu'imprimé, « non transcrit » sinon). Reste la part « deux unités » (rang 5) ; la lecture des écarts avec le responsable est faite (2026-10-14) : les 14 écarts sont tous des graphies (LOT-03, arbitrage 1).
- **Clôture (2026-10-17)** : F60 se ferme (arbitrage du responsable du 2026-10-17) : la part « commentaires » est livrée par BP-03 ; la part « deux unités » n'est pas codée, les 14 écarts lus le 2026-10-14 étant tous des graphies. Un écart d'unité réel constaté plus tard la rouvre.

#### F67 · Amendement de D-276 : cinq déclencheurs
- **Identifiant, piste** : lettre ci : les cinq déclencheurs de la qualification (amendement de D-276 §2) ; trust.
- **Rang** : 0 proposé [Hypothese], file A.
- **Portes, préalables** : aucun ; avant les lettres b (second compte) et x (API).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ci, de la main du responsable ; ligne alignée au registre des frontières §1 ; signaler le même flou dans D-265 sans l'amender ; chaque décision neuve de l'étage assistant porte sa ligne « qualification différée ; usage du praticien ».
- **Critère de fin** : D-xxx mergée.
- **Mise à jour (2026-10-13)** : ci précède b, x et les levées de F75 ; elle part dans sa PR propre, au rang 0, avant le merge de la PR S-3, qui n'est pas élargie ; geste du responsable, elle compte au rang 0. Un test d'intrusion humain précède toute offre commerciale et tout second compte (D-283 §7).
- **Mise à jour (2026-10-14)** : lettre ci écrite : D-286 (#1425), acceptée par le responsable, mergée avant la PR S-3 (#1430). Cinq événements déclencheurs (§2) : offre commerciale ; second compte praticien ; première clé d'API ; premier consommateur de BioFlow hors du cabinet, ou tiers qui en lit la sortie ; tout envoi direct vers un tiers. Elle amende D-276 §2, non §1 comme l'écrit la ligne « Identifiant » ; `REGISTRE_FRONTIERES.md` §1 aligné ; le même flou de D-265 §3 est signalé, non amendé, et se tranche à F68 (§5). Rien n'est levé ni ouvert.

#### F68 · Réexamen de l'AIPD
- **Identifiant, piste** : « non requise à ce stade » (D-265 §3), réexamen « à l'achèvement du produit », sans date ni critère renseigné (`docs/DOSSIER_RGPD.md:1217-1252`) ; trust.
- **Rang** : 0 proposé [Hypothese].
- **Portes, préalables** : aucun ; au plus tard avant l'étage assistant (F27) et tout second compte.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre co : verser le fait de D-278 §3 (commentaires du laboratoire, texte libre conservé après la purge) ; nommer le déclencheur du réexamen. La conclusion revient au responsable.
- **Critère de fin** : note de la rubrique 13 à jour ; conclusion datée.
- **Mise à jour (2026-10-13)** : D-283 §9 laisse les critères de l'AIPD à cocher par le responsable, échéance 2027-06-30 ; co garde le déclencheur du réexamen et le fait de D-278 §3.
- **Mise à jour (2026-10-15)** : co écrite par D-313 : faits postérieurs à D-265 versés en rubrique 13 ; déclencheur = cinq événements de D-286 §2, étage assistant, nouveau destinataire ou nouvelle catégorie de données, au plus tard 2027-06-30 ; conclusion « non requise » maintenue par le responsable (écart à la recommandation « avis du conseil d'abord ») ; reste : les neuf critères cochés avec leur motif, de sa main.

#### F69 · Revue des trous RGPD avant le 2027-06-30
- **Identifiant, piste** : D-265 §4 donne à chaque trou ouvert l'échéance unique du 2027-06-30, sans lot qui la porte (`docs/DECISIONS.md:1710-1713`) ; trust.
- **Rang** : 0 proposé [Hypothese] pour le texte ; la revue se joue avant l'échéance.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre cp, texte de registre ; réaligner les dates périmées du 2026-10-21 (`docs/DOSSIER_RGPD.md:19-20`, :34, :40, :939-940 ; `docs/claude/campagnes/2026-09-30-bio-ingest/lots/LOT-12-cloture.md:35-36`) ; ranger chaque trou sous son lot.
- **Critère de fin** : tableau §14 sans échéance périmée ; chaque trou rattaché.
- **Mise à jour (2026-10-13)** : cp est écrite pour l'essentiel par D-283 (#1411) ; restent les trous de son §9 (conseil et gestes du responsable), échéance 2027-06-30. Le tableau §14 de `docs/DOSSIER_RGPD.md` est réaligné ; les lignes encore périmées se corrigent par ligne datée (§9, PR 6).

#### H17 · ca : cadrage de la refonte de l'agenda du sommeil
- **Identifiant, piste** : lettre ca ; liste des écartés ; sommeil ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de cadrage, de la main du responsable, fragment `changelog.d/`.
- **Critère de fin** : texte mergé.
- **Mise à jour (2026-10-15)** : ca écrite par D-300 (texte accepté tel quel) : présentation seule ; heures, classes, 21 nuits, compte exact, « je ne sais pas » gardés ; huit éléments de la planche écartés. Suite : cb, puis cc après la seconde lecture de la re-mesure.

#### H18 · bg : flux de l'export vers l'assistant externe du responsable
- **Identifiant, piste** : lettre bg ; confiance ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun ; se joint à la porte 5 (K-05a et D4, F46).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre bg, de la main du responsable.
- **Critère de fin** : flux listé, puis déclaré ou arrêté, consigné.

#### H19 · bf : indicateurs hebdomadaires
- **Identifiant, piste** : lettre bf.
- **Rang** : instruction au rang 0 ; code au rang 3 au plus tôt, la porte 15 se levant au plus tôt au rang 2 (règle) ; 4 si migration [Hypothese] ; ouverture en file C au-delà de la place 11, dans l'ordre de préparation après l'encart.
- **Portes, préalables** : instruction (rang 0) : aucune ; code (rang 3 au plus tôt) : une D-xxx par indicateur, porte 6, porte 11 pour tout mot, porte 15 (lecture proposée, à confirmer) ; ouverture (file C) : texte patient, porte 18. Moment tranché : au point d'étape, par une nouvelle version de son contrat, trois fois par cycle, sans chiffre en retour ; aucune saisie à part ; charge du 21e jour à constater.
- **Migration, release-db** : selon (4 si le contrat du point d'étape se versionne) [A verifier].
- **Décisions, textes** : une D-xxx clinique et son fragment par indicateur, de la main du responsable ; aucune échelle proposée par l'assistant ; nouvelle version du contrat du point d'étape [A verifier : migration].
- **Critère de fin** : instruction : décisions signées ; code : réponses constatées en agrégats ; ouverture constatée.
- **Mise à jour (2026-10-14)** : lecture « porte 15 » du code de bf confirmée par le responsable : porte 15 pour le code, instruction au rang 0 (handoff de la PR 2, #1419). Les [A verifier] sur la migration du contrat du point d'étape restent.

#### H20 · Gestes RGPD consignés au registre
- **Identifiant, piste** : archivage de l'annexe d'hébergement signée et de l'accord de sous-traitance de l'hébergeur ; confiance ; geste du responsable.
- **Rang** : 0 [Hypothese] (aucun préalable).
- **Portes, préalables** : aucun ; la copie datée de l'accord d'Anthropic est F47.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune ; lignes datées au registre RGPD (rubriques 6, 11, 12 de `docs/DOSSIER_RGPD.md`). D-284 §5 : Google Workspace et Sentry relèvent du cadre UE-États-Unis s'il couvre l'entité et le flux, preuve datée à archiver avec l'accord ; sinon clauses types et analyse d'impact.
- **Critère de fin** : copies archivées hors dépôt, lignes datées au registre ; confirmation reçue, ou relance datée ; geste v8 consigné en rubrique 11.

#### H38 · G-11 : textes patient de la collecte et des mineurs
- **Identifiant, piste** : G-11 ; confiance ; geste du responsable.
- **Rang** : 0 par le fait [Hypothese] (rang 1 proposé auparavant, après l ; l est écrite par D-283, #1411).
- **Portes, préalables** : l, écrite par D-283 (§2, §5).
- **Migration, release-db** : non.
- **Décisions, textes** : deux textes, de la main du responsable.
- **Critère de fin** : textes acceptés ; ACT-4 et ACT-5 les consomment.
- **Mise à jour (2026-10-14)** : textes acceptés. Premier jet de l'assistant, six arbitrages du responsable sur questions à options, puis validation telle quelle le 2026-10-14 : `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`. Non publiés : le texte de collecte part avec J3-collecte (H62) et ACT-4 (H77), les textes des mineurs avec J3-mineurs (H79) et ACT-5 (H78). Restent ouverts : les 15–17 ans (avocat, D-284), la version de « Vos données personnelles » à l'ouverture de la collecte (lettre l), le circuit des droits des mineurs (D-283 §5).
- **Mise à jour (2026-10-14, #1443)** : une correction de forme du texte de dépôt, après revue de #1441, validée par le responsable le même jour ; rien d'autre ne change, les textes restent non publiés.

### Rang 1

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| J2-radar | un trou nommé au lieu de 0 au radar | A | 3 | non | H12, rang 0 |
| J1-alim | Boussole retirée du portail | A | 9 si migration | selon | H16, rang 0 |
| J3-12b | guide transcrit, onglet réorganisé | A | aucune | non | H15, rang 0 |
| J3-12c | clés `besoins` + `rubrique` posées à la signature d'un claim (route de décision, atelier, liste fermée ; décrit sans migration, puis une migration de journal ajoutée par D-321 : `20261017100000_rag_claim_decisions_etiquetage_v1`, appliquée) ; précède le deuxième dossier de preuve ; ré-étiquetage des 92 claims du fer ensuite (geste) ; fait, étiquetage du fer fait le 2026-10-20 | A | aucune | oui (appliquée) | H15, rang 0 |
| J3-12d | badges de niveau de preuve masqués au cockpit, table intacte (premier des lots de mesure, 2026-10-19) | A | aucune | non | H15, rang 1 |
| J3-12e | ingestion des sources de mesure en accès libre, sur approbation de chaque envoi ; fait (#1605) | A | aucune | non | H15, rang 1 |
| aq | contrôle bloquant des modifications cliniques en CI | A | 28 | non | H21 |
| ar | montée de version datée des briques | A | 28 | non | H22 |
| E56 | contrôle de clôture contre l'auto-merge | A | 27 | non | H23 |
| af | référence de fiche conseil sur l'action | A | 28 | non | H24 |
| ag | rédaction assistée des zones du protocole | A | 5, 28 | non | H25 |
| D-281, étape 3 | portail et pause, hors file C | A | 9 (fait) | non | F66 |
| D-284 (g) écran, (h), (i) | NIR retiré de la fiche patient ; date de naissance demandée à la connexion, questionnaires et biologie en pause tant qu'elle manque ; validation par un titulaire de l'autorité parentale, désaccord connu = manuel (2026-10-14 : (g) écran livré, #1434 ; (h) livré, #1437 ; (i) fondu dans J3-mineurs, H79, #1439) | A | aucune ; (i) avec G-11 (H38) | non | H26 |
| BP-07 | dossier de preuve remis à la curation signée (clos le 2026-10-14, #1438) | B | 2, 27 | non | F02 |
| dossiers du besoin 2 | zinc, magnésium érythrocytaire, B9 et B12, iode et sélénium, dans cet ordre, au modèle de BP-07 | B | aucune | non | H15, rang 1 |
| PR 2 de l'audit | vue dédoublonnée par analyte | B | aucune | non | F50 |
| J2-med | aperçu médecin tracé au Fil | B | 27 ; 9 si migration | selon | F38, rang 0 |
| J3-bioflow | premier lecteur hors biologie du module | B | 12 | non | F63, rang 0 |
| correctif de la charge | « Reprendre cette charge » ne fige plus ; le barème ignore les actions vides (tranché le 2026-10-21, D-xxx et fragment avec le lot ; **soldé le 2026-10-21 par D-339**) | A (B jusqu'au 2026-10-21) | 28 | non | F76, rang 0 |
| trace d'import, code | empreinte, lectures, décisions ; purge à 30 jours (D-283 §10 c) | B | 17, 13 | non | F44, rang 0 |
| D-284 (j) | identité retirée du document avant l'envoi à Anthropic ; analyse d'impact du transfert (code mergé : #1426, #1428, #1431 ; analyse d'impact non versée, F47) | B | aucune ; G3 clos (#1416) | oui (#1426), release-db consignée (porte 9, 2026-10-15) | H26 |
| G-7 | essai de restauration réussi | geste | lève 8 | non | F04, rang 0 |
| v | bandes de bruit par instrument | geste | 11 | non | H13, rang 0 |
| M-3 | signature des 8 liaisons NABM (écran praticien livré le 2026-10-15 ; 5 signées le 2026-10-15, les 3 sans acte attendent M-3c ; F54) | geste | 10 | non | F54, rang 0 |
| M-3b | liste des candidats NABM affichée pré-remplie dans la fiche d'analyte (lot de code livré le 2026-10-15, F54) | A | 10 | non | F54, rang 1 |
| M-3c | journal des signatures NABM (R1) et constat signé « aucun acte » (PR 1 #1493 mergée et appliquée le 2026-10-16, constatée par conteneur ; PR 2, code consommateur, livrée par #1496 et #1499 le 2026-10-16 ; critère de fin atteint le 2026-10-16 : constat de l'homocystéine relu par conteneur) | A | 10, 9 | oui | F54, rang 2 |
| c | cockpit chiffré : provenance, formule, nature | geste | 4 | non | F59 |
| aw | familles du bilan hiérarchisé | geste | aucune | non | F34 |
| az, texte | notice patient du bilan | geste | aucune | non | F37 |
| at | date de naissance lue par l'extraction ; remplacée le 2026-10-22 par la date du dossier affichée au masquage (D-342 §3) | geste | 5 | non | F45, rang 0 |
| cm | axes biologiques, liste fermée | geste | aucune | non | F51 |
| D-283 (a), (e), (f) | texte des durées ; phrase au médecin ; procédure des droits ((f) faite le 2026-10-14, G-8) | geste | aucune | non | H26 |
| LOT-02 du sommeil | re-mesure ; sa clôture lève la porte 16 | geste | lève 16 | non | H27 |
| r | droits d'usage des instruments servis ; fait le 2026-10-21 (D-341 §2 : registre existant reconnu) | geste | 1 | non | H28 |
| x | posture d'API, aucune clé | geste | 28 | non | H29 |
| o | Momentum à remesure libre, ancre unique | geste | 1 | non | H30 |
| t | point d'étape, rappel nommé, invitation lue | geste | 1 | non | H31 |
| d | doctrine d'adhésion ordinale | geste | aucune ; préalable de la porte 6 (M-2, rang 2) | non | H32 |
| am | table de quantités signée ligne à ligne | geste | 4 | non | H33 |
| ad, bc | un cycle, pas un programme ; ajouts datés | geste | aucune | non | H34 |
| ba | mention « validé par votre praticien » | geste | aucune | non | H35 |
| R:Drive | extraction du Drive de formation | geste | 5 | non | H36 |
| u | Patient Hub : collecte et « Mes échanges » ; fait, D-293 du 2026-10-14 | geste | 13 | non | H37 |
| cb | textes de l'écran de fin du sommeil | geste | 18 | non | H39 |
| E31 | seuils_points de Q_ALI_01, décision sourcée | geste | 4 | non | H40 |
| E32 | règles orphelines : trois restes réécrits | geste | aucune | non | H41 |
| E64 | table d'arrêt étendue aux grilles citées | geste | aucune | non | H42 |
| sources de mesure | sources fermées des dossiers de mesure fournies par le responsable ; fait (#1615) | geste | aucune | non | H15, rang 1 |
| vue par besoin | lot D/22 étendu : filtre de l'atelier par clés `besoins` et `rubrique` (D-338 §6) | B | aucune | non | H84, rang 1 |
| contrat du lien | module pur : types, liste fermée des leviers, vocabulaire ; aucune table signée touchée (D-338 §1) ; fait le 2026-10-22 (t38) | A | aucune | non | H84, rang 1 |
| priorité libre à besoins visés | amendement de D-279 §1 : champ facultatif lu par la re-passation ciblée seule (D-338 §3) | A | 9 | oui | H84, rang 1 |
| constat praticien | patron unique d'acte daté, en ajout seul, motif fermé, sans valeur (D-338 §4) ; véhicule cadré par D-347 le 2026-10-23 (t40) | A | 9 | oui | H84, rang 1 |
| position du fer | amendement v0.3 d'une position d'expert du dossier du fer (règle du 2026-10-17) | geste | aucune | non | H15, rang 1 |

**File A**

#### H21 · aq : contrôle bloquant des modifications cliniques en CI
- **Identifiant, piste** : lettre aq (R:aq) ; outillage ; file A.
- **Rang** : 1.
- **Portes, préalables** : K-26 volet 2 (porte 28, H09).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre aq, registre.
- **Critère de fin** : une PR clinique sans décision rougit en CI ; banc du contrôle.

#### H22 · ar : montée de version datée des briques
- **Identifiant, piste** : lettre ar (R:ar) ; socle ; file A.
- **Rang** : 1.
- **Portes, préalables** : R-151 (porte 28, H09).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ar, registre.
- **Critère de fin** : briques à jour ; déploiement constaté.

#### H23 · Contrôle de clôture contre l'auto-merge
- **Identifiant, piste** : E56 ; outillage ; file A.
- **Rang** : 1 [Hypothese].
- **Portes, préalables** : porte 27.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune décision neuve ; la limite « jamais d'auto-merge sur une PR de lot » est acquise.
- **Critère de fin** : check en CI vert ; une PR de lot sans clôture est refusée.
- **Mise à jour (2026-10-18)** : livré. L'étape « Contrôle de clôture » du job `controles` (`scripts/wn-controle-cloture.mjs`, banc `wn-controle-cloture.test.mjs`) refuse une PR qui touche du code sans une entrée ajoutée à `SESSION_LOG.md` et un fragment de handoff daté ; une PR purement documentaire en est dispensée. Constat qui l'a motivé : jusqu'au 2026-10-14, la revue Copilot réclamait l'entrée SESSION_LOG ; après D-290, elle a disparu de 71 PR sur 75 du 15 au 18 octobre. CodeRabbit porte la même consigne en avertissement (`pre_merge_checks.custom_checks`). Arbitrage du responsable du 2026-10-18 : les deux éléments restent exigés.

#### H24 · R:af : référence de fiche conseil sur l'action
- **Identifiant, piste** : lettre af ; protocole ; file A.
- **Rang** : 1.
- **Portes, préalables** : une fiche relue (porte 28) ; pour la fiche d'assiette : premier protocole de 21 jours servi (risque D-112).
- **Migration, release-db** : non [A verifier].
- **Décisions, textes** : lettre af, de la main du responsable.
- **Critère de fin** : l'action cite une fiche publiée, banc ; trois conditions de D-251 §10 constatées.

#### H25 · R:ag : rédaction assistée des zones du protocole
- **Identifiant, piste** : lettre ag ; protocole ; file A.
- **Rang** : 1.
- **Portes, préalables** : porte 5 (F46) ; fiches relues (porte 28) ; registre IA et TRUST (F70) : la ligne de registre IA s'écrit dans le lot ag lui-même, sous le régime transverse de F70 (rang T : dans le lot, avant toute activation) ; la porte 13 entière (u, G-8) n'est pas requise, même dispense que F44.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ag, D-xxx propre.
- **Critère de fin** : décision mergée ; site IA déclaré ; aide servie, relue zone par zone.

#### H84 · CB : chaîne besoin → leviers
- **Identifiant, piste** : CB-01 à CB-14 (cadrage contre-revu du 2026-10-21, D-338) ; chaque levier (règle, action, analyte, axe, fiche) porte la clé des besoins qu'il sert — posée à la naissance des tables neuves, par retouche regroupée pour les tables signées existantes, qui re-signent leur périmètre entier et font dériver les cartes diffusées (rejeu du portail) ; provenance héritée des claims étiquetés (D-321, D-140) ; cockpit, protocole, parcours, alimentation ; file A (code), file B (contenus, D/22 étendu), file D (gestes).
- **Rang** : 1 pour la vue par besoin, le contrat du lien, l'amendement de D-279 et le patron du constat praticien ; les retouches de tables signées partent regroupées avec J3-12f et sa réapprobation ; les règles aval suivent la clôture du dossier de preuve de leur besoin (ordre de D-312).
- **Portes, préalables** : D-338 rendue ; dossiers de preuve (H15, D-312) ; ag (H25) et be (H47) pour les actions ; al (H57) et J2-alim (H45) pour l'alimentation ; w et la table des niveaux de preuve pour tout regroupement avec J3-12f ; J3-12h avant le premier levier de complément indexé par besoin ; porte 11 (H13) pour les bandes, G-10 à compléter des sources de J3-12f.
- **Migration, release-db** : non pour le contrat, la vue et les règles (tables en code) ; oui pour l'amendement de D-279 (patron D-279 §3) ; oui, cadrée une fois, pour le patron du constat praticien (modèle D-331) ; chacune au rang des release-db.
- **Décisions, textes** : D-338 (architecture du lien, regroupement, amendement de D-279 §1 sur fait nouveau, constat praticien, lecture d'un constat par une règle du besoin 2, vue, contrôle de cohérence) ; une D-xxx par règle aval, avec ses claims (D-140, DC-17) ; aucun seuil, aucune dose, aucun contenu de l'assistant — tout vient d'un dossier de preuve signé (D-312 §2).
- **Critère de fin** : chaque besoin mesuré ou « non mesuré » avec motif écrit ; chaque levier rattaché par clé signée ou déclaré sans objet avec motif au guide (besoin 2 au score tant que D-122 n'est pas amendée ; constat praticien possible par D-331) ; une priorité libre à besoins visés cible sa re-mesure ; cohérence clés ↔ leviers constatée par conteneur, en agrégats, à chaque lot de règles.
- **Trous nommés sans lot** (CB-13, CB-14) : le portail ne reçoit rien par besoin (phrase sans chiffre, D-329 §3 ; tout ajout est une activation patient, file C) ; aucun module d'IA ne lit les besoins, rien à inscrire sans besoin praticien exprimé. Fibres, prébiotiques et probiotiques (besoin 4, D-312 arbitrage 7) : fiche gelée jusqu'à la clôture du dossier du besoin 4.
- **Mise à jour (2026-10-22, contrat du lien, t38)** : livré sans migration ni D-xxx, hors des chemins cliniques (`web/src/lib/besoins/lienLeviers.ts`, banc `lienLeviers.test.ts`). Arbitrages du responsable du même jour (questions à options, recommandations suivies) : module hors clinique ; trois modes de lien — clé signée dans la table du levier, déduction d'un amont signé nommé (`BESOIN_SOURCES` seul), « sans objet » avec motif ; motif en texte libre non vide tant qu'aucune liste n'est arbitrée ; l'état de mesure d'un besoin reste hors contrat (score `NON_MESURE`, constat praticien de D-338 §4). Le banc lit sans les toucher les `needIds` des tables de priorité et d'orientation, tous valides au contrat. Aucune clé posée, aucune table signée ni version du score touchée (D-338 §2).
- **Mise à jour (2026-10-23, constat praticien, t40, D-347)** : la liste fermée des motifs n'était écrite ni dans D-338 §4 ni dans D-331 ; cinq arbitrages du responsable du même jour (questions à options) la fixent avec le reste du véhicule : quatre verdicts cadrés sur ce que le praticien décide du besoin (« à soutenir », « non retenu », « non évaluable », « sans objet »), neuf motifs, pièces facultatives (biologie ou questionnaire, par clé ; contre la recommandation), base fermée aux besoins 2, 6, 7 et 11, « à relire » dérivé (conditions de D-331 §5 sur les pièces, date atteinte, besoin qui gagne une source de score). Paragraphe du dossier RGPD posé avant les tables, validation du responsable attendue avant le merge de la migration. Suite : PR de migration seule (`constats_besoin_praticien_v1`), release-db, constat par conteneur, puis le code sous `WN_CONSTAT_BESOIN`, éteint. Le fond de chaque besoin (quoi constater) reste à son dossier de preuve.

#### F66 · Chaîne D-281 : SAF-EI-01 amendée, signée en fin de chantier
- **Identifiant, piste** : DC-42 (`docs/DECISIONS.md:84-86` sur main) ; trust.
- **Rang** : étape 2 (migration) mergée le 2026-10-13 (#1408) ; sa release-db au rang 0, faite : approuvée et constatée en production le 2026-10-13. Acquis : étape 3 (portail et pause) au rang 1 ; étape 4 (validation, banc de cas fictifs refait) au rang 2 ; étape 5 : signature M-1 au rang 3, commit de signature et déploiement constaté (J1-sécu) au rang 4, qui lève la porte 7. Le formulaire s'ouvre hors de la file C, seul ouvert à ce moment, constaté avant l'ouverture suivante ; places 1 à 5 de la file C intactes.
- **Portes, préalables** : D-281 mergée (#1406) ; #1408 mergée ; S-1 pour la part effets indésirables, faite. L'étape 3 s'ouvre hors de la file C, seule, constatée avant l'ouverture suivante ; places 1 à 5 jamais permutées et aucune insertion avant les places 2 à 5 respectées. Lève la porte 7. #1408 a mergé sans essai de restauration, sous la lecture de la porte 8 ; D-g reste à trancher (F04).
- **Migration, release-db** : oui (étape 2), mergée (#1408) ; release-db approuvée et constatée (lecture de production du 2026-10-13 par conteneur one-off, `prisma migrate status` : 104 migrations, schéma à jour, la dernière étant celle du lot 2) ; elle est passée avant celle de BP-09 ; plus aucune migration en vol.
- **Décisions, textes** : textes de la pause signés le 2026-10-12 (`docs/DECISIONS.md:62`) ; signature des quatre champs, nouvelle version, sourceReference « DC-42 ; D-281 » ; lettre e. Écarté : signer la règle livrée comme filet (`docs/DECISIONS.md:85-95`). Le banc local non suivi vise la règle livrée : caduc, à ne pas compter.
- **Critère de fin** : release-db de #1408 constatée (fait, 2026-10-13) ; signature posée, déploiement constaté ; d'ici là, capture et notification seulement.
- **Mise à jour (2026-10-13)** : D-281 est au registre (#1406, lot 1 ; #1408, lot 2, migration appliquée). Question du lot 3 tranchée par le responsable le 2026-10-14 : toute orientation vers le médecin et toute prise de sang sont exclues de la liste proposée au patient (D-281 §2).
- **Mise à jour (2026-10-14, étape 3)** : étape 3 livrée par #1447 (le patient désigne l'élément du programme, la pause est construite) ; son constat après déploiement est en D.2 (§4). D-281 §2 pose trois préalables à la signature de l'étape 5 : la garde de diffusion du §3, le texte de l'avis rendu (geste, D.3), le remplacement du producteur de la règle livrée ; les préalables de code et les restes de l'étape 4 sont au §8.
- **Mise à jour (2026-10-14)** : étape 3 mergée (#1447) et constatée sur un dossier de test. Étape 4 cadrée le même jour (D-281 §3 à §5) : deux PR. La première livre la surface du verdict praticien (élément désigné, deux dates, impliqué ou non impliqué, aménagement, correction par chaîne), écrite dès maintenant, sans effet au portail avant la signature. La seconde livre la règle amendée (l'attente bloque la diffusion seule), la garde de diffusion, le banc de cas fictifs réécrit et le texte de l'avis rendu, signé le 2026-10-14 (D-281 §4).
- **Mise à jour (2026-10-14, étape 4, PR 2)** : PR 1 mergée (#1450). PR 2 : le producteur de la règle livrée ne produit plus de constat (la carte n'est plus touchée) ; la route de diffusion refuse tant qu'un signalement rattaché n'a pas d'avis en tête de chaîne, statut ignoré, par un message qui le nomme par sa date de dépôt ; texte de l'avis rendu servi au portail ; banc de cas fictifs suivi (`web/src/lib/trust/bancCasFictifsD281.test.ts`) ; compteur `nonTraites` du panneau compté par l'attente. Les trois préalables de code de D-281 §2 sont faits ; tout reste inerte avant la signature (M-1). Arbitrage du responsable à la revue (D-281 §5) : le formulaire d'avant (« oui » au programme sans élément) bloquera aussi la diffusion ; préalable neuf de la signature, par migration (§8).
- **Mise à jour (2026-10-15, formulaire d'avant)** : PR 2 de l'étape 4 mergée (#1457) et déployée. Migration du formulaire d'avant mergée (#1464), release-db approuvée et constatée le 2026-10-15. Le code qui la consomme suit, en PR séparée : le formulaire d'avant attend l'avis comme les autres (garde de diffusion, inerte jusqu'à la signature ; compteur `nonTraites`, actif dès le déploiement), la route du verdict et l'écran d'avis l'acceptent (le praticien désigne l'élément en cause, ou aucun), rien n'est mis en pause au portail ; banc de cas fictifs étendu (cas 24 à 29). Reste, avant la signature : le gel du patient dès qu'un verdict existe (§8).
- **Mise à jour (2026-10-15, gel du patient et verrou de course)** : migration du gel du patient mergée (#1474), release-db approuvée et constatée le 2026-10-15. La passe Codex de #1474 a trouvé une course à deux sessions ; migration corrective mergée (#1476 : l'avis verrouille le patient puis le signalement qu'il lit), release-db approuvée et constatée le 2026-10-15 (production sur 8bc48e55). Les migrations du formulaire d'avant sont toutes en production. Reste, avant la signature : le Fil du jour et le prévol du copilote comptés par l'attente d'avis, et non plus par statut (§8).
- **Mise à jour (2026-10-15, Fil et prévol)** : #1483, le Fil du jour et le prévol du copilote comptent le « non traité » par l'attente d'avis, par la règle du panneau (`effetsNonTraites`, une seule pour les trois surfaces), actif dès le déploiement, sans migration ; ligne du §8 soldée. Restent de l'étape 4 : la désignation illisible au dépôt (§8) et les autres restes ; puis la signature (M-1).
- **Mise à jour (2026-10-16, désignation illisible)** : tranchée par le responsable (D-281 §5) et livrée sans migration. Quand la lecture de la désignation échoue, ou que le programme diffusé ne passe pas le contrôle d'intégrité, le signalement vise le programme diffusé, relu seul, sans rattachement : il attend l'avis comme le formulaire d'avant (garde de diffusion inerte jusqu'à la signature ; panneau, Fil et prévol actifs dès le déploiement). Si cette lecture échoue aussi, il est capturé sans programme. Ligne du §8 soldée.
- **Mise à jour (2026-10-17, t27)** : un signalement hors règle ne fait plus dériver la carte servie (D-281 §5, tranché par le responsable le 2026-10-17). La phrase qui comptait ces signalements sur la carte entrait dans son empreinte. Elle en sort, et le programme reste servi au portail. Ces signalements restent comptés au panneau, au Fil et au prévol. Les statuts ouverts sortent du périmètre signé de SAF-EI-01. Sans migration, sans effet avant M-1. Ligne du §8 soldée ; la lecture des signalements devenue sans effet dans la chaîne passe au §8 comme dette.
- **Mise à jour (2026-10-17, M-1)** : SAF-EI-01 amendée signée le 2026-10-17 par le responsable, sur questions à options, après lecture de la conduite et des trois points qu'elle engage (D-281 §6, D-195 ; surface `docs/claude/campagnes/SURFACE_RELECTURE_SAF_EI_01_2026-10-17.md`) ; version `safety-effet-indesirable-nnpp2-v2`. Le drapeau étant posé, la règle s'active au déploiement du commit de signature (J1-sécu), qui lève la porte 7 une fois constaté. Au déploiement, l'empreinte des cartes change et les programmes approuvés (trois ; répartition masquée (moins de cinq dossiers)) deviennent « indisponibles » : le praticien diffuse aussitôt une nouvelle version pour chacun (arbitrage du jour, D-281 §6 a). Q3 de t25 différée et accès « Signaler un problème » renvoyé à un lot UI (D-281 §6 b, c ; §8).
- **Mise à jour (2026-10-18, J1-sécu)** : le commit de signature (03dd8c00, #1528) est en service, constaté dans l'image déployée 9aec4a5b, qui l'inclut ; la porte 7 est levée. La pause sur effet indésirable et la garde de diffusion s'arment sous le drapeau, comme prévu (D-281 §6). Les rediffusions des programmes devenus « indisponibles » sont un geste du praticien (D-281 §6 a) : non encore constatées le 2026-10-18 à 1 h 18, sans signalement en attente d'avis. Le lot suivant de la chaîne, t29 (lecture des signalements devenue sans effet), est en PR.

**File B**

#### F02 · BP-07 : dossier de preuve remis à la curation signée
- **Identifiant, piste** : BP-07 (LOT-07 de BIO-PARCOURS) ; parcours.
- **Rang** : 1 ; la signature du responsable M-5 (1/2) au rang 2.
- **Portes, préalables** : lettre a mergée (porte 2) ; porte 27 à la PR ; contre-revue P0.
- **Migration, release-db** : non (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:117`).
- **Décisions, textes** : aucune D-xxx propre (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:376`) ; signature claim par claim, de la main du responsable.
- **Critère de fin** : dossier remis, les signatures du responsable posées ; aucun texte clinique au dépôt.
- **Mise à jour (2026-10-14)** : BP-07 clos (LOT-07 terminé, #1438). Dossier de preuve remis hors dépôt (#1432) ; sources WN-SRC-0508 à 0511 au registre du corpus, notices titre seul (#1433, #1436) ; positions d'expert P1 à P8 signées au dossier privé, aucun texte, seuil ni délai au dépôt (#1435) ; signatures du responsable posées dans le lot, donc M-5 (1/2), prévue au rang 2, est faite. Aucun code, aucune migration ; campagne repassée en pause, sans lot courant. Suite au plan : BP-12b (F09, positions versionnées) et BP-17 (F11).
- **Mise à jour (2026-10-16)** : BP-07 reste le modèle des dossiers du besoin 2 suivants (H15, lettre w, D-312) : vitamine D ouverte le 2026-10-16, puis zinc, magnésium érythrocytaire, B9, B12, iode, sélénium. Leurs claims entrent dans les fiches d'usage de F05 comme ceux du fer.

#### F50 · Vue dédoublonnée par analyte
- **Identifiant, piste** : PR 2 ; une ligne par analyte avec ses panels et règles ; courrier et document patient inchangés ; panels.
- **Rang** : 1 proposé [Hypothese], après cj.
- **Portes, préalables** : cj ; bancs de BP-01 (faits).
- **Migration, release-db** : non (code seul).
- **Décisions, textes** : aucune clinique ; aucune règle ni seuil changé (`docs/archive/cadrages/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:179-181`).
- **Critère de fin** : banc « un analyte cité par trois panels donne une ligne et trois justifications » ; empreinte du chemin documentaire inchangée ; T2.
- **Mise à jour (2026-10-17)** : livré en une PR, sans migration : dérivation pure `vueParAnalyte` (sortie du moteur intacte) et section repliée « Vue par analyte » du panneau de proposition ; bancs pur et écran du critère ; garde du chemin documentaire inchangée ; T2 joué avant la PR.

**File D : gestes du responsable**

#### F59 · Cockpit chiffré
- **Identifiant, piste** : lettre c ; provenance, formule versionnée, nature ; qualifier exige un seuil signé ; socle.
- **Rang** : c au rang 1, signature M-2 au rang 2 (porte 6), J1-cockpit au rang 3.
- **Portes, préalables** : S-2 ; porte 4 (source du poids égal, non levée).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre c ; doctrine signée de la main du responsable.
- **Critère de fin** : chaque chiffre avec source, date, nature, tenu par banc.
- **Mise à jour (2026-10-23, M-2)** : D-333 et D-334 signées telles quelles par le responsable, sur question à options ; porte 6 levée. La stabilité métabolique est affichée au cockpit (tiroir « Objets cliniques & momentum », `FichePatientPanel.tsx`, route `api/praticien/equilibre`), sans mention ni source : la tolérance de D-333 §3 court depuis la signature. Ordre arbitré le même jour, au rang 3 :
  1. **J1-cockpit-a**, premier lot de code après la signature, rien avant lui : « Non motivé, décision due » à côté de la valeur de la stabilité métabolique, avec la source présente et celle qui manque (Q_INF_01, Q_INF_02 ; jamais « deux instruments » sur une seule source), jusqu'à la levée de la porte 4 (poids égal) ; mention de nature sur la stabilité métabolique, la réserve d'adaptation et la clarté (§3), garde `natureIndiceGlobal.guard.test.ts` étendue aux trois objets (§6). Couverture par source lue dans la route, rien sous `lib/equilibre` ; T2, `wn-reviewer`.
  2. **J1-cockpit-b** : provenance datée sous chaque chiffre (§2 règle 1), garde de frontière (§6) ; Q10 (retrait de `trajectoire[].valeur` et `momentum.delta` de l'API portail, au lot qui écrit la garde) ; Q9 (« Plafond appliqué (règle des fondations critiques, D-106) », sans besoin ni valeur avant plafond).
  3. **Lots de l'audit des instruments des 12 besoins** (Q1 à Q12, tranchées le 2026-10-22), chacun après son préalable : Q2, Q3, Q4 d'abord (composant des cercles propre au cockpit ; motif sur une ligne dépliable ; six motifs, libellés relus par le responsable avant le code) ; Q1 (ordre fixe B1 à B12 par strate) après J3-12b ; Q5 (le motif décrit les routes de calcul, écart avec le snapshot nommé) avec J3-12g ; Q6 (« Calculé sur n besoins mesurés sur 12 ») et Q8 (compléter la mesure) après une D-xxx produit commune ; Q7 (entier 0 à 100 sans « % », écarts en points) avec J2-mom (H30) ; Q11 (« Points à explorer », acté ou retiré) après sa D-xxx, sur relecture de la fiche SP-CONV LOT-05 ; Q12 (accessibilité : passe humaine, banc AxeBuilder, « Mon équilibre ») aux étapes E67 et H64.
  4. **y** (H58), geste du responsable, en parallèle.
  Restent tenus par une autre porte : J2-jourN (lettre o), ce et au (porte 16), BF-5 (porte 25), page de santé de BioFlow (G-3, axes).

#### F34 · aw : signature des familles
- **Identifiant, piste** : lettre aw ; re-signature de la table des quinze règles ; trackc.
- **Rang** : 1 au plus tôt [Hypothese].
- **Portes, préalables** : av ; claims certifiés. Il se raccorde aux axes (F51) et aux indications v2 (F53) sans en dépendre : F53 vient après lui.
- **Migration, release-db** : non.
- **Décisions, textes** : une signature par famille, de la main du responsable.
- **Critère de fin** : familles signées ; aucune borne inventée.

#### F37 · az : notice patient du bilan, et remise du document
- **Identifiant, piste** : lettre az ; trackc.
- **Rang** : texte au rang 1 au plus tôt [Hypothese] ; activation dans la file C après ax, place à fixer.
- **Portes, préalables** : av ; consignes préanalytiques sourcées en base [A verifier] ; registre anxiogène ; porte 18 ; ordre des places 12 et suivantes tranché : l'encart d'abord dès qu'il est prêt, puis l'ordre de préparation. Les documents non biologiques attendent la place 4 de la file ; une aide de l'IA à la notice serait un usage de plus derrière la porte 5.
- **Migration, release-db** : non.
- **Décisions, textes** : texte patient de la main du responsable, signé, versionné ; il se décide avec une question encore ouverte, non posée ; une ou deux ouvertures [A verifier].
- **Critère de fin** : texte signé ; chaque activation constatée avant la suivante.
- **Mise à jour (2026-10-13)** : les questions écartées ne se reposent pas : l'objet d'az se tranche dans son texte, de la main du responsable [Hypothese], en deux parties séparées [Hypothese].

#### F51 · Décision des axes biologiques
- **Identifiant, piste** : liste fermée neuve, distincte de NeuroAxis (arbitré le 2026-10-05), devenue un lot BIO-PARCOURS ; panels.
- **Rang** : 1 proposé [Hypothese], après cj.
- **Portes, préalables** : cj ; curation.
- **Migration, release-db** : non pour la décision (voir F52).
- **Décisions, textes** : lettre cm, de la main du responsable ; les liens analyte-axe se signent ensuite, claim par claim (F79).
- **Critère de fin** : D-xxx mergée ; liste curée et signée.
- **Mise à jour (2026-10-23)** : lettre cm signée par le responsable ; D-348 en forme opaque (dix codes, cinquante claims fondateurs, limites écrites). Fait au merge de sa PR. Trois claims certifiés renvoyés à l'atelier des claims (D-348 §6) ; la correspondance panel → axe reste ouverte (D-348 §7). Ouvre F52.

#### H26 · Lots de D-283 : durées, droits, information du médecin
- **Identifiant, piste** : lots du §10 de D-283 (mergée, #1411) et du §7 de D-284 (mergée, #1413) : (a) texte patient des durées, nouvelle version de « Vos données personnelles », accusé exigé.
- **Rang** : (a), (e), (f), (g) écran, (h) au rang 1 [Hypothese] ; (i) fondu dans J3-mineurs (H79, rang 10 ; arbitrage du 2026-10-14) ; (b) et la migration de retrait (g) au rang 4 au plus tôt [Hypothese] (migration) ; (c) avec le code de la trace d'import (F44, rang 1) [Hypothese] ; (d) remplacée par (h) (D-284 §7) ; (j) au rang 1 [Hypothese] : le G3 est clos (#1416, D-282 §8), seule l'analyse d'impact de la main du responsable le précède. (h) précède l'ouverture de toute surface neuve : J1-sécu (rang 4, F66), le formulaire de D-281 comptant comme surface neuve [Hypothese], et chaque place de la file C (rang 5 et après) ; les surfaces déjà en service restent ouvertes ; une surface neuve codée au rang 1 ou 2 (J2-alim, H45) ne s'ouvre à un dossier mineur ou sans date qu'après (h) constatée.
- **Portes, préalables** : D-283 et D-284 mergées (rang 0, fait) ; (b) : point de départ de l'archive validé par un conseil avant toute mise en œuvre (D-283 §2 ; porte 28, H09), G-7, porte 9 ; (g) migration : G-7, porte 9 ; (i) : avec G-11 (H38) ; (j) : G3 clos (fait, #1416) ; registre avant chaque table (F70).
- **Migration, release-db** : (b) oui ; (g) oui, retrait de colonne ; (c) selon F44 ; les autres non.
- **Décisions, textes** : aucune décision neuve (« sans arbitrage neuf », D-283 §10 ; D-284 §7) ; textes (a) et (e) proposés par l'assistant et signés par le responsable ; textes patient (h) et (i) sous G-11 (H38) ; analyse d'impact du transfert (j) de la main du responsable, archivée avec la copie datée (F47).
- **Critère de fin** : chaque lot livré et constaté ; rien ne s'efface sur la règle de l'archive avant la réponse du conseil ; (g) : champ absent de la fiche patient, puis colonne retirée, 0 NIR constaté (D-284 §3) ; (h) : date demandée à la connexion, pause constatée sur un dossier de test ; (i) : validation d'un titulaire constatée ; (j) : identité absente du document envoyé, constaté sur un import.
- **Mise à jour (2026-10-14)** : (g) écran livré : champ retiré de la fiche, de la route et de l'export, `donnees_confidentialite` v16 avec accusé (pour ne pas effacer celui de la v15, accusée par aucun dossier actif) ; 0 NIR au constat du même jour ; reste la migration de retrait de la colonne (rang 4). Suite : (h), pause limitée aux questionnaires (agendas compris) et à la biologie (arbitrage du 2026-10-14).
- **Mise à jour (2026-10-19)** : (g) migration écrite (dette t03) : `20261019190000_patients_retrait_nir_v1` retire la colonne `nir` et sa contrainte de forme ; contrat neuf `patients_retrait_nir_v1_negatif.sql`, contrat `dossier_administratif_patient_v1` ramené à trois colonnes. G-7 levé (porte 8) ; release-db déléguée (porte 9), après re-constat de 0 NIR par conteneur.
- **Mise à jour (2026-10-20)** : (g) **clos**. Migration mergée (#1581, 257807e3) après recomptage de 0 NIR sur 34 dossiers ; release-db 39340724658 approuvée (délégation), sentinelle reçue ; constat par conteneur : colonne et contrainte absentes, migration appliquée, aucune migration en échec ; aucun « column does not exist » aux journaux de l'application. Textes du registre RGPD et commentaires mis à jour par la PR de suite. Ne jamais réinstaller une image antérieure à 257807e3.
- **Mise à jour (2026-10-14, suite)** : (g) déployé et constaté (#1434 : v16 dans l'image, champ absent, 0 NIR). (h) livré dans sa PR : date demandée au portail après « Avant de commencer », confirmée, jamais écrasée ; pause tenue par les routes (questionnaires, anamnèse, agendas, dépôt biologique) ; mineur en pause jusqu'à (i) ; `donnees_confidentialite` v17 avec accusé. Critère de fin restant : pause constatée sur un dossier de test.
- **Mise à jour (2026-10-14, clôture de (h))** : (h) mergé (#1437) et déployé (90743acf) ; constaté dans l'image (v17, refus `date_naissance_requise` et `circuit_mineur_requis`, route de saisie) ; parcours essayé au portail par le responsable ; au constat par conteneur, aucune date encore enregistrée par le portail (31 dossiers ouverts, 15 sans date, 0 mineur). Import et lecture de biologie par le praticien restent ouverts pour un dossier sans date ou mineur (arbitrage du 2026-10-14). (i) fondu dans J3-mineurs (H79, rang 10), avec le consentement complet ; d'ici là, un mineur reste en pause et se traite à la main (arbitrage du 2026-10-14). Textes de G-11 (H38) : premier jet à proposer par l'assistant (non commencé), puis à corriger et valider par le responsable (arbitrage du 2026-10-14).
- **Mise à jour (2026-10-14, (j))** : trois lots de (j) mergés : migration `bio_ingest_masquage_identite_v1` (#1426) ; écran de masquage et lecture des seules pages masquées, `bio-extraction-v5`, sans repli sur le document (#1428) ; `usage_ia` v8 et `donnees_confidentialite` v15 (#1431), cette dernière remplacée depuis par v16 (#1434) puis v17 (#1437). Le code a mergé avant l'analyse d'impact que la ligne « Rang » plaçait avant (j) [A verifier]. Consignés le 2026-10-15 : la release-db du lot 1 (porte 9) et le déploiement du lot 2 (49df90f1, #1428, avec succès le 2026-10-14 à 08:40 UTC). Restent : l'analyse d'impact (F47) ; le critère « identité absente du document envoyé, constaté sur un import » (premier masquage réel puis import v5, par conteneur, sur un dossier de test, par identifiant). Les textes de G-11 sont acceptés depuis (H38, #1441).

#### H27 · LOT-02 de l'agenda du sommeil : la re-mesure (porte 16)
- **Identifiant, piste** : LOT-02 de la campagne 2026-10-07-agenda-sommeil-adhesion : re-mesure de l'adhésion par cohortes avant et après, en agrégats ; sa clôture lève la porte 16 ; sommeil ; geste du responsable (constat).
- **Rang** : 1 au plus tôt, au fait ; lectures repères le 2026-10-29 puis le 2026-11-12.
- **Portes, préalables** : porte de campagne, non levable par un geste.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune ; « des comptes, pas des tests ».
- **Critère de fin** : les deux lectures versées en agrégats ; statut du LOT-02 fermé.

#### H28 · r : droits d'usage des instruments
- **Identifiant, piste** : lettre r (D-r) ; droits d'usage des instruments servis ; déclaration des droits de Q_ALI_09 ; confiance ; geste du responsable (registre).
- **Rang** : 1.
- **Portes, préalables** : S-1, instruments passés (H06).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre r, registre ; déclaration de Q_ALI_09 à rédiger et à signer.
- **Critère de fin** : registre relu, mergé ; J2-conf le consomme (F45).
- **Mise à jour (2026-10-21)** : r faite (D-341 §2), sur arbitrage du responsable : le registre des instruments (`docs/claude/corpus/instrument_registry.json`) porte les droits des 65 instruments, tous instruits (63 « permission obtenue », dont huit sur déclaration du praticien du 2026-07-30 ; 2 « libre ») ; la déclaration du 2026-09-16 sur Q_ALI_09 (9be025ed) tient lieu de la déclaration signée ; registre reconnu tel quel, consommé par `droitsAssignabilite.guard.test.ts` et `verifier_registre_instruments` au CI. Critère de fin tenu.

#### H29 · x et J3-api : posture d'API, aucune clé
- **Identifiant, piste** : lettre x (D-x), puis J3-api ; plateforme ; geste du responsable (x), puis file A (J3-api).
- **Rang** : x au rang 1 ; J3-api au rang 2, 4 au plus tôt si une migration se confirme.
- **Portes, préalables** : x : avis d'un conseil (porte 28, H09) [A verifier], ci (F67) ; J3-api : x ; si migration : G-7, porte 9.
- **Migration, release-db** : J3-api : [A verifier].
- **Décisions, textes** : lettre x, de la main du responsable ; l'ouverture d'une API reste fermée (F75).
- **Critère de fin** : posture mergée ; rôles posés, aucune clé.
- **Mise à jour (2026-10-14)** : le préalable ci est écrit : D-286 (#1425). La première clé d'API émise est l'événement 3 de son §2 ; aucune clé n'est émise, x reste à écrire.

#### H30 · o et J2-mom : Momentum à remesure libre
- **Identifiant, piste** : lettre o (D-o, R:o, T-2, T-3, RK-3), puis J2-mom ; J21, J42, J90 inchangés ; douze mini-courbes, motifs d'absence ; valeurs aux points après la porte 22 ; cockpit ; geste du responsable (o), puis file A (J2-mom).
- **Rang** : o au rang 1 ; J2-mom au rang 2.
- **Portes, préalables** : o : S-1 (H06) ; relecture clinique, T3, wn-reviewer ; J2-mom : o ; porte 22 pour la courbe aux points.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre o, de la main du responsable.
- **Critère de fin** : banc D-058 réécrit ; une seule date de départ partout.
- **Mise à jour (2026-10-21, file D)** : la troisième divergence de la section « Mesure » de l'audit de D-312 (Momentum compté depuis la première mesure du dossier, non depuis l'ancre du cycle) est rattachée à la lettre o sur arbitrage du responsable : elle se règle avec « une seule date de départ partout », rien avant.

#### H31 · t : point d'étape, rappel nommé, invitation lue au portail
- **Identifiant, piste** : lettre t (D-t, R:t, T-1, RK-2) ; protocole ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : S-1, nature du rappel (H06).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre t, de la main du responsable.
- **Critère de fin** : lettre mergée ; PA-1 et la carte servis dans J3-base (H61) ; PA-2 servi par son lot, hors J3-base (D-317 §4) ; baseline visuelle verte.
- **Mise à jour (2026-10-17, lettre écrite)** : D-317, sur six arbitrages du responsable. L'e-mail de diffusion est une annonce hors relance (clic praticien, plafond serveur d'un e-mail d'annonce par dossier et par 24 h), à chaque nouvelle version, gabarit neuf à relire ; il sort de J3-base en lot propre PA-2 (H75). PA-1 : une ligne « rendez-vous de suivi » au portail pour chacun des trois points d'étape, sans e-mail ; carte du Fil « Point d'étape J21 renseigné — décision attendue » ; les deux restent dans J3-base. Critère de fin restant : PA-1 et la carte servis dans J3-base, baseline verte ; PA-2 servi par son lot.

#### H32 · d : doctrine d'adhésion
- **Identifiant, piste** : lettre d (D-d, R:d) ; K-02 servi = premier check-in ; échelle E4 (choix à trancher) ; l'effectif de masquage a sa propre fiche (F25) ; cockpit ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : S-2 (H01) ; règle du milieu levée.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre d, de la main du responsable ; trancher le choix d'échelle d'E4.
- **Critère de fin** : doctrine mergée ; signature M-2 au rang 2 (F59), qui lève la porte 6.
- **Mise à jour (2026-10-23, M-2)** : critère de fin tenu. D-334 mergée (S-2, #1604), signée telle quelle par le responsable le 2026-10-23 avec D-333, niveau médian ordinal du §4 compris ; porte 6 levée. Les écrans E4 (J2-jourN, H52, qui attend encore la lettre o) et cabinet (y, H58) restent des lots distincts.

#### H33 · am : table de quantités au protocole
- **Identifiant, piste** : lettre am (R:am) ; protocole ; geste du responsable.
- **Rang** : 1 ; fermé tant que la source manque.
- **Portes, préalables** : porte 4, source de quantités absente (H08).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre am, de la main du responsable ; aucune quantité proposée par l'assistant.
- **Critère de fin** : ligne sourcée et signée.

#### H34 · ad et bc : un cycle, pas un programme
- **Identifiant, piste** : lettres ad (R:ad) et bc ; protocole ; geste du responsable (registre).
- **Rang** : 1.
- **Portes, préalables** : j (F63).
- **Migration, release-db** : non.
- **Décisions, textes** : lettres ad et bc, registre.
- **Critère de fin** : deux textes mergés ; aucun lot ne rouvre `phases` sans décision.

#### H35 · ba : mention « validé par votre praticien »
- **Identifiant, piste** : lettre ba ; message de départ facultatif [A verifier] ; protocole ; geste du responsable.
- **Rang** : 1 [Hypothese] ; hors file C : ajout à la page servie, constat par lecture.
- **Portes, préalables** : complète q (F38) ; aucune place de la file C.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ba, texte à signer une fois, de la main du responsable.
- **Critère de fin** : texte signé et mergé ; mention constatée sur la page servie.

#### H36 · R:Drive : extraction du Drive de formation
- **Identifiant, piste** : R:Drive ; notices comptées d'abord, hors dépôt ; droits notice par notice (D-251 §2) ; jamais de donnée patient ; références validées une à une ; fiches conseils ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : porte 5 (F46).
- **Migration, release-db** : non.
- **Décisions, textes** : K-05a et D4 (F46) ; validation des références par le responsable.
- **Critère de fin** : un compte de notices, puis des références validées dans l'atelier.

#### H37 · u : Patient Hub, collecte et « Mes échanges »
- **Identifiant, piste** : lettre u (D-u, R:u, J2-hub) ; textes sans drapeau ; une seule durée nommée (D-283 §2) ; confiance ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : k (F77) ; l, écrite par D-283 (rang 0, fait) ; texte clinique validé.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre u, de la main du responsable, fragment.
- **Critère de fin** : texte accepté avant toute activation.
- **Mise à jour (2026-10-14)** : u écrite par D-293, textes validés tels quels : `docs/claude/propositions/2026-10-14-u-patient-hub/README.md`. « Mes échanges » est un journal daté, en lecture, de ce qui a été remis et transmis, renvoyant aux pages existantes ; sans e-mails ni réponses du praticien. L'encart de D-275 §1 s'étend au dépôt et à « Mes échanges ». La lecture datée est dite au patient ; son code est ai (H51).

#### H39 · cb : textes de l'écran de fin du sommeil
- **Identifiant, piste** : lettre cb ; jeu d'illustrations accepté ; sommeil ; geste du responsable.
- **Rang** : 1 [Hypothese].
- **Portes, préalables** : ca (H17).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre cb, de la main du responsable.
- **Critère de fin** : textes et jeu acceptés avant l'activation de cc.

#### H40 · seuils_points de Q_ALI_01 : décision clinique sourcée
- **Identifiant, piste** : E31 ; décision clinique sourcée ; alimentation ; geste du responsable.
- **Rang** : 1 [Hypothese].
- **Portes, préalables** : porte 4 (H08).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx clinique sourcée, fragment `changelog.d/`, de la main du responsable ; aucun seuil proposé par l'assistant.
- **Critère de fin** : décision signée ; banc.

#### H41 · Règles orphelines : réécrire les trois restes
- **Identifiant, piste** : E32 ; doctrine ; geste du responsable (registre).
- **Rang** : 1 [Hypothese].
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de réécriture, registre.
- **Critère de fin** : texte réécrit, mergé.

#### H42 · Table d'arrêt : les grilles qu'elle cite
- **Identifiant, piste** : E64 ; sécurité ; geste du responsable.
- **Rang** : 1 [Hypothese].
- **Portes, préalables** : re-signature (règle 1.8 de `.claude/rules/pr-revue-et-release-db.md`).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx et signature, de la main du responsable.
- **Critère de fin** : nouvelle empreinte signée, banc vert.

### Rang 2

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| J1-base | suite cosmétique, jetons, rail, petites dettes d'écran | A | aucune | non | H43 |
| R:Titre du Fil | « Questionnaires à consulter » au-dessus du Fil | A | aucune | non | H44 |
| J2-alim | journal alimentaire de 21 jours | A | 9 si migration | selon | H45 |
| ML-2 à ML-4, ML-6 | suites de l'aperçu médecin | A | aucune | selon | H46 |
| be | gestes communs au catalogue d'actions | A | 5, 28 | non | H47 |
| cc, LOT-12 | habillage de la saisie du sommeil | A | 16 ; 18 (place de la file C : D-288 §3, #1430) | non | H48 |
| J2-mom | Momentum par paires, douze mini-courbes | A | 22 pour les points | non | H30, rang 1 |
| J2-bandes | bandes : alimentation et humeur d'abord | A | 11 | non | H13, rang 0 |
| J3-api | rôles de connexion, aucune clé | A | 9 si migration | selon | H29, rang 1 |
| D-281, étape 4 | validation de l'implication ; banc de cas fictifs refait | A | aucune | non | F66, rang 1 |
| J3-12f | changement de sources des besoins 8, 9 et 12, un seul changement de version, réapprobation préparée ; retouches regroupées des tables signées (D-338 §2) | A | aucune ; après J3-12e, w et la signature de la table des niveaux de preuve (les sources fermées sont fournies, #1615) | non | H15, rang 2 |
| BP-09 | annulation d'un résultat, ajout seul (fiche du lot validée le 2026-10-14, #1442 ; migration mergée sous D-294, #1448) | B | 28 ; 9 | oui | F03 |
| fiche LOT-25 | « quatre termes », cases corrigées | B | aucune | non | F14 |
| J2-conf | garde d'âge ; registre des droits | B | aucune | non | F45, rang 0 |
| F50, étape courrier | courrier regroupé par analyte | B | aucune | non | F50, rang 1 |
| bb | lecture des trois plans par le patient | C | 18 | non | H49 |
| M-5 (1/2) | signatures de BP-07 (posées dans le lot, #1435, #1438) | geste | 23 | non | F02, rang 1 |
| f | NABM : 8 liaisons, puis liste étendue | geste | 10 | non | F54, rang 0 |
| M-2 | signature de la doctrine du cockpit (porte 6) | geste | lève 6 | non | F59, rang 1 |
| G-8 | préalables communs prêts, rien d'activé ; fait le 2026-10-14 | geste | 13 | non | H50 |
| ai | accusé de lecture daté de « Mes échanges » | geste | lève 14 ; 9 si migration | selon | H51 |
| niveaux de preuve | signature d'une table révisée des niveaux de preuve | geste | aucune ; après J3-12e | non | H15, rang 2 |
| réapprobation | protocoles diffusés réapprouvés dossier par dossier après le déploiement de J3-12f | geste | aucune | non | H15, rang 2 |

**File A**

#### H43 · J1-base : la suite cosmétique
- **Identifiant, piste** : J1-base ; 5A et 8B livrés, retirés ; cockpit ; file A.
- **Rang** : 2.
- **Portes, préalables** : F02, clos le 2026-10-14 (#1438 ; S-5, défini nulle part, retiré le 2026-10-21 : D/11) ; a (F01) ; S-4 (H02) ; N-6, une fenêtre sans PR biologie sur le Fil.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : instantanés régénérés ; écrans constatés.
- **Mise à jour (2026-10-18)** : L4 et L5 livrés ensemble, sous D-324 (arbitrages du responsable du même jour). Le groupe « Héritage 4.0 » quitte le menu. Le menu compte désormais trois groupes : La Spirale (l'agenda reste, « Confiance & droits » y monte), Bibliothèque (cinq rayons, chacun avec sa page, puis l'atelier) et Réglages. Documents et Synthèse IA quittent le menu du bureau ; « Synthèses » reste au téléphone. L'ancienne page Biologie redirige vers le rayon « Analyses biologiques », qui porte aussi les fiches d'usage. Restent dans J1-base : les 8 gestes cosmétiques, les jetons, K-10, NF-6, NU-2a, le libellé de priorité de la minute d'après et le repli `localhost`. Le concept de Bibliothèque est à revoir (réponse du responsable) : ce découpage ne le tranche pas.
- **Mise à jour (2026-10-18, libellé du menu)** : le libellé « Compléments alimentaires » (D-324 §4) dépassait les 252 px du rail déplié et s'affichait « Compléments aliment… ». Les libellés du rail passent désormais à la ligne au lieu d'être coupés ; le libellé décidé reste entier.
- **Mise à jour (2026-10-18, minute d'après)** : la minute d'après affiche le libellé de la priorité retenue (règle du registre signé, ou libellé écrit par le praticien sur la sélection de cet identifiant) au lieu de l'identifiant brut ; l'identifiant ne reste qu'en repli, si le libellé ne se relit pas.
- **Mise à jour (2026-10-18, repli localhost)** : les trois liens de courriel (lien magique, page de connexion, Fil du jour) partagent une base unique ; son repli `localhost` ne sert plus qu'en développement, car le serveur de production refuse de démarrer sans `NEXTAUTH_URL` (trace fatale ; panne franche assumée, le port s'ouvrant avant le refus). Constaté le même jour : la variable est posée en production.
- **Mise à jour (2026-10-18, restes reportés)** : les 8 gestes cosmétiques, les jetons, K-10, NF-6 et NU-2a ne sont définis nulle part dans le dépôt (pièce privée jamais versée). Arbitrage du responsable du même jour : ils restent au plan **en attente, sans date** ; la file A passe au lot suivant. J1-base ne se rouvre que sur leur définition.

#### H44 · R:Titre du Fil
- **Identifiant, piste** : R:Titre du Fil ; « Questionnaires à consulter » au-dessus du Fil ; cockpit ; file A.
- **Rang** : 2.
- **Portes, préalables** : S-4 (H02) ; N-6 ; même PR que le retrait d'« Héritage 4.0 » (L4, H43).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : titre servi.
- **Mise à jour (2026-10-18)** : titre livré seul, sans attendre L4. Le panneau en tête de l'accueil, au-dessus du Fil, s'intitule « Questionnaires à consulter » au lieu de « Inbox questionnaires » (réponse 9 de la séance du 2026-10-12). N-6 tenue : aucune PR de biologie ouverte ne touchait le Fil. Le regroupement avec L4 n'était qu'une économie (0,25 j au lieu de 0,5) ; or L4 attend une décision d'écran que la seule D-310 ne couvre pas : questions Q1, Q2, Q4, Q5 et Q8 de la pièce 17 (agenda, file des signalements et des droits, page Biologie, bouton « Synthèses » du téléphone, « Planifier le bilan »). Aucune base d'images ne capture l'accueil.

#### H45 · J2-alim : journal alimentaire de 21 jours
- **Identifiant, piste** : J2-alim ; relance du recueil de 21 jours, geste du responsable ; alimentation ; file A.
- **Rang** : 2 ; il garde son rang.
- **Portes, préalables** : J1-alim (H16) ; si migration : G-7, porte 9, rang 4 au plus tôt.
- **Migration, release-db** : [A verifier] ; la fiche du LOT-05 dit « sans migration Prisma ».
- **Décisions, textes** : aucune ; statut du LOT-05 posé en §9.
- **Critère de fin** : constat d'usage par identifiant, en agrégats ; D-JA-01 à 03 soldées ou routées vers ce plan.

#### H46 · ML-2, ML-3, ML-4, ML-6 : suites de l'aperçu médecin
- **Identifiant, piste** : ML-2, ML-3, ML-4, ML-6 ; suites de l'aperçu médecin, sous q et J2-med ; ML-5 est abandonné (§7) ; médecin ; file A.
- **Rang** : 2 [Hypothese], après J2-med (F38, rang 1) ; 5 au plus tôt si J2-med migre.
- **Portes, préalables** : q et J2-med (F38).
- **Migration, release-db** : [A verifier].
- **Décisions, textes** : sous q ; aucune neuve.
- **Critère de fin** : livrés, constatés.

#### H47 · be : gestes communs au catalogue d'actions
- **Identifiant, piste** : lettre be ; types manquants par contrat ; phase 5 Actions ; file A.
- **Rang** : 2 [Hypothese] : une lecture antérieure donnait « 1 au plus tôt », mais son préalable ag est au rang 1 (règle).
- **Portes, préalables** : ag (H25) ; porte 5 (F46) ; une fiche relue (porte 28).
- **Migration, release-db** : non [A verifier].
- **Décisions, textes** : liste de gestes avec provenance, une ligne par geste, de la main du responsable.
- **Critère de fin** : catalogue servi dans le constructeur, banc.

#### H48 · cc et LOT-12 : habillage de la saisie du sommeil
- **Identifiant, piste** : lettre cc.
- **Rang** : 2 au plus tôt [Hypothese].
- **Portes, préalables** : ca (H17) ; cb (H39) ; porte 16 (H27) ; nouvelles bornes de mesure datées ; place en file C, si elle compte comme une place : ordre de préparation après l'encart ; « compte-t-elle comme une place » reste à lire [A verifier].
- **Migration, release-db** : non ; aucun contrat v5 (`LOT-12-habillage-visuel.md:58`).
- **Décisions, textes** : aucune D-xxx hors ca ; statut du LOT-12 posé en §9.
- **Critère de fin** : saisie servie après le texte accepté ; constat sur un vrai dossier si c'est une place.
- **Mise à jour (2026-10-14)** : cc compte comme une place de la file C, après l'encart bd : arbitrage du responsable du 2026-10-14 (handoff de la PR 2, #1419), écrit par D-288 §3 (#1430) ; la porte 18 s'applique (« 18 si place »). Rang et préalables inchangés.

**File B**

#### F03 · BP-09 : annulation d'un résultat, ajout seul
- **Identifiant, piste** : BP-09 ; annuler un résultat par ajout, motif fermé ; parcours.
- **Rang** : 2 ferme ; release-db au rang 3, après celle de D-281 constatée le 2026-10-13 et avant l'essai de restauration (porte 8).
- **Portes, préalables** : S-1 reste un constat, non une porte pour ce lot : la condition « premier import » sort des préalables ; F02, clos le 2026-10-14 (#1438 ; S-5 retiré le 2026-10-21 : D/11) ; fiche BP-09 écrite avant ouverture, fichiers listés (porte 28) ; release-db de D-281 constatée (une migration en vol).
- **Migration, release-db** : oui ; première migration de biologie ; sa release-db suit celle de D-281, mergée le 2026-10-13 (#1408) : ce fait amende « BP-09 d'abord » de G-6.
- **Décisions, textes** : D-xxx du lot amendant D-124 §3 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:375`) ; elle dit que la condition « premier import » sort des préalables.
- **Critère de fin** : release-db constatée par conteneur ; résultat annulé exclu des élections, séries et réveils ; puis code consommateur.
- **Mise à jour (2026-10-14)** : fiche du lot écrite, fichiers listés, validée par le responsable (`lots/LOT-09-annulation-resultat.md`, #1442) : préalable « fiche BP-09 » de la porte 28 tenu. Le lot part en deux PR, migration seule puis code. Avant le merge de #1448, le 2026-10-14, aucune migration ni aucun code n'existaient : le lot restait à faire, release-db au rang 3 (porte 9).
- **Mise à jour (2026-10-14, migration)** : PR 1 (migration seule) mergée le 2026-10-14 sous D-294 (#1448), après deux passes Codex (la seconde sur la tête finale, faite par le responsable) et la revue CodeRabbit ; release-db à approuver hors usage, dans la foulée du merge (tant qu'elle n'est pas appliquée, un effacement de dossier échoue sur la table absente, sans rien effacer à moitié), puis constat par conteneur, puis PR 2 (code consommateur).
- **Mise à jour (2026-10-14, release-db)** : seconde passe Codex sur la tête finale de #1448 rendue « accepter » ; release-db approuvée hors usage, run 38612283121 vert, sentinelle liée ; constat par conteneur : migration appliquée en une tentative, aucune non aboutie, table présente sous RLS, triggers `resultats_biologiques_unicite_mesure` et `resultats_biologiques_correction_avant_insertion` présents, ancien index retiré (one-off-204) ; base à jour sur l'image 39a1d1d3 (`migrate status`, one-off-4921). M-5 (2/2) fait ; l'effacement d'un dossier retrouve sa table. Suite : PR 2, code consommateur.

#### F14 · Fiche LOT-25 : « quatre termes »
- **Identifiant, piste** : correction de la fiche LOT-25 de BIO-PARCOURS ; parcours.
- **Rang** : 2 proposé [Hypothese], file B, avec J1-base.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx ; D-273 inchangée.
- **Critère de fin** : fiche corrigée, cases cochées, T1 vert.
- **Mise à jour (2026-10-17)** : fait le 2026-10-14 (fiche LOT-25, mention « Fiche corrigée le 2026-10-14 (plan §9, fiche F14) »).

**File C**

#### H49 · bb : lecture des trois plans par le patient
- **Identifiant, piste** : lettre bb ; protocole ; geste du responsable (intitulés), puis file C.
- **Rang** : 2 au plus tôt [Hypothese], par ses préalables ; une ouverture, servie au-delà de la place 11, dans l'ordre de préparation après l'encart.
- **Portes, préalables** : ba (H35) ; texte patient accepté ; porte 18.
- **Migration, release-db** : non [A verifier].
- **Décisions, textes** : lettre bb ; intitulés des trois plans, de la main du responsable.
- **Critère de fin** : texte accepté ; activation constatée sur un vrai dossier.

**File D : gestes du responsable**

#### H50 · G-8 : préalables communs prêts
- **Identifiant, piste** : G-8 ; confiance ; geste du responsable.
- **Rang** : 2.
- **Portes, préalables** : k (F77) ; l (D-283) ; u (H37).
- **Migration, release-db** : non.
- **Décisions, textes** : textes de la main du responsable.
- **Critère de fin** : textes prêts, rien d'activé ; ACT-1 et ACT-3 les consomment ; lève la porte 13 avec k et u.
- **Mise à jour (2026-10-14)** : fait. Les trois préalables communs sont prêts : CGU (k, D-292), Patient Hub (u, D-293), circuit des droits (procédure écrite et validée par le responsable, `docs/DOSSIER_RGPD.md` rubrique 9, qui ferme aussi le lot (f) de H26). La durée est celle de D-283 §2 ; la ligne de registre suit chaque lot (F70). Rien d'activé. Porte 13 levée ; elle ne couvre pas la demande reçue par e-mail d'une personne qui n'a plus accès au portail, renvoyée en dette au §8.

#### H51 · ai : accusé de lecture daté de « Mes échanges »
- **Identifiant, piste** : lettre ai (R:ai).
- **Rang** : 2 (décision, faite) ; code au rang 4 au plus tôt, après G-7 (porte 8).
- **Portes, préalables** : u (H37) ; k (F77) ; texte patient ; G-7 (porte 8), porte 9.
- **Migration, release-db** : oui (D-297 §6) : une colonne de type date, vide par défaut, sur `portail_lectures_patient` ; après G-7 (porte 8), puis porte 9.
- **Décisions, textes** : lettre ai, de la main du responsable ; sa D-xxx avant la place 3 ; lève la porte 14.
- **Critère de fin** : décision mergée ; lecture datée constatée côté praticien.
- **Contenu du lot de code** (D-297 §1 à §6) : la migration (une colonne de type date, vide par défaut) ; l'écriture du jour de la première lecture, en heure de Paris ; la phrase validée du §4 sur chaque page de document remis ; « lu le … » au dossier du praticien, « Lu, date non enregistrée » pour l'historique ; l'amendement du banc de garde qui interdit aujourd'hui toute lecture de la table côté praticien, seule la surface « lu le » y étant admise (§5).
- **Mise à jour (2026-10-14)** : arbitrage du responsable — seule la première lecture d'un document de « Mes échanges » est datée (« lu le … ») ; pas chaque ouverture, conformément au texte validé par D-293 §4. Les lectures du portail ne portent pas de date aujourd'hui : migration probable, à confirmer à l'écriture de la lettre.
- **Mise à jour (2026-10-14, D-297)** : décision écrite, trois arbitrages du responsable. La première ouverture d'une version remise est datée d'où qu'elle vienne (page du document, fil du jour ou « Mes échanges ») ; le jour seul en base, en heure de Paris ; « Lu, date non enregistrée » pour les lectures antérieures, sans rattrapage. La phrase « Votre lecture est datée » s'étend à toute page de document remis : texte du §4 validé tel quel par le responsable. Porte 14 levée ; reste le code, au rang 4 au plus tôt, après G-7.
- **Mise à jour (2026-10-18, migration)** : migration autorisée par le responsable le 2026-10-18 et écrite : `20261018150000_portail_lectures_lu_le_v1`, une colonne `lu_le` de type date, nullable, **sans défaut**. Un défaut en base daterait les lectures avant que la phrase soit servie (§4). Deux triggers (arbitrage du même jour) : toute date fournie est remplacée par le jour de l'horloge de la base, et le jour ne se pose, ne se corrige ni ne s'efface après coup. Le contrat neuf `portail_lectures_lu_le_v1_negatif.sql` et le contrat de la table, amendé, passent au CI. La PR est seule. Restent : merge, release-db approuvée, sentinelle, constat par conteneur ; puis le code (seconde PR), qui demandera un jour avec la phrase sur chaque page de document remis, plus « lu le » au dossier praticien et l'amendement du banc de garde.
- **Mise à jour (2026-10-18, migration appliquée, code)** : #1547 mergée (89f7e0d4) après passe Codex (accepter) et revue CodeRabbit ; release-db 39134432362 approuvée, migration appliquée par one-off-551 (sentinelle `WN_RELEASE_DB_OK id=39134432362-1`, une tentative), `migrate status` à jour par one-off-7055 (120 migrations) ; le run finit rouge par sa garde anti-recul, voulue (tête dépassée par #1548). Seconde PR : la phrase en tête de chaque page qui date (protocole compris), l'écriture du jour, l'encart praticien « Documents remis » et les deux gardes ; quatre arbitrages du responsable consignés en amendement de D-297. Reste après merge : constat du premier jour écrit sur un dossier de test, par conteneur. Le bilan et la synthèse consignaient leur lecture au montage de la page, même sans document rendu (LOT-08) : corrigé dans la PR 2 (#1552), la consignation et l'avis vivent sur la branche de rendu réussi de `MonBilan` et `ComprehensionView`.

### Rang 3

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| J2-jourN | « Jour N sur 21 », ancre unique | A | 6 | non | H52 |
| aj | encadré « Envisagé ensuite », pour le responsable seul | A | 15 ; 9 si table | selon | H53 |
| cd | rituel du soir rattaché au protocole | A | 15 ; 9 si migration | selon | H54 |
| ce | comptes des facteurs et de la forme | A | 6, 16 | non | H55 |
| au | drapeaux du sommeil à l'écran, source et date | A | 16, 6 | non | H56 |
| J3-bandes | 1 à 3 instruments de plus | A | 11 | non | H13, rang 0 |
| J1-cockpit | la provenance sous chaque chiffre | A | 6 | non | F59, rang 1 |
| D-281, M-1 | signature de SAF-EI-01 amendée | geste | 7 | non | F66, rang 1 |
| M-5 (2/2) | release-db de BP-09 approuvée, constatée (fait le 2026-10-14) | geste | 9 | oui | F03, rang 2 |
| G-3 | liste NABM étendue | geste | 10 | non | F54, rang 0 |
| y | comptes du cabinet sous un effectif de cinq | geste | 6 | non | H58 |
| al | axes alimentaires sourcés, bande par axe | geste | 4, 28 | non | H57 |

**File A**

#### H52 · J2-jourN : « Jour N sur 21 »
- **Identifiant, piste** : J2-jourN ; cockpit ; file A.
- **Rang** : 3.
- **Portes, préalables** : d (H32) ; o (H30) ; porte 6 (M-2, F59).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre o appliquée.
- **Critère de fin** : une seule date de départ partout, banc.

#### H53 · aj : encadré « Envisagé ensuite »
- **Identifiant, piste** : lettre aj (R:aj) ; protocole ; file A.
- **Rang** : 3 ; 4 au plus tôt si une table se confirme.
- **Portes, préalables** : ad (H34) ; d (H32) ; porte 15 (rang 2 au plus tôt) ; si table : G-7, porte 9.
- **Migration, release-db** : non, ou oui si table.
- **Décisions, textes** : lettre aj, de la main du responsable.
- **Critère de fin** : champ hors projection patient, banc.

#### H54 · cd : rituel du soir rattaché au protocole
- **Identifiant, piste** : lettre cd ; tout contrat neuf lit v1 à v4 (D-272 §3) ; hors LOT-12 ; sommeil, protocole ; geste du responsable (échelle), puis file A.
- **Rang** : 3 au plus tôt, 4 si migration [Hypothese].
- **Portes, préalables** : ca (H17) ; porte 15 [Hypothese] ; D-xxx de recueil ; si migration : G-7, porte 9.
- **Migration, release-db** : selon.
- **Décisions, textes** : lettre cd ; D-xxx de recueil et échelle, de la main du responsable.
- **Critère de fin** : contrat v5 servi ; agendas en cours finis sous leur version.

#### H55 · ce : comptes des facteurs et de la forme
- **Identifiant, piste** : lettre ce ; « non renseigné », jamais 0 ; sommeil ; file A.
- **Rang** : 3 au plus tôt [Hypothese].
- **Portes, préalables** : porte 6 (F59) ; porte 16 (H27).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune règle clinique neuve.
- **Critère de fin** : banc de dénominateur.

#### H56 · au : drapeaux du sommeil à l'écran
- **Identifiant, piste** : lettre au.
- **Rang** : 3 au plus tôt [Hypothese].
- **Portes, préalables** : porte 16 (H27) [A verifier : fichiers de la frise et des repères] ; D-280 ; c et porte 6 (F59) ; registre avant le site IA (F70).
- **Migration, release-db** : non [A verifier].
- **Décisions, textes** : lettre au, D-xxx clinique et fragment `changelog.d/`, de la main du responsable ; description tirée des sources de D-280.
- **Critère de fin** : drapeaux visibles avec source et date ; consigne versionnée.

**File D : gestes du responsable**

#### H57 · al : axes alimentaires
- **Identifiant, piste** : lettre al (R:al) ; alimentation ; geste du responsable.
- **Rang** : 3.
- **Portes, préalables** : J2-alim servi, constat (porte 28 ; H45) ; porte 4 (H08).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre al, de la main du responsable.
- **Critère de fin** : définition et bande signées.

#### H58 · y et J3-cabinet : comptes du cabinet
- **Identifiant, piste** : lettre y (D-y, R:y), puis J3-cabinet.
- **Rang** : y au rang 3 ; J3-cabinet au rang 4.
- **Portes, préalables** : y : d (H32), porte 6 (F59), effectif (F25) ; J3-cabinet : y ; si migration : G-7, porte 9.
- **Migration, release-db** : J3-cabinet : [A verifier].
- **Décisions, textes** : lettre y, de la main du responsable ; « cinq dossiers » ou « cinq cycles » se règle dans F25 : cinq dossiers distincts (D-298).
- **Critère de fin** : page masquée en banc sous cinq.

### Rang 4 : première vague de migrations après BP-09

L'ordre des release-db de ce rang suit la hiérarchie : EF-3b (h1), puis BP-12a, BP-11, BP-13, BP-15, CC-8, axes [Hypothese], BF-8, la collecte, D-283 (b) [Hypothese], le retrait de la colonne NIR (D-284 lot g) [Hypothese], ai (D-297 §6), selon les cas J2-med et le statut posé ; une à la fois, sentinelle, constat par conteneur, déploiement constaté avant le merge suivant. Amendé par D-315 §6-7 (2026-10-15) : CC-8 passe dès que sa migration est prête, sans attendre les migrations de la file B, quand aucune autre release-db n'est en vol ; elle précède ai, sur la même table. La file du G3 (D-282 lot 2) est passée le 2026-10-13 (#1412), avant BP-09 et avant l'essai, par le fait.

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| J2-base | palier 1, alerte hébergeur, EF-3b, NF-7 | A | 8, 9, 12, 16, 21 ; lève 24 | oui (EF-3b) | H59 |
| p, J2-cc8 | journal de lecture du protocole | A | 8, 9 | oui | H60 |
| J3-base | point d'étape, frise, repères, complétude | A | 16 ; 9 pour BF-8 | selon | H61 |
| J3-collecte | collecte documentaire : table, dépôt, classement | A | 8, 9, 17 | oui | H62 |
| cg | ses nuits par semaine, sans chiffre | A | 16 ; 18 à l'ouverture | non | H63 |
| E67 | lot accessibilité | A | aucune | non | H64 |
| J2-nf5 | deux versions de score comparées | A | 20 | non | H65 |
| cf | indices de clôture côte à côte | A | 20, 11 | non | H66 |
| J3-cabinet | page des comptes du cabinet, masquée sous cinq | A | 6 ; 9 si migration | selon | H58, rang 3 |
| D-281, J1-sécu | commit de signature, déploiement constaté | A | lève 7 | non | F66, rang 1 |
| D-283 (b) | clôture après 5 ans sans contact, archive | A | 28, 8, 9 | oui | H26, rang 1 |
| ai, code | lecture datée : migration, écriture du jour, phrase sur chaque page, « lu le » au praticien, banc de garde amendé | A | 8, 9 | oui | H51 |
| D-284 (g) migration | retrait de la colonne NIR (0 NIR enregistré, D-284 §3) ; **fait le 2026-10-20** (#1581, release-db constatée) | A | 8, 9 | oui | H26, rang 1 |
| BP-12a | fiches d'usage | B | 8, 9, 23 | oui | F05 |
| BP-11 | constats du praticien | B | 8, 9 | oui | F06 |
| BP-13 | données physiologiques, traitements en cours | B | 8, 9 | oui | F07 |
| BP-15 | décisions de parcours | B | 8, 9 | oui | F08 |
| BP-03 | série par analyte | B | aucune | non | F15 |
| BP-04 | attente typée, analyteCodes sur l'exploration | B | aucune | non | F16 |
| axes, PR 3 | référentiel d'axes : migration | B | 8, 9 | oui | F52 |
| statut posé | statut posé et deux marques datées | B | 9 | oui (D-322 §4) | F58 |
| BF-7, BF-8 | code d'acte et courrier de remboursement | B | 10, 8, 9 | oui (BF-8) | F55, rang 0 |
| onglet Biologie | BF-1, BF-3 façade A, avec J2-base | B | 12, 9, 24 | non | F57, rang 0 |
| commentaires | commentaires du laboratoire sous la série | B | aucune | non | F60, rang 0 |
| J2-med, si migration | aperçu médecin, version avec migration | B | 8, 9 | selon | F38, rang 0 |
| analyses groupées | composition des groupes et opérandes des calculés (D-323) | A | 9 | oui (D-323) | F80 |

**File A**

#### H59 · J2-base, part hors biologie : le palier 1
- **Identifiant, piste** : J2-base, part hors biologie ; BF-1, BF-3 et l'onglet Biologie sont F57 ; plateforme, cockpit ; file A.
- **Rang** : 4.
- **Portes, préalables** : j (F63), g (F04), k (F77), l (D-283), m (H10), n (H11), s (F57) ; G-7 (porte 8) ; porte 9 (BP-09 constaté, F03) ; J1-cockpit pour CC-0 (F59) ; f pour BF-3 (F54) ; porte 21 pour OF-2 ; porte 16 pour sommeil et hex [A verifier].
- **Migration, release-db** : 1 migration (EF-3b), en tête du rang 4 par la hiérarchie h1.
- **Décisions, textes** : lettres j, m, n, g appliquées.
- **Critère de fin** : palier 1 sorti (porte 24) ; release-db d'EF-3b constatée.
- **Mise à jour (2026-10-15, D-315)** : état sur origin/main : j (D-306), g, k, l, m (D-303), n (D-304), s (D-308) écrites ; portes 8, 9, 12 levées ; release-db d'EF-3b constatée (H11). Restent : J1-cockpit pour CC-0 (chaîne S-2, puis c et d, puis M-2 et porte 6, porte 4 pour c ; S-2 non ouverte) ; porte 16 pour sommeil et hex (au plus tôt après le 2026-11-12) ; porte 21, constatée à la revue de la PR d'OF-2 elle-même ; f pour BF-3 (F57). ACT-1 n'attend plus J2-base (D-315 §5).

#### H60 · p et J2-cc8 : journal de lecture du protocole
- **Identifiant, piste** : lettre p (D-p), puis J2-cc8 ; journal de lecture du protocole (CC-8) ; amende le CHECK `portail_lectures_patient` ; protocole ; file A.
- **Rang** : 4.
- **Portes, préalables** : G-7 (porte 8) ; porte 9 (BP-09 constaté).
- **Migration, release-db** : oui, 1 ; au rang 4, après EF-3b (constatée) ; dès qu'elle est prête, sans attendre BP-12a ni la file B, quand aucune autre release-db n'est en vol, et avant ai (D-315 §6-7).
- **Décisions, textes** : lettre p, registre.
- **Critère de fin** : release-db constatée ; lecture tracée, constatée en conteneur.
- **Mise à jour (2026-10-15)** : p écrite par D-315 sur arbitrages du responsable : la première ouverture du détail de chaque version diffusée du protocole (identifiant de la diffusion approuvée en vigueur) s'enregistre, sans date ; ni l'affichage de l'accueil ni la connexion ; le praticien lit « Lu le … » avec le code de ai (D-297 §5), constat par conteneur d'ici là ; aucun texte patient neuf (§4) ; espèce déclarée au registre (`docs/DOSSIER_RGPD.md`, rubrique 5). Ordre tranché (§6-7) : la release-db passe dès que la migration est prête, sans attendre BP-12a ni la file B, et avant ai. L'ouverture du détail et sa trace se servent avec ACT-1 (H70). Reste : la migration (une espèce au CHECK), sur demande, puis le code.
- **Mise à jour (2026-10-16)** : migration demandée par le responsable et écrite : `20261016080000_portail_lectures_protocole_v1` (espèce `protocole` au CHECK, une instruction), contrat `portail_lectures_protocole_v1_negatif.sql` au CI, en PR seule. Reste : merge, release-db approuvée, sentinelle, constat par conteneur ; puis le code (seconde PR).
- **Mise à jour (2026-10-16, release-db et code)** : #1490 mergée (2086fa7b), release-db constatée (porte 9). Code en seconde PR, sous `WN_PORTAIL_LECTURE_PROTOCOLE`, éteint à la livraison (accueil inchangé, déplié comme avant). Drapeau ouvert : accueil replié tant que la version n'est pas ouverte (titre, raison, axe ; actions et critère dans le détail), « Voir le détail de mon protocole », version lue dépliée d'office, déplié d'office sans trace si une action est en pause (D-315 amendée le 2026-10-16) ; trace par la `cycleRef` reçue avec la vue, diffusion résolue par le serveur. Critère de fin restant : lecture tracée, constatée en conteneur, au service d'ACT-1 (H70).
- **Constat (2026-10-17, peu après minuit, activation)** : `WN_PORTAIL_LECTURE_PROTOCOLE=true` posé en production à 00 h 24 (Paris), aucun déploiement en cours, puis redémarrage. Lecture par conteneur, en agrégat : aucune lecture de protocole avant l'ouverture ; trois dossiers actifs portaient alors une diffusion en vigueur. Six minutes après le redémarrage, **une première lecture tracée** sur un vrai dossier : une ligne d'espèce `protocole`, dont l'objet est la diffusion en vigueur (tête non supplantée) du même dossier ; aucun objet introuvable ; aucun avertissement ni erreur applicatif dans les journaux après le redémarrage. **Critère de fin atteint** (l'identifiant n'est pas consigné ici). La date de première lecture reste à venir avec ai (D-315 §7, D-297 §6) : la ligne restera sans date.

#### H61 · J3-base, part hors biologie
- **Identifiant, piste** : J3-base, part hors biologie ; BF-7 et BF-8 sont F55 ; protocole, cockpit, sommeil ; file A.
- **Rang** : 4.
- **Portes, préalables** : t (H31) ; ab (H14) ; u (H37) ; porte 16 (H27) ; règle N-8.
- **Migration, release-db** : selon ; la migration du lot est BF-8 (F55).
- **Décisions, textes** : lettres t, ab, u appliquées ; décision de produit pour la frise.
- **Critère de fin** : « Mes échanges » prêt, non ouvert ; frise et repères servis après la porte 16.
- **Mise à jour (2026-10-17, lettre t)** : D-317 §4 retire l'e-mail de diffusion (PA-2) de J3-base : lot propre, sans migration, au service d'ACT-2 (H75). J3-base garde PA-1 (la ligne « rendez-vous de suivi » des trois points d'étape, D-317 §6) et la carte du Fil renommée avec sa baseline (D-317 §7) ; ni l'un ni l'autre n'est gelé par la porte 16, qui ne vise que la frise et le chronogramme du sommeil (N-8).
- **Mise à jour (2026-10-18, première tranche)** : PA-1 et la carte du Fil livrés, sans migration. Au portail, une ligne « Répondre à mon rendez-vous de suivi » paraît dans le fil du jour pendant la fenêtre de chaque point d'étape, d'après la route du check-in. Libellé validé par le responsable. Rien ne s'affiche pour un dossier mineur ou clos. Au Fil, la carte J21 porte le badge « Point d'étape » et son titre de D-317 §7 ; le résumé dit « point d'étape » (arbitrage du 2026-10-17). Base visuelle : aucune à régénérer. La capture `dashboard-fil` n'est pas comparée au pixel (`pixel: false`), et le seed ne produit aucune carte J21. Restent dans J3-base : « Mes échanges » (u), EF-0 (ab), la frise et les repères (porte 16, N-8).
- **Mise à jour (2026-10-18, « Mes échanges »)** : la page et sa route en lecture seule sont livrées, prêtes et fermées, sans migration, derrière `WN_PORTAIL_MES_ECHANGES` (neuf, éteint). Forme arbitrée par le responsable : une liste, le plus récent en haut, « Remis » ou « Transmis » suivi de l'objet, et un lien dans « Autres espaces ». L'encart et les cinq blocs sont ceux de D-293. Seuls les dossiers majeurs y ont accès. Le bloc « lecture datée » et l'ouverture attendent ai (H51). Avant ACT-3, il reste à relire deux micro-textes d'état et la limite « protocole indisponible ». Restent dans J3-base : EF-0 (ab), la frise et les repères (porte 16, N-8).
- **Mise à jour (2026-10-18, EF-0 et ai)** : EF-0 (ab) est servi par L4 et L5 (#1546, D-324, qui amende D-310 §1) : l'étiquette « 4.0 » a disparu, l'atelier de validation ferme le groupe de la Bibliothèque et « Connaissances » a son entrée, distincte de la signature. ai est livrée (#1547, #1552) : « Mes échanges » sert désormais le bloc « Votre lecture est datée » de D-297 §4. **Reste dans J3-base : la frise et les repères (porte 16, N-8).** « Mes échanges » est prêt et fermé ; son ouverture est ACT-3 (H76), après ACT-2 constatée. Relecture faite le 2026-10-18 : les deux micro-textes d'état (« Chargement de vos échanges… », « Aucun élément pour le moment. ») sont validés tels quels, et la limite « protocole indisponible » est acceptée (le journal le dit remis, l'accueil explique l'indisponibilité).
- **Mise à jour (2026-10-18, écarts de PA-1)** : deux écarts relevés à la livraison de PA-1 n'avaient pas d'adresse. (1) « Garde d'âge absente du POST du rendez-vous de suivi et du compagnon » : **écarté, ce n'est pas un écart**. L'arbitrage du responsable du 2026-10-14 (D-284 §3, lot (h)) limite la pause aux questionnaires, agendas compris, et à la biologie. Le suivi du protocole reste ouvert, comme le dit `lib/patient/gardeAge.ts`. Seule la ligne du fil du jour est masquée pour un mineur ou un dossier clos. (2) La ligne « rendez-vous de suivi » du fil du jour reste fermée environ 24 heures entre deux points d'étape : **routée ici**. Les fenêtres de `checkinDomain.ts` se jugent en jours fractionnaires (|j − 7| ≤ 3, puis |j − 14| ≤ 3) : la première ferme au jour 10, la suivante n'ouvre qu'au jour 11. Une fenêtre ne change pas sans décision (D-317 §6).

#### H62 · J3-collecte : collecte documentaire
- **Identifiant, piste** : J3-collecte (RK-8) ; D-258 reste à la biologie ; confiance ; file A.
- **Rang** : 4.
- **Portes, préalables** : l (D-283) ; u (H37) ; G-11 (H38) ; G-7 ; porte 9 (BP-09 constaté).
- **Migration, release-db** : oui, 1 ; après CC-8 et avant BF-8 (D-330 §3, qui déroge à la hiérarchie).
- **Décisions, textes** : texte de collecte, de la main du responsable.
- **Critère de fin** : release-db constatée ; dépôt prêt, non ouvert.
- **Mise à jour (2026-10-18, migration)** : la décision est écrite (D-330), sur sept arbitrages du responsable du jour (quatre avant la migration, trois après sa relecture). (1) Le patient propose une catégorie, le praticien la corrige, chaque correction datée. (2) Un retrait efface le contenu et garde la ligne. (3) Les dépôts paraissent sous « Transmis » dans « Mes échanges » (amende D-293). (4) Les bornes sont celles du compte rendu. (5) Un doublon est refusé. (6) Seule la première consultation est tracée. (7) Un retrait ne désigne pas la demande de droit qu'il traite. La migration `documents_deposes_patient_v1` crée deux tables, les documents et leurs classements. Elle vient avec son contrat négatif (quatorze promesses, 34 mutations toutes tuées), l'effacement nommé, un banc qui borne les écrivains et la déclaration RGPD. Elle précède BF-8, comme ai et F38. Reste : release-db constatée, puis la PR du code sous drapeau éteint (dépôt, écran du praticien, ligne « Transmis »).
- **Mise à jour (2026-10-19, release-db constatée)** : #1572 mergée (8d04e9f5). Le run `release-db` 39290340495 a écrit sa sentinelle `WN_RELEASE_DB_OK` ; il finit rouge par la garde anti-recul, la tête de `main` ayant avancé (#1577, sans migration). Constat par conteneur : migration enregistrée sans rollback, aucune migration inachevée, deux tables sous RLS sans policy, six triggers, aucune ligne. Production à la tête de `main` (9f25ff24). **Critère de fin du lot de migration atteint.** Reste : la PR du code sous drapeau éteint, selon les prescriptions de D-330 §4.
- **Mise à jour (2026-10-19, code)** : PR du code sous `WN_PORTAIL_DEPOT_DOCUMENTS`, éteint. Elle livre la route et la page de dépôt, l'encart « Documents déposés par le patient » du cockpit (ouvrir, corriger la catégorie, retirer) et la ligne « Transmis · Document déposé » de « Mes échanges ». Les prescriptions de D-330 §4 sont tenues : plafonds rejugés sous le verrou du dossier en READ COMMITTED, listes sans `contenu`, consultation conditionnelle, erreurs journalisées par classe et code. Banc sur base réelle en CI. L'écran du praticien n'est pas soumis au drapeau : il ne lit que ce qui a été déposé. **Critère de fin atteint au merge et au déploiement constaté : dépôt prêt, non ouvert.** À valider avant ACT-4 (H77) : les libellés neufs de l'écran de dépôt, le bloc « Ce que vous trouvez ici » de « Mes échanges » (il ne nomme pas les documents déposés) et la version de « Vos données personnelles ».

#### H63 · cg : ses nuits par semaine
- **Identifiant, piste** : lettre cg ; écrite dans J3-base (frise, repères, complétude) ; sommeil ; file A (code), puis file C (ouverture).
- **Rang** : 4 ; ouverture en file C au-delà de la place 11, dans l'ordre de préparation après l'encart.
- **Portes, préalables** : porte 16 (H27) ; règle N-8 ; garde de gamification relue [A verifier] ; porte 18 pour l'ouverture.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre cg, registre ; la phrase de tendance en fin d'agenda relève de ch (H72, rang 5 au plus tôt) ; la frise elle-même reste sans chiffre, courbe ni flèche.
- **Critère de fin** : frise par semaine servie, sans chiffre, courbe ni flèche ; ouverture constatée sur un vrai dossier.

#### H64 · Lot accessibilité
- **Identifiant, piste** : E67 ; transverse ; file A.
- **Rang** : 4 [Hypothese], avec J2-base.
- **Portes, préalables** : aucun préalable de rang ; se joue avec J2-base (H59), même rang, sous la règle de frontière commune.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : passe réelle jouée ; contrôles visuels verts.
- **Mise à jour (2026-10-21)** : arbitrage du responsable : la passe au lecteur d'écran sur appareil physique est un geste humain, requalifié en file D ; l'assistant prépare le parcours à suivre et la grille de constat. Parcours et grille versés : `docs/PASSE_ACCESSIBILITE_E67.md` (8 étapes, 4 postes, 9 critères).

#### H65 · J2-nf5 : comparer deux versions de score
- **Identifiant, piste** : J2-nf5 ; cockpit ; file A.
- **Rang** : 4 [Hypothese] : une lecture antérieure disait 3, mais la porte 20 se lève au plus tôt au rang 3, après J2-mom (règle).
- **Portes, préalables** : J2-mom (H30) ; porte 20 (K-11).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : une paire réelle constatée, puis écran servi.

#### H66 · cf : indices de clôture côte à côte
- **Identifiant, piste** : lettre cf ; sommeil ; file A.
- **Rang** : 4 [Hypothese] : une lecture antérieure disait « 3 au plus tôt », mais la porte 20 se lève au plus tôt au rang 3 (règle).
- **Portes, préalables** : porte 20 ; porte 11 pour tout mot.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune règle clinique neuve ; règles de comparaison acquises (D-152).
- **Critère de fin** : deux agendas clos comparés selon D-152.

#### F80 · Analyses groupées et valeurs calculées : composition
- **Identifiant, piste** : retour du responsable du 2026-10-17 (« il faut réfléchir aux analyses groupées qui ne sont pas répertoriées ») ; D-320 §4 ; catalogue biologie et NABM ; file A.
- **Rang** : 4 proposé [Hypothese] (migration) ; indépendant de F53.
- **Inventaire au 2026-10-17 (dépôt, sans base)** :
  - aucune composition entre analytes : un groupe est une fiche `biology_analytes` unique, sans composants ;
  - groupes du catalogue et classement de la liste M-3b (V105) : NFS (1104) et ionogramme (1609) en `isole`, comme si l'acte ne cotait que cette fiche ; profil lipidique (0996, acte « exploration d'une anomalie lipidique ») « à juger » ; bilan hépatique seul en « regroupement » (composants cotés un à un, cités en texte seulement) ; les constituants de l'hémogramme et de l'ionogramme sont en `groupe_et` sur le même acte que leur groupe, sans lien entre analytes ;
  - valeurs calculées : sept (HOMA, cortisol/DHEA, non-HDL, DFG, AA/EPA, kynurénine/tryptophane, zinc/cuivre), sans opérandes ; le LDL calculé est classé à part (« à juger », 0996), à recaler sur les sept ou à motiver ;
  - `BIO_AG_ERYTHROCYTAIRES` (« statut des acides gras ») : un profil, classé « aucun acte » ; statut de groupe à trancher ;
  - `BiologyRatio` (opérandes A et B) : modèle présent, table vide et lue par aucun écran ;
  - `codeIncompatible` et `regleApplicable` des actes : importés tels quels (V105), lus par aucun code ; seules les règles de cumul de la source diraient quels actes se facturent ensemble ;
  - groupes courants absents du catalogue (bilan thyroïdien, exploration lipidique complète…) : à lister depuis la V105, par la recherche par libellé (D-320 §1).
- **Options de modèle (tranchées par D-323 : une table neuve pour les deux, jamais `BiologyRatio` ; le marquage sort en donnée par le type de la composition)** : (1) composition groupe → composants, une table neuve ; (2) opérandes des calculés, dans `BiologyRatio` (deux opérandes et une constante) ou une table neuve (le DFG dépend aussi de l'âge et du sexe) ; (3) marquage groupe ou calculé en donnée, qui sort de `candidatsNabm.ts` ce que l'écran de signature ne sait que par la liste.
- **Questions au responsable (répondues le 2026-10-17 et le 2026-10-18, D-323 ; ne se reposent pas)** : un groupe se propose-t-il comme une ligne ou par ses composants ? une correspondance `isole` vers un acte de groupe se recale-t-elle (NFS, ionogramme, profil lipidique) ? un calculé hérite-t-il du remboursement de ses opérandes, et le dit-on ? quels groupes absents entrent au catalogue ?
- **Portes, préalables** : porte 9 ; arbitrages ci-dessus ; aucune donnée sans signature du responsable (règle des liens signés, D-296).
- **Migration, release-db** : oui (D-323) — deux tables neuves en ajout seul (composition signée et ses éléments) et sept fiches d'analyte ; porte 9.
- **Décisions, textes** : D-323 (amende D-320 §4) ; D-326 (amende D-323 §3).
- **Critère de fin** : composition en base, constatée par conteneur ; l'écran de signature et la fiche d'analyte la disent.
- **Mise à jour (2026-10-18, D-323)** : inventaire vérifié (dépôt, et V105 relue par conteneur, catalogue seul) : quatre constats « aucun acte » signés, dont les acides gras érythrocytaires (leur statut n'est plus à trancher) ; `biology_ratios` écarté (deux opérandes et une constante : ni le DFG, ni les soustractions, et une constante serait un nombre clinique sans provenance) ; les bilans gelés proposent la NFS et l'hémoglobine côte à côte. Arbitrages du responsable : un groupe fait une ligne, ses constituants dessous ; un constituant seul sans acte propre est proposé par son groupe ; un calculé hérite du remboursement de ses mesures et le dit ; le LDL calculé reste constituant de 0996 ; sept fiches entrent (T4 libre, T3 libre, ionogramme complet, bicarbonates, protides, bilirubine, phosphatases alcalines). Composition = quels analytes, jamais une formule ; signée par le praticien sur liste préparée. Suite : migration seule, release-db constatée, puis code (composition et signature, puis proposition). Alias d'import des sept fiches : hors F80, résolveur signé.
- **Mise à jour (2026-10-18, D-323, code)** : PR 1 (migration, #1540) mergée, release-db appliquée et constatée par conteneur (deux tables vides, 92 analytes, RLS active) ; PR 2 (#1541) : liste préparée, signature et retrait sur la fiche d'analyte ; PR 3 : la proposition, le courrier, le document patient, l'écran de la proposition et la fiche d'analyte lisent les compositions signées — un groupe fait une ligne avec son acte, ses constituants dessous ; un constituant seul remboursable seulement accompagné est remplacé par son groupe (« demandée pour ») ; un calculé ou un regroupement hérite du statut le plus faible de ses mesures et le dit (« remboursé par ses mesures (…) »). Sans composition signée, la sortie est inchangée (bancs de contre-épreuve). Critère de fin : côté code, atteint ; côté données, il attend la signature des compositions par le responsable, à l'écran (geste de file D). Alias d'import : dette au §8.
- **Mise à jour (2026-10-18, D-326)** : les neuf compositions sont signées et constatées par conteneur (un signataire, aucune retirée) — critère de fin atteint. Les quatre actes de groupe ont été signés « groupe imposé », ce qui disait l'analyse groupée remboursable seulement accompagnée : ils restent à re-signer en « acte isolé » par le responsable (D-326 §3, geste de file D, à faire), et la fiche d'une analyse groupée le dit. Arbitrage « les deux » : un constituant tient l'acte de son groupe signé sans correspondance propre (§1) ; les correspondances préparées restantes se signent en lot, tout ou rien, depuis le rayon (§2). Geste suivant du responsable : re-signer les quatre actes, puis la signature en lot (actes isolés des constituants, glycémie, insuline, créatinine, cuivre, bilan hépatique) ; constat par conteneur ensuite.

**File B**

#### F05 · BP-12a : fiches d'usage
- **Identifiant, piste** : BP-12a ; parcours.
- **Rang** : 4 (J2-bio).
- **Portes, préalables** : signatures de BP-07 ; G-7 (porte 8) ; BP-09 constaté (porte 9) ; contenus signés dans le lot (porte 23).
- **Migration, release-db** : oui ; rang 4, premier de la chaîne après BP-09.
- **Décisions, textes** : D-xxx du lot étendant D-251, garde « aucune phrase », population par usage (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:377`) ; constante « fiches validées par séance » chiffrée si le lot la lit [Hypothese] (`docs/DECISIONS.md:1629-1636`).
- **Critère de fin** : release-db constatée ; validation par acte daté ; hook DC-17 étendu à la structure.
- **Mise à jour (2026-10-16)** : les dossiers du besoin 2 autres que le fer (H15, lettre w, D-312) ajoutent leurs fiches à la même question, en lots de contenu après la clôture de chaque dossier ; le lien claim → analyte reste dans la structure de la fiche (arbitrages du 2026-10-16, H15).
- **Mise à jour (2026-10-17)** : migration #1488 appliquée et constatée le 2026-10-16 ; code #1498 mergé et déployé le 2026-10-16, structure vide, verrou éteint ; `WN_FICHES_USAGE_VALIDATEURS` posée en production le 2026-10-16. La structure s'écrit et se signe en une fois quand les dossiers fer, vitamine D, zinc et magnésium érythrocytaire sont clos (D-314 §10, #1504) ; J3-12c (H15) précède la signature du dossier vitamine D.

#### F06 · BP-11 : constats du praticien
- **Identifiant, piste** : BP-11 ; parcours.
- **Rang** : 4 (J2-bio).
- **Portes, préalables** : BP-09, BP-12a (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:126`) ; portes 8 et 9.
- **Migration, release-db** : oui ; rang 4, après BP-12a.
- **Décisions, textes** : D-xxx d'objet ; D-122 précisée ; registre RGPD avant la table (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:388`).
- **Critère de fin** : release-db constatée ; contrat négatif ; correction ou annulation rend « à relire ».
- **Mise à jour (2026-10-19, D-331)** : fiche LOT-11 et six arbitrages du responsable : deux tables en ajout seul (constat, pièces) ; pièces = résultats de biologie et réponses de questionnaire, par clé ; quatre verdicts, motif fermé hors « confirmée » (neuf codes), note facultative ; date « à revoir le » facultative, fixée par le praticien ; « à relire » dérivé à la lecture (correction, annulation, invalidation, prélèvement ou passation plus récents, date passée, hypothèse hors structure) ; D-122 précisée (consommer un constat n'est pas lire une valeur). Déclaration RGPD posée, validée par le responsable le 2026-10-20. Suite : la migration seule ; sa release-db attend celle de t03 (#1581). Aucun constat ne se pose en production avant la signature de la structure de BP-12a (D-314 §10).
- **Mise à jour (2026-10-20, D-331, migration)** : PR de migration seule — `20261020100000_constats_praticien_v1` : deux tables en ajout seul, un seul constat en vigueur par hypothèse et par dossier (verrou de l'hypothèse), motifs fermés en CHECK, pièces tenues par clé et écrites dans la transaction du constat, tête de fil non annulée et passation VALID ou AMBIGUOUS, pièces requises en fin de transaction pour `confirmee` et `non_retenue` ; contrat négatif propre au CI ; effacement nommé et son banc. La release-db de t03 (#1581) est passée le 2026-10-20 (run 39340724658) : celle-ci peut suivre le merge. Suite : constat par conteneur, puis le code sous `WN_BIO_CONSTAT`.
- **Mise à jour (2026-10-20, D-331, code)** : migration mergée (#1600), release-db run 39415107189 approuvée, constat par conteneur (`one-off-305` : appliquée, deux tables vides, RLS sans politique, neuf triggers). Code consommateur sous `WN_BIO_CONSTAT`, créé éteint : route `api/praticien/biologie/constats`, « à relire » dérivé à la lecture, panneau « Constats du parcours » de l'onglet « Biologie » ; les P2 de la revue de la migration tenus ; lecteurs des constats épinglés par banc. **Fiche close** (LOT-11 terminé). Aucun constat ne se pose avant la signature de la structure de BP-12a ; l'allumage est un geste du responsable. Suite de la file B : BP-13 (F07).

#### F07 · BP-13 : données physiologiques, traitements et compléments en cours
- **Identifiant, piste** : BP-13 ; à partir de la saisie existante ; parcours.
- **Rang** : 4.
- **Portes, préalables** : BP-00 (fait) ; portes 8 et 9 ; porte DC-44 et DC-48 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:379`).
- **Migration, release-db** : oui ; rang 4, avant BP-18a dans l'ordre des release-db ; préalable de J3-bio (§5) ; la table de la campagne ne l'imposait pas, seul l'ordre des release-db le faisait.
- **Décisions, textes** : D-xxx des critères et du modèle ; registre RGPD et texte patient avant la table.
- **Critère de fin** : release-db constatée ; « inconnu » explicite ; effacement testé.
- **Mise à jour (2026-10-21, D-335)** : fiche LOT-13, arbitrages du responsable (2026-10-20 et 2026-10-21) : deux tables en ajout seul, à deux mains (patient au portail, praticien au cockpit), source écrite sur chaque ligne ; six critères physiologiques en lignes datées (sexe déclaré, statut menstruel, grossesse, allaitement, poids, taille), « inconnu » écrit, aucun IMC ; traitements et compléments en lignes, sans classe, remplaçant au portail les groupes de texte libre de l'anamnèse ; grossesse, allaitement, taille et poids restent des questions de l'anamnèse, la garde de population (D-101) inchangée, un écart affiché en discordance ; la ligne de vigilance de la synthèse lit les traitements en vigueur, rien ne part à l'IA ; le traitement devient une pièce de constat (D-331 amendée). Précisions de l’assistant retenues, déclaration RGPD et texte patient (v20) validés par le responsable le 2026-10-21, corrigés et revalidés le même jour (aucun traitement ne part à l'IA). Suite : la migration seule ; puis le code sous `WN_PHYSIO_TRAITEMENTS` éteint ; allumage conditionné à la décision sur la garde de population, à la publication de la v20 et à un test d'intégration sur une vraie base (pose, remplacement, retrait, deux poses concurrentes sur un même fil).
- **Mise à jour (2026-10-21, D-335, migration)** : PR de migration seule — `20261021100000_donnees_physiologiques_traitements_v1` : `donnees_physiologiques` et `traitements_en_cours` en ajout seul, une tête par critère et par fil sous verrou du dossier puis du fil, réponses fermées et bornes techniques en CHECK, date et précision, source et auteur, le patient ne retire que ses lignes ; `pieces_constats_praticien.id_traitement` (RESTRICT, une pièce sur trois clés, tête de fil sous le même verrou) ; contrat négatif propre et banc à deux sessions au CI (dont deux remplacements concurrents d'un traitement) ; effacement nommé et son banc. Suite : release-db dans la foulée du merge, constat par conteneur, puis le code sous `WN_PHYSIO_TRAITEMENTS`.
- **Mise à jour (2026-10-21, D-335, code)** : migration mergée (#1622), release-db run 39654198602 approuvée, constat par conteneur (`one-off-483` : appliquée, deux tables vides, RLS sans politique, `id_traitement` présente, « une pièce » sur trois clés). Code consommateur sous `WN_PHYSIO_TRAITEMENTS`, créé éteint : routes `api/portail/physio-traitements` et `api/praticien/physio-traitements` ; fiche de renseignements du portail (sexe et cycles, traitements en lignes à la place des groupes) et page « Ma fiche de renseignements » ; tiroir du cockpit (source, date, historique, « déclaré à l'anamnèse du … », discordance) ; ligne de vigilance de la synthèse sur les traitements en vigueur ; pièce de constat « traitement » et huitième condition « à relire » ; les P2 de la revue de la migration tenus ; lecteurs épinglés par banc. Allumage : conditions de D-335 §9 (décision de la garde de population, v20 publiée, test d'intégration sur vraie base), et quatre relevés au code (fiche LOT-13) : borne de 500 caractères d'un point de vigilance, export du dossier, courrier au médecin, procédure d'extinction. Suite de la file B : BP-15 (F08).

#### F08 · BP-15 : décisions de parcours
- **Identifiant, piste** : BP-15 ; parcours.
- **Rang** : 4.
- **Portes, préalables** : BP-00 (fait) ; portes 8 et 9 ; DC-40 et DC-48.
- **Migration, release-db** : oui ; rang 4, avant BP-18a ; préalable de J3-bio. Hors BioFlow, R:ak et R:FC-5 (2/2) supposent la décision du 21e jour qu'il persiste.
- **Décisions, textes** : D-xxx de véhicule ; D-255 précisée (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:390`).
- **Critère de fin** : release-db constatée ; contrat négatif ; bancs du jour 0 et des quatre empreintes.
- **Mise à jour (2026-10-22, D-343, décision)** : arbitrages du 2026-10-20 consignés (ancrage sur la version, action facultative ; praticien seul, source notée ; motifs en listes fermées, aucun motif d'efficacité ; correction par remplacement de la tête et retrait) ; table `decisions_parcours` en trois familles (choix, mise en œuvre, révision) ; D-255 précisée (le début réel n'est pas le jour 0) ; quatre empreintes nommées (`decision_card_input_hash`, `snapshot_input_hash`, `review_input_hash`, `input_hash`) ; déclaration RGPD avant la table ; fiche LOT-15. Suite : migration seule, release-db, code sous `WN_DECISIONS_PARCOURS` éteint.
- **Mise à jour (2026-10-22, D-343, migration)** : #1642 mergée ; migration `20261022100000_decisions_parcours_v1` en PR seule, avec son contrat négatif (quinze promesses, versions intouchées comprises), son banc à deux sessions (sept courses) et l'effacement nommé avant `protocol_drafts`. Reste : release-db approuvée par le responsable, constat par conteneur, puis le code.
- **Mise à jour (2026-10-22, D-343, code)** : migration mergée (#1644), release-db approuvée, constat par conteneur (appliquée en une tentative, table vide, RLS sans politique, quatre triggers, treize CHECK, garde d'isolement présente). Code consommateur sous `WN_DECISIONS_PARCOURS`, créé éteint : route `api/praticien/decisions-parcours` ; tiroir « Décisions de parcours » du cockpit (révision en vigueur, fils de choix et de mise en œuvre, séquence incomplète dite, première diffusion à côté des débuts réels) ; bancs du jour 0 et des quatre empreintes, et des lecteurs. Allumage : test d'intégration de la route sur une vraie base ; information du patient relue avant BP-21a. Suite : brouillon de la lettre cm (F52), hors dépôt.
- **Correction (2026-10-23)** : la phrase « R:ak et R:FC-5 (2/2) supposent la décision du 21e jour qu'il persiste » (ligne Migration, 2026-10-13) est fausse. BP-15 ne persiste aucune décision du 21e jour : les six libellés du panneau J21 restent un affichage guidé, et leur persistance est hors du lot (D-343, en-tête et §13) ; aucune surface patient ne lit une décision de parcours (§5, §13). R:ak (H80) n'en dépend donc pas : son point de départ est le jour 0 de D-255, arbitré le 2026-10-23. Pour R:FC-5 (2/2) (H81), la prémisse tombe de même, et sa fiche ne cite pas BP-15 parmi ses préalables (R:FC-5 (1/2), H74) ; ce que son geste lit se fixe avec son texte.

#### F15 · BP-03 : série par analyte
- **Identifiant, piste** : BP-03 ; parcours.
- **Rang** : 4 proposé [Hypothese] (BP-09 constaté au rang 3).
- **Portes, préalables** : BP-01 (fait), BP-09 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:122`).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx propre (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:381` ne porte qu'une dépendance).
- **Critère de fin** : série sur les trois fixtures ; aucun delta ; intervalle verbatim de chaque laboratoire, sans conversion (D-157).
- **Mise à jour (2026-10-17)** : code livré (#1463 fiche, #1466 code, D-294 §6), commentaires du laboratoire compris (part de F60). Fiche LOT-03 `en_cours` : reste le constat après déploiement, sur un dossier réel lu par identifiant, par conteneur.
- **Clôture (2026-10-17)** : constat après déploiement fait par le responsable le 2026-10-17 sur un dossier de test (valeurs et série vues, onglet « Biologie » conforme) ; fiche LOT-03 `terminé`, campagne bio-parcours `en_pause` sans lot courant. BP-05 et BP-16 peuvent s'appuyer sur la série.

#### F16 · BP-04 : attente typée, analyteCodes sur l'exploration (étape 5 de l'audit)
- **Identifiant, piste** : BP-04 ; absorbe CB-07 ; parcours et panels.
- **Rang** : 4 proposé [Hypothese]. Écart avec une lecture antérieure, qui le gèle avec la piste C jusqu'à l'ouverture de ax : BP-16, donc BP-20 et BP-21a, l'attendent (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:127`, :129, :136), et le gel bloquerait l'ouverture de l'outil (§4, écarts).
- **Portes, préalables** : BP-01 (fait), BP-09 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:123`).
- **Migration, release-db** : non ; contrat versionné, lecteur tolérant avant l'écrivain.
- **Décisions, textes** : D-xxx de contrat (D-142) ; D-190 §5 amendée plus tard par BP-18a (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:382`). BiologyCatalogRef, non livré, se reprend ici sur le patron assertFoodCompassActionRef, non sur celui de SupplementCatalogRef (`docs/claude/campagnes/FILE_ATTENTE.md:80`).
- **Critère de fin** : bancs d'empreinte V4 et C4 ; attente ancienne lue « non typée ».
- **Mise à jour (2026-10-17)** : fait. D-305 (#1471, sept arbitrages) et code (#1475) ; fiche LOT-04 `terminé (2026-10-15)` ; son statut, écrit à la clôture, consigne qu'aucun constat de production n'est attendu, aucune attente n'y étant posée.

#### F52 · Référentiel d'axes : migration
- **Identifiant, piste** : PR 3 ; panels.
- **Rang** : 4 proposé [Hypothese].
- **Portes, préalables** : cm ; G-7 ; BP-09 constaté ; portes 8 et 9.
- **Migration, release-db** : oui, seule dans sa PR ; rang 4, après la chaîne BP du même rang.
- **Décisions, textes** : celle de cm ; passe Codex.
- **Critère de fin** : migration constatée, 0 lien ; contrat SQL négatif (axe inconnu, lien sans claim refusés) ; T3.
- **Mise à jour (2026-10-23)** : préalable cm levé (D-348). Liste des dix codes : D-348 §2. Avant la migration, relire en production les cinquante fondateurs (D-348 §7).
- **Mise à jour (2026-10-24)** : cinquante fondateurs relus en production, tous conformes ; 0 lien. Migration `20261024100000_biology_axes_liste_fermee_v1` (CHECK seul) et contrat négatif `biology_axes_v1_negatif.sql`, dans leur PR. Reste : release-db approuvée, puis constat par conteneur (contrainte en place, 0 lien). Ouvre F79.
- **Constat (2026-10-24)** : PR #1671 mergée (73560bb8), release-db approuvée. Lecture en production par conteneur (one-off-1762), relue le même jour au cadrage de F79 (one-off-9987) : migration appliquée en une tentative ; `biology_analyte_links_cible_axe_check` en place sur les dix codes de D-348 §2 ; 8 CHECK sur la table ; 0 lien. **Critère de fin atteint.**

#### F58 · Statut posé et deux marques datées
- **Identifiant, piste** : le mot du responsable près de la valeur, daté, à l'écran du responsable seul, jamais calculé ; socle.
- **Rang** : 4, avec F57.
- **Portes, préalables** : lettre s ; si migration, G-7 et porte 9.
- **Migration, release-db** : oui — table neuve en ajout seul (D-322 §4), porte 9.
- **Décisions, textes** : dans s ; rien au portail.
- **Critère de fin** : statut posé, daté, relu en banc ; deux marques distinctes affichées.
- **Mise à jour (2026-10-15)** : forme tranchée par D-308 : statut pris dans une liste fermée du responsable, à écrire avant le code ; « lecture consignée » est un geste distinct (bouton) ; stockage tranché au cadrage.
- **Mise à jour (2026-10-17)** : liste écrite par D-322 (amende D-308 §2), arbitrée par le responsable : six statuts (aucune action retenue, à suivre, contexte à préciser, donnée à vérifier, avis médical à envisager, relié au protocole) ; retrait daté ; statut attaché à la valeur exacte, qui tombe avec une correction ; « relié au protocole » sans désignation d'action. Stockage tranché : table neuve en ajout seul, d'où une migration (porte 9 ; G-7 levée). Suite : migration seule, puis code.
- **Mise à jour (2026-10-18)** : migration seule écrite (`statuts_poses_resultats_biologiques_v1`, modèle `StatutPoseResultatBiologique`) : actes `pose` et `retrait`, liste fermée des six codes en CHECK, tête de fil, praticien du dossier, pose qui change le statut actif, retrait d'un statut actif, ajout seul, RLS ; effacement nommé du dossier livré avec elle ; contrat négatif en CI ; déclaration au registre RGPD. Suite : release-db, constat par conteneur, puis le code (route, lecture, écran de la série). La PR du code porte aussi, sur relecture `wn-reviewer` de la migration : un banc à deux sessions (deux poses du même statut, pose contre effacement, pose contre correction) ; le nettoyage E2E des statuts avant les résultats (`e2e/helpers/db.ts`, `nettoyerResultatsBiologiques`) ; une pose par transaction, ou l'ordre des verrous documenté.
- **Mise à jour (2026-10-18, code)** : migration mergée (#1537), son trigger sous les verrous de clé de BP-09 (relecture CodeRabbit : une correction concurrente passait sous l'ancien verrou par ligne), appliquée par release-db. Code du statut posé : route `resultats/statuts` (pose, retrait, refus nommés sous les mêmes verrous, pose sur résultat annulé refusée par la route), lecture jointe à la série (`statutPose` : actif et historique par ligne exacte), écran de la série (« sans statut posé », poser, changer, retirer, historique), banc à deux sessions en CI et T3, nettoyage E2E des statuts avant les résultats, un acte par transaction. Reste : les deux marques datées de la carte du compte rendu (« lignes validées », « lecture consignée »), affichage de données existantes, PR suivante sans migration.
- **Mise à jour (2026-10-18, marques)** : code du statut mergé (#1550). Les deux marques datées sont posées sous l'en-tête de la carte d'un compte rendu ouvert : « Lignes validées — dernière le … » (décision de la dernière ligne validée, `traiteLe` désormais lu) et « Lecture consignée le … » ou « Lecture non consignée » (lecture active de BP-10) ; aucune marque sans ligne validée, aucune marque de lecture sans état lu ; sans stockage neuf. F58 soldée à son critère de fin.

### Rang 5 : niveau 3 et première activation

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| R:Onglet | onglet Alimentation regroupé | A | 12, 24 | non | H67 |
| ah | familles de fiches conseils par thème | A | 5, 28 | selon | H68 |
| bh | rendu imprimable du protocole | A | aucune | non | H69 |
| BP-12b | positions d'expert signées | B | 23, 9 | oui | F09 |
| BP-14 | identité d'auteur séparée du rôle | B | 9 | oui | F10 |
| BP-17 | bibliothèque signée des options par hypothèse | B | 23 | non | F11 |
| BP-18a | niveau 3 figé | B | 7 | oui | F12 |
| BP-18b | « Protocole personnalisé » remis | B | 7 | selon | F13 |
| BP-16 | boucle d'exploration | B | aucune | non | F17 |
| BP-05 | contexte de prélèvement typé | B | 9 | oui | F20 |
| BF-5 | courbe d'analyte, au fait | B | 25, 6 | non | F56 |
| deux unités | repère quand deux laboratoires diffèrent d'unité | B | aucune | non | F60, rang 0 |
| page de santé | page de santé de BioFlow | B | 6 | non | F64 |
| liens analyte-axe | liens signés claim par claim, puis code | B | aucune | selon | F79 |
| ACT-1 | place 1 : CGU à accuser | C | 18 | non | H70 |
| ae | bloc « Protocole » du document médecin | C | 18 | non | F39 |
| bd | encart « quand ralentir ou demander avis » | C | 7, 18 | non | H71 |
| ch | tendance non chiffrée de ses nuits : une phrase en fin d'agenda | geste | 20, 11 | non | H72 |

**File A**

#### H67 · R:Onglet : onglet Alimentation
- **Identifiant, piste** : R:Onglet (FC-3) ; aucun calcul neuf ; alimentation ; file A.
- **Rang** : 5.
- **Portes, préalables** : J2-alim (H45) ; c (F59) ; FC-2 (H61) ; J2-base (H59) ; porte 12 ; porte 24.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : onglet servi.

#### H68 · R:ah : familles de fiches conseils par thème
- **Identifiant, piste** : lettre ah.
- **Rang** : 5 ; préparation des sources dès maintenant.
- **Portes, préalables** : porte 5 (F46) ; EF-3b (H59) ; propriétaire et sources du thème (porte 28).
- **Migration, release-db** : une migration par famille (forme A) [A verifier].
- **Décisions, textes** : lettre ah ; chaque durée ou mode d'emploi sourcé (DC-19), de la main du responsable.
- **Critère de fin** : règle mergée ; premier thème : fiche relue et validée par acte.

#### H69 · bh : rendu imprimable du protocole
- **Identifiant, piste** : lettre bh ; protocole ; file A.
- **Rang** : 5 au plus tôt [Hypothese], avec ae (F39).
- **Portes, préalables** : ba (H35) ; p (H60) ; un gabarit commun avec av (F33) suit son premier consommateur (lecture [Hypothese]) ; pas de place à part en file C, lecture à confirmer.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre bh, registre ; aucun document remis ne dit autre chose que la page.
- **Critère de fin** : imprimé = page servie ce jour-là (version, date) ; banc de concordance.

**File B**

#### F09 · BP-12b : positions d'expert signées
- **Identifiant, piste** : BP-12b (LOT-28) ; parcours.
- **Rang** : 5 (J3-bio).
- **Portes, préalables** : BP-12a ; porte 23 ; porte 9.
- **Migration, release-db** : oui ; premier du rang 5.
- **Décisions, textes** : D-xxx d'arbitrage de conflit (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:378`).
- **Critère de fin** : release-db constatée ; table des conflits re-signée.

#### F10 · BP-14 : identité d'auteur séparée du rôle
- **Identifiant, piste** : BP-14 ; parcours.
- **Rang** : 5 ; il ne dépend que de BP-00 et peut avancer si une place de migration se libère.
- **Portes, préalables** : BP-00 ; porte 9.
- **Migration, release-db** : oui ; rang 5, après BP-12b.
- **Décisions, textes** : D-xxx d'identité d'auteur.
- **Critère de fin** : release-db constatée ; bancs nominatif et historique ; aucun lecteur existant cassé.

#### F11 · BP-17 : bibliothèque signée des options par hypothèse
- **Identifiant, piste** : BP-17 ; aucune sélection d'après le dossier ; parcours.
- **Rang** : 5.
- **Portes, préalables** : BP-11, BP-12b ; porte 23.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de premier usage du niveau 3 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:393`) ; contenus signés de la main du responsable.
- **Critère de fin** : signature ; hook DC-17 ; aucune option sans précautions.

#### F12 · BP-18a : niveau 3 figé
- **Identifiant, piste** : BP-18a ; parcours.
- **Rang** : 5 ; la porte 7 (D-281 signée, déploiement constaté) se lève au rang 4, le formulaire de sécurité s'ouvrant hors de la file C.
- **Portes, préalables** : BP-13, BP-14, BP-15, BP-17, BP-23 (fait) ; porte 7 (signature SAF-EI-01, `docs/DECISIONS.md:85-95`).
- **Migration, release-db** : oui ; rang 5.
- **Décisions, textes** : D-xxx amendant D-056, D-133 et D-190 §5 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:394`) ; NU-3 dans J3-bio.
- **Critère de fin** : release-db constatée ; retrait du drapeau sans perte ; aucun médicament ; contre-revue adverse avant clôture.

#### F13 · BP-18b : « Protocole personnalisé » remis
- **Identifiant, piste** : BP-18b (LOT-29 de BIO-PARCOURS, à ne pas confondre avec la porte 29) ; parcours.
- **Rang** : 5 ; il suit BP-18a, la porte 7 se levant au rang 4.
- **Portes, préalables** : BP-18a ; porte 7.
- **Migration, release-db** : selon (patron D-251) ; si oui, dernière du rang 5.
- **Décisions, textes** : D-215 §2 précisée ; rédaction sans valeur biologique (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:395`).
- **Critère de fin** : aucune sortie sans contrôle DC-03 ; document remis jamais rejoué ; porte 19 levée.

#### F17 · BP-16 : boucle d'exploration
- **Identifiant, piste** : BP-16 ; parcours.
- **Rang** : 5 proposé [Hypothese].
- **Portes, préalables** : BP-03, BP-04, BP-11 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:127`).
- **Migration, release-db** : non.
- **Décisions, textes** : table signée motif, question, analytes (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:389`) ; constante « plafond de questions ouvertes » chiffrée par la D-xxx du responsable avant le lot [Hypothese sur le lot qui la lit] (`docs/DECISIONS.md:1629-1636`).
- **Critère de fin** : E2E sur fixture ; aucun état sans geste ; aucune valeur lue.

#### F20 · BP-05 : contexte de prélèvement typé
- **Identifiant, piste** : BP-05 (absorbe BP-06) ; parcours.
- **Rang** : 5 proposé [Hypothese].
- **Portes, préalables** : BP-00, BP-03 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:124`) ; la demande explicite du responsable ; porte 9.
- **Migration, release-db** : oui ; au rang 5, après la chaîne de l'outil du même rang (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:150` le met en queue).
- **Décisions, textes** : D-xxx de forme (DC-46) ; registre avant.
- **Critère de fin** : contrat négatif par forme ; « inconnu » par défaut.

#### F56 · BF-5 : courbe d'analyte, marques datées par analyte
- **Identifiant, piste** : courbe de valeurs mesurées ; panels et socle.
- **Rang** : 5 au plus tôt [Hypothese], au fait.
- **Portes, préalables** : BP-03 ; porte 25 (un analyte à deux dates sur un vrai dossier, constaté par conteneur) ; porte 6.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre cn : deux points ou plus, une unité (sous D-157, aucune conversion : des points d'unités différentes ne se joignent pas), intervalle du laboratoire juxtaposé, silences de D-267 §5, aucune bande, couleur, cible ni flèche.
- **Critère de fin** : courbe constatée sur un vrai dossier à deux dates ; cockpit seul.

#### F64 · Page de santé de BioFlow
- **Identifiant, piste** : vue praticien des comptes que l'audit a mesurés à la main (liaisons NABM, liens analyte-axe, panels documentés, comptes rendus importés) ; socle.
- **Rang** : 5 proposé [Hypothese], après G-3 et les axes.
- **Portes, préalables** : porte 6 (comptes avec provenance) ; effectif de masquage pour les comptes sur plusieurs dossiers (F25).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune propre ; doctrine c.
- **Critère de fin** : comptes avec provenance, masqués sous l'effectif.

#### F79 · Liens analyte-axe signés : écriture et code
- **Identifiant, piste** : étape 3 de l'audit, second temps : « migration seule, puis code : liens analyte ↔ axe signés, claim par claim » (`docs/archive/cadrages/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:181-182`) ; panels.
- **Rang** : 5 proposé [Hypothese], après F52 (rang 4).
- **Portes, préalables** : cm (F51) ; F52 constatée ; curation claim par claim de la main du responsable ; aucun lien sans claim.
- **Migration, release-db** : selon le véhicule d'écriture ; une écriture en base de production passe par migration relue et release-db (D-087) ; véhicule tranché : migration de données relue (D-351 §5), porte 9.
- **Décisions, textes** : les signatures du responsable, lien par lien ; aucune règle ni borne sans provenance certifiée.
- **Critère de fin** : liens signés en base, constatés par conteneur ; contrat SQL « lien sans claim refusé » vert.
- **Mise à jour (2026-10-24, curation)** : F52 constatée. Dix-sept liens signés par le responsable (D-351 §2), sur seize analytes et les dix axes, chacun avec un claim v1.0 et un sens ; six réserves écrites (§3), dont deux exceptions signées à la règle du §1 (lien 5 : mécanisme non nommé ; lien 16 : sens déduit). Véhicule tranché : une migration de données relue (D-087), qui rend aussi `niveau_preuve` nullable (nul = non gradé, §4) et insère les dix-sept liens, avec un contrat SQL qui exige la liste exacte (§5). La correspondance panel → axe n'est pas nécessaire ici : elle reste ouverte pour F53. Reste : la migration dans sa PR, passe Codex, T3, release-db approuvée, constat par conteneur, puis le code consommateur.

**File C**

#### H70 · ACT-1 : place 1, CGU à accuser
- **Identifiant, piste** : ACT-1 (J2-act) ; CGU à accuser, puis constat ; lecture du protocole journalisée ; jamais un chiffre ; confiance ; file C, place 1.
- **Rang** : 5.
- **Portes, préalables** : k (F77) ; l (D-283) ; J2-cc8 (H60) ; G-8 (H50) ; porte 18 ; J2-base (H59) retiré par D-315 §5.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune neuve.
- **Critère de fin** : accusé constaté sur un premier vrai dossier servi, sans anomalie, par identifiant en conteneur.
- **Mise à jour (2026-10-15, D-315 §5)** : préalables amendés sur arbitrage du responsable : k, l, G-8, J2-cc8 (release-db constatée), porte 18 ; J2-base n'en est plus. CC-0, OF-1, OF-2 et la part sommeil restent à J2-base ; porte 24 fermée.
- **Mise à jour (2026-10-16, code, PR 1)** : D-292 amendée (cinq arbitrages : lien magique existant, mineurs inchangés, envoi unique au cockpit, aucun rappel, phrase de 24 h à l'e-mail). PR 1 sous `WN_PORTAIL_CONDITIONS`, éteint, sans migration : texte au registre (`conditions_utilisation` v1, données en v18), accueil conditions seules au nouveau patient majeur et rien au patient suivi, page des conditions et son bouton, filet au dépôt. Reste la PR 2 : destination du lien magique, envoi au cockpit, gabarit d'e-mail.
- **Mise à jour (2026-10-16, code, PR 2)** : PR 1 mergée (#1502). PR 2, même drapeau, sans migration : le lien magique porte une destination en liste fermée (`?vers=conditions`) et atterrit sur la page des conditions ; gabarit `conditions_utilisation` v1 au registre (texte validé mot pour mot, plus la phrase des 24 h ; réponses au praticien du dossier) ; envoi au cockpit sous « Confiance & droits » (dossiers éligibles, aperçu, envoi confirmé en une fois, réservé puis consigné au dossier, par lots de dix). Le code du lot est complet ; reste l'activation (ACT-1) : ouvrir le drapeau, envoyer, puis constater l'accusé sur un premier vrai dossier. Consigne d'activation : `WN_G4_LIEN_MAGIQUE` reste ouvert au moins 24 h après l'envoi ; un lien consommé par un analyseur de messagerie renvoie le patient à la connexion habituelle (repli prévu par l'e-mail). **Reste routé (revue de la PR 2, P2)** : une réservation d'envoi restée sans issue (processus arrêté entre réservation et envoi, ou trace non soldée) sort le dossier de la liste sans e-mail, et le cockpit ne le dit pas — seule la fiche du dossier montre « non envoyé ». À l'activation, lire par conteneur, en agrégat, les lignes `correspondances_patient` de type `conditions_utilisation` restées `Non_envoye` avec `source_id` renseigné ; si le cas paraît, afficher leur nombre au cockpit (sans bouton de libération).
- **Constat (2026-10-16 au soir, activation)** : PR 2 mergée (#1503, c886527f), déployée. `WN_PORTAIL_CONDITIONS=true` posé en production après la fin du déploiement en cours, puis redémarrage ; `WN_G4_LIEN_MAGIQUE` et `SMTP_URL` en place. Envoi depuis « Confiance & droits » par le responsable. Lecture par conteneur, en agrégat : 15 e-mails consignés `Envoye` et réservés, aucun en échec, **aucune réservation restée sans issue** (le reste routé ci-dessus ne s'est pas présenté) ; 15 liens émis. Moins d'une heure après l'envoi, **un premier vrai dossier a accusé les conditions v1** : lien ouvert, session ouverte sur la page des conditions, accusé au clic une douzaine de secondes plus tard ; une seconde ouverture du même lien, dix secondes après la première, a été refusée comme prévu (usage unique), sans effet sur le parcours. **Critère de fin atteint pour les conditions d'utilisation**, au sens de la porte 18 (un premier vrai dossier servi, sans anomalie, constaté par identifiant en conteneur ; l'identifiant n'est pas consigné ici). **Reste à ACT-1** : la lecture du protocole journalisée (H70, piste ; code livré sous `WN_PORTAIL_LECTURE_PROTOCOLE`, non posé en production au 2026-10-17) — à ouvrir puis à constater. `WN_G4_LIEN_MAGIQUE` reste ouvert au moins jusqu'au 2026-10-17 au soir (validité des liens envoyés).
- **Constat (2026-10-17, peu après minuit, lecture du protocole ; ACT-1 constaté)** : la lecture du protocole journalisée est ouverte et constatée (H60) : `WN_PORTAIL_LECTURE_PROTOCOLE=true` à 00 h 24 (Paris), première lecture tracée six minutes plus tard sur un vrai dossier, rattachée à la diffusion en vigueur de ce dossier, sans anomalie. Relecture des conditions à 00 h 30, en agrégat : 15 liens émis, 1 ouvert, 14 encore valides, 1 refus (la seconde ouverture déjà consignée), 1 dossier ayant accusé v1, aucun lien ouvert sans accusé. **ACT-1 constaté : place 1 de la file C faite ; la porte 18 de la place suivante (activation précédente constatée) est levée.** Reste une consigne d'exploitation : ne pas refermer `WN_G4_LIEN_MAGIQUE` avant le 2026-10-17 à 23 h 50 (Paris), heure d'expiration du dernier lien envoyé.

#### F39 · R:ae : bloc « Protocole » du document médecin
- **Identifiant, piste** : lettre ae ; trackc (document partagé avec av).
- **Rang** : 5 ; une place dans la file C dès qu'il est prêt.
- **Portes, préalables** : J2-med (q) ; D-p ; porte 18.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ae ; sans la charge ; bh se fait avec R:ae, gabarit commun avec av non tranché.
- **Critère de fin** : activation constatée sur un vrai dossier avant la suivante.

#### H71 · bd : encart « quand ralentir ou demander avis »
- **Identifiant, piste** : lettre bd ; protocole, sécurité ; geste du responsable (texte), puis file C.
- **Rang** : 5 au plus tôt [Hypothese] : la porte 7 se lève au rang 4 (règle) ; ouverture au-delà de la place 11 : dès que l'encart est prêt, il prend la place suivante avant toute autre.
- **Portes, préalables** : D-281 construite et e signée (porte 7, F66) ; porte 18.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre bd, de la main du responsable.
- **Critère de fin** : texte accepté ; activation constatée sur un vrai dossier.
- **Mise à jour (2026-10-23, D-346)** : la porte 7 est levée (2026-10-18, F66). L'encart n'attend plus la place 11 : dès qu'il est prêt (texte accepté, registre, drapeau), il prend la place suivante, après la place 5, devant les places 7 à 11 non encore ouvertes. La porte 18 est inchangée. Reste : son texte, de la main du responsable.
- **Mise à jour (2026-10-23, D-349)** : texte du responsable accepté (variante retenue, phrase du choix dans le formulaire retirée) ; registre (`docs/FEATURE_FLAGS.md`) et drapeau `WN_PORTAIL_ENCART_CONDUITE` livrés éteints, l'encart servi à l'accueil du protocole. Reste : le drapeau posé sur accord du responsable, puis le constat (D-349 §4) ; la place suivante de la file C lui revient.
- **Mise à jour (2026-10-24, critère de fin atteint)** : #1669 mergée et déployée (5aa5ceec) ; `WN_PORTAIL_ENCART_CONDUITE=true` posé en production le 2026-10-24 à 07 h 17 UTC sur accord du responsable, code en service 5389dd98. Constat (D-349 §4) : encart lu en ligne par le responsable sur un dossier de test dont un protocole est servi (sous les rendez-vous de suivi, détail replié, quatre paragraphes conformes) ; diffusion en vigueur de ce dossier relue par identifiant en conteneur. Porte 18 levée pour l'ouverture suivante.

**File D : gestes du responsable**

#### H72 · ch : tendance non chiffrée de ses nuits
- **Identifiant, piste** : lettre ch ; sommeil ; geste du responsable.
- **Rang** : 5 au plus tôt [Hypothese] (dégelée le 2026-10-13), après cg (rang 4), J2-mom (rang 2) et la porte 20 (rang 3 au plus tôt).
- **Portes, préalables** : cg (H63) ; J2-mom (H30) ; porte 20 ; porte 11 pour les trois phrases.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx clinique de la main du responsable : exception écrite, pour l'agenda, à l'interdit des chiffres au portail ; règle qui compare un agenda fini au précédent, avec les règles de comparaison déjà décidées ; marge « stable » signée ; trois phrases fixes signées, une par sens de la tendance, sans chiffre ; fragment. Rien chaque matin : le merci reste indépendant de la nuit.
- **Critère de fin** : phrase servie une fois l'agenda fini, constatée sur un vrai dossier ; aucun chiffre, aucune moyenne, aucune tendance sur une semaine en cours.

### Rang 6

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| R:Synthèse | onglet « Synthèse et documents » | A | 19 | non | H73 |
| R:FC-5 (1/2) | « n jours sur m » au cockpit | A | 15 | non | H74 |
| BP-20 | suivi factuel, jalon J1 | B | aucune | non | F18 |
| BP-24 | conformité | B | 13 | non | F21 |
| BP-27 | évaluateur par marqueur | B | 5 | oui | F27 |
| ax | lot du bilan hiérarchisé | B | 9 si migration | selon | F35 |
| BF-6 | bloc « Exploration biologique », au fait | B | aucune | non | F61 |
| ACT-2 | place 2 : e-mail neutre à la diffusion | C | 18 | non | H75 |
| indications v2 | re-signature des indications par axe | geste | aucune | selon | F53 |

**File A**

#### H73 · R:Synthèse : onglet « Synthèse et documents »
- **Identifiant, piste** : R:Synthèse ; cockpit ; file A.
- **Rang** : 6.
- **Portes, préalables** : J3-bio, porte 19 (F12, F13).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : onglet servi.

#### H74 · R:FC-5 (1/2) : « n jours sur m » au cockpit
- **Identifiant, piste** : R:FC-5 (1/2) ; alimentation ; file A.
- **Rang** : 6.
- **Portes, préalables** : c (F59) ; R:Onglet (H67) ; FC-2 (H61) ; CF-0a de J1-cockpit (F59) ; porte 15.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre c appliquée.
- **Critère de fin** : affichage avec dénominateur, banc.

**File B**

#### F18 · BP-20 : suivi factuel, jalon J1
- **Identifiant, piste** : BP-20 ; parcours.
- **Rang** : 6 proposé [Hypothese].
- **Portes, préalables** : BP-15, BP-16 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:129`).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de suivi ; avertissement d'attribution (DC-39, DC-41).
- **Critère de fin** : aucune version réécrite sans geste ; E2E ; jalon J1 joué sur les trois fixtures.

#### F21 · BP-24 : conformité
- **Identifiant, piste** : BP-24 ; parcours.
- **Rang** : 6 proposé [Hypothese] (il n'attend plus la branche).
- **Portes, préalables** : BP-13, BP-14, BP-18b, D-265 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:135`) ; porte 13.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de conformité ; pièces datées de la main du responsable, hors dépôt.
- **Critère de fin** : version TRUST servie avec accusé, constatée dans l'image servie.

#### F27 · BP-27 : évaluateur par marqueur
- **Identifiant, piste** : BP-27 ; plages par population, discordance signée ; parcours.
- **Rang** : 6 proposé [Hypothese].
- **Portes, préalables** : BP-03, BP-05, BP-12a, BP-13, BIO-INGEST LOT-07 (fait) (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:140`) ; ci ; ligne de registre IA ; porte 5 si un site IA neuf.
- **Migration, release-db** : oui ; rang 6, après la chaîne de l'outil du rang 5.
- **Décisions, textes** : une D-xxx par marqueur et par usage, avec ses claims (D-122) ; D-157 amendée marqueur par marqueur ; signatures de la main du responsable.
- **Critère de fin** : chaque marqueur sous sa D-xxx ; propose sans poser ; drapeau posé sur preuves propres.

#### F35 · ax : lot du bilan hiérarchisé
- **Identifiant, piste** : lettre ax ; le médecin ne saisit rien ; trackc.
- **Rang** : 6 proposé [Hypothese] ; le rang antérieur était « 4 au plus tôt, après BP-04 et BP-16 » ; BP-16 au rang 5 le repousse.
- **Portes, préalables** : av, aw ; vue par analyte (F50) ; BP-04, BP-16 ; D-q et J2-med (F38) ; si migration, G-7 et porte 9 ; registre et note patient avant la table, TRUST avant le drapeau qui la lit ; BP-13 s'il porte des traitements structurés ou un IMC, sans effet sur le rang 6 proposé.
- **Migration, release-db** : selon ; si oui, au rang 6.
- **Décisions, textes** : D-xxx du lot ; tout composeur au-delà de D-190 §3 demande sa décision ; les questions écartées se tranchent dans le texte de la lettre (voir Mise à jour). La version « pour le laboratoire » n'est pas proposée tant que la question du destinataire n'est pas lue ; un radar dans le document attendrait la liste fermée des axes et la correction « non mesuré » (lettre ac).
- **Critère de fin** : bilan composé sur fixture ; garde non prescriptive tenue ; aucun mot proscrit sur aucune surface.
- **Mise à jour (2026-10-13)** : les questions écartées ne se reposent pas : l'objet d'ax se tranche dans son texte [Hypothese] ; ax garde son rang 6 proposé.

#### F61 · BF-6 : bloc « Exploration biologique »
- **Identifiant, piste** : regroupe les vues de l'exploration au cockpit ; socle.
- **Rang** : 6 au plus tôt [Hypothese], au fait.
- **Portes, préalables** : BP-04, BP-16 ; un premier « conditionnelle_biologie » constaté.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : aucune propre.
- **Critère de fin** : bloc constaté sur un vrai dossier ; T2.

**File C**

#### H75 · ACT-2 : place 2, e-mail neutre à la diffusion
- **Identifiant, piste** : ACT-2 ; e-mail neutre à la diffusion, après geste du responsable ; protocole ; file C, place 2.
- **Rang** : 6.
- **Portes, préalables** : ACT-1 constaté (porte 18, H70) ; t (D-317, hors relance) ; lot PA-2 livré ; porte 18 ; J3-base (H61) retiré par D-317 §5.
- **Migration, release-db** : non.
- **Décisions, textes** : texte de l'e-mail relu, de la main du responsable.
- **Critère de fin** : e-mail constaté sur un premier vrai dossier servi.
- **Mise à jour (2026-10-17, lettre t)** : D-317 classe l'e-mail hors relance (§1) ; ACT-2 reste à la place 2. Préalables devenus (D-317 §5) : ACT-1 constaté (fait) ; t écrite (D-317) ; lot PA-2 livré (gabarit neuf, e-mail avec le clic à chaque nouvelle version, plafond serveur, aussi posé sur l'annonce `document_remis`), sans migration, drapeau neuf éteint ; texte du gabarit relu mot pour mot ; porte 18. J3-base n'en est plus un préalable. Le constat attend la première vraie diffusion après l'ouverture du drapeau, sans la provoquer.
- **Mise à jour (2026-10-17, lot PA-2)** : lot PA-2 livré par sa PR, sans migration. Gabarit `protocole_diffuse` relu mot pour mot et validé par le responsable le jour même ; drapeau `WN_ANNONCE_PROTOCOLE` neuf et éteint, effectif seulement gabarit validé et `WN_FICHES_ASSIETTE` ouvert. Plafond de 24 h actif dès le déploiement, `document_remis` compris. Préalables restants d'ACT-2 : la porte 18, puis l'ordre de pose du drapeau ; le constat se fera à la première vraie diffusion qui suit.
- **Mise à jour (2026-10-18, drapeau posé)** : sur ordre du responsable, `WN_ANNONCE_PROTOCOLE=true` est posé en production à 09 h 44 UTC. Les conteneurs web ont été recréés à 09 h 45 UTC, code en service 49a2bb19, avec `WN_FICHES_ASSIETTE` ouvert. Reste le critère de fin : l'e-mail constaté sur la première vraie diffusion qui suit, par identifiant en conteneur, sans en provoquer.
- **Mise à jour (2026-10-18, constatée)** : **critère de fin atteint**. Première vraie diffusion après la pose du drapeau, par le responsable, sur un dossier de test, à 17 h 44 UTC (code en service 74cdfd82). Lu par conteneur, en lecture seule : une seule trace `protocole_diffuse`, au statut envoyé, écrite avec le clic ; aucune annonce `document_remis` en double ; aucun refus du plafond. L'e-mail reçu est le gabarit `protocole_diffuse` v1, au mot près : sans nom de document, sans contenu clinique, sans pièce jointe. La porte 18 est levée pour la place 3.

**File D : gestes du responsable**

#### F53 · Indications v2 par axe
- **Identifiant, piste** : re-signature d'indicationsBiologieV1 en v2 ; panels.
- **Rang** : 6 proposé [Hypothese], après les liens signés (F79, rang 5).
- **Portes, préalables** : F52 ; liens analyte-axe signés avec claim (F79) ; aw (F34).
- **Migration, release-db** : selon le véhicule du passage « inactif » (`docs/archive/cadrages/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:183-185`).
- **Décisions, textes** : D-xxx et fragment changelog ; signature de la main du responsable ; aucune règle sans provenance certifiée.
- **Critère de fin** : table v2 signée, verrou rouvert par la signature ; bancs rejoués.

### Rang 7

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| BP-08 | indicateurs de processus, au fait | B | aucune | non | F19 |
| BP-19 | stratégie proposée d'après le dossier | B | aucune | oui | F28 |
| étage 2 | signaler un résultat préoccupant | B | aucune | selon | F29 |
| marches 2 à 4 | suivi et proposition de bilan d'après le dossier | B | aucune | selon | F30 |
| ay | rédaction assistée du bilan | B | 5 | non | F36 |
| BF-9 | statut « demandé » à recontrôler | B | aucune | selon | F62 |
| ACT-3 | place 3 : « Mes échanges » en lecture | C | 18 | non | H76 |
| BP-21a | ouverture J1 | C | 18 | non | F22 |
| az, activation | remise du bilan au patient | C | 18 | non | F37, rang 1 |

**File B**

#### F19 · BP-08 : indicateurs de processus
- **Identifiant, piste** : BP-08 ; indicateurs de processus, sans attribution ; parcours.
- **Rang** : 7 au plus tôt [Hypothese], au fait.
- **Portes, préalables** : BP-20 ; un cycle réel arrivé au 21e jour (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:130`) ; effectif de masquage écrit (F25).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx d'indicateurs.
- **Critère de fin** : agrégats au conteneur, masqués sous l'effectif.

#### F28 · BP-19 : stratégie proposée d'après le dossier
- **Identifiant, piste** : BP-19 ; parcours.
- **Rang** : 7 proposé [Hypothese].
- **Portes, préalables** : BP-13, BP-15, BP-17, BP-20 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:141`) ; consomme BP-27 s'il est ouvert ; ci ; ligne de registre IA.
- **Migration, release-db** : oui (journal) ; rang 7.
- **Décisions, textes** : D-xxx du lot ; DC-43 curée ; classement signé (D-093).
- **Critère de fin** : E2E sur fixture ; aucune proposition sans précautions ; drapeau éteint jusqu'aux preuves.

#### F29 · Étage 2 : signaler un résultat préoccupant
- **Identifiant, piste** : fonction de l'étage assistant ; parcours.
- **Rang** : 7 proposé [Hypothese], après BP-27.
- **Portes, préalables** : BP-27 ; ci ; une provenance certifiée pour chaque borne (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:142`).
- **Migration, release-db** : selon.
- **Décisions, textes** : D-xxx de la fonction ; aucune borne inventée ; la qualification différée ne bloque plus (D-276 §2).
- **Critère de fin** : bornes sourcées signées ; banc ; drapeau posé sur preuves.

#### F30 · Marches 2 à 4 du suivi, proposition de bilan d'après le dossier
- **Identifiant, piste** : fonctions de l'étage assistant, une par lot (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:142`) ; parcours.
- **Rang** : 7 au plus tôt [Hypothese], selon la fonction.
- **Portes, préalables** : BP-27 selon le cas ; BP-20 pour les marches ; ci.
- **Migration, release-db** : selon.
- **Décisions, textes** : une D-xxx par fonction.
- **Critère de fin** : chaque fonction sous sa D-xxx, preuves propres.

#### F36 · ay : rédaction assistée
- **Identifiant, piste** : lettre ay ; trackc.
- **Rang** : 7 proposé [Hypothese].
- **Portes, préalables** : ax livré ; porte 5 (K-05a, F46) ; ci.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : D-xxx de la fonction ; ligne de registre IA.
- **Critère de fin** : sorties relues par le responsable ; drapeau posé sur preuves.

#### F62 · BF-9 : statut « demandé » à recontrôler
- **Identifiant, piste** : un statut de parcours qui demande à être recontrôlé ; l'acte du médecin reste hors de l'outil ; socle.
- **Rang** : 7 proposé [Hypothese].
- **Portes, préalables** : BP-15, BP-16, BP-20.
- **Migration, release-db** : selon.
- **Décisions, textes** : D-xxx propre.
- **Critère de fin** : statut posé par un geste, jamais calculé.

**File C**

#### H76 · ACT-3 : place 3, « Mes échanges » en lecture
- **Identifiant, piste** : ACT-3 ; « Mes échanges » en lecture ; confiance ; file C, place 3.
- **Rang** : 7.
- **Portes, préalables** : ACT-2 constaté (porte 18, H75) ; u (H37) ; ai (H51) ; J3-base ; la durée nommée par son texte est celle de D-283 §2 (porte 17 levée).
- **Migration, release-db** : non.
- **Décisions, textes** : encart d'urgence étendu ; lecture datée.
- **Critère de fin** : un premier dossier servi, constaté.
- **Mise à jour (2026-10-18, ouverte)** : ACT-2 constatée (H75), `WN_PORTAIL_MES_ECHANGES=true` est posé en production à 17 h 47 UTC. Conteneurs recréés à 17 h 47 UTC, code en service 74cdfd82. Constat dans l'image servie : la route de « Mes échanges » ne répond plus « page indisponible » (404) ; sans session, elle répond 401, sur les deux conteneurs web. Reste le critère de fin : un premier dossier servi, constaté par conteneur.
- **Mise à jour (2026-10-20, constatée)** : critère de fin atteint. Le responsable a ouvert « Mes échanges » sur un dossier de test ; les lignes affichées concordent avec la lecture du dossier par conteneur (dernière remise de chaque document, signalement avec son statut, transmissions ; ni courrier ni dépôt, comme en base). Constat sans trace de lecture, sur arbitrage du 2026-10-20 (D-330, amendement) : la route ne consigne pas ses lectures et l'hébergeur ne journalise pas les accès. Lève la porte 18 pour ACT-4 (H77).

#### F22 · BP-21a : ouverture J1
- **Identifiant, piste** : BP-21a ; parcours.
- **Rang** : 7 proposé [Hypothese].
- **Portes, préalables** : BP-10 (fait), BP-20, BP-26 (fait) (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:136`) ; effectif de masquage écrit (F25) ; seuil d'usage réel chiffré par le responsable (D-266 §13-14) ; porte 18.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx d'ouverture J1, critères écrits avant (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:398`).
- **Critère de fin** : critères atteints ; épreuve sur les trois fixtures ; contre-revue adverse ; activation constatée sur un vrai dossier avant la suivante.

### Rang 8

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| BP-22 | observation après ouverture | B | 9 | oui | F24 |
| ACT-4 | place 4 : dépôt de documents | C | 17, 18 | non | H77 |
| BP-21b | ouverture du protocole personnalisé | C | 18 | non | F23 |
| cycle réel | un cycle réel jusqu'au jalon de fin, au fait | geste | 18 | non | F26 |

**File B**

#### F24 · BP-22 : observation après ouverture
- **Identifiant, piste** : BP-22 ; parcours.
- **Rang** : 8 proposé [Hypothese].
- **Portes, préalables** : BP-21a (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:138`) ; porte 9.
- **Migration, release-db** : oui ; rang 8, dernière de l'étage outil.
- **Décisions, textes** : D-xxx du lot ; constante « cadence de revue des sources » chiffrée dans le lot (`docs/DECISIONS.md:1629-1636`).
- **Critère de fin** : release-db constatée ; signalement tracé ; cadence fixée.

**File C**

#### H77 · ACT-4 : place 4, dépôt de documents
- **Identifiant, piste** : ACT-4 (RK-7) ; aucune IA ; confiance ; file C, place 4.
- **Rang** : 8.
- **Portes, préalables** : ACT-3 constaté (porte 18, H76) ; porte 17 (levée par D-283) ; J3-collecte (H62) ; J2-conf (F45) ; G-11 (H38).
- **Migration, release-db** : non.
- **Décisions, textes** : texte de collecte (G-11).
- **Critère de fin** : constat, puis drapeau.
- **Mise à jour (2026-10-20, préparation)** : textes validés par le responsable (D-330, amendement ; `docs/claude/propositions/2026-10-20-act4-textes/README.md`) : libellés de l'écran, refus du plafond des non-consultés rendu neutre ; bloc « Ce que vous trouvez ici » de « Mes échanges » qui nomme les dépôts, servi drapeau ouvert ; « Vos données personnelles » v19 (collecte et lecture datée), publiée à l'ouverture avec les conditions v2 et leur e-mail (D-292 §5). Partie B validée le même jour (résumés, e-mail v2, phrase de la lecture datée), avec la partie 5 des conditions précisée (le filet ne joue qu'au dépôt du compte rendu) : PR de publication prête, à merger à l'ouverture. Constat d'ACT-3 sans code, sur un dossier de test ouvert par le responsable. Drapeau toujours éteint.
- **Mise à jour (2026-10-20, préalable J2-conf)** : arbitrage du responsable (D-330, amendement) : pour ACT-4, J2-conf est tenu par la garde d'âge du code du dépôt (dépôt au seul dossier majeur ; mineur ou date manquante, 409 ; l'écran demande la date manquante) ; r (instruments) et at (extraction par l'IA) ne visent pas cette surface ; as reste en place 6, après ACT-4. J2-conf reste un préalable entier d'ACT-5 (H78).
- **Mise à jour (2026-10-20, ouverture)** : #1599 mergée (c1a0d640) et déployée ; `WN_PORTAIL_DEPOT_DOCUMENTS=true` posé à 19:58 UTC sur accord du responsable (conteneurs web relancés, valeur relue, route en 401 sans session) ; e-mail des conditions v2 envoyé par le responsable depuis le cockpit. Constat par conteneur (agrégats) : 15 envois au statut « Envoyé », aucun en erreur ; aucun accusé v2 ni v19 et aucun dépôt à 20:16 UTC. **Constat atteint le 2026-10-20** sur un dossier de test ouvert par le responsable, lu par conteneur : accusé des conditions v2 depuis le portail, un dépôt (PDF, catégorie « courrier », empreinte posée, sous le plafond), ligne « Transmis · Document déposé » vue dans « Mes échanges » par le responsable, première consultation datée et attribuée à l'ouverture depuis le cockpit ; aucun retrait, aucun reclassement. Le réencodage d'une image n'est pas éprouvé en production (dépôt PDF). Critère de fin tenu : place 4 faite.

#### F23 · BP-21b : ouverture du protocole personnalisé
- **Identifiant, piste** : BP-21b (LOT-30 de BIO-PARCOURS, à ne pas confondre avec la porte 30) ; même régime que BP-21a ; parcours.
- **Rang** : 8 proposé [Hypothese] ; une place dans la file C, non numérotée.
- **Portes, préalables** : BP-21a, BP-18b, BP-24 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:137`) ; porte 18. La fiche compléments R:ao (F78) l'attend, ou attend BP-18a et BP-18b (écart non tranché, F78).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx d'ouverture, critères écrits avant.
- **Critère de fin** : critères atteints ; activation constatée avant la suivante.

**File D : gestes du responsable**

#### F26 · Un cycle réel jusqu'au jalon de fin
- **Identifiant, piste** : condition de fin de BIO-PARCOURS ; parcours.
- **Rang** : 8 au plus tôt [Hypothese], au fait, après BP-21a (rang 7).
- **Portes, préalables** : BP-21a ; porte 18.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : un cycle réel au jalon de fin, constaté par identifiant en conteneur ; une fixture ne prouve pas un parcours (D-125).

### Rang 9

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| phase 5 | extension par situation | B | aucune | selon | F31 |
| ACT-5 | place 5 : textes des mineurs | C | 18 | non | H78 |
| page patient | « Mes résultats de biologie » au portail | C | 18 | non | F65 |

**File B**

#### F31 · Phase 5 : extension par situation
- **Identifiant, piste** : B12 et folates, contre-épreuve sommeil sur le besoin 5 (axe curé), puis par situation clinique (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:143`) ; parcours.
- **Rang** : 9 proposé [Hypothese].
- **Portes, préalables** : BP-21b.
- **Migration, release-db** : selon.
- **Décisions, textes** : une D-xxx par parcours ; aucune règle sans provenance certifiée ; détail au document privé.
- **Critère de fin** : chaque parcours cadré et signé, un à la fois.

**File C**

#### H78 · ACT-5 : place 5, textes des mineurs
- **Identifiant, piste** : ACT-5 ; confiance ; file C, place 5.
- **Rang** : 9.
- **Portes, préalables** : ACT-4 constaté (porte 18, H77) ; z et J2-conf (F45) ; G-11 (H38) ; mineurs encadrés (D-283 §5).
- **Migration, release-db** : non.
- **Décisions, textes** : textes de G-11, de la main du responsable.
- **Critère de fin** : lecture consignée ; le premier mineur servi se constate plus tard, sans bloquer.
- **Mise à jour (2026-10-21, préparation)** : J2-conf tenu pour cette surface (D-341 §1-4, F45). Arbitrage du responsable (D-341 §5) : ACT-5 sert le texte 2B (au jeune) seul, mot pour mot, sur l'écran de pause du mineur (accueil du portail et page des questionnaires) ; le texte 2A (au titulaire) part avec J3-mineurs (H79), qui crée la validation en ligne qu'il décrit. J3-mineurs n'est pas un préalable d'ACT-5 (D-341 §6). Lot sans migration ni drapeau : `lib/patient/texteMineurs.ts`, banc mot pour mot contre `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`.
- **Mise à jour (2026-10-21, livré et constaté)** : #1630 mergée (0ef2649f) sur CI vert et revue CodeRabbit de la tête ; déployée avec fbc2b21a, en service à 22:10:46 UTC. Lecture consignée (critère de fin), par conteneur, sur le code servi et non sur des données : texte 2B présent dans l'image, texte 2A absent. Relevé agrégé : 31 dossiers ouverts, 18 avec une date lisible, aucun mineur ; le premier mineur servi se constatera plus tard, sans bloquer. Critère de fin tenu : place 5 faite. Restent ouverts, hors place : les 15–17 ans (avocat, D-284), le circuit des droits des mineurs (D-283 §5), les deux voix servies au mineur (refus des routes au vouvoiement, D-341 §5), at et as (F45).
- **Mise à jour (2026-10-22)** : restes tranchés par D-342 : le contact promis au mineur passe par un repère dans la liste des patients, 2B inchangé (§2) ; les deux voix restent à J3-mineurs (§2) ; at remplacée et as close (§3, §4, F45) ; 15–17 ans et droits d'un parent renvoyés à J3-mineurs (§5, §6, H79).

#### F65 · Page « Mes résultats de biologie » au portail
- **Identifiant, piste** : page patient ; socle.
- **Rang** : non acquis ; 9 proposé [Hypothese], rien avant BP-21b.
- **Portes, préalables** : BP-21b ; textes signés ; porte 18.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : deux textes de la page des résultats non décidés ; aucun chiffre ; aucun bouton de téléchargement du compte rendu (D-258).
- **Critère de fin** : textes signés ; page constatée sur un vrai dossier avant l'activation suivante.

### Rang 10 : places 6 à 11 de la file C

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| J3-mineurs | consentement du titulaire de l'autorité parentale | A | 9 | oui | H79 |
| as | place 6 : fiche signalétique, date de naissance ; close le 2026-10-22 sans activation (D-342 §4) | C | 18 | selon | F45, rang 0 |
| ak | place 7 : invitation d'autoévaluation au 21e jour | C | 18 | non | H80 |
| ao | place 8 : fiche compléments remise | C | 18, 19, 28 | non | F78 |
| R:FC-5 (2/2) | place 9 : geste du 21e jour de l'agenda | C | 18 | non | H81 |
| ap | place 10 : bibliothèque pédagogique | C | 17, 18, 28 | selon | H82 |
| an | place 11 : photo ou dictée des repas | C | 5, 18 | selon | H83 |

**File A**

#### H79 · J3-mineurs : consentement du titulaire de l'autorité parentale
- **Identifiant, piste** : J3-mineurs ; confiance ; file A.
- **Rang** : 10.
- **Portes, préalables** : ACT-5 (H78) ; G-7 ; porte 9 ; seuil des mineurs à 18 ans (D-284 §4, acquis) ; entrée validée par un titulaire de l'autorité parentale, un seul suffit, désaccord connu = traitement manuel (ancien lot (i) de H26, fondu ici le 2026-10-14).
- **Migration, release-db** : oui ; au rang 10 de l'ordre des release-db.
- **Décisions, textes** : aucune D-xxx écrite ; mineurs encadrés (D-283 §5).
- **Critère de fin** : release-db constatée ; consentement recueilli ; validation d'un titulaire constatée.
- **Mise à jour (2026-10-21)** : le texte 2A de G-11 (au titulaire de l'autorité parentale) part avec ce lot, non avec ACT-5 (D-341 §5) ; le banc d'ACT-5 refuse ses titres dans le code servi jusque-là, et sera à ajuster ici.
- **Mise à jour (2026-10-22)** : D-342 ajoute à ce lot : la validation des 15–17 ans par un avocat, préalable (note d'une page à préparer, §5) ; le circuit en ligne des droits exercés par un parent, à la main d'ici là (procédure des droits, étape 7, §6) ; la réécriture du refus des routes servi au mineur (`MESSAGE_CIRCUIT_MINEUR`, au vouvoiement, §2).
- **Mise à jour (2026-10-22, D-344)** : l'avocat est consulté dès maintenant ; ses réponses fixent l'accord d'un seul titulaire (règle suspendue d'ici là : accord recueilli à la main, ni validation en ligne ni accès parental avant sa réponse), l'accès parental, les droits exercés seul par le jeune, l'âge plancher et la transition à 18 ans, que ce lot devra servir. S'y ajoutent une notice d'information adaptée à l'âge et la révision du texte 2B ; l'AIPD (rubrique 13) se revoit avant le premier mineur admis. Hypothèse soumise à l'avocat (D-344 §6) : le jeune de 15 ans ou plus donne lui-même son consentement aux données, après l'accord parental (le portail l'arrête aujourd'hui avant l'étape du consentement) ; analyse de proportionnalité des seuils d'âge (loi de 2008) à écrire avant le premier mineur.

**File C**

#### H80 · R:ak : place 7, invitation d'autoévaluation au 21e jour
- **Identifiant, piste** : lettre ak ; portail sans chiffre ; protocole ; file C, place 7.
- **Rang** : 10 ; place 7, déduite de « places 7 à 11 dans l'ordre proposé ».
- **Portes, préalables** : k (F77) ; t (H31) ; texte patient ; porte 18, après la place 6 (close, D-342 §4 : après la place 5).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ak, de la main du responsable ; deux messages, deux places, aucune fusion avec la place 9.
- **Critère de fin** : activation constatée sur un vrai dossier.
- **Mise à jour (2026-10-23, arbitrages)** : six arbitrages du responsable, sur questions à options. (1) **Objet** : ak invite le patient à refaire ses questionnaires une fois que le praticien les lui a renvoyés au jalon J21 ; la décision de la re-passation reste au praticien, rien ne part sans son geste. (2) **Point de départ** : le jour 0 de D-255 (première diffusion) ; ak ne dépend pas de BP-15 (correction datée de F08). (3) **Fenêtre** : jours 18 à 24, celle du rendez-vous de suivi J21 (D-317 §6, `web/src/lib/protocol/checkinDomain.ts:29`). (4) **Surface** : la liste « à faire » du portail, sans courrier (D-317 §8). (5) **Forme** : une phrase d'appui sous chaque ligne de questionnaire renvoyé (le champ `appui` de `web/src/lib/portail/filDuJour.ts:91`), aucune ligne de plus. (6) **Hors des jours 18 à 24** : aucune phrase, même si le renvoi a lieu avant ou après ; conséquence dite et acceptée. **Ouvert** : quels questionnaires portent la phrase. Le responsable veut limiter le biais de comparaison aux premières réponses (questions en ordre aléatoire, questionnaires propres aux jalons) ; la question est renvoyée à une réflexion menée hors dépôt, qui dira aussi si ak l'attend. Constats du code : l'ordre des questions n'a qu'un mode (fixe) ; le mélange spécifié ne porte que sur l'ordre des options et n'est jamais exécuté. Suite : texte ak de la main du responsable, sa D-xxx, puis un lot sans migration.
- **Mise à jour (2026-10-24, Q1 à Q4)** : le point ouvert ci-dessus est tranché par le responsable, sur questions à options. **Q1** : réduire les deux biais, chacun par son remède — le souvenir par l'ordre des questions, la performance par la formulation de la phrase. **Q2** : piste A1, un ordre aléatoire au T0 et au jalon, sur les seuls instruments maison dont les droits le permettent, une D-xxx par instrument après recherche bibliographique sourcée ; jamais sur un instrument validé sans validation publiée, jamais au jalon seul ; chantier distinct d'ak, à cadrer, non démarré. **Q3** : B0, les mêmes instruments au jalon tant qu'aucune forme de suivi n'est sourcée. **Q4** : ak n'attend pas A1 ; la phrase vaut pour tout questionnaire rempli avant la diffusion et renvoyé après elle.
- **Mise à jour (2026-10-24, D-353)** : texte du responsable accepté (variante A d'un brouillon rédigé par l'assistant à sa demande, retenue sans retouche) ; registre (`docs/FEATURE_FLAGS.md`) et drapeau `WN_PORTAIL_APPUI_RENVOI` livrés éteints, la phrase servie au fil du jour sous chaque questionnaire renvoyé, les jours 18 à 24. Reste : le drapeau posé sur accord du responsable, puis le constat par identifiant (D-353 §5) ; ensuite la place 8.

#### F78 · R:ao : fiche compléments remise au patient
- **Identifiant, piste** : R:ao ; consommateur patient du niveau 3 ; parcours.
- **Rang** : 10 ; place 8 de la file C (antérieurement place 7 ; la fiche signalétique en place 6 décale les cinq ajouts aux places 7 à 11).
- **Portes, préalables** : J3-bio (porte 19) ; CGU constatée (ACT-1) ; règle signée et C4 (porte 28) ; porte 18 après la place précédente. Écart non tranché : BP-18a et BP-18b contre « avec BP-21b ou après » ([A verifier] dans la fiche elle-même) ; sans effet sur le rang 10.
- **Migration, release-db** : non.
- **Décisions, textes** : règle signée de la main du responsable ; texte de la fiche accusé avant l'activation.
- **Critère de fin** : règle signée ; fiche remise et constatée sur un vrai dossier avant l'activation suivante (porte 18).

#### H81 · R:FC-5 (2/2) : place 9, geste du 21e jour de l'agenda
- **Identifiant, piste** : R:FC-5 (2/2) ; alimentation ; file C, place 9.
- **Rang** : 10 ; place 9.
- **Portes, préalables** : R:FC-5 (1/2) (H74) ; son texte accusé ; porte 18, après la place 8.
- **Migration, release-db** : non.
- **Décisions, textes** : texte du geste, de la main du responsable.
- **Critère de fin** : activation constatée.

#### H82 · ap : place 10, bibliothèque pédagogique
- **Identifiant, piste** : lettre ap (R:ap) ; bibliothèque pédagogique au portail ; fiches conseils ; file C, place 10.
- **Rang** : 10 ; place 10.
- **Portes, préalables** : ACT-3 (H76) ; sa D-xxx (porte 28) ; porte 17 (levée par D-283) ; texte accusé ; porte 18, après la place 9.
- **Migration, release-db** : non (D-357 §6, 2026-10-24) ; le stockage du socle commun viendra avec la décision de sa première famille.
- **Décisions, textes** : lettre ap et sa D-xxx, de la main du responsable.
- **Critère de fin** : activation constatée.
- **Mise à jour (2026-10-24, D-357)** : lettre ap écrite, validée telle quelle par le responsable (rédigée par l'assistant sur sa demande, après quatre arbitrages sur questions à options) ; préalable « sa D-xxx » (porte 28) tenu. La bibliothèque a deux rayons, les documents remis (les fiches d'assiette, régime de D-251 inchangé) et un socle commun, invisible tant qu'il est vide ; ap livre le contenant seul, chaque famille de documents y entre par sa propre décision ; quatrième famille d'exceptions à la règle du portail, bornée aux chiffres de conseil sourcés, jamais une dose (amende D-333 §1) ; dossiers majeurs seuls, la page des fiches d'assiette restant servie telle quelle aux mineurs. Migration : non (D-357 §6). Reste : les trois textes d'écran de la main du responsable (une proposition est consignée, non acceptée), puis le lot sous `WN_PORTAIL_BIBLIOTHEQUE`, éteint ; activation après le constat de la place 9.

#### H83 · an : place 11, photo ou dictée des repas
- **Identifiant, piste** : lettre an (R:an) ; le praticien reçoit des repas confirmés ; reste « capture photo et voix » du journal ; alimentation ; file C, place 11.
- **Rang** : 10 ; place 11.
- **Portes, préalables** : registre IA (F70) ; porte 5 (F46) ; D-269 ; information patient ; ACT-1 ; si migration : G-7, porte 9 ; porte 18, après la place 10.
- **Migration, release-db** : selon.
- **Décisions, textes** : lettre an, de la main du responsable.
- **Critère de fin** : activation constatée.

### Rang T : transverse, dans chaque lot visé

| identifiant | objet | file | portes | migration | fiche |
|---|---|---|---|---|---|
| registre | une entrée de registre avant chaque table et chaque site IA | toutes | 13 | non (règle) | F70 |
| contre-revue | affirmations à réfuter, avant le lot de clôture | toutes | aucune | non (règle) | F71 |
| J1-total, J2-total, J3-total | sommes, ordres de grandeur | toutes | aucune | non | règle, §5 |
| G-6, N-7 | release-db une à une, une migration en vol | A et B | 9 | règle | règle, §5 |
| G-12 | contre-revues P0 : diff collé, commentaires lus | toutes | 27 | non | règle, §5 |
| N-1, N-2 | chemins propres ; fichiers de BP-09 dans sa fiche (listés le 2026-10-14, #1442) | A et B | 28 | non | règle, §5 |
| T-4, N-4, RK-1 | frontière commune : une PR à la fois | A et B | aucune | non | règle, §5 |
| N-3 | L5 jamais pendant une PR BIO-PARCOURS | A | aucune | non | règle, §5 |
| N-5 | numéro D-xxx réservé dans main ; merge un à un | toutes | aucune | non | règle, §5 |
| N-6 | titre du Fil et K-10 hors PR biologie sur le Fil | A | aucune | non | règle, §5 |
| N-8 | frise et chronogramme intouchés avant la porte 16 | A | 16 | non | règle, §5 |
| Clinical Core | nom informatif seulement | toutes | aucune | non | règle, §5 |
| R:Délestage, RK-5 | ordre de retrait si la relecture déborde | toutes | aucune | non | règle, §5 |
| R:Repli, RK-6 | ordre de report pour alléger le palier 1 | toutes | aucune | non | règle, §5 |
| S-8, J1-visible | BF-4 livré ; jamais un chiffre côté patient | toutes | 1 | non | livré, et règle, §5 |

**Toutes les files**

#### F70 · Registre avant chaque table et chaque site IA
- **Identifiant, piste** : une entrée de rubrique 5 et une note patient avant toute table neuve ; trust.
- **Rang** : transverse (T), comme les règles transverses du §5 : dans le lot de chaque migration, avant sa release-db.
- **Portes, préalables** : porte 13 ; régime commun du cadrage (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:432`).
- **Migration, release-db** : sans objet (règle).
- **Décisions, textes** : lettre l ; la colonne « préalable » du cadrage v3 l'omet pour BP-09, 14, 15, 18a, 19, 22, 27 : la feuille de route la porte pour chacun.
- **Critère de fin** : chaque release-db précédée de sa déclaration ; test de la rubrique 5 vert.

#### F71 · Contre-revue adverse
- **Identifiant, piste** : affirmations à réfuter, lancées avant le lot de clôture (pratique établie, `docs/claude/campagnes/2026-09-30-bio-ingest/CAMPAGNE.md:96-111`) ; trust.
- **Rang** : transverse (T), dans le lot visé.
- **Portes, préalables** : à prévoir pour la surface de validation de D-281 (étape 4), BP-18a, BP-21a, BP-21b ; jamais de seconde passe sans signal.
- **Migration, release-db** : sans objet.
- **Décisions, textes** : aucune.
- **Critère de fin** : affirmations réfutées ou corrigées, versées avant la clôture.

## §3 La file C des activations patient

Règle de série : une activation à la fois, un constat entre chacune (porte 18) ; le rang d'une fiche est un rang au plus tôt, pas une place ; la file sert dans l'ordre. Places 1 à 5 jamais permutées ; aucune insertion avant les places 2 à 5. Critère du constat : un premier vrai dossier servi, sans anomalie, constaté par identifiant en conteneur, jamais une fixture ; pour une ouverture qui ne vise que certains dossiers, la lecture consignée du texte en ligne par le responsable. Aucune activation n'est faite au 2026-10-13.

### Places numérotées

| place | activation | fiche | préalables techniques | texte accusé | rang au plus tôt |
|---|---|---|---|---|---|
| 1 | CGU unique | H70 | k, l (D-283), G-8, J2-cc8 (J2-base retiré par D-315 §5) | CGU ; lecture datée si elle la porte | 5 |
| 2 | E-mail neutre à la diffusion | H75 | t (D-317 : hors relance) ; lot PA-2 (J3-base retiré par D-317 §5) | texte de l'e-mail relu | 6 |
| 3 | « Mes échanges » en lecture | H76 | u, ai, J3-base ; durée de D-283 §2 | encart d'urgence étendu ; lecture datée | 7 |
| 4 | Dépôt de documents | H77 | porte 17 (levée), registre, J3-collecte, J2-conf | texte de collecte (G-11, accepté le 2026-10-14, #1441) | 8 |
| 5 | Textes des mineurs | H78 | z, J2-conf | textes des mineurs (G-11, acceptés le 2026-10-14, #1441) ; constat par lecture consignée | 9 |
| 6 | Fiche signalétique (date de naissance, invitation au dépôt) ; close le 2026-10-22 sans activation (D-342 §4) : la saisie initiale de la date d'un dossier ouvert sans date reste en service (lot (h), D-284 §3) | F45 | z, k, texte accusé ; seule surface neuve permise à un dossier sans date (D-283 §5) | texte patient | 10 |
| 7 | Invitation d'autoévaluation au 21e jour ; prête le 2026-10-24 (D-353) : texte accepté, registre et drapeau livrés éteints ; reste l'activation et son constat | H80 | k, t, texte patient | texte patient (accepté, D-353 §1) | 10 |
| 8 | Fiche compléments | F78 | J3-bio (porte 19), règle signée et C4 (porte 28), ACT-1 | texte de la fiche | 10 |
| 9 | Geste du 21e jour de l'agenda alimentaire | H81 | R:FC-5 (1/2) au cockpit | texte du geste ; deux messages, deux places, sans fusion avec la place 7 | 10 |
| 10 | Bibliothèque pédagogique ; lettre ap écrite le 2026-10-24 (D-357) : reste les trois textes d'écran, puis le lot sans migration, éteint | H82 | « Mes échanges » ouvert, sa D-xxx (D-357), porte 17 | texte accusé (trois titres, D-357 §6) | 10 |
| 11 | Photo ou dictée des repas | H83 | registre IA, porte 5, D-269, code | information patient | 10 |

### Ouvertures sans place numérotée

Chacune prend une place avec son constat, servie après la place 5 au moins, sauf l'imprimable du protocole : il est la page déjà servie, imprimée, et suit les ajouts de contenu. Leur ordre au-delà de la place 11 est tranché : la conduite passe devant. Dès que l'encart « quand ralentir ou demander avis » (bd, H71) est prêt, il prend la place suivante avant toute autre ; les autres (bb, cc, qui compte comme une place (D-288 §3, #1430), cg, bf, et toute ouverture sans place numérotée) s'ouvrent dans l'ordre où elles sont prêtes, une à la fois, le constat de la précédente avant (porte 18). C'est la règle de b (H05) pour les places 12 et suivantes.

Mise à jour (2026-10-23, D-346, amende D-288 §3) : l'encart bd n'attend plus la place 11. Dès qu'il est prêt, il prend la place suivante, après la place 5, devant les places 7 à 11 non encore ouvertes. Les autres ouvertures ci-dessous gardent la règle des places 12 et suivantes.

| ouverture | fiche | rang au plus tôt | condition |
|---|---|---|---|
| Bloc « Protocole » du document médecin, sans la charge déclarée | F39 | 5 | J2-med, p ; « avant le premier check-in » reste une visée que la file peut mettre en défaut |
| Encart « quand ralentir ou demander avis » | H71 | 5 [Hypothese] | porte 7 (rang 4, levée le 2026-10-18) ; passe devant dès qu'il est prêt, après la place 5 (D-346) ; prêt le 2026-10-23 (D-349) ; **ouvert et constaté le 2026-10-24** (#1669, drapeau posé à 07 h 17 UTC) ; porte 18 levée pour l'ouverture suivante |
| Lecture patient des trois plans | H49 | 2 [Hypothese], servie après la place 11 | ba ; ordre de préparation après l'encart |
| Nouvelle saisie du sommeil, si elle compte comme une place | H48 | 2 [Hypothese] | ca, cb, porte 16 ; ordre de préparation après l'encart ; compte-t-elle comme une place : oui (arbitrage du 2026-10-14, D-288 §3, #1430) |
| Ses nuits par semaine | H63 | 4 | porte 16, N-8 ; ordre de préparation après l'encart |
| Indicateurs de la semaine, au point d'étape | H19 | 3 au plus tôt [Hypothese] pour le code | une D-xxx par indicateur ; moment : au point d'étape ; ordre : après l'encart |
| Remise du bilan au patient | F37 | 7 [Hypothese] | porte 18 |
| Ouverture J1 | F22 | 7 [Hypothese] | effectif et seuil d'usage réel écrits avant |
| Ouverture du protocole personnalisé | F23 | 8 [Hypothese] | BP-21a, BP-18b, BP-24 |
| Page « Mes résultats de biologie » | F65 | 9 [Hypothese] | BP-21b ; textes signés |
| Imprimable du protocole | H69 | 5 [Hypothese] | pas de place à part, lecture à confirmer |

### Hors file

- Le formulaire de sécurité de D-281 (étape 3) s'ouvre hors de la file C, seul ouvert à ce moment, constaté avant l'ouverture suivante : portail et pause au rang 1, validation et banc au rang 2, signature M-1 au rang 3, déploiement constaté (J1-sécu) au rang 4 ; places 1 à 5 intactes (F66).
- Une nouvelle version d'un texte déjà accusé (usage_ia, « Vos données personnelles ») n'est pas une surface neuve : elle se sert par son accusé, hors file (précédent de la v7) ; c'est le cas du texte des durées de D-283 (H26) [Hypothese].
- Mineurs : aucune surface patient neuve pour un dossier mineur, ou d'âge inconnu, avant le consentement du titulaire de l'autorité parentale ; la fiche signalétique reste ouverte pour saisir la date (D-283 §5).

## §4 La file D : gestes du responsable et objets sans file

Arbitrage du responsable du 2026-10-14 : tout ce qui n'est ni file A (code hors biologie), ni file B (biologie structurelle), ni file C (activations patient) est en file D, c'est-à-dire les gestes du responsable (textes, sources, signatures, approbations, constats) et les objets sans file (ménage d'exploitation, questions ouvertes, dettes sans lot). Règle : aucune dette ne vit hors du plan. Une dette qui demande un geste vit ici ; une dette de code sans rang vit au §8, avec sa file ; un registre hors plan ne porte plus qu'un renvoi au plan (ligne « Versé au plan le 2026-10-14 ») ; les numéros de ligne que le plan cite dans un fichier qui porte cette ligne ou une ligne de renvoi se lisent sur 85b95dcc, avant elle. La table par rang ci-dessous garde sa forme ; la photographie de la file D au 2026-10-14 (D.1 à D.5) est à la fin du §4.

Table par rang : rang d'abord, hiérarchie ensuite. Un geste qui a une fiche n'a pas d'autre adresse qu'elle ; un objet sans fiche a pour adresse sa ligne D/n (D.4).

| rang | h | geste | fiche | ce qu'il débloque |
|---|---|---|---|---|
| 0 | h1 | signer les décisions d'ordre a, b, g (PR S-3) ; fait le 2026-10-14 : D-287, D-288, D-289 (#1430) | F01, H05, F04 | chaîne biologie, file C, restauration |
| 0 | h1 | fournir les sources de la porte 4 | H08 | c, am, al, cm, seuils_points |
| 0 | h1 | sources de fidélité (G-10) | H13 | v, bandes, mots qui jugent |
| 0 | h1 | lettres de sécurité m, n, z, ac (faites le 2026-10-15 : D-303, D-304, D-302, D-301) | H10, H11, F45, H12 | NF-7, EF-3b, garde d'âge, radar |
| 0 | h1 | conduire le premier constat S-1, biologie et hors biologie, en agrégats, par conteneur | F40, H06 | porte 1 ; vérifications renvoyées |
| 0 | h2 | lettres j, q, s, aa, ab, av ; guide w ; ca (fait le 2026-10-15 : D-300) ; j, q, s, aa, ab, av et méthode de w faits le 2026-10-15 (D-306 à D-312) ; bg | F63, F38, F57, F55, H14, F33, H15, H17, H18 | palier 1, BioFlow, aperçu médecin, onglet Biologie, BF-8, EF-0, 12 besoins, agenda du sommeil |
| 0 | h2 | K-05a et D4 (porte 5) : faits le 2026-10-15 (D-299, liste fermée) | F46 | R:Drive, ag, ah, an, at, ay, bg |
| 0 | h2 | liste des 8 analytes NABM (S-7, fait le 2026-10-15) ; lecture des écarts d'unité textuels ; copie datée de l'accord d'Anthropic | F54, F60, F47 | M-3 ; deux unités ; registre |
| 0 | h2 | effectif de masquage ; cj ; ci (fait le 2026-10-14 : D-286, #1425) ; co (fait le 2026-10-15 : D-313) ; comportement voulu de la charge | F25, F49, F67, F68, F76 | constats sur plusieurs dossiers ; packs ; levées ; AIPD ; correctif |
| 0 | h2 | accepter la lettre cq : fait (D-285, PR 1 du versement, #1417) | H04 | PR 1 du versement |
| 0 | h2 | compter les dossiers bloqués avant T0, en conteneur (fait le 2026-10-24 : constat versé en H07) | H07 | délai avant T0 |
| 0 | h3 | k (fait le 2026-10-14 : D-292, #1446) ; l (trace d'import ; geste clos le 2026-10-21 sur D-283 §2, F44) ; h ; instruction de bf | F77, F44, H16, H19 | CGU, trace, Boussole, indicateurs |
| 0 | h3 | G-11 : textes patient de la collecte et des mineurs (l écrite) ; fait le 2026-10-14 (#1441) | H38 | collecte, mineurs, lots (h) et (i) de D-284 |
| 0 | h3 | archiver l'annexe d'hébergement et les accords de sous-traitance (hébergeur, Google Workspace, Sentry) ; relancer par écrit la confirmation d'effacement ; informer tout dossier resté sur une version antérieure du texte ; faits attendus (identité juridique, copie signée) | H20 | registre RGPD à jour (D-283 §8-9) |
| 0 | h3 | relancer par écrit le laboratoire pilote | F41 | porte 29 |
| 0 | h3 | lettre cp : ranger chaque trou restant sous son lot | F69 | revue RGPD avant le 2027-06-30 |
| 0 | h3 | relancer le recueil réel de 21 jours de l'agenda alimentaire [Hypothese] | H45 | barème gelé (porte des 21 jours) |
| 0 | h4 | obtenir les avis de la porte 28 | H09 | x, aq, ar, archive, 15 à 17 ans, durée probatoire (NIR, seuil d'âge, transferts, DPO : clos par D-284) |
| 1 | h1 | essai de restauration (G-7) ; fait le 2026-10-14 (#1462) | F04 | toute migration après BP-09 |
| 1 | h1 | lettres c, v, o, t, am | F59, H13, H30, H31, H33 | cockpit, bandes, Momentum, rappel, quantités |
| 1 | h1 | grilles de la table d'arrêt (re-signature) | H42 | table d'arrêt complète |
| 1 | h2 | d, ad et bc, ba, aw, texte de az, at, cm, seuils_points, règles orphelines | H32, H34, H35, F34, F37, F45, F51, H40, H41 | adhésion, protocole, Track C, axes |
| 1 | h2 | M-3, signature des 8 liaisons NABM (écran praticien livré le 2026-10-15 ; 5 signées le 2026-10-15, 3 sans acte → M-3c) | F54 | f |
| 1 | h2 | R:Drive : valider les références une à une | H36 | fiches conseils |
| 1 | h2 | lire les deux comptes du LOT-02 du sommeil | H27 | porte 16 |
| 1 | h3 | u (fait le 2026-10-14 : D-293, #1446), cb ; textes (a), (e), (f) de D-283 ((f) fait le 2026-10-14 : G-8, #1446) | H37, H39, H26 | Patient Hub, écran de fin, durées |
| 1 | h4 | r, x | H28, H29 | J2-conf, J3-api |
| 2 | h2 | M-2 (doctrine du cockpit, porte 6) ; M-5 (1/2), signatures de BP-07 : fait (#1438) ; f | F59, F02, F54 | J1-cockpit, Jour N, cabinet ; BP-07 mergé (clos le 2026-10-14, #1438) ; G-3 |
| 2 | h3 | G-8 (fait le 2026-10-14, #1446) ; ai | H50, H51 | ACT-1, ACT-3 |
| 2 | h3 | intitulés des trois plans (bb) ; jeu d'illustrations de la saisie du sommeil (cc) | H49, H48 | lecture des trois plans ; habillage |
| 3 | h1 | M-1, signature de SAF-EI-01 amendée ; préalables de D-281 §2 : garde de diffusion, texte de l'avis rendu, producteur de la règle livrée remplacé (§8, D.3) | F66 | porte 7 au rang 4 |
| 3 | h2 | M-5 (2/2), approbation de la release-db de BP-09 (fait le 2026-10-14) ; G-3 | F03, F54 | toute migration suivante ; BF-7, BF-8 |
| 3 | h3 | al ; y | H57, H58 | marques alimentaires ; J3-cabinet |
| 3 | h3 | échelle du rituel du soir (cd) ; dire si la synthèse publiée au patient décrit les drapeaux du sommeil, et sous quelle forme | H54, H56 | rituel ; au |
| 4 | h1 | approuver, une à une, les release-db du rang 4 (EF-3b, BP-12a, BP-11, BP-13, BP-15, CC-8, axes, BF-8, collecte, D-283 b, retrait du NIR ; CC-8 dès qu'elle est prête, avant ai : D-315 §6-7) | fiches du rang 4 | codes consommateurs |
| 4 à 10 | h1 à h3 | signer les contenus de BP-12a, BP-12b, BP-17 (porte 23) ; accepter chaque texte patient avant son activation ; consigner la lecture de chaque ouverture qui ne vise que certains dossiers | F05, F09, F11, §3 | J3-bio ; file C |
| 5 | h1 | dire le sens d'« anomalie » au vu du premier constat d'activation | H05, §3 | porte 18 |
| 5 | h3 | texte de l'encart (bd) ; propriétaire et sources du thème « respiration et apaisement » (ah) | H71, H68 | encart ; fiches par thème |
| 5 | h3 | ch : trois phrases de tendance, règle de comparaison d'un agenda fini au précédent et marge « stable » à signer | H72 | phrase en fin d'agenda |
| 6 | h2 | indications v2, re-signées | F53 | bilan par axe |
| 8 | h2 | constater un cycle réel jusqu'au jalon de fin, par identifiant | F26 | fin de BIO-PARCOURS |
| 10 | h3 | confirmer les points de départ des deux messages du 21e jour ; celui de ak confirmé le 2026-10-23 (jour 0 de D-255, jours 18 à 24) ; celui de la place 9 reste à confirmer | H80, H81 | places 7 et 9 |
| T | h1 | chaque release-db, une à une ; chaque contre-revue P0 | §5 | codes consommateurs ; merges des lots P0 |

### La file D au 2026-10-14

Photographie au merge de #1446 (85b95dcc). Chaque ligne renvoie à sa fiche, sa lettre, sa porte ou sa source ; un état cite la PR qui le prouve. Les gestes déjà nommés par une ligne du §8 y restent (D/50).

**D.1 Faisables maintenant (préalables levés)**

| h | geste | fiche, lettre ou porte | ce qu'il débloque |
|---|---|---|---|
| h1 | M-5 (2/2) : fait le 2026-10-14 — release-db de BP-09 approuvée hors usage, sentinelle liée, constat par conteneur (#1448, D-294 ; seconde passe Codex « accepter ») ; suite : PR 2 | F03, porte 9 | effacement de dossier (en échec tant qu'elle manque) ; PR 2 de BP-09 ; toute migration suivante (après G-7) |
| h1 | effectif de masquage des agrégats (D-298 rédigée et acceptée : cinq dossiers distincts) | F25 | S-1 sur plusieurs dossiers, H07, y, BP-21a |
| h1 | essai de restauration G-7 : fait le 2026-10-14, réussi, porte 8 levée (#1462 ; portée écrite par D-289, #1430) | F04, porte 8 | toute migration après BP-09 |
| h1 | lettres m, n, ac, z : faites le 2026-10-15 (D-303, D-304, D-301, D-302) | H10, H11, H12, F45 | NF-7, EF-3b, radar, garde d'âge |
| h1 | sources de fidélité (G-10) : instruments arrêtés le 2026-10-15, références test-retest à fournir (H13) | H13, porte 11 | v |
| h1 | sources restantes de la porte 4 : poids égal, seuils du sommeil hors 8B et de « Mon équilibre », fidélité, quantités, axes ; liste de ce qu'il faut fournir préparée le 2026-10-15 (H08) | H08 | c, am, al, cm, seuils_points |
| h2 | K-05a et D4 (faits le 2026-10-15 : D-299, liste fermée ; porte 5 levée) ; bg | F46, porte 5 ; H18 | at, R:Drive, ag, ah, an, ay |
| h2 | at, date de naissance lue par l'extraction (texte patient de la main du responsable ; remplacée le 2026-10-22, D-342 §3) ; R:Drive, références du Drive de formation validées une à une : préalable K-05a levé le 2026-10-15 (D-299, liste fermée), reportés de D.3 le 2026-10-15 | F45, H36 | J2-conf (at) ; fiches conseils (R:Drive) |
| h2 | liste des 8 analytes NABM (S-7) : fait le 2026-10-15 (F54) ; véhicule de M-3 arrêté le 2026-10-15 : écran praticien, lot de code livré le 2026-10-15 ; 5 des 8 signées le 2026-10-15 ; candidats des 77 autres analytes préparés et deux arbitrages pris le 2026-10-15 (liste pré-remplie, constat signé « aucun acte ») | F54, porte 10 | M-3b, M-3c, f, G-3 |
| h2 | lettres j, q, s, aa, ab, av ; guide w ; ca (fait le 2026-10-15 : D-300) ; j, q, s, aa, ab, av faits le 2026-10-15 (D-306 à D-311) ; w : méthode écrite (D-312), dossiers de preuve par besoin puis guide de la main du responsable ; huit arbitrages rendus le 2026-10-15 (H15), deuxième dossier après J3-12c ; liste des statuts posés de s à écrire | F63, F38, F57, F55, H14, F33, H15, H17 | porte 12 ; ba ; ad et bc ; aw et az ; cb |
| h2 | cj (D-296 rédigée et acceptée, D/7) ; co (fait le 2026-10-15 : D-313 ; neuf critères à cocher de la main du responsable) | F49, F68 | cm ; AIPD |
| h2 | lecture des écarts d'unité textuels ; comportement voulu de la charge (tranché le 2026-10-21 : le barème ignore les actions vides ; correctif en file A, F76) | F60, F76 | deux unités ; correctif |
| h1, h2 | signatures des grilles de la table d'arrêt (E64) et des règles orphelines (E32) | H42, H41 | table d'arrêt complète ; axes |
| h3 | h, la Boussole retirée | H16 | J1-alim ; D-C5-01 à 04 |
| h3 | instruction de bf | H19 | indicateurs hebdomadaires |
| h3 | textes (a) et (e) de D-283 ((f) fait : G-8, #1446) | H26 | durées, information du médecin |
| h3 | ai, accusé de lecture daté de « Mes échanges » (décision faite : D-297, #1459 ; porte 14 levée ; code au rang 4, après G-7) | H51 | porte 14 ; « Mes échanges » ne s'ouvre pas sans lui (D-293 §4) |
| h3 | analyse d'impact du transfert et copie datée de l'accord d'Anthropic | F47 | registre RGPD ; critère du lot (j) |
| h3 | gestes RGPD : archivages, relance d'effacement, dossier resté sur une version antérieure du texte | H20 | registre RGPD à jour |
| h3 | relance écrite du laboratoire pilote | F41 | porte 29 |
| h3 | relance du recueil réel de 21 jours [Hypothese] | H45 | barème gelé |
| h3 | préparation des sources du thème « respiration et apaisement » | H68 | ah (rang 5) |
| h5 | retirer `WN_BIO_EXTRACTION_ASYNC` de Scalingo (`env-unset`, variable inerte depuis #1416) | F42 (mise à jour de G3) ; `docs/FEATURE_FLAGS.md:469-476` | ménage, sans effet sur le service |
| h2 | sources fermées des dossiers de mesure des besoins 6 à 12, deux d'abord (2026-10-18, décision 7) ; fait le 2026-10-21 (`WN-SRC-0567` à `0570`, #1615) | H15 | J3-12f |
| h2 | amendement v0.3 d'une position d'expert du dossier du fer, en conflit avec une règle du responsable du 2026-10-17 ; fait, signé le 2026-10-21 | H15, F02 | J3-12h |
| h2 | amendement v0.4 de la position P6 du dossier du magnésium (D-345 §2) — fait, signé le 2026-10-23 | H15 | J3-12h |

**D.2 Constats en attente**

| constat | fiche ou porte | quand |
|---|---|---|
| deux lectures de re-mesure de l'adhésion à l'agenda du sommeil, en agrégats (LOT-02) | H27, porte 16 | 2026-10-29 puis 2026-11-12 |
| release-db de la migration `bio_ingest_masquage_identite_v1` (#1426) : consignée le 2026-10-15 (porte 9 : run 38527276005, sentinelle liée au run, migration finie à 07:30 UTC, garde anti-recul rouge par conception) | porte 9 ; H26 (j) | fait |
| déploiement du lot 2 du masquage (#1428) ; premier masquage réel puis premier import `bio-extraction-v5`, par identifiant, sur un dossier de test ; aucun import d'une version antérieure né après #1428 | H26 (j) ; F46 | au premier usage |
| pause d'âge sur un dossier de test sans date ; date de naissance du dossier d'essai du responsable (identifiant à fournir, lecture par conteneur) | H26 (h) | au fait |
| reste du premier constat : premier import commenté, premier accusé `usage_ia` ; critères de la porte 1 et de F40 nommant v4 et v7, à relire (lecture en v5 depuis #1428, `usage_ia` en v8 depuis #1431 ; la version visée par F77 est tranchée par D-292 §5, #1446) ; fait le 2026-10-23 : critères réécrits en v5 et v8, premier import v5 commenté et premier accusé v8 constatés, porte 1 levée (F40) | porte 1 ; F40, H06 | au fait |
| avis et pièces de la porte 28 : conseil, K-26 volet 2, R-151, C4, ap, ah | H09, porte 28 | au fait |
| menu « Wellneuro » en service (#1427) | H03 | fait, constaté le 2026-10-22 : image en service `db9018ee`, dont #1427 est un ancêtre ; le bundle servi, lu par conteneur, porte « Wellneuro » au rail et aucun « WellNeuro » ; à l'écran du cockpit, « Wellneuro / Horizon 5.0 » et le bandeau « build db9018e » |
| signalement déposé par le responsable sur un dossier de test majeur à programme diffusé, après #1447 ; constat par conteneur, par identifiant, en agrégats (rattachement, élément, programme) | F66 ; §3, hors file | avant l'ouverture suivante |
| case « Autofix » de la synthèse CodeRabbit disparue (coupée dans l'interface par le responsable) | D-291 | sur la prochaine PR |

**D.3 Bloqués**

| geste | fiche | ce qu'il attend |
|---|---|---|
| c, d, puis M-2 | F59, H32 | S-2 (H01, file A) ; porte 4 pour c |
| v | H13 | G-10 |
| M-3 | F54 | 5 des 8 signées le 2026-10-15 ; les 3 sans acte attendent le constat signé de M-3c |
| f | F54 | M-3 ; M-3c (journal R1) |
| G-3 | F54 | f ; M-3b (liste pré-remplie) ; M-3c pour les analytes sans acte |
| cb ; illustrations de cc ; cd | H39, H48, H54 | ca fait le 2026-10-15 (D-300) ; porte 16 pour cc ; porte 15 pour cd |
| ad et bc | H34 | j : écrite le 2026-10-15 (D-306) ; préalable levé au merge |
| ba | H35 | q : écrite le 2026-10-15 (D-307) ; préalable levé au merge |
| aw ; texte de az | F34, F37 | av : écrite le 2026-10-15 (D-311) ; préalable levé au merge |
| cm | F51 | cj |
| at ; R:Drive | F45, H36 | K-05a (F46) : levé le 2026-10-15 avec D4 (D-299) et la liste fermée ; reportés en D.1 le 2026-10-15 |
| am ; seuils_points (E31) | H33, H40 | porte 4 |
| x | H29 | porte 28 |
| r, o, t | H28, H30, H31 | S-1 (H06) |
| comptage T0 en conteneur (fait le 2026-10-24 : constat versé en H07 ; reste la D-xxx du délai, tenue en H07) | H07 | effectif de masquage (F25) : levé par D-298 |
| texte de l'avis rendu au patient après verdict (D-281 §2 b) : signé le 2026-10-14 (D-281 §4), servi au portail par la seconde PR de l'étape 4 (fait ; inerte avant la signature) | F66 | étape 4 de D-281 |
| M-1, signature de SAF-EI-01 amendée | F66 | étape 4 de D-281 et les trois préalables de D-281 §2 (§8) |
| al ; y ; au | H57, H58, H56 | porte 4 et J2-alim (al) ; d, porte 6 et F25 (y) ; porte 16, c et porte 6 (au) |
| contenus de BP-12a, BP-12b, BP-17 (porte 23) ; indications v2 ; liens analyte-axe | F05, F09, F11, F53, F79 | lots de la file B |
| ch ; texte de bd ; ah | H72, H71, H68 | rang 5 |
| cycle réel jusqu'au jalon de fin | F26 | BP-21a |
| signature de la table révisée des niveaux de preuve | H15 | J3-12e (ingestion des sources de mesure) |
| réapprobation des protocoles diffusés, dossier par dossier | H15, D-329 §4 | déploiement de J3-12f |
| dossiers de preuve des besoins 1, 4, 5, 9, puis 3, 8, 10, 12, puis 6, 7, 11 ; définitions signées des besoins 6, 7 et 11 | H15, D-312 | besoin 2 achevé |

**D.4 Sans rang : objets sans fiche ni ligne du plan**

| D/n | objet | source | ce qui le lève |
|---|---|---|---|
| D/1 | worktrees d'hygiène `hygiene-apply-safe` et `hygiene-archivage` sur la machine du responsable (le §8 ne nomme que le premier) | handoff 2026-10-12-1430 ; SESSION_LOG (hygiène, 2026-10-12) | suppression constatée par le responsable ; fait, constaté le 2026-10-21 : aucun worktree d'hygiène dans la liste des worktrees |
| D/2 | bases locales de banc `wn_g3_lot3_banc` et `wn_g3_restes_banc` (fixtures du témoin rouge) | handoffs 2026-10-13-1110 et 2026-10-13-2330 | suppression, sur accord du responsable ; fait, constaté le 2026-10-21 : aucune base `wn_g3_*` dans le Postgres local |
| D/3 | base locale de développement en retard sur D-281 (index recréé à la main) | SESSION_LOG (G3, lot 2, 2026-10-13) | base neuve ou migrations rejouées, constat du responsable ; relevé le 2026-10-22 sans rien changer : la base de la copie principale (nom calculé par `scripts/wn-dev-db.sh`) porte les six migrations de D-281, aux sommes du dépôt, et le retard sur D-281 est donc résorbé ; restent cinq migrations postérieures au 2026-10-18 non appliquées et trois sommes divergentes (`20261006150000`, `20261009220000`, `20261015140000`) ; le constat du responsable reste dû |
| D/4 | copie principale restée sur la branche de bancs fictifs (`check:rapide` rouge faute de `prisma generate` après #1397 ; fichier non suivi des cas fictifs, caduc) | handoff 2026-10-12-2130 ; §11 | retour sur main constaté ; le banc est refait et suivi par l'étape 4 de D-281, PR 2 (F66) ; fait, constaté le 2026-10-22 : la copie principale a quitté la branche de bancs, mais elle n'est pas sur `main` : HEAD détaché sur `474995b4` (#1632), un ancêtre de `main` à huit commits de retard, que seule la session principale remet à jour ; la branche `test/saf-ei-01-cas-fictifs` n'existe plus ; le banc est suivi (`web/src/lib/trust/bancCasFictifsD281.test.ts`, #1457) |
| D/5 | outil MCP de l'ancienne base Supabase encore branché, neutralisé seulement par les refus de `.claude/settings.json` (D-120) | `CLAUDE.md` ; `.claude/rules/db-prisma.md` | retrait ou maintien décidé par le responsable ; tranché le 2026-10-21 : retrait. Le responsable déconnecte le connecteur ; ensuite, PR d'outillage qui allège les refus de `.claude/settings.json` (§8) ; fait le 2026-10-22 : connecteur absent (constaté le 2026-10-21), refus retirés, garde `execute_sql` conservée en filet (#1634) |
| D/6 | quatre branches distantes non mergées ou à supprimer : `docs/bp26-relecture-mdcg` (D/26), `docs/k-conditions-utilisation` (#1446, mergée par squash le 2026-10-14 : branche à supprimer), `feat/bp09-annulation-migration` (#1448, BP-09), `fix/repo-hygiene-du-macos` (outillage, fragment du 2026-10-10) | `git branch -r` sur 85b95dcc | merge, abandon écrit ou suppression de chacune ; fait, constaté le 2026-10-21 : trois branches déjà supprimées, `docs/bp26-relecture-mdcg` supprimée le même jour sur abandon écrit (D/26) |
| D/7 | collision de numéro : soldée pour BP-09, mergée sous D-294 (#1448, 2026-10-14) ; reste cj, commit local non poussé, qui prend le numéro libre suivant (D-295 au plus tôt) | `docs/DECISIONS.md` sur 39a1d1d3 ; handoff 2026-10-14-1930 | cj au numéro libre suivant, renvois du plan compris ; fait le 2026-10-14 : cj sous D-296, D-295 étant prise par #1453 |
| D/8 | seconde passe Codex sur la tête finale de #1448 : faite par le responsable le 2026-10-14 ; P2 assumés (verrous de migration, d'où une approbation hors usage ; `ON UPDATE CASCADE` face au trigger de figement) | PR #1448 | soldée (2026-10-14) |
| D/9 | `.wn/state.json` en retard sur main : tête « PR 4 à 6 à suivre », `recent_decision_ids` arrêté à D-289 (D-290 à D-293 sur main), `validation` du 2026-10-13, `corpus_registry` « inchangé » malgré WN-SRC-0508 à 0511 ; les traces de `next_action` sont de l'historique, comme les handoffs, et leurs mentions de dettes sont tenues ici | `.wn/state.json` ; §9 (pilotage, PR 3) | PR de pilotage : tête, décisions et validation remises à l'heure ; fait le 2026-10-14 (PR de ménage de la file D) : tête neuve, ancienne tête en trace, `recent_decision_ids` D-290 à D-294, validation et `corpus_registry` du jour |
| D/10 | adresses mortes citées par le plan : `next_action[40..62]` (vidé par la PR 3) ; `docs/claude/campagnes/FILE_ATTENTE.md` (supprimé, PR 5) ; `HISTORIQUE_CHANTIERS_TECHNIQUES.md`, `AUDIT_PANELS_*`, `AUDIT_BIOFLOW_*` (déplacés sous `docs/archive/`, PR 4) | handoffs 2026-10-14-0210 et 2026-10-14-0307 ; SESSION_LOG (PR 4, PR 5) | mention « historique Git » ou chemin d'archive, par une PR de plan ; fait le 2026-10-14 (PR de ménage de la file D) : chemins sous `docs/archive/`, numéros d'avant l'archivage (lus sur aaf73324^, le chemin `docs/claude/campagnes/AUDIT_*` cité était déjà faux) ; « historique Git » devant chaque citation de la file et de `next_action[40..62]` ; les lignes qui décrivent la suppression elle-même restent |
| D/11 | S-5, préalable de F03 et de H43 (« S-5 (F02) »), défini nulle part | F03, H43 ; handoff 2026-10-14-1745 | S-5 défini, ou remplacé par F02 (BP-07 clos, #1438) ; fait le 2026-10-21 : remplacé par F02 sur arbitrage du responsable, préalable corrigé dans H43 et F03 |
| D/12 | ligne « Identifiant » de F67 : « D-276 §1 » au lieu du §2 (l'écart est dit par la mise à jour de F67) | handoff 2026-10-14-1745 | ligne corrigée au prochain passage sur le plan ; fait le 2026-10-14 (PR de ménage de la file D) |
| D/13 | référence « D-129, #900 » de CB-07 (§8, soldées), D-129 portant sur la re-confirmation de persistance ; nom du laboratoire pilote dans la fiche BIO-INGEST, à relire en forme opaque | SESSION_LOG (PR 6) ; `docs/DECISIONS.md` (D-129) | relecture ; ligne datée ; fait le 2026-10-14 (PR de ménage de la file D) pour CB-07 : la référence est D-130 (#900) ; nom du laboratoire pilote remplacé par « laboratoire pilote » sur arbitrage du responsable du 2026-10-14 (campagne BIO-INGEST : `BRIEF.md:13`, `CAMPAGNE.md:80`, `lots/LOT-05-adaptateur-laboratoire.md:3`, :8 ; `CADRAGE_BIO_INGEST_2026-09-30.md:114`) ; l'historique Git le garde ; l'audit archivé `docs/archive/cadrages/AUDIT_BIOFLOW_2026-10-04.md:548` aussi, puis remplacé à son tour sur arbitrage du 2026-10-14, seule exception au figement, dite dans son bandeau |
| D/14 | trois lignes du §8 ajoutées par la PR 5, à reporter au plan privé source, hors dépôt | handoff 2026-10-14-0240 | geste du responsable, hors dépôt |
| D/15 | ligne REPRISE de `docs/claude/campagnes/README.md` : « ouverte », alors que la campagne est terminée le 2026-08-05 | handoff 2026-10-14-0010 | ligne datée, PR de documentation ; fait le 2026-10-14 (PR de ménage de la file D) |
| D/16 | textes périmés hors de la liste du §9 : Vercel et Supabase « tièdes », échéance du 2026-10-21, `vercel.json` (`docs/RUNBOOK.md:10-11`, :133, :161-162 ; `docs/claude/OBSERVABILITE_PRODUCTION.md:139` ; `docs/FEATURE_FLAGS.md:32`, :300-306, :388-389) ; « RUNBOOK périmé » (`docs/DOSSIER_RGPD.md:1197-1198`) | D-080, D-120, D-265 | lignes datées, sans effacement, comme la PR 6 ; fait le 2026-10-14 (PR de ménage de la file D) : lignes datées dans `docs/RUNBOOK.md`, `docs/claude/OBSERVABILITE_PRODUCTION.md`, `docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md` |
| D/17 | procédure durable de déploiement du worker (worker à 0, aucun travail en cours constaté, merge, déploiement, worker à 1, versions d'import constatées), écrite dans un seul handoff | handoff 2026-10-14-0935 | versée à `docs/RUNBOOK.md` ; fait le 2026-10-14 (PR de ménage de la file D) : `docs/RUNBOOK.md`, Déploiement, étape 7 |
| D/18 | gestes hors dépôt : page de suivi BioFlow après BP-07 ; mémoire de l'assistant sur l'autorisation de Copilot | handoffs 2026-10-14-1455 et 2026-10-14-1540 | constat du responsable |
| D/19 | §6 : « Première ligne du barème de charge (table vide) » contre l'échelle ratifiée de `baremeChargeV1.ts:41-48` (re-ratifiée par D-273) | lecture du code et de `.wn/state.json`, 2026-10-14 | relecture de la ligne du §6 ; fait le 2026-10-14 (PR de ménage de la file D) : ligne du §6 annotée ; puis retirée du §6 et datée au §7 sur arbitrage du responsable du 2026-10-14 (sans objet, aucun gel ne la remplace) |
| D/20 | restes de BP-07 au registre du corpus : WN-SRC-0241, 0062 et 0358 en quarantaine alors que leurs claims sont VALIDE ; WN-SRC-0508 à 0511 sans revue clinique | handoff 2026-10-14-1455 ; `docs/claude/corpus/source_registry.json` | statuts posés par le responsable |
| D/21 | WN-SRC-0058 et WN-SRC-0188 : `deprecated`, `requiredAction` « Dédupliquer » inchangée, comptées par le context-pack comme conflits ouverts | `source_registry.json` ; `scripts/wn-context-pack.mjs` | dédoublonnage constaté, `requiredAction` soldée |
| D/22 | recherche par identifiant dans l'atelier de curation du corpus, proposée après une confusion entre deux claims voisins | handoff 2026-10-14-1455 | décision du responsable, puis lot file B ; tranché le 2026-10-21 : recherche par identifiant `WN-CL-…`, lot file B sans migration (§8) |
| D/23 | réexamen échu (2026-10-01) de la dormance du rayon CORPUS biologie, seul rayon dormant | `docs/claude/corpus/consommation_decisions.json:14` ; `rayonCorpus.ts:37` ; §9 (PR 6) | réexamen consigné (date neuve ou levée) ; tranché le 2026-10-21 : levée, le rayon « 08 — Biologie fonctionnelle » se branche comme les sept autres (lot inscrit au §8) |
| D/24 | registre d'instruments non recompté depuis le 2026-08-09 ; contrats SQL des packs non relus en production depuis le 2026-08-09 | `.wn/state.json` (`validation.checks`) | recompte et relecture par conteneur, en agrégats ; fait le 2026-10-22 : `packs_registre_coherence_v1` et `packs_instruments_suspendus_v1` sont verts en production (8 packs, tous miroités, aucune dérive ; 1 pack actif, sans instrument suspendu) ; les 65 instruments du registre (v2, audit du 2026-09-14) sont tous en base ; les deux de plus en base (67) sont les alias historiques `Q_SOM_08` et `Q_STR_07` ; un écart est routé en D/51 |
| D/25 | mutations M1 à M11 et M15 de la contre-revue de BIO-INGEST sans résultat versé | `docs/claude/campagnes/2026-09-30-bio-ingest/REVUE_CODEX_MUTATIONS_2026-10-10.md:86` | passe Codex manuelle du responsable, résultats versés |
| D/26 | relecture du texte officiel du guide européen de qualification des logiciels et étape manquante de l'arbre (BP-26) | `TRAME_QUALIFICATION_BP26.md:244` ; branche `docs/bp26-relecture-mdcg` | merge ou abandon de la branche ; les déclencheurs restent F67 ; fait le 2026-10-21 : abandon écrit, branche supprimée (conclusions provisoires invalidées par l'avis extérieur puis D-276) ; la relecture reprend avec un spécialiste des logiciels dispositifs médicaux si un déclencheur de F67 survient |
| D/27 | constat de reprise du rayon Patients : la requête de ligne de base du 2026-09-17 lit une colonne retirée par #1434 | `docs/claude/campagnes/2026-09-16-rayon-patients/CONSTAT_LIGNE_DE_BASE.sql` | requête réécrite sans la colonne, ou constat abandonné par écrit ; fait le 2026-10-21 : ligne `nir` retirée, rejouée par conteneur en agrégats (dossiers 34, consultations 41, fiches 28, anamnèses 28, avec adresse 0, avec médecin 0 ; au 2026-09-17 : 29, 36, 22, 21, 0, 0), résultat écrit dans l'en-tête de la requête |
| D/28 | vérification à l'écran du statut de phase de D-179 sur les dossiers réels concernés, par identifiant | handoff 2026-09-14-2030-cloture-d179-statut-de-phase | constat du responsable |
| D/29 | demande de correction de l'objectif, en service sans drapeau propre, jamais éprouvée sur un dossier vécu | `docs/FEATURE_FLAGS.md:233-253` ; D-170 | constat d'usage en agrégats, avec S-1 (H06) [Hypothese] ; constat joué le 2026-10-22, par conteneur, en lecture seule (one-off-3840) : `demandes_correction_objectif` compte 0 demande, sur 0 dossier, ni plus ancienne ni plus récente ; la limite de D-170 demeure, et le constat se reprend au premier dépôt |
| D/30 | page des questionnaires du portail encore empilée (E11) ? La réponse à E11 vise l'accueil (`MonParcoursAccueil.tsx`) | `docs/claude/campagnes/2026-07-19-sp-spi-ma-spirale-patient/CAMPAGNE.md:68` | lecture du responsable ; si oui, lot file A |
| D/31 | navigateur intégré d'une messagerie Android non détecté par le rappel du sommeil (le §6 ne gèle que les libellés et l'iPhone) | `docs/claude/campagnes/2026-10-07-agenda-sommeil-adhesion/lots/LOT-11-rappel-ou-toucher.md:73` | même déclencheur que la ligne gelée du §6 |
| D/32 | DSN Sentry en région UE posés ou non, jamais consigné ; sans eux le SDK reste inerte | D-141 §6 ; `docs/claude/OBSERVABILITE_PRODUCTION.md:109-139` | pose ou constat consigné |
| D/33 | sonde externe de disponibilité et page d'état hébergée ailleurs, adresse dans le courriel du lien magique ; unité de l'alerte `p95_response_time` à vérifier | `docs/claude/OBSERVABILITE_PRODUCTION.md:143-156` | création et vérification par le responsable |
| D/34 | fenêtre de surveillance du passage à Next 15 : charge Postgres sous `staleTimes.dynamic` à 0, premier `process.exit(1)` du handler | D-139 §6 ; SESSION_LOG:5324-5326 | mesure consignée, ou fenêtre close par écrit ; fait le 2026-10-21 : fenêtre close par écrit (aucun incident consigné depuis le 2026-09-07, #934) ; le retour de `staleTimes` à 30 s reste écrit dans D-139 §6 |
| D/35 | flux d'embeddings du corpus vers un fournisseur tiers d'IA, armé en production, non déclaré aux patients : arbitrage jamais pris (aucune donnée personnelle, écrit avec sa garde ; ou liste patient corrigée) | D-145 §5 ; `docs/DOSSIER_RGPD.md:596-612` | arbitrage du responsable, puis registre RGPD ; fait : liste patient corrigée par D-299 (2026-10-15, OpenAI déclaré au patient et au registre) ; constat d'origine du registre RGPD passé en historique le 2026-10-21 |
| D/36 | fin de l'avis juridique, reçue coupée avant les durées | handoff 2026-10-13-0500-rgpd-avis-d284 ; SESSION_LOG (D-284) | suite versée, ou dite sans objet (durées fixées par D-283 §2) ; fait le 2026-10-21 : dite sans objet (D-283 §2) ; le point de départ des 10 ans d'archive reste la question 5.3 au conseil (H09) |
| D/37 | question de conseil : obligation de conservation opposable à un effacement (art. 17.3) | `docs/claude/REGISTRE_FRONTIERES.md:877-879` | avec les avis de la porte 28 (H09) |
| D/38 | texte de collecte de G-11 : son renvoi à « Vos données personnelles », partie des conditions d'utilisation après ACT-1 (k, D-292, #1446) | handoff 2026-10-14-1930 ; `docs/claude/propositions/2026-10-14-u-patient-hub/README.md` | renvoi ajusté en forme à la publication des conditions (ACT-1, H70) ; fait le 2026-10-24 : les conditions v1 à v3 publiées sans y toucher, le texte servi depuis le 2026-10-20 renvoyait encore au texte autonome ; il nomme désormais « la partie « Vos données personnelles et leur confidentialité » des conditions d'utilisation » (arbitrage 8 de G-11, validé par le responsable le 2026-10-24) |
| D/39 | gabarits de messages patient sans date de validation (`valideLe` nul, 10 entrées sur 14) | `web/src/lib/correspondance/registreGabarits.ts` | validation datée, gabarit par gabarit, par le responsable ; recompté le 2026-10-22 sur e69b4f00 : 10 versions sur 17 ont `valideLe` nul (les 3 versions ajoutées depuis le 2026-10-15, `conditions_utilisation` v1 et v2 et `protocole_diffuse` v1, sont nées validées) ; sur les 14 clés, la version servie (la plus haute, `getGabarit`) est sans date pour 9 : `lien_magique`, `relance_agenda_sommeil`, `assignation_questionnaire`, `assignation_pack`, `file_envoi`, `accuse_reception`, `envoi_bilan`, `objectif_propose` v2, `relance_questionnaire` ; `acces_portail` v1, sans date, est remplacée par sa v2 validée ; le commentaire de `objectif_propose` v2 (« validé le jour même ») est recopié de la v1 et contredit son `valideLe` nul ; rien n'est levé ; fait le 2026-10-23, sur arbitrages du responsable, gabarit par gabarit, sur le texte servi : `lien_magique`, `relance_agenda_sommeil`, `envoi_bilan` et `relance_questionnaire` validés tels quels ; `objectif_propose` v2 datée du 2026-09-10 (date confirmée, commentaire corrigé) ; `assignation_questionnaire`, `assignation_pack`, `file_envoi` et `accuse_reception` en v2, sans titre d'instrument, sans nom de pack ni liste, sans note libre, nées validées ; les 14 gabarits servis sont datés, l'écart « données de santé » ne reste déclaré que sur des v1 qui ne sont plus servies |
| D/40 | régime de garde des chemins sortants (A statu quo, B retenir au service du bilan, C synthèse bloquante ; A par défaut) | handoffs 2026-08-22-1155 à 2026-08-22-1329 | décision du responsable ; fait le 2026-10-21 : régime A, statu quo écrit (« non tranché » retiré de `web/src/lib/documents/vocabulaire.ts`) |
| D/41 | candidats de couverture du crochet d'écriture non tranchés ; vestige `WN_ALLOW_RISKY_COMMAND` (le crochet Bash sort sans lire) | `.claude/hooks/protect-wellneuro-files.test.mjs:106-115` ; `.claude/hooks/block-risky-commands.mjs:16` | décision du responsable, puis PR d'outillage (§8) ; tranché le 2026-10-21 : `stopRulesLibelles.ts` et `questionnaires/alimentaire.ts` sous « demande », fixture libre, `WN_ALLOW_RISKY_COMMAND` retiré ; PR d'outillage inscrite au §8 ; fait le 2026-10-22 (#1635) |
| D/42 | D-JA-03 : l'issue « fait » ou « adapté » reste choisissable quand l'occasion ne s'est pas présentée | `DETTE_JA.md:18` ; `FoodObservationJourney.tsx:135-139` | réponse du praticien avant H45 ; aucune règle sans D-xxx ; tranché le 2026-10-21 : après « Non » à l'occasion, seules les issues d'empêchement restent proposées ; D-xxx puis lot file A avant H45 (§8) ; **soldée le 2026-10-21 par D-337** |
| D/43 | courrier de bilan qui ne nomme jamais le patient (minimisation) : choix à confirmer | `docs/claude/campagnes/2026-08-18-biologie-consolidee/CAMPAGNE.md:82` | confirmation écrite du responsable ; fait le 2026-10-21 : choix confirmé, nom du patient en en-tête du rendu imprimé seulement (lu au dossier), jamais en base ni en journal |
| D/44 | escalade d'un conflit de sources sans effet sur l'extinction ni les préconditions T0 (liste de claims cités vide, délibérément) | `docs/claude/campagnes/2026-08-18-doctrine-executable/lots/LOT-11-actes-en-attente.md:104` | arbitrage clinique du responsable ; D-xxx s'il y a effet |
| D/45 | `MAX_AXES_PRIORITAIRES` de la synthèse praticien sans provenance ; DC-29 sans producteur ni vocabulaire | `docs/claude/campagnes/2026-08-18-doctrine-executable/LOT-03-MESURE.md:89` ; `web/src/lib/synthese-praticien.ts:41` | arbitrage du praticien, D-xxx ; aucune valeur proposée ici |
| D/46 | ancienneté de la passation qui exclut sa cible (`dejaRepondu` booléen, sans fenêtre) | chaîne T0, `CAMPAGNE.md:75` ; `web/src/lib/clinical/orientationEngine.ts` | arbitrage du praticien, D-xxx ; aucun seuil proposé ici |
| D/47 | réserves de la table de contradictions de rythme : aucun claim attribué aux trois règles, forme du prédicat, recoupement avec une règle d'orientation non résolu | chaîne T0, `DOSSIER_REGLES_LOT-01.md:251` ; `recoupementContradictions.ts` | curation signée du responsable |
| D/48 | suite n° 4 du bilan de l'objectif à trois voix : confirmer un nouveau T0 ferme-t-il une fenêtre d'étape ouverte | `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/BILAN.md:166` | décision du responsable ; fait le 2026-10-21 : D-113 §8 répond (l'ouverture d'un cycle ferme les fenêtres ouvertes du précédent), aucune décision nouvelle |
| D/49 | palette de commandes praticien et capacités P3 différées (recherche globale, tableau de bord personnalisé, visualisations complexes, CAT réel) ; questions du shell 3.0 sur le rail et la recherche | `DETTE_UX_RESIDUELLE.md:35` ; `docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md:72-78` | gel avec déclencheur (§6) ou abandon (§7), par le responsable ; fait le 2026-10-21 : gel au §6 |
| D/50 | gestes sans rang déjà tenus au §8, cités ici par renvoi : drapeaux `WN_CE_QUI_COMPTE` et `WN_DOSSIER_DEUX_VOIX` ; attentes humaines (invitations, fil médecin, escalade Q_GEO_04) ; R2-SOM-05 ; lettre d'adressage à arbitrer ; règle G6 ; proposition de bilan servie au cockpit ; liens externes vers les chemins archivés ; sélections `libre:` de 5A ; masquage lu par chaque import ; demandes de droits sans circuit pour une personne sans accès au portail | §8 | la ligne du §8 fait foi |
| D/51 | `questionnaires.actif` périmé en production : cinq instruments actifs au catalogue de code (`Q_GEO_03` à `Q_GEO_06`, `Q_NEU_06`) restent suspendus en base, car le backfill du registre n'a pas été rejoué après D-066 ; le service n'est pas touché (les routes lisent `IDS_SUSPENDUS`), mais `packs_instruments_suspendus_v1`, qui prend la base pour source, rougirait si un pack actif portait l'un d'eux, et révélerait ainsi l'écart entre le catalogue de code et la base | constat D/24 du 2026-10-22 ; `web/prisma/backfillQuestionnaireRegistry.ts` ; `web/src/lib/questionnaires-catalog.ts:542` | décision du responsable : écriture en production (migration relue puis `release-db`, D-087) ou écart accepté par écrit ; ligne du §8 |
| D/52 | note par défaut affichée comme celle du praticien : sans note, le pack enregistre « Pack <nom> » et l'envoi groupé « Envoi groupé — bibliothèque » dans `Assignation.notes`, et l'espace patient l'affiche sous « Note de votre praticien » | `web/src/app/api/praticien/packs/assign/route.ts:147` ; `web/src/app/api/praticien/file-envoi/envoyer/route.ts:129` ; `GenericQuestionnaire.tsx:327` ; revue CodeRabbit de #1659 | décision du responsable (note vide, ou libellé distinct à l'écran), puis lot de code sans migration ; d'ici là, les v2 du pack et de la sélection ne renvoient pas au « mot » du praticien (#1659) — **fait le 2026-10-23**, sur arbitrage du responsable (note vide et filtre) : les trois écrivains, pack de base du portail compris (`assignBasePack.ts`), enregistrent null, et `api/patient/questionnaire` retire les deux anciens libellés à la lecture (`notePraticienAffichable`), sans écriture en base |

**D.5 Échéances et gelés**

| objet | échéance ou déclencheur | source |
|---|---|---|
| revue RGPD : avis du conseil, AIPD, accords et analyse d'impact ; D-TRUST-02, 06, 10 | 2027-06-30 | D-265 §4 ; D-283 §9 ; F47, H20, F68, F69 |
| second compte praticien | fermé jusqu'au 2027-10-11, puis test d'intrusion humain | D-288 §5 ; D-283 §7 |
| adaptateur du laboratoire pilote | gelé jusqu'à sa réponse écrite | F41, porte 29 |
| recettes FC-7 et familles B3 | gelées jusqu'au texte du responsable | H68 ; §6 |
| revue de six mois de la règle d'orientation des effets indésirables | 2027-04-18 : point de départ fixé le 2026-10-21 par le responsable à la mise en service du 2026-10-18 (porte 7 levée) | D-TRUST-08 (§8) ; F66 |
| borne mensuelle (12 mois) des sauvegardes de l'hébergeur, engagée par le texte patient | constat au premier cycle mensuel complet [Hypothese] | `docs/DOSSIER_RGPD.md:1054-1070` |
| panel humain de compréhension ; version audio ou simplifiée | « porteur nommé » | §6 (D-TRUST-01, D-TRUST-04) |

## §5 Ce qui avance en parallèle, ce qui ne s'accélère jamais, et les limites

### Fronts parallèles dès le rang 0, sous la règle de non-collision

1. Constats : S-1 (F40, H06) et le comptage avant T0 (H07) ; lecture seule en conteneur, agrégats, par identifiant ; K-18a écrite.
2. Textes courts : S-2, ci puis S-3 (faits le 2026-10-14, #1425, #1430), cq, puis les lettres sans préalable ; un merge à la fois ; numéro D-xxx réservé dans main (N-5).
3. Cosmétique sans migration (file A) : S-4, la graphie, puis les parts de J1-base sans préalable, hors frontière occupée.
4. Biologie (file B) : BP-07 dès a mergée (clos le 2026-10-14, #1438), puis BP-09, seule migration en vol, puis sa release-db constatée avant toute autre migration. La migration du lot 2 de D-281 est passée en tête par le fait, constatée le 2026-10-13. La migration du lot 2 de D-282 (file du G3) est passée ensuite, le même jour, par le fait (#1412, release-db approuvée et constatée, attestation du handoff 2026-10-13-0500) : la collision envisagée avant ces deux migrations ne s'est pas produite. Le plan tient l'ordre acquis pour la suite : release-db de BP-09 au rang 3, puis l'essai de restauration, puis le rang 4. Une seule migration en vol (D-087) : la session parallèle lit le plan avant d'ouvrir toute migration ; le versement (PR 1) le lui donne.
5. Paquets du responsable : CGU, Patient Hub, mineurs, sources de fidélité, sources de la porte 4 ; préparés en parallèle, rien ne s'active.
6. Le nombre de fronts est borné par l'attention du responsable, relecteur unique, pas par le code. Quand le code avance plus vite, on prend le rang suivant dont les portes sont levées.

### Ce qui ne s'accélère jamais

- Une activation patient à la fois, un constat entre chacune ; places 1 à 5 jamais permutées ; le formulaire de sécurité de D-281 hors file, seul, constaté avant l'ouverture suivante.
- release-db humaine, une à une ; merger une migration ne l'applique pas ; un merge à la fois ; **jamais d'auto-merge sur une PR de lot** (D-087 ; D-248) ; une seule migration en vol sur `schema.prisma` ; déploiement constaté avant le merge suivant (G-6, N-7).
- Ordre des release-db : (1) D-281 lot 2, fait ; (2) D-282 lot 2, fait (#1412) ; (3) BP-09 au rang 3 ; (4) essai de restauration réussi (porte 8) avant toute migration suivante, fait le 2026-10-14 (#1462) ; (5) le rang 4, selon la hiérarchie : EF-3b, BP-12a, BP-11, BP-13, BP-15, CC-8, axes [Hypothese], BF-8, collecte, D-283 (b) [Hypothese], retrait de la colonne NIR (D-284 lot g) [Hypothese], ai (D-297 §6), et selon les cas J2-med, statut posé, J1-alim, J2-alim, J3-api, J3-cabinet ; (6) le rang 5 : BP-12b, BP-14, BP-18a, BP-18b s'il migre, BP-05 [Hypothese], selon F79 ; (7) rang 6 : BP-27 [Hypothese], selon ax et indications v2 ; rang 7 : BP-19 [Hypothese] ; rang 8 : BP-22 [Hypothese] ; rang 10 : J3-mineurs ; (8) gelées : adaptateur du laboratoire (porte 29), selon F41.
- Lecture de la porte 8 : BP-09 ne l'attend pas ; G-7 peut se jouer dès le rang 1 ; toute autre migration l'attend. D-g s'écrit dans la lettre g avec la portée acquise (F04) ; écrite le 2026-10-14 par D-289 (#1430), dont le §1 compte aussi #1426 (D-284 lot j) parmi les migrations passées avant l'essai ; deux migrations sont passées avant l'essai par le fait (D-281 lot 2, D-282 lot 2), ce qui rend G-7 plus pressant sans changer son rang.
- Texte accepté, puis registre, puis drapeau, avant toute surface patient neuve ; aucune IA sur les documents déposés ; un registre avant chaque table et chaque site IA (F70).
- Aucune règle clinique sans signature : ni seuil, ni poids, ni borne, ni dose inventés ; D-xxx et fragment `changelog.d/`.
- Toute table neuve qui associe un patient nommé à un geste de soin est de catégorie particulière (D-251 §9) : D-283 §3 y reclasse six tables et les deux tables de gestes motivés, et fait du lien patient ↔ médecin traitant une donnée de santé ; la liste de dispense du banc de la rubrique 5 est vide (#1411) ; registre avant chaque table (F70).
- Portail sans chiffre ; aucune relance automatique. Cockpit chiffré permis sous provenance (F59).
- Aucun pourcentage d'adhésion, aucune moyenne d'une grandeur ordinale, aucun mot qui juge sans bande signée.
- Aucun chemin de sécurité éteint parce qu'il est à zéro.
- Aucun dossier réel visé par un seed ou un E2E ; aucune identité au dépôt ; une fixture prouve un mécanisme, jamais un parcours (D-125).

### Règles de BioFlow

- Au plus une PR structurelle par campagne à la fois ; jamais deux PR simultanées sur les mêmes modèles Prisma ou la même frontière biologique ; un merge à la fois (D-248) et une migration à la fois (D-087) (`docs/architecture/bioflow/BIOFLOW_ROADMAP.md:51-54`).
- Aucun nouveau pack biologique clinique : règle permanente depuis D-296 §3 (cj, F49) ; un besoin s'exprime en analytes, axes, règles signées ou propositions patient (`BIOFLOW_ROADMAP.md:71-77`).
- Interdits de construction jusqu'à l'ouverture de P2 : multi-tenant, API publique, LOINC, facturation, SDK, OAuth, microservice, Python ; le processus de fond du G3 reste dans l'application (D-282 §2).

### Fermetures

- Second compte (fermé un an), API et recherche, flux laboratoire, envoi direct au médecin : fermés. Toute levée passe par une D-xxx, après l'amendement de D-276 à cinq déclencheurs (ci, F67 ; écrit par D-286, #1425) ; le flux laboratoire attend en plus la porte 29 (F75, F41).
- Un test d'intrusion humain devient obligatoire avant toute offre commerciale ou tout second compte praticien (D-283 §7). HDS suffit : la réserve SecNumCloud de D-006 est close ; aucun DPO n'est désigné, le point de contact est le responsable, et l'obligation de désigner relève d'un conseil (D-283 §7).
- Différés fermes de C2, jamais repris : analyse émotionnelle libre, score de décrochage, notifications proactives, pourcentage d'observance au patient (campagne suivi-j7, `CAMPAGNE.md:70-77`).
- Messagerie de santé hors de portée : aucun canal sortant, aucun sous-traitant de plus (D-222 §4). La messagerie du portail est une collecte documentaire seule, sans conversation.
- SSO multi-établissement ; RAG dynamique tant que D4 et D7 ne sont pas tranchés (`docs/archive/roadmap-updates/HISTORIQUE_CHANTIERS_TECHNIQUES.md:82-93`).

### Règles transverses du rang T

- J1-total, J2-total, J3-total : sommes gardées hors dépôt comme ordres de grandeur ; les « rythmes requis » sont abandonnés.
- G-12 : contre-revues P0 sur diff collé, commentaires en ligne lus ; contre-revue adverse avant le lot de clôture (F71).
- N-1, N-2 : chemins propres à la cosmétique et à la biologie ; fichiers de BP-09 écrits dans sa fiche avant ouverture.
- T-4, N-4, RK-1 : frontière commune (Fil, fiche, `DetailBesoinsPanel`, instantanés) : une PR à la fois ; branche vérifiée après toute revue.
- N-3 : L5 suit la file biologie, jamais pendant une PR BIO-PARCOURS. N-6 : titre du Fil et K-10 dans une fenêtre sans PR biologie sur le Fil. N-8 : frise et chronogramme du sommeil intouchés avant la clôture du LOT-02 ; la porte est la clôture, pas une date.
- N-5 : numéro D-xxx réservé dans main ; merge un à un.
- Clinical Core est un nom informatif ; le code ne bouge pas.
- R:Délestage : si la relecture déborde, retirer dans l'ordre comptes du cabinet, accès externe, frise unique, « Protocole personnalisé » remis ; la biologie de niveau 3 garde sa place ; jamais la sécurité ni la vérité. R:Repli : pour alléger le palier 1, reporter d'abord « Jour N sur 21 » et la frise, puis l'esquisse de la page du cabinet.
- S-8 : BF-4 livré ; côté patient, jamais un chiffre.
- Invariants déjà écrits, cités ici sans recopie : secrets, français, une finalité par PR, vocabulaire et dispositif médical de D-266 §2 et §4 et de D-276, changelog, paliers T1 à T3 (`CLAUDE.md` ; `REGISTRE_FRONTIERES.md` §1) ; triptyque ludique en forme seule, deux régimes de contenu (D-266 §2) ; corpus SIIN : chaîne de validation, pas d'affinage de modèle.
- D-234 maintenue : ne pas la refermer sans amender D-257 A7 ; D-093 non levé.
- Critère transverse des lots 6.0, repris de la file supprimée : une stratégie incomprise ou irréalisable n'est pas « done » (historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:97-99`).
- « 6.0-B » nu est ambigu (objectif à trois voix, ou charge et capacité) : toujours qualifier (historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:11-24`). De même « R6 » nu (trois séries R) et « Track C » (BioFlow) contre « file C » (activations).

## §6 Gelés, avec déclencheur

Un gel n'a pas de rang : il prend un rang au déclencheur posé, par la règle. Déclencheur nommé : sans marque ; déclencheur proposé faute de nom : [Hypothese] (un déclencheur par reste ; tri à la prochaine version du plan). Les vérifications au code renvoyées au premier constat sont dans H06, non ici. BP-04 n'est pas gelé avec la piste C : BP-16, BP-20 et BP-21a l'attendent (F16, rang 4).

| objet | déclencheur | où il reprendra |
|---|---|---|
| Barème de l'agenda alimentaire (LOT-06 de l'agenda et LOT-02 de la chaîne, fusionnés) | la porte des 21 jours : un recueil réel suffisant (au moins 7 journées par dossier, 21 pour une clôture ; `docs/claude/campagnes/2026-08-10-chaine-alimentaire/CALIBRATION_LOT-02.md:7`) | rang 4 au plus tôt à la levée [Hypothese], après J2-alim |
| Adaptateur du laboratoire pilote (ex-LOT-05 de BIO-INGEST) | réponse écrite du laboratoire, format réel (porte 29) | lettre cl au rang 0 du déclencheur, chaque migration au rang 4 au plus tôt |
| Les cinq briefs d'août : charge et capacité (6.0-B charge), récit du parcours (6.0-C), jumeau de compréhension (6.0-D), curation hors remboursement, moitiés praticien et patient de l'objectif et l'amorce « Ce que j'ai compris de vous » (dossiers d'origine sortis du dépôt en PR 4, lisibles dans l'historique Git : `docs/claude/campagnes/2026-08-21-charge-et-capacite`, `2026-08-21-recit-du-parcours`, `2026-08-21-jumeau-de-comprehension`, `2026-08-18-curation-signee`) | « premier suivi quotidien reçu » | prochaine version du plan |
| Curation des exclusions d'intervention (`neCouvrePas` vide sur 95 interventions), axes du claim (D-096), épargne digestive et deux claims à unité fausse | même déclencheur que les briefs [Hypothese] | prochaine version du plan |
| FC-6, FC-9b, instruments visuels 1, 3, 5, 6, 7, SO-2, surfaces 6.0-A non nommées ailleurs dans ce plan | même déclencheur que les briefs [Hypothese] | prochaine version du plan |
| Panel humain de compréhension (D-TRUST-01) ; version audio ou simplifiée (D-TRUST-04) | « porteur nommé » | prochaine version du plan |
| Recettes (R3 de la feuille de route produit, FC-7) ; familles d'équivalence (B3 du cadrage Boussole et assiette, table de repli vide) | « attendent le texte du responsable » | rang de ah (H68) au texte reçu [Hypothese] |
| Index C5A (D-C5-05) | « si le volume » : valeur à fixer au tri ; repère proposé [Hypothese] : le volume constaté au premier S-1 (H06) | prochaine version du plan |
| `packs.qids` (aucun calendrier de décommission) | `check:pack-registry` rouge | rang 1 au déclencheur [Hypothese] |
| Annoter un dossier clos | une surface qui relit la note après clôture | prochaine version du plan |
| Libellés du rappel sur Android et iOS ; sonnerie sur un vrai iPhone | prochaine recette sur appareil ; prochaine recette sur iPhone [Hypothese] | rang du premier lot du sommeil ouvert après la recette [Hypothese] |
| Profils QX « bloqués jusqu'à satisfaction » ; SCOFF et table d'orientation | certification de chaque profil | prochaine version du plan |
| `clinicalSnapshot.ts:1`, seul reste du catalogue typé | prochaine modification de ce fichier [Hypothese] | dans le lot qui le touche |
| Mémoire relationnelle consentie | nouvelle finalité RGPD : information des personnes et base légale d'abord ; la borne du 2026-10-21 est caduque | prochaine version du plan |
| Programme corpus (gates G0 à G4, pilote sommeil) | extraction du stock faite, G6 ouvert | prochaine version du plan |
| IDP2 LOT-04, jeton permanent | une mesure d'usage qui le justifie (constatée en agrégats) | prochaine version du plan |
| Canvas ardoise (cockpit-vivant, fil-du-jour, decision-clinique) | ouverture de J1-cockpit [Hypothese] | rang 3 au plus tôt, avec J1-cockpit (F59) |
| DC-20, DC-26, DC-58 ; DC-43 | porteur nommé [Hypothese] ; DC-43 : curation des exclusions | prochaine version du plan |
| Q_PED_03 suspendu | certification pédiatrique ouverte [Hypothese] | prochaine version du plan |
| OCR papier des questionnaires | porteur nommé [Hypothese] | prochaine version du plan |
| Parts A à D de la chaîne documentaire (sûreté de ce qui part) | ouverture de R:Synthèse [Hypothese] | rang 6, avec H73 |
| A4 et A5 du protocole tiré du corpus (514 « à ne pas faire ») | ouverture de ag [Hypothese] | rang 1, avec H25 |
| Facturation (R7 de la feuille de route produit) ; chaînage d'agenda externe (R6) ; passkeys (R8) ; vocal, capteurs, partenaires | porteur nommé [Hypothese] | prochaine version du plan |
| Radar cliquable ; conseils quotidiens ; alerte de dégradation ; agent conversationnel | porteur nommé [Hypothese] ; limites : aucune relance automatique, aucune conversation | prochaine version du plan |
| D4 et D7 : RAG dynamique | D4 et D7 tranchés | prochaine version du plan |
| Piste C de BIOFLOW_ROADMAP et son articulation ; LOINC (futur) ; étapes 2, 3, 4, 7 des panels hors fiches | lettre ax ouverte [Hypothese] | rang 6, avec F35 |
| SP-CAB, SP-AMB | « n épisodes clos » : n à fixer au tri [Hypothese] ; cadre CNIL | prochaine version du plan |
| Palette de commandes praticien et capacités P3 différées : recherche globale, tableau de bord personnalisé, visualisations complexes (D/49, gelé le 2026-10-21) | besoin exprimé par le praticien en consultation | prochaine version du plan |
| NF-4, NF-4b, NF-4c, NU-2b, EF-4 à EF-7, PA-4, PC-1 à PC-3, L2, L6, CC-1, CC-4, PF-5, PF-6 | porteur nommé [Hypothese] ; NF-4c : premier import neuf du scoring | prochaine version du plan |
| Branches K-02 (CF-5, CF-6, OF-3, OF-4, instrument 4), K-22 (CF-7, instrument 2), K-11 (NF-5c, FC-9a, OF-5c, OF-6, LG-1) | portes 15, 21, 20 | rang suivant la porte levée |
| Trame des jalons (I3), échéances (E3), charge et capacité (M1), journal quotidien (E6b), grille hebdomadaire (E7), courbe de Momentum aux points | la donnée réelle, constatée en agrégats ; porte 22 | rang suivant le constat |
| NotebookLM dans la chaîne des fiches | une D-xxx qui amende la décision du 2026-07-23 ; K-05a et D4 | prochaine version du plan |
| Questions 2 à 5 du §6.5 du cadrage BIO-PARCOURS v3 : preuves en claims avant affichage, instrument de fatigue, vue patient sans chiffres d'abord, évaluateur indépendant de l'étage assistant | ouverture du lot BP qui les consomme [Hypothese] ; la question 5 au plus tard avant la première fonction de l'étage assistant (F27) | rang du lot qui les consomme |

### Fiches gelées

#### F32 · La biologie dans le score des 12 besoins
- **Identifiant, piste** : horizon ; parcours.
- **Rang** : gelé avec déclencheur : une décision qui amende D-122, à l'initiative du responsable ; si le déclencheur est posé, 7 au plus tôt [Hypothese], après BP-27 (rang 6).
- **Portes, préalables** : BP-27 livré ; sources certifiées.
- **Migration, release-db** : selon.
- **Décisions, textes** : D-xxx amendant D-122 et règles signées.
- **Critère de fin** : sans objet tant que le déclencheur n'est pas posé.

#### F41 · Adaptateur du laboratoire pilote (ex-LOT-05), porte 29
- **Identifiant, piste** : ex-LOT-05 de BIO-INGEST ; ingest.
- **Rang** : gelé, déclencheur : porte 29 « réponse écrite et format réel du laboratoire pilote » ; décision de cadrage au rang 0 dès la porte levée. Geste de rang 0 dès maintenant : relancer le laboratoire par écrit.
- **Portes, préalables** : porte 29 ; flux laboratoire fermé ; LOT-10 fait. Écart à nommer : l'audit BioFlow range le premier connecteur laboratoire pilote en P3 (`docs/archive/cadrages/AUDIT_BIOFLOW_2026-10-04.md:767`) ; le cadrage du 2026-10-07 en fait un lot de BIO-INGEST, suivi ici, sous la porte 29 et le flux fermé.
- **Migration, release-db** : oui, jusqu'à quatre : modèle de réception « oui, seule », file à rattacher « probable », table des codes « oui », transport « minime » (`docs/claude/campagnes/2026-09-30-bio-ingest/CADRAGE_LOT05_ADAPTATEUR_2026-10-07.md:66-70`) ; une à la fois, chacune au rang 4 au plus tôt après la levée.
- **Décisions, textes** : lettre cl : canal, destinataire non prescripteur, rôles RGPD, conservation, rectificatif tracé (sœur de D-124) ; registre et information patient (nouvelle provenance).
- **Critère de fin** : format reçu, cl mergée, sous-étapes jouées une migration à la fois ; ou abandon écrit faute de format.

#### F48 · Bancs et observabilité de la lecture
- **Identifiant, piste** : banc de la lecture IA rejoué à chaque changement de modèle, taux de correction par laboratoire, coût et durée par compte rendu, double lecture des lignes douteuses, comptes rendus non validés au fil du jour, double dépôt ; ingest et plateforme.
- **Rang** : gelé avec P1 (F72) pour le banc, le taux de correction et le coût par compte rendu ; la double lecture gelée tant que « douteux » n'a pas de définition sans seuil inventé ; les comptes rendus non validés gelés tant que le délai n'est pas arbitré ; le double dépôt gelé derrière la porte 29. Si P1 s'ouvre : banc, taux et coût au rang 1 au plus tôt [Hypothese], sur fixtures sans migration ; le double dépôt au rang de F41.
- **Portes, préalables** : ouverture de P1 ; fixtures seules, jamais un dossier réel.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : D-xxx de P1 (jeu de référence en fixtures) à l'ouverture.
- **Critère de fin** : banc rejouable en CI ; écart mesuré par modèle.

#### F72 · P1 : industrialisation du cœur
- **Identifiant, piste** : jeu de référence (gold dataset), observabilité, métriques de qualité, coût réel par document (`docs/archive/cadrages/AUDIT_BIOFLOW_2026-10-04.md:730-740`) ; plateforme. Les jobs durables, le processus de fond, la reprise et l'idempotence sont livrés (D-282, F42).
- **Rang** : gelé, déclencheur proposé [Hypothese] : l'ouverture par le responsable de P1, au plus tard avant tout changement du modèle d'extraction ; si ouvert, banc sur fixtures au rang 1 au plus tôt [Hypothese].
- **Portes, préalables** : P0 (fiabilité) tenu par la clôture de BIO-INGEST ; G3 clos (D-282 §8) ; fixtures seules.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : D-xxx de P1 à l'ouverture. La dette « banc à base réelle » du LOT-02 de biologie-exploitee y est candidate, à trancher.
- **Critère de fin** : gold dataset rejouable en CI ; coût par document mesuré ; jamais un dossier réel.
- **Mise à jour (2026-10-13)** : le processus de fond du G3 (jobs durables, reprise, idempotence) est livré et le G3 clos (#1415, #1416 ; F42, close) : F72 ne porte plus que le jeu de référence et les mesures de P1 ; ses champs sont réécrits en conséquence (revue de #1417).

#### F73 · P2 : préparation à l'externalisation
- **Identifiant, piste** : frontières de domaine, organisation et tenant, isolation, API versionnée, terminologies versionnées, LOINC si besoin démontré, en complément de la NABM (`docs/archive/cadrages/AUDIT_BIOFLOW_2026-10-04.md:742-756`) ; plateforme.
- **Rang** : gelé, déclencheurs : P1 fait et levée d'une fermeture (F75), après ci ; si levé, 5 au plus tôt [Hypothese], après P1.
- **Portes, préalables** : lettres b et x après ci ; avis DPO (porte 28) pour x.
- **Migration, release-db** : selon.
- **Décisions, textes** : une D-xxx par levée.
- **Critère de fin** : sans objet tant que rien n'est levé.
- **Mise à jour (2026-10-13)** : « avis DPO (porte 28) » se lit « avis d'un conseil » : aucun DPO n'est désigné, obligation close à cette échelle (D-284 §6) ; l'analyse datée d'une page se revoit avant toute ouverture à plusieurs praticiens. Un test d'intrusion humain précède toute offre commerciale et tout second compte praticien (D-283 §7). Chaque D-xxx de levée est en §10.
- **Mise à jour (2026-10-14)** : ci est écrite (D-286, #1425) et b aussi (D-288, #1430) ; x reste à écrire. Le second compte praticien reste fermé jusqu'au 2027-10-11 (D-288 §5). Rien n'est levé.

#### F74 · P3 et P4 : SaaS pilote, montée en charge
- **Identifiant, piste** : API publique, sandbox, facturation, premier client externe, puis OAuth, SDK, interopérabilité (`docs/archive/cadrages/AUDIT_BIOFLOW_2026-10-04.md:758-777`) ; ouvrir BioFlow à d'autres cabinets ; plateforme.
- **Rang** : gelé ; rien avant P1 et P2 ; noyau modulaire d'abord, client pilote écrit exigé ; si P2 se lève, 6 au plus tôt [Hypothese].
- **Portes, préalables** : P2 ; MDR et IVDR qualifiés ; identité juridique et DPO.
- **Migration, release-db** : selon.
- **Décisions, textes** : hors de ce plan de route.
- **Critère de fin** : sans objet.
- **Mise à jour (2026-10-13)** : « identité juridique et DPO » se lit : identité juridique (D-283 §9) et, pour le DPO, l'analyse d'une page datée que D-284 §6 impose de revoir avant toute ouverture à plusieurs praticiens.

#### F75 · Fermetures actuelles
- **Identifiant, piste** : API, second compte (fermé un an), flux laboratoire, envoi direct au médecin ; plateforme.
- **Rang** : gelé. La levée du second compte, de l'API ou de l'envoi direct est un déclencheur de la qualification (F67) ; le flux laboratoire, entrant, n'en est pas un. Chaque D-xxx de levée au rang 1 au plus tôt, après ci [Hypothese].
- **Portes, préalables** : second compte et API après ci ; flux laboratoire après la porte 29 ; envoi direct après un volume réel de correspondance constaté (D-219 §1).
- **Migration, release-db** : selon la levée.
- **Décisions, textes** : une D-xxx par levée ; lettres b, x, q.
- **Critère de fin** : sans objet tant que rien ne se lève.
- **Mise à jour (2026-10-13)** : la levée du second compte attend aussi un test d'intrusion humain (D-283 §7). Ces fermetures sont gelées ici, non abandonnées (§7).
- **Mise à jour (2026-10-14)** : ci est écrite (D-286, #1425) : second compte, API et envoi direct sont les événements 2, 3 et 5 de son §2. Le second compte ne s'ouvre pas avant le 2027-10-11 ; sa levée exige une D-xxx et un test d'intrusion humain (D-288 §5, #1430). Rien n'est levé (D-286 §2, D-288 §6).

## §7 Abandonnés

Date d'abandon : 2026-10-13 pour toutes les lignes, sauf mention. L'historique Git garde tout texte supprimé ; la colonne cite la trace lisible.

| objet | motif | où reste la référence |
|---|---|---|
| Moteur de propositions de parcours alimentaire (LOT-03 de la chaîne alimentaire) | jamais commencé, aucune D-xxx ; recouvre D-235 à D-237 ; [A verifier] motif contredit par D-045 (accepté le 2026-08-11 : quatre règles de parcours pour ce moteur), statut du LOT-03 posé par la PR 2 : « règles retenues par D-045, dossier des candidates en référence » (#1419) | `DOSSIER_REGLES_LOT-03.md`, règles candidates gardées en référence |
| Scan code-barres patient (reste d de C4) | différé sans porteur | C4 `CAMPAGNE.md`, « Frontières, Différés » |
| Interactions exhaustives des compléments (reste d de C4) | différé sans porteur | historique Git |
| Campagne C4 compléments clean label | objet livré par le rayon compléments (PR #332 à #353, #493, #585) | restes a et b sous R:ao (F78) |
| Fiches LOT-00 à LOT-04 de C4 (gabarits vides) | doublons vides | supprimées (§9) |
| Campagne journal alimentaire 21 jours, comme campagne | transférée à J2-alim | H45 |
| Gel « première ligne du barème de charge (table vide, DC-19, DC-20) », retiré du §6 le 2026-10-14 | sans objet, arbitrage du responsable du 2026-10-14 : la table n'est pas vide, l'échelle sur un terme est ratifiée le 2026-09-15 puis re-ratifiée par D-273, bornes déclarées convention d'organisation sans source clinique ; aucun gel ne la remplace | `web/src/lib/clinical/baremeChargeV1.ts:41-55` ; D-273 ; plan D/19 |
| Nom « Ma spirale alimentaire » | remplacé par « Mon carnet alimentaire » (PR #294, #429) | historique Git |
| LOT-04 de la chaîne alimentaire (rayon de fiches conseils) | doublon de D-251 (PR #1232 à #1252) | historique Git |
| LOT-04 de l'échéance HDS (« reste la revue du 2026-10-21 ») | borne levée par D-265, gate clos par D-121 | historique Git |
| Checklist d'activation G-TRUST-04 | affirme un gate ouvert, contredite par D-121 | archivée avec bandeau (§9) |
| Phrases « gate HDS » de rayon-biologie-cb | contredites par D-121 | corrigées par ligne datée (§9) |
| « 0 transmission » de BIO-INGEST | contredit par le constat de clôture (`lots/LOT-12`) | historique Git |
| « Gate multi-cycles différé » ; proposition 2026-07-18-gate-modele-multi-cycles | levé par G2, puis D-113 | historique Git |
| Lien signé vers le médecin ; signature et authentification du médecin ; geste de transcription du fil | remise au patient tracée, rien ne part vers un tiers | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:460-476` |
| Statut de lot « bloqué_confirmation » | règle de cadrage ; aucun lot ne le porte | historique Git |
| Messagerie patient (accueil-observatoire) ; D5 de la feuille de route produit | collecte documentaire seule, aucune conversation | historique Git |
| Drapeaux « fermés » de deux voix ; « livrée, non close » de trois voix | drapeaux à true, campagne terminée le 2026-09-14 | historique Git |
| Tampon de D-208 ; « relire l'usage du protocole » | exécuté (D-213 §1) ; absorbé par la porte 15 | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:87`, :94, :573 |
| Préparation 4.0 (UX-6) | remplacée par L4 et L5 | historique Git |
| Runbooks C5 « Vercel, drapeau false » | D-080, D-120 | historique Git |
| Brief nutrition-référentielle | R1 livré par C5A, R2 = ao, R3 = ah | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:72` |
| CADRAGE_BIO_PARCOURS_2026-10-04 (v1) | remplacé par la v3.1 (D-266 §15) | archivé (§9) |
| Lignes OBS de la feuille de route produit (17 lignes) | remplacées par ce plan, D-075, D-121, D-250, `CLAUDE.md` | historique Git |
| Note de pilotage, procédure et seed Supabase, « HDS certifié » de l'historique technique | remplacés par ce plan, D-080, D-120, D-121 | historique Git |
| Double source de feuille de route | une seule feuille de route | H04 |
| Étape 5 des panels | doublon de BP-04 | F16 |
| Table de PROGRAMME_WELLNEURO_3_0 | se déclare périmée | archivée (§9) |
| ML-5, PH-4, PH-5 | fermés | historique Git |
| Boussole chiffrée | hors rang tant que D-250 tient ; la Boussole est retirée (H16) | historique Git |
| Note de nuit pondérée (score de nuit) | fermée sans lettre (2026-10-13) | historique Git |
| Différés fermes de C2 ; messagerie de santé ; SSO multi-établissement | limites dures, jamais reprises ; second compte, API, recherche, flux laboratoire et envoi direct ne sont pas abandonnés : gelés en F75 (§6) | §5 |
| Arc espace patient E3, E2, E4 | absorbé par 6.0-A, B et C, dont les écrans portail sont les tranches | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:614-619` ; IDP2 LOT-04 gelé (§6) |

## §8 Dettes, sans rang

Ex-file d'attente, registres de dettes, `.wn/state.json` et handoffs de main. Une dette n'a pas de rang : elle a un sort, une échéance ou un déclencheur. Une dette déjà portée par une fiche ne garde ici qu'une ligne de renvoi, sans autre statut : son sort est celui de la fiche nommée à droite. Les gelées sont en §6 ; les terminées et obsolètes disparaissent avec la file (§9). Depuis le 2026-10-14, une dette qui demande un geste du responsable vit en file D (§4) ; ici restent les dettes de code, avec leur file.

### Information des patients et droits (échéance unique 2027-06-30, D-265 §4 ; D-283 §9)

| élément | source | sort ou échéance |
|---|---|---|
| D-TRUST-02 revue juridique des textes v1 | `DETTE_TRUST.md:10` | avis d'un conseil (porte 28, H09) ; 2027-06-30 |
| D-TRUST-06 durées de conservation formalisées | `DETTE_TRUST.md:14` | fixées par D-283 §2 ; restent le texte patient et le code (H26) |
| D-TRUST-07 titre d'instrument dans l'e-mail d'assignation ; bascule du booklet envoyé par e-mail vers une consultation au portail | `DETTE_TRUST.md:15` | titre : constat au premier S-1 (H06) ; bascule du booklet : file A, sans porteur, déclencheur IDP/C3 [Hypothese] (moitié ajoutée le 2026-10-14) |
| D-TRUST-08 revue périodique de la règle EI | `DETTE_TRUST.md:16` | reprise par D-278 et D-281 (F66) ; échéance de six mois conservée ; point de départ fixé le 2026-10-21 par le responsable à la mise en service du 2026-10-18 (porte 7 levée), revue le 2027-04-18 (D.5, §4) |
| D-TRUST-09 désignation d'un DPO | `DETTE_TRUST.md:17` | clos par D-284 §6 : pas d'obligation à cette échelle, point de contact = le responsable ; reste une analyse d'une page, datée, revue avant toute ouverture à plusieurs praticiens, tout partage systématique ou tout changement d'échelle (F74) |
| D-TRUST-10 confirmation de la procédure de violation par un conseil | `DETTE_TRUST.md:18` ; `PROCEDURE_VIOLATION_DONNEES.md:155` | porte 28 ; 2027-06-30 |
| Identité juridique ; critères de l'AIPD ; 15 à 17 ans et durée probatoire en cas de dommage corporel (avocat) | D-283 §9 ; D-284 §3-4 ; `DOSSIER_RGPD.md:1332-1356` sur f3ddbd3d | faits et gestes (H20), conseil (porte 28), AIPD (F68) ; 2027-06-30. Clos par D-284 : NIR (recueil cessé, champ à retirer, lot g de H26), seuil des mineurs (18 ans), transferts (cadre UE-États-Unis ou clauses types, H20, F47) |
| Accords de sous-traitance de l'hébergeur, de Google Workspace, de Sentry à archiver ; copie datée de l'accord d'Anthropic, avec l'analyse d'impact du transfert (D-284 §5, lot j) | D-283 §9 ; D-284 §5-6 ; `DOSSIER_RGPD.md:1338-1344` sur f3ddbd3d | gestes (H20, F47) ; 2027-06-30 |
| Pentest ; registre physique EX-3 ; piste d'audit | `DOSSIER_RGPD.md` §14 | test d'intrusion humain avant toute offre commerciale ou second compte (D-283 §7) ; registre des violations et piste d'audit clos par constat (D-283, fin) |
| Information du médecin à la première lettre | D-283 §3 | lot (e) (H26) |
| Demandes de droits : le passage à `traite` n'exige ni réponse ni date d'envoi ; une demande reçue par e-mail d'une personne qui n'a plus accès au portail n'a pas de circuit ; aucune durée n'est fixée pour les courriels de demande et de réponse gardés dans la boîte du responsable | revue CodeRabbit de #1446 ; `DOSSIER_RGPD.md` rubrique 9 | tranchés le 2026-10-14 par D-295 : sans accès au portail, instruction à la confirmation depuis l'adresse du dossier ; courriels à la durée du dossier, 5 ans après la réponse si le dossier est effacé ; garde de `traite` sans migration, mergée (#1451) ; pas de date d'envoi en base |
| Confirmation d'effacement des sauvegardes de l'ancien hébergeur | `DOSSIER_RGPD.md:1214`, :1246 ; `.wn/state.json` blocking_issues | relance, geste du responsable (H20) |
| Pause d'âge (lot (h)) : un questionnaire ouvert par son adresse se remplit avant le refus, et pour un mineur le signal de sécurité de l'envoi ne part pas ; aucun banc structurel ne liste les routes d'écriture patient gardées par la pause ; origine de la date de naissance (patient ou praticien) non tracée | handoff 2026-10-14-1445 ; SESSION_LOG (lot h) | file A, avec J3-mineurs (H79) ; tracer l'origine est une colonne, donc une migration, rang 4 au plus tôt [Hypothese] ; ligne ajoutée le 2026-10-14 ; **deux restes soldés le 2026-10-20 (t02)** : l'ouverture d'un questionnaire remplissable rend le refus de la soumission (même texte, 409), des réponses verrouillées restent consultables ; banc structurel `gardeAge.routes.guard.test.ts` (toute route d'écriture patient classée gardée ou ouverte avec son motif). **Restent**, avec J3-mineurs : le signal de sécurité de l'envoi d'un mineur (inhérent à la pause, décision du responsable) et l'origine de la date (migration) |
| NIR encore lu par l'export : le masquage des textes libres de l'export lit la colonne ; les textes d'export « version pseudonymisée » citent encore ce numéro | handoff 2026-10-14-1330 | file A, avec la migration de retrait de la colonne (H26 (g), rang 4) ; ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-19** (code) : l'export ne sélectionne plus la colonne, le masquage ne cherche plus de NIR (aucun n'est enregistré, D-284 §1), et les textes d'export (« version pseudonymisée », « version complète », aide du choix) ainsi que l'avertissement de la fiche ne citent plus ce numéro. La colonne n'a plus aucun lecteur ; **reste la migration de retrait** (H26 (g)), non écrite : le mode auto a refusé l'écriture de la migration et de son contrat, geste à reprendre avec le responsable |
| Export pseudonymisé : un NIR **saisi librement** dans un texte (fiche, anamnèse, synthèse) n'est pas masqué — l'ancien masquage ne cherchait que le NIR enregistré, toujours absent | revue CodeRabbit de #1567 (2026-10-19) ; D-252 §2 | file A ; détection **par forme** (15 caractères, `[12]` + année + mois + département dont 2A/2B), indépendante de toute colonne, à éprouver sur le corpus du masqueur (faux positifs) ; ligne ajoutée le 2026-10-19 |

### Dettes techniques vivantes

| élément | source | sort ou déclencheur |
|---|---|---|
| `assessment_episodes.milestone` sans CHECK | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:349-385` ; `schema.prisma` | migration à part, au premier lot qui touche les épisodes [Hypothese] ; rang 4 au plus tôt |
| Table des signaux de sécurité absente de `SOURCES_DE_SAVOIR` (`scripts/wn-matrice-consommation.mjs`) | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:477-487` | déclaration d'inventaire, sa propre PR [Hypothese] |
| Vue `ACTIVE_CAMPAIGN.md` : le statut de la campagne primaire est écrit en dur « active » (`scripts/lib/vue-campagnes-actives.mjs:39-45`), même quand sa fiche dit `en_pause` (constaté à la clôture de LOT-07, puis de LOT-03) | revue CodeRabbit de #1526 (2026-10-17) | lire le statut de la fiche (repli « inconnu »), banc à l'appui, sa propre PR d'outillage ; **soldée le 2026-10-20 (t31)** : la vue écrit le premier mot du `statut:` de la fiche (`en_pause`, `en_cours`…), « inconnu » sans fiche ; une parallèle garde le statut de l'état machine s'il en porte un ; vue régénérée (la primaire passe à `en_pause`), deux cas au banc de cohérence |
| Unité d'un résultat biologique non liée au catalogue en base (D-264) | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:503-514` | au prochain changement d'unité d'un analyte porteur de résultats |
| `MESSAGE_ORIENTATION_INACTIVE` périmé (D-074 §4) | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:531-539` | soldé : corrigé par 33f44689 (D-076, 2026-08-19), « Orientation non activée sur cet environnement. » (`web/src/lib/clinical/orientationService.ts`) ; constaté le 2026-10-18 |
| Règle G6 : frontière entre phrase recopiée et borne standard | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:592-604` | à écrire avant la prochaine attestation qui cite un chiffre |
| Catalogue de conduites de D-206 : deux lignes non lues sur pièce | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:243-269` | toute ligne neuve = une nouvelle attestation ; avec ag (H25) |
| Surfaces WN_CE_QUI_COMPTE, WN_DOSSIER_DEUX_VOIX | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:62` | gestes du responsable, sans rang |
| Garde TRUST « le refus bloque » : exécution confiée à une autre session | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:397-440` | constat au premier S-1 (H06) |
| T0 irrévocable (identifiant déterministe, `upsert update:{}`) ; `POST /api/praticien/protocoles` sans appelant ; E2E nominal absent | historique Git, `.wn/state.json` next_action[40] | prochaine version du plan |
| Résidus du LOT-00 de la chaîne : bouton « Clôturer », clôture automatique du portail à J21 | historique Git, next_action[41] | prochaine version du plan |
| Inventaire du garde de catalogue (Q_FIB_03 suspendu) ; « Historique » non atteignable depuis le seed | historique Git, next_action[42] | prochaine version du plan |
| Contrat SQL pgvector livré (#634) ; prochaine action datée du 2026-08-19 | historique Git, next_action[43] | obsolète : gate clos (D-121) ; vidé en PR 3 |
| Jalon du 2026-10-21 | historique Git, next_action[44] | obsolète : borne levée (D-265), échéance 2027-06-30 (D-283 §9) ; vidé en PR 3 |
| Redirection `/patient/*` sans échéance ; route sans appelant | historique Git, next_action[45] | constat au premier S-1 (H06) |
| seuils_points de Q_ALI_01, classe « recueil partiel » | historique Git, next_action[46] | décision sourcée (H40) |
| Instrument terminal suspendu encore déclaré certifié au catalogue | historique Git, next_action[47] | constat au premier S-1 (H06) |
| 113 fichiers en CRLF contre `.gitattributes` | historique Git, next_action[48] | une PR d'hygiène dédiée [Hypothese] |
| Invariant de `packs_registre_coherence_v1` à ne pas affaiblir | historique Git, next_action[49] | règle |
| Écran de masquage de l'identité : deux canevas pleine résolution par page, gardés en mémoire (≈ 280 Mio à 20 pages A4), risque d'épuisement sur Safari mobile | revue Copilot de #1428 ; `web/src/components/patient-cockpit/MasquageIdentite.tsx` | rendre la page courante seule et rerendre à l'envoi ; au premier compte rendu de plus de 6 pages, ou au premier usage sur téléphone [Hypothese] |
| Masquage lu par une lecture non tracé : l'import ne garde pas l'identifiant du masquage envoyé | revue `wn-reviewer` du lot 2 de D-284 §5 (P2-5) ; `lancerExtraction.ts` | une colonne, donc une migration ; question au responsable, avec le lot 3 du masquage |
| Agenda alimentaire : LOT-06 gaté, recueil arrêté au premier jour | historique Git, next_action[50-54] | barème gelé (§6) ; relance du recueil, geste du responsable (H45) |
| « Suspendu » est un état de drapeau, pas une propriété de l'instrument (D-033) | historique Git, next_action[55] | règle de lecture, gardée |
| Couverture E2E de l'envoi bornée : une règle, une cible, envoi du courriel non asséré (SMTP vide sur le banc) | historique Git, next_action[56] | note de banc ; à étendre au premier lot qui touche l'envoi [Hypothese] |
| Piège de banc d'orientation (WN_ENABLE_ORIENTATION_NNPP2 et rawAnswers) | historique Git, next_action[57] | règle de banc |
| Question clinique R2-SOM-05 (Horne sans la porte RYTHME_BIOLOGIQUE de R2-SOM-03) | historique Git, next_action[58] | la décision du responsable, sans rang ; aucune règle neuve sans D-xxx |
| Cinq dettes sans lot d'accueil de D-032 (seed, `questionnaire_packs.actif`, réactivation d'un pack, `schema.prisma:155-156`, suture morte) | historique Git, next_action[59] | prochaine version du plan |
| Attentes humaines : invitations aux patients des dossiers courants, visibilité patient du fil médecin, escalade SIIN Q_GEO_04 | historique Git, next_action[61] | les gestes du responsable, sans rang |
| `portail-lien-magique:45` échoue en local sur main pur, vert en CI | historique Git, next_action[62] | note de banc |
| Arbitrage de la campagne C4 compléments clean label | historique Git, next_action[60] | tranché : abandonnée (§9, PR 2) |
| Deux transmissions concurrentes d'un même questionnaire créent deux réponses et deux courriels | handoff 2026-10-10-1943:63-68 | lot à cadrer, file A, h1 (intégrité des données) [Hypothese] : transaction et verrou sur l'assignation ; **soldé le 2026-10-18 (t04)** : création et verrouillage dans une transaction sous `SELECT … FOR UPDATE` (motif des clôtures d'agenda), refus revérifiés sous verrou, envois après le commit ; banc de concurrence |
| Restes de D-275 : geste de lettre offert sans consultation porteuse ; date « depuis » du Fil prise sur la porteuse ; tests de parité cockpit et Fil et d'empreinte non écrits | handoffs 2026-10-10-0850:84-88 et 2026-10-10-1943:69-70 | lot à cadrer, file A [Hypothese] ; **tests soldés le 2026-10-19** : parité cockpit ↔ Fil sur une passation positive (`signauxSecurite.parite.test.ts`, trois cas) et empreinte de référence figée de la carte sans réponse positive (`safetyQuestionnaire.integration.test.ts`) ; **date « depuis » soldée le 2026-10-19 (t05b)** : la carte prend la date du plus ancien constat ouvert (passation ou validation de la porteuse) ; **geste de lettre soldé le 2026-10-19 (t05c)** : sans consultation porteuse, le cockpit remplace le bouton par « Validez d’abord une consultation pour rédiger la lettre » (arbitrage du responsable : expliquer) ; ordre des cartes gardé (attente la plus longue d’abord) |
| Lettre d'adressage : date au jour UTC ; courriel envoyé si la lettre est révoquée pendant la remise ; export d'accès sans les remises ; impression refusée en 404 JSON | handoff 2026-10-10-1234:30-34 | à arbitrer par le responsable, puis lot à cadrer [Hypothese] |
| Axes de l'indice /100 du sommeil non instruits par 8B | handoff 2026-10-12-1243:77-78 | sources de la porte 4 (H08) |
| 5A : acceptation sous abstention « required » éprouvée seulement en unitaire ; sélections `libre:` à constater au premier usage | handoff 2026-10-12-0100:78-80, :89-90 | constat en agrégats au premier usage (H06) |
| #1394 sans SESSION_LOG ni handoff ; liens externes vers les chemins archivés par #1405 non relus ; worktree `hygiene-apply-safe` à supprimer à la main | handoff 2026-10-12-1430:43-50 | trace : ce handoff ; worktree : geste du responsable ; contrôle de clôture (H23) |
| Repli localhost ; verrou de diffusion | `docs/archive/roadmap-updates/HISTORIQUE_CHANTIERS_TECHNIQUES.md:38-39` | repli localhost **soldé le 2026-10-18** dans J1-base (H43) : base unique des liens de courriel, démarrage refusé en production sans `NEXTAUTH_URL` ; verrou de diffusion : posé en production depuis le 2026-09-28 (même source, ligne 40) |
| Auto-merge sans contrôle de clôture | `docs/archive/roadmap-updates/HISTORIQUE_CHANTIERS_TECHNIQUES.md:40` | H23 |
| Contenu en clair au stockage local | `DETTE_UX_RESIDUELLE.md:10` | constat au premier S-1 (H06) |
| D-C5-01 à D-C5-04 ; D-JA-01 à D-JA-03 | `DETTE_C5.md:10-13` ; `DETTE_JA.md:16-18` | dans H16 et H45 |
| Curation de `QuestionnaireDefinition.niveau` et `.publicCible` : statut « surveillance », aucun usage applicatif (R10, 2026-07-10) | `docs/archive/roadmap-updates/HISTORIQUE_CHANTIERS_TECHNIQUES.md:78` ; `docs/claude/PROJET_CONTEXTE.md:195` | surveillance, sans action ni échéance ; se solde au premier usage applicatif ou au retrait des champs [Hypothese] |
| D-TRUST-05 passe réelle d'accessibilité : lecteur d'écran (NVDA, VoiceOver), zoom 200 %, appareil mobile physique, sur le centre d'information et la séquence ; même objet que D-C5-01 et `DETTE_UX_RESIDUELLE.md:49` | `DETTE_TRUST.md:13` | portée par H64 (rang 4) ; périmètre précisé le 2026-10-14 |
| Lecture par la file (G3) : un dossier clos pendant l'attente n'est pas rejugé par la réclamation (un motif neuf demanderait une migration) | handoff 2026-10-13-1110:80-81 | soldée le 2026-10-14 par #1418 (D-282 §9.1), sans migration ; la ligne reste pour les renvois |
| TEMPS 3 : la transaction des lignes insère sous des clés vers le dossier sans le verrouiller d'abord, interblocage possible face à l'effacement, ancien et nouveau chemin | handoff 2026-10-13-1110:94-97 | soldée le 2026-10-14 par #1418 (D-282 §9.2) ; la ligne reste pour les renvois |
| Bancs manquants du processus de fond : `reconcilierFantomes`, refus à la réclamation et à la reprise, boucle du processus ; base locale `wn_g3_lot3_banc` à supprimer sur accord | handoff 2026-10-13-1110:98-101 | hors G3 (D-282 §8, handoff du lot 5) : tests `reconcilierFantomes` et boucle du processus, lot à cadrer avec TEMPS 3 [Hypothese] ; base locale : geste du responsable, sur son accord ; constat du 2026-10-15 : un fantôme (import `en_cours` périmé) et les refus à la réclamation ou à la reprise ne se fabriquent pas en banc sans désarmer un trigger (`lance_le` daté et figé par la base ; purge du masquage seulement après celle du document) — la boucle demanderait d'extraire `bioExtractionWorker.ts` en fonction testable, refactor non demandé |
| Processus de fond, tests laissés par la revue : banc 9 dans l'autre ordre ; désactivation contre une demande en vol à deux sessions | handoff 2026-10-13-2330 | file B, avec les bancs manquants du processus de fond (ligne précédente) [Hypothese] ; la base locale de ce lot est en D/2 ; ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-15** : cas 9 bis et 10 du banc `banc-file-extraction-deux-sessions.test.ts` |
| `patientLimitations` du contrat de vue patient du protocole : vide chez tous les appelants de production, aucun écran ne le rend ; le servir exige un texte patient signé, jamais la recopie des limites écrites pour le praticien | `docs/claude/campagnes/FILE_ATTENTE.md:522-526` (historique Git) ; D-191, D-200 §3 | sans porteur ; avec la première surface qui rend ce champ (même geste qu'af, H24), texte signé du responsable avant tout écran ; ligne ajoutée le 2026-10-14 à la suppression de la file (PR 5, revue #1422) |
| Constat de la proposition de bilan servie au cockpit sur un dossier réel, par identifiant et en conteneur (preuve terminale de la chaîne T0, jamais consignée ; `WN_CB_PROPOSITION` posé en production) | `docs/claude/campagnes/FILE_ATTENTE.md:540-541` (historique Git) ; handoffs du 2026-08-18 | geste du responsable, à verser avec le prochain constat sur dossier réel (H06), avant le code de ax (F35) ; ligne ajoutée le 2026-10-14 (PR 5, revue #1422) |
| La minute d'après affiche l'identifiant brut de la priorité retenue au lieu de son libellé (registre signé ou libellé du praticien) ; écran praticien, aucun risque clinique | `docs/claude/campagnes/FILE_ATTENTE.md:605-612` (historique Git) ; D-279 (revue du lot 5A, 2026-10-12) ; `web/src/components/copilote/ClotureMinuteApresPanel.tsx:104` | petit lot d'écran, au prochain passage sur le copilote ; ligne ajoutée le 2026-10-14 (PR 5, revue #1422) ; **soldée le 2026-10-18** dans J1-base (H43), libellé relu à sa source, identifiant en repli |
| Passe `wn-reviewer` de l'exception migration/authentification non liée au sha final (« obligatoire si elle n'a pas déjà eu lieu ») ; défaut antérieur à D-290 | revue CodeRabbit de #1440 (synthèse, « Security Architecture Review ») ; `.claude/skills/wn-merge/SKILL.md` étape 5 | la lier au sha revu, comme `--match-head-commit` (D-290), au prochain lot qui touche `/wn-merge` [Hypothese] |
| `.coderabbit.yaml` lu sur la branche de la PR : une PR peut affaiblir sa propre revue | D-290 §5 ; revue CodeRabbit de #1440 (synthèse) | tranché par le responsable le 2026-10-14 (D-291) : ces PR sont P1, `wn-reviewer` avant le merge (règle `.claude/rules/pr-revue-et-release-db.md` 1.10) ; ni `CODEOWNERS` ni approbation imposée. Garde-fou déclaratif : la ligne reste ouverte tant qu'aucun verrou ne la ferme |
| La synthèse IA ne lit pas les pseudo-items `AGA_*` de `Q_ALI_09` : relus contre un catalogue qui n'en déclare aucun, ils sont rendus non résolus | `web/src/lib/scoring/reponsesLisibles.ts`, `web/src/lib/synthese/generation.ts` ; handoff 2026-10-14-0010 (PR 2, #1419) | au plan seulement, aucun code pendant le versement (arbitrage du 2026-10-14) ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Le banc de vocabulaire de verdict du LOT-04 de biologie exploitée laisse passer « élevé » et « bas » | `EstimeMesurePanel.test.tsx:932-933` ; handoff 2026-10-14-0010 (PR 2, #1419) | au plan seulement (arbitrage du 2026-10-14) ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Pagination au-delà d'environ 100 lignes : nommée au §9 (renvoi à S-1 et au §8), portée par aucune fiche ni ligne du §8 | handoff 2026-10-14-0135 (PR 3, #1420) | sans porteur ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Génération PDF native avec signature du booklet, coaching patient autonome, RAG SIIN plein : nommés par aucune ligne du plan ; le §5 ne ferme SSO et RAG dynamique que par renvoi à l'historique archivé | handoff 2026-10-14-0135 (PR 3, #1420) ; `HISTORIQUE_CHANTIERS_TECHNIQUES.md:82-93`, archivé sous `docs/archive/roadmap-updates/` (PR 4, #1421) | sans porteur ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Brouillon patient sans persistance serveur : aucune reprise multi-appareil ; saisie longue de « Ce qui compte » perdue au rechargement ou à la fermeture de l'onglet, sans brouillon local ni relecture patient de ses entrées | `DETTE_UX_RESIDUELLE.md:15` ; `docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/lots/LOT-03-ce-qui-compte-aujourdhui.md:140` | file A ; recalée le 2026-10-21 : la session portail dure 30 jours glissants depuis D-241 (`patient-session.ts:44`), pas 12 h ; les brouillons de questionnaire tiennent déjà 30 jours sur l'appareil (`questionnaire-draft.ts`). Arbitrage du responsable le même jour : brouillon LOCAL de « Ce qui compte » sur le patron de `questionnaire-draft.ts`, effacé après confirmation du dépôt (conservé sur erreur), sa clé inscrite à `FAMILLES_DONNEES_PATIENT` (`lib/portail/stockageAppareil.ts`) pour être purgée à la déconnexion ; le wizard fiche et anamnèse reste en sessionStorage (identité en clair) ; pas de persistance serveur, multi-appareil hors périmètre ; sans migration ; ligne ajoutée le 2026-10-14 |
| « Mon équilibre » : accueil et détail chargés par le patient seul, non couverts par l'aperçu praticien (bouton neutralisé dans `PatientPreview.tsx`) ; paramètre `email` mort dans les appels (`ConsultationScreen.tsx:33`, `MonEquilibreAccueil.tsx:61`), ignoré par le serveur | `DETTE_UX_RESIDUELLE.md:19-23` | petit lot d'écran, file A, au prochain passage sur « Mon équilibre » [Hypothese] ; ligne ajoutée le 2026-10-14 ; **paramètre `email` soldé le 2026-10-19** : retiré des deux composants (URL et corps), un banc interdit son retour ; **aperçu praticien soldé le 2026-10-19 (t07b)** : arbitrage du responsable (l'ajouter, lecture seule) ; accueil et détail dans `PatientPreview`, lus par la route miroir `apercu-patient/equilibre`, même composition que la route patient (`lireEquilibrePatient`), aucun chiffre ajouté |
| Aucune cadence (limite de débit) sur les routes portail authentifiées ni sur les routes praticien des objectifs ; seul `lien/demande` est plafonné ; un dépôt est une écriture | `LOT-03-ce-qui-compte-aujourdhui.md:110` ; `docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/lots/LOT-02-objectif-negocie-v1.md:132` | lot à cadrer, file A, h1 [Hypothese] ; ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-18** : [[D-327]], plafond horaire par dossier compté en base sur les routes qui écrivent (agendas 60, portail 20, objectifs praticien 30, proposition IA 10), sans migration ; signalement et retrait d'un choix jamais plafonnés |
| Journal d'accès au dossier : une ligne à chaque activation des onglets Trajectoire et Compréhension (`WN_CE_QUI_COMPTE` à true) ; purge de `journal_acces_dossiers` « opportuniste » | `LOT-03-ce-qui-compte-aujourdhui.md:125` ; `LOT-02-objectif-negocie-v1.md:142` | lot à cadrer, file A [Hypothese] ; la purge suit les durées de D-283 (H26) ; ligne ajoutée le 2026-10-14 ; **close sans code le 2026-10-18** (dette t09) : `WN_CE_QUI_COMPTE` et `WN_COMPREHENSION` sont allumés en production, l'option arbitrée « rien au journal si éteint » est sans effet ; la purge reste celle de D-283 |
| « Ce qui compte » : aucun E2E du trajet dépôt par le patient puis lecture par le praticien, surface ouverte en production | `LOT-03-ce-qui-compte-aujourdhui.md:134` | file A, au premier lot qui touche la surface [Hypothese] ; ligne ajoutée le 2026-10-14 ; **soldé le 2026-10-19 (t10)** : `e2e/ce-qui-compte-depot-lecture.spec.ts` dépose par le formulaire du portail, vérifie la fenêtre refermée au rechargement, puis lit le texte tel quel à l'onglet « Trajectoire » du praticien |
| Objectif négocié : deux têtes de chaîne possibles (lecture puis écriture, aucun verrou en base) ; dossier désactivé répondu « clôturé » ; route praticien des objectifs qui révèle l'existence d'un dossier (404 contre 403) | `LOT-02-objectif-negocie-v1.md:132` ; `web/src/app/api/praticien/objectifs/route.ts` | ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-19 (t11)**, arbitrage du responsable : index unique `alli_objectif_negocie_supersedes_unique` (migration `20261019150000`, contrat `alli_objectif_supersedes_unique_v1_negatif.sql`), course perdue rendue en 409 `objectif_supplante` ; dossier désactivé servi par son propre refus (`dossier_desactive`) sur les six routes de l'objectif ; l'écart 404/403 est **gardé** (un seul praticien, sujet transverse à tout le cockpit) |
| Fin de l'objectif : départage de deux têtes, vidage du formulaire à chaque bascule, modèle de la fin, source de l'accord à l'affichage, rail qui dit « renseignée » sans objectif | `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/CADRAGE_FIN_OBJECTIF_2026-09-09.md:220` | file A, dans l'ordre du cadrage ; ligne ajoutée le 2026-10-14 ; **rejugée et soldée le 2026-10-19 (t12)** : départage, vidage, modèle de la fin et rail étaient déjà livrés ; restaient la source de l'accord côté praticien (servie par `GET /objectifs`, affichée sous chaque version), `negocieLe` encore écrite par la route (désormais ignorée) et les gestes « atteint » (deux voix, la seconde attestée en consultation) et « abandonné » (motivé), posés depuis le cockpit sur arbitrage du responsable |
| Protocole assisté : l'aperçu patient du cockpit affiche son état vide à tout dossier réel (seconde description et statut `active` fermés par #1137 et D-213 §3 ; `limitations` déjà ci-dessus) | `docs/claude/campagnes/2026-09-14-protocole-assiste/lots/LOT-08-contre-revue-adverse.md:103-107` | petit lot d'écran, file A ; état à rejuger [A verifier] ; ligne ajoutée le 2026-10-14 ; **soldé le 2026-10-18 (t13)** : rejugé, l'aperçu réel vit dans la sous-vue « Diffusion » depuis 738d0ae2 ; le bloc « Clôture et aperçu patient », dont le message fixe était faux dès la diffusion, n'est plus monté sur un vrai dossier (arbitrage du responsable) ; une ligne mène à « Diffusion » ; la fixture locale garde le panneau |
| Journal patient : à l'ouverture d'une surface fermée, des faits anciens apparaissent d'un coup, sans ligne « révélé aujourd'hui » | `docs/claude/campagnes/2026-09-12-vie-du-portail-patient/lots/LOT-06-doctrine-et-mise-en-service.md:36` | ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-19 (t14)** : constat en production du même jour, « Mes échanges » et ses trois sources sous drapeau (`WN_FICHES_ASSIETTE_LECTURE`, `WN_LETTRE_ADRESSAGE_PATIENT`, `WN_BIO_PORTAIL_ENABLED`) sont tous ouverts, le journal en dernier (2026-10-18) — aucune surface fermée ne reste à ouvrir. Le mécanisme pour les ouvertures à venir est livré par #1586 (jour d'ouverture `<DRAPEAU>_OUVERT_LE` posé avec le drapeau, mention « Affiché à partir du … » ; aucune variable posée, donc sans effet aujourd'hui) ; procédure au `docs/FEATURE_FLAGS.md` § B. L'arbitrage pris le même soir dans une autre session (« clore sans code ») est dépassé par ce merge : rien à défaire, rien ne change pour les patients |
| Constructeur de protocole non réhydraté depuis la version active ; `versionsLues` non remonté au rail | D-179 (« ce que la décision ne fait pas ») ; `ArbitrageBiologiquePanel.tsx:202` ; `ClinicalRuntimeSection.tsx:324` ; ex-file d'attente (historique Git) | ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-19 (t15)**, arbitrage du responsable « corriger les deux » : le brouillon vierge du constructeur se recharge depuis la version en vigueur (une fois par version, jamais par-dessus une frappe, orientation non reprise, V4 redemandé) ; `versionsLues` remonte au rail, dont la phase Actions reste « inconnu » tant que la lecture n'a pas abouti |
| Course étroite à la naissance d'un lien magique : un lien peut naître après la fermeture du dossier et redevenir utile s'il est réactivé sous 24 h (écart résiduel n° 3 de D-126) | `docs/RUNBOOK.md:261` ; D-126 | lot à cadrer, file A, h1 [Hypothese] ; ligne ajoutée le 2026-10-14 ; **soldée le 2026-10-18** (t16) : l'éligibilité se relit dans la transaction de la demande, sous `FOR SHARE` sur la ligne du dossier ; banc à deux sessions `banc-naissance-lien-deux-sessions.test.ts`, en CI et en T3 |
| Badge de sous-score : la bande de gravité la plus haute s'affiche en gris neutre, moins marquée que la bande inférieure (aucune variante dans `Badge.tsx`) ; présentation seule | ticket #1368 ; `web/src/components/FichePatientPanel.tsx:102-105` | petit lot d'écran, file A, T2 ; ligne ajoutée le 2026-10-14 ; **soldé le 2026-10-18 (t17)** : variante `critical` du badge (fond plein), correspondance unique `varianteInterpretation` lue par la fiche et par « Mode de vie » |
| Crochet d'écriture aveugle aux écritures par commande Bash sur les fichiers cliniques (il n'arme que `Edit` et `Write`) | `.claude/rules/hooks-garde-fous.md` (suivi nommé du Socle) ; handoff 2026-08-22-1226 | outillage, file A, après la décision des candidats de couverture (D/41) [Hypothese] ; ligne ajoutée le 2026-10-14 ; préalable levé le 2026-10-22 (D/41 livrée, #1635) |
| D-281, préalables de code de la signature (étape 5) : garde de diffusion du §3 (aucune nouvelle version ni autre programme ne se diffuse avant le verdict ; les propositions et la préparation restent possibles) ; remplacement du producteur de la règle livrée (`web/src/lib/clinical-engine/safetyFindings.ts`), qui bloquerait tout dossier dont un signalement vise un programme (soldé par l'étape 4, PR 2) | D-281 §2 (#1447) ; handoff 2026-10-14-1800 | file A, dans F66, avant M-1 (rang 3) ; logique clinique : D-281 et fragment `changelog.d/` ; ligne ajoutée le 2026-10-14 |
| D-281, restes de l'étape 4 : signalement au format d'avant d'un patient majeur sans rattachement (tranché le 2026-10-14, D-281 §5 : il bloquera la diffusion ; code livré le 2026-10-15, garde inerte jusqu'à la signature de SAF-EI-01, sous `interruptionEffetIndesirableActive()` ; voir la ligne « formulaire d'avant » ci-dessous) ; programme « indisponible » et actions non fermes encore désignables (soldé le 2026-10-16, sans migration, arbitrages du responsable consignés en D-281 §2 : le patient ne désigne que les interventions fermes d'un programme servi, sinon sans liste ; liste du praticien et pause des compléments inchangées) ; surfaces qui ignorent la pause (fiches d'assiette, Boussole, aperçu praticien ; tranché le 2026-10-16 : servies, marquées « en pause » avec le texte signé de l'élément ; soldé le 2026-10-17, sans migration : `pausesParReference` reporte la pause d'une action sur l'aliment de sa Boussole et l'assiette de sa fiche, l'aperçu de la diffusion reçoit les pauses de sa version, toutes issues de `pausesServies`, donc inertes avant M-1) ; élément désigné invisible du praticien (soldé par #1450, étape 4 PR 1 : l'élément, les dates et la chaîne des avis sont servis au praticien) ; aucun test d'intégration contre PostgreSQL réel du trigger face à la route (soldé le 2026-10-17, sans migration : `web/e2e/portail-signalement-designation.spec.ts` diffuse un programme par les routes praticien, dépose une désignation par la route du portail, que le trigger accepte et fige, puis montre qu'un élément absent est refusé par la route et, route contournée, par le trigger seul) ; les trois PR de t20 livrées (#1505, #1516 et la PR des surfaces en pause), fiche soldée | handoff 2026-10-14-1800 | file A, étape 4 de D-281 (F66) ; ligne ajoutée le 2026-10-14 |
| Doctrine exécutable, LOT-11 : conflit CS-MAG-01 écarté faute d'épinglage de ses deux claims ; phrase d'un conflit plus longue que le plafond d'un point de vigilance (scinder par position, jamais raccourcir) ; tour du vérificateur jamais éprouvé sur un dossier portant un signal ; garde de lecture de consultation tenue par le fait (un seul chemin d'écriture), non par le schéma ; seuils du catalogue sans banc de forme ; banc de nature du total qui suit la valeur par son nom | `docs/claude/campagnes/2026-08-18-doctrine-executable/lots/LOT-11-actes-en-attente.md:96-140` ; `web/src/lib/clinical/conflitsSourcesV1.ts:195-198` | file A ; recalée le 2026-10-21 : la phrase d'un conflit (mesurée et scindée par position, `vigilanceConflitLongueur.guard.test.ts`) et le tour du vérificateur (`ANAMNESE_C1_FIXTURE_AVEC_SIGNAL`, `selectionPrioritePrisma.test.ts`) étaient soldés par le LOT-11 lui-même (D-107). Arbitrages du responsable le même jour : CS-MAG-01 routé au dossier du magnésium érythrocytaire (besoin 2), qui rend un verdict sur `WN-CL-0327-002` et `WN-CL-0018-013` ; le conflit n'entre au registre que si une fiche d'usage en épingle un, dans le lot de contenu de ces fiches (aucune table signée ne cite un claim de conduite, `priorityRulesV1.ts:350-357`) ; garde de lecture de consultation : banc de code qui rougit si un second fichier pose le statut validé, sans contrainte en base ; seuils du catalogue : banc par instantané figé, dont la mise à jour exige une référence D-xxx présente au registre, jamais un verrou par empreinte (il couperait le scoring) ; banc de nature du total : écarté, une analyse de flot est disproportionnée ; ligne ajoutée le 2026-10-14 |
| Masquage de l'identité : un compte rendu de plus de 20 pages ne peut pas être masqué, le sort d'un document plus long n'est pas écrit ; `pdf-lib` et `pdf.js` peuvent ne pas compter les mêmes pages (`pages_incompletes` en boucle, cas non observé) | SESSION_LOG (lot (j), lot 1) ; handoff 2026-10-14-0935 ; `MasquageIdentite.tsx` | file B, au premier compte rendu de plus de 20 pages ou au premier cas observé [Hypothese] ; ligne ajoutée le 2026-10-14 |
| D-281, « non traité » encore compté par statut hors du panneau : la carte « Signalement » du Fil du jour (`web/src/app/api/praticien/fil/route.ts`) et le prévol du copilote (`web/src/app/api/praticien/copilote/prevol/route.ts`) filtrent `recu`/`en_cours` ; un signalement rattaché passé à « traité » sans avis en sort alors qu'il bloque la diffusion (§5). Le compteur du panneau est corrigé (étape 4, PR 2). Règle signée, la carte « Signal de sécurité » du Fil ne compte plus aucun effet indésirable (la règle amendée ne produit plus de constat) : la carte « Signalement » reste la seule à le dire. Les deux routes appliquent désormais la règle du panneau (`effetsNonTraites`, une seule pour les trois surfaces), sans verrou ; le Fil lit les effets sur les seuls patients actifs du praticien, la borne de dix après la sélection | revue de l'étape 4, PR 2 ; arbitrage du responsable du 2026-10-14 (routé au plan) | soldée le 2026-10-15 par #1483 (file A, F66, avant M-1), sans migration ; ligne ajoutée le 2026-10-14 |
| D-281, formulaire d'avant : un signalement qui répond « oui » au programme sans élément (`protocol_draft_id` renseigné, `rattachement` nul) bloque la diffusion jusqu'à l'avis (D-281 §5, arbitrage du 2026-10-14). Deux PR : migration qui ouvre l'avis à ces signalements (le trigger d'insertion des verdicts les refuse : « seul un signalement rattaché reçoit un verdict »), écrite le 2026-10-15 (`20261014230000_saf_ei_verdict_formulaire_avant_v1` : avis sur un signalement lié à un programme du patient ; programme ni posé ni re-pointé après coup ; patient figé), demandée par le responsable le 2026-10-15 ; mergée (#1464), release-db approuvée et constatée le 2026-10-15 (run 38649200510, sentinelle liée, `migrate status` à jour par conteneur) ; puis l'attente, la route et l'écran d'avis (élément en cause ou aucun), rien en pause au portail : code consommateur en PR séparée, le 2026-10-15 ; la garde de diffusion reste inerte jusqu'à la signature de SAF-EI-01 (`interruptionEffetIndesirableActive()`). **Reste un correctif, routé à la revue CodeRabbit de #1464** (arbitrage du responsable du 2026-10-15) : l'effacement du programme (IDP2) remet `protocol_draft_id` à NULL, et le patient d'un signalement du formulaire d'avant redevient alors modifiable, même s'il porte des verdicts. Petite migration séparée qui fige le patient dès qu'un verdict existe, avec un cas de contrat après suppression du programme ; avant la signature (M-1). Écrite le 2026-10-15 sur demande du responsable (`20261015090000_saf_ei_patient_fige_verdict_v1`, contrat `trust_aer_patient_fige_verdict_v1_negatif.sql`) ; défense en profondeur : l'effacement IDP2 supprime avis et signalements dans la même transaction, l'état délié n'existe qu'en son sein ; mergée (#1474), release-db approuvée et constatée le 2026-10-15 (run 38718890105, sentinelle `id=38718890105-1`, `migrate status` à jour par conteneur, 109 migrations). La passe Codex de #1474 a trouvé une course à deux sessions (avis posé pendant qu'une autre transaction délie le signalement et change son patient), reproduite en local : migration corrective demandée par le responsable le 2026-10-15 (`20261015130000_saf_ei_avis_verrou_signalement_v1`, le trigger de l'avis verrouille le patient puis lit le signalement `FOR SHARE`, en READ COMMITTED, sans interbloquer l'effacement IDP2 ; banc `banc-avis-signalement-deux-sessions.test.mjs`) ; mergée (#1476, 8bc48e55), release-db approuvée et constatée le 2026-10-15 (run 38746811654, sentinelle `id=38746811654-1` par one-off-9963, `migrate status` à jour par one-off-7924, 110 migrations, production sur 8bc48e55) | D-281 §5 ; revue `wn-reviewer` de l'étape 4, PR 2 ; revue CodeRabbit de #1464 | file A, dans F66, préalable de M-1 (rang 3) ; migration : demande explicite du responsable ; ligne ajoutée le 2026-10-14 |
| D-281, désignation illisible au dépôt : quand la lecture du programme échoue, le signalement est capturé sans programme (`protocol_draft_id` nul) et ne bloque rien, même si le patient avait désigné un élément. Tranché par le responsable le 2026-10-16 (D-281 §5) : repli sur le programme diffusé, relu seul, sans rattachement — le signalement attend l'avis comme le formulaire d'avant ; capturé sans programme seulement si cette lecture échoue aussi | revue `wn-reviewer` de l'étape 4, PR 2 | soldée le 2026-10-16 (file A, F66, avant M-1), sans migration ; ligne ajoutée le 2026-10-14 |
| D-281, avis sur un programme visé illisible : quand le programme visé par un signalement sans rattachement (formulaire d'avant, ou repli de la désignation illisible) ne passe pas le contrôle d'intégrité, le praticien ne peut rendre que « aucun élément en cause » (`validerDemandeVerdict`, `web/src/lib/trust/verdictEffetIndesirable.ts`) ; pour lever la garde de diffusion, il doit déclarer une non-implication qu'il ne pense peut-être pas. Ouvrir un avis « impliqué, élément non identifiable » demanderait une migration. Tranché par le responsable le 2026-10-16 : l'ouvrir, sur le seul programme visé illisible (ailleurs, l'élément reste à désigner), aménagement obligatoire (même liste fermée) ; si l'avis s'ouvrait un jour sur programme lisible, la pause des compléments serait maintenue. Deux PR : migration seule (contrainte et trigger de l'avis), release-db, puis code. PR 1 (migration `20261016110000_saf_ei_avis_implique_sans_element_v1`) mergée (#1500), release-db approuvée par le responsable et constatée le 2026-10-16 (run 38892125593, sentinelle `WN_RELEASE_DB_OK id=38892125593-1`, `migrate status` par conteneur : à jour, 115 migrations ; production sur 9431d350) ; PR 2, code consommateur : la règle `avisSansElementOuvert` (route et écran), la pause des compléments maintenue, cas fictifs 30 et 31 | revue `wn-reviewer` du repli (2026-10-16, P2-1) | soldée à la PR 2 (file A, F66, avant M-1) ; migration accordée le 2026-10-16 ; ligne ajoutée le 2026-10-16 |
| D-281, formulaire d'avant : la lecture du programme diffusé au dépôt (« oui » au programme, `web/src/app/api/portail/trust/signalement/route.ts`, branche du formulaire d'avant) n'est pas protégée ; si elle lève, le patient reçoit « Erreur technique » et le signalement n'est pas enregistré. Corrigé : la lecture passe par le repli de #1494, en échec le signalement est capturé sans programme | revue `wn-reviewer` du repli (2026-10-16, P2-2), défaut antérieur au lot | soldée le 2026-10-16 (file A, F66, avant M-1), sans migration, sur accord du responsable du 2026-10-16 ; ligne ajoutée le 2026-10-16 |
| D-281, un signalement hors règle fait dériver la carte servie : règle signée, un signalement ouvert sans programme ni rattachement (« non » au programme, formulaire d'avant sans « oui », capture sans programme) ajoute une limitation à la carte (`construireFindingsEffetIndesirable`, `web/src/lib/clinical-engine/safetyFindings.ts`) ; l'empreinte change, le rejeu du portail rend `carte_derivee` : le programme devient « indisponible », les pauses d'un autre signalement ne sont plus servies, et la désignation se fait sans liste. Rétabli quand le signalement passe à « traité ». Démontré dans le code, sans occurrence (règle non signée). Tranché par le responsable le 2026-10-17 (D-281 §5) : le programme reste servi ; la limitation quitte la carte, le signalement reste compté par son statut au panneau, au Fil et au prévol ; les statuts ouverts sortent du périmètre signé de SAF-EI-01 | revue `wn-reviewer` de t20, PR 1 (2026-10-16) | soldée le 2026-10-17 (file A, F66, fiche t27, avant M-1), sans migration ; ligne ajoutée le 2026-10-16 |
| D-281, lecture des signalements sans effet dans la chaîne C1 : depuis t27, le second producteur ne lit plus les signalements, mais le cockpit (deux appels), le vérificateur et le rejeu du portail les lisent encore (`lireEffetsIndesirables`) et les passent à la chaîne, qui les ignore ; une requête perdue par carte dès la signature. Retirer la lecture change la signature de `construireSafetyFindings` (une cinquantaine d'appels, tests compris) | fiche t27 (2026-10-17), écart volontaire pour garder le lot minimal | file A, après M-1 ou avec le prochain lot qui touche la chaîne C1 [Hypothese] ; ligne ajoutée le 2026-10-17 ; **soldé le 2026-10-18 (t29)** : la chaîne ne reçoit plus les signalements ; les quatre lectures par carte et la lecture groupée du Fil sont retirées, de même que le paramètre des deux producteurs et le module de lecture ; un banc garde l'entrée de la chaîne sans signalement |
| D-281, avis sur un programme lisible sans élément désignable (Q3 de t25) : quand le programme visé ne contient que des orientations vers le médecin ou des prises de sang, le praticien ne peut rendre que « aucun élément en cause » ; l'avis « impliqué, élément non identifiable » est réservé au programme illisible. Un tel programme n'a aucun complément à maintenir en pause | handoff 2026-10-16-1500 ; D-281 §6 b (2026-10-17) | différé à la signature (2026-10-17) ; à rouvrir si le cas se présente, décision clinique distincte, migration probable [Hypothese] ; ligne ajoutée le 2026-10-17 |
| « Jamais à l'identique ni augmenté » : après un verdict « impliqué », la version suivante n'est pas contrôlée par la machine ; l'aménagement est seulement consigné. Avec l'avis « impliqué, élément non identifiable » (t25, 2026-10-16), aucun élément n'est même désigné : le contrôle, s'il vient, devra porter sur tous les compléments de la version visée | D-281 §5 (arbitrage du 2026-10-14, étape 4) | contrôle à concevoir sur un identifiant d'action stable entre versions et une dose structurée ; sans rang [Hypothese] |
| « Signaler un problème » au portail : atteint seulement par le pied de page, ou par l'accueil quand un programme est diffusé ; le bandeau n'est pas cliquable | constat du responsable du 2026-10-14, étape 3 de D-281 | « à voir plus tard » (responsable) ; ne précède pas la signature (tranché le 2026-10-17, D-281 §6 c) : lot UI à part, sans rang [Hypothese] |
| Repère de cabinet masqué sous cinq **cycles** comparables, pas sous cinq dossiers distincts : un patient à cinq cycles franchit seul le seuil (écart démontré dans le code, sans occurrence observée) | D-298 §5 ; `web/src/lib/protocol/cabinet.ts:12`, `:65` | file A, lot de code avant y (H58) : masquer aussi sous cinq dossiers distincts, effectif servi affiché, banc « sous cinq » ; ligne ajoutée le 2026-10-14 ; **soldé le 2026-10-18 (t24)** : masqué sous cinq cycles OU sous cinq dossiers, chaque médiane par jalon masquée sous cinq dossiers, effectifs (cycles, dossiers) affichés, banc « sous cinq » |
| F80, alias d'import des sept fiches de D-323 §6 (T4 libre, T3 libre, ionogramme complet, bicarbonates, protides, bilirubine, phosphatases alcalines) : le résolveur signé des libellés de compte rendu n'en connaît aucun ; jusque-là, elles se saisissent à la main | D-323 §6 ; handoff 2026-10-18 (F80, PR 3) | file A, sans rang : décision propre (résolveur signé). Arbitrage du responsable le 2026-10-21 : une surface de relecture à deux sources, les libellés restés « inconnu » lus en production par conteneur et des synonymes rédigés, puis une signature (D-xxx). **Soldée le 2026-10-21 par D-336** : aucun « inconnu » de production ne portait ces fiches ; 22 libellés (catalogue et synonymes) pour six d'entre elles, la bilirubine « totale » seule, l'ionogramme complet exclu (panel sans unité) ; résolveur re-signé ; ligne ajoutée le 2026-10-18 |
| Libellés restés « inconnu » en production hors des fiches de D-323 §6 : profil d'acides gras (une vingtaine d'acides, rapports, indice oméga 3), « PROTEINE C REACTIVE (CRP) », VGM, plaquettes (EDTA), TP/INR/temps de Quick, DFG CKD-EPI, HbA1c avec antériorités ; deux lignes validées à la main (VGM, plaquettes) | constat par conteneur du 2026-10-21 (agrégats, 53 lignes « inconnu » pour 92 résolues) ; D-336 §5 | file A, sans rang : surface des libellés réels à rattacher aux analytes déjà au catalogue, en tranchant les pièges (CRP contre CRP ultrasensible, acides gras sans fiche), puis signature (D-xxx) ; arbitrage du responsable du 2026-10-21 (lot séparé, après t30). **Soldée le 2026-10-24 par D-356 (t36)** : constat par conteneur du jour (53 « inconnu », 92 résolues) ; huit libellés rattachés et résolveur re-signé (175 entrées) — « PROTEINE C REACTIVE (CRP) » à la CRP ultrasensible, « CRP (Protéine C Réactive) » restant standard ; VGM, plaquettes (EDTA), DFG, HbA1c courante, indice oméga 3, rapport AA/EPA, indice d'anisocytose ; antériorités jamais rattachées ; « mL/min » admis pour le DFG, une unité absente pour un ratio ; lignes déjà lues inchangées ; ligne ajoutée le 2026-10-21 |
| Fiches TP/INR/temps de Quick absentes du catalogue : « Taux de prothrombine » (%), « INR », « Temps de Quick patient » (s) lus en production, restés « inconnu » (le « témoin » est un contrôle du laboratoire, jamais une mesure) | D-356 §6 ; constat par conteneur du 2026-10-24 | file A, sans rang : fiches au catalogue (migration de données), provenance à sourcer, puis libellés au résolveur (D-xxx) ; arbitrage du responsable du 2026-10-24 ; ligne ajoutée le 2026-10-24 |
| Fiches des acides gras absentes du catalogue : vingt acides (% des acides gras), rapports oméga 6 / oméga 3 et linoléique / DGLA, lus sur un profil en production, restés « inconnu » | D-356 §6 ; constat par conteneur du 2026-10-24 | file A, sans rang : fiches au catalogue (migration de données), provenance à sourcer, puis libellés au résolveur (D-xxx) ; arbitrage du responsable du 2026-10-24 ; ligne ajoutée le 2026-10-24 |
| J3-12g : complétude de l'agenda du sommeil jugée sur la passation entière par le snapshot, sur les items de chaque source par les routes (résidu de D-329 §2) | `docs/DECISIONS.md` (D-329 §2) ; arbitrage du responsable du 2026-10-19 (H15) | file A, lot séparé après l'inventaire « rubrique de l'agenda → lecteurs du moteur » ; compter les diffusions actives avant, l'entrée au snapshot fait dériver les cartes |
| J3-12h : garde absente sur le complément ciblé chez le mineur et chez la personne enceinte ou allaitante (courrier au médecin remis et tracé avant l'entrée au programme) | règle du responsable du 2026-10-17 (H15) ; D-345 | file A, cadré le 2026-10-22 (D-345) ; aucun courrier « complément » n'existe : les courriers actuels servent la biologie et l'adressage |
| D-JA-03 (D/42) : après « Non » à l'occasion, l'issue « fait » ou « adapté » reste choisissable ; tranché le 2026-10-21 : seules les issues d'empêchement restent proposées | `DETTE_JA.md:18` ; `FoodObservationJourney.tsx:135-139` ; arbitrage du responsable du 2026-10-21 | file A, D-xxx et fragment avec le lot, avant H45 ; **soldée le 2026-10-21 par D-337** (panneau patient, harnais et `createTrialTrace`) ; défaut voisin (t37 : après « Non » puis « Oui », « faisable » restait « sans objet », trace comptée « bloquée ») **soldé le 2026-10-21 par D-340** |
| Recherche par identifiant `WN-CL-…` dans l'atelier de curation du corpus (D/22, tranché le 2026-10-21) | handoff 2026-10-14-1455 ; H15, mise à jour du 2026-10-18 (D-325 : pages de cinquante, sans recherche par identifiant) | file B, lot sans migration |
| Rayon « 08 — Biologie fonctionnelle » de la bibliothèque, seul dormant : à brancher comme les sept autres (D/23, tranché le 2026-10-21) | `docs/claude/corpus/consommation_decisions.json:14` ; `web/src/lib/supplement-library/rayonCorpus.ts:40` | lot à cadrer, file B [Hypothese] |
| Crochet d'écriture : `stopRulesLibelles.ts` et `questionnaires/alimentaire.ts` sous « demande », fixture libre ; vestige `WN_ALLOW_RISKY_COMMAND` retiré (D/41, tranché le 2026-10-21) | `.claude/hooks/protect-wellneuro-files.test.mjs:106-115` ; `.claude/hooks/block-risky-commands.mjs:16` | PR d'outillage ; **soldée le 2026-10-22 par #1635** (deux motifs au niveau « demande » clinique, `chaineC1Fixture` libre au banc, variable retirée et banc qui le prouve) |
| Refus Supabase de `.claude/settings.json` à alléger (D/5, retrait tranché le 2026-10-21) | `.claude/settings.json` ; `.claude/rules/db-prisma.md` | PR d'outillage, après la déconnexion du connecteur par le responsable ; **soldée le 2026-10-22 par #1634** (neuf refus retirés, garde `execute_sql` conservée) |
| `questionnaires.actif` en production en retard sur le catalogue de code pour cinq instruments réactivés (D/51) : seul le contrat `packs_instruments_suspendus_v1` le lit | constat D/24 du 2026-10-22 ; `web/prisma/checks/packs_instruments_suspendus_v1.sql:36-40` | décision du responsable, puis migration de données relue et `release-db` si l'écriture est retenue ; ligne ajoutée le 2026-10-22 |

### Soldées, constatées au dépôt (disparaissent avec la file), et verdicts CL

| élément | source | constat |
|---|---|---|
| Finalités de « Mes choix » versionnées | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:441-459` | colonne `formulation_version` présente (`schema.prisma:985`, relevé du 2026-10-13) |
| Lot d'exposition des indications d'assiette | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:121-186` | WN_ASSIETTES_INDIQUEES à true au registre des drapeaux (`docs/FEATURE_FLAGS.md:36`, relu sur 26706d17) ; « livré éteint » (historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:127`) datait d'avant l'activation, le registre des drapeaux fait foi |
| Catalogue C5B ; régime alimentaire pas un drapeau ; conflits de sources ; NUL dans le libellé ; carte « compte rendu à lire » | historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:271-347` | acquittées ou livrées |
| D-TRUST-03, gate G-TRUST-04 | `DETTE_TRUST.md:11` | refermée par D-089 puis D-121 |
| CB-07, contrat V4 | constat au dépôt | clos : contrat V4 demandable (D-130, #900) ; absorbé par BP-04 (F16) |
| « Relancer la lecture » de BIO-INGEST | constat au dépôt | LOT-09 terminé (#1335) |
| D-200 (1) et (2) | constat au dépôt | fermées (#1137 ; historique Git, `docs/claude/campagnes/FILE_ATTENTE.md:90`) |
| Verrou de double consignation côté écran | constat au dépôt | garde serveur ; biologie-exploitee LOT-01 terminé le 2026-09-04 |
| Catalogue typé GD-5 | constat au dépôt | clos ; seul reste `clinicalSnapshot.ts:1`, gelé (§6) |
| « Reste WN_CB_ENABLED » | constat au dépôt | clos : drapeau à true (`docs/FEATURE_FLAGS.md:26`) |
| Lecture par la file (G3) : horloge client de l'ouverture (`ouvrirExtractionDans`) | handoff 2026-10-13-1110:84-90 ; revue de #1414 | soldée par #1416 : la fraîcheur d'un import `en_cours` se juge en SQL à l'horloge de la base |
| « Servi au patient » composé à trois endroits (rejeu de la carte puis contrat patient, dans `api/portail/protocole`, le miroir praticien de la diffusion et `programmeDiffuse`) | revue `wn-reviewer` de t20, PR 1 (2026-10-16) ; [[D-200]] | soldée (2026-10-20, t28) : les trois appellent `servirAuPatient` (`web/src/lib/protocol/servirAuPatientServeur.ts`), qui compose les deux marches et leur absence de limitation patient |

## §9 Clôtures, archivage, corrections

Règles de l'audit (`scripts/wn-campaign-audit.mjs`) : un statut est fermé s'il commence par « termine », « livre », « abandon » ou « fait », accents et casse ignorés (`scripts/wn-campaign-audit.mjs:39-42`) ; « clos », « close », « suspendue », « en_pause », « transféré » ne ferment pas. Une campagne fermée qui garde un lot ouvert, ou une campagne en cours sans lot courant, fait rougir la CI (codes `closed_campaign_with_open_lots`, `inflight_without_active_lot`, bloquants par `ci.yml:154`). `lot_courant` vaut « aucun » ou une fiche présente sous `lots/` (`scripts/wn-campaign-audit.mjs:173`). Ordre dans un même commit : statuts des lots, puis `lot_courant`, puis statut de la campagne. Aucun statut posé ne contient de tiret cadratin.

### Campagnes à fermer (PR 2)

| campagne | statut à poser | lot_courant | statut des lots ouverts |
|---|---|---|---|
| `2026-07-11-complements-clean-label-v1` | `abandonnée (2026-10-13, absorbée par 2026-08-02-rayon-complements-alimentaires, PR #332 à #353 ; restes au plan : couche de décision et chemin produits sous R:ao ; scan code-barres et interactions exhaustives abandonnés)` | `aucun`, posé avant toute suppression de fiche | LOT-00 à LOT-04 (gabarits vides) : supprimés après `aucun` ; les cinq documents à la racine (LOT-00-AUDIT-SOURCES, LOT-01-SCHEMA-CATALOGUE, LOT-02b, LOT-03b, LOT-04-SUITE) restent |
| `2026-07-13-journal-alimentaire-21j-v1` | `abandonnée (2026-10-13, transférée au plan : J2-alim, rang 2)` | `aucun` | LOT-05 : `abandonné dans cette campagne, TRANSFÉRÉ le 2026-10-13 au plan (J2-alim)` ; LOT-00 à LOT-04 déjà fermés |
| `2026-08-04-agenda-alimentaire` | `terminée (2026-10-13, huit lots livrés ; barème transféré au plan, gelé sous la porte des 21 jours)` | `aucun` | aucun lot ouvert ; LOT-06 n'a pas de fiche |
| `2026-08-10-chaine-alimentaire` | `abandonnée (2026-10-13, LOT-00 et LOT-01 livrés ; barème transféré au plan et gelé ; LOT-03 abandonné ; LOT-04 doublon de D-251)` | `aucun` ; les quatre champs git se retirent ensemble ou restent ensemble (`scripts/wn-campaign-audit.mjs:177-186`) | LOT-02 : `abandonné dans cette campagne, TRANSFÉRÉ le 2026-10-13 au plan (barème de l'agenda alimentaire, gelé)` ; LOT-03 : `abandonné le 2026-10-13 (moteur de propositions abandonné par écrit, règles candidates gardées en référence)` ; LOT-04 : `abandonné le 2026-10-13 (doublon de D-251)` |
| `2026-08-18-echeance-hds-g-trust-04` | `terminée (2026-10-13, objectif atteint : annexe signée le 2026-08-30, D-121 ; gate clos ; archivages et confirmation d'effacement : gestes du responsable au registre RGPD)` | `aucun` | LOT-01 : `terminé (2026-08-30, annexe signée, D-121)` ; LOT-02 : `terminé (2026-09-01, décommissionnement, D-120)` ; LOT-04 : `abandonné le 2026-10-13 (contredit par D-121 et D-265)` ; LOT-03 déjà terminé |
| `2026-08-02-rayon-complements-alimentaires` (mot de statut) | `terminée (2026-08-03, lots LOT-00 à LOT-05 livrés)` | LOT-05, inchangé | aucun |
| `2026-08-04-reprise-chantiers-en-suspens` (mot de statut) | `terminée (2026-08-05, travail sauvé de worktrees orphelins livré)` | LOT-03, inchangé | aucun |
| `2026-07-11-suivi-j7-j14-j21-et-persistance` (forme) | `terminée ; C2A et C2B livrés en production ; gate multi-cycles levé (G2 du 2026-07-19, puis D-113)` | inchangé | aucun |
| `2026-07-11-boussole-alimentaire-slice-v1` (forme) | `terminée ; 8/8, trois verdicts émis ; activation en production constatée (WN_C5_ENABLED à true)` | inchangé | aucun |
| `2026-09-04-biologie-exploitee` (forme) | statut inchangé (`terminée`) | `aucun` à la place de LOT-04, les quatre champs git ensemble (`scripts/wn-campaign-audit.mjs:177-186`) [Hypothese] | cases du done décochées : cochées sur preuve ou ligne datée (`CAMPAGNE.md:4-7`) |
| `2026-08-23-alliance-objectif-trois-voix` (forme) | statut inchangé ; ligne datée au corps (`CAMPAGNE.md:193-196`) : « close le 2026-09-14 » | `aucun` | aucun |

Corps des campagnes fermées, dans la même PR : les cases « Done » contradictoires se cochent sur preuve ou reçoivent une ligne datée (échéance HDS `CAMPAGNE.md:179-210` ; chaîne alimentaire `CAMPAGNE.md:103-117`, six cases). `AUDIT_REGLES_CAMPAGNES.md` (2026-07-21, 20 campagnes) se régénère après les statuts : `node scripts/wn-campaign-audit.mjs --no-fail --format markdown --write docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md` (`scripts/README.md:129`).

- **Mise à jour (2026-10-14)** : PR 2 mergée (09bd86b1, #1419). Statuts posés, datés du 2026-10-13, `lot_courant` « aucun », cinq gabarits LOT-00 à LOT-04 supprimés, `AUDIT_REGLES_CAMPAGNES.md` régénéré (51 campagnes, 0 erreur, 1 avertissement préexistant `duplicate_lot_ordinal`). Trois statuts diffèrent du tableau après contre-lecture sur pièces : compléments clean label « objet livré par les PR C4 #330 à #353 » ; LOT-03 de la chaîne alimentaire : règles retenues par D-045, candidates en référence (voir §7) ; rayon compléments : LOT-00 refermé sans objet le 2026-08-06. Quinze cases « Done » instruites : quatre cochées sur preuve, onze annotées d'une ligne datée.

### Campagnes maintenues (PR 3)

| campagne | geste |
|---|---|
| `2026-10-04-bio-parcours` | garder `en_pause` et `lot_courant` « aucun » (poser `en_cours` sans fiche courante fait rougir la CI) ; réécrire le texte du statut et `CAMPAGNE.md:91-98` : « reprend par BP-07 (rang 1 du plan) ; lots de sécurité livrés : 10A, 11A, 5A, 8B, D-281 lots 1 et 2 » ; passer `en_cours` dans la PR qui écrit la fiche `lots/LOT-07`. La table `CAMPAGNE.md:104-143` reçoit les lignes livrées ; l'ordre `CAMPAGNE.md:148-150` suit §5. |
| `2026-10-07-agenda-sommeil-adhesion` | LOT-11 : `terminé (2026-10-11, #1399)` ; LOT-12 : `abandonné dans cette campagne, TRANSFÉRÉ le 2026-10-13 au plan (cc, cf)` ; LOT-02 reste courant ; à la clôture du LOT-02, retirer la campagne de `parallel_campaigns` de `.wn/state.json` avant de la poser `terminée` (`scripts/wn-campaign-audit.mjs:240`). |
| `2026-09-30-bio-ingest` (close) | statut de LOT-05 (`lots/LOT-05-adaptateur-laboratoire.md:4`) : `abandonné dans cette campagne, TRANSFÉRÉ le 2026-10-13 au plan (adaptateur du laboratoire, gelé sous la porte 29)` ; il citait la file supprimée (PR 5) ; `lot_courant` LOT-12 soldé en « aucun » [Hypothese]. |

### Pilotage à corriger (PR 3)

- `.wn/state.json` : `next_action[0]` (ordonne 10A, 11A, 5A, 8B, livrés) remplacé par un renvoi au plan ; `next_action[1-39]` (traces datées) laissés ; `next_action[40-62]` vidés après versement au §8 ; `blocking_issues[0]` vidé (G-TRUST-04 clos, restes = gestes au registre) ; `last_completed_lot` mis à jour ; `active_lot` édité à la main ; `status` « active » contre `en_pause` de la campagne et d'`ACTIVE_CAMPAIGN.md:7` : réaligné [A verifier : champ écrit par `wn-cycle` ou à la main] ; `validation.overall_status` et `validation.last_checked_at` (2026-10-06) recalculés [A verifier : leur écrivain] ; puis `node scripts/wn-cycle.mjs --appliquer`, qui recalcule `recent_decision_ids` (D-277 à D-283 manquent) et régénère `ACTIVE_CAMPAIGN.md`, qui ne s'édite pas.
- Fiche LOT-25 de BIO-PARCOURS : cases et « quatre termes » (F14).
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md` : `:15` (« transféré en FILE_ATTENTE ») et `:20` (« les lots de sécurité passent en tête de file », livrés) corrigés ; Track C réécrite « lots de BIO-PARCOURS, étapes av à az » ; la porte 30 du plan (la décision, levée par D-282) y est nommée ; G3 levé par #1416 (`:16` et `:37` déjà réécrits) ; G1, G2, G4 en historique ; les règles de parallélisme gardées (reprises au §5 et en PR 4).
- `docs/claude/PROJET_CONTEXTE.md:189-202` (« Ce qui reste ouvert ») : remplacé par un renvoi au plan.
- `docs/claude/campagnes/README.md:5` : renvoi au plan au lieu de `PROGRAMME_WELLNEURO_5_0.md`.
- **Mise à jour (2026-10-14)** : PR 3 mergée (d671945b, #1420), « Campagnes maintenues » comprises. `.wn/state.json` : tête neuve renvoyant au plan, ancienne tête gardée en trace datée, 23 entrées de dettes retirées (versées au §8), `blocking_issues` vide, `wn-cycle --appliquer` joué. Les deux [A verifier] sont instruits : `status` gardé « active » (vocabulaire de l'outillage ; la pause est le statut de la campagne) ; `validation` posée à la main, aucun script ne l'écrit. LOT-11 du sommeil terminé, LOT-12 et LOT-05 de BIO-INGEST transférés au plan ; `BIOFLOW_ROADMAP.md`, `PROJET_CONTEXTE.md` et `campagnes/README.md` renvoient au plan. Reports au §8 (lignes du 2026-10-14).

### Archivés par déplacement, avec bandeau daté (PR 4)

Destination proposée [Hypothese] : `docs/archive/roadmap-updates/` pour les feuilles de route, `docs/archive/cadrages/` pour les cadrages et audits. Liens réécrits dans les documents vivants (relevé `git grep` sur 36f82cf1) : `CLAUDE.md:203-204`, `README.md:93-94`, `docs/PROJECT_STATE.md:55-56`, `docs/claude/README.md:10`, :21, :34, `docs/claude/REGISTRE_FRONTIERES.md:10`, :221, `docs/claude/PROJET_CONTEXTE_MINIMAL.md:72`, :82, `docs/claude/PROJET_CONTEXTE.md:209` (:192 et :202 partent avec la plage :189-202 en PR 3), `docs/ROADMAP_TECHNIQUE.md:10`, :13, :199, :202, :217, `docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md:2`, :6, :18, :22, `docs/claude/MON_EQUILIBRE_CONTEXTE.md:2`, :11-12, `docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md:3`, `docs/claude/PROMPTS_MON_EQUILIBRE.md:170`, `docs/design-system-d1.md:4`, :177, `.wn/documentation.yml:5-6`, :21. Restent tels quels, comme trace datée : les handoffs, `changelog.d/`, `SESSION_LOG.md` (précédent #1405) et le registre `docs/DECISIONS.md`, append-only. Un cadrage ou une photographie cité par une décision du registre reste à sa place, bandeau daté en tête. Les feuilles de route et la checklist, archivées par mandat, laissent au registre leur chemin ancien (`ROADMAP_PRODUIT` 3 citations, `CHECKLIST_ACTIVATION_G_TRUST_04` 4) : le bandeau de l'archive donne ce chemin [Hypothese]. Contrôle : `npm run ancres-check` ne lit que la doctrine et le registre (`scripts/wn-ancres-doctrine.mjs:40`) et ne prouve rien sur ces liens ; chaque PR de déplacement joue un `git grep` des anciens chemins hors traces datées et consigne un résultat vide au corps de la PR [Hypothese].

- `docs/ROADMAP_PRODUIT.md` ; `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` ; `docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md` ; `docs/claude/ROADMAP_AGENT_PLAN.md` (copie gelée, non vide : archivée, non supprimée) ; `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md`, après versement de ses dettes (§8).
- `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`, bandeau « contredit par D-121 ».
- Cadrages livrés ou soldés : CADRAGE_LETTRE_ADRESSAGE (2 citations au registre), CADRAGE_LEVEE_SIGNAL (2), CADRAGE_BIO_INGEST (2), CADRAGE_BOUSSOLE_ASSIETTE (1 ; sauf B3, gelé), CADRAGE_PORTE_BIOLOGIQUE (1 ; sauf LOT-04, absorbé par BP-27), CADRAGE_FIL_MEDECIN_5_0 (1) : tous cités par le registre, ils reçoivent leur bandeau daté en place, sans déplacement ; les revues de BIO-INGEST restent avec leur campagne ; MESURES_AUDIT_CORPUS reste en place tant que D-206 le cite.
- Photographies figées, déplacées (aucune citée par le registre) : AUDIT_CONFORMITE_5_0, AUDIT UX 5.0, AUDIT_BIOFLOW, AUDIT_PANELS, MESURE_RAYON_CORRESPONDANCE_2026-09-17, SURFACE_RELECTURE_ECART_DE_PLAN, SURFACE_RELECTURE_TEXTES_PARTAGE. Les SURFACE_RELECTURE sont huit : deux déplacées ci-dessus, et six autres (BP25, CATALOGUE_ASSIETTES, CATALOGUE_CONDUITES, FAMILLES_EQUIVALENCE, RESOLVER_LIBELLES, SAF_QUEST_01) sont citées par le registre et reçoivent leur bandeau en place.
- CADRAGE_BIO_PARCOURS_2026-10-04 (v1) ; proposition 2026-07-18-gate-modele-multi-cycles et ARBITRAGES_GATE_MULTI_CYCLES.md.
- Restent en place : CADRAGE_BIO_PARCOURS_v3, `2026-09-30-bio-ingest/CADRAGE_LOT05_ADAPTATEUR_2026-10-07.md` (porte 29), CADRAGE_CHAINE_DOCUMENTAIRE, CADRAGE_PROTOCOLE_DEPUIS_LE_CORPUS, CADRAGE_CURATION_SIGNEE, CADRAGE_EXCLUSIONS_INTERVENTIONS, `AUDIT_REGLES_CAMPAGNES.md` (régénéré par script en PR 2), les cadrages et photographies cités par le registre (bandeau en place), `ROADMAP_TECHNIQUE.md` (photo d'architecture), `ACTIVE_CAMPAIGN.md` (généré), `.wn/state.json`, chaque `CAMPAGNE.md` et ses `lots/`, le registre, `DOSSIER_RGPD.md`, `CHANGELOG.md`, les handoffs et `SESSION_LOG.md`.
- **Mise à jour (2026-10-14)** : PR 4 mergée (aaf73324, #1421). Destinations [Hypothese] confirmées : feuilles de route sous `docs/archive/roadmap-updates/`, photographies, cadrages et les dossiers du gate multi-cycles et de nutrition référentielle sous `docs/archive/cadrages/`, bandeau « Archivé le 2026-10-14 » ; douze documents cités par le registre figés en place, bandeau « Figé le 2026-10-14 ». Gate multi-cycles (« historique Git » au §7, « déplacement » ici) : déplacé. « AUDIT UX 5.0 » = `AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`. La pièce de transfert de la curation signée reste, citée par `lots/LOT-02:11-13` de doctrine exécutable (le §9 dit `:3`). `.wn/documentation.yml` reçoit la clé `plan` ; le relevé des anciens chemins hors traces datées est vide.

### Supprimés

- `docs/claude/campagnes/FILE_ATTENTE.md` (PR 5 ; le texte reste dans l'historique Git).
- `2026-07-11-complements-clean-label-v1/lots/LOT-00` à `LOT-04` : cinq gabarits vides, après `lot_courant` « aucun » (PR 2).
- Les quatre dossiers de briefs (`2026-08-18-curation-signee`, `2026-08-21-charge-et-capacite`, `2026-08-21-recit-du-parcours`, `2026-08-21-jumeau-de-comprehension`), `CAMPAIGN_DRAFT.md` compris : ils sortent du dépôt (effet accepté : « les dossiers d'origine sortent du dépôt ») ; chaque `CAMPAIGN_DRAFT.md` est un gabarit généré par `scripts/wn-campaign.mjs` (2 à 5 lignes d'écart avec le gabarit : titre, date), accompagné d'un `BRIEF_COMPILED.md`, d'un `CAMPAIGN_META.json` et d'une source ; le texte reste dans l'historique Git, les chemins sont cités au §6 (PR 4). `2026-08-18-nutrition-referentielle` n'est pas un brief (R1 livré par C5A, R2 = R:ao, R3 = R:ah, recettes gelées) : seul son `CAMPAIGN_DRAFT.md`, gabarit vide, est supprimé ; `BRIEF_COMPILED.md`, `CAMPAIGN_META.json` et sa source s'archivent par déplacement avec bandeau [Hypothese]. Reste en place : `2026-08-18-curation-signee/sources/2026-08-23-transfert-migration-axes-claim.md`, citée par doctrine-executable `lots/LOT-02:3`. L'audit des campagnes se rejoue dans la même PR [A verifier : codes `missing_in_mirror`, `extra_in_mirror`].
- **Mise à jour (2026-10-14)** : fait. Gabarits LOT-00 à LOT-04 supprimés après `lot_courant` « aucun » (PR 2, #1419) ; quatre dossiers de briefs sortis, pièce de transfert gardée, gabarit vide de nutrition référentielle supprimé (PR 4, #1421) ; `FILE_ATTENTE.md` supprimé (PR 5, #1422). Audit des campagnes vert aux PR 2, 3 et 4 (un avertissement préexistant, `duplicate_lot_ordinal`).

### Textes périmés corrigés par ligne datée, sans effacement (PR 6)

| fichier et lignes (sur 36f82cf1) | défaut | ligne datée à ajouter |
|---|---|---|
| `docs/DOSSIER_RGPD.md:20`, :34, :40, :525, :810, :995, :1164, :1199, :1212 sur f3ddbd3d (:511, :796, :967, :1136, :1171, :1184 sur 36f82cf1 ; le tableau §14, :1332-1356 sur f3ddbd3d, est déjà réaligné par #1411 et #1413) | « bornée au 2026-10-21 », « court inchangée jusqu'au 2026-10-21 », « revue du 2026-10-21 » | « 2026-10-13 : borne levée par D-265 ; échéance des trous ouverts 2027-06-30 (D-283 §9) » |
| `docs/claude/REGISTRE_FRONTIERES.md:70-83` | dérogation « bornée au 2026-10-21 », gate non levé | même ligne, avec D-121 |
| `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/DETTE_TRUST.md:10`, :14, :17, :18 (seul chemin du fichier) | échéances « 2026-T4 », « avec D-TRUST-02 » | « 2026-10-13 : échéance alignée sur le 2027-06-30 (D-265 §4) » ; :14 renvoie à D-283 §2 ; :17 à D-284 §6 (DPO clos) |
| `docs/claude/campagnes/2026-08-02-rayon-biologie-cb/CAMPAGNE.md:69`, :112-113, :152 | phrases « gate HDS » | « contredit par D-121 » |
| `docs/claude/PROJET_CONTEXTE.md:37`, :185-187 | « 40 modèles au 2026-07-21 » (101 sur 36f82cf1, 102 sur f3ddbd3d avec la table des travaux du G3) ; biologie « dormante » | compte du jour ; renvoi au plan |
| `docs/ROADMAP_TECHNIQUE.md:90`, :135, :187 | 66 modèles ; redirection `/patient/*` ; « ne lève pas le gate » ; aussi flux RAG sans Apps Script, routes récentes, date [A verifier : lignes] | compte du jour ; ligne datée D-121 |
| `2026-09-30-bio-ingest/lots/LOT-12-cloture.md:36` | « échéance du 2026-10-21 » | « 2026-10-13 : durée fixée par D-283 §2 » |
| `2026-09-30-bio-ingest/CAMPAGNE.md:79`, :80 | « 0 transmission au 2026-10-10 » ; LOT-05 « transféré … (FILE_ATTENTE) » | renvoi au constat de clôture (`lots/LOT-12:118`) ; renvoi au plan (porte 29) |
| `2026-08-02-rayon-biologie-cb/CAMPAGNE.md:24`, :34, :39, :150, :160-161, :166 | CB-07 « transféré » en FILE_ATTENTE | « 2026-10-13 : CB-07 clos, absorbé par BP-04 ; file supprimée » |
| `2026-08-02-rayon-biologie-cb/CAMPAGNE.md:63-64` | « régime remboursé » et « régime non remboursé » dits sans liaison signée | « 2026-10-13 : aucune mention de remboursement sans liaison NABM signée (porte 10) » |
| `2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md:118-120` | statut de lot « bloqué_confirmation » | « 2026-10-13 : abandonné, aucun lot ne le porte » |
| `2026-07-23-accueil-observatoire/CAMPAGNE.md:40` | messagerie patient « différée, HDS » | « messagerie : collecte documentaire seule » ; la pagination n'est pas dans ce fichier : elle reste au constat S-1 (H06) et au §8 |
| `2026-07-11-boussole-alimentaire-slice-v1/ACTIVATION_RUNBOOK_C5.md` | « Vercel, drapeau false » | « 2026-10-13 : Vercel décommissionné (D-080, D-120) » [A verifier : lignes] |
| `CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:480-484`, :489-497 | §6.5 questions 2 à 5 ouvertes ; §6.6 périmé (borne du 2026-10-21, entrée de FILE_ATTENTE) | « 2026-10-13 : questions gelées au plan ; §6.6 remplacé par le plan » |
| `docs/DOSSIER_RGPD.md` (DEMANDE_DPA « envoyée »), `CONSTITUTION_CLINIQUE` (revue DC-42 au 2026-08-30), `FEATURE_FLAGS.md` (WN_EI_INTERRUPTION), `DETTE_TRUST.md` (règle EI « v1 »), fiches-conseils (lien signé vers le médecin), cadrage LOT-04 (absorbé par BP-27) | périmés | une ligne datée chacun |

- **Mise à jour (2026-10-14)** : PR 6 mergée (7c4eeab2, #1423) ; lignes datées posées sans effacement, datées du 2026-10-14, jour de leur écriture (le tableau écrit 2026-10-13). `PROJET_CONTEXTE.md` : 102 modèles au compte du jour ; `DETTE_TRUST.md` : échéances alignées sur le 2027-06-30. Signalés hors périmètre, non corrigés : `2026-08-02-rayon-biologie-cb/CAMPAGNE.md` :30, :55, :120-122 ; `AUDIT_DOCTRINE_CHAINE_T0.md` :166, :632 ; en-tête de `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`. `consommation_decisions.json` : réexamen du rayon CORPUS biologie daté du 2026-10-01, échu, à constater [A verifier].

## §10 Décisions et textes à écrire, consolidés

« La main du responsable » : texte ou signature du responsable. « Registre » : texte rédigé dans le lot et accepté par le responsable, sans contenu clinique neuf. Chaque D-xxx se réserve dans main au moment de l'écrire ; le prochain numéro libre se lit en tête de `docs/DECISIONS.md`. Ce plan ne prend aucune lettre : toutes les lignes ci-dessous ont une lettre existante ou sont des D-xxx de lot. La seule lettre neuve envisagée est cr, pour le délai des dossiers bloqués avant T0, et seulement après le comptage (H07).

### Lettres déjà écrites (ne se réécrivent pas)

| lettre | écrite par | ce qui reste | fiche |
|---|---|---|---|
| i | D-280 (#1404), pour les seuils de 8B | sources du sommeil hors 8B et de « Mon équilibre » (porte 4) | H08 |
| ck | D-282 (#1410), porte 30 levée | rien : lots 2 à 5 mergés (#1412 à #1416), G3 levé (D-282 §8) | F42 |
| l | D-283 §2 à §9 (#1411) | les six lots de D-283 §10 ; point de départ de l'archive à valider par conseil | F44, H26 |
| cp | D-283 §9 (#1411) | les restes de §9, échéance 2027-06-30 | F69 |
| cq | D-285 (ce plan) | rien : PR 2 à 6 du versement mergées (#1419 à #1423) | H04 |
| ci | D-286 (#1425), 2026-10-14 | rien ; le déclencheur du réexamen de l'AIPD se tranche à F68, lettre co (D-286 §5) | F67 |
| a | D-287 (#1430), 2026-10-14 | rien ; ordre au plan (D-287 §3) | F01 |
| b | D-288 (#1430), 2026-10-14 | les textes patient de chaque place, un par un (§6) ; toute levée du second compte par une D-xxx, pas avant le 2027-10-11 (§5) | H05 |
| g | D-289 (#1430), 2026-10-14 | l'essai G-7 (rang 1), ses commandes au `docs/RUNBOOK.md` ; porte 8 | F04 |

### Lettres à écrire

| lettre | objet | de qui | rang | fiche |
|---|---|---|---|---|
| a | décisions d'ordre ; pilotage réaligné (écrite : D-287, #1430) | la main du responsable | 0 | F01 |
| b | une activation à la fois ; second compte fermé un an (écrite : D-288, #1430) | la main du responsable | 0 | H05 |
| c | cockpit chiffré sous provenance | la main du responsable | 1 ; M-2 au rang 2 | F59 |
| d | doctrine d'adhésion | la main du responsable | 1 | H32 |
| e | signature de SAF-EI-01 amendée | la main du responsable | M-1 au rang 3, J1-sécu au rang 4 | F66 |
| f | NABM : 8 liaisons, puis liste étendue | la main du responsable | 2 | F54 |
| g | essai de restauration, procédure et portée (écrite : D-289, #1430) | la main du responsable | 0 | F04 |
| h | Boussole retirée ; exception à D-276 §1 | la main du responsable | 0 | H16 |
| j | D2, règle de dépendance ; module publié ; fait le 2026-10-15 (D-306) | registre | 0 | F63 |
| k | CGU unique ; texte de l'IA v7 | la main du responsable | 0 | F77 |
| m | encart de sécurité sur les CAB_ ; fait le 2026-10-15 (D-303) | la main du responsable | 0 | H10 |
| n | garde de dose resserrée ; fait le 2026-10-15 (D-304) | la main du responsable | 0 | H11 |
| o | Momentum à remesure libre | la main du responsable | 1 | H30 |
| p | journal de lecture du protocole ; fait le 2026-10-15 (D-315) | registre | 4 (migration) | H60 |
| q | aperçu médecin tracé, remise au patient ; fait le 2026-10-15 (D-307) | la main du responsable | 0 | F38 |
| r | droits d'usage des instruments ; fait le 2026-10-21 (D-341 §2) | registre | 1 | H28 |
| s | onglet Biologie, statut posé, deux marques ; fait le 2026-10-15 (D-308 ; la liste des statuts reste à écrire) | la main du responsable | 0 | F57 |
| t | point d'étape, rappel nommé ; fait le 2026-10-17 (D-317) | la main du responsable | 1 | H31 |
| u | Patient Hub, collecte, « Mes échanges » | la main du responsable | 1 | H37 |
| v | bandes de bruit par instrument | la main du responsable | 1 | H13 |
| w | guide des 12 besoins sur sources ; méthode écrite le 2026-10-15 (D-312), guide à réécrire | la main du responsable | 0 | H15 |
| x | posture d'API, aucune clé | la main du responsable | 1 ; après ci | H29 |
| y | comptes du cabinet | la main du responsable | 3 | H58 |
| z | mineurs, garde d'âge (seuil 18 ans acquis par D-284 §4 ; garde = date demandée à la connexion, lot (h) de H26) ; fait le 2026-10-15 (D-302 : date obligatoire à la création) | la main du responsable | 0 | F45 |
| aa | courrier de remboursement ; fait le 2026-10-15 (D-309) | la main du responsable | 0 | F55 |
| ab | EF-0, trancher Q3 ; fait le 2026-10-15 (D-310) | la main du responsable | 0 | H14 |
| ac | radar sans zéro ; fait le 2026-10-15 (D-301) | la main du responsable | 0 | H12 |
| ad, bc | un cycle, pas un programme ; ajouts par version datée | registre | 1 | H34 |
| ae | bloc Protocole du document médecin | la main du responsable | 5 | F39 |
| af | référence de fiche conseil sur l'action | la main du responsable | 1 | H24 |
| ag | rédaction assistée des zones du protocole | la main du responsable | 1 | H25 |
| ah | familles de fiches conseils par thème | la main du responsable | 5 | H68 |
| ai | accusé de lecture de « Mes échanges » | la main du responsable | 2 | H51 |
| aj | encadré « Envisagé ensuite » | la main du responsable | 3 | H53 |
| ak | invitation d'autoévaluation au 21e jour | la main du responsable | 10, place 7 | H80 |
| al | axes alimentaires | la main du responsable | 3 | H57 |
| am | table de quantités | la main du responsable | 1, fermé sans source | H33 |
| an | photo ou dictée des repas | la main du responsable | 10, place 11 | H83 |
| ao | fiche compléments remise au patient | la main du responsable | 10, place 8 | F78 |
| ap | bibliothèque pédagogique (écrite : D-357, 2026-10-24) | la main du responsable | 10, place 10 | H82 |
| aq | contrôle bloquant des modifications cliniques | registre | 1 | H21 |
| ar | montée de version datée des briques | registre | 1 | H22 |
| as | fiche signalétique, date de naissance ; close le 2026-10-22 (D-342 §4) | la main du responsable | 10, place 6 | F45 |
| at | date de naissance lue par l'extraction ; remplacée le 2026-10-22 (D-342 §3) | registre ; texte patient de la main du responsable | 1 au plus tôt [Hypothese] | F45 |
| au | drapeaux du sommeil à l'écran | la main du responsable | 3 au plus tôt [Hypothese] | H56 |
| av | contenu biologique du document médecin ; fait le 2026-10-15 (D-311) | la main du responsable | 0 | F33 |
| aw | familles du bilan | la main du responsable | 1 au plus tôt [Hypothese] | F34 |
| ax | lot du bilan hiérarchisé | registre | 6 [Hypothese] | F35 |
| ay | rédaction assistée du bilan | registre | 7 [Hypothese] | F36 |
| az | notice patient du bilan | la main du responsable | texte 1 [Hypothese] ; activation file C | F37 |
| ba | mention « validé par votre praticien », ajout à la page servie | la main du responsable | 1 [Hypothese] | H35 |
| bb | trois plans de chaque geste | la main du responsable | 2 au plus tôt [Hypothese] | H49 |
| bd | encart « quand ralentir ou demander avis » | la main du responsable | 5 au plus tôt [Hypothese] | H71 |
| be | gestes communs au catalogue | la main du responsable | 2 [Hypothese] | H47 |
| bf | indicateurs hebdomadaires, au point d'étape | la main du responsable | instruction 0 ; code 3 au plus tôt, 4 si le contrat du point d'étape migre [Hypothese] | H19 |
| bg | flux de l'export vers l'assistant externe | la main du responsable | 0 | H18 |
| bh | rendu imprimable du protocole | registre | 5 au plus tôt [Hypothese] | H69 |
| ca | cadrage de la refonte du sommeil ; fait le 2026-10-15 (D-300) | la main du responsable | 0 | H17 |
| cb | textes de l'écran de fin | la main du responsable | 1 [Hypothese] | H39 |
| cc | habillage de la saisie du sommeil | la main du responsable (jeu d'illustrations) | 2 au plus tôt [Hypothese] | H48 |
| cd | rituel du soir rattaché au protocole | la main du responsable (échelle) | 3 au plus tôt, 4 si migration [Hypothese] | H54 |
| ce | comptes des facteurs et de la forme | registre | 3 au plus tôt [Hypothese] | H55 |
| cf | indices de clôture côte à côte | registre | 4 [Hypothese] | H66 |
| cg | ses nuits par semaine, avec la frise | registre | 4 | H63 |
| ch | tendance non chiffrée de ses nuits : une phrase en fin d'agenda | la main du responsable | 5 au plus tôt [Hypothese] | H72 |
| ci | amendement de D-276 : cinq déclencheurs (écrite : D-286, #1425) | la main du responsable | 0 [Hypothese] | F67 |
| cj | rationalisation des packs biologiques | la main du responsable | 0 [Hypothese] | F49 |
| cl | cadrage de l'adaptateur du laboratoire | registre ; rôles RGPD de la main du responsable | gelé ; 0 dès la porte 29 | F41 |
| cm | axes biologiques, liste fermée | la main du responsable | 1 [Hypothese] | F51 |
| cn | courbe d'analyte | registre, sous c | 5 au plus tôt [Hypothese] | F56 |
| co | réexamen de l'AIPD ; fait le 2026-10-15 (D-313) | la main du responsable (conclusion) | 0 [Hypothese] | F68 |

### D-xxx de lot et de fonction (biologie)

| D-xxx | objet | rang | fiche |
|---|---|---|---|
| de l'effectif | effectif de masquage, motivé (valeur fixée par D-298 : cinq dossiers distincts) | 0 [Hypothese] | F25 |
| de BP-09 | amende D-124 §3 ; la condition « premier import » sort des préalables | 2 | F03 |
| de BP-12a, BP-11, BP-13, BP-15, BP-04 | fiches d'usage ; constats ; données physiologiques ; décisions de parcours ; attente typée | 4 | F05, F06, F07, F08, F16 |
| de BP-12b, BP-14, BP-17, BP-18a, BP-18b, BP-05, BP-16 | positions signées ; identité d'auteur ; bibliothèque ; niveau 3 figé ; protocole personnalisé ; contexte de prélèvement ; boucle d'exploration | 5 | F09, F10, F11, F12, F13, F20, F17 |
| de BP-20, BP-24, BP-27, des indications v2 | suivi factuel ; conformité ; évaluateur par marqueur ; re-signature en v2 | 6 [Hypothese] | F18, F21, F27, F53 |
| de BP-08, BP-21a, BP-19, BF-9, par fonction | indicateurs ; ouverture J1 ; stratégie proposée ; statut « demandé » ; étage 2 et marches 2 à 4 | 7 [Hypothese] | F19, F22, F28, F62, F29, F30 |
| de BP-21b, BP-22 | ouverture du protocole personnalisé ; observation | 8 [Hypothese] | F23, F24 |
| par parcours | phase 5 par situation | 9 [Hypothese] | F31 |
| du correctif de la charge (le barème ignore les actions vides, tranché le 2026-10-21) | une D-xxx et son fragment ; fait le 2026-10-21 : D-339 | 1 [Hypothese] | F76 |
| du message de la page des résultats | deux textes de la page des résultats, non décidés ; de la main du responsable | 9 [Hypothese] | F65 |
| du gabarit imprimable commun | commun à av et bh, tranché dans le texte d'av ; à défaut, deux gabarits [Hypothese] | 0 | F33, H69 |
| amendant D-122, de P1, par levée | biologie dans le score ; jeu de référence ; P2, second compte, API, flux, envoi direct | gelés (§6) | F32, F72, F73, F75 |

### D-xxx hors biologie

| D-xxx | objet | de qui | rang | fiche |
|---|---|---|---|---|
| de cq | forme du plan unique : D-285, écrite | registre | 0 | H04 |
| du délai avant T0 | délai, après le comptage ; lettre cr si aucune ne couvre l'objet | la main du responsable | après le comptage | H07 |
| de cadrage ca | refonte du sommeil, présentation seule | la main du responsable | 0 | H17 |
| par indicateur hebdomadaire | nom, source, échelle, nature | la main du responsable | 0 (instruction) | H19 |
| de seuils_points de Q_ALI_01 | décision clinique sourcée | la main du responsable | 1 [Hypothese] | H40 |
| des règles orphelines | réécriture des trois restes | registre | 1 [Hypothese] | H41 |
| de la table d'arrêt | grilles citées, signature | la main du responsable | 1 [Hypothese] | H42 |
| de ag | rédaction assistée, sous sa propre décision (D-273) | la main du responsable | 1 | H25 |
| de ai | accusé de lecture, avant la place 3 | la main du responsable | 2 | H51 |
| de recueil (cd) | échelle du rituel du soir | la main du responsable | 3 au plus tôt [Hypothese] | H54 |
| clinique (au) | drapeaux du sommeil décrits | la main du responsable | 3 au plus tôt [Hypothese] | H56 |
| clinique (ch) | exception écrite, pour l'agenda, à l'interdit des chiffres au portail : comparaison d'un agenda fini au précédent, marge « stable », trois phrases fixes | la main du responsable | 5 au plus tôt [Hypothese] | H72 |
| de ap | bibliothèque pédagogique | la main du responsable | 10 | H82 |
| de D-283, lots (a) à (f), et de D-284, lots (g) à (j) | aucune neuve : « sans arbitrage neuf » (D-283 §10 ; D-284 §7) ; (j) demande une analyse d'impact du transfert | registre ; textes (a), (e) et l'analyse d'impact de la main du responsable | 1 à 4 [Hypothese] | H26 |
| K-05a et D4 | liste fermée et déclaration des sites IA (porte 5) ; faits le 2026-10-15 | la main du responsable | 0 | F46 |
| échelle E4 | échelle E4 de l'adhésion, tranchée avec la signature M-2 | la main du responsable | 2 | H32 |
| de produit pour la frise | frise de J3-base | la main du responsable | 4 [Hypothese] | H61 |
| du lot 3 de D-281 | exclure ou non l'action d'orientation médecin de la liste proposée au patient — **tranchée le 2026-10-14 : exclue, avec toute orientation vers le médecin et toute prise de sang** | la main du responsable | 1 | F66 |
| du repère du 2027-06-30 | statut de repère légal pour J3-mineurs, à confirmer | la main du responsable | 10 [Hypothese] | H79 |

### Signatures et approbations

| geste | objet | rang | fiche |
|---|---|---|---|
| M-1 | signature de SAF-EI-01 amendée | 3 | F66 |
| M-2 | doctrine du cockpit chiffré (porte 6) | 2 | F59 |
| M-3 | 8 liaisons NABM (5 signées le 2026-10-15 ; 3 sans acte, constat par M-3c) | 1 | F54 |
| M-5 (1/2) | signatures de BP-07 (posées dans le lot, #1435, #1438) | 2 | F02 |
| M-5 (2/2) | approbation de la release-db de BP-09 (fait le 2026-10-14) | 3 | F03 |
| liens analyte-axe | signés claim par claim | 5 [Hypothese] | F79 |
| release-db | chaque migration, approuvée par le responsable, une à la fois | selon la fiche | §2 |
| G-3 | liste NABM étendue | 3 | F54 |
| porte 23 | contenus de BP-12a, BP-12b, BP-17, signés avant le merge de leur lot | 4 et 5 | F05, F09, F11 |

## §11 Versement au dépôt : six PR

Ordre. Une finalité par PR, un merge à la fois, jamais d'auto-merge (H23). Aucune ne touche `schema.prisma`, une migration, une règle clinique ou un seuil. Aucune ne déclenche de release-db.

### Forme opaque

Le dépôt est public. Il reçoit des identifiants (lettres, BP-nn, portes 1 à 30, rangs, places de la file C), des mécanismes et des renvois D-xxx. Jamais au dépôt : l'objet détaillé d'un lot, un texte du responsable non encore signé, un coût, une identité, un nom ou un e-mail de patient, un constat de production autre qu'en agrégat déjà publié au registre. Champs d'une fiche au versement : gardés, l'identifiant et la piste, le rang, les portes et préalables (en ids), la ligne migration et release-db, les décisions et textes par leurs identifiants, le critère de fin réduit à son mécanisme ; supprimés, l'objet détaillé, l'effet visible, le coût, la provenance et tout texte du responsable non encore signé (il n'entre qu'avec sa D-xxx).

### Les six PR

| n° | finalité | contenu | préalable |
|---|---|---|---|
| 1 | cq et le plan | D-285 au registre (`decisions-check`, joué par `npm run check`, rougit sur un numéro en double) ; `docs/claude/PLAN_WELLNEURO.md` en forme opaque (rangs, portes, fiches réduites aux ids, gelés, abandonnés, dettes) ; fragment `changelog.d/` | aucun |
| 2 | clôtures | statuts des cinq campagnes et des quatre dossiers alimentaires, lots ouverts fermés dans le même commit, `lot_courant` « aucun » avant la suppression des cinq gabarits LOT-00 à LOT-04, deux mots de statut, quatre corrections de forme, cases « Done » contradictoires, `AUDIT_REGLES_CAMPAGNES.md` régénéré (§9) | PR 1 mergée |
| 3 | pilotage | `.wn/state.json` (tête de `next_action`, `blocking_issues`, `active_lot` à la main), puis `node scripts/wn-cycle.mjs --appliquer` ; fiches LOT-11, LOT-12 et LOT-25 ; statut de LOT-05 de BIO-INGEST ; `BIOFLOW_ROADMAP.md` ; `PROJET_CONTEXTE.md:189-202` ; `campagnes/README.md:5` (§9) | PR 2 mergée |
| 4 | archivage | déplacements avec bandeau daté (feuilles de route, `HISTORIQUE_CHANTIERS_TECHNIQUES.md`, cadrages et photographies que le registre ne cite pas) ; bandeau en place pour ceux qu'il cite ; suppression des quatre dossiers de briefs, sauf la pièce de transfert, et du gabarit vide de nutrition référentielle, dont le reste s'archive ; liens réécrits dans les documents vivants, `CLAUDE.md:203-204` et `.wn/documentation.yml:5-6`, :21 compris ; `git grep` des anciens chemins (§9) | PR 3 mergée |
| 5 | suppression de la file | `docs/claude/campagnes/FILE_ATTENTE.md` supprimé ; les deux adresses de routage de `.claude/rules/pr-revue-et-release-db.md:60-62` (la file, et « dette nommée de `docs/ROADMAP_TECHNIQUE.md` », dont le §12, :214-217, renvoie à l'historique archivé en PR 4) réécrites vers le plan, de même `.claude/skills/wn-merge/SKILL.md:86` ; ses dettes vivantes sont déjà au plan (§8) | PR 4 mergée |
| 6 | contexte et dettes | `docs/claude/PROJET_CONTEXTE.md`, `DETTE_TRUST.md` (sous la campagne TRUST), lignes datées des textes périmés (§9) | PR 5 mergée |

- **Mise à jour (2026-10-14)** : versement terminé, aucune migration ni release-db. PR 1 : 57ab15ed (#1417) ; PR 2 : 09bd86b1 (#1419) ; PR 3 : d671945b (#1420) ; PR 4 : aaf73324 (#1421) ; PR 5 : 069db0d1 (#1422) ; PR 6 : 7c4eeab2 (#1423). Reports vers ce plan : mises à jour du §9 et lignes datées du §8.

Notes de contenu :

- PR 5. Aucun script ni crochet ne lit `FILE_ATTENTE.md` sur 36f82cf1 (recherche dans `scripts/`, `.github/`, `.claude/hooks/`) ; aucun lien Markdown ne pointe vers lui. Il est cité en texte par 76 fichiers sur 36f82cf1, handoffs et fragments compris, dont `.wn/state.json`, `docs/DECISIONS.md`, `BIOFLOW_ROADMAP.md` et 23 documents de campagne ou de cadrage : ces mentions restent, comme trace datée, sauf les deux adresses de routage ci-dessus.
- PR 4. `.wn/documentation.yml:5-6` (`roadmap_technique`, `roadmap_produit`) et :21 (note qui cite `ROADMAP_PRODUIT.md`) : `roadmap_produit` pointe vers l'archive, une clé `plan` vers le plan ; `scripts/wn-kit-doctor.mjs` ne contrôle pas ces chemins (lecture du script).
- PR 3. `ACTIVE_CAMPAIGN.md` ne s'édite pas : il est régénéré par `wn-cycle --appliquer`, qui ne réconcilie que dans un sens ; `active_lot` s'édite à la main dans `.wn/state.json`.
- PR 2 et 4. Certains générateurs de documentation n'indexent que le suivi Git, d'autres comptent aussi les fichiers non suivis (`scripts/wn-matrice-consommation.mjs:345-355`) : `git add` avant de régénérer reste la règle sûre, et chaque PR nomme le générateur qu'elle rejoue.

### Contrôles de chaque PR

- `cd web && npm run check` (T1 complet), qui joue `hooks-check` ; pour les PR 2, 3 et 4, aussi `npm run campaign-audit-check` (codes bloquants `closed_campaign_with_open_lots`, `inflight_without_active_lot`, `idle_with_active_fields`, `missing_in_mirror`, `extra_in_mirror`, `status_drift_between_roots` ; l'audit connaît aussi `active_lot_missing` et `partial_git_metadata`, `scripts/wn-campaign-audit.mjs:173`, :183 : `active_lot` posé à la main avant `wn-cycle --appliquer`, les quatre champs git ensemble) et `npm run ancres-check`.
- `bash scripts/check_no_secrets.sh --staged` ; aucun fichier `.env*` ; textes en français.
- Sortie des suites redirigée vers un fichier puis relue ; jamais relancée pour relire.
- PR ouverte avec `--body-file` ; `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond ; seul le code 0 autorise à dire la PR prête ; si le code 2 nomme un ancien sha, comparer au sha poussé et relancer seul.
- Commentaires en ligne lus par `gh api repos/{owner}/{repo}/pulls/<N>/comments` ; un verdict par commentaire (corrigé, écarté avec motif, routé avec adresse) ; à partir de la PR 5, « routé » veut dire « vers le plan ».
- Un merge à la fois ; le suivant attend le déploiement constaté du précédent (Scalingo fait reculer la production sur un vert tardif).
- Fichier non suivi sur la copie principale (`web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts`) : hors de ces PR, jamais poussé tel quel ; le banc des cas fictifs se refait à l'étape 4 de D-281 (F66).
