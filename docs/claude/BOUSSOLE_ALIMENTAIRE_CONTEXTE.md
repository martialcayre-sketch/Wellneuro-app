# Boussole alimentaire & Nutrition Lab — Contexte consolidé
# Complète ROADMAP_AGENT_PLAN.md et PROJET_CONTEXTE.md

> **Amendement WellNeuro 5.0 — 2026-07-18.** Ce document est conservé comme
> blueprint historique. En cas de conflit, REGISTRE_FRONTIERES.md,
> PROGRAMME_WELLNEURO_5_0.md et la campagne C5 à huit lots prévalent. Pour C5
> V1 : scan et Open Food Facts sont différés ; le patient ne voit aucun score
> numérique ; le praticien voit le profil intrinsèque chiffré, sourcé et
> versionné ; le référentiel cible est PostgreSQL et couvre la distribution
> Ciqual complète des constituants validés, tandis que les 12 vedettes forment
> un manifeste séparé. L'espace praticien reste clair avec un rail sombre
> « Nuit spectrale » ; l'espace patient reste « Jardin » clair.

> Rédigé à partir de plusieurs sessions d'exploration (D0) sur l'intégration
> Ciqual/OpenFoodFacts, le Nutrition Lab praticien et la fonctionnalité de
> scan/lecture par aliment. Ce document est un **blueprint de conception**,
> pas du code. Il précède et prépare les lots **E1 / E2 / R2** du
> `ROADMAP_AGENT_PLAN.md`, et s'articule avec **R9 / Mon équilibre** (voir
> `docs/claude/MON_EQUILIBRE_CONTEXTE.md`) sans le dupliquer.
> En cas de conflit : `PROJET_CONTEXTE.md` fait foi sur l'architecture
> technique globale, ce fichier fait foi sur les décisions produit de cette
> fonctionnalité jusqu'à intégration dans `ROADMAP_AGENT_PLAN.md`.
> Toute génération de code se fait ensuite branche par branche, sur demande
> explicite, et toute migration sur confirmation explicite (règles projet).
> Patients d'exemple autorisés : Sophie Nicola, Jennifer Martin, Michel Dogné.
> Référence clinique associée : `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md`.
>
> **Historique des révisions de ce document, dans l'ordre :**
>
> 1. **Mise à jour terminologique** — suite à `MON_EQUILIBRE_CONTEXTE.md`, R9
>    est devenu « Mon équilibre » (patient) / « Cartographie
>    neuro-fonctionnelle » (praticien) — le terme « NeuroScore » est banni de
>    tout le projet, pas seulement de R9. Ce document a été renommé et purgé
>    du terme en conséquence (`NUTRITION_LAB_NEUROSCORE_SPEC.md` →
>    `NUTRITION_LAB_BOUSSOLE_SPEC.md` → `BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`).
>    La fonctionnalité de lecture par aliment/scan s'appelle **Boussole
>    alimentaire** — distincte de « Mon équilibre » (le score global 12
>    besoins) : la Boussole **alimente** un ou plusieurs besoins, elle ne les
>    remplace pas.
> 2. **Intégration du Guide de Neuro-Nutrition (12 besoins)** — correction
>    structurelle : la nutrition ne calcule directement que les besoins 1-3
>    (Classe 1, « carburant ») ; les besoins 4/5/9/10 ne sont jamais calculés
>    par ce module, seulement croisés en signal secondaire (niveau de preuve
>    D). Détail complet en §2.1.
> 3. **Résolution des 12 décisions ouvertes** (session du 2026-07-06) — les
>    points listés en §9 sont tranchés : point d'entrée MVP en vertical slice
>    (besoin 1 uniquement), pondération clinique du besoin 2, ajout des 3 axes
>    Niveau 2 nommés dès V1 (dont Clarté cognitive), restitution patient des
>    signaux Niveau 2 dès V1, chronobiologie différée après le MVP. Détail
>    complet en §9 (désormais "Décisions actées").

---

## 0. Ce qui a été tranché avant ce document

Trois décisions structurantes prises en session :

1. **Le score d'un aliment (Boussole alimentaire) ne dépend jamais de la
   biologie du patient.** Le score d'un aliment est une propriété
   *intrinsèque* de l'aliment (via sa composition). La biologie (HOMA,
   ferritine, oméga-3 index…) reste dans R5/E8, sous contrainte HDS, et n'est
   croisée qu'*a posteriori* dans la synthèse IA. HOMA est donc explicitement
   **hors périmètre** du score nutritionnel. Cohérent avec Mon équilibre : les
   biomarqueurs réels sont un raffinement T1 ultérieur, jamais un prérequis V1.

2. **Nommage des axes côté patient : évocateur**, pas biochimique.
   La biochimie (« précurseurs dopaminergiques ») reste un libellé interne
   praticien, jamais affiché tel quel au patient.

3. **On démarre par la logique clinique (mapping nutriment → axe), pas par la
   donnée.** Le mapping propriétaire est la fondation ; Ciqual et OFF viennent
   l'alimenter ensuite.

4. **Deux principes de Mon équilibre s'appliquent directement à la Boussole
   alimentaire, sans adaptation :**
   - *Aucune moyenne ne masque une carence sévère* — un axe fort ne doit
     jamais compenser mathématiquement un axe effondré dans une lecture
     agrégée (repas, panier, journée). Ceci confirme et renforce la décision
     §2.2 sur le traitement des éléments limitants : un axe très bas doit
     rester visible, pas dilué.
   - *Chaque donnée porte un niveau de preuve (A/B/C/D)*. Les données issues
     du calcul nutritionnel (Ciqual/OFF + mapping) sont par défaut de niveau
     **B** (référentiels neuronutrition) ; les lectures qui s'appuient sur des
     mécanismes biochimiques non consensuels ou des métaphores WellNeuro
     (ex. « voie dopaminergique » comme cadre narratif) sont de niveau **D**.
     Aucune donnée nutrition n'est de niveau A (réservé aux questionnaires
     cliniques validés) ni C (biologie fonctionnelle) — cohérent avec la
     décision 1 ci-dessus. Ce tag est stocké par axe dans le mapping (§2.2)
     et visible **praticien uniquement**, jamais patient.

