# Candidats : provenance d'une hiérarchie des besoins

- **Objet** : chercher dans la littérature indexée une provenance pour deux
  questions laissées ouvertes. (A) L'ordre d'intervention entre les quatre
  classes du guide (1 nutritionnels, 2 somatiques, 3 sensoriels et
  émotionnels, 4 psychiques), et le seuil de « déficit » d'une classe.
  (B) La pondération du total : la forme retenue le 2026-11-27 (réponse
  `20261127-2140-b`) prévoit trois strates. Les poids sont égaux dans chaque
  strate, les parts décroissent de Corps à Esprit, et Ancrage et Esprit sont
  atténués de façon continue par la base. Un repère de cabinet s'applique au
  total. Les valeurs attendent cette recherche (réponse `20261127-2150-b`).
- **Contexte** : [[D-547]] §1-§2 retire le plafonnement par fondations
  critiques. Il pose l'égalité entre besoins comme une convention de modèle,
  faute de source qui fonde une hiérarchie. [[D-526]] §1 retire la règle de
  séquence du besoin 4, faute de source. [[D-106]] avait validé les parts du
  guide sans source. Le guide
  (`docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md`, objectif, phase de
  hiérarchisation, « iceberg ») énonce la priorité des classes 1 et 2, sans
  la référencer. Les classes correspondent aux piliers 1 à 4 de
  `web/src/lib/equilibre/constants.ts` (`BESOINS`).
- **Lot** : `besoins-recherche-hierarchie` (file D, rang 139). Les deux
  volets sont livrés dans cette passe.
- **Ne décide rien** : aucune décision, aucune règle ; aucun poids, seuil,
  borne ni part n'est proposé. Pas de code, pas d'ingestion, et ni le guide
  ni [[D-547]] ne changent. Retenir une source, ou constater qu'il n'y en a
  pas, est le geste du responsable.
- **Forme opaque** ([[D-251]] §4) : identifiants seulement. Aucun titre et
  aucune valeur chiffrée (poids, seuil, coefficient, borne, effet) ne sont
  recopiés.

## Méthode

- Recherche menée le 2026-11-28 dans PubMed (E-utilities) ; textes intégraux
  libres lus dans PubMed Central ; DOI résolus par doi.org ; métadonnées des
  références hors PubMed lues dans Crossref.
- **Aucune référence de mémoire.** Une source n'est gardée que si son PMID
  existe ou que son DOI se résout, et que l'emplacement invoqué a été lu.
  Cet emplacement est le résumé PubMed, ou une section du texte intégral
  libre. Une source indexée dans PubMed dont le DOI ne se résout pas est
  gardée par son PMID quand son emplacement a été lu, et le document le
  signale : un seul cas, PMID 41333604 (texte intégral PMC lu). Une référence dont le DOI se résout mais dont rien n'a pu être lu
  (éditeur fermé au réseau cloud, aucun résumé dans Crossref) est inscrite
  comme **piste non lue**. Elle n'est pas gardée.
- Les requêtes menées, avec leur nombre de résultats, sont en annexe.

## Lecture

- **Soutient** : ce que la source appuie, au regard de la question du lot
  (ordre entre classes, seuil de déficit, pondération inégale entre
  domaines, agrégation non compensatoire, bandes sur un total).
- **Ne soutient pas** : ce que la source ne dit pas, ou contredit.
- **Emplacement** : *résumé* (résumé PubMed lu) ; *section* ou *Tableau n*
  (texte intégral libre lu dans PubMed Central).
- **Accès** : *PMC* (texte intégral libre) ou *résumé seul*.

## Synthèse

