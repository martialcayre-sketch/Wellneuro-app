# Proposition de catalogue biologie niveau 1 — indexée par tableau clinique

> **Statut : PROPOSITION. Rien n'est écrit en base ni en code.** Objet exigé par
> `D-059` §2 avant toute migration de données.
> **Version 2 — révision de méthode.** La v1 proposait six panels `recommandé`
> pour tout patient. C'était faux, et les sources le disent elles-mêmes.

## Pourquoi la v1 était fausse

Elle agrégeait des claims **bornés à une plainte** (« pour explorer une
fatigue », « chez les patients dépressifs chroniques », « pour évaluer l'impact
du SIBO ») en panels universels. C'est la sur-généralisation que `DC-14`
interdit : l'absence de population déclarée est une restriction, pas une
autorisation.

Le corpus tranche explicitement, et contre la v1 :

| Claim | Ce qu'il dit |
|---|---|
| `WN-CL-0387-013` | « Le bilan biologique complet **n'est pas à réaliser systématiquement** chez toute personne quel que soit l'âge ; **l'orientation clinique permet d'établir des choix** pour un bilan initial. » |
| `WN-CL-0361-008` | « Les marqueurs biologiques utilisés dans l'exploration de la fatigue doivent être **sélectionnés en fonction du contexte clinique évocateur**. » |
| `WN-CL-0348-012` | « Certains marqueurs biologiques peuvent être utiles […] **lorsque les arguments cliniques seuls sont insuffisants**. » |

**La généralité ne s'obtient donc pas en effaçant la population des claims.**
Elle s'obtient en faisant du **tableau clinique la clé d'indexation** : un panel
n'est jamais « recommandé pour tous », il est indiqué *quand* tel tableau est
repéré. C'est exactement ce que le moteur du LOT-06 sait encoder — un panel
`conditionnel` porteur de `declencheurs` sur les questionnaires que l'orientation
calcule déjà.

## La source qui porte la généralisation

`WN-SRC-0282` « NNPP atelier de biologie » (19 claims, **tous prescriptifs**)
est la seule source du corpus qui indexe les marqueurs par tableau et par
population, de façon transversale aux notebooks :

| Claim | Tableau / population | Marqueurs |
|---|---|---|
| `WN-CL-0282-013` | Chez la femme | ferritine (population à risque) |
| `WN-CL-0282-014` | Chez la personne âgée | vitamine D, zinc, sélénium, TSH, acides gras |
| `WN-CL-0282-015` | Troubles de l'adaptation, stress, surmenage | cycle du cortisol (CAR, 8h/20h, cortisol/DHEA), alpha-amylase salivaire, IgA sécrétoire salivaire |
| `WN-CL-0282-016` | Troubles de l'humeur, dépression | ferritine (femmes, enfants, adolescentes), zinc, vitamine D, iodurie, acides gras érythrocytaires, folates érythrocytaires |
| `WN-CL-0282-017` | Troubles du sommeil | 6-sulfatoxymélatonine, vitamine D |
| `WN-CL-0282-018` | Troubles de la mémoire | folates, vitamine B12, CRP ultrasensible, acides gras |

Les fiches de synthèse de chaque notebook **raffinent** cette matrice, tableau
par tableau, en distinguant partout **première** et **seconde** intention. Cette
distinction est constante dans le corpus : c'est elle qui alimente le champ
`BiologyPanel.niveau` (`socle` / `approfondissement` / `specialise`).

## Méthode de dépouillement

- **Sources balayées** : les 27 sources du notebook 08 « Biologie
  fonctionnelle », les 89 fiches de synthèse des 14 notebooks, et les deux
  fiches de protocole biologique dédiées (`WN-SRC-0340` dépressions,
  `WN-SRC-0390` mémoire).
- **Filtre** : claims `VALIDE`, actifs, non superseded, `prescriptif = true`,
  énonçant un bilan, des marqueurs pertinents ou une intention.
- **Règle d'abstention** : un tableau sans claim d'indication ne devient pas un
  panel, quelle que soit son évidence clinique apparente.

---

# A · Catalogue d'analytes (composition, sans indication)

La composition est **neutre** : un analyte n'est indiqué par personne, il est
seulement défini. Ce sont les panels du §B qui portent l'indication. Taxonomie
reprise des quatre sources de biomarqueurs du notebook 08 (`WN-SRC-0045`
nutritionnels, `WN-SRC-0044` micronutritionnels, `WN-SRC-0043` fonctionnels et
systémiques, `WN-SRC-0041` neurotransmetteurs).