---

## 1. Principe fondateur : trois couches, deux niveaux de score

### 1.1 Les trois couches de données (ne jamais fusionner)

| Couche | Source | Rôle | Statut |
|---|---|---|---|
| Nutritionnelle | Ciqual 2025 (Anses, Etalab 2.0) + Ciqual aliments moyens | Composition quantitative pour 100 g | Référentiel read-only, souverain, hors ligne |
| Produit | Open Food Facts (ODbL, crowdsourcé) | Produits industriels par code-barres | Cache local, fiabilité variable, réseau |
| Clinique propriétaire | Fiches vedettes SIIN + mapping WellNeuro | Interprétation neuronutritionnelle | Cœur différenciant, versionné |

Ciqual = la colonne vertébrale de calcul (aliments génériques : un œuf, du
saumon). OFF = le résolveur de produit à l'étagère (un yaourt de marque précis,
scanné). **OFF ne remplace jamais Ciqual** : il le complète là où Ciqual est
aveugle, et bascule vers un générique Ciqual dès qu'un produit manque.

**Ciqual a deux niveaux internes, à répartir par usage plutôt que par module** :
la table complète (~3 484 aliments, granularité fine : sardine, maquereau,
hareng...) et la table des aliments moyens (191 entrées génériques : « poisson
gras », « fromage », « légume vert cuit »). Répartir strictement « Lab = moyens,
Scan = complète » simplifierait à tort — dans les deux surfaces, les deux
niveaux servent, mais pas au même moment :

- **Journal alimentaire en saisie libre / rapide / interprétation photo** →
  aliments moyens en priorité. Le patient tape « du poisson » ou une photo est
  interprétée sans certitude sur l'espèce exacte : les aliments moyens évitent
  une fausse précision et réduisent le choix à l'écran (191 options plutôt que
  3 484), ce qui est bon pour l'UX mobile et pour la vitesse de saisie.
- **Fiches aliments vedettes SIIN** → table complète. Une fiche « poissons gras »
  pointe explicitement vers sardine, maquereau, hareng, saumon (cf.
  `hero_food_ciqual_mapping`, §5.2) : c'est le niveau de précision que porte déjà
  le modèle de données, il ne faut pas le dégrader.
- **Scan OFF** → table complète comme cible de fallback (un produit de marque
  scanné doit se rattacher à l'aliment générique le plus proche et le plus
  précis possible), avec repli sur un aliment moyen seulement si aucune
  correspondance fine n'est trouvée.

Point de vigilance : un même aliment loggé une fois via le journal (résolu en
aliment moyen) et une fois via le scan (résolu en aliment complet) ne doit pas
produire deux scores incohérents pour le patient. La table des aliments moyens
Ciqual documente déjà ses propres valeurs agrégées (pas une simple moyenne
arithmétique des contributeurs) — le score intrinsèque doit donc être calculé
indépendamment sur chaque niveau, avec une note interne (`niveau_precision:
moyen | complet`) plutôt qu'une tentative de les faire coïncider artificiellement.

### 1.2 Les deux niveaux de score (la clé de la scalabilité et du réglementaire)

C'est la distinction qui rend le scan techniquement réaliste ET juridiquement
tenable :

- **Score intrinsèque** — le profil de l'aliment/produit par axe, calculé une
  seule fois à partir de Ciqual/OFF + mapping. Universel (un saumon a le même
  profil pour tout le monde), matérialisé en cache, recalculé uniquement sur
  bump de version. C'est ce que la décision §0.1 garantit : indépendant du patient.

- **Lecture contextuelle** — le profil intrinsèque *lu à travers la priorité C1
  sélectionnée et le protocole C2 actif du
  protocole du patient*. Calculé à la lecture, très bon marché (pondération).
  Le patient voit seulement sa projection qualitative, jamais le score ou le
  profil brut ; le détail chiffré reste réservé au praticien.

Conséquence produit majeure : contrairement à Nutri-Score ou Yuka dont la note
est identique pour tout le monde, **le même produit s'affiche différemment**
selon Sophie (énergie + inflammation basse), Michel (satiété + glycémie) et
Jennifer (sommeil + hyperexcitabilité). On ne dit jamais « ce produit est bon /
mauvais » — on dit « il va dans ton sens / neutre pour toi en ce moment /
il t'éloigne un peu de ton objectif du moment ».

---

## 2. La Boussole alimentaire — modèle clinique

### 2.1 Les axes — modèle à deux niveaux (résolu via le Guide des 12 besoins)

