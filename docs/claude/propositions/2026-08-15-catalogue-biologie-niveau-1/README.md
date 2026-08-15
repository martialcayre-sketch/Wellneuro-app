# Proposition de catalogue biologie niveau 1 — à valider ligne à ligne

> **Statut : PROPOSITION. Rien n'est écrit en base ni en code.** Ce document est
> l'objet que `D-059` §2 rend obligatoire avant toute migration de données :
> « L'assistant rédige la proposition […] chaque ligne adossée à un claim VALIDE
> relu en production (`DC-01`, `DC-26`) — abstention sur ce qu'aucun claim ne
> fonde (`DC-25`), jamais un remplissage. Le praticien valide ligne à ligne ; la
> migration de DONNÉES ne part qu'après cette validation, en PR séparée. »

- **Corpus relu** : production, `rag_corpus_claims`, le 2026-08-15, en lecture
  seule (MCP `execute_sql`). **8 224 claims `VALIDE`, 0 en attente.** Tous les
  claims cités ci-dessous sont `statut = 'VALIDE'`, `active = true`,
  `superseded_at IS NULL`, cités par la paire `(claim_id, version_claim)`.
- **Périmètre retenu** (arbitrage utilisateur du 2026-08-15) : composition
  **et** plages fonctionnelles. Les liens analyte→besoin restent hors périmètre
  (réservés à CB-02b, et le schéma les veut « visiblement vides »).
- **Ce qui se passe après votre validation** : deux PR séparées — la migration
  de DONNÉES du catalogue (composition + plages), puis les règles d'indication
  dans `indicationsBiologieV1.ts`. La signature de la table
  (`validationExterne: true`) reste un troisième geste, distinct du merge.

## Comment valider

Chaque ligne porte une case. Trois réponses possibles :

- **OK** — la ligne part telle quelle.
- **MODIFIER** — écrivez la correction en marge ; je la reporte.
- **RETIRER** — la ligne disparaît, sans remplacement.

Une ligne sans réponse **ne part pas**. C'est le comportement voulu : le
catalogue se remplit de ce que vous avez explicitement retenu, pas de ce que
vous n'avez pas eu le temps de refuser.

---

## 0. Ce que cette proposition NE propose PAS

Deux panels nommés par `D-059` §2 et par la fiche du lot **ne sont pas
proposés**, faute de claims pour les fonder. C'est l'abstention exigée par
`DC-25`, pas un oubli.

| Panel attendu | Ce que le corpus porte | Décision proposée |
|---|---|---|
| **Cœliaque** (conditionnel) | 14 claims mentionnent la maladie cœliaque ; **1 seul** touche la sérologie, et il ne fait que citer « la sérologie cœliaque » dans une liste d'examens (`WN-CL-0376-016`). **Aucun claim ne dit quand la demander** — or c'est précisément la condition qui définirait un panel conditionnel. | **Abstention.** Le panel n'entre pas au catalogue. À rouvrir quand le corpus portera une règle d'indication. |
| **Hormonal / SOPK** (conditionnel) | **0 claim SOPK.** 2 claims seulement sur les hormones sexuelles dans tout le corpus validé. | **Abstention.** Remplacé, sur votre arbitrage du 2026-08-15, par le panel cortisol (§7) — richement documenté (133 claims). |