### A.1 — Micronutritionnels

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_FERRITINE` | Ferritine | `ng/mL` | sang | 0282-013, 0282-016, 0312-012, 0333-020, 0388-008 |
| ☐ | `BIO_FER_SERIQUE` | Fer sérique | `µmol/L` | sang | 0361-009, 0386-002 |
| ☐ | `BIO_COEF_SATURATION` | Coefficient de saturation de la sidérophiline | `%` | sang | 0361-009, 0386-002 |
| ☐ | `BIO_ZINC_PLASMATIQUE` | Zinc plasmatique | `µmol/L` | sang | 0282-014, 0282-016, 0125-045, 0333-020 |
| ☐ | `BIO_MAGNESIUM_ERYTHROCYTAIRE` | Magnésium érythrocytaire | `mmol/L` | sang | 0312-012, 0333-020, 0361-009, 0348-013 |
| ☐ | `BIO_VITAMINE_D_25OH` | Vitamine D (25-OH) | `ng/mL` | sang | 0282-014, 0282-016, 0282-017, 0333-020 |
| ☐ | `BIO_FOLATES_ERYTHROCYTAIRES` | Folates érythrocytaires | `nmol/L` | sang | 0282-016, 0282-018, 0125-045, 0388-008 |
| ☐ | `BIO_B12_HOLOTC` | Vitamine B12 active (holotranscobalamine) | `pmol/L` | sang | 0125-011, 0125-045, 0282-018, 0361-010 |
| ☐ | `BIO_SELENIUM` | Sélénium plasmatique | `µmol/L` | sang | 0282-014, 0167-022, 0361-011 |
| ☐ | `BIO_IODURIE` | Iodurie | `µg/24h` | urine | 0282-016, 0312-012, 0361-011 |
| ☐ | `BIO_CUIVRE` | Cuivre | `µmol/L` | sang | 0376-016 |
| ☐ | `BIO_RATIO_ZINC_CUIVRE` | Rapport zinc / cuivre | `ratio` | — | 0376-016 |

### A.2 — Nutritionnels et métaboliques

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_GLYCEMIE_JEUN` | Glycémie à jeun | `mmol/L` | sang | 0361-009, 0386-002 |
| ☐ | `BIO_INSULINEMIE` | Insulinémie à jeun | `mUI/L` | sang | composant de l'indice HOMA |
| ☐ | `BIO_RATIO_HOMA` | Indice HOMA | `score` | — | 0178-053, 0178-054, 0361-010, 0376-016, 0386-002 |
| ☐ | `BIO_HBA1C` | Hémoglobine glyquée | `%` | sang | 0361-010, 0386-002 |
| ☐ | `BIO_AG_ERYTHROCYTAIRES` | Statut des acides gras érythrocytaires | `%` | sang | 0282-001, 0282-014, 0282-016, 0361-010 |
| ☐ | `BIO_PROFIL_LIPIDIQUE` | Profil lipidique | — | sang | 0178-053, 0178-054 |
| ☐ | `BIO_ALBUMINE` | Albumine | `g/L` | sang | 0346-013 |

