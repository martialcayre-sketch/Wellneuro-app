---
id: "2026-07-26-audit-accompagnement-alimentaire"
titre: "Audit et arbitrage — accompagnement alimentaire Wellneuro 5.0"
statut: "rapport — P0 point 1 exécuté le 2026-07-27 (v4), autres arbitrages en attente"
créé_le: "2026-07-26"
base_auditée: "main @ a19df9b"
---

# Audit et arbitrage — accompagnement alimentaire

> **Suite donnée — 2026-07-27.** Le point 1 du P0 (§6) est **exécuté** :
> `Q_SOM_06` est détaché du besoin 2, qui devient non évalué, et
> `VERSION_SCORE_EQUILIBRE` passe de v3 à v4. Le constat §4.1 décrit donc
> désormais l'**état antérieur**. Les points 2 à 4 du P0, ainsi que P0 bis,
> P1, P2 et P3, restent ouverts, comme les quatre questions du §7 —
> à l'exception de la première, tranchée par ce correctif.

## 1. Périmètre et méthode

Ce rapport répond à deux documents de travail apportés le 2026-07-26 : une
**simulation de référence** du workflow alimentaire cible (parcours patient
complet, de la création du dossier au second tour de la Spirale) et un
**verdict métrologique** sur les trois questionnaires alimentaires servis.

Ensemble, ils posent une question qui n'avait jamais été tranchée
explicitement :

> Que Wellneuro a-t-il le droit d'**affirmer** à partir d'un questionnaire
> alimentaire ?

Aujourd'hui l'application répond implicitement « un score de besoin sur 100 »,
et ce score dispose d'un droit de veto sur l'indicateur global (§4.1).

**Méthode.** Toute affirmation vérifiable a été recontrôlée dans le dépôt, à la
ligne près, sur `main @ a19df9b`. Le rapport distingue trois régimes :

| Marque | Signification |
|---|---|
| **[vérifié]** | Contrôlé dans le code, chemin et ligne cités |
| **[à arbitrer]** | Dépend d'un choix clinique du praticien, pas d'une lecture |
| **[hypothèse]** | Plausible, non établi — signalé comme tel |

**Ce rapport ne modifie rien.** Aucun scoring, aucun seuil, aucune migration.
Les correctifs sont proposés et priorisés ; leur exécution est arbitrée
ensuite, lot par lot.

Le rapport ne reprend pas le prénom employé dans la simulation fournie : il
désigne le cas par « la patiente de la simulation ». Les seuls patients
fictifs autorisés dans ce dépôt sont Sophie Nicola, Jennifer Martin et
Michel Dogné.

---

## 2. État réel de la chaîne alimentaire

La chaîne comporte trois étages. Ils ne sont pas au même niveau d'avancement,
et c'est l'essentiel du diagnostic.

### Étage 1 — Observation (le carnet) : en avance

Le domaine `web/src/lib/food-observation/` compte environ 2 340 lignes
réparties sur 18 modules, chacun accompagné de tests Vitest. Il implémente les
trois régimes (calibrage, essai, silence), la carrière d'action, le budget
d'attention, les traces occasion/faisabilité/friction, le registre de
frictions fermé, le plan minimal, les solutions intra-épisode et le delta de
décision. C'est un travail sérieux et testé.

### Étage 2 — Mesure (les questionnaires) : en retard

Les trois instruments alimentaires sont, au registre de certification
(`docs/claude/corpus/instrument_registry.json`), en `statutContenu:
"a_auditer"`, `cosmin: "inconnu"`, `statutCertification: "repere"`. **[vérifié]**

L'anomalie n'est pas qu'on l'ignore — le registre le dit. L'anomalie est qu'un
instrument `repere` pilote une **fondation critique** de l'indicateur (§4.1).

### Étage 3 — Câblage patient : en retard sur les deux autres

La route d'écriture patient existe, complète, authentifiée et testée —
et **aucun client ne l'appelle** (§4.4).

