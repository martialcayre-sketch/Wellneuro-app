# Instruments des 12 besoins

- **Objet** : pour chaque besoin, l'instrument servi au score, celui que vise
  le guide, l'écart, le niveau de preuve, la psychométrie documentée, le sort
  des seuils du guide, les droits connus et le statut ; puis les instruments
  sortis du calcul ou gardés en repère, et les instruments nommés sans être
  servis. Relu sur `origin/main` (`7751caad`, le 2026-11-27).
- **Sources lues** : `web/src/lib/equilibre/constants.ts` (`BESOIN_SOURCES`,
  `NIVEAU_PREUVE_PAR_SOURCE`), `docs/claude/corpus/instrument_registry.json`
  (v2), `docs/claude/corpus/measurement_evidence.json` (v1),
  `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md`, [[D-402]], [[D-424]],
  [[D-516]], [[D-526]], [[D-529]], [[D-541]], [[D-548]], [[D-564]] à
  [[D-570]], et les décisions qu'elles citent et que les tableaux renvoient
  ([[D-042]], [[D-117]], [[D-438]], [[D-538]], [[D-542]], [[D-543]],
  [[D-552]]).
- **Lot** : `besoins-inventaire-instruments` (file D), troisième des six lots
  de réconciliation inscrits sur la réponse à la question `20261127-2046-b`.
  Fait suite à `PIECES_ATTENDUES.md`.
- **Ne décide rien** : aucune décision, aucun code ; ni le registre des
  instruments ni la table des niveaux ne changent ici.
- **Forme opaque** ([[D-251]] §4) : noms d'instruments, clés et mécanismes
  seulement. Aucun item n'est reproduit, aucune bande ni aucun seuil n'est
  recopié.

## Lecture

- **Abréviations de référence** :
  - `C:n` : `web/src/lib/equilibre/constants.ts`, ligne n ;
  - `IR:n` : `docs/claude/corpus/instrument_registry.json`, ligne n ;
  - `ME:n` : `docs/claude/corpus/measurement_evidence.json`, ligne n ;
  - `G:n` : `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md`, ligne n.

  Tous les numéros de ligne valent sur `7751caad` ; un fichier modifié
  depuis se relit à ce commit (`git show 7751caad:<fichier>`).
- **Sens** : « inversé » quand `inverser: true` (un score plus haut couvre
  moins le besoin), « direct » sinon.
- **Instrument visé par le guide** : ce que nomment les « Variables d'entrée »
  de la section du guide sur `origin/main`.
- **Niveau** : la table signée de [[D-424]] (A, B, D), un niveau par clé ; le
  besoin porte celui de sa source la plus faible (`C:459-466`), parmi les
  sources **effectivement répondues** par le patient
  (`web/src/lib/equilibre/evidence.ts:6-9`). Le niveau d'un besoin n'est donc
  pas fixe : au besoin 5, il vaut D dès que l'agenda est répondu, et B quand
  le mouvement l'est sans l'agenda. Les tableaux donnent le niveau de chaque clé.
- **Psychométrie** : la valeur `cosmin` du registre ; la ligne de [[D-402]] §2
  (fidélité test-retest, G-10) ; les études de `measurement_evidence.json`.
- **Statut** : *mesuré* (une source au score), *non mesuré* (liste vide :
  couverture `null`, jamais 0), *hors score* (servi ou décrit, sans entrer au
  calcul).

## 1. Instruments servis, par besoin

### 1a. Mesure