### A.3 — Fonctionnels et systémiques

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_CRP_US` | CRP ultrasensible | `mg/L` | sang | 0282-018, 0333-020, 0348-013, 0361-009 |
| ☐ | `BIO_HOMOCYSTEINE` | Homocystéine | `µmol/L` | sang | 0282-007, 0125-045, 0167-023, 0388-008 |
| ☐ | `BIO_NFS` | Numération formule sanguine | — | sang | 0346-013, 0361-009 |
| ☐ | `BIO_TSH_US` | TSH ultrasensible | `mUI/L` | sang | 0282-014, 0336-021, 0361-009 |
| ☐ | `BIO_ANTI_TPO` | Anticorps anti-TPO | `UI/mL` | sang | 0361-011 |
| ☐ | `BIO_T3_REVERSE` | T3 reverse | `ng/L` | sang | 0110-016, 0361-011 |
| ☐ | `BIO_ANTI_LDL_OXYDE` | Anticorps anti-LDL oxydé | `UI/mL` | sang | 0167-023, 0178-054, 0386-003 |
| ☐ | `BIO_COENZYME_Q10` | Coenzyme Q10 plasmatique | `µmol/L` | sang | 0361-011, 0386-003 |
| ☐ | `BIO_GLUTATHION` | Glutathion | `µmol/L` | sang | 0376-016, 0386-003 |
| ☐ | `BIO_RATIO_KYN_TRP` | Rapport kynurénine / tryptophane | `ratio` | — | 0376-016, 0386-003 |

### A.4 — Axe du stress et neurotransmetteurs

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_CAR` | Cortisol awakening response | `nmol/L` | salive | 0042-008, 0107-032, 0282-015, 0333-021 |
| ☐ | `BIO_CORTISOL_8H_20H` | Cortisol salivaire 8h / 20h | `nmol/L` | salive | 0282-015, 0369-026 |
| ☐ | `BIO_RATIO_CORTISOL_DHEA` | Rapport cortisol / DHEA | `ratio` | — | 0282-015, 0336-021, 0361-011 |
| ☐ | `BIO_ALPHA_AMYLASE` | Alpha-amylase salivaire | `UI/L` | salive | 0282-015, 0346-014 |
| ☐ | `BIO_IGA_SALIVAIRE` | IgA sécrétoire salivaire | `mg/L` | salive | 0282-015 |
| ☐ | `BIO_6_SMT` | 6-sulfatoxymélatonine urinaire | `µg/24h` | urine | 0282-009, 0282-017, 0312-018 |
| ☐ | `BIO_HVA_URINAIRE` | HVA urinaire (catabolites dopamine) | `µg/24h` | urine | 0361-011, 0388-008 |
| ☐ | `BIO_BDNF` | Facteur neurotrophique BDNF | `ng/mL` | sang | 0282-010, 0178-055, 0386-004 |

### A.5 — Écosystème intestinal

| ☐ | Code | Libellé | Unité | Prélèv. | Fondé par |
|---|---|---|---|---|---|
| ☐ | `BIO_IGA_FECALES` | IgA sécrétoires fécales | `µg/g` | selles | 0282-011, 0346-013, 0348-013 |
| ☐ | `BIO_BETA_DEFENSINE_2` | Bêta-défensines de type 2 fécales | `µg/g` | selles | 0346-013, 0348-013, 0376-016 |
| ☐ | `BIO_AGCC_FECAUX` | Acides gras à chaîne courte fécaux | `µg/g` | selles | 0346-013, 0348-013, 0386-005 |
| ☐ | `BIO_CALPROTECTINE` | Calprotectine fécale | `µg/g` | selles | 0346-013 |
| ☐ | `BIO_ZONULINE` | Zonuline | `ng/mL` | sang | 0282-012, 0346-014, 0386-005 |
| ☐ | `BIO_LBP` | LBP (protéine porteuse du LPS) | `µg/mL` | sang | 0282-012, 0336-021, 0386-005 |

**42 analytes, 0 indication.** Aucune de ces lignes ne dit à qui l'examen
s'adresse — c'est le rôle exclusif du §B.

---

# B · Panels par tableau clinique

Chaque panel est `conditionnel`. Son `declencheur` porte sur la famille de
questionnaires qui repère le tableau ; sa `condition` s'affiche en clair quand
le déclencheur n'est pas rempli. **Aucun panel n'est `recommandé`
inconditionnellement** — `WN-CL-0387-013` l'interdit.

### B.1 — Troubles de l'humeur et dépression · `PANEL_HUMEUR_1`
`niveau: socle` · `mode: conditionnel` · déclencheur : famille `Q_MOD`
`condition:` « Tableau dépressif ou thymique repéré à l'exploration de l'humeur. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | ferritine, zinc, vitamine D, iodurie, AG érythrocytaires, folates érythrocytaires | `WN-CL-0282-016` |
| ☐ | ferritine, zinc plasmatique, folates érythrocytaires, homocystéine, B12 active | `WN-CL-0125-045` (dépressifs chroniques) |
| ☐ | fer, zinc, folates, B12 | `WN-CL-0334-005` (dépression inaugurale) |

**Seconde intention** · `PANEL_HUMEUR_2` · `niveau: approfondissement`
TSH(u)/T3/T4, LPS ou LBP, CAR et/ou cortisol/DHEA, profil des neurotransmetteurs,
rapport kynurénine/tryptophane, 6-SMT urinaire, AGCC fécaux, bilan de stress
oxydant, BDNF — `WN-CL-0336-021` (dépressions récidivantes ou chroniques).