**Diagnostic d'ensemble** : la machinerie d'observation est prête pour un
usage qu'elle n'a pas ; la machinerie de mesure affirme davantage qu'elle ne
peut soutenir ; et le patient, au milieu, saisit dans le vide.

---

## 3. Vérification des affirmations auditées

| Affirmation | Verdict | Preuve |
|---|---|---|
| `Q_ALI_01` servi = 14 items, échelle 0–3, max 42, 4 classes | **exact** | `web/src/lib/questionnaires/alimentaire.ts:3-57` |
| Besoin 1 « Équilibre de l'assiette » ← `Q_ALI_01` max 42 | **exact** | `web/src/lib/equilibre/constants.ts:53` |
| Besoin 2 « Micronutriments essentiels » ← Pichot fatigue | **exact** | `constants.ts:54` ; `questions.ts:247-248` |
| Besoin 3 « Rythme alimentaire » ← aucune source | **exact** | `constants.ts:55` (tableau vide) |
| `Q_ALI_03` ne calcule ni g/j ni kcal/j | **exact** | `alimentaire.ts:142-151` (sous-scores « index ») |
| Persistance JA adossée à `ProtocolDraft` | **exact** | `web/src/lib/food-observation/persistence.ts:128` |
| Saisie patient non persistée côté serveur | **exact** | `PatientFoodObservationPanel.tsx:196` |

Sept affirmations sur sept se confirment. L'audit fourni est fiable sur ses
constats de fait.

---

## 4. Quatre constats aggravants, absents des deux documents

### 4.1 Le besoin 2 n'est pas mal étiqueté : il a un droit de veto **[vérifié]**

Les besoins 1 et 2 figurent dans `BESOINS_FONDATIONS_CRITIQUES`
(`web/src/lib/equilibre/constants.ts:40`). Le calcul applique un plafond :

- `SEUIL_EFFONDREMENT = 0.34`, `PLAFOND_FONDATION_CRITIQUE = 50`
  (`constants.ts:44-45`) ;
- toute fondation critique dont la couverture passe sous le seuil déclenche le
  plafond (`web/src/lib/equilibre/score.ts:142-159`).

Or le besoin 2 est alimenté par `Q_SOM_06` — l'échelle de fatigue de Pichot,
8 items cotés 0 à 4, max 32, inversée (`constants.ts:54`). Ses items sont
exclusivement des symptômes de fatigue : « Je manque d'énergie », « Tout me
demande un effort », « J'ai les bras ou les jambes lourdes »
(`questions.ts:250-258`).

**Conséquence concrète.** Une patiente très fatiguée obtient une couverture
basse sur le besoin 2. Sous 0,34, son *Mon équilibre* **entier est plafonné à
50/100**, et la restitution lui désigne « Vos micronutriments essentiels »
comme fondation effondrée — alors que rien, dans tout le parcours, n'a mesuré
ses micronutriments.

Ce n'est pas une imprécision de libellé. C'est un **signal clinique faux doté
d'un pouvoir de veto sur l'indicateur global**. L'audit fourni classe ce point
en P0, à juste titre, mais pour une raison plus faible que la raison réelle.

C'est aussi un cas d'école du renversement à éviter : la fatigue est un motif
d'*explorer* le fer, la B12, les folates ou la vitamine D. Elle ne peut pas
être la *mesure* de leur couverture.

### 4.2 Deux des trois questionnaires alimentaires n'alimentent aucun besoin **[vérifié]**

`BESOIN_SOURCES` (`constants.ts:52`) ne référence que `Q_ALI_01`.
`Q_ALI_02` (adhérence méditerranéenne) et `Q_ALI_03` (méthode Monnier) sont
administrés, scorés et restitués — mais leur résultat n'atteint aucun des
douze besoins.

Avant de débattre de leur fidélité aux sources, il faut donc trancher une
question plus élémentaire : **doivent-ils continuer d'exister dans le pack ?**
Un questionnaire de 10 à 15 minutes qui ne nourrit aucune décision est un coût
d'attention patient sans contrepartie.

### 4.3 `Q_ALI_03` promet dans ses propres consignes **[vérifié]**

