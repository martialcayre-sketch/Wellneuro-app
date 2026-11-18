# Guide de Neuro-Nutrition — Matrice des 12 Besoins Fondamentaux
# Document de référence clinique — WellNeuro NNPP2

> Document source fourni par Martial, utilisé comme référence clinique pour
> le mapping nutriment → besoin de `docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`
> et pour la méthodologie de `docs/claude/MON_EQUILIBRE_CONTEXTE.md` (R9).
> À citer comme `source_ref` dans les entrées de `nutrient_axis_weight` qui
> s'appuient sur les seuils ou variables listés ici.

## Objectif du document

Fournir une matrice algorithmique et didactique des 12 besoins fondamentaux
du cerveau et du psychisme, répartis en 4 classes (Nutritionnels, Somatiques,
Sensoriels, Psychiques), qui coexistent en permanence. Principe directeur :
toujours prioriser le diagnostic et la correction des besoins « matériels »
(classes 1 et 2) avant d'optimiser les besoins « immatériels » (classes 3 et 4).

---

## Classe 1 — Besoins nutritionnels (le carburant)

### 1. Le choix des aliments bénéfiques (équilibre de l'assiette)

Le cerveau a besoin d'une alimentation optimale et antioxydante (modèle
méditerranéen ou MIND), riche en légumes, baies, noix, et pauvre en produits
ultra-transformés.

- **Section réécrite sur le dossier de preuve signé** (`D-516`, 2026-11-13,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 1 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : la mesure dérivée de l'Enquête alimentaire SIIN,
  forme complète — le total hors items du sous-score du rythme, qui restent au
  besoin 3, maximum dérivé du barème servi ; deux biomarqueurs, lus chacun à
  part. Le troisième biomarqueur de la version précédente de cette section est
  « non évalué ». Sous la forme courte de l'enquête, le besoin est non évalué.
- **Règle de décision** : un constat descriptif, item par item, sans tranche ;
  chaque biomarqueur rapporté avec sa valeur de référence signée et sa source,
  sans diagnostic ; trois constats séparés, sans règle « ou ». La règle
  précédente (tranche sur le total, « ou » entre deux variables) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat ou un conseil, la liste de
  provenance seule est au `D-516` §5.4.
- **Population visée et « non évalué »** : `D-516` §4.
- **Motif de la part de pondération** : non tranché (`D-516` §6.3).
- **Application** : lot J3-12f.

### 2. Les micronutriments essentiels

Le fonctionnement neuronal, la neurogenèse et la synthèse des
neurotransmetteurs exigent des cofacteurs précis (minéraux, vitamines,
polyphénols, acides aminés).

- **Variables d'entrée** : biomarqueurs, les « 5 majeurs + 3 » : ferritine
  (fer), zinc sérique, magnésium érythrocytaire, iode, sélénium, vitamine D,
  B9, B12 active.
- **Aucune source questionnaire depuis la v4 du score** (2026-07-27).
  L'échelle de fatigue de Pichot y figurait ; elle en a été retirée, la fatigue
  étant un motif d'*explorer* le fer, la B12, les folates ou la vitamine D, et
  non leur *mesure*. Ce besoin étant une fondation critique, l'assimilation
  plafonnait le score global à 50 sur une carence jamais mesurée. Le besoin
  reste donc **non évalué** (couverture `null`, jamais 0) tant qu'aucune source
  pertinente n'existe — voir
  `docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/`.
- **Règle de décision** : si carence détectée (ex. vitamine D < 45 ng/ml ou
  ferritine basse), générer un protocole de supplémentation
  micronutritionnelle individualisée.

### 3. Le rythme alimentaire (chronobiologie)

L'efficacité des fonctions cérébrales et la synthèse des neurotransmetteurs
dépendent des horloges biologiques et de la répartition des nutriments dans
la journée.

- **Variables d'entrée** : ratio protéines/glucides des repas, durée du
  jeûne nocturne (nutripériode).
- **Source questionnaire depuis le 2026-07-28** : sous-score `RYTHME_CHRONO` de
  l'Enquête alimentaire SIIN (`Q_ALI_01`) — `SIIN52` et `SIIN53` (protéines et
  ratio du petit déjeuner), `SIIN54` (jeûne nocturne, seuil ≥ 10 h, celui de la
  règle ci-dessous), `SIIN55` (répartition de la charge sur la journée). Soit
  7 points, DISTINCTS de la catégorie d'affichage `RYTHME_ALIMENTAIRE` qui en
  compte 10. En sont écartés `SIIN50` (régularité des prises) et `SIIN51`
  (restauration rapide) : ni l'un ni l'autre ne relève des deux variables
  d'entrée ni de la répartition des nutriments. Servi seulement quand les quatre
  items sont répondus — partiel vaut « pas de mesure », jamais une mesure basse.
  Le besoin reste non évalué tant que `WN_ALI_01_SIIN57` est éteint.