| Besoin | Instrument servi (clé, sous-score, max, sens) | Instrument visé par le guide | Écart | Niveau | Statut |
|---|---|---|---|---|---|
| 1 | Enquête alimentaire SIIN, `Q_ALI_01`, tout le barème sauf `RYTHME_CHRONO`, max dérivé (`MAX_MESURE_DERIVEE_ALIMENTAIRE`), direct — `C:360` | la même mesure dérivée, forme complète ; deux biomarqueurs à part (`G:31-35`) | aucun pour le questionnaire ; sous la forme courte, aucune source (`C:309`, [[D-516]] §6.2) ; biomarqueurs hors couverture ([[D-548]] §2.2) | B (`C:468`) | mesuré |
| 2 | aucun — `C:363` | biomarqueurs seulement (`G:53-55`) | aucun questionnaire ne mesure le besoin ; Pichot retiré en v4 (`G:56-63`) | — | non mesuré |
| 3 | Enquête alimentaire SIIN, `Q_ALI_01`, sous-score `RYTHME_CHRONO`, max dérivé (`MAX_RYTHME_CHRONO`, `C:284`), direct — `C:369` | le même sous-score, quatre items (`G:75-80`) | aucun ; aucune correspondance de construit établie avec les stratégies de rythme ([[D-564]] §3.2) | B (`C:468`) | mesuré |
| 4 | TFD SIIN 2021, `Q_GAS_01`, total, 93, inversé — `C:371` | `Q_GAS_01` et `Q_INF_01` (`G:105-107`) | douleur et conscience intéroceptive : variables du besoin sans instrument servi (`G:108-109`, [[D-526]] §2.2) | B (`C:472`) | mesuré |
| 4 | Hyperexcitabilité SIIN, `Q_INF_01`, total, 96, inversé — `C:372` | idem | idem | B (`C:473`) | mesuré |
| 5 | Mode de vie SIIN, `Q_MOD_01`, `ACTIVITE_PHYSIQUE`, 20, direct, groupe mouvement — `C:385` | ce sous-score ; le GPAQ en est la référence publiée, non servie (`G:137-140`) | le GPAQ ne valide pas le sous-score ([[D-529]] §2.1) ; mobilité non évaluée (`G:143`) | B (`C:475`) | mesuré |
| 5 | PSQI, `Q_SOM_01`, total, 21, inversé, repos, poids 2 — `C:386` | PSQI (`G:140`) | aucun | A (`C:474`) | mesuré |
| 5 | Agenda du sommeil 21 nuits, `Q_SOM_09`, indice, 100, direct, repos, poids 1 — `C:391` | agenda, niveau D (`G:140-141`) | l'indice composite n'est pas l'objet du dossier ([[D-529]] §2.2) | D (`C:483`) | mesuré |
| 5 | Epworth, `Q_SOM_02`, total, 24, inversé, repos, poids 1 — `C:396` | Epworth (`G:141`) | aucun | A (`C:487`) | mesuré |
| 5 | MFI-20, `Q_SOM_07`, `GEN` seul, min 4, max 20, inversé, repos, poids 1 — `C:397` | fatigue générale du MFI-20 (`G:141-142`) | quatre autres dimensions décrites sans être lues ([[D-529]] §2.2) ; écart de structure de la clé servie avec la validation publiée de la traduction servie ([[D-542]] §1, §2) | A (`C:488`) | mesuré |
| 6 | aucun — `C:399` | aucune source de score (`G:174-179`) | instruments décrits, hors score (partie 3) | — | non mesuré |
| 7 | aucun — `C:400` | aucune source de score (`G:201-204`) | « contacts sensoriels » non définis ([[D-569]] §2) | — | non mesuré |
| 8 | HAD, `Q_NEU_11`, sous-score `D`, 21, inversé — `C:401` | HAD-D, seule source (`G:220-223`) | n'est pas une mesure de l'anhédonie au sens large ([[D-567]] §2.1) | A (`C:489`) | mesuré |
| 9 | PSS-10, `Q_STR_02`, total, min 10, max 50, inversé — `C:410` | PSS-10, seule source (`G:246-247`) | correspondance de la traduction servie avec l'une des deux cotations : décision distincte ([[D-541]] §2.1, [[D-552]]) | A (`C:493`) | mesuré |
| 10 | DNST SIIN, `Q_INF_03`, sous-scores `DA`, `NA`, `SE`, 40 chacun, inversés — `C:413-415` | `Q_INF_03`, DA, NA, SE (`G:282-286`) | aucune mesure publiée servie ([[D-568]] §2.1) | B (`C:494`) | mesuré |
| 11 | aucun — `C:417` | aucune source de score (`G:306-309`) | aucun instrument des valeurs au dossier ([[D-570]] §2) | — | non mesuré |
| 12 | Mode de vie SIIN, `Q_MOD_01`, `RELATION_AUX_AUTRES`, 20, direct — `C:426` | ce sous-score (`G:327-332`) | aucune correspondance établie avec les mesures publiées ([[D-565]] §2.2) | B (`C:475`, un niveau pour les besoins 5 et 12, [[D-424]] §2) | mesuré |