**Conséquence à connaître** : sans le cœliaque, il ne restait plus aucun panel
`conditionnel` en production, et le mécanisme livré au LOT-06 (« un déclencheur
non rempli s'affiche `conditionnel` avec sa condition ») n'aurait eu aucune
instance réelle. Le §8 propose un panel conditionnel **qui, lui, est fondé** —
c'est un ajout à votre périmètre initial, à accepter ou refuser comme le reste.

---

## 1. Panel socle

**Identité** — `code: PANEL_SOCLE` · `niveau: socle` · `actif: true`
`libelle:` « Bilan socle de première intention »
`objectif:` « Explorer les causes générales avant toute lecture micronutritionnelle. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null`
· `motif: null` · pas de `repetition` (voir arbitrage A-3).

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0361-009` v1.0 | « Les marqueurs biologiques de première intention pour explorer une fatigue incluent : numération formule sanguine, taux d'hémoglobine, CRP ultrasensible, ferritine, fer sérique et coefficient de saturation de la sidérophiline, vitamine D, magnésium érythrocytaire, TSH ultrasensible, cortisol awakening response, bilan hépatique, glycémie à jeun, ionogramme sanguin et acide urique. » |
| `WN-CL-0349-015` v1.0 | « Les analyses classiques conventionnelles recommandées incluent un bilan inflammatoire (CRP, vitesse de sédimentation, NFS, électrophorèse des protides), un bilan hépatique, calcémie, phosphorémie, vitamine D, hormones thyroïdiennes et TSH, ferritinémie […] » |
| `WN-CL-0346-013` v1.0 | « Les examens biologiques de première intention pour évaluer l'impact du SIBO comprennent : NFS, hémoglobine, ferritine, vitamine B12, vitamines liposolubles A, D, E, K, albumine, CRP ultrasensible […] » |

**Composition proposée**

| ☐ | Code analyte | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_NFS` | Numération formule sanguine | — | sang | 0361-009, 0349-015, 0346-013 |
| ☐ | `BIO_HEMOGLOBINE` | Hémoglobine | `g/L` | sang | 0361-009, 0346-013 |
| ☐ | `BIO_IONOGRAMME` | Ionogramme sanguin | — | sang | 0361-009 |
| ☐ | `BIO_GLYCEMIE_JEUN` | Glycémie à jeun | `mmol/L` | sang | 0361-009 |
| ☐ | `BIO_ACIDE_URIQUE` | Acide urique | `µmol/L` | sang | 0361-009 |
| ☐ | `BIO_BILAN_HEPATIQUE` | Bilan hépatique | — | sang | 0361-009, 0349-015 |

**À arbitrer sur ce panel**

- **La créatinine n'est proposée nulle part.** La spec du lot la citait
  (« socle NFS/iono/hépatique ») mais **aucun claim relu ne la nomme**. Je ne
  l'ajoute pas. ☐ Confirmer l'absence · ☐ L'ajouter (donnez la source)
- **`BIO_NFS`, `BIO_IONOGRAMME` et `BIO_BILAN_HEPATIQUE` sont des blocs, pas des
  analytes.** Les claims nomment un bloc (« bilan hépatique »), le catalogue
  attend des analytes unitaires. Deux options :
  ☐ les garder comme entrées uniques sans unité (fidèle au claim)
  ☐ les éclater en ASAT / ALAT / GGT, Na / K / Cl… (plus fin, mais **le
  détail ne vient d'aucun claim** — ce serait vous qui le poseriez)

---

## 2. Panel glucidique

**Identité** — `code: PANEL_GLUCIDIQUE` · `niveau: socle` · `actif: true`
`libelle:` « Exploration glucidique et sensibilité à l'insuline »
`objectif:` « Situer la sensibilité à l'insuline avant toute orientation nutritionnelle. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null` · `motif: null`

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0178-053` v1.0 | « Le bilan biologique minimum comprend l'indice Homa, le profil lipidique, la CRP ultrasensible, la ferritine, le zinc et la vitamine D. » |
| `WN-CL-0386-002` v1.0 | « Le bilan biologique dans ce contexte inclut des marqueurs nutritionnels et micronutritionnels : glycémie et indice HOMA, hémoglobine glyquée, statut des acides gras érythrocytaires […] » |
| `WN-CL-0361-010` v1.0 | « Les marqueurs biologiques de seconde intention, à utiliser selon le contexte, incluent notamment : indice HOMA, hémoglobine glyquée […] » |

**Composition proposée**

| ☐ | Code | Libellé | Unité | Prélèv. | Validation médicale | Fondé par |
|---|---|---|---|---|---|---|
| ☐ | `BIO_GLYCEMIE_JEUN` | Glycémie à jeun | `mmol/L` | sang | non | 0386-002, 0361-009 |
| ☐ | `BIO_INSULINEMIE` | Insulinémie à jeun | `mUI/L` | sang | **OUI** (voir A-2) | requis par l'indice HOMA |
| ☐ | `BIO_HBA1C` | Hémoglobine glyquée | `%` | sang | non | 0386-002, 0361-010 |
| ☐ | `BIO_RATIO_HOMA` | Indice HOMA | `score` | — | non | 0178-053, 0178-054, 0386-002, 0361-010, 0312-018, 0376-016 |

**À arbitrer sur ce panel**

- **L'indice HOMA est cité par six claims, mais aucun ne donne sa formule.** Le
  catalogue exige une opération typée : `produit_sur_constante`, soit
  (glycémie × insulinémie) / **22,5**. Cette constante est la définition
  standard de l'HOMA-IR, pas un seuil clinique — mais **elle ne vient d'aucun
  claim relu**. ☐ Poser 22,5 comme constante de définition · ☐ Fournir une
  source · ☐ Retirer le ratio et ne garder que ses deux composants
- **L'insulinémie n'est fondée par aucun claim en propre** : elle n'apparaît que
  comme composant nécessaire de l'HOMA. ☐ Accepter à ce titre · ☐ Retirer

---

## 3. Panel lipides

**Identité** — `code: PANEL_LIPIDES` · `niveau: socle` · `actif: true`
`libelle:` « Profil lipidique » · `objectif:` « Situer le profil lipidique et son phénotype. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null` · `motif: null`

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0178-053` v1.0 | « Le bilan biologique minimum comprend l'indice Homa, **le profil lipidique**, la CRP ultrasensible […] » |
| `WN-CL-0178-054` v1.0 | « Le bilan biologique de base comprend l'indice Homa, **le profil lipidique et apoprotéine**, la CRP ultrasensible, les anticorps anti LDL oxydé […] » |
| `WN-CL-0045-017` v1.0 | « L'exploration du phénotype du cholestérol peut se faire par trois marqueurs : le ratio triglycérides/HDL et son évolution, le ratio Apo B/Apo A1, et le phénotype direct du LDL cholestérol circulant. » |

**Composition proposée**

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_CHOLESTEROL_TOTAL` | Cholestérol total | `g/L` | sang | 0178-053 (« profil lipidique ») |
| ☐ | `BIO_LDL` | LDL cholestérol | `g/L` | sang | 0045-017 |
| ☐ | `BIO_HDL` | HDL cholestérol | `g/L` | sang | 0045-017 |
| ☐ | `BIO_TRIGLYCERIDES` | Triglycérides | `g/L` | sang | 0045-017 |
| ☐ | `BIO_APO_B` | Apolipoprotéine B | `g/L` | sang | 0178-054, 0045-017 |
| ☐ | `BIO_APO_A1` | Apolipoprotéine A1 | `g/L` | sang | 0178-054, 0045-017 |
| ☐ | `BIO_RATIO_TG_HDL` | Rapport triglycérides / HDL | `ratio` | — | 0045-017 |
| ☐ | `BIO_RATIO_APOB_APOA1` | Rapport Apo B / Apo A1 | `ratio` | — | 0045-017 |

**À arbitrer** — « Profil lipidique » est un bloc dans `0178-053` ; le détail
cholestérol total / LDL / HDL / TG vient de `0045-017`, qui ne nomme
explicitement que LDL, HDL et TG. **Le cholestérol total n'est nommé par aucun
claim.** ☐ Le garder au titre du « profil lipidique » · ☐ Le retirer

---

## 4. Panel thyroïde

**Identité** — `code: PANEL_THYROIDE` · `niveau: socle` · `actif: true`
`libelle:` « Exploration thyroïdienne » · `objectif:` « Écarter une cause thyroïdienne aux plaintes de fatigue ou d'humeur. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null` · `motif: null`

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0361-009` v1.0 | « […] TSH ultrasensible […] » (marqueurs de première intention pour explorer une fatigue) |
| `WN-CL-0349-015` v1.0 | « […] hormones thyroïdiennes et TSH […] » |
| `WN-CL-0173-012` v1.0 | « Un dosage de TSH et de T4 pourrait être recommandé chez les patients migraineux en lien avec ce risque d'hypothyroïdie à venir. » |
| `WN-CL-0336-021` v1.0 | « En seconde intention, pour des dépressions récidivantes ou chroniques […] : TSH(u), T3, T4 […] » |

**Composition proposée**

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_TSH_US` | TSH ultrasensible | `mUI/L` | sang | 0361-009, 0349-015, 0173-012, 0336-021 |
| ☐ | `BIO_T4L` | T4 libre | `pmol/L` | sang | 0173-012, 0336-021 |
| ☐ | `BIO_T3L` | T3 libre | `pmol/L` | sang | 0336-021 |

**À arbitrer** — `WN-CL-0336-021` place T3 et T4 en **seconde** intention, quand
`0173-012` les met en première dans un contexte migraineux. La règle proposée
est unique et `recommande` pour tout le panel. ☐ Accepter · ☐ Scinder en un
panel TSH seule `recommande` + un panel T3/T4 `approfondissement`

---

## 5. Panel micronutrition

**Identité** — `code: PANEL_MICRONUTRITION` · `niveau: socle` · `actif: true`
`libelle:` « Bilan micronutritionnel » · `objectif:` « Objectiver les déficits micronutritionnels avant toute supplémentation. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null` · `motif: null`
· `repetition: { delaiJours: 365 }` — **fondée**, voir ci-dessous.

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0312-012` v1.0 | « La supplémentation devrait idéalement s'appuyer sur un bilan biologique initial de dépistage portant sur ferritine, zinc, magnésium érythrocytaire, vitamine D, folates, vitamine B12 et iodurie. » |
| `WN-CL-0312-018` v1.0 | « Il est recommandé de pratiquer **au moins un bilan biologique nutritionnel, fonctionnel et systémique une fois par an**, incluant ferritine, zinc, magnésium érythrocytaire, vitamine D, folates érythrocytaires, vitamine B12, statut des acides gras érythrocytaires, protéine C réactive, indice HOMA […] » |
| `WN-CL-0333-020` v1.0 | « En première intention, les analyses biologiques conseillées incluent le magnésium érythrocytaire, la vitamine D, la ferritine, le zinc et la CRP ultrasensible. » |
| `WN-CL-0125-045` v1.0 | « Chez les patients dépressifs chroniques, un bilan micronutritionnel comprend le dosage de la ferritine, du zinc plasmatique, des folates érythrocytaires, de l'homocystéine et de la vitamine B12 active (holotranscobalamine). » |
| `WN-CL-0125-011` v1.0 | « Il faut doser la forme active de la vitamine B12 (HoloTC) » |
| `WN-CL-0386-002` v1.0 | « […] zinc, folates érythrocytaires, vitamine B12, vitamine D, magnésium, ferritine, fer sérique et coefficient de saturation de la sidérophiline » |

**Composition proposée**

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_FERRITINE` | Ferritine | `ng/mL` | sang | 0312-012, 0312-018, 0333-020, 0125-045, 0386-002 |
| ☐ | `BIO_FER_SERIQUE` | Fer sérique | `µmol/L` | sang | 0361-009, 0386-002 |
| ☐ | `BIO_COEF_SATURATION` | Coefficient de saturation de la sidérophiline | `%` | sang | 0361-009, 0386-002 |
| ☐ | `BIO_ZINC_PLASMATIQUE` | Zinc plasmatique | `µmol/L` | sang | 0125-045, 0312-012, 0333-020 |
| ☐ | `BIO_MAGNESIUM_ERYTHROCYTAIRE` | Magnésium érythrocytaire | `mmol/L` | sang | 0312-012, 0312-018, 0333-020, 0361-009 |
| ☐ | `BIO_VITAMINE_D_25OH` | Vitamine D (25-OH) | `ng/mL` | sang | 0312-012, 0333-020, 0361-009 |
| ☐ | `BIO_FOLATES_ERYTHROCYTAIRES` | Folates érythrocytaires | `nmol/L` | sang | 0125-045, 0312-018, 0386-002 |
| ☐ | `BIO_B12_HOLOTC` | Vitamine B12 active (holotranscobalamine) | `pmol/L` | sang | 0125-045, 0125-011, 0361-010 |
| ☐ | `BIO_HOMOCYSTEINE` | Homocystéine | `µmol/L` | sang | 0125-045, 0361-010 |
| ☐ | `BIO_IODURIE` | Iodurie | `µg/24h` | urine | 0312-012 |

**Répétition** — `WN-CL-0312-018` dit « au moins un bilan […] **une fois par
an** ». C'est le **seul** délai de répétition sourcé de toute la proposition ;
`delaiJours: 365` en découle directement. Aucun autre panel n'en portera : le
moteur ne rendra jamais `à répéter` ailleurs, faute de source.
☐ Accepter les 365 jours · ☐ Retirer la répétition

---

## 6. Panel CRP ultrasensible

**Identité** — `code: PANEL_CRPUS` · `niveau: socle` · `actif: true`
`libelle:` « CRP ultrasensible » · `objectif:` « Objectiver une inflammation de bas grade. »

**Règle d'indication** — `mode: recommande` · `declencheurs: []` · `condition: null` · `motif: null`

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0282-019` v1.0 | « […] la CRP ultrasensible est recommandée **en première intention** car simple, précise, remboursable et permet de suivre l'impact de l'alimentation. » |
| `WN-CL-0333-020` v1.0 | « **En première intention**, les analyses biologiques conseillées incluent […] la CRP ultrasensible. » |
| `WN-CL-0282-018` v1.0 | « Dans les troubles de la mémoire, les marqueurs pertinents sont les folates, la vitamine B12, la CRP ultrasensible et les acides gras. » |
| `WN-CL-0319-014` v1.0 | « En complément de l'évaluation du statut en micronutriments essentiels, une CRP ultrasensible […] **peuvent être proposés en option**. » |

**Composition** : ☐ `BIO_CRP_US` — CRP ultrasensible — `mg/L` — sang

**Discordance à arbitrer (`DC-30` — se signale, ne se moyenne pas)** —
`0282-019` et `0333-020` disent « première intention » ; `0319-014` dit
« en option ». Le mode proposé est `recommande`, en suivant les deux claims
majoritaires, mais **la divergence est réelle et doit être tranchée par vous**,
pas par un comptage.
☐ `recommande` · ☐ `optionnel` · ☐ Autre

---

## 7. Panel cortisol — non indiqué actuellement

**Identité** — `code: PANEL_CORTISOL` · `niveau: approfondissement` · `actif: true`
`libelle:` « Cortisol isolé » · `objectif:` « Explorer l'axe du stress. »

**Règle d'indication** — `mode: non_indique_actuellement` · `declencheurs: []`
· `condition: null`
`motif:` « Une mesure matinale unique de cortisol est peu fiable ; l'exploration
pertinente est le cortisol awakening response, qui repose sur deux mesures
matinales. »

**Claims qui la fondent**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0042-007` v1.0 | « **Une mesure matinale unique de cortisol est peu fiable** en raison des variations inter-individuelles et des rythmes biologiques, alors que deux mesures matinales (cortisol awakening response) constituent un excellent marqueur de la charge en stress, une mesure vespérale évalue l'élévation chronique et pathogène du cortisol, et le cortisol slope offre une vision globale idéale. » |
| `WN-CL-0042-008` v1.0 | « Le cortisol awakening response (CAR) est le premier marqueur majeur du stress chronique […] c'est un des meilleurs marqueurs en première intention, simple, reproductible […] » |
| `WN-CL-0282-015` v1.0 | « Dans les troubles de l'adaptation, du stress et du surmenage, les marqueurs pertinents sont le cycle du cortisol (CAR, cortisol 8h/20h, ratio cortisol/DHEA) […] » |
| `WN-CL-0369-026` v1.0 | « L'exploration des marqueurs liés aux troubles de l'adaptation […] peut inclure : le cortisol awakening response, le cortisol salivaire matinal/vespéral (20 heures) […] » |

**Composition** : ☐ `BIO_CORTISOL_SALIVAIRE` — Cortisol salivaire — `nmol/L` — salive

**À arbitrer** — le motif dit que le CAR *serait* la bonne exploration. Faut-il
créer en plus un panel `PANEL_CAR` (cortisol awakening response) en mode
`recommande` ou `optionnel`, fondé sur `0042-008` et `0282-015` ?
☐ Non, garder le seul cortisol isolé non indiqué · ☐ Oui, ajouter le CAR (précisez le mode)

---

## 8. Panel T3 reverse — conditionnel (ajout proposé)

> **Ajout hors du périmètre initial de `D-059` §2.** Je le propose parce que
> c'est le seul panel `conditionnel` que le corpus fonde réellement, et que sans
> lui le mécanisme conditionnel livré au LOT-06 n'a aucune instance en
> production. À refuser sans dommage : le catalogue reste cohérent.

**Identité** — `code: PANEL_T3R` · `niveau: approfondissement` · `actif: true`
`libelle:` « T3 reverse » · `objectif:` « Explorer une conversion thyroïdienne périphérique quand la première ligne est normale. »

**Règle d'indication** — `mode: conditionnel` · `declencheurs: []`
`condition:` « TSH et/ou T4 normales alors que les signes cliniques évocateurs persistent. »

**Claim qui la fonde**

| Claim | Extrait verbatim |
|---|---|
| `WN-CL-0110-016` v1.0 | « Le dosage de la T3r présente un intérêt particulier lorsque la TSH et/ou la T4 sont normales mais que les signes cliniques évocateurs persistent. » |

**Composition** : ☐ `BIO_T3_REVERSE` — T3 reverse — `ng/L` — sang

**Pourquoi `declencheurs: []`** — la condition porte sur des **valeurs
biologiques** (TSH/T4 normales), qu'aucune donnée n'entre en base : le verrou
HDS l'interdit. Le déclencheur ne peut donc pas être évalué automatiquement. Le
moteur affichera le panel comme `conditionnel` **avec sa condition en clair**,
au praticien de juger — exactement le comportement prévu par `D-059` §5
(« un déclencheur non rempli s'affiche `conditionnel` avec sa condition — pas
absent, pas refusé en silence »).

---

## 9. Plages fonctionnelles

Rappel de contrainte : `biology_functional_ranges` exige `claim_id`,
`version_claim` **et** `niveau_preuve` NOT NULL, et **un seul intervalle actif
par (analyte, population)** — un index partiel l'impose en base. Il faut donc
trancher les discordances, pas les juxtaposer.

### 9.1 Ferritine — trois sources, trois bornes différentes

| Claim | Ce qu'il dit |
|---|---|
| `WN-CL-0044-003` v1.0 | « Le statut en ferritine se classe ainsi : carence profonde < 10 ng/ml, déficience < 30 ng/ml, déficit/statut suboptimal < 50 ng/ml, **zone de confort entre 50 et 80 ng/ml**, zone élevée > 80 ng/ml » |
| `WN-CL-0154-051` v1.0 | « Pour la ferritine, la valeur indispensable est > 50 µg/L et la **valeur souhaitée est comprise entre > 80 µg/L et < 120 µg/L**. » |
| `WN-CL-0112-012` v1.0 | « Selon les valeurs de référence consensuelles de la HAS, le traitement étiologique du **SJSR** en cas de carence en fer vise une ferritine **supérieure à 80 ng/ml**. » |

**Discordance réelle** : la zone haute commence où l'autre place l'optimum
(80 ng/mL est « zone élevée » pour `0044-003`, « valeur souhaitée » pour
`0154-051`). `0112-012` est **spécifique au SJSR**, donc hors population
générale (`DC-14` : respecter la population d'un claim).

**Proposition** : retenir `WN-CL-0044-003` — seule source donnant une
classification complète et non conditionnée à une pathologie.
`population: adulte_tout_venant` · `niveau_preuve: C` (voir A-1).

☐ Retenir `0044-003` · ☐ Retenir `0154-051` · ☐ Ne poser aucune plage ferritine

### 9.2 Vitamine D

| Claim | Ce qu'il dit |
|---|---|
| `WN-CL-0239-004` v1.0 | « Le diagnostic du statut en vitamine D repose sur un consensus […] avec une **valeur-cible idéale reconnue par la plupart des sociétés savantes proche de 45 ng/mL**. » |
| `WN-CL-0154-054` v1.0 | « La **valeur optimale souhaitée de vitamine D est > 45 ng/ml**, dont l'intérêt dans le déclin cognitif est confirmé. » |
| `WN-CL-0239-010` v1.0 | « En cas de **déficit profond en vitamine D (valeur biologique < 10 ng/mL)** […] » |
| `WN-CL-0239-005` v1.0 | « Selon **certains auteurs non consensuels** […] il serait souhaitable d'obtenir des statuts […] proches de 60 ng/mL. » |

**Proposition** : borne basse 10 ng/mL (`0239-010`), cible 45 ng/mL
(`0239-004` et `0154-054`, concordants). **`WN-CL-0239-005` est écarté** : il se
déclare lui-même non consensuel — l'utiliser reviendrait à promouvoir en règle
ce que la source présente comme minoritaire.
`population: adulte_tout_venant` · `niveau_preuve: C`

☐ Accepter · ☐ Modifier · ☐ Ne poser aucune plage vitamine D

### 9.3 Les autres analytes

**Aucune plage n'est proposée** pour les 20 autres analytes : le corpus ne porte
pas de bornes chiffrées exploitables pour eux. C'est l'abstention de `DC-25`.
Le catalogue partira donc avec **2 plages fonctionnelles**, pas 22.

---

## 10. Arbitrages transverses

### A-1 — Le niveau de preuve A/B/C/D n'existe pas dans le corpus

`biology_functional_ranges.niveau_preuve` est NOT NULL, contraint à
`A | B | C | D`. Or **45 claims sur 8 224** portent un `niveau_preuve`, en texte
libre (« élevé », « méta-analyse », « p<0,001 », « non validé »…). Rien qui
ressemble à une cotation A/B/C/D systématique.

Je ne l'inventerai pas. La seule règle écrite au dépôt est celle de la
proposition « rayon biologie fonctionnelle » : *« niveau de preuve WellNeuro
A/B/C/D — **C étant précisément biologie fonctionnelle interprétative** »*. Les
deux plages du §9 relèvent exactement de ce cas.

☐ Appliquer `C` aux deux plages, au titre de cette convention
☐ Coter chaque plage à la main (indiquez la valeur)

### A-2 — `RequiresMedicalValidation` : colonne sur `biology_analytes`

Votre arbitrage du 2026-08-15 : une colonne
`validation_medicale_requise BOOLEAN NOT NULL DEFAULT false` sur
`biology_analytes`. Vérifié depuis : elle passe le verrou HDS du contrat
structurel (aucun de ses motifs `patient|valeur|resultat|mesure|preleve` ne
correspond), n'ajoute pas de table (le contrat en exige exactement 12), et
`release-db` surveille déjà `migrations/**`.

**Mais aucun claim ne fonde le fait que l'insulinémie l'exige.** C'est une
règle de sécurité de votre produit, pas une donnée du corpus — et `DC-12`
admet qu'un signal de sécurité ne se déduise pas d'un score. Elle doit donc
être posée par vous, explicitement.

☐ Insulinémie = validation médicale requise · ☐ Autres analytes concernés : …

### A-3 — Aucune répétition hors micronutrition

Un seul claim porte un délai (`WN-CL-0312-018`, « une fois par an »). Les sept
autres panels partiront sans `repetition`, donc sans jamais rendre `à répéter`.
C'est voulu : `D-059` interdit le délai inventé. ☐ Vu

### A-4 — Unités et provenance des fiches analytes

Les unités proposées sont des **conventions techniques de laboratoire**, pas des
données de claims (sauf ferritine et vitamine D, où le claim donne l'unité).
Elles sont prises dans le vocabulaire fermé de 29 valeurs qu'impose le schéma.
Deux points :

- **Ferritine** : `0044-003` écrit `ng/ml`, `0154-051` écrit `µg/L`.
  Numériquement identiques. ☐ Retenir `ng/mL` · ☐ Retenir `µg/L`
- **`source_provenance`** est NOT NULL. Aucune fiche ne vient du référentiel
  NABM à ce stade. ☐ Poser `saisie_praticien` partout · ☐ Autre

### A-5 — Convention de nommage des panels

`biology_panels.code` n'a **aucune contrainte de format** (contrairement aux
analytes, en `^BIO_[A-Z0-9_]{2,60}$`). Je reprends `PANEL_*`, seule convention
déjà présente au dépôt (fixtures de `statuts.test.ts`).
☐ Garder `PANEL_*` · ☐ Passer à `BIO_PANEL_*`

---

## 11. Récapitulatif

| Panel | Mode | Analytes | Plages | Claims distincts |
|---|---|---|---|---|
| `PANEL_SOCLE` | recommandé | 6 | 0 | 3 |
| `PANEL_GLUCIDIQUE` | recommandé | 3 + 1 ratio | 0 | 4 |
| `PANEL_LIPIDES` | recommandé | 6 + 2 ratios | 0 | 3 |
| `PANEL_THYROIDE` | recommandé | 3 | 0 | 4 |
| `PANEL_MICRONUTRITION` | recommandé (365 j) | 10 | 2 | 6 |
| `PANEL_CRPUS` | recommandé | 1 | 0 | 4 |
| `PANEL_CORTISOL` | non indiqué actuellement | 1 | 0 | 4 |
| `PANEL_T3R` *(ajout)* | conditionnel | 1 | 0 | 1 |
| ~~Cœliaque~~ | **abstention** | — | — | 0 fondant l'indication |
| ~~Hormonal / SOPK~~ | **abstention** | — | — | 0 |

**Après votre validation** — dans cet ordre, jamais mélangés :

1. **PR migration de DONNÉES** (composition + 2 plages + colonne
   `validation_medicale_requise`) → `release-db`, approbation humaine.
2. **PR code** : les huit règles dans `INDICATIONS_BIOLOGIE_V1`, en
   `statut: 'publiee'`, `claimsSource` peuplé, `validationExterne` **toujours à
   `false`**. Bancs de `statuts.test.ts` à reprendre (trois assertions
   témoignent aujourd'hui du gel).
3. **Signature** — `validationExterne: true` + `dateValidation`. Geste distinct,
   après relecture des claims en base. C'est elle qui ouvre la première porte ;
   `WN_CB_ENABLED` reste la seconde.