L'audit relève la mention « repérage rapide validé » dans la description du
catalogue (`questionnaires-catalog.ts:37-38`). Le problème est plus profond :
les **consignes servies au patient** portent la même promesse —
« Ce questionnaire permet d'estimer vos apports journaliers en protéines et
calories » (`alimentaire.ts:107`).

Or le scoring ne produit que cinq sous-scores ordinaux explicitement nommés
« index » (`alimentaire.ts:142-151`) : aucun gramme, aucune kilocalorie. Le
patient répond donc à un questionnaire qui lui annonce un résultat que le
moteur ne calcule pas.

**Item mort au passage** : `MO10` (niveau d'activité physique, coté 1 à 5,
`alimentaire.ts:138-139`) n'entre dans aucun des cinq sous-scores. Il est
demandé au patient et jamais utilisé.

### 4.4 La voie d'écriture patient existe et n'est jamais appelée **[vérifié]**

- `POST /api/portail/ja/observations` est complet : authentification de session
  portail, vérification de révocation de jeton, validation du corps, écriture
  avec `actor: 'patient'`
  (`web/src/app/api/portail/ja/observations/route.ts:70-109`).
- Le panneau patient n'appelle jamais cette route. Son unique appel réseau est
  un `GET /api/portail/ja/decision` (`PatientFoodObservationPanel.tsx:205`).
  Tout le reste part dans `window.sessionStorage`
  (`PatientFoodObservationPanel.tsx:121-128`, écriture ligne 196).

Trois conséquences en découlent, toutes sur l'axe « parcours patient » :

1. **`sessionStorage`, pas `localStorage`** : la saisie disparaît à la
   fermeture de l'onglet. Sur un instrument longitudinal de 21 jours, c'est
   rédhibitoire.
2. **Le message d'absence de session induit en erreur** : il n'avertit de la
   non-conservation que lorsque la session est absente
   (`PatientFoodObservationPanel.tsx:328-332`), laissant entendre qu'avec une
   session ouverte les données *sont* conservées. Elles ne le sont pas.
3. **L'épisode patient est un gabarit en dur** : `buildEpisode`
   (`PatientFoodObservationPanel.tsx:44-65`) fixe pour tout patient la même
   hypothèse et la même action (« Ajouter une source de protéines au
   petit-déjeuner »), un régime toujours `essai`, et une fenêtre de **7 jours**
   (`plusDays(start, 6)`) — alors que le type de décision porte bien
   `J7 | J14 | J21` (`persistence.ts:42`). Il n'existe aucun lien avec un
   protocole prescrit par le praticien.

À quoi s'ajoute que la couverture E2E ne protège de rien sur ce point :
`web/e2e/portail-parcours.spec.ts:424-442` vérifie l'URL et la présence du
titre « Mon carnet alimentaire », rien de la persistance.

**Il existe par ailleurs deux surfaces patient parallèles** :
`FoodObservationJourney.tsx` (harnais de validation, dont
`ja5Architecture.test.ts:17-22` interdit explicitement `fetch`,
`sessionStorage` et `/api/`) et `PatientFoodObservationPanel.tsx` (la route
réelle du portail). Le test d'architecture protège la pureté du composant qui
n'est pas en production.

---

## 5. Challenge des deux documents

### 5.1 Forces

**La simulation nomme correctement l'objet manquant.** Ce n'est pas un écran,
c'est l'**épisode partagé** entre patient et praticien — et le **régime
calibrage**, distinct du régime essai. L'application n'implémente aujourd'hui
que l'essai (§4.4). Son auto-évaluation (§28 du document) est honnête : les
deux points les plus durs qu'elle liste — persistance sur `ProtocolDraft`,
persistance serveur non utilisée par le patient — ont été trouvés
indépendamment dans ce dépôt avant lecture du document, et sont exacts.

**Le modèle d'acteurs ne coûte aucun changement de gouvernance.** La
répartition proposée (le moteur déterministe calcule, l'IA rédige, le
praticien décide) est exactement la doctrine actée le 2026-07-25 pour la
campagne de certification du corpus. L'adopter pour l'alimentaire, c'est
appliquer l'existant, pas légiférer.