- **Règle de décision** : prescrire des protéines le matin (dopamine) et des
  glucides complexes en fin de journée (sérotonine), en assurant un jeûne
  nocturne d'au moins 10 à 12h.

---

## Classe 2 — Besoins somatiques (le corps)

### 4. La perception et les sensations corporelles

Le cerveau a besoin de se percevoir (schéma corporel) pour s'ancrer et
ressentir une sécurité fondamentale archaïque. Englobe le confort digestif
(axe intestin-cerveau).

- **Section réécrite sur le dossier de preuve signé** (`D-526`, 2026-11-15,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 4 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : deux questionnaires internes SIIN, sur symptômes
  déclarés — troubles fonctionnels digestifs et intestinaux (`Q_GAS_01`) et
  hyperexcitabilité (`Q_INF_01`) — qui repèrent et suivent, sans diagnostic.
  La douleur et la conscience intéroceptive sont des variables du besoin,
  sans instrument servi. Les deux biomarqueurs de perméabilité de la version
  précédente de cette section sont « non évalués ».
- **Règle de décision** : un constat par questionnaire. Les barèmes de la
  pièce pro sont transcrits mot pour mot, et les valeurs frontières suivent
  une convention signée comme arbitrage. Les bandes affichent le constat ;
  les claims du dossier ne fondent aucun déclenchement, et les lignes
  existantes restent régies par leurs décisions. Aucune règle d'ordre entre
  les constats du besoin ; la routine et la hiérarchie de ce guide n'en sont
  pas modifiées. Un score ne qualifie jamais à lui seul une
  plainte de fonctionnelle. La règle précédente (réparation sur trouble
  digestif ou hyperperméabilité, avant la sphère psychique) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. La liste des claims de provenance ou de limite seulement est au
  `D-526` §5.5.
- **Population visée et « non évalué »** : `D-526` §4.
- **Motif de la part de pondération** : parts égales entre les deux
  questionnaires, aucune pondération sourcée (`D-526` §6.3).
- **Application** : lot J3-12f.

### 5. Les mouvements, les fonctions corporelles et le repos

Alternance indispensable entre l'activité corporelle (qui nourrit le
cerveau) et les phases de repos (qui restaurent).