### B.2 — Anxiété et troubles anxieux · `PANEL_ANXIETE_1`
`niveau: socle` · `conditionnel` · déclencheur : famille `Q_MOD` (sous-score anxiété)
`condition:` « Tableau anxieux repéré à l'exploration de l'humeur. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | magnésium érythrocytaire, vitamine D, ferritine, zinc, CRP ultrasensible | `WN-CL-0333-020` (première intention) |

**Seconde intention** · `PANEL_ANXIETE_2` · CAR, profil des neurotransmetteurs,
rapport sodium/potassium urinaire 24 h, butyrate fécal, AG érythrocytaires —
`WN-CL-0333-021`.

### B.3 — Stress, adaptation, surmenage · `PANEL_STRESS_1`
`niveau: socle` · `conditionnel` · déclencheur : famille `Q_STR`
`condition:` « Charge de stress ou tableau de surmenage repéré. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | CAR | `WN-CL-0042-008`, `WN-CL-0107-032` (« un des meilleurs marqueurs en première intention, simple, reproductible ») |
| ☐ | cycle du cortisol (CAR, 8h/20h, cortisol/DHEA), alpha-amylase salivaire, IgA sécrétoire salivaire | `WN-CL-0282-015` |

### B.4 — Troubles du sommeil · `PANEL_SOMMEIL_1`
`niveau: socle` · `conditionnel` · déclencheur : famille `Q_SOM`
`condition:` « Trouble du sommeil repéré à l'exploration du sommeil. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | 6-sulfatoxymélatonine, vitamine D | `WN-CL-0282-017` |
| ☐ | ferritine, vitamine D, magnésium érythrocytaire | `WN-CL-0323-011` (« analyses biologiques simples ») |

### B.5 — Troubles de la mémoire et cognition · `PANEL_MEMOIRE_1`
`niveau: socle` · `conditionnel` · déclencheur : famille `Q_GEO` (à confirmer, voir A-2)
`condition:` « Plainte mnésique ou cognitive repérée. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | folates, vitamine B12, CRP ultrasensible, acides gras | `WN-CL-0282-018` |
| ☐ | ferritine, zinc, folates érythrocytaires, HVA urinaire, CAR, vitamine D, magnésium, CRP ultrasensible, homocystéine | `WN-CL-0388-008` (fiche de synthèse mémoire) |

### B.6 — Troubles fonctionnels intestinaux · `PANEL_DIGESTIF_1`
`niveau: socle` · `conditionnel` · déclencheur : famille `Q_GAS`
`condition:` « Troubles fonctionnels intestinaux repérés. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | IgA sécrétoires fécales, bêta-défensines 2 fécales, CRP ultrasensible, AGCC fécaux, magnésium érythrocytaire | `WN-CL-0348-013` |

**Seconde intention** · `PANEL_DIGESTIF_2` — biochimie de la digestion dans les
selles, CAR, alpha-amylase salivaire, zonuline, LBP ou LPS, magnésium
érythrocytaire, zinc sérique — `WN-CL-0346-014`.

### B.7 — Fatigue · `PANEL_FATIGUE_1`
`niveau: socle` · `conditionnel` · déclencheur : à câbler (voir A-2)
`condition:` « Plainte de fatigue au premier plan. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | NFS, hémoglobine, CRP ultrasensible, ferritine, fer sérique + coefficient de saturation, vitamine D, magnésium érythrocytaire, TSH ultrasensible, CAR, bilan hépatique, glycémie à jeun, ionogramme, acide urique | `WN-CL-0361-009` |

**Seconde intention** · `PANEL_FATIGUE_2` — indice HOMA, HbA1c, profil protéique,
AG érythrocytaires, B12 active, zinc sérique, homocystéine (`WN-CL-0361-010`) ;
iodurie, sélénium, anti-TPO, T3 reverse, coenzyme Q10, cortisol/DHEA vespéral,
HVA urinaire (`WN-CL-0361-011`).

**Garde propre à ce panel** — `WN-CL-0361-008` : « les marqueurs […] doivent être
sélectionnés en fonction du contexte clinique évocateur ». Le panel fatigue est
le plus large du catalogue (13 analytes) ; la source elle-même refuse qu'il soit
prescrit en bloc. ☐ Le garder entier · ☐ Le restreindre (précisez)