| Volet | Famille | Conclusion |
|---|---|---|
| A | 1. Hiérarchie des besoins (Maslow, vérifications, révisions) | partielles seulement |
| A | 2. Recommandations qui ordonnent les interventions | partielles seulement |
| A | 3. Essais ou revues sur l'effet de l'ordre | rien trouvé (pour l'ordre corps avant esprit) |
| A | 5. Neuronutrition : pyramide ou hiérarchie | rien trouvé |
| A | 6. Contre-preuves | contre-preuves trouvées |
| B | 4. Indices composites : pondération, agrégation, seuils, bandes | partielles seulement |

En une phrase : aucune source lue ne fonde l'ordre des quatre classes du
guide, ni un seuil de déficit de classe, ni des parts entre strates. Les
sources lues fournissent des méthodes (agrégation non compensatoire,
pondération par panel d'experts, bandes déclarées sur un total à poids
égaux), mais pas de valeurs transposables aux douze besoins.

## Volet A — ordre d'intervention et seuil de déficit

### 1. Hiérarchie des besoins

| PMID | DOI | Année | Type | Population | Soutient | Ne soutient pas | Emplacement | Accès |
|---|---|---|---|---|---|---|---|---|
| PMID 21688922 | 10.1037/a0023779 | 2011 | étude transversale internationale | adultes de nombreux pays (sondage mondial) | l'association entre la satisfaction de chaque besoin et le bien-être subjectif ; un ordre de satisfaction des besoins psychosociaux qui émerge des données | une préséance stricte : l'association de chaque besoin avec le bien-être est largement indépendante de la satisfaction des autres besoins ; l'ordre des besoins de base et de sécurité dépend du pays | résumé | résumé seul |
| PMID 21874133 | 10.1177/1745691610369469 | 2010 | revue théorique | — | le maintien d'une structure hiérarchique des motivations, révisée par la théorie évolutionniste | une validation empirique, une pondération ou un seuil ; ce sont des motivations, pas des besoins de santé | résumé | PMC |
| PMID 23858951 | 10.5406/amerjpsyc.126.2.0155 | 2013 | validation d'échelles, transversale | adultes, population générale (Macao) | la satisfaction d'un niveau prédit statistiquement celle du niveau immédiatement supérieur | un ordre causal ou d'intervention (corrélations transversales) ; une transposition aux douze besoins | résumé | résumé seul |
| PMID 28150561 | 10.1080/00221309.1983.9711513 | 1983 | étude transversale | étudiants | l'association entre la satisfaction des besoins et des mesures de santé psychologique | un ordre ou un seuil | résumé | résumé seul |
| PMID 26162161 | 10.1177/1745691610369470 | 2010 | commentaire de PMID 21874133 | — | — | la révision évolutionniste : le commentaire lui oppose le rôle de la culture | résumé | résumé seul |
| PMID 26162162 | 10.1177/1745691610369471 | 2010 | commentaire de PMID 21874133 | — | l'intérêt d'une révision de la hiérarchie | le retrait de l'accomplissement de soi de la hiérarchie | résumé | résumé seul |
| PMID 26162163 | 10.1177/1745691610369472 | 2010 | commentaire de PMID 21874133 | — | la complémentarité des niveaux d'analyse | une donnée empirique | résumé | résumé seul |

**Piste non lue** : DOI 10.1016/0030-5073(76)90038-6 (1976, revue des
travaux sur la théorie de la hiérarchie des besoins). Le DOI se résout,
mais l'article n'est pas indexé dans PubMed, Crossref ne porte pas de
résumé et l'éditeur est fermé au réseau cloud : son contenu n'a pas été lu.

**Conclusion (famille 1)** : partielles seulement. Une hiérarchie des
motivations est discutée et partiellement observée (corrélations
transversales). Aucune source lue ne fonde un ordre d'intervention clinique
ni un seuil de déficit.

### 2. Recommandations qui ordonnent les interventions

| PMID | DOI | Année | Type | Population | Soutient | Ne soutient pas | Emplacement | Accès |
|---|---|---|---|---|---|---|---|---|
| PMID 36202135 | 10.1080/15622975.2022.2112074 | 2023 | recommandation internationale (WFSBP et ASLM) | adultes avec épisode dépressif caractérisé | les interventions de mode de vie (activité physique, sommeil, alimentation, gestion du stress, etc.) comme composante « fondatrice » des soins, à laquelle les autres thérapies s'ajoutent ou se combinent | un ordre imposé. La considération de mise en œuvre n° 1 (avis d'experts, hors revue systématique) admet deux voies, le point de départ (approche séquentielle) ou l'accompagnement (approche adjuvante). Pour l'insomnie et la dépression, le traitement est concurrent ou séquentiel, au choix selon la personne. Rien ne bloque l'intervention psychologique | résumé (Conclusions) ; sections « Implementation considerations » (Tableau 3, n° 1) et « Clinical considerations » de l'insomnie | PMC |
| PMID 33353391 | 10.1177/0004867420979353 | 2021 | recommandation de pratique (RANZCP) | troubles de l'humeur | — (le résumé ne traite pas de l'ordre) | — | résumé | résumé seul |
| PMID 33320412 | 10.1111/bdi.13035 | 2020 | synthèse de PMID 33353391 (dépression) | épisode dépressif caractérisé | des « Actions » mises en œuvre dès le départ, qui regroupent mode de vie, psychoéducation et interventions psychologiques | une préséance du mode de vie sur la psychothérapie : les deux figurent ensemble dès le départ | résumé | résumé seul |
| PMID 34607616 | 10.1192/bjo.2021.1020 | 2021 | revue parapluie de recommandations | dépression de l'enfant et de l'adolescent | la présence de recommandations sur la nutrition, le sommeil et l'exercice | une base d'essais : ces recommandations relèvent de l'avis d'experts et sont surtout qualitatives | résumé | PMC |
| PMID 42976995 | 10.1016/j.jad.2026.122689 | 2027 | revue systématique de recommandations | dépression infraliminaire de l'adulte | des soins par paliers : les interventions psychosociales ou psychologiques de faible intensité viennent en premier | un ordre entre corps et esprit : l'ordre porte sur l'intensité, pas sur la classe de besoin | résumé | résumé seul |
| PMID 32931092 | 10.1002/wps.20773 | 2020 | méta-revue | troubles mentaux, plusieurs diagnostics | des données convergentes pour l'activité physique ; le sommeil comme facteur de risque | un ordre d'intervention ; les relations de causalité pour l'alimentation restent à établir | résumé | PMC |

