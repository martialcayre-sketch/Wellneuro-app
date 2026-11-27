# Réconciliation de l'audit des 12 besoins avec les décisions

- **Objet** : chaque constat ou recommandation de l'audit des 12 besoins
  (lettre w, `D-312`), avec son sort et une référence vérifiée sur
  `origin/main` (`a43cac11`, relu le 2026-11-27).
- **Source de l'audit** : la page privée « Audit des 12 besoins », hors dépôt
  (sections 1 à 12, état du 2026-11-25). Ce document en reprend les seuls
  identifiants et mécanismes ([[D-251]] §4) : aucun texte de claim, de fiche
  ni de passage, aucun seuil, aucune valeur, aucun compte de production.
- **Lot** : `besoins-reconciliation-audit` (file D), premier des six lots de
  réconciliation inscrits sur la réponse à la question `20261127-2046-b`.
- **Ne décide rien** : aucune décision, aucun code, ni le guide ni le registre
  des sources ne changent ici.

## Lecture

- **Sort** :
  - **fait** : une décision acceptée ou un lot mergé traite le constat ;
  - **abandonné par décision** : une décision écarte la recommandation ou
    assume l'écart ;
  - **renvoyé** : une fiche du plan ou une lettre porte la suite, sans lot
    livré ;
  - **sans suite** : aucune trace trouvée sur `origin/main` ; aucune
    conjecture.
- **Référence** : `D-xxx §n` (registre `docs/decisions/`) ou
  `fichier:ligne` sur `origin/main`. « Audit §n » renvoie à la section de la
  page privée d'où vient la ligne.
- Une ligne couvre un constat. Un constat traité en partie a deux lignes, une
  par sort.