**Le point COSMIN sur les indices formatifs est juste et rarement compris.**
Légumes, poisson et boissons sucrées concourent à un profil sans devoir
corréler entre eux : un alpha de Cronbach global n'est effectivement pas le bon
critère de validation. Cette remarque relève le niveau d'exigence de toute la
campagne de certification, pas seulement de l'alimentaire.

**Le déplacement de vocabulaire est l'apport le plus utile.** Passer de « score
de carence » à « profil de couverture alimentaire probable et vulnérabilités
d'apport » n'est pas de la prudence cosmétique : cela change ce que le moteur a
le **droit** d'émettre, donc ce que l'IA a le droit de rédiger.

### 5.2 Le désaccord de fond : le PDF du cabinet n'est pas la source

L'audit compare systématiquement le **servi** au **PDF SIIN** et impute les
écarts à l'application. Sur `Q_ALI_02`, la comparaison au **MEDAS publié
(PREDIMED, 14 items)** inverse le verdict :

| Item | MEDAS publié | Servi par l'application | PDF cabinet (selon l'audit) |
|---|---|---|---|
| Huile d'olive | ≥ 4 c. à s./jour | « plus de 4 c. à s. » (`alimentaire.ts:65`) | « < 4 » |
| Légumes | ≥ 2 portions/j, **dont ≥ 1 crue** | « au moins 2 portions dont 1 crue » (`alimentaire.ts:69`) | sans la mention « crue » |

Sur ces deux items, **l'application est plus fidèle à l'instrument publié que
le PDF qu'on lui oppose**. L'audit le pressent (« probablement une inversion »)
puis range malgré tout l'arbitrage sous la fidélité au PDF.

**La portée dépasse largement l'alimentaire.** Le banc de certification
SOURCE ↔ SERVI livré en LOT-02/LOT-03 (PR #371, #373, déjà mergées) prend le
PDF du cabinet comme référence. Appliqué mécaniquement, il **corrigerait
l'application vers une copie dégradée** de l'instrument publié — en croyant
faire de la fidélité.

> **Règle à acter.** La référence de certification est la **publication
> primaire**. Le PDF du cabinet est un **troisième artefact**, à auditer
> lui-même, au même titre que la version servie. Un écart servi ↔ PDF n'est un
> défaut du servi que si le PDF est lui-même conforme à la publication.

Cette règle est le correctif le plus rentable de tout le rapport : elle est
gratuite, et elle protège les 59 instruments du banc, pas seulement les trois
questionnaires alimentaires.

### 5.3 « Restaurer les 57 items SIIN » n'est pas symétrique au renommage

L'audit présente deux options à parité. Elles ne le sont pas.

L'audit établit lui-même que le questionnaire SIIN à 57 items n'a **ni DOI, ni
publication primaire, ni validation psychométrique indépendante** — ses seuils
globaux (`<25`, `26–50`, `51–70`, `>71`) ne s'appuient sur rien de vérifiable.
Le restaurer fidèlement coûterait plusieurs semaines (57 items, cotation
conditionnelle 0/1/2, refonte du scoring, banc, tests) **pour aboutir à un
instrument qui resterait en niveau de preuve B** — exactement le niveau
actuel (`constants.ts:108`).

Renommer la version courte (`WN_ALI_SCREEN_14_v0`), lui retirer ses seuils
cliniques et l'assumer comme dépistage Wellneuro non validé coûte moins d'une
journée et supprime le même risque : celui d'une version locale qui emprunte
la réputation d'un référentiel qu'elle ne reproduit pas.

**Recommandation** : renommer maintenant. Ne décider de restaurer les 57 items
que si les sous-scores par domaine (§5.4) démontrent avoir besoin de cette
granularité. **[à arbitrer]**

### 5.4 Le tableau à 15 domaines est surdimensionné pour les données disponibles

L'audit démontre lui-même que la majorité de ses 15 domaines ne peut être
alimentée par rien de ce que l'application collecte : HOMA-IR (« capacité
nulle »), homocystéine (« nulle »), micronutriments (« faible à moyenne »),
index et charge glycémiques, protéines en g/kg/j, sodium/potassium.