**Conclusion (famille 2)** : partielles seulement. Des recommandations
placent le mode de vie au fondement des soins. Elles le font en parallèle
des interventions psychologiques, ou laissent l'ordre au choix clinique.
Aucune ne prescrit de traiter les besoins nutritionnels et somatiques
*avant* les besoins psychiques, ni de bloquer une intervention
psychologique, ni ne définit un seuil de déficit.

### 3. Essais et revues sur l'effet de l'ordre

| PMID | DOI | Année | Type | Population | Soutient | Ne soutient pas | Emplacement | Accès |
|---|---|---|---|---|---|---|---|---|
| PMID 34315101 | 10.1016/j.jad.2021.07.008 | 2021 | revue systématique et méta-analyse | dépression | un bénéfice des soins par paliers face aux soins usuels dans le sous-groupe aux symptômes au moins modérément sévères | un ordre entre classes : l'ordre porte sur l'intensité ; l'hétérogénéité est forte | résumé | résumé seul |
| PMID 25065653 | 10.1017/S0033291714000701 | 2015 | revue systématique et méta-analyse | dépression | un effet modéré des soins par paliers face aux soins usuels | les soins par paliers comme modèle dominant : les preuves sont jugées limitées par les auteurs | résumé | résumé seul |
| PMID 33237285 | 10.1001/jamapsychiatry.2020.3650 | 2021 | revue systématique et méta-analyse | épisode dépressif caractérisé en rémission | une réduction du risque de rechute par une psychothérapie qui suit la pharmacothérapie | un ordre entre classes de besoins : la séquence relie deux traitements psychiatriques | résumé | PMC |
| PMID 32791501 | 10.1159/000510006 | 2020 | essai randomisé | patients déprimés après syndrome coronarien aigu | l'intérêt d'une combinaison séquentielle de deux psychothérapies | un ordre corps avant esprit | résumé | résumé seul |
| PMID 28137247 | 10.1186/s12916-017-0791-y | 2017 | essai randomisé | adultes avec épisode dépressif caractérisé, la plupart déjà traités | l'effet d'une intervention diététique *adjuvante* | un ordre : l'alimentation s'ajoute aux traitements en cours, sans les précéder | résumé | PMC |
| PMID 40458292 | 10.1155/da/2171041 | 2025 | essai randomisé pragmatique | dépression et insomnie comorbides | l'effet sur la dépression d'une thérapie de l'insomnie ajoutée aux soins usuels | un ordre : l'intervention est adjuvante | résumé | PMC |
| PMID 37516163 | 10.1016/j.cct.2023.107306 | 2023 | protocole d'essai | vétérans, insomnie et dépression | l'existence d'un essai qui compare les deux ordres (insomnie puis dépression, et l'inverse) | aucun résultat : l'étude est en cours | résumé | résumé seul |

