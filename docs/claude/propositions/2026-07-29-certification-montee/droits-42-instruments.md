# Les 42 instruments aux droits non instruits — dossier d'arbitrage

> **INSTANTANÉ CONSOMMÉ — 2026-07-29.** Le praticien a tranché sur ce dossier :
> les deux déclarations couvrent les instruments tiers reproduits dans les supports
> SIIN, sur le périmètre des **42** ; les instruments sans usage ni auteur nommé
> sont fermés. Les 42 entrées sont passées à `permission_obtenue`, 38 à
> `droits_verifies`, et `Q_TAB_04` / `Q_PNE_01` en `suspendu`.
>
> **Ce document n'est donc plus l'état du registre — il est l'état sur lequel la
> décision a été prise**, et c'est à ce titre qu'il est conservé. Ses chiffres ne
> doivent pas être remis à jour : le banc qui les vérifiait
> (`scripts/dossier_droits_42.test.mjs`) a été retiré dans la PR de la décision,
> avec son étape de CI, selon la procédure que son en-tête décrivait.

Suite de l'arbitrage du 2026-07-29 sur les huit instruments sous licence tierce
(#460, mergée le même jour). Celui-ci porte sur les **42 entrées `a_verifier`**
du registre. Il a le même statut : **il ne décide de rien**, il rend vérifiable ce
sur quoi vous déciderez.

Ses chiffres ont été recalculés depuis `docs/claude/corpus/instrument_registry.json`
par `scripts/dossier_droits_42.test.mjs` — banc **retiré avec la décision**, voir
l'encadré ci-dessus. Sa première rédaction en portait six faux, dont deux qui
changeaient la décision ; le banc a existé pour cette raison, et il a attrapé une
septième erreur à sa première exécution.

**Note de concordance** : le document frère `droits.md` (#448) écrivait « 43 »
pour ce même ensemble, et « 32 / 11 » pour sa complétude bibliographique. Le
registre porte **42** et **30 / 12** — et il les portait déjà au merge de #448.
L'explication est nette : `droits.md` décrivait fidèlement l'état d'**avant
l'édition du registre par sa propre PR**, le parent du commit de merge portant
bien 43 (32 / 11). Les trois chiffres sont corrigés dans le même lot que ce
dossier ; c'est le registre qui fait foi.

## Le fait central

**Aucun de ces 42 instruments n'a fait l'objet d'une recherche de droits.**
`a_verifier` ne veut pas dire « douteux » : il veut dire *personne n'a instruit*.
Aucun ne porte de `proprietaireDroits`, aucun ne porte de `dateVerification` —
c'est ce second champ, avec un statut de droits dégagé, que le vérificateur du CI
exige pour franchir le barreau `droits_verifies`.

Cinq entrées portent une mention antérieure au dossier, et **les cinq se terminent
par « à vérifier »** :

| Instrument | Mention antérieure | Sens |
|---|---|---|
| `Q_SOM_01` PSQI | © University of Pittsburgh (usage clinique libre déclaré) | permissif |
| `Q_STR_02` PSS-10 | usage non commercial libre (déclaré par l'auteur) | permissif |
| `Q_STR_04` DASS-21 | domaine public (déclaré par les auteurs) | permissif |
| `Q_NEU_07` AUDIT | OMS — reproduction autorisée avec mention | permissif |
| `Q_GEO_05` QDRS | © J. E. Galvin (usage clinique libre déclaré) | permissif |

**Aucune des cinq permissions n'est adossée à la source extraite.** Vérifié
rapport par rapport : le banc n'a relevé dans les documents d'origine aucune des
phrases qui *autorisent* — ni « usage clinique libre », ni « usage non commercial
libre », ni « domaine public », ni « reproduction autorisée ». Elles viennent
d'une saisie antérieure dont l'origine n'est pas au dossier.

Nuance à ne pas gommer : pour `Q_GEO_05`, la source **confirme l'attribution**
(James E. Galvin, 2015) — c'est d'ailleurs à ce titre qu'il figure au groupe à
source nommante ci-dessous. C'est la permission, et elle seule, qui manque. Les
quatre autres ne portent rien.

Et **les cinq vont dans le sens permissif**. Une affirmation invérifiable qui
rassure coûte plus cher qu'une qui inquiète : c'est elle qui dispense
d'instruire.

## Deux déclarations vivantes, et elles couvrent les 42

Ce point a été rétabli après revue ; la première rédaction ne l'appliquait qu'à
un tiers des instruments.

- **35 entrées** portent la déclaration du **2026-07-29** *suivie de sa réserve* :
  « Cet instrument N'EST PAS un questionnaire du référentiel SIIN […] les droits
  de l'échelle d'origine restent entiers et NON INSTRUITS ».
- **7 entrées** portent la déclaration du **2026-07-26** et une « CORRECTION DU
  2026-07-29 » : elles étaient à `permission_obtenue` et ont été **rétrogradées**
  le jour même — `Q_NEU_01` (BDI-13), `Q_FIB_01` (FiRST), `Q_FIB_02` (QIF),
  `Q_ALI_03` (méthode Monnier), `Q_GEO_01` (Tinetti), `Q_GEO_03` (AQ),
  `Q_GEO_06` (5 mots). `Q_NEU_01` **aurait franchi** `scoring_verifie` sur cette
  étiquette, n'eût-il été rétrogradé dans le même lot : vérifié sur les onze
  révisions committées du registre, il n'a jamais porté que `repere` puis
  `source_obtenue`. Une première rédaction en faisait un fait accompli.

35 + 7 = 42 : **aucune n'échappe à l'une ou à l'autre.** La question du périmètre
porte donc sur les 42, pas sur un sous-ensemble — et elle porte sur **deux**
déclarations de périmètres différents, la première ayant explicitement visé les
instruments « dont la source du cabinet ne porte qu'une attribution tierce ».

## Le piège, nommé d'avance

**Ne pas décider sur la typologie.** C'est la faute que la revue de #448 avait
relevée, et elle se rejouerait ici : classer selon *qu'une ligne de copyright a
été extraite ou non* accorde le statut le plus permissif aux instruments les
**moins documentés**.

Les trois groupes ci-dessous classent **ce que la source extraite documente**, et
rien d'autre. Ils ne classent ni le risque, ni la priorité — l'ordre d'action est
en fin de document et ne les suit pas.

---

## Groupe « source nommante » — elle nomme une origine (14)

| Instrument | L'origine que la source nomme | Usage |
|---|---|---|
| `Q_GAS_03` Bristol | « publiée par l'université de médecine de Bristol » | **1 assignation ouverte** |
| `Q_FIB_02` QIF | Burckhardt, Clark & Bennett 1991 ; adaptation fr. Perrot et al. | 2 réponses |
| `Q_NEU_01` BDI-13 | Beck, adapté en français par Freston 1994 | 1 réponse |
| `Q_STR_05` BMS-10 | Maslach-Pines | 1 réponse |
| `Q_FIB_01` FiRST | Perrot & Bouhassira, *Pain* 2010 | — |
| `Q_GEO_01` Tinetti | Tinetti M., *J Am Geriatr Soc* | — |
| `Q_GEO_03` AQ | Sabbagh, Malek-Ahmadi et al. | — |
| `Q_GEO_05` QDRS | James E. Galvin 2015 | — |
| `Q_GEO_06` 5 mots | Dubois B. | — |
| `Q_NEU_12` IDTAS-AE | Terman & Williams, NY State Psychiatric Institute ; partie 1 adaptée du Prime-MD (Spitzer & Williams) | — |
| `Q_PED_01` MEQ-Enfant | « Publié avec l'aimable autorisation du Dr Caci » | — |
| `Q_STR_06` Karasek | Karasek & Theorell 1990 | — |
| `Q_TAB_01` Lagrue-Légeron | Lagrue et Légeron | — |
| `Q_TAB_03` QCT2 | Gilliard, Bruchon-Schweitzer, Cousson-Gélie 2000 | — |

**`Q_NEU_12`** porte **au moins trois** œuvres amont superposées, et c'est la
grandeur qui décide du coût d'instruction : l'IDTAS lui-même (Terman & Williams),
le Prime-MD dont sa partie 1 est adaptée (Spitzer & Williams), et le *Seasonal
Pattern Assessment Questionnaire* dont ses parties 2 et 3 le sont (Rosenthal,
Bradt & Wehr, National Institute of Mental Health, qui a aussi financé sa
préparation). Une première rédaction n'en comptait deux.

**`Q_PED_01`** est la seule des 42 dont la mention décrit une **autorisation
accordée** et non un droit opposé. Reste à établir à qui elle l'a été — au support
qui reproduit, ou à son lecteur. Une autorisation accordée à un tiers est *a
priori* pas transférable : à qui elle a été accordée reste à établir, et rien
dans la source ne le dit. C'est une question ouverte, pas un avantage acquis.

**Six des sept rétrogradés** du 2026-07-26 sont dans ce groupe. Ce n'est pas un
hasard : leur source portait une attribution tierce, et c'est précisément ce que
la correction du 2026-07-29 a jugé insuffisant pour dégager les droits.

---

## Groupe « pied de page seul » — la source ne porte que celui du SIIN (16)

**Ce pied de page dit qui a reproduit l'instrument dans un support de formation,
pas qui le détient.** C'est ce que le registre écrit lui-même, en toutes lettres,
dans le `droits.detail` de 15 de ces 16 : « les droits de l'échelle d'origine
restent entiers et NON INSTRUITS ».

Deux précisions que la première rédaction avait fausses :

- **Le champ `statutBibliographique` ne porte PAS cette distinction.** Il prend
  trois valeurs (`reference_identifiee`, `a_completer`,
  `referentiel_interne_siin`) et mesure une **complétude bibliographique**, pas
  une titularité. Sur ces 16, il vaut `reference_identifiee` pour 11 et
  `a_completer` pour 5 — `Q_ALI_03`, `Q_NEU_03`, `Q_PNE_01`, `Q_TAB_04`,
  `Q_URO_02`, où *rien* n'est identifié. Ce qui porte la distinction est la prose
  du registre, pas ce champ.
- **`Q_ALI_03` est la seule exception, et elle cumule.** Son `droits.detail` ne
  porte pas la réserve « N'EST PAS un questionnaire du référentiel SIIN » : il
  relève de la déclaration du 2026-07-26 et de sa correction. Son nom au registre
  est « Évaluation des apports caloriques et protéiques — **méthode Monnier** »,
  auteur L. Monnier — un instrument tiers, malgré un intitulé qu'on lit
  spontanément comme SIIN. Il porte une réponse patient.

Ce dossier n'affirme la titularité d'aucun de ces instruments : le registre ne la
porte pour aucun (`proprietaireDroits` nul sur les 42).

| Instrument | Usage |
|---|---|
| `Q_GAS_02` Francis (IBS-SSS) | **1 assignation ouverte** |
| `Q_SOM_01` PSQI | 3 assignations, 4 réponses |
| `Q_SOM_07` MFI-20 | 3 assignations, 4 réponses — **suspendu**, hors échelle |
| `Q_SOM_03` Berlin | 3 assignations, 3 réponses |
| `Q_ALI_03` méthode Monnier | 1 réponse |
| `Q_SOM_05` MEQ Horne & Östberg | 1 réponse |
| `Q_GEO_02` SARC-F · `Q_NEU_03` SIGH-SAD-SA · `Q_NEU_07` AUDIT · `Q_NEU_09` Zarit · `Q_NEU_10` IAT · `Q_PNE_01` BPCO · `Q_TAB_02` Fagerström · `Q_TAB_04` cannabis · `Q_URO_01` IPSS · `Q_URO_02` catalogue mictionnel | aucun |

---

## Groupe « source muette » — aucune mention, d'aucune sorte (12)

**C'est le groupe le moins informé, pas le plus tranquille.** Le banc n'a relevé
aucune mention dans leur source ; il n'en tire aucune conclusion, et ce dossier
non plus. Plusieurs y sont des échelles internationalement diffusées dont l'ayant
droit reste entièrement à identifier — le dossier ne les compte pas, faute d'un
critère qui se recalcule.

| Instrument | Usage |
|---|---|
| `Q_STR_04` DASS-21 | 3 assignations, 4 réponses |
| `Q_STR_02` PSS-10 | 2 assignations, 4 réponses |
| `Q_SOM_06` Pichot | 1 assignation, 2 réponses |
| `Q_NEU_04` SCOFF · `Q_STR_03` Cungi | 1 assignation, 1 réponse chacun |
| `Q_STR_08` WART | 1 réponse |
| `Q_FIB_03` ELFE — **suspendu**, hors échelle · `Q_NEU_02` MADRS · `Q_NEU_05` UPPS · `Q_NEU_08` ECAB · `Q_SOM_04` IRLS · `Q_TAB_05` HONC | aucun |

---

## Qui est instruisable, et ce que ça veut dire

La première rédaction opposait « 14 engageables » à « 28 à rechercher ». C'était
un classement sur la typologie, exactement ce que ce dossier prétend éviter :
**le registre renseigne `instrument.auteurs` sur 38 des 42.** Quatre n'ont aucun
nom au registre — `Q_FIB_03` (ELFE), `Q_TAB_04` (cannabis), `Q_PNE_01` (BPCO) et
`Q_NEU_12` (IDTAS-AE).

`Q_NEU_12` est le cas qui montre que les deux champs ne se recouvrent pas : sa
**source** le nomme (Terman & Williams, plus le Prime-MD de Spitzer & Williams),
son **registre** non. Compter l'un pour l'autre se trompe dans les deux sens — et
c'est le banc de ce dossier qui l'a relevé, à sa première exécution, sur un
chiffre que j'avais repris d'une revue sans le recalculer sur l'ensemble complet.

La nuance, elle, vient du registre lui-même : son `commentaire` précise que
lorsque `references.dateVerification` est nulle — le cas des 42, et d'ailleurs
des 64 — les auteurs sont « identifiés de mémoire » et **ne font autorité qu'une fois le PDF source au
dossier**. La différence entre les 14 du groupe à source nommante et les autres n'est donc pas
« nommé » contre « anonyme », c'est **« nommé par la source » contre « nommé de
mémoire »**. La première catégorie est opposable, la seconde est à confirmer.

## Ce que ce dossier NE dit pas

- Il n'affirme d'aucun instrument qu'il est libre, ni qu'il est licencié, ni qui
  le détient.
- Il ne donne aucun avis juridique.
- Il ne propose aucun remplacement : substituer un instrument aux droits inconnus
  par un autre aux droits inconnus déplace la question sans la traiter.
- Il ne rouvre pas la reformulation des items. Une paraphrase reste une œuvre
  dérivée et **détruit l'instrument** — sa validité et ses seuils appartiennent à
  la version validée. Deux précédents au dépôt : `Q_SOM_07` et la forme courte de
  `Q_ALI_01`.

## Ce que ça change pour la certification — l'attente à calibrer

Dégager les droits fait franchir **un seul barreau** : `source_obtenue` →
`droits_verifies`. Viennent ensuite `contenu_verrouille`, puis `scoring_verifie`.

- **45 instruments sur 64** sont au deuxième barreau ou en deçà ; **52** n'ont pas
  franchi `droits_verifies`. L'écart entre les deux, ce sont les **7** en état
  `suspendu` — terminal, hors échelle — qui ne sont sur aucun barreau.
- **Les 42 sont tous en `statutContenu: a_auditer`.** Le verrouillage du contenu
  est mécanique — la description se dérive d'`empreinte-servie.json` — mais reste
  à faire.
- **15 des 42 portent au moins une divergence critique au banc** : `Q_SOM_07` (3),
  `Q_FIB_03` (2), `Q_URO_01` (2), puis douze à une.
- **`Q_SOM_07` et `Q_FIB_03` sont `suspendu`**, un état **terminal hors échelle** :
  ils ne franchiront aucun barreau tant qu'ils sont inactifs, droits ou pas.

**Projection : droits dégagés sur les 42, au plus 27 pourraient viser
`scoring_verifie`** ; les 15 autres s'arrêtent à `contenu_verrouille` en attendant
un arbitrage de contenu, qui n'a rien à voir avec le droit.

## L'ordre proposé — il ne suit pas les groupes

1. **Les deux assignations ouvertes** — `Q_GAS_03` (Bristol) et `Q_GAS_02`
   (Francis). Un patient les a reçus et ne les a pas rendus : fermer un instrument
   déjà envoyé fait disparaître la ligne de son portail.
2. **Les quatorze qui portent des réponses** — PSQI, DASS-21, PSS-10, Berlin,
   MFI-20 (déjà suspendu), QIF, Pichot, MEQ Horne, BDI-13, BMS-10, SCOFF, Cungi,
   WART, méthode Monnier. Aucun n'a d'assignation ouverte : les fermer serait
   indolore pour les patients en cours, coûteux pour la suite.
3. **Les quatorze du groupe à source nommante** — la démarche y est opposable sans recherche
   préalable, le nom venant de la source. Trois d'entre eux (`Q_GEO_03`,
   `Q_GEO_05`, `Q_GEO_06`) sont les alternatives fonctionnelles au MMSE fermé le
   2026-07-29 : les instruire rend cette fermeture soutenable.
4. **Ce qui reste après les trois étapes : 16 instruments**, tous sans usage. Le
   compte « 26 sans aucun usage » est exact comme mesure, faux comme reste — dix
   d'entre eux sont dans le groupe à source nommante et déjà pris à l'étape 3. Et l'un des 26,
   `Q_FIB_03`, est **déjà fermé** : le geste de fermeture porterait sur 25.

## Trois questions qui vous reviennent

1. **Le périmètre des déclarations.** Elles couvrent les supports de formation du
   SIIN. Entendez-vous qu'elles couvrent aussi les instruments tiers que ces
   supports reproduisent ? Le registre suppose que **non** — c'est l'hypothèse
   prudente, c'est une hypothèse, et **les 42 en dépendent**, pas 16. Question
   liée : la déclaration du 2026-07-26 est-elle encore vivante à côté de celle du
   2026-07-29, ou éteinte par elle ? Sept instruments en dépendent.
2. **Le seuil d'action.** Tout fermer mettrait 42 instruments hors service, dont
   le PSQI et le DASS-21. Ne rien fermer maintient la position actuelle. Entre les
   deux : « fermer ce qui n'est pas utilisé » vaut **25 instruments** encore
   ouverts, à coût opérationnel nul — le même geste que les cinq du 2026-07-29.
3. **Le statut d'un auteur nommé de mémoire.** Si un `instrument.auteurs`
   renseigné suffit à engager une démarche, 38 des 42 sont engageables ; s'il faut
   le PDF source au dossier, 14 — et les deux ensembles ne s'emboîtent pas
   (`Q_NEU_12` est nommé par sa source et pas par le registre). C'est cette réponse, et non la typologie des
   groupes, qui fixe le volume de travail.
