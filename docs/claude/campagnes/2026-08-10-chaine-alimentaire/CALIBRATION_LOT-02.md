# LOT-02 — Doctrine de calibration & descente claim par claim (Notebook 09)

> **Statut : artefact de préparation. Candidats seulement.**
> Aucune décision `D-xxx`, aucun code, aucune borne chiffrée. Ce document fonde
> la future décision clinique de calibration **sans rien inventer** : chaque
> cellule attribuée renvoie à un claim **sourcé et validé** du corpus.
> La porte des 21 jours reste fermée (recueil réel arrêté au 1er jour) : le
> chiffrage des bornes/poids attend une distribution réelle.

Références de code : agrégats `web/src/lib/agenda-alimentaire/agregats.ts:27-64` ·
contrat `web/src/lib/agenda-alimentaire/types.ts:8-35` · seuils de donnée
`types.ts:66-95` · squelette scorer `web/src/lib/questions.ts:3931-4052` ·
discordance `web/src/lib/equilibre/discordanceRythme.ts` · frontière SQL
`web/prisma/checks/agenda_alimentaire_v1.sql:138-189`.

---

## 1. Doctrine de calibration

### 1.1 Ce que l'agenda observe RÉELLEMENT (contrat `agenda-alimentaire-v1`)

Horaires des prises, structure repas / hors-repas, et **quatre booléens** à
trois états (`null` = abstention) : `premierePriseProteines`,
`legumesDeuxPrises`, `fruitsOuOleagineux`, `ultraTransformes`, plus
`soirPlusCopieux` (sans abstention).
**Jamais** de quantité, gramme, kcal, ni aliment identifié au-delà de ces
présences (`types.ts:8-13`). L'indice est de **niveau de preuve D, longitudinal,
jamais diagnostique** (`types.ts:18-20`).

### 1.2 Trois sorties distinctes — jamais un seul score

1. **Profil observé** — les 6 domaines candidats (§2) en valeurs réelles + leur
   couverture. Existe déjà : agrégats versés à la clôture (LOT-00).