**Correction structurelle importante** : une première version de ce document
proposait 7 axes « pairs » (Énergie/élan, Apaisement/sommeil, etc.), traités
comme des besoins indépendants. C'était une confusion entre l'**entrée**
(nutrition) et la **sortie** (état psychique). Le `Guide de Neuro-Nutrition —
Matrice des 12 Besoins Fondamentaux` clarifie : la nutrition est **exclusivement
Classe 1** (besoins 1-3, « le carburant »). Les besoins 4-12 existent dans
d'autres classes, évalués par leurs propres questionnaires/biomarqueurs
(PSQI, HAD, DNSM, cortisol, HVA/MHPG...). L'alimentation ne les calcule pas —
elle les **alimente**, et n'est croisée avec eux qu'*a posteriori* (le document
source est explicite : *« croiser obligatoirement la plainte clinique avec sa
base matérielle »* — c'est de la corrélation, pas du calcul direct).

**Niveau 1 — calculé directement par la Boussole alimentaire (Classe 1)**

| Besoin Mon équilibre | Contenu | Constituants / variables | Niveau de preuve |
|---|---|---|---|
| **1 — Équilibre de l'assiette** | Qualité alimentaire globale (modèle méditerranéen/MIND, part d'ultra-transformés, index glycémique) | Index oméga-3, charge glycémique, densité aliments ultra-transformés | B — cross-référencé avec score SIIN/90 (A, questionnaire existant), HOMA et HbA1c (C, hors périmètre nutrition) |
| **2 — Micronutriments essentiels** | Les « 5+3 majeurs » du référentiel SIIN | Fer/ferritine, zinc, magnésium, iode, sélénium, vitamine D, B9, B12 active | B — directement mappable sur les constituants Ciqual, aucune invention nécessaire |
| **3 — Rythme alimentaire (chronobiologie)** | Timing des repas, pas seulement leur contenu | Ratio protéines/glucides par moment de journée, durée du jeûne nocturne (nutripériode) | B — nécessite une capacité de modèle de données nouvelle (voir §4.1) |

C'est la vraie fondation du moteur de calcul (§2.3) : le score intrinsèque
d'un aliment se lit d'abord à travers ces 3 besoins, pas à travers des axes
narratifs indépendants.

**Niveau 2 — contributions secondaires (jamais calculées seules, uniquement
croisées dans la synthèse/triangulation, §4.4)**

| Signal nutrition | Alimente (sans jamais remplacer) | Constituants |
|---|---|---|
| Fibres fermentescibles, diversité végétale | Besoin 4 (perception corporelle / digestif-microbiote) — PSQI-équivalent : questionnaire TFI reste souverain | fibres, prébiotiques, polyphénols |
| Tryptophane, magnésium | Besoin 5 (mouvement/repos, sommeil) — le PSQI reste souverain | tryptophane, magnésium, glucides complexes |
| Magnésium, oméga-3, vitamine C | Besoin 9 (stress, charge allostatique) — les échelles de stress (Cohen, SIIN) restent souveraines | magnésium, oméga-3, vit C |
| DHA, choline, B9/B12, tryptophane | Besoin 10 (pensées fonctionnelles, DNSM) — le questionnaire DNSM reste souverain | DHA, choline, B9/B12, tryptophane |