Livrer 15 domaines dont 9 afficheraient « non documenté » apprend au praticien
à ne plus ouvrir le panneau. C'est le mode d'échec classique d'un tableau de
bord clinique.

**Ce qu'il faut garder** : la structure à quatre informations
(`statut / confiance / sources / niveau de conclusion`). Elle est excellente,
et c'est elle qui porte la valeur — pas le nombre de lignes.

**Ce qu'il faut réduire** : commencer par **5 à 6 domaines réellement
discriminés** par les items existants — diversité végétale, couverture probable
en fibres, oméga-3 (ALA et EPA-DHA **séparés**, la distinction de l'audit est
juste), qualité glucidique, produits ultra-transformés, rythme alimentaire.
Chaque domaine supplémentaire arrive avec l'instrument qui le nourrit, jamais
avant.

### 5.5 La simulation raconte causalement ce qu'elle interdit de conclure

Le document pose (§27) l'interdiction de toute conclusion causale. Mais sa
propre narration est causale : Jour 10 (aucune préparation → forte envie
sucrée) opposé à Jour 12 (préparation la veille → envie faible) *est*
l'inférence que le praticien tirera.

L'interdiction ne suffit donc pas : il faut aussi que l'application **n'arrange
pas les données de façon à rendre l'inférence inévitable**. Juxtaposer une
colonne « journées préparées » et une colonne « envie sucrée » est une
affirmation causale faite par la mise en page, quel que soit le texte
d'avertissement.

**Règle de conception à acter** : la vue de confrontation juxtapose **par
question clinique**, jamais par hypothèse mécanistique ; tout rapprochement
suggérant un mécanisme porte ses limites **en ligne**, pas en note de bas de
page. Le document le pressent sans l'opérationnaliser. **[à arbitrer]**

### 5.6 Le régime calibrage est un chantier plus lourd que ne le suggère le §28

