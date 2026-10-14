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
   Hnn : les 83 fiches hors biologie. Quand une fiche et sa table d'entrée
   diffèrent, la table d'entrée fait foi.
5. Les files. File A : cosmétique et noyau, c'est-à-dire tout le code hors
   biologie. File B : biologie structurelle (BIO-PARCOURS, BIO-INGEST, panels,
   Track C). File C : activations patient, une à la fois, avec constat entre
   chacune (porte 18). Geste du responsable : textes, signatures, sources,
   approbations, constats. Pour une fiche Fnn, « file A » se lit « geste »,
   « file B » se lit « file B », « file C » ne change pas ; la file se lit
   dans la table d'entrée de son rang.
6. Dans chaque rang : une table d'entrée (tout ce qui est à ce rang, avec sa
   fiche), puis les fiches dont le premier élément est à ce rang, dans l'ordre
   file A, file B, file C, gestes. Une fiche qui court sur plusieurs rangs
   apparaît dans la table de chaque rang, une seule fois en fiche.
7. Marques : [Hypothese] = rang proposé, non acquis, à confirmer au cadrage du
   rang ; [A verifier] = non relu à la source.
8. Alias, pour la recherche au cadrage : G-1 et RK-9 vont avec M-1 (F66) ;
   G-2 avec M-3 (F54) ; J1-nabm avec S-7 (F54) ; G-4 avec M-2 (F59, H32).
   « Track C » (BioFlow) n'est pas « file C » (activations) ; « R6 » nu et
   « 6.0-B » nu sont ambigus, toujours qualifier.

### Le décompte