### 1b. Psychométrie, seuils, droits

| Instrument (besoin) | `cosmin` | Fidélité test-retest (G-10) | Études de `measurement_evidence` | Seuils du guide | Droits connus |
|---|---|---|---|---|---|
| `Q_ALI_01` (1) | inconnu (`IR:2662`) | aucune donnée ; écart minimal technique, [[D-402]] §2 A1 | aucune | règle à tranche et « ou » retirée (`G:36-39`, [[D-516]] §3.1, §3.3) | permission obtenue, référentiel SIIN, 2026-07-25 (`IR:2657`) |
| — (2) | — | — | — | seuil biologique du guide d'origine, section non réécrite (`G:64-66`) ; aucune décision dans ce périmètre | — |
| `Q_ALI_01` `RYTHME_CHRONO` (3) | inconnu (`IR:2662`) | aucune donnée ; [[D-402]] §2 A2 | aucune | règle non signable, retirée et non appliquée ([[D-564]] §1) ; sous-score lu comme avant ([[D-564]] §3.1) | idem `Q_ALI_01` (`IR:2657`) |
| `Q_GAS_01` (4) | inconnu (`IR:1621`) | aucune donnée ; [[D-402]] §2 A8 (version et maximum à vérifier) | aucune | barèmes de la pièce pro transcrits, convention de frontière signée ([[D-526]] §3.1) ; règle de séquence retirée (`G:118-119`) | permission obtenue, 2026-07-25 (`IR:1616`) |
| `Q_INF_01` (4) | inconnu (`IR:1389`) | aucune donnée, « pas fait l'objet d'évaluation » ([[D-402]], contexte) ; A3 | aucune | grille servie alignée sur la pièce pro ([[D-526]] §3.2) | permission obtenue, 2026-07-25 (`IR:1384`) |
| `Q_MOD_01` `ACTIVITE_PHYSIQUE` (5) | inconnu (`IR:2528`) | aucune donnée ; [[D-402]] §2 A4 | aucune | aucun déclenchement sur un seuil ; indicateurs du GPAQ de population ([[D-529]] §3.1, §3.5) | permission obtenue, 2026-07-25 (`IR:2523`) |
| `Q_SOM_01` (5) | inconnu (`IR:965`) | littérature à vérifier ; [[D-402]] §2 A9, provisoire | aucune | deux lectures : publiée en référence, servie sans source ([[D-529]] §3.2) ; bornes de [[D-538]] §5 | permission obtenue, 2026-07-29 (`IR:960`) |
| `Q_SOM_09` (5) | inconnu (`IR:1329`) | aucune bande, différée ([[D-402]] §2 A10) | aucune | aucun seuil publié ; indice niveau D (`C:476-483`) | libre, 2026-07-30 ; rapprochement servi-pièce non instruit (`IR:1324`) |
| `Q_SOM_02` (5) | inconnu (`IR:1019`) | absent de [[D-402]] §2 (entré par [[D-438]] §1) | aucune | deux lectures : plage normale publiée en référence, grille du cabinet sans source ([[D-529]] §3.3) | permission obtenue par décision du praticien, contre l'avis consigné, 2026-07-30 (`IR:1014`) |
| `Q_SOM_07` `GEN` (5) | inconnu (`IR:1271`) | absent de [[D-402]] §2 (entré par [[D-438]] §1) | aucune | aucun barème signé ni servi ([[D-529]] §3.4) | permission obtenue, 2026-07-29 (`IR:1266`) |
| `Q_NEU_11` `D` (8) | inconnu (`IR:859`) | impossible selon la validation française ([[D-402]], contexte) ; A5, provisoire | cohérence interne et structure, `WN-SRC-0545` (`ME:71-96`) | seuil de la HAD-D « non évalué pour cet usage », règle non signable ([[D-567]] §1) | permission obtenue par décision du praticien, contre l'avis consigné, 2026-07-30 (`IR:854`) |
| `Q_STR_02` (9) | inconnu (`IR:77`) | absent de [[D-402]] §2 ; complément dû après J3-12f ([[D-402]], « Ce que la décision ne fait pas ») | cohérence interne et structure, `WN-SRC-0540` (`ME:45-70`) | grille du total : lecture du cabinet, aucune bande créée ([[D-541]] §3.2) ; règle « protocole d'urgence » retirée (`G:262-264`) | permission obtenue, 2026-07-29 (`IR:72`) |
| `Q_INF_03` `DA`, `NA`, `SE` (10) | inconnu (`IR:1479`) | aucune donnée ; [[D-402]] §2 A6 | aucune | trois jeux de bornes internes, aucun retenu ; seuil du guide « non évalué pour cet usage » ([[D-568]] §3.4) | permission obtenue, 2026-07-25 (`IR:1474`) |
| — (6, 7, 11) | — | — | — | règles non signables, retirées et non appliquées ([[D-566]] §1, [[D-569]] §1, [[D-570]] §1) | — |
| `Q_MOD_01` `RELATION_AUX_AUTRES` (12) | inconnu (`IR:2528`) | aucune ligne ; A7 portait `ME`, provisoire, retirée au changement de source ([[D-402]] §2) | aucune | règle « déconnexion » non signable, retirée ([[D-565]] §1) | idem `Q_MOD_01` (`IR:2523`) |