Le §28 compresse en une puce (« évaluation des habitudes sur 21 jours ») ce qui
est en réalité le plus gros lot du programme. Le `TrialTrace` actuel
(occasion / faisable / issue / friction, `web/src/lib/food-observation/trace.ts`)
**ne peut pas représenter une journée repère** de la simulation (heure de
première prise, présence d'une source protéique, caféine avant la première
prise, structure du déjeuner, collation de fin d'après-midi, contexte).

Il faudrait au minimum : une **taxonomie de types de journée** (poste matin /
poste après-midi / repos / week-end), un **objet plan d'échantillonnage**, un
**moteur de couverture qui raisonne sur les types manquants** — c'est lui qui
produit la phrase « Une journée sans travail aiderait à comprendre ce qui
change » du §10 — et une **capture structurée par journée**. Aucun de ces
quatre objets n'existe.

C'est faisable et cohérent. Ce n'est pas une variante du formulaire actuel.

---

## 6. Priorités

### P0 — Sécurité métrologique (jours, aucune dépendance)

1. Détacher `Q_SOM_06` du besoin 2. Le besoin 2 devient **non évalué**
   (couverture `null`, jamais 0) tant qu'aucune source pertinente n'existe —
   la convention est déjà en place pour les besoins 3, 6, 7 et 11
   (`constants.ts:55`).
2. Retirer la promesse d'estimation de `Q_ALI_03`, **dans le catalogue et dans
   ses consignes servies** (`questionnaires-catalog.ts:37-38`,
   `alimentaire.ts:107`). Retirer ou câbler `MO10`.
3. Marquer les seuils de `Q_ALI_01` comme provisoires, source non certifiée.
4. Interdire explicitement à l'IA de conclure à une carence à partir de ces
   scores (règle à porter dans le prompt de synthèse).

> ⚠️ **Ces changements modifient des scores servis.** Ils imposent un bump
> `VERSION_SCORE_EQUILIBRE` v3 → v4 (`constants.ts:12`) et une note de
> frontière : un épisode figé en v3 ne se compare pas à un épisode v4, la
> comparaison de momentum reprend au premier couple v4. C'est une modification
> de **logique clinique** : demande explicite du praticien et entrée
> `CHANGELOG.md` requises avant exécution.

### P0 bis — Brancher l'écriture patient existante **[à arbitrer]**

Techniquement : quelques lignes, la route est prête et testée (§4.4). Cela
convertit un formulaire décoratif en instrument réel, et corrige au passage
`sessionStorage` → persistance serveur.

**Mais c'est une décision de gouvernance, pas d'implémentation.** Cela fait
atterrir de la donnée alimentaire patient en base sous un hébergement
**non-HDS**, gate `G-TRUST-04` non levé, phase de test bornée au 2026-10-21
(`.wn/state.json`, `blocking_issues`). À trancher avant, pas après.

### P1 — Fidélité aux sources, avec la règle corrigée

Appliquer la règle de §5.2 (publication primaire comme référence) et rejouer
le banc sur les trois instruments alimentaires. Trancher `Q_ALI_01`
(renommage recommandé, §5.3) et le traitement de l'alcool dans `Q_ALI_02`
(§7, question 3). Retrouver — ou renoncer à — la source primaire de la méthode
Monnier ; à défaut, `Q_ALI_03` sort du pack.

### P2 — Profil alimentaire par domaines

5 à 6 domaines (§5.4), structure `statut / confiance / sources / niveau de
conclusion`, alimentés par les items existants. Aucun domaine sans instrument.

### P3 — Régime calibrage, épisode partagé, validation terrain

Le plus gros chantier (§5.6), dépendant de tout ce qui précède.

---

## 7. Questions au praticien

Ces quatre questions ne se tranchent pas en lisant du code.

1. **Besoin 2 « Micronutriments essentiels »** : le laisser non évalué, ou lui
   définir une nouvelle source ? (Rappel : il est fondation critique, donc son
   effondrement plafonne le score global à 50.)
2. **`Q_ALI_01`** : restaurer les 57 items SIIN, ou assumer un dépistage court
   Wellneuro renommé et sans seuils cliniques ? (Recommandation : le second,
   §5.3.)
3. **`Q_ALI_02`** : MEDAS fidèle — où la consommation de vin rapporte un
   point — ou adaptation Wellneuro où l'abstinence n'est jamais pénalisée et
   l'alcool ne donne aucun bonus ? La première option est scientifiquement
   fidèle ; la seconde est compatible avec une restitution grand public
   française. Elles ne peuvent pas être satisfaites ensemble sous le même nom.
4. **Écriture patient du carnet avant le 2026-10-21** : acceptable sous
   l'hébergement actuel, ou à différer jusqu'à l'arbitrage HDS ?

---

## 8. Conclusion

L'accompagnement alimentaire de Wellneuro souffre d'un décalage, pas d'un
retard : **l'observation est prête pour un usage qu'elle n'a pas, la mesure
affirme plus qu'elle ne peut soutenir, et le patient saisit dans le vide entre
les deux.**

Les deux documents apportés sont justes sur leurs constats de fait — sept
vérifications sur sept — et proposent la bonne cible. Leur principal défaut est
de séquencer par la fidélité aux sources, alors que le geste le plus urgent est
le **retrait d'un signal faux** : la fatigue ne mesure pas les micronutriments,
et elle plafonne aujourd'hui l'indicateur global de tout patient fatigué.

Leur principal angle mort est la **définition de la source** : opposer
l'application au PDF du cabinet conduit, sur `Q_ALI_02`, à vouloir dégrader une
implémentation correcte. Acter que la référence est la publication primaire est
le correctif le moins cher et le plus large de ce rapport.

Est-ce pertinent de faire évoluer l'accompagnement alimentaire ? Oui — mais en
commençant par retirer ce que l'application affirme à tort, avant d'ajouter ce
qu'elle pourrait affirmer à raison.