- Fiches : 162, soit 79 fiches Fnn et 83 fiches Hnn. Gelées en §6 : 7 fiches
  Fnn ; closes : 2 (F42, F43, G3 clos par #1416), rangées après la table
  « Livré ».
- Fiches par rang de première apparition : rang 0 : 42 ; rang 1 : 28 ;
  rang 2 : 11 ; rang 3 : 7 ; rang 4 : 16 ; rang 5 : 17 ; rang 6 : 9 ;
  rang 7 : 8 ; rang 8 : 4 ; rang 9 : 3 ; rang 10 : 6 ; rang T : 2 ; gelées : 7.
- Lignes des tables d'entrée des rangs : 206. Fiches de gestes du responsable
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
- **Mise à jour (2026-10-14)** : `origin/main` = 474e9d67 (#1444). Dernière décision au registre : D-291 (gouvernance des PR, #1440, #1444). Lettres écrites depuis ce plan : ci (D-286, #1425), a (D-287), b (D-288), g (D-289) (#1430) ; prochaine lettre libre : cr. Une migration mergée depuis : D-284 lot (j), #1426 ; sa release-db n'est consignée nulle part sur main [A verifier] (porte 9). Acquis non reposés : s'y ajoutent les arbitrages du responsable du 2026-10-14, consignés par D-286 à D-289 et aux handoffs du jour.

## §1 Les portes

Trente portes. Une porte de geste compte au rang 0 ; une porte de constat ou de campagne s'ouvre au fait et prend le rang au plus tôt après son fait ; son consignataire est le responsable (lecture par conteneur, en agrégats, ou lecture consignée d'un texte), sauf les portes 20 et 21, constatées par la revue de PR ; la fiche que la porte tient porte le critère observable.

| n° | objet | levée par | état au 2026-10-13 |
|---|---|---|---|
| 1 | Constat initial en conteneur, en agrégats | S-1, Q-1 (rang 0) : F40, H06 | levée en partie le 2026-10-12 ; restent le premier import v4 commenté et le premier accusé usage_ia v7, au fait ; [A verifier] : la lecture est en `bio-extraction-v5` depuis #1428 et `usage_ia` en v8 depuis #1431, le critère nomme encore v4 et v7 |
| 2 | Décisions d'ordre mergées : deux files, une activation à la fois, restauration | a, b, g par la PR S-3 (rang 0) : F01, H05, F04 | levée le 2026-10-14 : a, b, g écrites par D-287, D-288, D-289, mergées par la PR S-3 (#1430) |
| 3 | Radar sans zéro décidé | M-6, ac (rang 0) : H12 | non levée : texte à écrire ; fond acquis |
| 4 | Sources à fournir : poids égal, seuils, fidélité, quantités, axes | le responsable (rang 0) : H08 | en partie : D-280 source les seuils de 8B ; règle du milieu levée ; restent poids égal, seuils du sommeil hors 8B et de « Mon équilibre », fidélité, quantités, axes |
| 5 | K-05a et D4 : liste fermée et déclaration des sites IA | le responsable (rang 0) : F46 | non levée |
| 6 | Doctrine du cockpit chiffré et de l'adhésion signée | M-2, G-4 (rang 2), sur c et d (rang 1) : F59, H32 | non levée |
| 7 | SAF-EI-01 signée, puis déploiement constaté | M-1 (rang 3), puis J1-sécu (rang 4) : F66 | non levée ; lots 1 et 2 de D-281 sur main (#1406, #1408) ; portail, validation, signature à faire ; se lève au rang 4 |
| 8 | Essai de restauration réussi | K-18a (0), G-7 (1) : F04 | non levée ; préalable de toute migration après BP-09 ; BP-09 ne l'attend pas ; portée et procédure écrites par D-289 (#1430) ; G-7 non joué |
| 9 | release-db approuvée, sentinelle, constat, une à une | le responsable, à chaque migration | constatée pour #1397 (2026-10-11) et pour le lot 2 de D-281 (2026-10-13) ; à venir pour BP-09 (rang 3) ; migration de D-284 lot (j) mergée le 2026-10-14 (#1426), release-db non consignée [A verifier] |
| 10 | NABM signée : 8 analytes, puis liste étendue | S-7 (0), M-3 (1), f (2), G-3 (3) : F54 | non levée : 0 liaison signée |
| 11 | Bandes de bruit signées, instrument par instrument | G-10 (0), v (1) : H13 | non levée |
| 12 | D2 mergée | j (rang 0) : F63 | non levée |
| 13 | Textes communs : CGU, registre, circuit des droits, Patient Hub | k (0) : F77 ; l, écrite pour l'essentiel par D-283 (§2 durées, §6 droits) ; u (1) : H37 ; G-8 (2) : H50 | **levée le 2026-10-14** : k (D-292), u (D-293), G-8 (procédure des droits écrite, `docs/DOSSIER_RGPD.md` rubrique 9) ; restes de l en H26 |
| 14 | Accusé de lecture daté décidé (renverse) | ai (rang 2) : H51 | non levée |
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

Chaque rang porte une table d'entrée, puis ses fiches (file A, file B, file C, gestes). Les rangs des fiches Fnn sont ceux de la feuille de route BioFlow, ajustés par les arbitrages acquis ; les rangs des fiches Hnn suivent les arbitrages acquis, sinon ils portent [Hypothese]. Le chemin critique : rang 0, ci (sa PR propre, avant le merge de b ; fait, #1425), puis a et S-3 (fait, #1430) → rang 1, BP-07 (clos le 2026-10-14, #1438) et portail de D-281 → rang 2, signatures de BP-07 (posées dans le lot, #1435, #1438), BP-09 (fiche validée, #1442), validation de D-281 → rang 3, release-db de BP-09, signature M-1 → rang 4, BP-12a, BP-11, BP-13, BP-15, J1-sécu (porte 7) → rang 5, J3-bio → rang 6, BP-24 → rang 8, BP-21b.

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
| S-1, biologie | premier import v4, accusés v7, mutations versées | geste | 1 | non | F40 |
| S-1, hors biologie | vérifications renvoyées au premier constat | geste | 1 | non | H06 |
| R:Comptage T0 | dossiers bloqués avant T0, comptés en conteneur | geste | aucune | non | H07 |
| porte 4 | sources à fournir | geste | lève 4 | non | H08 |
| K-05a, D4 | liste fermée des sites IA | geste | lève 5 | non | F46 |
| porte 28 | avis, fiches et règles hors liste | geste | lève 28 | non | H09 |
| m | encart de sécurité sur les CAB_ | geste | aucune | non | H10 |
| n | garde de dose resserrée | geste | aucune | non | H11 |
| z | mineurs, garde d'âge, date de naissance | geste | aucune | non | F45 |
| ac | radar sans zéro | geste | lève 3 | non | H12 |
| G-10 | sources de fidélité, une par instrument | geste | 11 | non | H13 |
| j | D2, règle de dépendance | geste | lève 12 | non | F63 |
| q | aperçu médecin sous garde, remise tracée | geste | 27 | non | F38 |
| s | onglet Biologie, statut posé, deux marques | geste | aucune | non | F57 |
| aa | courrier de remboursement | geste | aucune | non | F55 |
| ab | EF-0 : trancher Q3 | geste | aucune | non | H14 |
| w | guide des 12 besoins réécrit sur sources | geste | aucune | non | H15 |
| S-7 | liste des 8 analytes NABM partagés | geste | 10 | non | F54 |
| k | CGU unique ; usage_ia v7 (version à l'origine de la fiche ; la v1 des conditions reprend la version en vigueur à l'activation, v8 au 2026-10-14) ; fait, D-292 du 2026-10-14 | geste | 13 | non | F77 |
| h | Boussole retirée ; exception à D-276 §1 | geste | aucune | non | H16 |
| av | contenu biologique du document au médecin | geste | aucune | non | F33 |
| l, trace d'import | trace d'import conservée comme le dossier | geste | 17, 13 | non | F44 |
| comportement voulu | « Reprendre cette charge » sur un brouillon gonflé | geste | 28 | non | F76 |
| effectif | effectif de masquage des agrégats | geste | aucune | non | F25 |
| copie datée | accord de sous-traitance d'Anthropic, copie datée | geste | aucune | non | F47 |
| cj | rationalisation des packs biologiques | geste | aucune | non | F49 |
| écarts d'unité | lecture des écarts d'unité textuels | geste | aucune | non | F60 |
| ci | amendement de D-276 : cinq déclencheurs | geste | aucune | non | F67 |
| co | réexamen de l'AIPD | geste | aucune | non | F68 |
| cp | revue des trous RGPD (écrite par D-283) | geste | aucune | non | F69 |
| ca | cadrage de la refonte de l'agenda du sommeil | geste | aucune | non | H17 |
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

**Gestes du responsable**

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
- **Mise à jour (2026-10-14)** : lettre g écrite : D-289 (#1430) : portée (§1) et procédure (§2) ; commandes exactes au `docs/RUNBOOK.md` dans le lot G-7. D-289 §1 compte aussi #1426 (D-284 lot j), avec #1408 et #1412, parmi les migrations mergées avant l'essai, par le fait. G-7 n'est pas joué ; porte 8 non levée.

#### F40 · S-1 : premier import v4, accusés v7, mutations versées
- **Identifiant, piste** : S-1 (reste) ; verser les constats des mutations de BIO-INGEST ; ingest.
- **Rang** : 0, au fait : il faut un premier dépôt (constat en agrégats du 2026-10-12).
- **Portes, préalables** : aucun ; la D-xxx de l'effectif (F25) passe avant tout compte sur plusieurs dossiers.
- **Migration, release-db** : non ; la release-db de #1397 est appliquée et constatée depuis le 2026-10-11.
- **Décisions, textes** : aucune.
- **Critère de fin** : constat versé en agrégats, sans identifiant couplé à des métriques : commentaires relevés, signaux « non transcrit », imports en échec par motif, accusés v7 ; porte 1 levée en entier.
- **Mise à jour (2026-10-14)** : [A verifier] le titre et le critère nomment l'import v4 et les accusés v7 ; depuis #1428 la lecture est de procédé `bio-extraction-v5`, sans repli sur le document, et #1431 publie `usage_ia` v8 (accusé recueilli au dépôt, comme v6 et v7). Le constat attendu au premier usage réel porte sur un masquage puis un import v5 ; la vérification qu'aucun import v4 n'est né après le merge de #1428 n'est pas consignée. Critère à relire par le responsable ; rien n'est réécrit ici.

#### H06 · S-1, part hors biologie : vérifications versées au premier constat
- **Identifiant, piste** : S-1, part hors biologie.
- **Rang** : 0 ; fait en partie le 2026-10-12.
- **Portes, préalables** : porte 1 ; applique l'effectif de masquage de cinq, acquis ; sa D-xxx (F25), geste de rang 0, se merge avant le premier compte sur plusieurs dossiers.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune ; un reste que le code ne permet pas de vérifier passe au bloc des gelés (§6) avec son déclencheur.
- **Critère de fin** : chaque vérification versée en agrégats, par identifiant, jamais par nom ; lecture seule par conteneur.

#### H07 · R:Comptage T0 : dossiers bloqués avant T0
- **Identifiant, piste** : R:Comptage T0 ; protocole ; geste du responsable (constat).
- **Rang** : 0.
- **Portes, préalables** : aucun ; effectif de masquage acquis ; sa D-xxx (F25), geste de rang 0, se merge avant le comptage.
- **Migration, release-db** : non.
- **Décisions, textes** : une D-xxx du délai, après le comptage ; sa lettre se prend alors, cr si aucune ne couvre l'objet.
- **Critère de fin** : un nombre agrégé versé ; aucune carte avant le délai décidé.

#### H08 · Porte 4 : sources à fournir
- **Identifiant, piste** : porte 4 ; règle du milieu levée ; seuils de 8B sourcés par D-280 ; cockpit, alimentation, sommeil ; geste du responsable.
- **Rang** : 0 (porte de geste).
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune valeur dérivée par l'assistant (DC-01, DC-19) ; chaque source tient c (F59), am (H33), al (H57), cm (F51) et la décision de seuils_points (H40).
- **Critère de fin** : chaque source versée avec sa référence.

#### F46 · K-05a : ligne de l'extraction de biologie
- **Identifiant, piste** : K-05a avec D4 ; liste fermée des sites IA ; ingest.
- **Rang** : 0, geste ; K-05a n'est pas écrite.
- **Portes, préalables** : porte 26 (acquise) ; lève la porte 5.
- **Migration, release-db** : non.
- **Décisions, textes** : ligne de déclaration du site d'extraction, à écrire dans K-05a (D-256 A4, usage_ia v7 ; fournisseur ; périmètre du document).
- **Critère de fin** : liste fermée et déclaration mergées.
- **Mise à jour (2026-10-13)** : « document entier, identité comprise » se lit daté : D-284 §5 impose le retrait de l'identité du document avant l'envoi, lot (j) de H26 ; le G3 est clos (#1416), (j) est libre ; d'ici là le flux reste nominatif, exposition assumée et datée.
- **Mise à jour (2026-10-14)** : depuis le lot 2 du masquage (#1428), seules les pages masquées par le praticien partent, jamais le document d'origine ; `usage_ia` v8 le dit au patient (#1431) ; le masquage est manuel. Déploiement du lot 2 non consigné sur main [A verifier]. La ligne de K-05a reste à écrire, son périmètre par le responsable.

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

#### H11 · n : garde de dose resserrée
- **Identifiant, piste** : lettre n (D-n) ; garde de dose resserrée (EF-3b) ; sécurité ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non pour la lettre ; EF-3b porte la migration de J2-base, en tête du rang 4 par la hiérarchie h1.
- **Décisions, textes** : lettre n, de la main du responsable ; aucune valeur de dose proposée par l'assistant.
- **Critère de fin** : lettre mergée ; EF-3b servi dans J2-base, release-db constatée.

#### F45 · Date de naissance au dépôt et garde d'âge
- **Identifiant, piste** : lettres z, as, at ; J2-conf ; ingest.
- **Rang** : z au rang 0 ; at au rang 1 au plus tôt [Hypothese] ; J2-conf au rang 2 ; as au rang 10, place 6 de la file C.
- **Portes, préalables** : porte 18 pour as ; K-05a (F46) pour at ; porte 17.
- **Migration, release-db** : non pour J2-conf ; selon pour as.
- **Décisions, textes** : la transmission reste ouverte ; au dépôt, le patient est invité à saisir ou confirmer sa date ; rien de neuf pour un mineur avant le consentement. La date lue est une donnée d'identité : registre IA, nouvelle version de « L'IA dans Wellneuro », nouveau contrat d'extraction constaté sur un import réel. La garde sans saisie reste à trancher dans as.
- **Critère de fin** : garde jouée en banc sur fixtures, puis constat par identifiant ; rubrique « Cas des mineurs » renseignée (`docs/DOSSIER_RGPD.md:1274`).
- **Mise à jour (2026-10-13)** : D-283 §5 puis D-284 §3, §4 et §7 : seuil des mineurs à 18 ans, acquis ; un dossier sans date de naissance se voit demander sa date à la prochaine connexion, questionnaires et biologie en pause tant qu'elle manque (lot (h) de H26, qui remplace (d)) ; la fiche signalétique reste ouverte pour la saisir ; la lettre z garde son objet, son seuil est acquis. Rubrique « Cas des mineurs » : `docs/DOSSIER_RGPD.md:1307` sur 36f82cf1.
- **Mise à jour (2026-10-14)** : lot (h) codé (garde d'âge `lib/patient/gardeAge.ts`, étape date au portail, gardes serveur) ; la garde d'âge de z existe donc pour les surfaces en service ; as, at et J2-conf inchangés.

#### H12 · ac et J2-radar : radar sans zéro
- **Identifiant, piste** : lettre ac (M-6, D-ac, R:ac), puis J2-radar.
- **Rang** : ac au rang 0 ; J2-radar au rang 1.
- **Portes, préalables** : ac : aucun ; J2-radar : ac ; lève la porte 3.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ac, de la main du responsable.
- **Critère de fin** : « non mesuré » constaté à l'écran ; banc de `DetailBesoinsPanel.tsx:58`.

#### H13 · G-10, v, J2-bandes, J3-bandes : fidélité et bandes de bruit
- **Identifiant, piste** : G-10.
- **Rang** : G-10 au rang 0 ; v au rang 1 ; J2-bandes au rang 2 ; J3-bandes au rang 3.
- **Portes, préalables** : G-10 : aucun ; v : G-10 ; J2-bandes : v ; J3-bandes : J2-bandes, G-10 ; lève la porte 11.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre v, de la main du responsable ; une source test-retest par instrument, de la main du responsable ; publication dans BANDES_DE_BRUIT.
- **Critère de fin** : bandes publiées en banc ; un mot seulement là où la bande est signée.

#### F63 · Module BioFlow publié
- **Identifiant, piste** : lettre j (D2, règle de dépendance) ; J3-bioflow : un premier lecteur hors biologie ; socle.
- **Rang** : j au rang 0, J3-bioflow au rang 1.
- **Portes, préalables** : porte 12 ; effet de la NABM non tranché, ne retient pas la chaîne (question écartée le 2026-10-13).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre j ; un module publié exige un contrat, pas seulement un index consommé ; clauses CF-1, NF-1, NU-1, PF-0, DV-0 à nommer dans j.
- **Critère de fin** : garde de dépendance verte ; module lu par un premier lecteur hors biologie.

#### F38 · q et J2-med : aperçu médecin tracé, remise au patient
- **Identifiant, piste** : lettre q ; trackc.
- **Rang** : q au rang 0 ; J2-med au rang 1, ou 4 au plus tôt si la migration se confirme (règle).
- **Portes, préalables** : porte 27 ; si migration, G-7, porte 9, place dans G-6.
- **Migration, release-db** : selon [A verifier].
- **Décisions, textes** : lettre q ; « la signature ne qualifie rien », un envoi direct vers un tiers serait un déclencheur.
- **Critère de fin** : aperçu tracé au Fil ; remise journalisée.

#### F57 · Onglet « Biologie » de la fiche patient
- **Identifiant, piste** : lettre s ; socle.
- **Rang** : s au rang 0 ; code au rang 4 avec J2-base.
- **Portes, préalables** : porte 12 (D2 mergée) ; G-7 ; porte 9 ; porte 24 pour le palier 2.
- **Migration, release-db** : non pour l'onglet ; voir F58 pour le statut posé.
- **Décisions, textes** : lettre s, de la main du responsable, complétée par les arbitrages acquis (deux marques « validé »).
- **Critère de fin** : onglet constaté par le responsable ; écrans de biologie regroupés ; aucun statut calculé en banc.

#### F55 · BF-7 et BF-8 : code d'acte et courrier de remboursement
- **Identifiant, piste** : BF-7 (code d'acte ligne à ligne au courrier) et BF-8 (courrier de remboursement) ; panels.
- **Rang** : aa au rang 0 ; code au rang 4 avec J3-base.
- **Portes, préalables** : f et G-3 (porte 10) ; G-7 et porte 9 pour BF-8 ; porte 16 pour d'autres parts de J3-base.
- **Migration, release-db** : BF-8 oui, rang 4.
- **Décisions, textes** : lettre aa, de la main du responsable. Garde : un analyte signé hors du millésime courant affiche un libellé fixé par aa ; la liaison se relit avant.
- **Critère de fin** : courrier rendu sous la garde non prescriptive ; release-db constatée.
- **Mise à jour (2026-10-13)** : f et G-3 (porte 10), G-7 et la porte 9 s'appliquent à la part code (rang 4, avec J3-base), non à la lettre aa, qui n'a aucun préalable.

#### H14 · ab : EF-0, trancher Q3
- **Identifiant, piste** : lettre ab (D-ab) ; EF-0 : trancher Q3 ; cockpit ; geste du responsable.
- **Rang** : 0.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ab, de la main du responsable.
- **Critère de fin** : choix écrit, mergé ; EF-0 servi dans J3-base (H61).

#### H15 · w et J3-12b : guide des 12 besoins
- **Identifiant, piste** : lettre w (D-w, G-9), puis J3-12b ; cockpit ; geste du responsable (w), puis file A (J3-12b).
- **Rang** : w au rang 0 ; J3-12b au rang 1.
- **Portes, préalables** : w : le temps du responsable ; J3-12b : w.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre w, de la main du responsable.
- **Critère de fin** : guide signé ; onglet « Les 12 besoins » réorganisé et servi.

#### F54 · Liaisons NABM signées
- **Identifiant, piste** : S-7, M-3, f, G-3 ; panels.
- **Rang** : S-7 au rang 0, M-3 au 1, f au 2, G-3 au 3.
- **Portes, préalables** : porte 10 ; 0 liaison signée à ce jour (`docs/claude/campagnes/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:53`). Ne retient ni BP-07 ni BP-09 ; retient BF-7 et BF-8. Effet sur la publication du module : non tranché, ne retient pas la chaîne.
- **Migration, release-db** : non pour le code qui passe la carte ; véhicule d'écriture des liaisons à préciser (`docs/claude/campagnes/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:188-189`).
- **Décisions, textes** : lettre f ; « BF-3 désigne la façade A ; les correspondances NABM prennent un autre nom, sous D-f ».
- **Critère de fin** : 8 liaisons signées en base, puis la liste étendue ; une liaison signée sort de « non évalué » pour elle seule [A verifier].

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

#### F44 · Trace d'import conservée comme le dossier
- **Identifiant, piste** : lettre l ; ingest.
- **Rang** : texte au rang 0 ; code et textes au rang 1 proposé [Hypothese].
- **Portes, préalables** : porte 17 (durée du dossier fixée, geste) ; lettre l mergée (D-l au rang 0, une part de la porte 13). La porte 13 entière (D-u, G-8) n'est pas requise.
- **Migration, release-db** : non a priori [Hypothese].
- **Décisions, textes** : lettre l, une seule durée, celle du dossier ; deux circuits distincts : le compte rendu transmis reste sous D-258, la collecte documentaire suit la durée du dossier, sans IA ; rubrique 8 du registre ; « Vos données personnelles » mis à jour ; elle absorbe la D-xxx de la collecte documentaire.
- **Critère de fin** : rubrique 8 sans trou pour ces tables ; texte servi et constaté.
- **Mise à jour (2026-10-13)** : D-283 §2 tranche la trace d'import : les lignes validées suivent le dossier ; les lignes écartées ou jamais décidées s'effacent 30 jours après le dépôt, comme le document ; les travaux de la file durable, à 30 jours. Porte 17 levée par D-283 ; le point de départ de l'archive reste à valider par un conseil. Le texte de rang 0 devient le texte patient des durées (D-283 §10 a) ; le code devient la purge à 30 jours des lignes non validées (D-283 §10 c). Voir H26.

#### F76 · « Reprendre cette charge » sur un brouillon gonflé
- **Identifiant, piste** : reste de BP-25 (D-273 ; `docs/claude/SESSION_LOG.md:9677-9678`) ; parcours.
- **Rang** : comportement voulu écrit par le responsable au rang 0 proposé [Hypothese], geste ; correctif au rang 1 proposé [Hypothese], file B.
- **Portes, préalables** : le texte du responsable du comportement voulu, dans la fiche du correctif (porte 28).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx si le correctif ne change pas D-273 ; sinon une D-xxx et son fragment. D-273 « quatre termes » inchangée (F14).
- **Critère de fin** : banc « actions vierges supprimées » vert selon le texte du responsable ; aucune version enregistrée touchée.

#### F25 · Effectif de masquage des agrégats
- **Identifiant, piste** : constante de D-266 §14 ; parcours.
- **Rang** : D-xxx propre au rang 0 proposé [Hypothese], sans attendre la doctrine de d (rang 1) ; y au rang 3.
- **Portes, préalables** : aucun ; due avant tout constat sur plusieurs dossiers et avant BP-21a.
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx de l'effectif, reprise du texte de d et y ; l'écart « cinq cycles » contre « cinq dossiers » se règle dans ce texte.
- **Critère de fin** : D-xxx mergée ; comptes masqués sous cinq en banc.

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

#### F60 · Série par analyte : commentaires du laboratoire, deux unités
- **Identifiant, piste** : commentaires du laboratoire aussi sous la série ; socle.
- **Rang** : 4 avec BP-03 (F15) pour les commentaires ; 5 proposé [Hypothese] pour les deux unités ; lecture des écarts d'unité avec le responsable, geste au rang 0 proposé [Hypothese].
- **Portes, préalables** : BP-03 ; D-157.
- **Migration, release-db** : non.
- **Décisions, textes** : dans s ; les écarts d'unité textuels du constat d'usage se lisent avec le responsable hors agrégats, avant le code de la série (rang 4).
- **Critère de fin** : commentaire sous la valeur concernée ; aucun calcul.

#### F67 · Amendement de D-276 : cinq déclencheurs
- **Identifiant, piste** : lettre ci : les cinq déclencheurs de la qualification (amendement de D-276 §1) ; trust.
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
| aq | contrôle bloquant des modifications cliniques en CI | A | 28 | non | H21 |
| ar | montée de version datée des briques | A | 28 | non | H22 |
| E56 | contrôle de clôture contre l'auto-merge | A | 27 | non | H23 |
| af | référence de fiche conseil sur l'action | A | 28 | non | H24 |
| ag | rédaction assistée des zones du protocole | A | 5, 28 | non | H25 |
| D-281, étape 3 | portail et pause, hors file C | A | 9 (fait) | non | F66 |
| D-284 (g) écran, (h), (i) | NIR retiré de la fiche patient ; date de naissance demandée à la connexion, questionnaires et biologie en pause tant qu'elle manque ; validation par un titulaire de l'autorité parentale, désaccord connu = manuel (2026-10-14 : (g) écran livré, #1434 ; (h) livré, #1437 ; (i) fondu dans J3-mineurs, H79, #1439) | A | aucune ; (i) avec G-11 (H38) | non | H26 |
| BP-07 | dossier de preuve remis à la curation signée (clos le 2026-10-14, #1438) | B | 2, 27 | non | F02 |
| PR 2 de l'audit | vue dédoublonnée par analyte | B | aucune | non | F50 |
| J2-med | aperçu médecin tracé au Fil | B | 27 ; 9 si migration | selon | F38, rang 0 |
| J3-bioflow | premier lecteur hors biologie du module | B | 12 | non | F63, rang 0 |
| correctif de la charge | « Reprendre cette charge » ne fige plus | B | 28 | non | F76, rang 0 |
| trace d'import, code | empreinte, lectures, décisions ; purge à 30 jours (D-283 §10 c) | B | 17, 13 | non | F44, rang 0 |
| D-284 (j) | identité retirée du document avant l'envoi à Anthropic ; analyse d'impact du transfert (code mergé : #1426, #1428, #1431 ; analyse d'impact non versée, F47) | B | aucune ; G3 clos (#1416) | oui (#1426), release-db non consignée [A verifier] | H26 |
| G-7 | essai de restauration réussi | geste | lève 8 | non | F04, rang 0 |
| v | bandes de bruit par instrument | geste | 11 | non | H13, rang 0 |
| M-3 | signature des 8 liaisons NABM | geste | 10 | non | F54, rang 0 |
| c | cockpit chiffré : provenance, formule, nature | geste | 4 | non | F59 |
| aw | familles du bilan hiérarchisé | geste | aucune | non | F34 |
| az, texte | notice patient du bilan | geste | aucune | non | F37 |
| at | date de naissance lue par l'extraction | geste | 5 | non | F45, rang 0 |
| cm | axes biologiques, liste fermée | geste | aucune | non | F51 |
| D-283 (a), (e), (f) | texte des durées ; phrase au médecin ; procédure des droits ((f) faite le 2026-10-14, G-8) | geste | aucune | non | H26 |
| LOT-02 du sommeil | re-mesure ; sa clôture lève la porte 16 | geste | lève 16 | non | H27 |
| r | droits d'usage des instruments servis | geste | 1 | non | H28 |
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

#### F66 · Chaîne D-281 : SAF-EI-01 amendée, signée en fin de chantier
- **Identifiant, piste** : DC-42 (`docs/DECISIONS.md:84-86` sur main) ; trust.
- **Rang** : étape 2 (migration) mergée le 2026-10-13 (#1408) ; sa release-db au rang 0, faite : approuvée et constatée en production le 2026-10-13. Acquis : étape 3 (portail et pause) au rang 1 ; étape 4 (validation, banc de cas fictifs refait) au rang 2 ; étape 5 : signature M-1 au rang 3, commit de signature et déploiement constaté (J1-sécu) au rang 4, qui lève la porte 7. Le formulaire s'ouvre hors de la file C, seul ouvert à ce moment, constaté avant l'ouverture suivante ; places 1 à 5 de la file C intactes.
- **Portes, préalables** : D-281 mergée (#1406) ; #1408 mergée ; S-1 pour la part effets indésirables, faite. L'étape 3 s'ouvre hors de la file C, seule, constatée avant l'ouverture suivante ; places 1 à 5 jamais permutées et aucune insertion avant les places 2 à 5 respectées. Lève la porte 7. #1408 a mergé sans essai de restauration, sous la lecture de la porte 8 ; D-g reste à trancher (F04).
- **Migration, release-db** : oui (étape 2), mergée (#1408) ; release-db approuvée et constatée (lecture de production du 2026-10-13 par conteneur one-off, `prisma migrate status` : 104 migrations, schéma à jour, la dernière étant celle du lot 2) ; elle est passée avant celle de BP-09 ; plus aucune migration en vol.
- **Décisions, textes** : textes de la pause signés le 2026-10-12 (`docs/DECISIONS.md:62`) ; signature des quatre champs, nouvelle version, sourceReference « DC-42 ; D-281 » ; lettre e. Écarté : signer la règle livrée comme filet (`docs/DECISIONS.md:85-95`). Le banc local non suivi vise la règle livrée : caduc, à ne pas compter.
- **Critère de fin** : release-db de #1408 constatée (fait, 2026-10-13) ; signature posée, déploiement constaté ; d'ici là, capture et notification seulement.
- **Mise à jour (2026-10-13)** : D-281 est au registre (#1406, lot 1 ; #1408, lot 2, migration appliquée). Question du lot 3 tranchée par le responsable le 2026-10-14 : toute orientation vers le médecin et toute prise de sang sont exclues de la liste proposée au patient (D-281 §2).

**File B**

#### F02 · BP-07 : dossier de preuve remis à la curation signée
- **Identifiant, piste** : BP-07 (LOT-07 de BIO-PARCOURS) ; parcours.
- **Rang** : 1 ; la signature du responsable M-5 (1/2) au rang 2.
- **Portes, préalables** : lettre a mergée (porte 2) ; porte 27 à la PR ; contre-revue P0.
- **Migration, release-db** : non (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:117`).
- **Décisions, textes** : aucune D-xxx propre (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:376`) ; signature claim par claim, de la main du responsable.
- **Critère de fin** : dossier remis, les signatures du responsable posées ; aucun texte clinique au dépôt.
- **Mise à jour (2026-10-14)** : BP-07 clos (LOT-07 terminé, #1438). Dossier de preuve remis hors dépôt (#1432) ; sources WN-SRC-0508 à 0511 au registre du corpus, notices titre seul (#1433, #1436) ; positions d'expert P1 à P8 signées au dossier privé, aucun texte, seuil ni délai au dépôt (#1435) ; signatures du responsable posées dans le lot, donc M-5 (1/2), prévue au rang 2, est faite. Aucun code, aucune migration ; campagne repassée en pause, sans lot courant. Suite au plan : BP-12b (F09, positions versionnées) et BP-17 (F11).

#### F50 · Vue dédoublonnée par analyte
- **Identifiant, piste** : PR 2 ; une ligne par analyte avec ses panels et règles ; courrier et document patient inchangés ; panels.
- **Rang** : 1 proposé [Hypothese], après cj.
- **Portes, préalables** : cj ; bancs de BP-01 (faits).
- **Migration, release-db** : non (code seul).
- **Décisions, textes** : aucune clinique ; aucune règle ni seuil changé (`docs/claude/campagnes/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:179-181`).
- **Critère de fin** : banc « un analyte cité par trois panels donne une ligne et trois justifications » ; empreinte du chemin documentaire inchangée ; T2.

**Gestes du responsable**

#### F59 · Cockpit chiffré
- **Identifiant, piste** : lettre c ; provenance, formule versionnée, nature ; qualifier exige un seuil signé ; socle.
- **Rang** : c au rang 1, signature M-2 au rang 2 (porte 6), J1-cockpit au rang 3.
- **Portes, préalables** : S-2 ; porte 4 (source du poids égal, non levée).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre c ; doctrine signée de la main du responsable.
- **Critère de fin** : chaque chiffre avec source, date, nature, tenu par banc.

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

#### H26 · Lots de D-283 : durées, droits, information du médecin
- **Identifiant, piste** : lots du §10 de D-283 (mergée, #1411) et du §7 de D-284 (mergée, #1413) : (a) texte patient des durées, nouvelle version de « Vos données personnelles », accusé exigé.
- **Rang** : (a), (e), (f), (g) écran, (h) au rang 1 [Hypothese] ; (i) fondu dans J3-mineurs (H79, rang 10 ; arbitrage du 2026-10-14) ; (b) et la migration de retrait (g) au rang 4 au plus tôt [Hypothese] (migration) ; (c) avec le code de la trace d'import (F44, rang 1) [Hypothese] ; (d) remplacée par (h) (D-284 §7) ; (j) au rang 1 [Hypothese] : le G3 est clos (#1416, D-282 §8), seule l'analyse d'impact de la main du responsable le précède. (h) précède l'ouverture de toute surface neuve : J1-sécu (rang 4, F66), le formulaire de D-281 comptant comme surface neuve [Hypothese], et chaque place de la file C (rang 5 et après) ; les surfaces déjà en service restent ouvertes ; une surface neuve codée au rang 1 ou 2 (J2-alim, H45) ne s'ouvre à un dossier mineur ou sans date qu'après (h) constatée.
- **Portes, préalables** : D-283 et D-284 mergées (rang 0, fait) ; (b) : point de départ de l'archive validé par un conseil avant toute mise en œuvre (D-283 §2 ; porte 28, H09), G-7, porte 9 ; (g) migration : G-7, porte 9 ; (i) : avec G-11 (H38) ; (j) : G3 clos (fait, #1416) ; registre avant chaque table (F70).
- **Migration, release-db** : (b) oui ; (g) oui, retrait de colonne ; (c) selon F44 ; les autres non.
- **Décisions, textes** : aucune décision neuve (« sans arbitrage neuf », D-283 §10 ; D-284 §7) ; textes (a) et (e) proposés par l'assistant et signés par le responsable ; textes patient (h) et (i) sous G-11 (H38) ; analyse d'impact du transfert (j) de la main du responsable, archivée avec la copie datée (F47).
- **Critère de fin** : chaque lot livré et constaté ; rien ne s'efface sur la règle de l'archive avant la réponse du conseil ; (g) : champ absent de la fiche patient, puis colonne retirée, 0 NIR constaté (D-284 §3) ; (h) : date demandée à la connexion, pause constatée sur un dossier de test ; (i) : validation d'un titulaire constatée ; (j) : identité absente du document envoyé, constaté sur un import.
- **Mise à jour (2026-10-14)** : (g) écran livré : champ retiré de la fiche, de la route et de l'export, `donnees_confidentialite` v16 avec accusé (pour ne pas effacer celui de la v15, accusée par aucun dossier actif) ; 0 NIR au constat du même jour ; reste la migration de retrait de la colonne (rang 4). Suite : (h), pause limitée aux questionnaires (agendas compris) et à la biologie (arbitrage du 2026-10-14).
- **Mise à jour (2026-10-14, suite)** : (g) déployé et constaté (#1434 : v16 dans l'image, champ absent, 0 NIR). (h) livré dans sa PR : date demandée au portail après « Avant de commencer », confirmée, jamais écrasée ; pause tenue par les routes (questionnaires, anamnèse, agendas, dépôt biologique) ; mineur en pause jusqu'à (i) ; `donnees_confidentialite` v17 avec accusé. Critère de fin restant : pause constatée sur un dossier de test.
- **Mise à jour (2026-10-14, clôture de (h))** : (h) mergé (#1437) et déployé (90743acf) ; constaté dans l'image (v17, refus `date_naissance_requise` et `circuit_mineur_requis`, route de saisie) ; parcours essayé au portail par le responsable ; au constat par conteneur, aucune date encore enregistrée par le portail (31 dossiers ouverts, 15 sans date, 0 mineur). Import et lecture de biologie par le praticien restent ouverts pour un dossier sans date ou mineur (arbitrage du 2026-10-14). (i) fondu dans J3-mineurs (H79, rang 10), avec le consentement complet ; d'ici là, un mineur reste en pause et se traite à la main (arbitrage du 2026-10-14). Textes de G-11 (H38) : premier jet à proposer par l'assistant (non commencé), puis à corriger et valider par le responsable (arbitrage du 2026-10-14).
- **Mise à jour (2026-10-14, (j))** : trois lots de (j) mergés : migration `bio_ingest_masquage_identite_v1` (#1426) ; écran de masquage et lecture des seules pages masquées, `bio-extraction-v5`, sans repli sur le document (#1428) ; `usage_ia` v8 et `donnees_confidentialite` v15 (#1431), cette dernière remplacée depuis par v16 (#1434) puis v17 (#1437). Le code a mergé avant l'analyse d'impact que la ligne « Rang » plaçait avant (j) [A verifier]. Restent : l'analyse d'impact (F47) ; la release-db du lot 1 et le déploiement du lot 2, non consignés sur main [A verifier] ; le critère « identité absente du document envoyé, constaté sur un import » (premier masquage réel puis import v5, par conteneur, sur un dossier de test, par identifiant). Les textes de G-11 sont acceptés depuis (H38, #1441).

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

#### H31 · t : point d'étape, rappel nommé, invitation lue au portail
- **Identifiant, piste** : lettre t (D-t, R:t, T-1, RK-2) ; protocole ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : S-1, nature du rappel (H06).
- **Migration, release-db** : non.
- **Décisions, textes** : lettre t, de la main du responsable.
- **Critère de fin** : lettre mergée ; PA-1, PA-2 servis dans J3-base (H61) ; baseline visuelle verte.

#### H32 · d : doctrine d'adhésion
- **Identifiant, piste** : lettre d (D-d, R:d) ; K-02 servi = premier check-in ; échelle E4 (choix à trancher) ; l'effectif de masquage a sa propre fiche (F25) ; cockpit ; geste du responsable.
- **Rang** : 1.
- **Portes, préalables** : S-2 (H01) ; règle du milieu levée.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre d, de la main du responsable ; trancher le choix d'échelle d'E4.
- **Critère de fin** : doctrine mergée ; signature M-2 au rang 2 (F59), qui lève la porte 6.

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
| BP-09 | annulation d'un résultat, ajout seul (fiche du lot validée le 2026-10-14, #1442) | B | 28 ; 9 | oui | F03 |
| fiche LOT-25 | « quatre termes », cases corrigées | B | aucune | non | F14 |
| J2-conf | garde d'âge ; registre des droits | B | aucune | non | F45, rang 0 |
| F50, étape courrier | courrier regroupé par analyte | B | aucune | non | F50, rang 1 |
| bb | lecture des trois plans par le patient | C | 18 | non | H49 |
| M-5 (1/2) | signatures de BP-07 (posées dans le lot, #1435, #1438) | geste | 23 | non | F02, rang 1 |
| f | NABM : 8 liaisons, puis liste étendue | geste | 10 | non | F54, rang 0 |
| M-2 | signature de la doctrine du cockpit (porte 6) | geste | lève 6 | non | F59, rang 1 |
| G-8 | préalables communs prêts, rien d'activé ; fait le 2026-10-14 | geste | 13 | non | H50 |
| ai | accusé de lecture daté de « Mes échanges » | geste | lève 14 ; 9 si migration | selon | H51 |

**File A**

#### H43 · J1-base : la suite cosmétique
- **Identifiant, piste** : J1-base ; 5A et 8B livrés, retirés ; cockpit ; file A.
- **Rang** : 2.
- **Portes, préalables** : S-5 (F02) ; a (F01) ; S-4 (H02) ; N-6, une fenêtre sans PR biologie sur le Fil.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : instantanés régénérés ; écrans constatés.

#### H44 · R:Titre du Fil
- **Identifiant, piste** : R:Titre du Fil ; « Questionnaires à consulter » au-dessus du Fil ; cockpit ; file A.
- **Rang** : 2.
- **Portes, préalables** : S-4 (H02) ; N-6 ; même PR que le retrait d'« Héritage 4.0 » (L4, H43).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune.
- **Critère de fin** : titre servi.

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
- **Portes, préalables** : S-1 reste un constat, non une porte pour ce lot : la condition « premier import » sort des préalables ; S-5 ; fiche BP-09 écrite avant ouverture, fichiers listés (porte 28) ; release-db de D-281 constatée (une migration en vol).
- **Migration, release-db** : oui ; première migration de biologie ; sa release-db suit celle de D-281, mergée le 2026-10-13 (#1408) : ce fait amende « BP-09 d'abord » de G-6.
- **Décisions, textes** : D-xxx du lot amendant D-124 §3 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:375`) ; elle dit que la condition « premier import » sort des préalables.
- **Critère de fin** : release-db constatée par conteneur ; résultat annulé exclu des élections, séries et réveils ; puis code consommateur.
- **Mise à jour (2026-10-14)** : fiche du lot écrite, fichiers listés, validée par le responsable (`lots/LOT-09-annulation-resultat.md`, #1442) : préalable « fiche BP-09 » de la porte 28 tenu. Le lot part en deux PR, migration seule puis code. Aucune migration ni aucun code au 2026-10-14 : le lot reste à faire, release-db au rang 3 (porte 9).

#### F14 · Fiche LOT-25 : « quatre termes »
- **Identifiant, piste** : correction de la fiche LOT-25 de BIO-PARCOURS ; parcours.
- **Rang** : 2 proposé [Hypothese], file B, avec J1-base.
- **Portes, préalables** : aucun.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx ; D-273 inchangée.
- **Critère de fin** : fiche corrigée, cases cochées, T1 vert.

**File C**

#### H49 · bb : lecture des trois plans par le patient
- **Identifiant, piste** : lettre bb ; protocole ; geste du responsable (intitulés), puis file C.
- **Rang** : 2 au plus tôt [Hypothese], par ses préalables ; une ouverture, servie au-delà de la place 11, dans l'ordre de préparation après l'encart.
- **Portes, préalables** : ba (H35) ; texte patient accepté ; porte 18.
- **Migration, release-db** : non [A verifier].
- **Décisions, textes** : lettre bb ; intitulés des trois plans, de la main du responsable.
- **Critère de fin** : texte accepté ; activation constatée sur un vrai dossier.

**Gestes du responsable**

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
- **Rang** : 2 ; code au rang 4 au plus tôt si la migration se confirme.
- **Portes, préalables** : u (H37) ; k (F77) ; texte patient ; si migration : G-7, porte 9.
- **Migration, release-db** : probable [A verifier].
- **Décisions, textes** : lettre ai, de la main du responsable ; sa D-xxx avant la place 3 ; lève la porte 14.
- **Critère de fin** : décision mergée ; lecture datée constatée côté praticien.

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
| M-5 (2/2) | release-db de BP-09 approuvée, constatée | geste | 9 | oui | F03, rang 2 |
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

**Gestes du responsable**

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
- **Décisions, textes** : lettre y, de la main du responsable ; « cinq dossiers » ou « cinq cycles » se règle dans F25.
- **Critère de fin** : page masquée en banc sous cinq.

### Rang 4 : première vague de migrations après BP-09

L'ordre des release-db de ce rang suit la hiérarchie : EF-3b (h1), puis BP-12a, BP-11, BP-13, BP-15, CC-8, axes [Hypothese], BF-8, la collecte, D-283 (b) [Hypothese], le retrait de la colonne NIR (D-284 lot g) [Hypothese], selon les cas J2-med et le statut posé ; une à la fois, sentinelle, constat par conteneur, déploiement constaté avant le merge suivant. La file du G3 (D-282 lot 2) est passée le 2026-10-13 (#1412), avant BP-09 et avant l'essai, par le fait.

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
| ai, code | lecture datée, si migration | A | 8, 9 | selon | H51, rang 2 |
| D-284 (g) migration | retrait de la colonne NIR (0 NIR enregistré, D-284 §3) | A | 8, 9 | oui | H26, rang 1 |
| BP-12a | fiches d'usage | B | 8, 9, 23 | oui | F05 |
| BP-11 | constats du praticien | B | 8, 9 | oui | F06 |
| BP-13 | données physiologiques, traitements en cours | B | 8, 9 | oui | F07 |
| BP-15 | décisions de parcours | B | 8, 9 | oui | F08 |
| BP-03 | série par analyte | B | aucune | non | F15 |
| BP-04 | attente typée, analyteCodes sur l'exploration | B | aucune | non | F16 |
| axes, PR 3 | référentiel d'axes : migration | B | 8, 9 | oui | F52 |
| statut posé | statut posé et deux marques datées | B | 9 si migration | selon | F58 |
| BF-7, BF-8 | code d'acte et courrier de remboursement | B | 10, 8, 9 | oui (BF-8) | F55, rang 0 |
| onglet Biologie | BF-1, BF-3 façade A, avec J2-base | B | 12, 9, 24 | non | F57, rang 0 |
| commentaires | commentaires du laboratoire sous la série | B | aucune | non | F60, rang 0 |
| J2-med, si migration | aperçu médecin, version avec migration | B | 8, 9 | selon | F38, rang 0 |

**File A**

#### H59 · J2-base, part hors biologie : le palier 1
- **Identifiant, piste** : J2-base, part hors biologie ; BF-1, BF-3 et l'onglet Biologie sont F57 ; plateforme, cockpit ; file A.
- **Rang** : 4.
- **Portes, préalables** : j (F63), g (F04), k (F77), l (D-283), m (H10), n (H11), s (F57) ; G-7 (porte 8) ; porte 9 (BP-09 constaté, F03) ; J1-cockpit pour CC-0 (F59) ; f pour BF-3 (F54) ; porte 21 pour OF-2 ; porte 16 pour sommeil et hex [A verifier].
- **Migration, release-db** : 1 migration (EF-3b), en tête du rang 4 par la hiérarchie h1.
- **Décisions, textes** : lettres j, m, n, g appliquées.
- **Critère de fin** : palier 1 sorti (porte 24) ; release-db d'EF-3b constatée.

#### H60 · p et J2-cc8 : journal de lecture du protocole
- **Identifiant, piste** : lettre p (D-p), puis J2-cc8 ; journal de lecture du protocole (CC-8) ; amende le CHECK `portail_lectures_patient` ; protocole ; file A.
- **Rang** : 4.
- **Portes, préalables** : G-7 (porte 8) ; porte 9 (BP-09 constaté).
- **Migration, release-db** : oui, 1 ; au rang 4 de l'ordre des release-db, après EF-3b et BP-12a par la hiérarchie.
- **Décisions, textes** : lettre p, registre.
- **Critère de fin** : release-db constatée ; lecture tracée, constatée en conteneur.

#### H61 · J3-base, part hors biologie
- **Identifiant, piste** : J3-base, part hors biologie ; BF-7 et BF-8 sont F55 ; protocole, cockpit, sommeil ; file A.
- **Rang** : 4.
- **Portes, préalables** : t (H31) ; ab (H14) ; u (H37) ; porte 16 (H27) ; règle N-8.
- **Migration, release-db** : selon ; la migration du lot est BF-8 (F55).
- **Décisions, textes** : lettres t, ab, u appliquées ; décision de produit pour la frise.
- **Critère de fin** : « Mes échanges » prêt, non ouvert ; frise et repères servis après la porte 16.

#### H62 · J3-collecte : collecte documentaire
- **Identifiant, piste** : J3-collecte (RK-8) ; D-258 reste à la biologie ; confiance ; file A.
- **Rang** : 4.
- **Portes, préalables** : l (D-283) ; u (H37) ; G-11 (H38) ; G-7 ; porte 9 (BP-09 constaté).
- **Migration, release-db** : oui, 1 ; après CC-8 et BF-8 par la hiérarchie.
- **Décisions, textes** : texte de collecte, de la main du responsable.
- **Critère de fin** : release-db constatée ; dépôt prêt, non ouvert.

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

**File B**

#### F05 · BP-12a : fiches d'usage
- **Identifiant, piste** : BP-12a ; parcours.
- **Rang** : 4 (J2-bio).
- **Portes, préalables** : signatures de BP-07 ; G-7 (porte 8) ; BP-09 constaté (porte 9) ; contenus signés dans le lot (porte 23).
- **Migration, release-db** : oui ; rang 4, premier de la chaîne après BP-09.
- **Décisions, textes** : D-xxx du lot étendant D-251, garde « aucune phrase », population par usage (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:377`) ; constante « fiches validées par séance » chiffrée si le lot la lit [Hypothese] (`docs/DECISIONS.md:1629-1636`).
- **Critère de fin** : release-db constatée ; validation par acte daté ; hook DC-17 étendu à la structure.

#### F06 · BP-11 : constats du praticien
- **Identifiant, piste** : BP-11 ; parcours.
- **Rang** : 4 (J2-bio).
- **Portes, préalables** : BP-09, BP-12a (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:126`) ; portes 8 et 9.
- **Migration, release-db** : oui ; rang 4, après BP-12a.
- **Décisions, textes** : D-xxx d'objet ; D-122 précisée ; registre RGPD avant la table (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:388`).
- **Critère de fin** : release-db constatée ; contrat négatif ; correction ou annulation rend « à relire ».

#### F07 · BP-13 : données physiologiques, traitements et compléments en cours
- **Identifiant, piste** : BP-13 ; à partir de la saisie existante ; parcours.
- **Rang** : 4.
- **Portes, préalables** : BP-00 (fait) ; portes 8 et 9 ; porte DC-44 et DC-48 (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:379`).
- **Migration, release-db** : oui ; rang 4, avant BP-18a dans l'ordre des release-db ; préalable de J3-bio (§5) ; la table de la campagne ne l'imposait pas, seul l'ordre des release-db le faisait.
- **Décisions, textes** : D-xxx des critères et du modèle ; registre RGPD et texte patient avant la table.
- **Critère de fin** : release-db constatée ; « inconnu » explicite ; effacement testé.

#### F08 · BP-15 : décisions de parcours
- **Identifiant, piste** : BP-15 ; parcours.
- **Rang** : 4.
- **Portes, préalables** : BP-00 (fait) ; portes 8 et 9 ; DC-40 et DC-48.
- **Migration, release-db** : oui ; rang 4, avant BP-18a ; préalable de J3-bio. Hors BioFlow, R:ak et R:FC-5 (2/2) supposent la décision du 21e jour qu'il persiste.
- **Décisions, textes** : D-xxx de véhicule ; D-255 précisée (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:390`).
- **Critère de fin** : release-db constatée ; contrat négatif ; bancs du jour 0 et des quatre empreintes.

#### F15 · BP-03 : série par analyte
- **Identifiant, piste** : BP-03 ; parcours.
- **Rang** : 4 proposé [Hypothese] (BP-09 constaté au rang 3).
- **Portes, préalables** : BP-01 (fait), BP-09 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:122`).
- **Migration, release-db** : non.
- **Décisions, textes** : aucune D-xxx propre (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:381` ne porte qu'une dépendance).
- **Critère de fin** : série sur les trois fixtures ; aucun delta ; intervalle verbatim de chaque laboratoire, sans conversion (D-157).

#### F16 · BP-04 : attente typée, analyteCodes sur l'exploration (étape 5 de l'audit)
- **Identifiant, piste** : BP-04 ; absorbe CB-07 ; parcours et panels.
- **Rang** : 4 proposé [Hypothese]. Écart avec une lecture antérieure, qui le gèle avec la piste C jusqu'à l'ouverture de ax : BP-16, donc BP-20 et BP-21a, l'attendent (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:127`, :129, :136), et le gel bloquerait l'ouverture de l'outil (§4, écarts).
- **Portes, préalables** : BP-01 (fait), BP-09 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:123`).
- **Migration, release-db** : non ; contrat versionné, lecteur tolérant avant l'écrivain.
- **Décisions, textes** : D-xxx de contrat (D-142) ; D-190 §5 amendée plus tard par BP-18a (`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:382`). BiologyCatalogRef, non livré, se reprend ici sur le patron assertFoodCompassActionRef, non sur celui de SupplementCatalogRef (`docs/claude/campagnes/FILE_ATTENTE.md:80`).
- **Critère de fin** : bancs d'empreinte V4 et C4 ; attente ancienne lue « non typée ».

#### F52 · Référentiel d'axes : migration
- **Identifiant, piste** : PR 3 ; panels.
- **Rang** : 4 proposé [Hypothese].
- **Portes, préalables** : cm ; G-7 ; BP-09 constaté ; portes 8 et 9.
- **Migration, release-db** : oui, seule dans sa PR ; rang 4, après la chaîne BP du même rang.
- **Décisions, textes** : celle de cm ; passe Codex.
- **Critère de fin** : migration constatée, 0 lien ; contrat SQL négatif (axe inconnu, lien sans claim refusés) ; T3.

#### F58 · Statut posé et deux marques datées
- **Identifiant, piste** : le mot du responsable près de la valeur, daté, à l'écran du responsable seul, jamais calculé ; socle.
- **Rang** : 4, avec F57.
- **Portes, préalables** : lettre s ; si migration, G-7 et porte 9.
- **Migration, release-db** : selon le stockage du statut posé [A verifier].
- **Décisions, textes** : dans s ; rien au portail.
- **Critère de fin** : statut posé, daté, relu en banc ; deux marques distinctes affichées.

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
- **Identifiant, piste** : étape 3 de l'audit, second temps : « migration seule, puis code : liens analyte ↔ axe signés, claim par claim » (`docs/claude/campagnes/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:181-182`) ; panels.
- **Rang** : 5 proposé [Hypothese], après F52 (rang 4).
- **Portes, préalables** : cm (F51) ; F52 constatée ; curation claim par claim de la main du responsable ; aucun lien sans claim.
- **Migration, release-db** : selon le véhicule d'écriture ; une écriture en base de production passe par migration relue et release-db (D-087) [A verifier : véhicule], porte 9.
- **Décisions, textes** : les signatures du responsable, lien par lien ; aucune règle ni borne sans provenance certifiée.
- **Critère de fin** : liens signés en base, constatés par conteneur ; contrat SQL « lien sans claim refusé » vert.

**File C**

#### H70 · ACT-1 : place 1, CGU à accuser
- **Identifiant, piste** : ACT-1 (J2-act) ; CGU à accuser, puis constat ; lecture du protocole journalisée ; jamais un chiffre ; confiance ; file C, place 1.
- **Rang** : 5.
- **Portes, préalables** : k (F77) ; l (D-283) ; J2-base (H59) ; J2-cc8 (H60) ; G-8 (H50) ; porte 18.
- **Migration, release-db** : non.
- **Décisions, textes** : aucune neuve.
- **Critère de fin** : accusé constaté sur un premier vrai dossier servi, sans anomalie, par identifiant en conteneur.

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

**Gestes du responsable**

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
- **Portes, préalables** : ACT-1 constaté (porte 18, H70) ; t le classe hors relance, sinon il sort de la file ; J3-base (H61).
- **Migration, release-db** : non.
- **Décisions, textes** : texte de l'e-mail relu, de la main du responsable.
- **Critère de fin** : e-mail constaté sur un premier vrai dossier servi.

**Gestes du responsable**

#### F53 · Indications v2 par axe
- **Identifiant, piste** : re-signature d'indicationsBiologieV1 en v2 ; panels.
- **Rang** : 6 proposé [Hypothese], après les liens signés (F79, rang 5).
- **Portes, préalables** : F52 ; liens analyte-axe signés avec claim (F79) ; aw (F34).
- **Migration, release-db** : selon le véhicule du passage « inactif » (`docs/claude/campagnes/AUDIT_PANELS_BIOLOGIE_2026-10-05.md:183-185`).
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

#### F23 · BP-21b : ouverture du protocole personnalisé
- **Identifiant, piste** : BP-21b (LOT-30 de BIO-PARCOURS, à ne pas confondre avec la porte 30) ; même régime que BP-21a ; parcours.
- **Rang** : 8 proposé [Hypothese] ; une place dans la file C, non numérotée.
- **Portes, préalables** : BP-21a, BP-18b, BP-24 (`docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md:137`) ; porte 18. La fiche compléments R:ao (F78) l'attend, ou attend BP-18a et BP-18b (écart non tranché, F78).
- **Migration, release-db** : non.
- **Décisions, textes** : D-xxx d'ouverture, critères écrits avant.
- **Critère de fin** : critères atteints ; activation constatée avant la suivante.

**Gestes du responsable**

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
| as | place 6 : fiche signalétique, date de naissance | C | 18 | selon | F45, rang 0 |
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

**File C**

#### H80 · R:ak : place 7, invitation d'autoévaluation au 21e jour
- **Identifiant, piste** : lettre ak ; portail sans chiffre ; protocole ; file C, place 7.
- **Rang** : 10 ; place 7, déduite de « places 7 à 11 dans l'ordre proposé ».
- **Portes, préalables** : k (F77) ; t (H31) ; texte patient ; porte 18, après la place 6.
- **Migration, release-db** : non.
- **Décisions, textes** : lettre ak, de la main du responsable ; deux messages, deux places, aucune fusion avec la place 9.
- **Critère de fin** : activation constatée sur un vrai dossier.

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
- **Migration, release-db** : [A verifier].
- **Décisions, textes** : lettre ap et sa D-xxx, de la main du responsable.
- **Critère de fin** : activation constatée.

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
| 1 | CGU unique | H70 | k, l (D-283), J2-base, J2-cc8 | CGU ; lecture datée si elle la porte | 5 |
| 2 | E-mail neutre à la diffusion | H75 | t le classe hors relance, sinon il sort de la file ; J3-base | texte de l'e-mail relu | 6 |
| 3 | « Mes échanges » en lecture | H76 | u, ai, J3-base ; durée de D-283 §2 | encart d'urgence étendu ; lecture datée | 7 |
| 4 | Dépôt de documents | H77 | porte 17 (levée), registre, J3-collecte, J2-conf | texte de collecte (G-11, accepté le 2026-10-14, #1441) | 8 |
| 5 | Textes des mineurs | H78 | z, J2-conf | textes des mineurs (G-11, acceptés le 2026-10-14, #1441) ; constat par lecture consignée | 9 |
| 6 | Fiche signalétique (date de naissance, invitation au dépôt) | F45 | z, k, texte accusé ; seule surface neuve permise à un dossier sans date (D-283 §5) | texte patient | 10 |
| 7 | Invitation d'autoévaluation au 21e jour | H80 | k, t, texte patient | texte patient | 10 |
| 8 | Fiche compléments | F78 | J3-bio (porte 19), règle signée et C4 (porte 28), ACT-1 | texte de la fiche | 10 |
| 9 | Geste du 21e jour de l'agenda alimentaire | H81 | R:FC-5 (1/2) au cockpit | texte du geste ; deux messages, deux places, sans fusion avec la place 7 | 10 |
| 10 | Bibliothèque pédagogique | H82 | « Mes échanges » ouvert, sa D-xxx, porte 17 | texte accusé | 10 |
| 11 | Photo ou dictée des repas | H83 | registre IA, porte 5, D-269, code | information patient | 10 |

### Ouvertures sans place numérotée

Chacune prend une place avec son constat, servie après la place 5 au moins, sauf l'imprimable du protocole : il est la page déjà servie, imprimée, et suit les ajouts de contenu. Leur ordre au-delà de la place 11 est tranché : la conduite passe devant. Dès que l'encart « quand ralentir ou demander avis » (bd, H71) est prêt, il prend la place suivante avant toute autre ; les autres (bb, cc, qui compte comme une place (D-288 §3, #1430), cg, bf, et toute ouverture sans place numérotée) s'ouvrent dans l'ordre où elles sont prêtes, une à la fois, le constat de la précédente avant (porte 18). C'est la règle de b (H05) pour les places 12 et suivantes.

| ouverture | fiche | rang au plus tôt | condition |
|---|---|---|---|
| Bloc « Protocole » du document médecin, sans la charge déclarée | F39 | 5 | J2-med, p ; « avant le premier check-in » reste une visée que la file peut mettre en défaut |
| Encart « quand ralentir ou demander avis » | H71 | 5 [Hypothese] | porte 7 (rang 4) ; passe devant dès qu'il est prêt |
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

## §4 Gestes du responsable, par rang

Rang d'abord, hiérarchie ensuite. Un geste n'a pas d'autre adresse que sa fiche.

| rang | h | geste | fiche | ce qu'il débloque |
|---|---|---|---|---|
| 0 | h1 | signer les décisions d'ordre a, b, g (PR S-3) ; fait le 2026-10-14 : D-287, D-288, D-289 (#1430) | F01, H05, F04 | chaîne biologie, file C, restauration |
| 0 | h1 | fournir les sources de la porte 4 | H08 | c, am, al, cm, seuils_points |
| 0 | h1 | sources de fidélité (G-10) | H13 | v, bandes, mots qui jugent |
| 0 | h1 | lettres de sécurité m, n, z, ac | H10, H11, F45, H12 | NF-7, EF-3b, garde d'âge, radar |
| 0 | h1 | conduire le premier constat S-1, biologie et hors biologie, en agrégats, par conteneur | F40, H06 | porte 1 ; vérifications renvoyées |
| 0 | h2 | lettres j, q, s, aa, ab, av ; guide w ; ca ; bg | F63, F38, F57, F55, H14, F33, H15, H17, H18 | palier 1, BioFlow, aperçu médecin, onglet Biologie, BF-8, EF-0, 12 besoins, agenda du sommeil |
| 0 | h2 | K-05a et D4 (porte 5) | F46 | R:Drive, ag, ah, an, at, ay, bg |
| 0 | h2 | liste des 8 analytes NABM (S-7) ; lecture des écarts d'unité textuels ; copie datée de l'accord d'Anthropic | F54, F60, F47 | M-3 ; deux unités ; registre |
| 0 | h2 | effectif de masquage ; cj ; ci (fait le 2026-10-14 : D-286, #1425) ; co ; comportement voulu de la charge | F25, F49, F67, F68, F76 | constats sur plusieurs dossiers ; packs ; levées ; AIPD ; correctif |
| 0 | h2 | accepter la lettre cq (D-285, fait) | H04 | PR 1 du versement |
| 0 | h2 | compter les dossiers bloqués avant T0, en conteneur | H07 | délai avant T0 |
| 0 | h3 | k ; l (trace d'import) ; h ; instruction de bf | F77, F44, H16, H19 | CGU, trace, Boussole, indicateurs |
| 0 | h3 | G-11 : textes patient de la collecte et des mineurs (l écrite) ; fait le 2026-10-14 (#1441) | H38 | collecte, mineurs, lots (h) et (i) de D-284 |
| 0 | h3 | archiver l'annexe d'hébergement et les accords de sous-traitance (hébergeur, Google Workspace, Sentry) ; relancer par écrit la confirmation d'effacement ; informer tout dossier resté sur une version antérieure du texte ; faits attendus (identité juridique, copie signée) | H20 | registre RGPD à jour (D-283 §8-9) |
| 0 | h3 | relancer par écrit le laboratoire pilote | F41 | porte 29 |
| 0 | h3 | lettre cp : ranger chaque trou restant sous son lot | F69 | revue RGPD avant le 2027-06-30 |
| 0 | h3 | relancer le recueil réel de 21 jours de l'agenda alimentaire [Hypothese] | H45 | barème gelé (porte des 21 jours) |
| 0 | h4 | obtenir les avis de la porte 28 | H09 | x, aq, ar, archive, 15 à 17 ans, durée probatoire (NIR, seuil d'âge, transferts, DPO : clos par D-284) |
| 1 | h1 | essai de restauration (G-7) | F04 | toute migration après BP-09 |
| 1 | h1 | lettres c, v, o, t, am | F59, H13, H30, H31, H33 | cockpit, bandes, Momentum, rappel, quantités |
| 1 | h1 | grilles de la table d'arrêt (re-signature) | H42 | table d'arrêt complète |
| 1 | h2 | d, ad et bc, ba, aw, texte de az, at, cm, seuils_points, règles orphelines | H32, H34, H35, F34, F37, F45, F51, H40, H41 | adhésion, protocole, Track C, axes |
| 1 | h2 | M-3, signature des 8 liaisons NABM | F54 | f |
| 1 | h2 | R:Drive : valider les références une à une | H36 | fiches conseils |
| 1 | h2 | lire les deux comptes du LOT-02 du sommeil | H27 | porte 16 |
| 1 | h3 | u, cb ; textes (a), (e), (f) de D-283 | H37, H39, H26 | Patient Hub, écran de fin, durées |
| 1 | h4 | r, x | H28, H29 | J2-conf, J3-api |
| 2 | h2 | M-2 (doctrine du cockpit, porte 6) ; M-5 (1/2), signatures de BP-07 (posées dans le lot, #1438) ; f | F59, F02, F54 | J1-cockpit, Jour N, cabinet ; BP-07 mergé (clos le 2026-10-14, #1438) ; G-3 |
| 2 | h3 | G-8 ; ai | H50, H51 | ACT-1, ACT-3 |
| 2 | h3 | intitulés des trois plans (bb) ; jeu d'illustrations de la saisie du sommeil (cc) | H49, H48 | lecture des trois plans ; habillage |
| 3 | h1 | M-1, signature de SAF-EI-01 amendée | F66 | porte 7 au rang 4 |
| 3 | h2 | M-5 (2/2), approbation de la release-db de BP-09 ; G-3 | F03, F54 | toute migration suivante ; BF-7, BF-8 |
| 3 | h3 | al ; y | H57, H58 | marques alimentaires ; J3-cabinet |
| 3 | h3 | échelle du rituel du soir (cd) ; dire si la synthèse publiée au patient décrit les drapeaux du sommeil, et sous quelle forme | H54, H56 | rituel ; au |
| 4 | h1 | approuver, une à une, les release-db du rang 4 (EF-3b, BP-12a, BP-11, BP-13, BP-15, CC-8, axes, BF-8, collecte, D-283 b, retrait du NIR) | fiches du rang 4 | codes consommateurs |
| 4 à 10 | h1 à h3 | signer les contenus de BP-12a, BP-12b, BP-17 (porte 23) ; accepter chaque texte patient avant son activation ; consigner la lecture de chaque ouverture qui ne vise que certains dossiers | F05, F09, F11, §3 | J3-bio ; file C |
| 5 | h1 | dire le sens d'« anomalie » au vu du premier constat d'activation | H05, §3 | porte 18 |
| 5 | h3 | texte de l'encart (bd) ; propriétaire et sources du thème « respiration et apaisement » (ah) | H71, H68 | encart ; fiches par thème |
| 5 | h3 | ch : trois phrases de tendance, règle de comparaison d'un agenda fini au précédent et marge « stable » à signer | H72 | phrase en fin d'agenda |
| 6 | h2 | indications v2, re-signées | F53 | bilan par axe |
| 8 | h2 | constater un cycle réel jusqu'au jalon de fin, par identifiant | F26 | fin de BIO-PARCOURS |
| 10 | h3 | confirmer les points de départ des deux messages du 21e jour | H80, H81 | places 7 et 9 |
| T | h1 | chaque release-db, une à une ; chaque contre-revue P0 | §5 | codes consommateurs ; merges des lots P0 |

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
- Ordre des release-db : (1) D-281 lot 2, fait ; (2) D-282 lot 2, fait (#1412) ; (3) BP-09 au rang 3 ; (4) essai de restauration réussi (porte 8) avant toute migration suivante ; (5) le rang 4, selon la hiérarchie : EF-3b, BP-12a, BP-11, BP-13, BP-15, CC-8, axes [Hypothese], BF-8, collecte, D-283 (b) [Hypothese], retrait de la colonne NIR (D-284 lot g) [Hypothese], et selon les cas J2-med, statut posé, ai, J1-alim, J2-alim, J3-api, J3-cabinet ; (6) le rang 5 : BP-12b, BP-14, BP-18a, BP-18b s'il migre, BP-05 [Hypothese], selon F79 ; (7) rang 6 : BP-27 [Hypothese], selon ax et indications v2 ; rang 7 : BP-19 [Hypothese] ; rang 8 : BP-22 [Hypothese] ; rang 10 : J3-mineurs ; (8) gelées : adaptateur du laboratoire (porte 29), selon F41.
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
- Aucun nouveau pack biologique clinique tant que la décision de rationalisation (cj, F49) n'est pas prise (`BIOFLOW_ROADMAP.md:65-68`).
- Interdits de construction jusqu'à l'ouverture de P2 : multi-tenant, API publique, LOINC, facturation, SDK, OAuth, microservice, Python ; le processus de fond du G3 reste dans l'application (D-282 §2).

### Fermetures

- Second compte (fermé un an), API et recherche, flux laboratoire, envoi direct au médecin : fermés. Toute levée passe par une D-xxx, après l'amendement de D-276 à cinq déclencheurs (ci, F67 ; écrit par D-286, #1425) ; le flux laboratoire attend en plus la porte 29 (F75, F41).
- Un test d'intrusion humain devient obligatoire avant toute offre commerciale ou tout second compte praticien (D-283 §7). HDS suffit : la réserve SecNumCloud de D-006 est close ; aucun DPO n'est désigné, le point de contact est le responsable, et l'obligation de désigner relève d'un conseil (D-283 §7).
- Différés fermes de C2, jamais repris : analyse émotionnelle libre, score de décrochage, notifications proactives, pourcentage d'observance au patient (campagne suivi-j7, `CAMPAGNE.md:70-77`).
- Messagerie de santé hors de portée : aucun canal sortant, aucun sous-traitant de plus (D-222 §4). La messagerie du portail est une collecte documentaire seule, sans conversation.
- SSO multi-établissement ; RAG dynamique tant que D4 et D7 ne sont pas tranchés (`docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md:82-93`).

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
- Critère transverse des lots 6.0, repris de la file supprimée : une stratégie incomprise ou irréalisable n'est pas « done » (`docs/claude/campagnes/FILE_ATTENTE.md:97-99`).
- « 6.0-B » nu est ambigu (objectif à trois voix, ou charge et capacité) : toujours qualifier (`docs/claude/campagnes/FILE_ATTENTE.md:11-24`). De même « R6 » nu (trois séries R) et « Track C » (BioFlow) contre « file C » (activations).

## §6 Gelés, avec déclencheur

Un gel n'a pas de rang : il prend un rang au déclencheur posé, par la règle. Déclencheur nommé : sans marque ; déclencheur proposé faute de nom : [Hypothese] (un déclencheur par reste ; tri à la prochaine version du plan). Les vérifications au code renvoyées au premier constat sont dans H06, non ici. BP-04 n'est pas gelé avec la piste C : BP-16, BP-20 et BP-21a l'attendent (F16, rang 4).

| objet | déclencheur | où il reprendra |
|---|---|---|
| Barème de l'agenda alimentaire (LOT-06 de l'agenda et LOT-02 de la chaîne, fusionnés) | la porte des 21 jours : un recueil réel suffisant (au moins 7 journées par dossier, 21 pour une clôture ; `docs/claude/campagnes/2026-08-10-chaine-alimentaire/CALIBRATION_LOT-02.md:7`) | rang 4 au plus tôt à la levée [Hypothese], après J2-alim |
| Adaptateur du laboratoire pilote (ex-LOT-05 de BIO-INGEST) | réponse écrite du laboratoire, format réel (porte 29) | lettre cl au rang 0 du déclencheur, chaque migration au rang 4 au plus tôt |
| Les cinq briefs d'août : charge et capacité (6.0-B charge), récit du parcours (6.0-C), jumeau de compréhension (6.0-D), curation hors remboursement, moitiés praticien et patient de l'objectif et l'amorce « Ce que j'ai compris de vous » (dossiers d'origine sortis du dépôt en PR 4, lisibles dans l'historique Git : `docs/claude/campagnes/2026-08-21-charge-et-capacite`, `2026-08-21-recit-du-parcours`, `2026-08-21-jumeau-de-comprehension`, `2026-08-18-curation-signee`) | « premier suivi quotidien reçu » | prochaine version du plan |
| Première ligne du barème de charge (table vide, DC-19, DC-20) | même déclencheur que la charge et capacité [Hypothese] | prochaine version du plan |
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
- **Portes, préalables** : porte 29 ; flux laboratoire fermé ; LOT-10 fait. Écart à nommer : l'audit BioFlow range le premier connecteur laboratoire pilote en P3 (`docs/claude/campagnes/AUDIT_BIOFLOW_2026-10-04.md:767`) ; le cadrage du 2026-10-07 en fait un lot de BIO-INGEST, suivi ici, sous la porte 29 et le flux fermé.
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
- **Identifiant, piste** : jeu de référence (gold dataset), observabilité, métriques de qualité, coût réel par document (`docs/claude/campagnes/AUDIT_BIOFLOW_2026-10-04.md:730-740`) ; plateforme. Les jobs durables, le processus de fond, la reprise et l'idempotence sont livrés (D-282, F42).
- **Rang** : gelé, déclencheur proposé [Hypothese] : l'ouverture par le responsable de P1, au plus tard avant tout changement du modèle d'extraction ; si ouvert, banc sur fixtures au rang 1 au plus tôt [Hypothese].
- **Portes, préalables** : P0 (fiabilité) tenu par la clôture de BIO-INGEST ; G3 clos (D-282 §8) ; fixtures seules.
- **Migration, release-db** : non a priori.
- **Décisions, textes** : D-xxx de P1 à l'ouverture. La dette « banc à base réelle » du LOT-02 de biologie-exploitee y est candidate, à trancher.
- **Critère de fin** : gold dataset rejouable en CI ; coût par document mesuré ; jamais un dossier réel.
- **Mise à jour (2026-10-13)** : le processus de fond du G3 (jobs durables, reprise, idempotence) est livré et le G3 clos (#1415, #1416 ; F42, close) : F72 ne porte plus que le jeu de référence et les mesures de P1 ; ses champs sont réécrits en conséquence (revue de #1417).

#### F73 · P2 : préparation à l'externalisation
- **Identifiant, piste** : frontières de domaine, organisation et tenant, isolation, API versionnée, terminologies versionnées, LOINC si besoin démontré, en complément de la NABM (`docs/claude/campagnes/AUDIT_BIOFLOW_2026-10-04.md:742-756`) ; plateforme.
- **Rang** : gelé, déclencheurs : P1 fait et levée d'une fermeture (F75), après ci ; si levé, 5 au plus tôt [Hypothese], après P1.
- **Portes, préalables** : lettres b et x après ci ; avis DPO (porte 28) pour x.
- **Migration, release-db** : selon.
- **Décisions, textes** : une D-xxx par levée.
- **Critère de fin** : sans objet tant que rien n'est levé.
- **Mise à jour (2026-10-13)** : « avis DPO (porte 28) » se lit « avis d'un conseil » : aucun DPO n'est désigné, obligation close à cette échelle (D-284 §6) ; l'analyse datée d'une page se revoit avant toute ouverture à plusieurs praticiens. Un test d'intrusion humain précède toute offre commerciale et tout second compte praticien (D-283 §7). Chaque D-xxx de levée est en §10.
- **Mise à jour (2026-10-14)** : ci est écrite (D-286, #1425) et b aussi (D-288, #1430) ; x reste à écrire. Le second compte praticien reste fermé jusqu'au 2027-10-11 (D-288 §5). Rien n'est levé.

#### F74 · P3 et P4 : SaaS pilote, montée en charge
- **Identifiant, piste** : API publique, sandbox, facturation, premier client externe, puis OAuth, SDK, interopérabilité (`docs/claude/campagnes/AUDIT_BIOFLOW_2026-10-04.md:758-777`) ; ouvrir BioFlow à d'autres cabinets ; plateforme.
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
| Nom « Ma spirale alimentaire » | remplacé par « Mon carnet alimentaire » (PR #294, #429) | historique Git |
| LOT-04 de la chaîne alimentaire (rayon de fiches conseils) | doublon de D-251 (PR #1232 à #1252) | historique Git |
| LOT-04 de l'échéance HDS (« reste la revue du 2026-10-21 ») | borne levée par D-265, gate clos par D-121 | historique Git |
| Checklist d'activation G-TRUST-04 | affirme un gate ouvert, contredite par D-121 | archivée avec bandeau (§9) |
| Phrases « gate HDS » de rayon-biologie-cb | contredites par D-121 | corrigées par ligne datée (§9) |
| « 0 transmission » de BIO-INGEST | contredit par le constat de clôture (`lots/LOT-12`) | historique Git |
| « Gate multi-cycles différé » ; proposition 2026-07-18-gate-modele-multi-cycles | levé par G2, puis D-113 | historique Git |
| Lien signé vers le médecin ; signature et authentification du médecin ; geste de transcription du fil | remise au patient tracée, rien ne part vers un tiers | `docs/claude/campagnes/FILE_ATTENTE.md:460-476` |
| Statut de lot « bloqué_confirmation » | règle de cadrage ; aucun lot ne le porte | historique Git |
| Messagerie patient (accueil-observatoire) ; D5 de la feuille de route produit | collecte documentaire seule, aucune conversation | historique Git |
| Drapeaux « fermés » de deux voix ; « livrée, non close » de trois voix | drapeaux à true, campagne terminée le 2026-09-14 | historique Git |
| Tampon de D-208 ; « relire l'usage du protocole » | exécuté (D-213 §1) ; absorbé par la porte 15 | `docs/claude/campagnes/FILE_ATTENTE.md:87`, :94, :573 |
| Préparation 4.0 (UX-6) | remplacée par L4 et L5 | historique Git |
| Runbooks C5 « Vercel, drapeau false » | D-080, D-120 | historique Git |
| Brief nutrition-référentielle | R1 livré par C5A, R2 = ao, R3 = ah | `docs/claude/campagnes/FILE_ATTENTE.md:72` |
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
| Arc espace patient E3, E2, E4 | absorbé par 6.0-A, B et C, dont les écrans portail sont les tranches | `docs/claude/campagnes/FILE_ATTENTE.md:614-619` ; IDP2 LOT-04 gelé (§6) |

## §8 Dettes, sans rang

Ex-file d'attente, registres de dettes, `.wn/state.json` et handoffs de main. Une dette n'a pas de rang : elle a un sort, une échéance ou un déclencheur. Une dette déjà portée par une fiche ne garde ici qu'une ligne de renvoi, sans autre statut : son sort est celui de la fiche nommée à droite. Les gelées sont en §6 ; les terminées et obsolètes disparaissent avec la file (§9).

### Information des patients et droits (échéance unique 2027-06-30, D-265 §4 ; D-283 §9)

| élément | source | sort ou échéance |
|---|---|---|
| D-TRUST-02 revue juridique des textes v1 | `DETTE_TRUST.md:10` | avis d'un conseil (porte 28, H09) ; 2027-06-30 |
| D-TRUST-06 durées de conservation formalisées | `DETTE_TRUST.md:14` | fixées par D-283 §2 ; restent le texte patient et le code (H26) |
| D-TRUST-07 titre d'instrument dans l'e-mail d'assignation | `DETTE_TRUST.md:15` | constat au premier S-1 (H06) |
| D-TRUST-08 revue périodique de la règle EI | `DETTE_TRUST.md:16` | reprise par D-278 et D-281 (F66) ; échéance de six mois conservée |
| D-TRUST-09 désignation d'un DPO | `DETTE_TRUST.md:17` | clos par D-284 §6 : pas d'obligation à cette échelle, point de contact = le responsable ; reste une analyse d'une page, datée, revue avant toute ouverture à plusieurs praticiens, tout partage systématique ou tout changement d'échelle (F74) |
| D-TRUST-10 confirmation de la procédure de violation par un conseil | `DETTE_TRUST.md:18` ; `PROCEDURE_VIOLATION_DONNEES.md:155` | porte 28 ; 2027-06-30 |
| Identité juridique ; critères de l'AIPD ; 15 à 17 ans et durée probatoire en cas de dommage corporel (avocat) | D-283 §9 ; D-284 §3-4 ; `DOSSIER_RGPD.md:1332-1356` sur f3ddbd3d | faits et gestes (H20), conseil (porte 28), AIPD (F68) ; 2027-06-30. Clos par D-284 : NIR (recueil cessé, champ à retirer, lot g de H26), seuil des mineurs (18 ans), transferts (cadre UE-États-Unis ou clauses types, H20, F47) |
| Accords de sous-traitance de l'hébergeur, de Google Workspace, de Sentry à archiver ; copie datée de l'accord d'Anthropic, avec l'analyse d'impact du transfert (D-284 §5, lot j) | D-283 §9 ; D-284 §5-6 ; `DOSSIER_RGPD.md:1338-1344` sur f3ddbd3d | gestes (H20, F47) ; 2027-06-30 |
| Pentest ; registre physique EX-3 ; piste d'audit | `DOSSIER_RGPD.md` §14 | test d'intrusion humain avant toute offre commerciale ou second compte (D-283 §7) ; registre des violations et piste d'audit clos par constat (D-283, fin) |
| Information du médecin à la première lettre | D-283 §3 | lot (e) (H26) |
| Demandes de droits : le passage à `traite` n'exige ni réponse ni date d'envoi ; une demande reçue par e-mail d'une personne qui n'a plus accès au portail n'a pas de circuit ; aucune durée n'est fixée pour les courriels de demande et de réponse gardés dans la boîte du responsable | revue CodeRabbit de #1446 ; `DOSSIER_RGPD.md` rubrique 9 | code et migration au premier lot qui touche les demandes de droits [Hypothese], rang 4 au plus tôt ; le cas sans accès au portail et la durée des courriels, à trancher par le responsable ; 2027-06-30 |
| Confirmation d'effacement des sauvegardes de l'ancien hébergeur | `DOSSIER_RGPD.md:1214`, :1246 ; `.wn/state.json` blocking_issues | relance, geste du responsable (H20) |

### Dettes techniques vivantes

| élément | source | sort ou déclencheur |
|---|---|---|
| `assessment_episodes.milestone` sans CHECK | `docs/claude/campagnes/FILE_ATTENTE.md:349-385` ; `schema.prisma` | migration à part, au premier lot qui touche les épisodes [Hypothese] ; rang 4 au plus tôt |
| Table des signaux de sécurité absente de `SOURCES_DE_SAVOIR` (`scripts/wn-matrice-consommation.mjs`) | `docs/claude/campagnes/FILE_ATTENTE.md:477-487` | déclaration d'inventaire, sa propre PR [Hypothese] |
| Unité d'un résultat biologique non liée au catalogue en base (D-264) | `docs/claude/campagnes/FILE_ATTENTE.md:503-514` | au prochain changement d'unité d'un analyte porteur de résultats |
| `MESSAGE_ORIENTATION_INACTIVE` périmé (D-074 §4) | `docs/claude/campagnes/FILE_ATTENTE.md:531-539` | petite correction d'interface, avec J1-base (H43) [Hypothese] |
| Règle G6 : frontière entre phrase recopiée et borne standard | `docs/claude/campagnes/FILE_ATTENTE.md:592-604` | à écrire avant la prochaine attestation qui cite un chiffre |
| Catalogue de conduites de D-206 : deux lignes non lues sur pièce | `docs/claude/campagnes/FILE_ATTENTE.md:243-269` | toute ligne neuve = une nouvelle attestation ; avec ag (H25) |
| Surfaces WN_CE_QUI_COMPTE, WN_DOSSIER_DEUX_VOIX | `docs/claude/campagnes/FILE_ATTENTE.md:62` | gestes du responsable, sans rang |
| Garde TRUST « le refus bloque » : exécution confiée à une autre session | `docs/claude/campagnes/FILE_ATTENTE.md:397-440` | constat au premier S-1 (H06) |
| T0 irrévocable (identifiant déterministe, `upsert update:{}`) ; `POST /api/praticien/protocoles` sans appelant ; E2E nominal absent | `.wn/state.json` next_action[40] | prochaine version du plan |
| Résidus du LOT-00 de la chaîne : bouton « Clôturer », clôture automatique du portail à J21 | next_action[41] | prochaine version du plan |
| Inventaire du garde de catalogue (Q_FIB_03 suspendu) ; « Historique » non atteignable depuis le seed | next_action[42] | prochaine version du plan |
| Contrat SQL pgvector livré (#634) ; prochaine action datée du 2026-08-19 | next_action[43] | obsolète : gate clos (D-121) ; vidé en PR 3 |
| Jalon du 2026-10-21 | next_action[44] | obsolète : borne levée (D-265), échéance 2027-06-30 (D-283 §9) ; vidé en PR 3 |
| Redirection `/patient/*` sans échéance ; route sans appelant | next_action[45] | constat au premier S-1 (H06) |
| seuils_points de Q_ALI_01, classe « recueil partiel » | next_action[46] | décision sourcée (H40) |
| Instrument terminal suspendu encore déclaré certifié au catalogue | next_action[47] | constat au premier S-1 (H06) |
| 113 fichiers en CRLF contre `.gitattributes` | next_action[48] | une PR d'hygiène dédiée [Hypothese] |
| Invariant de `packs_registre_coherence_v1` à ne pas affaiblir | next_action[49] | règle |
| Écran de masquage de l'identité : deux canevas pleine résolution par page, gardés en mémoire (≈ 280 Mio à 20 pages A4), risque d'épuisement sur Safari mobile | revue Copilot de #1428 ; `web/src/components/patient-cockpit/MasquageIdentite.tsx` | rendre la page courante seule et rerendre à l'envoi ; au premier compte rendu de plus de 6 pages, ou au premier usage sur téléphone [Hypothese] |
| Masquage lu par une lecture non tracé : l'import ne garde pas l'identifiant du masquage envoyé | revue `wn-reviewer` du lot 2 de D-284 §5 (P2-5) ; `lancerExtraction.ts` | une colonne, donc une migration ; question au responsable, avec le lot 3 du masquage |
| Agenda alimentaire : LOT-06 gaté, recueil arrêté au premier jour | next_action[50-54] | barème gelé (§6) ; relance du recueil, geste du responsable (H45) |
| « Suspendu » est un état de drapeau, pas une propriété de l'instrument (D-033) | next_action[55] | règle de lecture, gardée |
| Couverture E2E de l'envoi bornée : une règle, une cible, envoi du courriel non asséré (SMTP vide sur le banc) | next_action[56] | note de banc ; à étendre au premier lot qui touche l'envoi [Hypothese] |
| Piège de banc d'orientation (WN_ENABLE_ORIENTATION_NNPP2 et rawAnswers) | next_action[57] | règle de banc |
| Question clinique R2-SOM-05 (Horne sans la porte RYTHME_BIOLOGIQUE de R2-SOM-03) | next_action[58] | la décision du responsable, sans rang ; aucune règle neuve sans D-xxx |
| Cinq dettes sans lot d'accueil de D-032 (seed, `questionnaire_packs.actif`, réactivation d'un pack, `schema.prisma:155-156`, suture morte) | next_action[59] | prochaine version du plan |
| Attentes humaines : invitations aux patients des dossiers courants, visibilité patient du fil médecin, escalade SIIN Q_GEO_04 | next_action[61] | les gestes du responsable, sans rang |
| `portail-lien-magique:45` échoue en local sur main pur, vert en CI | next_action[62] | note de banc |
| Arbitrage de la campagne C4 compléments clean label | next_action[60] | tranché : abandonnée (§9, PR 2) |
| Deux transmissions concurrentes d'un même questionnaire créent deux réponses et deux courriels | handoff 2026-10-10-1943:63-68 | lot à cadrer, file A, h1 (intégrité des données) [Hypothese] : transaction et verrou sur l'assignation |
| Restes de D-275 : geste de lettre offert sans consultation porteuse ; date « depuis » du Fil prise sur la porteuse ; tests de parité cockpit et Fil et d'empreinte non écrits | handoffs 2026-10-10-0850:84-88 et 2026-10-10-1943:69-70 | lot à cadrer, file A [Hypothese] |
| Lettre d'adressage : date au jour UTC ; courriel envoyé si la lettre est révoquée pendant la remise ; export d'accès sans les remises ; impression refusée en 404 JSON | handoff 2026-10-10-1234:30-34 | à arbitrer par le responsable, puis lot à cadrer [Hypothese] |
| Axes de l'indice /100 du sommeil non instruits par 8B | handoff 2026-10-12-1243:77-78 | sources de la porte 4 (H08) |
| 5A : acceptation sous abstention « required » éprouvée seulement en unitaire ; sélections `libre:` à constater au premier usage | handoff 2026-10-12-0100:78-80, :89-90 | constat en agrégats au premier usage (H06) |
| #1394 sans SESSION_LOG ni handoff ; liens externes vers les chemins archivés par #1405 non relus ; worktree `hygiene-apply-safe` à supprimer à la main | handoff 2026-10-12-1430:43-50 | trace : ce handoff ; worktree : geste du responsable ; contrôle de clôture (H23) |
| Repli localhost ; verrou de diffusion | `HISTORIQUE_CHANTIERS_TECHNIQUES.md:38-39` | dans J1-base (H43) |
| Auto-merge sans contrôle de clôture | `HISTORIQUE_CHANTIERS_TECHNIQUES.md:40` | H23 |
| Contenu en clair au stockage local | `DETTE_UX_RESIDUELLE.md:10` | constat au premier S-1 (H06) |
| D-C5-01 à D-C5-04 ; D-JA-01 à D-JA-03 | `DETTE_C5.md:10-13` ; `DETTE_JA.md:16-18` | dans H16 et H45 |
| Curation de `QuestionnaireDefinition.niveau` et `.publicCible` : statut « surveillance », aucun usage applicatif (R10, 2026-07-10) | `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md:78` ; `docs/claude/PROJET_CONTEXTE.md:195` | surveillance, sans action ni échéance ; se solde au premier usage applicatif ou au retrait des champs [Hypothese] |
| D-TRUST-05 passe réelle d'accessibilité | `DETTE_TRUST.md:13` | portée par H64 (rang 4) |
| Lecture par la file (G3) : un dossier clos pendant l'attente n'est pas rejugé par la réclamation (un motif neuf demanderait une migration) | handoff 2026-10-13-1110:80-81 | soldée le 2026-10-14 par #1418 (D-282 §9.1), sans migration ; la ligne reste pour les renvois |
| TEMPS 3 : la transaction des lignes insère sous des clés vers le dossier sans le verrouiller d'abord, interblocage possible face à l'effacement, ancien et nouveau chemin | handoff 2026-10-13-1110:94-97 | soldée le 2026-10-14 par #1418 (D-282 §9.2) ; la ligne reste pour les renvois |
| Bancs manquants du processus de fond : `reconcilierFantomes`, refus à la réclamation et à la reprise, boucle du processus ; base locale `wn_g3_lot3_banc` à supprimer sur accord | handoff 2026-10-13-1110:98-101 | hors G3 (D-282 §8, handoff du lot 5) : tests `reconcilierFantomes` et boucle du processus, lot à cadrer avec TEMPS 3 [Hypothese] ; base locale : geste du responsable, sur son accord |
| `patientLimitations` du contrat de vue patient du protocole : vide chez tous les appelants de production, aucun écran ne le rend ; le servir exige un texte patient signé, jamais la recopie des limites écrites pour le praticien | `docs/claude/campagnes/FILE_ATTENTE.md:522-526` (historique Git) ; D-191, D-200 §3 | sans porteur ; avec la première surface qui rend ce champ (même geste qu'af, H24), texte signé du responsable avant tout écran ; ligne ajoutée le 2026-10-14 à la suppression de la file (PR 5, revue #1422) |
| Constat de la proposition de bilan servie au cockpit sur un dossier réel, par identifiant et en conteneur (preuve terminale de la chaîne T0, jamais consignée ; `WN_CB_PROPOSITION` posé en production) | `docs/claude/campagnes/FILE_ATTENTE.md:540-541` (historique Git) ; handoffs du 2026-08-18 | geste du responsable, à verser avec le prochain constat sur dossier réel (H06), avant le code de ax (F35) ; ligne ajoutée le 2026-10-14 (PR 5, revue #1422) |
| La minute d'après affiche l'identifiant brut de la priorité retenue au lieu de son libellé (registre signé ou libellé du praticien) ; écran praticien, aucun risque clinique | `docs/claude/campagnes/FILE_ATTENTE.md:605-612` (historique Git) ; D-279 (revue du lot 5A, 2026-10-12) ; `web/src/components/copilote/ClotureMinuteApresPanel.tsx:104` | petit lot d'écran, au prochain passage sur le copilote ; ligne ajoutée le 2026-10-14 (PR 5, revue #1422) |
| Passe `wn-reviewer` de l'exception migration/authentification non liée au sha final (« obligatoire si elle n'a pas déjà eu lieu ») ; défaut antérieur à D-290 | revue CodeRabbit de #1440 (synthèse, « Security Architecture Review ») ; `.claude/skills/wn-merge/SKILL.md` étape 5 | la lier au sha revu, comme `--match-head-commit` (D-290), au prochain lot qui touche `/wn-merge` [Hypothese] |
| `.coderabbit.yaml` lu sur la branche de la PR : une PR peut affaiblir sa propre revue | D-290 §5 ; revue CodeRabbit de #1440 (synthèse) | tranché par le responsable le 2026-10-14 (D-291) : ces PR sont P1, `wn-reviewer` avant le merge (règle `.claude/rules/pr-revue-et-release-db.md` 1.10) ; ni `CODEOWNERS` ni approbation imposée. Garde-fou déclaratif : la ligne reste ouverte tant qu'aucun verrou ne la ferme |
| La synthèse IA ne lit pas les pseudo-items `AGA_*` de `Q_ALI_09` : relus contre un catalogue qui n'en déclare aucun, ils sont rendus non résolus | `web/src/lib/scoring/reponsesLisibles.ts`, `web/src/lib/synthese/generation.ts` ; handoff 2026-10-14-0010 (PR 2, #1419) | au plan seulement, aucun code pendant le versement (arbitrage du 2026-10-14) ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Le banc de vocabulaire de verdict du LOT-04 de biologie exploitée laisse passer « élevé » et « bas » | `EstimeMesurePanel.test.tsx:932-933` ; handoff 2026-10-14-0010 (PR 2, #1419) | au plan seulement (arbitrage du 2026-10-14) ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Pagination au-delà d'environ 100 lignes : nommée au §9 (renvoi à S-1 et au §8), portée par aucune fiche ni ligne du §8 | handoff 2026-10-14-0135 (PR 3, #1420) | sans porteur ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |
| Génération PDF native avec signature du booklet, coaching patient autonome, RAG SIIN plein : nommés par aucune ligne du plan ; le §5 ne ferme SSO et RAG dynamique que par renvoi à l'historique archivé | handoff 2026-10-14-0135 (PR 3, #1420) ; `HISTORIQUE_CHANTIERS_TECHNIQUES.md:82-93`, archivé sous `docs/archive/roadmap-updates/` (PR 4, #1421) | sans porteur ; sort à écrire [A verifier] ; ligne ajoutée le 2026-10-14 |

### Soldées, constatées au dépôt (disparaissent avec la file), et verdicts CL

| élément | source | constat |
|---|---|---|
| Finalités de « Mes choix » versionnées | `docs/claude/campagnes/FILE_ATTENTE.md:441-459` | colonne `formulation_version` présente (`schema.prisma:985`, relevé du 2026-10-13) |
| Lot d'exposition des indications d'assiette | `docs/claude/campagnes/FILE_ATTENTE.md:121-186` | WN_ASSIETTES_INDIQUEES à true au registre des drapeaux (`docs/FEATURE_FLAGS.md:36`, relu sur 26706d17) ; « livré éteint » (`docs/claude/campagnes/FILE_ATTENTE.md:127`) datait d'avant l'activation, le registre des drapeaux fait foi |
| Catalogue C5B ; régime alimentaire pas un drapeau ; conflits de sources ; NUL dans le libellé ; carte « compte rendu à lire » | `docs/claude/campagnes/FILE_ATTENTE.md:271-347` | acquittées ou livrées |
| D-TRUST-03, gate G-TRUST-04 | `DETTE_TRUST.md:11` | refermée par D-089 puis D-121 |
| CB-07, contrat V4 | constat au dépôt | clos : contrat V4 demandable (D-129, #900) ; absorbé par BP-04 (F16) |
| « Relancer la lecture » de BIO-INGEST | constat au dépôt | LOT-09 terminé (#1335) |
| D-200 (1) et (2) | constat au dépôt | fermées (#1137 ; `docs/claude/campagnes/FILE_ATTENTE.md:90`) |
| Verrou de double consignation côté écran | constat au dépôt | garde serveur ; biologie-exploitee LOT-01 terminé le 2026-09-04 |
| Catalogue typé GD-5 | constat au dépôt | clos ; seul reste `clinicalSnapshot.ts:1`, gelé (§6) |
| « Reste WN_CB_ENABLED » | constat au dépôt | clos : drapeau à true (`docs/FEATURE_FLAGS.md:26`) |
| Lecture par la file (G3) : horloge client de l'ouverture (`ouvrirExtractionDans`) | handoff 2026-10-13-1110:84-90 ; revue de #1414 | soldée par #1416 : la fraîcheur d'un import `en_cours` se juge en SQL à l'horloge de la base |

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
| j | D2, règle de dépendance ; module publié | registre | 0 | F63 |
| k | CGU unique ; texte de l'IA v7 | la main du responsable | 0 | F77 |
| m | encart de sécurité sur les CAB_ | la main du responsable | 0 | H10 |
| n | garde de dose resserrée | la main du responsable | 0 | H11 |
| o | Momentum à remesure libre | la main du responsable | 1 | H30 |
| p | journal de lecture du protocole | registre | 4 (migration) | H60 |
| q | aperçu médecin tracé, remise au patient | la main du responsable | 0 | F38 |
| r | droits d'usage des instruments | registre | 1 | H28 |
| s | onglet Biologie, statut posé, deux marques | la main du responsable | 0 | F57 |
| t | point d'étape, rappel nommé | la main du responsable | 1 | H31 |
| u | Patient Hub, collecte, « Mes échanges » | la main du responsable | 1 | H37 |
| v | bandes de bruit par instrument | la main du responsable | 1 | H13 |
| w | guide des 12 besoins sur sources | la main du responsable | 0 | H15 |
| x | posture d'API, aucune clé | la main du responsable | 1 ; après ci | H29 |
| y | comptes du cabinet | la main du responsable | 3 | H58 |
| z | mineurs, garde d'âge (seuil 18 ans acquis par D-284 §4 ; garde = date demandée à la connexion, lot (h) de H26) | la main du responsable | 0 | F45 |
| aa | courrier de remboursement | la main du responsable | 0 | F55 |
| ab | EF-0, trancher Q3 | la main du responsable | 0 | H14 |
| ac | radar sans zéro | la main du responsable | 0 | H12 |
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
| ap | bibliothèque pédagogique | la main du responsable | 10, place 10 | H82 |
| aq | contrôle bloquant des modifications cliniques | registre | 1 | H21 |
| ar | montée de version datée des briques | registre | 1 | H22 |
| as | fiche signalétique, date de naissance | la main du responsable | 10, place 6 | F45 |
| at | date de naissance lue par l'extraction | registre ; texte patient de la main du responsable | 1 au plus tôt [Hypothese] | F45 |
| au | drapeaux du sommeil à l'écran | la main du responsable | 3 au plus tôt [Hypothese] | H56 |
| av | contenu biologique du document médecin | la main du responsable | 0 | F33 |
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
| ca | cadrage de la refonte du sommeil | la main du responsable | 0 | H17 |
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
| co | réexamen de l'AIPD | la main du responsable (conclusion) | 0 [Hypothese] | F68 |

### D-xxx de lot et de fonction (biologie)

| D-xxx | objet | rang | fiche |
|---|---|---|---|
| de l'effectif | effectif de masquage, motivé (valeur fixée par sa D-xxx) | 0 [Hypothese] | F25 |
| de BP-09 | amende D-124 §3 ; la condition « premier import » sort des préalables | 2 | F03 |
| de BP-12a, BP-11, BP-13, BP-15, BP-04 | fiches d'usage ; constats ; données physiologiques ; décisions de parcours ; attente typée | 4 | F05, F06, F07, F08, F16 |
| de BP-12b, BP-14, BP-17, BP-18a, BP-18b, BP-05, BP-16 | positions signées ; identité d'auteur ; bibliothèque ; niveau 3 figé ; protocole personnalisé ; contexte de prélèvement ; boucle d'exploration | 5 | F09, F10, F11, F12, F13, F20, F17 |
| de BP-20, BP-24, BP-27, des indications v2 | suivi factuel ; conformité ; évaluateur par marqueur ; re-signature en v2 | 6 [Hypothese] | F18, F21, F27, F53 |
| de BP-08, BP-21a, BP-19, BF-9, par fonction | indicateurs ; ouverture J1 ; stratégie proposée ; statut « demandé » ; étage 2 et marches 2 à 4 | 7 [Hypothese] | F19, F22, F28, F62, F29, F30 |
| de BP-21b, BP-22 | ouverture du protocole personnalisé ; observation | 8 [Hypothese] | F23, F24 |
| par parcours | phase 5 par situation | 9 [Hypothese] | F31 |
| du correctif de la charge, si D-273 change | une D-xxx et son fragment | 1 [Hypothese] | F76 |
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
| K-05a et D4 | liste fermée et déclaration des sites IA (porte 5) | la main du responsable | 0 | F46 |
| échelle E4 | échelle E4 de l'adhésion, tranchée avec la signature M-2 | la main du responsable | 2 | H32 |
| de produit pour la frise | frise de J3-base | la main du responsable | 4 [Hypothese] | H61 |
| du lot 3 de D-281 | exclure ou non l'action d'orientation médecin de la liste proposée au patient — **tranchée le 2026-10-14 : exclue, avec toute orientation vers le médecin et toute prise de sang** | la main du responsable | 1 | F66 |
| du repère du 2027-06-30 | statut de repère légal pour J3-mineurs, à confirmer | la main du responsable | 10 [Hypothese] | H79 |

### Signatures et approbations

| geste | objet | rang | fiche |
|---|---|---|---|
| M-1 | signature de SAF-EI-01 amendée | 3 | F66 |
| M-2 | doctrine du cockpit chiffré (porte 6) | 2 | F59 |
| M-3 | 8 liaisons NABM | 1 | F54 |
| M-5 (1/2) | signatures de BP-07 (posées dans le lot, #1435, #1438) | 2 | F02 |
| M-5 (2/2) | approbation de la release-db de BP-09 | 3 | F03 |
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