### B.8 — Neurodégénératif et vieillissement cérébral · `PANEL_NEURODEG_1`
`niveau: approfondissement` · `conditionnel` · déclencheur : à câbler
`condition:` « Tableau neurodégénératif ou de neurosénescence documenté. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | zinc, sélénium, vitamine D | `WN-CL-0167-022` |
| ☐ | homocystéine, anticorps anti-LDL oxydé, CRP ultrasensible | `WN-CL-0167-023` |

**Garde** — `WN-CL-0387-013` : le bilan complet **ne se fait pas
systématiquement**, l'orientation clinique établit les choix. Ce panel ne
s'ouvre donc jamais seul.

### B.9 — Insulinorésistance et syndrome métabolique · `PANEL_METABOLIQUE_1`
`niveau: socle` · `conditionnel` · déclencheur : à câbler
`condition:` « Tableau d'insulinorésistance ou syndrome métabolique suspecté. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | indice HOMA, profil lipidique, CRP ultrasensible, ferritine, zinc, vitamine D | `WN-CL-0178-053` (« bilan biologique minimum ») |
| ☐ | + apoprotéine, anticorps anti-LDL oxydé, CAR | `WN-CL-0178-054` (« bilan de base ») |

**Optionnel** · `PANEL_METABOLIQUE_OPT` · `mode: optionnel` — BDNF, LBP, IgA
sécrétoires, bêta-défensines, AG érythrocytaires — `WN-CL-0178-055`
(« bilan biologique **optionnel** »). C'est le seul claim du corpus qui qualifie
explicitement un bilan d'optionnel : c'est lui, et lui seul, qui fonde le mode
`optionnel` du moteur.

---

# C · Panels par population