## 2. Instruments sortis du calcul et repères hors score

### 2a. Sortis du calcul

| Instrument | Besoin quitté | Décision | Lu encore | Étapes ouvertes |
|---|---|---|---|---|
| Pichot, `Q_SOM_06` (`IR:1201`, `sourceMonEquilibre: false` `IR:1232`) | 2 (v4, 2026-07-27) | note v3 → v4 (`C:361-362`, `G:56-63`) | non au score ; le cours lui préfère le MFI, il reste hors du besoin 5 ([[D-529]] §3.9) | aucune trouvée |
| SIIN stress, `Q_STR_01` (`IR:7`, `IR:38`) | 9 | [[D-541]] §5.1, [[D-548]] §2.5 | repère du cabinet, hors score ([[D-541]] §2.2) | lignes de règle du stress suspendues ([[D-543]]) |
| Cungi, `Q_STR_03` (`IR:97`, `IR:128`) | 9 | [[D-541]] §5.1, [[D-548]] §2.5 | repère du cabinet, bandes sans source ([[D-541]] §2.2) | bandes sans source (`IR:135`) |
| DNST, sous-score `ME` (`Q_INF_03`) | 12 | [[D-565]] §5 (`C:418-425`) | n'alimente plus aucun besoin (`G:284-285`) | répartition de ses items à confirmer au code ([[D-565]] §8) ; validité de l'axe non évaluée ([[D-568]] §4) |

### 2b. Gardés en repère hors score

| Instrument | Besoin | Décision | Étapes ouvertes |
|---|---|---|---|
| Horne (MEQ), `Q_SOM_05` (`IR:1149`) | 5, rythme biologique | [[D-529]] §2.3 ; grille d'origine avec note ([[D-538]]) | validation au dossier privé ([[D-529]] §7) |
| DASS-21, `Q_STR_04` (`IR:154`) | 9 | [[D-541]] §2.3, §3.4 | formulation de trois items ([[D-548]] §3) |
| BMS-10, `Q_STR_05` (`IR:205`) | 9 | [[D-541]] §2.3, §3.3 | affichage des deux libellés ([[D-548]] §3) ; publication primaire de la grille ([[D-541]] §7) |
| Karasek, `Q_STR_06` (`IR:250`) | 9 | [[D-541]] §2.3 | items supplémentaires ([[D-548]] §3) |
| WART, `Q_STR_08` (`IR:301`) | 9 | [[D-541]] §2.3, §3.5 | aucune nommée |
| SIIN stress et Cungi | 9 | partie 2a | partie 2a |