- **Section réécrite sur le dossier de preuve signé** (`D-529`, 2026-11-16,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 5 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : le mouvement, par le sous-score d'activité
  physique du questionnaire de mode de vie SIIN (`Q_MOD_01`), support sans
  référence publiée ; le GPAQ en est la référence publiée, non servie, qui ne
  le valide pas. Le repos, par le PSQI (`Q_SOM_01`), l'agenda du sommeil
  (`Q_SOM_09`, niveau D, `D-424`), l'Epworth (`Q_SOM_02`) et la seule fatigue
  générale du MFI-20 (`Q_SOM_07`). Le rythme biologique, par le questionnaire
  de Horne (`Q_SOM_05`), hors score. La mobilité est « non évaluée ».
- **Règle de décision** : un constat par instrument. Les seuils affichent le
  constat ; les claims du dossier ne fondent aucun déclenchement, et les deux
  lignes existantes qui lisent la bande du PSQI restent régies par leurs
  décisions. Le PSQI et l'Epworth s'affichent en deux lectures : la lecture
  publiée en référence, la grille servie comme lecture sans source publiée.
  À l'application de J3-12f, deux bornes servies suivront la grille publiée,
  et le questionnaire de Horne gardera la grille d'origine avec une note qui
  renvoie à sa validation française (`D-538`). Les indicateurs du GPAQ restent de population. Les options (activité,
  hygiène du sommeil, sieste) sont à la main du praticien, aucun score ne les
  déclenche ; un doute d'apnée appelle un adressage médical. La règle
  précédente (remise en mouvement et hygiène du sommeil au socle, sur une
  sédentarité ou un seuil du PSQI) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. La liste des claims de provenance ou de limite seulement est au
  `D-529` §5.5.
- **Population visée et « non évalué »** : `D-529` §4.
- **Motif de la part de pondération** : mouvement et repos à parts égales,
  aucune pondération sourcée ; poids du repos selon `D-438` (`D-529` §6.3,
  motif confirmé par le responsable).
- **Application** : lot J3-12f.

### 6. Le besoin de respirer (oxygénation)

La respiration est le carrefour physiologique et émotionnel pour équilibrer
le système nerveux autonome.

- **Variables d'entrée** : fréquence cardiaque, stress perçu, présence de
  soupirs/bâillements.
- **Règle de décision** : intégrer des recommandations de mécanique
  ventilatoire (cohérence cardiaque, yoga, étirements).

---

## Classe 3 — Besoins sensoriels et émotionnels (la zone de risque)

### 7. Se nourrir de sensations favorables

Le cerveau exige des stimulations via les cinq sens (lumière, sons, toucher,
odeurs) pour assurer la croissance et la maintenance du système nerveux.

- **Variables d'entrée** : analyse du mode de vie (exposition à la lumière
  du jour, contacts sensoriels).
- **Règle de décision** : proposer des actions sensorielles compensatrices
  (luminothérapie, aromathérapie, musicothérapie).

### 8. Se nourrir de sensations plaisantes

Nécessité d'activer les boucles dopaminergiques et de récompense par le
plaisir sensoriel et la satisfaction, pour contrer l'anhédonie.

- **Variables d'entrée** : échelle HAD (sous-échelle Dépression, anhédonie).
- **Règle de décision** : si score HAD-D > 10, recommander la réintégration
  de « 3 petits plaisirs par jour » en pleine conscience.

### 9. Les sensations-émotions fondamentales (gestion du stress)

Besoin de repères émotionnels clairs. L'accumulation de stresseurs
déséquilibre le système nerveux autonome (sympathique/parasympathique).

- **Section réécrite sur le dossier de preuve signé** (`D-541`, proposée le
  2026-11-18, en attente d'acceptation, `D-312` §3). Les claims, valeurs et
  sources sont au dossier privé du besoin 9 ; ici, les mécanismes seulement
  (`D-251` §4).
- **Variables d'entrée** : le stress perçu, par la PSS-10 (`Q_STR_02`), seule
  source du score (cible du 2026-10-18, niveau A). Le SIIN (`Q_STR_01`) et le
  Cungi (`Q_STR_03`) sont des repères du cabinet, hors score, sans référence
  publiée. Le DASS-21, le BMS-10, le questionnaire de Karasek et le WART sont
  lus au praticien, hors score, un constat chacun. La régulation émotionnelle
  est documentée, non servie. Biologie : le cortisol au réveil et le ratio
  cortisol/DHEA sont documentés et hors score ; le ratio est « non évalué ».
  Le système nerveux autonome est « non évalué ».
- **Règle de décision** : un constat par instrument. Aucun claim du dossier ne
  fonde un déclenchement sur un seuil ou une grille ; la grille servie du
  total de la PSS-10 est une lecture du cabinet, sans source publiée, et les
  quatre lignes existantes qui lisent une bande de la PSS-10, du BMS-10 ou du
  DASS-21 resteraient régies par leurs décisions (proposition, `D-541` §6.1). Les options (prise en
  charge selon la HAS, rhodiole en usage traditionnel, magnésium, régulation
  émotionnelle) sont à la main du praticien, aucun score ne les déclenche. La
  règle précédente (« protocole d'urgence » sur un cortisol au réveil altéré
  ou un score de stress élevé) est retirée : aucun claim ne fonde son
  déclencheur ni la notion de protocole d'urgence.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. Les claims de provenance ou de limite seulement sont au `D-541` §5.5.
- **Population visée et « non évalué »** : `D-541` §4.
- **Application** : lot J3-12f.

---

## Classe 4 — Besoins psychiques (le sommet)

### 10. Les pensées fonctionnelles, positives et stables

Besoin cognitif de schémas de pensée constructifs (dopamine/vitalité) et
d'un esprit apaisé, capable de prendre du recul sans agitation mentale
(sérotonine/sérénité).

- **Variables d'entrée** : questionnaires DNSM (Dopamine, Noradrénaline,
  Sérotonine, Mélatonine). Biomarqueurs : HVA, MHPG, 5-HIAA (urines), ratio
  Kynurénine/Tryptophane.