2. **Indice `/100` optionnel** — secondaire, post-calibration, jamais servi sous
   couverture insuffisante, jamais diagnostique. Existe déjà : squelette scorer
   `agenda_alimentaire` (LOT-02, #643), **axes vides**, refuse de coter.
3. **Carte des discordances** — SIIN57 déclaré ↔ Agenda observé, **objet distinct
   de premier rang**. Existe déjà : LOT-01 (D-040), 3 axes (jeûne, protéines
   matin, soir). Réserve : à élargir aux axes A1/A3/A5/A6 quand ils seront posés.

### 1.3 Garde de contamination (donnée ≠ clinique) — **non négociable**

Les seuils d'exploitabilité/plausibilité `MIN_JOURS_AGREGATS=7`,
`MIN_JOURS_INDICE=14`, `MIN_JOURS_WEEKEND_INDICE=4`, `MIN_JOURS_AXE=7`,
`MIN_PAIRES_JEUNE=7`, `FENETRE_ALI_MAX_PLAUSIBLE=1080` (18 h),
`JEUNE_MAX_PLAUSIBLE=1440` (24 h) sont des **seuils de DONNÉE** (`types.ts:60-95`).
Ils **ne doivent jamais glisser en bornes cliniques** de l'indice. « Fenêtre ≤ 18 h
techniquement plausible » ≠ « fenêtre de 18 h cliniquement acceptable ».

### 1.4 Interdits durs (registre des frontières, entrée « JA »)

- Aucune projection de l'agenda vers `Q_ALI_01`/`Q_ALI_02` (MEDAS/SIIN57).
- Les présences observées **ne sont pas un MEDAS abrégé** (`types.ts:10-13`).
- Aucune inférence de quantité/kcal/gramme (verrou SQL `agenda_alimentaire_v1.sql`).
- `soirPlusCopieux` = **drapeau longitudinal, jamais des points** dans l'indice.

---

## 2. Six domaines candidats (A1–A6) — statut *candidats*, pas axes validés

| # | Domaine candidat | Variables observées (agrégats) | Sens attendu | Risque principal |
|---|---|---|---|---|
| **A1** | Régularité temporelle | `regularitePremiereEcartType`, `regulariteDerniereEcartType` | régularité (SD basse = mieux) | seuil non calibré ; relation non linéaire |
| **A2** | Fenêtre / jeûne nocturne | `fenetreAliMoyenne`, `jeuneMedian` | organisation circadienne | relation potentiellement non linéaire ; ne pas promouvoir 18 h/24 h |
| **A3** | Structure des prises | `nbRepasMoyen`, `nbHorsRepasMoyen`, `freqHorsRepasSem`, `freqMoinsDeuxRepasSem` | structuration vs dispersion | contexte individuel |
| **A4** | Ancrage protéique matinal | `freqProteinesMatinSem` | qualité de première prise | booléen déclaratif ; pas de quantité |
| **A5** | Densité végétale minimale | `freqLegumesSem`, `freqFruitsSem` | présence d'aliments protecteurs | présence ≠ quantité ni diversité |
| **A6** | Charge ultra-transformée | `freqUltraTransformesSem` | exposition comportementale | classification déclarative simplifiée |
| *(drapeau)* | Repas du soir copieux | `freqSoirCopieuxSem` | *aucun point* | **drapeau seul** |

---

## 3. Matrice d'attribution — descente claim par claim (Notebook 09, 160 claims)

Sources : `WN-SRC-0053` (enquête alimentaire, 15) · `0067` (comportements, 18) ·
`0068` (aliments vedettes, 9) · `0069` (produits sucrés, 12) · `0070`
(poissons/viandes, 22) · `0071` (matières grasses, 27) · `0072` (végétaux, 33) ·
`0073` (boissons, 24). **Total 160, tous `statut=VALIDE`, `active`.** (Pas de
numéro de page dans le corpus : la source `WN-SRC` fait foi.)

Catégories : **Axe A1–A6** (le claim justifie de coter une variable observée) ·
**Drapeau** · **Interdit de projeter** (reconstruirait MEDAS/SIIN57 ou une
quantité non observée) · **Hors-agenda — SIIN57** (thème réel non observé par
l'agenda). *usage* ∈ {support | observé | drapeau}. *score o/n* = candidat.

### 3.1 Claims ATTRIBUÉS à un axe agenda (support clinique)

Tous portent la même **limite structurelle** : l'agenda observe une **présence
ou un horaire**, jamais une quantité, une diversité ni une identité d'aliment.

| Axe | claim_id | Formulation (courte) | Variable agenda (`AGA_`) | usage | score o/n | limite |
|---|---|---|---|---|---|---|
| A1/A2 | WN-CL-0053-010 | La chronobiologie alimentaire est l'un des 3 contextes à évaluer | `AGA_REGULARITE_*`, `AGA_JEUNE_MEDIAN`, `AGA_FENETRE_ALI_MOYENNE` | support | o | fonde l'axe, pas de borne |
| A1/A3 | WN-CL-0067-002 | Manger régulièrement, éviter grignotages/restauration rapide | `AGA_REGULARITE_*`, `AGA_FREQ_HORS_REPAS_SEM` | support | o | « régulièrement » non chiffré |
| A3 | WN-CL-0067-015 | Manger régulièrement, éviter les grignotages | `AGA_FREQ_HORS_REPAS_SEM`, `AGA_FREQ_MOINS_DEUX_REPAS_SEM` | support | o | idem |
| A4 | WN-CL-0067-008 | Petit déjeuner complet riche en protéines, pauvre en sucré | `AGA_FREQ_PROTEINES_MATIN_SEM` | observé | o | présence O/N, pas la quantité |
| A4 | WN-CL-0067-016 | Petit déjeuner riche en protéines (idem 008) | `AGA_FREQ_PROTEINES_MATIN_SEM` | observé | o | idem |
| A4 | WN-CL-0067-018 | Chronobiologie : petit-déjeuner riche en protéines, pauvre en sucreries | `AGA_FREQ_PROTEINES_MATIN_SEM` | observé | o | idem ; lie A4↔chrono |
| A5 | WN-CL-0068-007 | Baies/petits fruits rouges : bénéfices cognitifs/humeur/sommeil | `AGA_FREQ_FRUITS_SEM` | support | o | présence « fruits/oléagineux », pas le type |
| A5 | WN-CL-0072-006 | Abondance de légumes (modèle méditerranéen), effet protecteur | `AGA_FREQ_LEGUMES_SEM` | support | o | présence ≥ 2 prises, pas la quantité |
| A5 | WN-CL-0072-008 | Consommer des légumes verts à feuilles idéalement au quotidien | `AGA_FREQ_LEGUMES_SEM` | support | o | présence, pas la variété |
| A5 | WN-CL-0072-012 | Consommer tous les jours légumes fruits/fleurs, crus et cuits | `AGA_FREQ_LEGUMES_SEM` | support | o | présence, pas cru/cuit |
| A5 | WN-CL-0072-020 | La noix de Grenoble fait partie du modèle méditerranéen crétois | `AGA_FREQ_FRUITS_SEM` | support | o | présence oléagineux |
| A5 | WN-CL-0072-022 | Études : intérêt de la noix quotidienne en troubles neuropsy | `AGA_FREQ_FRUITS_SEM` | support | o | présence, pas la dose |
| A5 | WN-CL-0072-023 | Consommer quotidiennement des noix de Grenoble | `AGA_FREQ_FRUITS_SEM` | support | o | présence |
| A5 | WN-CL-0072-026 | Effets cliniques des fruits à coque bien démontrés | `AGA_FREQ_FRUITS_SEM` | support | o | présence |
| A5 | WN-CL-0072-027 | Consommer quotidiennement et varié noix et oléagineux | `AGA_FREQ_FRUITS_SEM` | support | o | présence, pas la variété |
| A5 | WN-CL-0073-006 | Rajouter des noix chaque jour optimise le fonctionnement neuronal | `AGA_FREQ_FRUITS_SEM` | support | o | présence |
| A5 | WN-CL-0073-007 | Conseil des noix quotidiennes : études cliniques evidence-based | `AGA_FREQ_FRUITS_SEM` | support | o | présence |
| A5 | WN-CL-0072-017 | > 400–600 g de légumes/j (méditerranéen protecteur) | `AGA_FREQ_LEGUMES_SEM` | support | o | **quantité NON observée** — présence seule |
| A6 | WN-CL-0067-006 | Éviter la consommation régulière d'édulcorants intenses | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | UPF/sucrés en présence, pas l'édulcorant précis |
| A6 | WN-CL-0069-006 | Les produits ultra-transformés ont un impact neuropsychique négatif | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | présence quotidienne O/N |
| A6 | WN-CL-0069-007 | Excès de sucres simples/rapides délétère (microbiote, glycémie) | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | présence, pas la quantité |
| A6 | WN-CL-0069-010 | Le sucre n'est pas « l'aliment du cerveau » à consommer davantage | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | rationale éducatif |
| A6 | WN-CL-0069-011 | Sucres ajoutés : vulnérabilité au trouble dépressif majeur | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | présence |
| A6 | WN-CL-0069-012 | La limitation de la quantité de sucre est fondamentale | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | présence (quantité non observée) |
| A6 | WN-CL-0069-005 | Limiter UPF/sucrés à 15 % de l'acte d'achat | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | **porte-seuil (15 %) + « achat » ≠ présence/j → revue individuelle** |
| A6 | WN-CL-0072-030 | Orienter vers céréales complètes, non raffinées, non ultra-transformées | `AGA_FREQ_ULTRA_TRANSFORMES_SEM` | support | o | présence UPF, pas le type de céréale |
| Drapeau | WN-CL-0067-017 | Petit-déj/déjeuner copieux, **repas du soir léger et digeste** | `AGA_FREQ_SOIR_COPIEUX_SEM` | drapeau | **non** | alerte, jamais des points |
| Drapeau | WN-CL-0067-018 | Chronobiologie : matin valorisé (protéines) | `AGA_FREQ_SOIR_COPIEUX_SEM` / `AGA_FREQ_PROTEINES_MATIN_SEM` | drapeau/observé | non (soir) / o (A4) | soir = drapeau ; matin = A4 |

### 3.2 Claims INTERDITS de projeter (MEDAS/SIIN57 ou quantité non observée)

Ces claims **fondent `Q_ALI_01`/`Q_ALI_02`**, pas l'agenda : les reprendre
reconstruirait un score MEDAS/SIIN ou exigerait une quantité que l'agenda
n'observe pas. **Exclus de tout axe** (frontière `types.ts:10-13`).

- **MEDAS (14 items) — `Q_ALI_02`** : `WN-CL-0053-001`, `-002`, `-003`, `-004`,
  `-005`, `-006`, `-007`, `-008`.
- **Enquête/score SIIN — `Q_ALI_01`** : `WN-CL-0053-011`, `-012`, `-013`, `-014`,
  `-015` (bandes de score 0–90) ; `WN-CL-0072-001`, `-003`, `-004`, `-005` ;
  `WN-CL-0073-001`, `-002`, `-003`, `-004`, `-005`, `-011` ; `WN-CL-0070-001`,
  `-002` ; `WN-CL-0071-001`, `-002` (« grilles d'évaluation » / « score le plus
  élevé »).
- **Quantité non observable promue en règle** : `WN-CL-0072-002` (pain complet,
  règle SIIN). *(Les quantités isolées d'un claim de support restent au titre de
  « limite » en §3.1, ex. `0072-017`.)*

### 3.3 Claims HORS-AGENDA — SIIN57 (thème réel, non observé par l'agenda)

L'agenda ne recueille ni matières grasses, ni poisson/viande, ni boissons, ni
nutriments/quantités : ces claims relèvent de l'enquête SIIN57/`Q_ALI` et du
conseil, **pas du barème agenda**. Listés pour la trace de non-couverture.

- **`WN-SRC-0053`** (méthodo/contexte) : `-009`.
- **`WN-SRC-0067`** (filières, cuissons, aliments, comportements) : `-001`, `-003`,
  `-004`, `-005`, `-007`, `-009`, `-010`, `-011`, `-012`, `-013`, `-014`.
- **`WN-SRC-0068`** (épices, chocolat, agrumes, algues, soja) : `-001`, `-002`,
  `-003`, `-004`, `-005`, `-006`, `-008`, `-009`.
- **`WN-SRC-0069`** (féculents, IG, sel, addiction) : `-001`, `-002`, `-003`,
  `-004`, `-008`, `-009`.
- **`WN-SRC-0070`** (poissons & viandes — nutrition/quantités/filières) : `-003`
  à `-022` (20 claims).
- **`WN-SRC-0071`** (matières grasses, huiles, laitiers, œufs) : `-003` à `-027`
  (25 claims).
- **`WN-SRC-0072`** (composition/diversité/céréales/graines) : `-007`, `-009`,
  `-010`, `-011`, `-013`, `-014`, `-015`, `-016`, `-018`, `-019`, `-021`, `-024`,
  `-025`, `-028`, `-029`, `-031`, `-032`, `-033`.
- **`WN-SRC-0073`** (hydratation, café, thé, vin, jus, méthodo enquête) : `-008`,
  `-009`, `-010`, `-012`, `-013`, `-014`, `-015`, `-016`, `-017`, `-018`, `-019`,
  `-020`, `-021`, `-022`, `-023`, `-024`.

### 3.4 Discordance (objet distinct)

La carte des discordances (LOT-01) compare le rythme **déclaré** (`Q_ALI_01`,
sous-score `RYTHME_CHRONO`) au rythme **observé** (agenda). Elle est déjà
grounded par sa source déclarative ; aucun claim nutrition de Notebook 09 n'y est
requis. Les claims chronobiologiques (`0053-010`, `0067-017/018`) **soutiennent
l'axe agenda correspondant** (§3.1), pas la comparaison elle-même. Réserve :
étendre la discordance aux axes A1/A5/A6 supposera d'exposer les sous-scores
correspondants côté `Q_ALI_01` (aujourd'hui seul `RYTHME_CHRONO` l'est).

---

## 4. Ébauche de config `sc.axes` — **SANS bornes chiffrées**

Forme lue par le scorer (`questions.ts:3981-3996`) : `{ id, label, source,
couvertureSource, bornes{bas,haut}, sens, poids }`. Ici **`bornes` absente** → le
scorer rend déjà `null` (jamais 0) ; **`poids` à poser** à la calibration. Les
axes multi-sources (A1/A2/A3/A5) sont laissés explicites, à trancher en
sous-axes sur distribution réelle.

```ts
// ÉBAUCHE — NON CÂBLÉE. bornes/poids restent VIDES tant que la porte des 21 jours
// n'est pas franchie. Le scorer refuse de coter tant que sc.axes est vide.
const axesCandidats = [
  // A1 — régularité temporelle (SD basse = mieux → sens inverse)
  { id: 'A1_REGULARITE_PREMIERE', label: 'Régularité 1re prise',
    source: 'AGA_REGULARITE_PREMIERE_ECART_TYPE',
    couvertureSource: 'AGA_NB_JOURS_AVEC_PRISES', sens: 'inverse' /* bornes: à poser */ },
  { id: 'A1_REGULARITE_DERNIERE', label: 'Régularité dernière prise',
    source: 'AGA_REGULARITE_DERNIERE_ECART_TYPE',
    couvertureSource: 'AGA_NB_JOURS_AVEC_PRISES', sens: 'inverse' },
  // A2 — fenêtre / jeûne (sens à trancher : relation possiblement non linéaire)
  { id: 'A2_FENETRE', label: 'Fenêtre alimentaire',
    source: 'AGA_FENETRE_ALI_MOYENNE',
    couvertureSource: 'AGA_NB_JOURS_FENETRE_CONNUE' /* sens/bornes: à poser */ },
  { id: 'A2_JEUNE', label: 'Jeûne nocturne médian',
    source: 'AGA_JEUNE_MEDIAN', couvertureSource: 'AGA_NB_PAIRES_JEUNE' },
  // A3 — structure des prises (dispersion = moins bien → sens inverse)
  { id: 'A3_MOINS_DEUX_REPAS', label: 'Jours < 2 repas',
    source: 'AGA_FREQ_MOINS_DEUX_REPAS_SEM',
    couvertureSource: 'AGA_NB_JOURS_AVEC_PRISES', sens: 'inverse' },
  { id: 'A3_HORS_REPAS', label: 'Grignotage (hors-repas)',
    source: 'AGA_FREQ_HORS_REPAS_SEM',
    couvertureSource: 'AGA_NB_JOURS_AVEC_PRISES', sens: 'inverse' },
  // A4 — ancrage protéique matinal (présence O/N → sens direct)
  { id: 'A4_PROTEINES_MATIN', label: 'Protéines à la 1re prise',
    source: 'AGA_FREQ_PROTEINES_MATIN_SEM',
    couvertureSource: 'AGA_NB_JOURS_PROTEINES_CONNU', sens: 'direct' },
  // A5 — densité végétale minimale (présence → sens direct)
  { id: 'A5_LEGUMES', label: 'Légumes à ≥ 2 prises',
    source: 'AGA_FREQ_LEGUMES_SEM',
    couvertureSource: 'AGA_NB_JOURS_CONTENU_CONNU', sens: 'direct' },
  { id: 'A5_FRUITS_OLEAGINEUX', label: 'Fruits ou oléagineux',
    source: 'AGA_FREQ_FRUITS_SEM',
    couvertureSource: 'AGA_NB_JOURS_CONTENU_CONNU', sens: 'direct' },
  // A6 — charge ultra-transformée (présence = moins bien → sens inverse)
  { id: 'A6_ULTRA_TRANSFORMES', label: 'Ultra-transformés',
    source: 'AGA_FREQ_ULTRA_TRANSFORMES_SEM',
    couvertureSource: 'AGA_NB_JOURS_CONTENU_CONNU', sens: 'inverse' },
];

// DRAPEAU — jamais un axe, jamais des points.
const drapeauxCandidats = [
  { source: 'AGA_FREQ_SOIR_COPIEUX_SEM', /* comparateur/seuil: à poser */
    message: 'Repas du soir déclaré plus copieux — à confronter au déclaré (D-040).' },
];
```

Chaque `AGA_*` ci-dessus correspond à un champ réel de `AgregatsAgendaAli`
(`agregats.ts:27-64`) versé en pseudo-item à la clôture (`cloture.ts:56-66`).

---

## 5. Réserves de gouvernance nommées (avant tout `D-xxx`)

1. **Usage `orientation` absent sur ces 8 sources.** Le marquage
   `metadata.usage='orientation'` (migration `rag_claim_usage_orientation`) couvre
   `WN-SRC-0228`→`0391` (NNPP2 année 2) ; les sources Notebook 09 (NNFC1 année 1)
   **n'y sont pas**. L'usage « barème agenda » est donc un usage **nouveau** :
   citer ces claims dans une décision de calibration supposera soit d'étendre le
   marquage, soit d'acter que l'usage-barème est distinct de l'usage-orientation.
   Cette matrice **n'autorise rien** : elle propose des candidats.
2. **Claims porte-seuil → revue individuelle.** Tout claim portant une borne
   numérique (`rag_claim_porte_seuil`) est fermé à la signature par lot et part en
   revue individuelle. Repéré ici : `WN-CL-0069-005` (15 %). Les bornes de
   l'indice restant différées, aucune n'est posée.
3. **`sommePoids > 0`** à garder au câblage des poids (réserve technique du
   squelette, `LOT-02-bareme-indice-agenda.md`).
4. **D-003 / typologie.** Seuls des claims `VALIDE` sont cités (les 160 le sont).
   Le trigger de décision refuse un claim `prescriptif` ou de typologie ∉
   {déclaré, observé} : à vérifier claim par claim au moment du `D-xxx` (beaucoup
   des supports A1–A6 sont `interprété`/`prescriptif` — ils **documentent** l'axe
   mais ne pourront pas forcément être le claim porteur d'une décision de barème
   sans arbitrage).

---

## 6. Prochaine étape (hors de ce document)

Décision clinique **`D-xxx`** de calibration, **après** observation de la
distribution réelle des 21 jours : choix des sous-axes, `sens` définitifs,
`bornes` et `poids`, drapeaux — puis remplissage de `sc.axes`, bascule de
`Q_ALI_09` sur `type:'agenda_alimentaire'` à la clôture, et migration éventuelle
**séparée** du code qui en dépend. Rien de tout cela dans ce document.