Aucun de ces instruments n'a de table de niveau de preuve signée
([[D-541]] §2.3) ; tous portent `cosmin: inconnu` au registre.

## 3. Instruments nommés et non servis

| Instrument | Où il est nommé | Décision qui en parle |
|---|---|---|
| TFI | `docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md:200`, `docs/claude/campagnes/SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md:243` (lu sur `Q_GAS_01`) ; absent du guide et de son historique | aucune |
| GPAQ (OMS) | `G:139`, `G:153` | [[D-529]] §2.1, §3.5 (référence publiée, non servie, ne valide pas le sous-score) |
| NAP | journal H15, `docs/claude/plan-journal/H15/2026-11-14-07-dossier-besoin-5-lecture-corpus.md:11` | aucune |
| EVA de bien-être au travail et social | ancienne section du besoin 12 (guide avant `97e0d72`) | aucune ; la section qui la nommait est remplacée ([[D-565]] §1) |
| Questionnaire Mélatonine | ancienne section du besoin 12 (guide avant `97e0d72`) ; axe `ME` du DNST ([[D-042]]) | [[D-565]] §2.1, §5 (`ME` quitte le besoin) ; [[D-568]] §4 (validité de l'axe non évaluée) |
| Mobilité | `G:143` | [[D-529]] §2.5, §4 (non évaluée ; instrument retenu pour instruction seule, droits et version française à obtenir) ; [[D-117]] (axe écarté) |
| Douleur, intéroception (4) | `G:108-109` | [[D-526]] §2.2, §4 ; usage logiciel de l'instrument d'intéroception ouvert ([[D-526]] §7) |
| Besoin 6 : Nijmegen, SHAPE, LCADL, Dyspnea-12, outil du schéma respiratoire, variabilité cardiaque, oxymétrie | `G:177-179` (« mesures décrites ») | [[D-566]] §2, §3 (recouvrement avec les besoins 4 et 9 à examiner), §4 |
| Besoin 7 : H-LEA, Fr-ODQ | `G:203-204` (« instruments décrits ») | [[D-569]] §2 |
| Besoin 11 : MLQ et version française, LET-F, Freiburg Mindfulness Inventory abrégé | `G:307-308` (« instruments décrits ») | [[D-570]] §2, §3 ; droits : [[D-570]] §4 |
| Besoin 3 : questionnaire de chrononutrition, rappel du moment des repas | `G:79-80` (« instruments publiés décrits ») | [[D-564]] §2.2 (droits sans décision) |
| Besoin 8 : SHAPS, DARS | `G:222-223` | [[D-567]] §2.2 |
| Besoin 9 : régulation émotionnelle (deux échelles) | `G:250-251` | [[D-541]] §2.4 |
| Besoin 10 : PTQ, RRS forme courte | `G:286` (« aucune mesure publiée n'est servie ») | [[D-568]] §2.2 |
| Besoin 12 : solitude (trois items, UCLA, De Jong Gierveld), provisions sociales, MSPSS, connexion à la nature | `G:330-332` | [[D-565]] §2.3 (rapprochement par décision distincte, sous réserve des droits) |

## Limites

- Le registre des instruments date son audit du 2026-09-14 (`IR:3`) ; ses
  champs `cosmin` et `droits` sont lus tels quels, sans vérification à la
  source.
- « Aucune » dans la colonne des études dit que `measurement_evidence.json`
  ne porte aucune ligne pour la clé ; d'autres données peuvent exister au
  dossier privé ou au corpus.
- « Aucune trouvée » et « aucune » (partie 3) disent qu'aucune trace n'a été
  trouvée par recherche dans `docs/decisions/`, le guide et son historique ;
  ce n'est pas un verdict sur le fond.
- L'application au code n'est citée que là où elle a été lue.