- **Règle de décision** : si score DNSM > 18 sur un axe, compenser via des
  précurseurs en acides aminés (tyrosine, tryptophane) et des exercices
  mentaux (méditation, rééducation cognitive).

### 11. Les besoins de sens et de valeurs

Besoin d'accomplissement (Maslow). L'esprit a besoin d'un engagement
fluide, d'altruisme et de bienveillance pour atteindre l'état de flow et le
bonheur.

- **Variables d'entrée** : évaluation clinique du niveau de conscience et
  d'engagement. Biomarqueur systémique de neuroplasticité : BDNF.
- **Règle de décision** : conditionnel — cette étape ne peut être consolidée
  que si les besoins 1, 2 et 3 (et par extension la classe 3) sont
  stabilisés. Recommander des pratiques de pleine conscience.

### 12. Les besoins de reliance

Besoin d'être connecté sainement à soi-même (congruence), aux autres
(couple, amis, société) et à son écosystème (nature, transcendance).

- **Variables d'entrée** : échelle d'évaluation analogique (EVA) du
  bien-être au travail/social, questionnaire Mélatonine (isolement,
  marginalisation).
- **Règle de décision** : si déconnexion détectée, utiliser l'éducation
  thérapeutique pour relancer le lien social et la connexion aux rythmes
  universels (chronobiologie).

---

## Routine d'aide décisionnelle (logique de traitement)

1. **Phase d'acquisition** — consolider les données du patient issues des
   explorations contextuelles (mode de vie), dimensionnelles (échelles HAD,
   DNSM, stress) et biologiques.
2. **Phase d'évaluation** — mapper les déficits sur les 12 besoins en
   pourcentage d'accomplissement. Croiser obligatoirement la plainte
   clinique (ex. fatigue) avec sa base matérielle (ex. indice HOMA,
   ferritine).
3. **Phase de hiérarchisation** — appliquer la pyramide d'urgence : si un
   besoin des classes 1 ou 2 est en déficit, bloquer toute tentative de
   résoudre les besoins de classe 4 uniquement par la psychologie. Générer
   d'abord un protocole de correction physiologique (assiette, sommeil,
   intestin).

## Hiérarchie décisionnelle — l'iceberg de l'esprit

- **Classes 1 et 2** (60 % de la pondération) — fondations matérielles,
  base immergée. Priorité absolue : bloquer toute intervention
  psychologique complexe si des alertes rouges sont détectées ici.
- **Classe 3** (20 %) — ligne de flottaison, zone tampon corps/esprit.
  Une fois le métabolisme de base relancé, évaluer la charge allostatique
  avant de traiter les pensées dysfonctionnelles.
- **Classe 4** (20 %) — sommet émergé, expression de la pleine santé
  mentale. Ne se traite isolément que si les classes 1, 2 et 3 sont solides.

**Principe pour l'agent** : ce guide fonctionne comme un diagnostic de
bâtiment — scanner d'abord les fondations (classes 1 et 2), ne déployer les
outils d'optimisation mentale (classe 4) qu'une fois la physiologie réparée
et le système nerveux apaisé (classe 3).