Ces signaux sont **toujours de niveau D** (hypothèses WellNeuro sur le lien
nutrition→fonction psychique, pas un référentiel validé au même titre que le
besoin qu'ils touchent) — jamais présentés comme un calcul du besoin lui-même.
Formulation patient : *« votre alimentation semble aller dans le sens de votre
objectif sommeil »*, jamais *« votre alimentation détermine votre sommeil »*.

**Décision actée (§9.11) : ces signaux Niveau 2 sont affichés explicitement au
patient dès la V1**, pas seulement en interne praticien — toujours au
conditionnel/en signal, jamais en affirmation de calcul du besoin.

**Trois de ces signaux sont nommés comme axes patient dès V1 (§9.7)**, en plus
des 3 axes Niveau 1 (besoins 1/2/3) :
- **Calme/stress** — libellé patient du signal vers le besoin 9 (stress,
  charge allostatique).
- **Microbiote/digestif** — libellé patient du signal vers le besoin 4
  (perception corporelle / digestif-microbiote).
- **Clarté cognitive** — libellé patient du signal vers le besoin 10 (pensées
  fonctionnelles, DNSM), inclus dès V1 malgré l'absence de correspondance
  formelle dans le modèle R9 actuel (décision assumée, pas un report).

Le signal vers le besoin 5 (sommeil, tryptophane/magnésium) reste en Niveau 2
sans libellé d'axe dédié pour l'instant — pas de 4e axe nommé dans ce lot.

**« Anti-inflammatoire » et « Antioxydant »** n'ont pas de besoin dédié dans la
matrice des 12 — ils sont déjà couverts en filigrane : l'index oméga-3 dans le
besoin 1, les micronutriments antioxydants (zinc, sélénium, vit D) dans le
besoin 2. Pas d'axe séparé nécessaire ; ce sont des **sous-vues** de ces deux
besoins pour la restitution patient, pas des besoins supplémentaires.

**Conséquence pour le vertical slice déjà testé (café, sommeil vs énergie)** :
le mécanisme reste valide — la caféine est une variable du besoin 1/2 dont
l'effet se lit en signal secondaire vers le besoin 5 (négatif) et le besoin 9/10
(positif, vigilance) — mais elle doit désormais être présentée comme telle :
une variable Classe 1 avec deux lectures secondaires, pas deux « axes »
indépendants qui se contredisent.

**Oméga-3/6 — recommandation V1 inchangée** : pas un axe scoré à part, un
**indicateur transversal** (ratio ω-6/ω-3) qui *module* l'axe anti-inflammatoire
plutôt que de dupliquer ses constituants.

Cette table passe donc de 4 à 6 axes nommés dès V1 (les 3 axes Niveau 1 —
équilibre de l'assiette, micronutriments, rythme alimentaire — plus les 3 axes
Niveau 2 nommés ci-dessus — Calme/stress, Microbiote/digestif, Clarté
cognitive) + 1 lecture dérivée (« Humeur », §9.8 — jamais un axe calculé,
confirmé). C'est toujours conforme au principe « axes = données, pas code »
(§2.1 intro) : on ajoute des lignes, le moteur ne change pas.

### 2.2 Le mapping propriétaire (la table qui vaut de l'or)

Une entrée du mapping, conçue dès le départ pour servir les deux niveaux de
score et rester extensible :

```
nutrient_axis_weight
- axis_code            ex. "apaisement_sommeil"
- nutrient_code        clé constituant Ciqual (ex. tryptophane)
- direction            favorable | limitant | modulateur
- poids                pondération relative dans l'axe (0..1)
- cofacteur_group      nullable — regroupe des cofacteurs interdépendants
- source_ref           traçabilité vers la fiche SIIN
- seuil_reference      VNR EFSA si applicable, sinon null
- version_mapping      versionnage (un v1 ne se compare pas à un v2)
```

Trois choix de modélisation, avec recommandations V1 :

1. **Un nutriment peut alimenter plusieurs axes** (le magnésium touche
   apaisement *et* inflammation). V1 : poids dupliqué par axe, assumé — la
   normalisation par axe (§2.3) évite que ça gonfle un score global.

2. **Cofacteurs** (le tryptophane sans B6/magnésium a un effet réduit). V1 :
   **somme pondérée simple**, sans plafonnement — mais le champ
   `cofacteur_group` est **réservé dès le schéma** pour ajouter la logique de
   plafonnement en v2 *sans nouvelle migration*. C'est le compromis
   rapidité/évolutivité.

3. **Éléments limitants** (sucres rapides pour l'axe sommeil le soir, excès ω-6
   pour l'inflammation). V1 : le modèle porte `direction=limitant` dès le
   départ ; le seed V1 se concentre sur le favorable + un petit set de limitants
   bien établis (décision actée, §9.3 — pas d'élargissement du set V1 au-delà
   du minimal bien établi). Restitution **toujours** en « marge de
   progression », jamais en « erreur » (principe non-culpabilisant du projet).

**Décision actée (§9.0) : la pondération interne du besoin 2 est clinique, pas
équi-pondérée** — fer, B9 et B12 pèsent plus lourd que zinc, iode, sélénium et
vitamine D dans `nutrient_axis_weight`, reflétant la fréquence de ces carences
en pratique clinique. Les valeurs de poids exactes restent à fixer dans la
branche `feat/e1-mapping-seed-v1` (pas de chiffre arbitraire non sourcé ici).

### 2.3 Calcul du score intrinsèque

Déterministe, jamais généré par IA :

```
Pour chaque aliment/produit et chaque axe :
  score_brut = Σ (valeur_nutriment_100g × poids × signe(direction))
             sur tous les nutriments mappés à l'axe
  score_0_100 = normalisation(score_brut) selon les bornes de l'axe
```

Normalisation V1 recommandée : **min-max par axe** sur les bornes observées dans
Ciqual (percentiles p5/p95 pour robustesse aux valeurs aberrantes), plutôt que
des seuils cliniques absolus. Simple, reproductible, versionnable. Les
paramètres de normalisation par axe sont stockés et rattachés à `version_score`.

Résultat matérialisé en cache :

```
food_intrinsic_score
- food_ref             code Ciqual OU code-barres OFF
- source               ciqual | off | off_fallback_ciqual
- axis_code
- score_0_100
- version_score
- version_mapping
- computed_at
```

Recalcul déclenché **uniquement** par un bump de `version_score` ou
`version_mapping` — pas à chaque lecture. C'est ce qui rend le scan scalable :
la lecture patient est une simple jointure sur du cache.

### 2.4 Versionnage (analogue à versionPrompt)

`version_score` + `version_mapping`, sur le modèle déjà acté pour `versionScore`
(R9) et `versionPrompt` (prompt caching). Un score calculé en v1 reste marqué
v1 ; il ne se compare jamais silencieusement à un v2. Toute modif du mapping ou
de la formule = bump + trace `CHANGELOG.md` + validation praticien
(logique clinique).

### 2.5 Vertical slice historique (supplanté pour C5 V1 par le cadrage 5.0)

Le point d'entrée du chantier n'est pas la Phase A complète : c'est un
**vertical slice étroit**, pour valider l'expérience de bout en bout (score
intrinsèque → score contextuel → restitution patient) avant d'élargir aux 6
axes et aux 191 aliments moyens.

Périmètre historique du slice :
- **Un seul axe Niveau 1** : besoin 1 (équilibre de l'assiette) — le mieux
  cadré (index glycémique, oméga-3, ultra-transformés), déjà cross-référencé
  avec le score SIIN/90 existant.
- **~12 aliments vedettes** comme manifeste d'exposition ; en 5.0, elles sont
  un sous-ensemble du registre JA et ne bornent pas la distribution Ciqual.
- **Scan OFF différé hors C5 V1** ; l'ancien cas du produit scanné n'est plus
  un critère d'acceptation des huit lots.
- **Chronobiologie (besoin 3) hors slice** (décision §9.10) : pas de
  `feat/e1-journal-chronobiologie` avant que le slice besoin 1 n'ait validé
  l'expérience. Le champ `meal_entry.heure` reste différé.
- Le besoin 2 (micronutriments) et les 3 axes Niveau 2 nommés (§2.1) suivent
  une fois le slice besoin 1 validé — pas dans ce premier lot.

Les branches de la §8 (Phase A/B) restent valides telles que décrites : ce
slice en est un sous-ensemble à traiter en premier à l'intérieur de chacune
(ex. `feat/e1-mapping-seed-v1` ne seed que le besoin 1 dans un premier temps),
pas une réécriture du séquencement.

---

## 3. Le scan Boussole alimentaire — l'innovation patient

L'usage réel d'OFF, c'est ici : le patient scanne ou interroge le Lab **quand il
fait ses courses**, à l'instar du Nutri-Score mais personnalisé à son objectif.

### 3.1 Scanner un produit

Le patient scanne un code-barres → OFF résout le produit → score intrinsèque
(cache) → **lecture contextuelle** filtrée par ses axes actifs.

Exemple, céréales sucrées scannées le soir :
- Couche intrinsèque : « glucides rapides élevés, fibres faibles, micronutriments faibles ».
- Pour **Jennifer** (sommeil) : *« Ce produit trouve mieux sa place le matin que
  le soir pour votre objectif apaisement. Au dîner, une petite portion de
  féculent complet soutient mieux votre sommeil. »*
- Pour **Michel** (satiété/glycémie) : lecture différente, centrée charge
  glycémique et satiété.
- La biochimie (« disponibilité du tryptophane ») reste en détail clinique
  repliable, jamais en titre.

### 3.2 Scanner le panier, pas seulement le produit

Scanner article par article rend obsessionnel. La vraie valeur = l'agrégation :
le patient scanne son caddie et reçoit une lecture d'ensemble — *« votre panier
soutient bien votre axe protection cellulaire ; il gagnerait à être renforcé sur
l'axe apaisement »*. On passe du contrôle produit-par-produit (anxiogène) à une
vision de cohérence globale (rassurante). C'est exactement le triptyque
sérieux / ludique / rassurant du projet.

### 3.3 L'effet de compensation, jamais la sanction

Si le patient met un produit peu aligné dans son panier, l'app **ne barre rien
en rouge** — elle propose l'équilibre : *« ce dessert s'accorde bien avec une
source de fibres et de protéines au même repas »*. Traduction magasin du
principe « écart utile » : jamais « vous avez mal acheté », toujours « voici
comment l'équilibrer ».

### 3.4 La transparence de la source comme argument de sérieux

OFF est inégal — au lieu de le cacher, on l'affiche : « Données produit :
Open Food Facts, fiabilité moyenne, 3 contributeurs » vs « Données : équivalent
Ciqual générique ». Le patient sait sur quoi repose le score. La faiblesse d'OFF
devient un marqueur d'honnêteté (« sérieux dans le fond »). Corollaire : si un
produit manque, le patient peut contribuer (photo d'étiquette) — ce qui améliore
OFF pour tous et enrichit le cache.

### 3.5 Interroger, pas seulement scanner

À côté du code-barres, le patient pose une question en rayon : *« qu'est-ce qui
soutient mon sommeil au rayon frais ? »* → réponse filtrée par son protocole,
puisée dans les fiches vedettes SIIN. Le scan répond « ce produit précis » ;
l'interrogation répond « que chercher ». C'est la « liste de courses clinique »
et le « menu adaptatif » du brainstorm, amenés dans le magasin en temps réel.

Scalabilité de l'interrogation : V1 = requête classée sur le catalogue vedette
filtré par axes actifs. V2 = RAG pgvector (déjà prévu D4/D7) pour une
interrogation en langage naturel plus riche.

### 3.6 Mode dégradé (indispensable — le scan se fait en magasin)

| Situation | Comportement |
|---|---|
| Produit dans le cache OFF | Score intrinsèque immédiat |
| Produit absent du cache, réseau OK | Appel OFF, mise en cache, score |
| Produit absent d'OFF | Fallback : rattachement à un générique Ciqual proche + mention explicite de la source dégradée |
| Réseau faible/absent | Ciqual embarqué localement fonctionne hors ligne ; OFF en file d'attente pour re-résolution ultérieure |

---

## 4. Le Nutrition Lab praticien

Le Lab n'est pas qu'un tableau de bord qui *affiche l'état* — il est
**projectif et triangulant**.

### 4.1 Journal alimentaire

Saisie patient (guidée / favoris / photo-texte à interpréter avec validation
humaine), lecture praticien structurée (qualité protéique, densité
micronutritionnelle, charge glucidique, qualité lipidique, fibres, diversité
végétale). **On n'affiche jamais les calories en premier** — on affiche « ce
repas soutient-il votre énergie / sommeil / humeur / satiété / microbiote ? ».

**Capacité à ajouter — chronobiologie (besoin 3)** : le journal doit capturer
l'**heure** de chaque repas, pas seulement son contenu, pour calculer le ratio
protéines/glucides par moment de la journée et la durée du jeûne nocturne
(nutripériode). C'est un ajout de modèle de données (`meal_entry.heure`), pas
seulement un nouvel axe de lecture — sans cette donnée, le besoin 3 ne peut
tout simplement pas être évalué, quelle que soit la qualité du mapping
nutriment→besoin.

### 4.2 Radar nutritionnel

Le radar par axe (Recharts, déjà retenu en D1 pour la viz de score). Côté
praticien : voir immédiatement si l'alimentation soutient ou fragilise le
terrain clinique.

### 4.3 Le simulateur projectif (innovation praticien)

Le praticien ne consulte pas seulement l'état actuel — il **simule** : *« Si
Sophie remplace son huile de tournesol par du colza et ajoute des poissons gras
2×/semaine, voici l'impact projeté sur ses axes. »* Le Lab devient un outil
d'aide à la décision qui teste des hypothèses avant de les inscrire dans le
protocole (R4). Aucune app grand public ne fait ça, faute de mapping axe
propriétaire et d'objectif par patient.

### 4.4 La triangulation à trois pieds

Le roadmap acte déjà que questionnaires × biologie en synthèse est différenciant.
On ajoute le **journal alimentaire** comme 3e source : *« Sophie rapporte une
fatigue élevée au questionnaire, et ses apports estimés en fer/B9/B12 semblent
bas sur les repas renseignés — piste à explorer, à confirmer en biologie. »*
Trois sources convergentes = signal clinique fort. Toujours « piste », jamais
« conclusion » : le journal oriente, la biologie confirme.

### 4.5 Sorties générées

Aliments vedettes priorisés, substitutions rentables (« gain clinique de
substitution »), assiettes personnalisées par objectif, protocole 21 jours
(stabiliser → densifier → personnaliser), liste de courses clinique, synthèse
patient (IA encadrée), note praticien. Tout contenu IA passe par **validation
praticien** avant diffusion patient.

### 4.6 Catalogue consolidé — tous les outils évoqués dans les deux documents

Les deux documents partagés listent une trentaine d'outils. Beaucoup sont des
variantes d'un même mécanisme (calcul + lecture contextuelle) plutôt que des
briques séparées. Consolidation par mécanisme, avec statut :

| Outil évoqué | Mécanisme sous-jacent | Statut dans ce blueprint |
|---|---|---|
| Journal alimentaire (saisie guidée / favoris / photo) | Saisie → moteur de calcul | ✅ couvert §4.1 |
| Moteur de calcul nutritionnel (repas/jour/moyennes 3-7j) | Agrégation `meal_item` × Ciqual | ✅ couvert §5.3 (`nutrition_analysis`) |
| Radar neuronutritionnel | Lecture contextuelle par axe | ✅ couvert §4.2 |
| Score « repas dopamine matin » / « sérotonine soir » | **Même mécanisme** que le score contextuel, appliqué à un repas au lieu d'un aliment isolé | ✅ couvert — c'est une agrégation du score contextuel (§1.2) sur `meal_item`, pas un nouvel algorithme |
| Score « assiette anti-inflammatoire » / « anti-inflammatoire » | Idem, sur l'axe anti-inflammatoire | ✅ idem |
| Détecteur de « trous nutritionnels » (3-7 jours) | Lecture des axes en dessous d'un seuil sur une fenêtre glissante | 🆕 à ajouter — variante temporelle du radar, pas un nouveau moteur |
| Comparateur « repas actuel vs optimisé » | Deux scores contextuels côte à côte + delta | 🆕 à ajouter — pédagogique, réutilise le moteur existant |
| Assistant « top 10 aliments personnalisés » | Classement des aliments vedettes par score contextuel décroissant sur les axes actifs du patient | 🆕 à ajouter |
| Générateur de substitutions intelligentes | Recherche d'un aliment à score contextuel supérieur dans la même famille + « gain clinique » = delta de score | 🆕 à ajouter — dépend de `clinical_food_tag` pour définir la famille |
| Assiettes personnalisées (types : sommeil, anti-inflammatoire, énergie…) | Assemblage structuré (base protéique + végétale + glucide + lipide + aliment vedette) filtré par axes actifs | 🆕 à ajouter — nouvelle table `assiette_type` (cf. §5.2 étendu) |
| Liste de courses clinique | Extraction des aliments vedettes/assiettes d'un protocole en cours | 🆕 à ajouter, dépend de R4 (protocole builder) |
| Menu adaptatif (contraintes : temps, budget, tolérance, régime) | Filtrage supplémentaire sur les assiettes/aliments vedettes | 🆕 à ajouter, V2 probable — dépend de contraintes patient non encore modélisées |
| Assistant « écart utile » (compensation) | **Même mécanisme** que la compensation du scan (§3.3), appliqué au journal plutôt qu'au panier | ✅ couvert conceptuellement — un seul mécanisme, deux surfaces |
| Carte aliment dynamique (pourquoi/pour qui/combien/quand) | Lecture du `hero_food_profile` + score contextuel | ✅ couvert §5.2 (`hero_food_profile`) |
| Protocole alimentaire 21 jours (3 phases) | Séquencement de recommandations dans le temps | ⚠️ relève de **R4** (protocole builder), pas de ce module — la nutrition alimente R4, ne le remplace pas |
| Ordonnance alimentaire / checklist quotidienne | Sortie formatée du protocole 21 jours | ⚠️ idem, sortie de R4 |
| Outil d'aide à la prescription (biologie → priorité alimentaire) | Triangulation | ✅ couvert §4.4, sous réserve R5/HDS pour la biologie réelle |
| Simulateur projectif praticien | Recalcul du score contextuel sur un journal hypothétique modifié | ✅ couvert §4.3 |

**Deux enseignements de cette consolidation** : d'abord, la plupart des « outils »
du brainstorm ne sont pas des briques nouvelles mais des **angles d'affichage
différents du même moteur** (score contextuel + lecture par axe) — ce qui
confirme que l'architecture à deux niveaux (§1.2) est la bonne fondation.
Ensuite, le protocole 21 jours et l'ordonnance alimentaire ne doivent **pas**
être construits dans ce module : ils appartiennent à R4, qui les orchestre en
consommant la nutrition comme un ingrédient parmi d'autres (compléments,
hygiène de vie, biologie). Les construire ici créerait un doublon avec R4.

---

## 5. Architecture de données consolidée

### 5.1 Référentiels (read-only, aucune donnée patient, aucun enjeu HDS)

```
ciqual_food            (code, nom_fr, groupe, sous_groupe, version_ciqual)
ciqual_nutrient        (code, nom, unité, catégorie)
ciqual_value           (food_id, nutrient_id, valeur_100g, code_qualité, source)
ciqual_aliment_moyen   (191 aliments génériques + contributeurs — traçabilité)
off_product_cache      (barcode, nom, nutriments, nutriscore, nova, additifs,
                        fiabilité, contributeurs, fetched_at)  ← cache, pas mirror
```

### 5.2 Couche clinique propriétaire (versionnée)

```
neuro_axis                 (axis_code, label_patient, label_praticien, description,
                            besoin_niveau1 [1|2|3 — calcul direct] OU
                            besoin_niveau2 [4|5|9|10 — contribution secondaire,
                            jamais calculée seule], niveau_preuve [A|B|C|D],
                            version_mapping, actif)
nutrient_axis_weight       (le mapping — cf. §2.2)
hero_food_sheet            (fiche SIIN brute : titre, type, source, texte_brut, statut)
hero_food_profile          (résumé patient/praticien, intérêts, fréquence, portion,
                            précautions, alternatives)
hero_food_ciqual_mapping   (profil ↔ aliments Ciqual, niveau : exact|proche|famille|générique)
                            → gère 1 fiche SIIN → N aliments Ciqual (poissons gras →
                              sardine, maquereau, hareng, saumon…)
clinical_food_tag          (tags WellNeuro : inflammation, humeur, mémoire, satiété…)
food_intrinsic_score       (cache matérialisé — cf. §2.3)
```

### 5.3 Couche métier patient (scopée patient — E3 auth requise pour le nominatif)

```
meal_entry / meal_item     (journal : aliment, quantité g, repas, **heure** —
                            nécessaire au besoin 3, rythme alimentaire)
nutrition_analysis         (totaux jour, moyennes 3j/7j, écarts objectifs)
protocole_objectif         (axes actifs du patient — lien vers R4)
scan_history               (nominatif → nécessite E3 ; historique de scans/paniers)
```

**Séparation propre pour le multi-praticien futur (D6)** : référentiels + mapping
= globaux/partagés ; seuls journal, analyses, protocole et historique de scan
sont patient-scopés. Cette frontière prépare le multi-tenant sans refonte.

---

## 6. Architecture technique & scalabilité

| Dimension | Décision de conception |
|---|---|
| Volume Ciqual | ~3 484 aliments × 74 constituants ≈ 258k lignes de valeurs — petit, tient en base et embarquable localement pour le hors-ligne |
| Volume OFF | Millions de produits — **on ne mirrore pas**, on cache uniquement ce qui est scanné, avec TTL de rafraîchissement |
| Compute score | Intrinsèque calculé **une fois**, matérialisé ; contextuel calculé à la lecture (jointure bon marché) |
| Recalcul | Déclenché seulement par bump `version_score` / `version_mapping` |
| Hors ligne | Ciqual local → scan fonctionne sans réseau ; OFF en dégradé + file d'attente |
| Déterministe vs IA | Calcul = déterministe (Ciqual/mapping) ; narratif = IA encadrée. L'IA **ne calcule ni n'invente jamais** une valeur |
| Coût IA | Prompt système clinique stable (cache prompt Anthropic, cf. `PROMPT_CACHING.md`) ; données volatiles patient dans le message utilisateur |
| Extensibilité axes | Axes = données, pas code → ajouter un axe = insérer des lignes |
| Interrogation | V1 requête classée sur catalogue vedette ; V2 RAG pgvector (D4/D7) |
| Ingestion Ciqual | Script one-shot (pas une route API), mise à jour annuelle manuelle |

---

## 7. Garde-fous réglementaires & licences

- **Vocabulaire** : « recommandation », « indice de suivi », « cohérence avec
  votre objectif ». Jamais « prescription », « diagnostic », « carence »,
  « bon/mauvais produit ». « Vos apports estimés semblent insuffisants sur les
  repas renseignés », jamais « vous êtes carencé ».
- **Dispositif médical évité par conception** : le score est un *indice de suivi*
  bien-être, validé praticien avant toute diffusion patient. Le journal oriente,
  la biologie confirme, l'analyse ne remplace pas le bilan.
- **Nutri-Score est une marque déposée** (Santé publique France) : on ne copie ni
  la lettre A–E ni la pastille Yuka. Signature propre : une **boussole / jauge
  orientée vers *ton* axe**, pas une note absolue — d'où le nom **Boussole
  alimentaire**, jamais un aval officiel sous-entendu, et jamais « NeuroScore »
  (terme banni projet, cf. `MON_EQUILIBRE_CONTEXTE.md`).
- **Licences** : Ciqual = Etalab 2.0 (réutilisation libre, attribution). OFF =
  **ODbL** → attribution obligatoire + partage à l'identique sur la base
  dérivée : le cache OFF doit rester attribué ; le mapping propriétaire par-dessus
  n'est pas contaminé. Pas de « partenariat API » à signer (OFF est ouvert), mais
  attribution à respecter et esprit de contribution en retour.
- **HDS** : le score nutritionnel n'utilise **aucune** donnée de santé réelle →
  pas d'enjeu HDS. La biologie (R5/E8) reste conditionnée à D6.

---

## 8. Séquencement en lots et branches (1 PR = 1 périmètre)

Rattachement au roadmap : ceci **enrichit E1**, **prépare une composante de
E2/R9**, **réalise R2 (scan)**, et dépend de **E3** (auth) + **E4** (dashboard)
pour la partie patient. Aucune dépendance nouvelle inventée.

### Phase A — Fondation clinique (parallélisable avec tout ; aucune UI)

| Branche | Périmètre | Migration ? |
|---|---|---|
| `feat/e1-neuro-axes-schema` | Tables `neuro_axis`, `nutrient_axis_weight` | Oui → **confirmation requise** |
| `feat/e1-mapping-seed-v1` | Seed du mapping v1 depuis les fiches SIIN (données) | Non |
| `feat/e1-ciqual-schema` | Tables `ciqual_*` + aliments moyens | Oui → **confirmation requise** |
| `feat/e1-ciqual-ingest` | Script d'import one-shot Ciqual 2025 | Non (lecture/insert données ref) |
| `feat/e1-off-cache` | Client OFF + `off_product_cache` + fallback Ciqual | Oui → **confirmation requise** |

### Phase B — Moteur de score (déterministe, testable sans UI)

| Branche | Périmètre |
|---|---|
| `feat/e2-intrinsic-score-engine` | Calcul + matérialisation `food_intrinsic_score`, `version_score` |
| `feat/e2-contextual-score` | Lecture contextuelle par axes actifs du protocole |

### Phase C historique — Nutrition Lab praticien

Le cadrage 5.0 remplace le thème sombre global par un espace de travail clair
avec rail sombre de signature Nuit spectrale. Les radars et dataviz décrits
ci-dessous sont différés hors V1, dont la restitution est textuelle et tabulaire.

| Branche | Périmètre |
|---|---|
| `feat/lab-journal-praticien` | Saisie + lecture structurée du journal (résolution aliments moyens par défaut) |
| `feat/lab-radar-nutritionnel` | Radar par axe (Recharts), 7 axes |
| `feat/lab-trous-nutritionnels` | Détection de sous-seuils sur fenêtre 3-7 jours |
| `feat/lab-comparateur-repas` | Comparateur repas actuel vs optimisé |
| `feat/lab-substitutions` | Générateur de substitutions + gain clinique |
| `feat/lab-assiettes-types` | Bibliothèque d'assiettes personnalisées par axe |
| `feat/lab-top-aliments` | Classement personnalisé des aliments vedettes |
| `feat/lab-simulateur-projectif` | Simulation d'impact de substitutions |
| `feat/lab-triangulation` | Croisement journal × questionnaires (× biologie en lecture) |

Ces branches restent indépendantes les unes des autres une fois la Phase B
livrée : chacune ne fait qu'un nouvel affichage du même score contextuel
(cf. §4.6), donc aucune ne bloque les autres.

### Phase D — Scan patient (dépend de E3 auth + E4 dashboard ; thème patient clair)

| Branche | Périmètre |
|---|---|
| `feat/scan-produit-mvp` | Scan code-barres → OFF → score contextuel |
| `feat/scan-panier` | Agrégation panier + lecture de cohérence globale |
| `feat/scan-compensation` | Suggestions d'équilibrage (« écart utile ») |
| `feat/scan-interrogation` | Requête en rayon filtrée par axes (catalogue vedette) |
| `feat/scan-historique` | Historique nominatif (nécessite E3) |

Chaîne de dépendances : A → B → (C ‖ D). C ne dépend pas de E3 ; D en dépend
(historique nominatif). A et B sont parallélisables avec E0 et sans UI.

---

## 9. Décisions actées (session du 2026-07-06)

Les 12 points ci-dessous, précédemment ouverts, sont désormais tranchés.
Chaque résolution est reportée à l'endroit du document qu'elle impacte
(références croisées entre parenthèses) ; cette section sert de journal de
décision, pas de liste de questions.

0. **Pondération interne du besoin 2** (→ §2.2) : **pondérée par priorité
   clinique**, pas équi-pondérée — fer, B9, B12 pèsent plus lourd que
   zinc/iode/sélénium/vitamine D. Valeurs exactes à fixer dans
   `feat/e1-mapping-seed-v1`.
1. **Oméga-3/6** (→ §2.1) : indicateur transversal modulant le besoin 1,
   confirmé — pas d'axe scoré indépendant.
2. **Cofacteurs** (→ §2.2) : somme pondérée simple en V1, `cofacteur_group`
   réservé pour plafonnement v2, confirmé.
3. **Ampleur du set « limitant » en V1** (→ §2.2) : minimal + bien établi,
   confirmé — pas d'élargissement dans ce lot.
4. **Normalisation** (→ §2.3) : min-max par axe sur percentiles p5/p95 Ciqual,
   confirmé — pas de seuils cliniques absolus.
5. **Point d'entrée historique** (→ §2.5) : cette décision est supplantée par
   le cadrage C5 5.0. Le besoin 1 et les 12 vedettes restent la tranche
   éditoriale, mais le scan OFF est différé et la normalisation s'appuie sur la
   distribution complète des constituants validés.
6. **Répartition Ciqual moyens/complet** (→ §1.1) : règle proposée confirmée
   (journal libre → moyens, vedettes/scan → complet), pas de séparation
   stricte par module.
7. **Passage de 4 à 6 axes nommés + 1 lecture dérivée** (→ §2.1) : Calme/stress
   et Microbiote/digestif ajoutés, **et Clarté cognitive incluse dès V1**
   malgré l'absence de correspondance formelle dans le modèle R9 actuel —
   décision assumée, pas un report conditionné à R9.
8. **« Humeur » en lecture dérivée** (→ §2.1) : confirmé, pas d'axe calculé
   dédié — reste une sous-vue des besoins 1+2.
9. **Protocole 21 jours / ordonnance alimentaire** (→ §4.6) : confirmé hors
   périmètre de ce module, relèvent de R4 — frontière actée pour éviter un
   doublon.
10. **Chronobiologie (besoin 3)** (→ §2.5) : **différée après le MVP** — pas
    de `feat/e1-journal-chronobiologie` avant que le vertical slice
    (besoin 1) ait validé l'expérience de bout en bout.
11. **Restitution patient des contributions secondaires (Niveau 2)** (→ §2.1) :
    **affichée explicitement au patient dès la V1** (« va dans le sens de
    votre objectif sommeil »), pas gardée en signal interne praticien
    uniquement — toujours en signal, jamais en calcul affirmé du besoin.

Aucune de ces décisions n'ouvre à elle seule une branche ou n'autorise une
migration : chaque branche de la §8 reste soumise aux règles projet
(confirmation explicite avant toute migration Prisma/SQL), et le périmètre
réel du premier lot est celui du vertical slice décrit en §2.5, pas
l'ensemble de la Phase A.