**Conclusion (famille 3)** : rien trouvé pour l'ordre corps avant esprit.
Les séquences évaluées portent sur l'intensité (soins par paliers) ou sur
deux traitements psychiatriques. Les interventions de mode de vie testées
sont adjuvantes. Le seul essai qui compare deux ordres (sommeil puis
humeur, et l'inverse) n'a pas encore de résultat.

### 5. Neuronutrition : pyramide ou hiérarchie des besoins

Aucun candidat. La neuronutrition est indexée (39 résultats), mais aucune
de ces publications n'y associe une pyramide, une hiérarchie des besoins ou
un ordre d'intervention. Aucun écrit de neuronutrition lu ne porte la
hiérarchie du guide ou l'« iceberg ».

**Conclusion (famille 5)** : rien trouvé.

### 6. Contre-preuves

| PMID | DOI | Année | Contre-preuve | Emplacement | Accès |
|---|---|---|---|---|---|
| PMID 21688922 | 10.1037/a0023779 | 2011 | l'association de chaque besoin avec le bien-être est largement indépendante de la satisfaction des autres besoins, ce qui va contre une préséance stricte | résumé | résumé seul |
| PMID 32743084 | 10.1016/j.heliyon.2020.e04325 | 2020 | l'importance que les participants donnent à chaque besoin s'écarte fortement de l'ordre de la pyramide | résumé | PMC |
| PMID 36202135 | 10.1080/15622975.2022.2112074 | 2023 | le mode de vie est fondateur, mais il peut accompagner les autres interventions, et l'ordre insomnie-dépression est laissé au choix : la recommandation ne bloque pas l'intervention psychologique | sections « Implementation considerations » et « Clinical considerations » de l'insomnie | PMC |
| PMID 33320412 | 10.1111/bdi.13035 | 2020 | mode de vie et interventions psychologiques sont mis en œuvre ensemble dès le départ | résumé | résumé seul |
| PMID 34607616 | 10.1192/bjo.2021.1020 | 2021 | les recommandations sur le mode de vie relèvent de l'avis d'experts, pas d'essais | résumé | PMC |
| PMID 25065653 | 10.1017/S0033291714000701 | 2015 | les preuves que les soins par paliers doivent dominer sont jugées limitées | résumé | résumé seul |

**Conclusion (famille 6)** : contre-preuves trouvées. Elles visent la
préséance stricte d'une classe sur une autre et le blocage de
l'intervention psychologique. Le rôle fondateur du mode de vie n'est pas
contredit.

## Volet B — pondération du total

### 4. Indices composites : pondération, agrégation, seuils, bandes

| PMID | DOI | Année | Type | Domaine | Soutient | Ne soutient pas | Emplacement | Accès |
|---|---|---|---|---|---|---|---|---|
| PMID 35766027 | 10.1161/CIR.0000000000001078 | 2022 | avis présidentiel (AHA) | santé cardiovasculaire, huit composantes dont le sommeil | un total à **poids égaux** (moyenne non pondérée des composantes) ; des **bandes d'interprétation** déclarées par le groupe de rédaction sur ce total, avec un appel à les éprouver dans d'autres populations | une pondération inégale ; une transposition aux douze besoins | section « Updated definitions and novel quantitative assessment of CVH metrics » | PMC |
| PMID 35552561 | 10.1371/journal.pone.0268320 | 2022 | cartographie méthodologique | mesures composites de la qualité des soins | les poids égaux comme approche la plus fréquente ; le choix rarement justifié | une méthode de poids inégaux recommandée | résumé | PMC |
| PMID 41272622 | 10.1186/s12963-025-00432-7 | 2025 | revue systématique | indices composites d'accès aux soins | l'inventaire des pondérations (égale, ACP, AHP, priorités d'un programme) et des agrégations (moyenne, somme, géométrique, avec pénalité) ; la recommandation d'une **agrégation non compensatoire**, qui pénalise un déficit critique dans une dimension | des valeurs de poids ; un domaine clinique | sections « Weighting » et « Composite index » ; Conclusions | PMC |
| PMID 34483439 | 10.1007/s11205-021-02775-8 | 2022 | application méthodologique | performance des systèmes régionaux de santé | une agrégation non compensatoire à poids égaux, avec une pénalité qui croît avec le déséquilibre entre composantes ; la définition de la compensabilité | une pondération par strate ; un seuil de déficit | section « Composite Indexes » | PMC |
| PMID 39434048 | 10.1186/s12889-024-20406-y | 2024 | construction d'indice (Delphi puis AHP) | pauvreté multidimensionnelle de santé | une pondération **inégale** entre dimensions, obtenue par panel d'experts (méthode documentée) | des poids transposables : contexte de pauvreté, dimensions sans rapport avec les besoins | résumé | PMC |
| PMID 41333604 | — (DOI indexé non résolu) | 2025 | construction d'indice (AHP, règle de Borda pondérée) | mode de vie sain (alimentation, activité, alcool, tabac) | une pondération inégale entre domaines du mode de vie, fixée par des experts | des poids transposables ; une validation clinique | résumé | PMC |
| PMID 40230510 | 10.1007/s11205-025-03542-9 | 2025 | construction d'indice, quatre pondérations comparées | qualité du travail | les poids égaux pris comme défaut, avec la méthode de comptage par seuils de privation ; les pondérations alternatives présentées en sensibilité | un choix de poids inégaux fondé ; un domaine de santé | résumé | PMC |
| PMID 31811513 | 10.1007/s10198-019-01139-x | 2020 | construction d'indice non compensatoire | privation sociale et matérielle | une agrégation non compensatoire entre sous-indicateurs | une pondération ou un seuil transposable | résumé | résumé seul |

**Pistes non lues** (DOI résolu ; ni PubMed ni résumé Crossref ; éditeur
fermé au réseau cloud) :

- DOI 10.1007/s11205-017-1832-9 (2018) : revue méthodologique de la
  pondération, de l'agrégation et de la robustesse des indices composites ;
- DOI 10.1007/s11205-015-0998-2 (2015) : indice composite non compensatoire
  généralisé, la méthode qu'applique PMID 34483439 ;
- DOI 10.1016/j.jpubeco.2010.11.006 (2011) : méthode de comptage à double
  seuil (seuil de privation par dimension, puis seuil sur le compte
  pondéré). C'est la forme publiée la plus proche d'un « seuil de déficit »,
  mais elle n'a pas été lue ;
- DOI 10.1080/07474938.2012.690641 (2013) : revue des méthodes de poids dans
  les indices multidimensionnels de bien-être.

**Recherché sans résultat** : un indice de santé ou de bien-être qui
atténue un domaine par la valeur d'un autre, de la forme min(1, base/seuil).
Aucune source lue ne porte cette forme. Les formes publiées trouvées sont
la pénalité de déséquilibre (PMID 34483439, PMID 41272622), la moyenne
géométrique (PMID 41272622) et le double seuil (piste non lue). De même, aucun
indice composite de *besoins* à parts décroissantes entre strates n'a été
trouvé.

**Conclusion (famille 4)** : partielles seulement. Trois méthodes sont
documentées : une pondération inégale fixée par panel d'experts (Delphi,
AHP), une agrégation non compensatoire, et des bandes déclarées sur un
total à poids égaux. Aucune valeur n'est transposable aux trois strates, ni
la base, ni le seuil.

## Annexe — requêtes menées

Toutes dans PubMed, le 2026-11-28 ; nombre de résultats entre crochets.

### Famille 1
- `Maslow[tiab] AND hierarchy[tiab] AND needs[tiab]` → 299 (12 premiers lus en titre, 0 candidat empirique)
- `Maslow[tiab] AND (empirical[tiab] OR test[tiab] OR cross-cultural[tiab] OR survey[tiab]) AND (needs[tiab]) AND (well-being[tiab] OR wellbeing[tiab] OR satisfaction[tiab])` → 29
- `("need satisfaction"[tiab] OR "needs fulfillment"[tiab]) AND hierarchy[tiab] AND (subjective well-being[tiab] OR world[tiab])` → 0
- `"renovating the pyramid"` → 6
- `(hierarchy of needs[tiab]) AND (evolutionary[tiab] OR revised[tiab] OR revision[tiab] OR critique[tiab])` → 14
- `(prepotency[tiab] OR prepotent[tiab]) AND needs[tiab] AND Maslow[tiab]` → 0
- `Maslow[tiab] AND (scale[tiab] OR questionnaire[tiab] OR validation[tiab]) AND hierarchy[tiab]` → 52
- `Tay L[au] AND Diener E[au] AND needs[tiab]` → 2
- `(universal needs[tiab] OR basic needs[tiab]) AND subjective well-being[tiab] AND (nations[tiab] OR countries[tiab]) AND (hierarchy[tiab] OR order[tiab])` → 0
- `Maslow[tiab] AND (needs[tiab]) AND (food insecurity[tiab] OR physiological needs[tiab]) AND (mental health[tiab] OR depression[tiab])` → 6, 0 candidat
- `Maslow[tiab] AND hierarchy[tiab] AND (systematic review[tiab] OR meta-analysis[tiab])` → 4, 0 candidat (revues sans rapport avec la validité de la hiérarchie)
- `basic psychological needs[tiab] AND (hierarchy[tiab] OR hierarchical[tiab]) AND physiological[tiab]` → 0

### Famille 2
- `(lifestyle[tiab]) AND (guideline*[tiab] OR consensus[tiab] OR taskforce[tiab]) AND (depress*[tiab]) AND (diet[tiab] OR nutrition[tiab]) AND (sleep[tiab] OR physical activity[tiab])` → 86
- `(lifestyle[tiab]) AND (foundation*[tiab] OR "first-line"[tiab] OR "step 0"[tiab] OR "before"[tiab]) AND (psychotherapy[tiab] OR pharmacotherapy[tiab]) AND mood disorders[tiab] AND guideline*[tiab]` → 2, 0 candidat nouveau
- `Royal Australian and New Zealand College of Psychiatrists[tiab] AND mood disorders[tiab] AND clinical practice guidelines[tiab]` → 17
- `(nutritional psychiatry[tiab]) AND (consensus[tiab] OR position statement[tiab] OR guideline*[tiab])` → 18, 0 candidat sur l'ordre (la prise de position de 2015 est une lettre sans résumé : non lue)
- `(stepped care[tiab]) AND (depression[tiab] OR anxiety[tiab]) AND (guideline[tiab] OR NICE[tiab])` → 44
- `(insomnia[tiab]) AND (treat* first[tiab] OR sequenc*[tiab] OR before[tiab]) AND (depression[tiab]) AND (guideline*[tiab] OR consensus[tiab])` → 4, 0 candidat

### Famille 3
- `(stepped care[tiab]) AND (depression[tiab]) AND (meta-analysis[pt] OR meta-analysis[tiab])` → 34
- `(sequential[tiab] OR sequencing[tiab] OR "order of"[tiab]) AND (lifestyle[tiab] OR diet*[tiab] OR exercise[tiab] OR nutrition*[tiab]) AND (psychotherapy[tiab] OR cognitive behavio*[tiab]) AND (depress*[tiab]) AND (randomized[tiab] OR trial[tiab])` → 8, 0 essai de mode de vie avant psychothérapie
- `(insomnia[tiab]) AND (cognitive behavioral therapy[tiab]) AND (sequential[tiab] OR sequenced[tiab] OR "prior to"[tiab] OR "followed by"[tiab]) AND (depression[tiab]) AND (randomized[tiab])` → 15
- `(sequential treatment[tiab] OR sequential combination[tiab]) AND (depression[tiab]) AND (meta-analysis[tiab])` → 2
- `Guidi J[au] AND Fava GA[au] AND sequential[tiab]` → 10
- `(lifestyle psychiatry[tiab] OR lifestyle medicine[tiab]) AND (sequenc*[tiab] OR order[tiab] OR prioriti*[tiab]) AND (mental[tiab])` → 17, 0 candidat
- `(nutrition*[tiab] OR dietary[tiab]) AND (psychotherapy[tiab] OR psychological intervention*[tiab]) AND ("before"[tiab] OR prior[tiab] OR precede*[tiab]) AND depression[tiab] AND randomized controlled trial[pt]` → 2, 0 candidat
- `(SMILES trial[tiab] OR dietary improvement[tiab]) AND major depression[tiab] AND randomised[tiab]` → 4

### Famille 4
- `(composite index[tiab] OR composite indicator*[tiab] OR composite score[tiab]) AND (weighting[tiab] OR weights[tiab]) AND (aggregation[tiab]) AND (health[tiab] OR well-being[tiab] OR wellbeing[tiab])` → 19
- `(non-compensatory[tiab] OR noncompensatory[tiab] OR partially compensatory[tiab]) AND (index[tiab] OR indicator*[tiab] OR aggregation[tiab]) AND (health[tiab] OR well-being[tiab])` → 9
- `(multidimensional poverty[tiab] OR deprivation cutoff*[tiab] OR dual cutoff[tiab] OR Alkire[tiab]) AND (health[tiab]) AND (weights[tiab] OR weighting[tiab])` → 6
- `(Delphi[tiab]) AND (weights[tiab] OR weighting[tiab]) AND (domains[tiab]) AND (composite[tiab] OR index[tiab]) AND (health[tiab] OR well-being[tiab])` → 11, 0 candidat de bien-être
- `(weights[tiab] OR weighting[tiab]) AND (domains[tiab]) AND (well-being index[tiab] OR wellbeing index[tiab] OR quality of life index[tiab]) AND (equal weights[tiab] OR unequal[tiab] OR differential[tiab])` → 0
- `(lifestyle score[tiab] OR healthy lifestyle index[tiab] OR lifestyle index[tiab]) AND (weighting[tiab] OR weighted[tiab]) AND (equal[tiab]) AND (mental health[tiab] OR depression[tiab])` → 0
- `Greco S[au] AND composite indices[tiab]` → 0
- `Mazziotta M[au] AND Pareto A[au]` → 0
- `Mazziotta-Pareto[tiab] OR "Mazziotta Pareto"[tiab]` → 5
- `(composite[tiab] OR multidimensional[tiab]) AND (well-being[tiab] OR wellbeing[tiab] OR health[tiab]) AND (geometric mean[tiab]) AND (compensab*[tiab] OR substitutab*[tiab] OR compensat*[tiab])` → 0
- `Life's Essential 8[tiab] AND (presidential advisory[tiab] OR scoring[tiab]) AND American Heart Association[tiab]` → 28
- `(equal weight*[tiab]) AND (composite[tiab] OR index[tiab]) AND (well-being[tiab] OR wellbeing[tiab]) AND (sensitivity analysis[tiab] OR robustness[tiab])` → 0
- `(frailty index[tiab]) AND (deficit accumulation[tiab]) AND (equal weight*[tiab] OR unweighted[tiab] OR weighting[tiab])` → 3, 0 candidat
- Crossref (DOI des quatre pistes non lues de cette famille) : métadonnées seulement, aucun résumé ; éditeur injoignable depuis le réseau cloud.

### Familles 5 et 6
- `neuronutrition[tiab] OR neuro-nutrition[tiab]` → 39, 0 candidat sur une hiérarchie
- `(neuronutrition[tiab] OR nutritional psychiatry[tiab] OR nutritional neuroscience[tiab]) AND (hierarchy[tiab] OR pyramid[tiab] OR Maslow[tiab])` → 1, 0 candidat
- `("food first"[tiab] OR "nutrition first"[tiab]) AND (mental health[tiab] OR depression[tiab] OR psychotherapy[tiab])` → 3, 0 candidat
- `Maslow[tiab] AND ("not supported"[tiab] OR "little support"[tiab] OR "lack of evidence"[tiab] OR criticism[tiab] OR criticized[tiab])` → 4, 0 candidat lu (le seul théorique n'a pas de résumé indexé)

## Validations

- Les 29 PMID cités se résolvent dans PubMed (esummary). Le couple PMID-DOI
  et l'année concordent avec PubMed, sans écart. 28 des DOI se résolvent
  (doi.org, 302). Le DOI indexé de PMID 41333604 rend 404 : la source est
  gardée par son PMID et son texte PMC.
- Les cinq DOI de pistes non lues (un en famille 1, quatre en famille 4) se
  résolvent (302), et leurs métadonnées Crossref ont été lues, sans résumé.
  Leur contenu n'a pas été lu.