### C.1 — Femme · `PANEL_POP_FEMME`
`mode: conditionnel` · `declencheurs: []` (le sexe n'est pas un drapeau
d'anamnèse — voir A-3)
`condition:` « Femme en population à risque de déficit martial. »
☐ ferritine — `WN-CL-0282-013`

### C.2 — Personne âgée · `PANEL_POP_AGEE`
`mode: conditionnel` · `declencheurs: []` (l'âge n'est pas un drapeau
d'anamnèse — voir A-3)
`condition:` « Personne âgée. »
☐ vitamine D, zinc, sélénium, TSH, acides gras — `WN-CL-0282-014`

---

# D · Non indiqué actuellement — deux panels, tous deux sourcés

### D.1 — Magnésium plasmatique · `PANEL_MG_PLASMATIQUE`
`mode: non_indique_actuellement`
`motif:` « Le dosage plasmatique du magnésium circulant n'est pas recommandé en
première intention : seulement 1 % du pool magnésien se trouve sous cette forme.
L'exploration pertinente est le magnésium érythrocytaire. »
`WN-CL-0242-007` — verbatim.

**C'est la trouvaille la plus utile du dépouillement** : elle explique pourquoi
toutes les autres sources écrivent *magnésium érythrocytaire*, et elle protège
le praticien d'une demande courante mais non informative.

### D.2 — Cortisol matinal isolé · `PANEL_CORTISOL_ISOLE`
`mode: non_indique_actuellement`
`motif:` « Une mesure matinale unique de cortisol est peu fiable en raison des
variations inter-individuelles et des rythmes biologiques ; l'exploration
pertinente est le cortisol awakening response, qui repose sur deux mesures
matinales. »
`WN-CL-0042-007` — verbatim.

---

# E · Abstentions

| Panel | Ce que le corpus porte | Décision |
|---|---|---|
| **Cœliaque** | 14 claims sur la maladie, **1 seul** touchant la sérologie (`WN-CL-0376-016`, simple mention dans une liste), **aucun ne disant quand la demander**. | Abstention. |
| **Hormonal / SOPK** | **0 claim SOPK**, 2 sur les hormones sexuelles. | Abstention. |
| **Douleurs chroniques** | `WN-CL-0161-008` mentionne sérologie rhumatismale et bilan thyroïdien « en cas de suspicion clinique » — sans liste d'analytes ni condition opérationnalisable. | Abstention, à rouvrir. |
| **Plages fonctionnelles au-delà de 2** | Bornes chiffrées exploitables pour la ferritine et la vitamine D seulement (§F.2). | 2 plages, pas 42. |

---

# F · Arbitrages

### A-1 — Répétition annuelle : deux claims concordants
`WN-CL-0312-018` (« au moins un bilan […] **une fois par an** ») et
`WN-CL-0389-004` (« un bilan biologique de base et un bilan biologique
nutritionnel **une fois par an** jusqu'à normalisation »). `delaiJours: 365`.
☐ Appliquer à quels panels ? (la v1 ne l'appliquait qu'à la micronutrition)

### A-2 — Trois déclencheurs restent à câbler
`PANEL_MEMOIRE_1`, `PANEL_FATIGUE_1`, `PANEL_NEURODEG_1` et
`PANEL_METABOLIQUE_1` n'ont pas de famille de questionnaires évidente parmi
`Q_MOD` / `Q_SOM` / `Q_STR` / `Q_GAS` / `Q_INF` / `Q_NEU` / `Q_FIB` / `Q_GEO`.
Deux voies : ☐ vous m'indiquez la correspondance · ☐ ils partent avec
`declencheurs: []` et leur condition en clair (le moteur les affiche, le
praticien juge) — c'est le comportement prévu par `D-059` §5.

### A-3 — Sexe et âge ne sont pas des drapeaux d'anamnèse
`DrapeauxAnamnese` ne porte ni l'un ni l'autre. Les deux panels de population du
§C partent donc avec `declencheurs: []`. ☐ Accepter · ☐ Retirer ces deux panels

### A-4 — Niveau de preuve A/B/C/D : absent du corpus
45 claims sur 8 224 en portent un, en texte libre (« élevé », « méta-analyse »,
« p<0,001 »). Or `biology_functional_ranges.niveau_preuve` est NOT NULL et
contraint à A/B/C/D. Je ne l'invente pas.
☐ Appliquer `C` (« biologie fonctionnelle interprétative », convention déjà
écrite au dépôt) · ☐ Coter à la main

### F.2 — Plages fonctionnelles : deux, dont une discordante

**Ferritine** — trois sources incompatibles, et un seul intervalle actif permis
par (analyte, population) :
- `WN-CL-0044-003` : carence profonde < 10, déficience < 30, suboptimal < 50,
  **confort 50–80**, élevée > 80 ng/mL.
- `WN-CL-0154-051` : indispensable > 50, **souhaitée 80–120 µg/L**.
- `WN-CL-0112-012` : > 80 ng/mL, mais **spécifique au SJSR** — hors population
  générale (`DC-14`).

`DC-30` interdit de moyenner. Proposition : retenir `WN-CL-0044-003`, seule
classification complète et non conditionnée à une pathologie.
☐ `0044-003` · ☐ `0154-051` · ☐ Aucune plage

**Vitamine D** — borne basse 10 ng/mL (`WN-CL-0239-010`), cible 45 ng/mL
(`WN-CL-0239-004` et `WN-CL-0154-054`, concordants). `WN-CL-0239-005` (60 ng/mL)
**écarté** : il se déclare lui-même non consensuel. ☐ Accepter · ☐ Modifier

### A-5 — `RequiresMedicalValidation`
Colonne `validation_medicale_requise BOOLEAN NOT NULL DEFAULT false` sur
`biology_analytes` (votre arbitrage du 2026-08-15 ; vérifié : passe le verrou
HDS, n'ajoute pas de table, `release-db` surveille `migrations/**`).
**Aucun claim ne fonde que l'insulinémie l'exige** — c'est une règle de sécurité
de votre produit, à poser explicitement. ☐ Insulinémie · ☐ Autres : …

---

# G · Récapitulatif

| | v1 (fausse) | v2 |
|---|---|---|
| Panels `recommandé` inconditionnels | 6 | **0** — interdits par `WN-CL-0387-013` |
| Panels `conditionnel` | 1 | **11**, un par tableau clinique ou population |
| Panels `optionnel` | 0 | **1**, seul claim qui qualifie un bilan d'optionnel |
| Panels `non_indiqué_actuellement` | 1 | **2**, tous deux sourcés verbatim |
| Analytes | 24 | **42**, sans aucune indication attachée |
| Sources dépouillées | mots-clés | notebook 08 + 89 fiches + 2 protocoles biologie |

**Après validation** — migration de données (composition + 2 plages + colonne),
puis règles dans `INDICATIONS_BIOLOGIE_V1`, puis signature. Trois gestes, dans
cet ordre.