## 1. Mesure

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| M-01 | §1, §10.2 | Besoins 2, 6, 7, 11 sans source : couverture `null`, jamais 0 | fait | `web/src/lib/equilibre/constants.ts:363` (2), `:399-400` (6, 7), `:417` (11) ; `D-566`, `D-569`, `D-570` (titres : 6, 7, 11 restent « non mesuré ») |
| M-02 | §10.3, §10.5 n° 1, §10.6 A8 | Un sous-score partiel mesure les besoins 5 (activité), 8, 10, 12 | fait | `D-329` §1 ; `web/src/lib/equilibre/score.ts:107` |
| M-03 | §10.7 (Codex) | Le besoin 10 moyenne les seuls axes répondus | fait | `D-329` §1 (même garde que M-02) |
| M-04 | §10.7 (Codex) | Le snapshot clinique et les API d'équilibre ne jugent pas la même complétude | fait | `D-329` §2 (cas audité fermé) |
| M-05 | §10.7, `D-329` §2 | Résidu : snapshot sur la passation entière, routes sur les items lus | renvoyé | `D-329` §2 (« le choix revient à un lot qui tranchera la complétude de l'agenda dans le snapshot ») ; aucun lot inscrit trouvé |
| M-06 | §10.3, §10.5 n° 3, §10.6 A2 | Dénominateur de la PSS-10 : couverture bornée sous 1 | fait | `D-552` §2 ; `web/src/lib/equilibre/constants.ts:410` (`min` déclaré) |
| M-07 | §10.4, §10.5 n° 4, §10.6 A1 | Besoins 1 et 3 : double compte des quatre items du rythme | fait | `D-516` §2 ; `D-548` §2 ; `web/src/lib/equilibre/constants.ts:360` |
| M-08 | §10.5 n° 3 | Aucun garde ne compare les `max` littéraux de `BESOIN_SOURCES` aux barèmes | fait | besoin 1 : `web/src/lib/equilibre/formeAlimentaireServie.guard.test.ts:46` ; besoin 9 : `D-552` §4 |
| M-09 | §10.5 n° 3 | Même garde pour les autres sources | sans suite | aucun garde général trouvé sous `web/src/lib/equilibre/` |
| M-10 | §11 (D-403 §6), §10.2 | Enquête alimentaire incomplète scorée dès une réponse (écart à rapprocher entre `D-403` §6 et §10.2) | fait | `D-517` (score non calculé dès qu'un item manque ; ni besoin 1 ni besoin 3) |
| M-11 | §10.2, §10.5 n° 5 | Besoin 9 : la source SIIN n'est jamais exploitable ; trois sources à cotations hétérogènes | fait | `D-541` §5 ; `D-548` §2 ; `web/src/lib/equilibre/constants.ts:410` (PSS-10 seule) |
| M-12 | §2, §9 Q5 | Instruments servis sans équivalent exact au guide : chaque dossier tranche | fait | besoin 4 : `D-526` §2 ; besoin 5 : `D-529` ; besoin 8 : `D-567` ; besoin 9 : `D-541` ; besoin 10 : `D-568` ; besoin 12 : `D-565` |
| M-13 | §10.10 (décision 4 c du 2026-10-18) | Besoin 12 porté par un proxy issu du guide | fait | `D-565` ; `web/src/lib/equilibre/constants.ts:426` |
| M-14 | §10.10 (décision 3 du 2026-10-18) | Besoin 8 sur la seule HAD-D | fait | `D-567` ; `web/src/lib/equilibre/constants.ts:401` |
| M-15 | §2, §7 (troisième risque) | Biomarqueurs du guide non lus par le score | renvoyé | fiche F32 (`docs/claude/PLAN_WELLNEURO.md:2521`, gelée, déclencheur : une décision amendant `D-122`) |
| M-16 | §2, §7 | Biomarqueurs du besoin 1 : lecture hors score | fait | `D-516` (deux biomarqueurs en constats séparés, au cockpit ; le troisième non évalué) |
| M-17 | §2, §5 (C3), §11 (D-402) | Aucune psychométrie documentée ; aucune donnée test-retest pour les versions servies | abandonné par décision | `D-402` (écarts minimaux déclarés paramètres techniques, faute de données) |
| M-18 | §10.5 n° 5 | La production porte peu de passations ; un seul jalon de mesure | sans suite | constat de données, sans geste attendu ; aucune trace |
| M-19 | §10.4, §10.6 A6 | Momentum du portail : la référence n'est pas le « dernier bilan » | fait | `D-397` §1 (une seule date de départ, l'ancre du cycle courant) ; `web/src/app/api/praticien/equilibre/route.ts` cite `D-397` |

## 2. Règles et seuils

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| R-01 | §1 n° 6, §9 Q4 | Seuils du guide non sourcés : retirés, réintroduits par le dossier qui les fonde | fait | sections réécrites : `D-516`, `D-526`, `D-529`, `D-541`, `D-564` à `D-570` ; `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md:28`, `:74`, `:102`, `:134`, `:173`, `:200`, `:219`, `:242`, `:281`, `:305`, `:326` |
| R-02 | §9 Q4, §10.4 | Même retrait pour la section du besoin 2 | sans suite | `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md:64` (règle de décision d'origine, section non réécrite) |
| R-03 | §10.5 n° 3, §10.6 A10 | Fondations critiques, seuil d'effondrement et plafond du total sans décision qui les fonde | abandonné par décision | `D-547` §1 (retirés) ; `web/src/lib/equilibre/constants.ts:327` |
| R-04 | §7 (deuxième risque), §3 couche 1 | `needIds` des règles écrits à la main : un besoin redéfini ne déplace aucune règle | fait | `D-453` (chaque condition rattachée au besoin qu'elle documente) |
| R-05 | §11 (D-453) | Écart nommé : axes du DNST rattachés à d'autres besoins en convergence qu'au score | abandonné par décision | `D-453` (écart assumé par la décision) |
| R-06 | §1 n° 3, §3 couche 1 | Besoins 10 et 12 nourris sans règle de code fondée sur un claim | abandonné par décision | `D-568` (règle du guide non signable, non appliquée) ; `D-565` (idem) |
| R-07 | §10.4 | Palier « bien couvert » du portail sans source externe | fait | `D-403` §5 (repère du cabinet, déclaré) |
| R-08 | §12 (besoin 4) | Grille servie de l'hyperexcitabilité sans provenance | fait | `D-526` §3 (point 2) et §5 ; `web/src/lib/clinical/bandesBesoin4.ts:3` |
| R-09 | §10.4 | Aucune règle d'orientation ne se déclenche sur une couverture de besoin | sans suite | constat confirmé (§10.6 A7) ; aucune décision ne le change |

## 3. Poids et bandes

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| P-01 | §1 n° 6, §5 (C6), §9 Q3, §12 n° 3 | Parts 60/20/20 entre strates sans motif | abandonné par décision | `D-547` §1, §2 (parts retirées, moyenne directe des besoins mesurés) ; `web/src/lib/equilibre/constants.ts:327-337` |
| P-02 | §5 (C6), §11 (D-403 §1) | Poids égal des besoins dans une strate sans motif | fait | `D-403` §1 ; puis `D-547` §2 (égalité entre besoins, convention de modèle déclarée) |
| P-03 | §10.5 n° 3, §10.6 A10 | `constants.ts` présentait parts et mapping comme « décision actée » contre `D-312` §3 | fait | `web/src/lib/equilibre/constants.ts:327-337` (commentaire réécrit sur `D-547`) |
| P-04 | §10.6 A9, A10 | Poids 2:1 du repos et regroupement du besoin 5 sans `D-xxx` | fait | `D-438` §2 (parts du repos à quatre sources) |
| P-05 | §1 n° 6, §6, §8, §10.4 | Momentum par besoin : aucune bande de bruit signée, qualification `null` | renvoyé | `D-402` (pas de bande par besoin) ; fiche H13, lettre v (`docs/claude/PLAN_WELLNEURO.md:421`) ; `web/src/lib/equilibre/momentumParBesoin.ts:61` (table vide, non publiée) |
| P-06 | §10.4, §10.6 A6 | Momentum global : la tendance est le signe du delta, sans bande | renvoyé | fiche H13, lettre v (`docs/claude/PLAN_WELLNEURO.md:421`) ; `web/src/lib/equilibre/momentum.ts:44` |
| P-07 | §7 (premier risque), §9 Q3 | Un seul changement de version du score, à la signature du guide | abandonné par décision | `D-548` §4 (un changement dès la vague 1, puis un par dossier signé) |
| P-08 | §11 (D-403 §2 à §4) | Bornes, planchers et bandes de l'indice de l'agenda du sommeil | fait | `D-403` §2, §3, §4 |

## 4. Preuves

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| E-01 | §1 n° 2, §3 couche 2, §9 Q2 | Aucun lien claim → besoin en base | fait | `D-321` (clés `besoins` et `rubrique`) ; `docs/claude/PLAN_WELLNEURO.md:486` (J3-12c, fait) |
| E-02 | §9 Q2 bis | Forme de la clé : besoins servis et rubrique de la chaîne d'usage | fait | `D-321` §5 (de `D-312`) |
| E-03 | §3 couche 2 | Tables de liaison analyte ↔ cible et de règles cliniques vides en base | sans suite | aucune trace sur `origin/main` |
| E-04 | §1 n° 4, §4, §9 Q1 | Aucun dossier de preuve complet ; ordre des douze arbitré | fait | sections signées : `D-516` (1), `D-526` (4), `D-529` et `D-538` (5), `D-541` (9), `D-564` (3), `D-565` (12), `D-566` (6), `D-567` (8), `D-568` (10), `D-569` (7), `D-570` (11) |
| E-05 | §4, §9 Q1 bis | Besoin 2 : liste fermée de dix sous-dossiers | fait | journal H15 (`docs/claude/plan-journal/H15/`), déclaration « besoin 2 achevé, avec réserves » (#2020, reprise au §11 de l'audit) |
| E-06 | §4, §9 Q6 | Fibres, prébiotiques, probiotiques au besoin 4 | fait | `D-526` §7 (fiche d'usage dégelée à la clôture du dossier du besoin 4) |
| E-07 | §7 (troisième risque), §12 | Le besoin 2 reste hors score après son dossier | fait | `D-554` (vue d'exploration hors score, trois états en mots) ; F32 pour le score (M-15) |
| E-08 | §10.10 (décision 6 du 2026-10-18) | Ingestion des sources de mesure en accès libre | fait | `docs/claude/PLAN_WELLNEURO.md:489` (J3-12e) |
| E-09 | §1 n° 5, §5 (C2), §10.5 n° 2, §10.6 A3 | Niveaux de preuve affichés sans validation | fait | `D-424` ; `D-332` (badges masqués) ; `web/src/lib/equilibre/constants.ts:459` |
| E-10 | §10.5 n° 2, §10.6 A11, §10.7 | Règle « le plus faible des sources » : plus d'instruments remplis, grade plus bas | abandonné par décision | `D-438` §4 (règle sans dilution gardée) ; `web/src/lib/equilibre/evidence.ts:6` |

## 5. Interface

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| I-01 | §8 n° 5, §10.4, §10.6 A4 | Radar du cockpit : `null` dessiné à 0 | fait | `D-301` ; `D-550` §1, §2 ; `web/src/components/ui/scoreRadarPoints.ts:1` |
| I-02 | §10.4, §10.7 | Un seul besoin mesuré suffit à produire un total, sans mention de ce qui manque | fait | `D-329` §3 ; `web/src/components/patient/MonEquilibreAccueil.tsx:104` ; `web/src/components/DetailBesoinsPanel.test.tsx:289` |
| I-03 | §10.4, §10.5 n° 6 | « Points à explorer » : tri automatique des trois besoins les moins couverts | fait | `D-355` §1 (exception nommée et bornée) ; `web/src/components/patient/MonEquilibreAccueil.tsx:107` |
| I-04 | §10.5 n° 6, §10.6 A5 | Le patient reçoit des grandeurs sans chiffre (JSON, arc, opacité) | sans suite | aucune décision nommant ce constat trouvée ; `D-333` fixe la règle du portail sans chiffre |
| I-05 | §10.4 | Cercles concentriques : écart d'opacité à peine visible entre `null` et une couverture nulle | sans suite | aucune trace |
| I-06 | §8 n° 2 | Carte de provenance par besoin | renvoyé | J3-12b (`docs/claude/PLAN_WELLNEURO.md:490`, état « attente ») |
| I-07 | §8 n° 4 | Vue des claims par besoin dans l'atelier du corpus | sans suite | clés posées (E-01), aucun filtre par besoin trouvé sous `web/src/components/corpus/` |
| I-08 | §8 n° 3 | Momentum par besoin avec sa bande | renvoyé | fiche H13, lettre v (P-05) |
| I-09 | §12 | Constat du praticien sur un besoin sans score | fait | `D-551` ; `D-553` |

## 6. Gouvernance

| n° | Audit | Constat ou recommandation | Sort | Référence |
|---|---|---|---|---|
| G-01 | §1 n° 5, §7, §12 | Les besoins ne pilotent ni protocole, ni orientation, ni IA | renvoyé | trous nommés sans lot CB-13, CB-14 (`docs/claude/PLAN_WELLNEURO.md:796`) |
| G-02 | §7 (synthèse IA), §12 | La synthèse ne reçoit pas les besoins | fait | `D-462` (bloc des besoins mesurés et non mesurés, sans valeur) ; `web/src/lib/synthese/blocBesoins.ts:1` |
| G-03 | §7 (orientation) | Axe de convergence de l'orientation | fait | `D-450`, `D-453` (l'axe est le besoin documenté) |
| G-04 | `D-312` §3, §6 | Le guide réécrit est une `D-xxx` clinique avec son fragment | fait | onze sections, une décision chacune (R-01) |
| G-05 | §12 n° 2 | La mesure n'a pas suivi les dossiers signés | fait | `D-548` (vague 1) ; `D-565` ; journal H15 `docs/claude/plan-journal/H15/2026-11-26-02-j312f-cloture-reapprobation.md` |
| G-06 | §12 n° 4, §7 (premier risque) | Le changement de version éteint les protocoles diffusés : réapprobation | fait | `docs/claude/plan-journal/H15/2026-11-26-02-j312f-cloture-reapprobation.md` |
| G-07 | §6, §8 n° 1 | Page de suivi des dossiers hors dépôt, indicateurs par besoin | sans suite | aucune trace au dépôt (la page vit hors dépôt) |
| G-08 | §6, `D-312` §4 | J3-12b (onglet « Les 12 besoins ») suit le guide signé, rien avant | renvoyé | `docs/claude/PLAN_WELLNEURO.md:490` (J3-12b, état « attente ») |
| G-09 | §12 n° 3 | Le verrou restant de J3-12f : le motif ou les parts 60/20/20, de la main du responsable | fait | `D-547` (répond à `D-516` §6) |

## Limites

- La section 11 de l'audit (décisions du 2026-11-01 au 2026-11-25) est un
  report du registre ; seules ses lignes qui nomment un constat ou un écart
  entrent ici.
- « Sans suite » dit qu'aucune trace n'a été trouvée sur `origin/main` par
  recherche dans `docs/decisions/`, `docs/claude/PLAN_WELLNEURO.md`, le
  journal H15 et `web/src/`. Ce n'est pas un verdict sur le fond.
- L'application au code n'est citée que là où elle a été lue ; une décision
  citée seule n'affirme rien de son application.
