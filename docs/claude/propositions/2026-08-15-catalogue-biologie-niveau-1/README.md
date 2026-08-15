# Proposition de catalogue biologie niveau 1 — indexée par tableau clinique

> **Statut : PROPOSITION. Rien n'est écrit en base ni en code.** Objet exigé par
> `D-059` §2 avant toute migration de données.
> **Version 2 — révision de méthode.** La v1 proposait six panels `recommandé`
> pour tout patient. C'était faux, et les sources le disent elles-mêmes.
> **Version 3 — déclencheurs câblés.** L'arbitrage F.2 est clos : les douze
> panels pointent désormais des instruments réels, déjà servis en production. Une
> erreur de lecture y est corrigée (`Q_MOD` = *mode de vie*, pas *mood*), et un
> panel entièrement fondé en est sorti — le SJSR (§B.10).
> **Version 5 — zones tranchées.** Douze zones sur treize sont fixées, la
> plage ferritine est tranchée, et l'axe cognitif est fixé par stade clinique
> plutôt que par couleur (le MCI ne tombe pas dans la même bande selon
> l'instrument). Les treize zones sont tranchées, le Karasek est retiré et le
> BMS-10 entre au panel stress.
> **Réserve neuve et transverse (`F.6`)** : le contrat de déclenchement ne sait
> exprimer aucun « ou ». Cinq panels écrits « X ou Y » n'ont pas de traduction
> en l'état — c'est le premier point à trancher avant toute implémentation.
> **Version 4 — zones.** Trois panels reprennent une zone existante ; les neuf
> autres reçoivent les bandes publiées par leur instrument, à trancher. Quatre
> instruments demandent autre chose qu'une zone, dont un (MFI-20) qui n'en
> supporte aucune.

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
| ☐ | `BIO_HEMOGLOBINE` | Hémoglobine | `g/L` | sang | 0346-013, 0361-009 |
| ☐ | `BIO_BILAN_HEPATIQUE` | Bilan hépatique | — | sang | 0349-015, 0361-009 |
| ☐ | `BIO_IONOGRAMME` | Ionogramme sanguin | — | sang | 0361-009 |
| ☐ | `BIO_ACIDE_URIQUE` | Acide urique | `µmol/L` | sang | 0361-009 |
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

**47 analytes, 0 indication.** Aucune de ces lignes ne dit à qui l'examen
s'adresse — c'est le rôle exclusif du §B.

**Trois entrées sont des blocs, pas des analytes unitaires** :
`BIO_NFS`, `BIO_BILAN_HEPATIQUE` et `BIO_IONOGRAMME`. Les claims les nomment
ainsi (« bilan hépatique », « ionogramme sanguin ») et je ne les éclate pas :
le détail ASAT / ALAT / GGT ou Na / K / Cl ne vient d'aucune source. Ils partent
donc sans unité. Noter aussi que `WN-CL-0361-009` cite « numération formule
sanguine **et** taux d'hémoglobine » : `BIO_HEMOGLOBINE` recoupe `BIO_NFS`, et
c'est le claim qui les distingue, pas moi.
☐ Garder les blocs tels quels · ☐ Les éclater (le détail serait alors de vous)
☐ Fusionner `BIO_HEMOGLOBINE` dans `BIO_NFS`

---

# B · Panels par tableau clinique

Chaque panel est `conditionnel`. Son `declencheur` porte sur la famille de
questionnaires qui repère le tableau ; sa `condition` s'affiche en clair quand
le déclencheur n'est pas rempli. **Aucun panel n'est `recommandé`
inconditionnellement** — `WN-CL-0387-013` l'interdit.

### B.1 — Troubles de l'humeur et dépression · `PANEL_HUMEUR_1`
`niveau: socle` · `mode: conditionnel` · déclencheurs *(zones tranchées le
2026-08-15)* : `Q_NEU_01` (BDI) zone `warning` et au-delà, score ≥ 17
« cas limite de dépression clinique » · `Q_NEU_11` (HAD, sous-score
dépression) zone `warning` et au-delà, score ≥ 8, cut-off publié de
l'instrument · `Q_NEU_02` (MADRS) **comparaison `>= 8`**

*Le MADRS échappe à la règle des zones, et c'est délibéré* : sa grille ne
classe ni 7 ni 19 (§F.2), si bien qu'une zone couleur manquerait en silence
un patient à 19. La comparaison `>= 8` couvre la plage sans trou et retient
le stade « dépression légère », homogène au « cas limite » du BDI et au
« douteux » de la HAD — la bande `warning` du MADRS (20-35) serait, elle, un
cran plus sévère que les deux autres instruments. **Déduit de l'arbitrage du
2026-08-15, non coché explicitement** : ☐ confirmer `>= 8` · ☐ préférer la
zone `warning` (20-60)
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
`niveau: socle` · `conditionnel` · déclencheurs *(zones tranchées le
2026-08-15)* : `Q_NEU_11` (HAD, sous-score anxiété) zone `warning` et au-delà,
score ≥ 8 · `Q_INF_05` (auto-évaluation SIIN) zone `warning` et au-delà
`condition:` « Tableau anxieux repéré à l'exploration de l'humeur. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | magnésium érythrocytaire, vitamine D, ferritine, zinc, CRP ultrasensible | `WN-CL-0333-020` (première intention) |

**Seconde intention** · `PANEL_ANXIETE_2` · CAR, profil des neurotransmetteurs,
rapport sodium/potassium urinaire 24 h, butyrate fécal, AG érythrocytaires —
`WN-CL-0333-021`.

### B.3 — Stress, adaptation, surmenage · `PANEL_STRESS_1`
`niveau: socle` · `conditionnel` · déclencheurs *(2026-08-15)* : `Q_STR_02`
(PSS-10), zone `warning` + `danger` + `dark`, reprise de `R-STR-01`/`R-STR-02`
· `Q_STR_05` (BMS-10, Burnout Measure Short), zone `warning` et au-delà —
moyenne ≥ 3,5, « présence du burnout »

`Q_STR_06` (Karasek) est retiré : aucun claim ne le fonde (§F.2).

**Forme suspendue à `F.6`** — les deux déclencheurs sont ici dans une
intention de « ou », que le contrat actuel ne sait pas exprimer. Écrits dans
une même règle ils seraient en ET ; écrits en deux règles ils écarteraient le
panel. Le §F.6 pose les trois issues.

| ☐ | Analytes BMS-10 | Claims |
|---|---|---|
| ☐ | Bandes d'interprétation du BMS-10 : 1,0-2,4 très faible · 2,5-3,4 faible · 3,5-4,4 modéré · 4,5-5,4 élevé · 5,5-7,0 très élevé | `WN-CL-0106-025` à `WN-CL-0106-029` |
| ☐ | Bilan biologique de stadification du stress (stress d'alarme → burn out) | `WN-CL-0107-012` |
`condition:` « Charge de stress ou tableau de surmenage repéré. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | CAR | `WN-CL-0042-008`, `WN-CL-0107-032` (« un des meilleurs marqueurs en première intention, simple, reproductible ») |
| ☐ | cycle du cortisol (CAR, 8h/20h, cortisol/DHEA), alpha-amylase salivaire, IgA sécrétoire salivaire | `WN-CL-0282-015` |

### B.4 — Troubles du sommeil · `PANEL_SOMMEIL_1`
`niveau: socle` · `conditionnel` · déclencheur : `Q_SOM_01` (PSQI)
`condition:` « Trouble du sommeil repéré à l'exploration du sommeil. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | 6-sulfatoxymélatonine, vitamine D | `WN-CL-0282-017` |
| ☐ | ferritine, vitamine D, magnésium érythrocytaire | `WN-CL-0323-011` (« analyses biologiques simples ») |

### B.5 — Troubles de la mémoire et cognition · `PANEL_MEMOIRE_1`
`niveau: socle` · `conditionnel` · déclencheurs *(zones tranchées le
2026-08-15, départ au stade MCI)* : `Q_GEO_04` (MMSE) zone `info` et au-delà,
score ≤ 26 — échelle inversée · `Q_GEO_06` (test des 5 mots) zone `danger`,
score ≤ 7, seule bande défavorable publiée · `Q_NEU_06` (MMT SIIN) zone
`info` et au-delà, score ≥ 1
`condition:` « Plainte mnésique ou cognitive repérée. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | folates, vitamine B12, CRP ultrasensible, acides gras | `WN-CL-0282-018` |
| ☐ | ferritine, zinc, folates érythrocytaires, HVA urinaire, CAR, vitamine D, magnésium, CRP ultrasensible, homocystéine | `WN-CL-0388-008` (fiche de synthèse mémoire) |

### B.6 — Troubles fonctionnels intestinaux · `PANEL_DIGESTIF_1`
`niveau: socle` · `conditionnel` · déclencheurs : `Q_GAS_01` (TFD SIIN 2021) ou
`Q_GAS_02` (IBS-SSS, score de Francis)
`condition:` « Troubles fonctionnels intestinaux repérés. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | IgA sécrétoires fécales, bêta-défensines 2 fécales, CRP ultrasensible, AGCC fécaux, magnésium érythrocytaire | `WN-CL-0348-013` |

**Seconde intention** · `PANEL_DIGESTIF_2` — biochimie de la digestion dans les
selles, CAR, alpha-amylase salivaire, zonuline, LBP ou LPS, magnésium
érythrocytaire, zinc sérique — `WN-CL-0346-014`.

### B.7 — Fatigue · `PANEL_FATIGUE_1`
`niveau: socle` · `conditionnel` · déclencheur : `Q_SOM_06` (échelle de
fatigue de Pichot), zone couleur `warning` — score 23-32, seuil source > 22
*(arbitrage praticien du 2026-08-15)*
`condition:` « Plainte de fatigue au premier plan. »

**Réserve consignée** — le corpus fonde le contenu de ce panel
(`WN-CL-0361-009`) mais aucun claim ne fonde ce seuil comme ouverture d'une
exploration biologique ; `WN-CL-0361-008` énonce que les marqueurs se
sélectionnent « en fonction du contexte clinique évocateur ». Le mode
`conditionnel` limite la portée de cette réserve : le panel s'affiche
toujours, avec sa condition, remplie ou non (`D-059` §5) — un patient sous le
seuil n'est donc jamais écarté en silence. `Q_SOM_07` (MFI-20) est retiré du
déclencheur, faute de barème utilisable (voir §F.2).

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
`niveau: approfondissement` · `conditionnel` · déclencheurs *(zones tranchées
le 2026-08-15, départ au stade MCI)* : `Q_GEO_03` (AQ, Sabbagh 2010) zone
`warning` et au-delà, score ≥ 5 « MCI probable » · `Q_GEO_05` (QDRS, Galvin
2015) zone `info` et au-delà, score ≥ 1,5 « MCI »

*Les couleurs diffèrent d'un instrument à l'autre pour un même stade* : le MCI
tombe en `warning` sur l'AQ mais en `info` sur le QDRS et le MMSE. Le départ a
donc été fixé par stade, pas par couleur — une règle uniforme « départ à
`warning` » aurait attrapé le MCI par l'AQ et l'aurait manqué par les deux
autres.
`condition:` « Tableau neurodégénératif ou de neurosénescence documenté. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | zinc, sélénium, vitamine D | `WN-CL-0167-022` |
| ☐ | homocystéine, anticorps anti-LDL oxydé, CRP ultrasensible | `WN-CL-0167-023` |

**Garde** — `WN-CL-0387-013` : le bilan complet **ne se fait pas
systématiquement**, l'orientation clinique établit les choix. Ce panel ne
s'ouvre donc jamais seul.

### B.9 — Insulinorésistance et syndrome métabolique · `PANEL_METABOLIQUE_1`
`niveau: socle` · `conditionnel` · déclencheur *(zone tranchée le
2026-08-15)* : `Q_CAR_01` (questionnaire cardio-métabolique SIIN), zone `info`
et au-delà — score ≥ 6, « risque modéré » et au-delà. Départ précoce assumé :
c'est l'axe où la biologie précède utilement le tableau clinique.
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

### B.10 — Syndrome des jambes sans repos · `PANEL_SJSR`
`niveau: socle` · `conditionnel` · déclencheur : `Q_SOM_04` (IRLS), zone
couleur `warning` + `danger` — score ≥ 11, « SJSR modéré » et au-delà
*(arbitrage praticien du 2026-08-15 ; la grille de l'instrument publie
« Bilan biologique complet (ferritine++) » en protocole de cette bande)*
`condition:` « Syndrome des jambes sans repos repéré. »

| ☐ | Analytes | Claims |
|---|---|---|
| ☐ | ferritine | `WN-CL-0320-003` (« Le syndrome des jambes sans repos comme cause d'insomnie secondaire justifie un dosage de la ferritine. ») |
| ☐ | ferritine, cible ≥ 50 ng/mL | `WN-CL-0318-020` (« […] les valeurs devant être supérieures à 50 ng/mL au minimum ») |
| ☐ | ferritine, cible thérapeutique > 80 ng/mL | `WN-CL-0112-012` (valeurs de référence consensuelles HAS, traitement étiologique du SJSR) |

**Ce panel est né du câblage des déclencheurs**, pas du dépouillement initial :
l'instrument `Q_SOM_04` existe déjà en production, et trois claims `VALIDE` le
rejoignent. Il dénoue en prime la discordance ferritine du §F.5 (voir là-bas).

---

# C · Panels par population

### C.1 — Femme · `PANEL_POP_FEMME`
`mode: conditionnel` · `declencheurs: []` (le sexe n'est pas un drapeau
d'anamnèse — voir F.3)
`condition:` « Femme en population à risque de déficit martial. »
☐ ferritine — `WN-CL-0282-013`

### C.2 — Personne âgée · `PANEL_POP_AGEE`
`mode: conditionnel` · `declencheurs: []` (l'âge n'est pas un drapeau
d'anamnèse — voir F.3)
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
| **Douleurs chroniques** | `WN-CL-0161-008` mentionne sérologie rhumatismale et bilan thyroïdien « en cas de suspicion clinique » — sans liste d'analytes ni condition opérationnalisable. **Les instruments existent pourtant** (`Q_FIB_01` FiRST, `Q_FIB_02` QIF, `Q_FIB_03` ELFE) : c'est le claim qui manque, pas le déclencheur. | Abstention, à rouvrir dès qu'une source le fonde. |
| **Plages fonctionnelles au-delà de 2** | Bornes chiffrées exploitables pour la ferritine et la vitamine D seulement (§F.5). | 2 plages, pas 42. |

---

# F · Arbitrages

### F.1 — Répétition annuelle : deux claims concordants
`WN-CL-0312-018` (« au moins un bilan […] **une fois par an** ») et
`WN-CL-0389-004` (« un bilan biologique de base et un bilan biologique
nutritionnel **une fois par an** jusqu'à normalisation »). `delaiJours: 365`.
☐ Appliquer à quels panels ? (la v1 ne l'appliquait qu'à la micronutrition)

### F.2 — Déclencheurs : instruments câblés, zones pour partie tranchées

**Cet arbitrage est clos.** Le dépôt portait la réponse : les familles de
questionnaires ne sont pas des thèmes vagues, ce sont des instruments nommés et
déjà servis en production (`docs/claude/corpus/instrument_registry.json`,
`web/src/lib/questionnaires/`).

**Une erreur de ma part a été corrigée au passage** : la v2 câblait les panels
humeur et anxiété sur la famille `Q_MOD`, en lisant « MOD » comme *mood*. C'est
**mode de vie** (`Q_MOD_01` contextuel, `Q_MOD_02` activité, `Q_MOD_03` plaintes
ressenties). Les instruments d'humeur sont dans `Q_NEU`.

| Panel | Déclencheur retenu |
|---|---|
| `PANEL_HUMEUR_1` | `Q_NEU_01` (BDI) · `Q_NEU_02` (MADRS) · `Q_NEU_11` (HAD, sous-score dépression) |
| `PANEL_ANXIETE_1` | `Q_NEU_11` (HAD, sous-score anxiété) · `Q_INF_05` (auto-évaluation anxiété SIIN) |
| `PANEL_STRESS_1` | `Q_STR_02` (PSS-10) · `Q_STR_06` (Karasek) |
| `PANEL_SOMMEIL_1` | `Q_SOM_01` (PSQI) |
| `PANEL_MEMOIRE_1` | `Q_GEO_04` (MMSE) · `Q_GEO_06` (test des 5 mots) · `Q_NEU_06` (MMT SIIN) |
| `PANEL_DIGESTIF_1` | `Q_GAS_01` (TFD SIIN 2021) · `Q_GAS_02` (IBS-SSS) |
| `PANEL_FATIGUE_1` | `Q_SOM_07` (MFI-20) · `Q_SOM_06` (Pichot) |
| `PANEL_NEURODEG_1` | `Q_GEO_03` (AQ Sabbagh) · `Q_GEO_05` (QDRS Galvin) |
| `PANEL_METABOLIQUE_1` | `Q_CAR_01` (cardio-métabolique SIIN) |
| `PANEL_SJSR` | `Q_SOM_04` (IRLS) |

**Les zones, maintenant.** Trois panels reprennent une zone déjà écrite. Les
autres ne le peuvent pas : la table d'orientation ne dit rien de leurs
instruments, et le code énonce que le point de départ est « un arbitrage
clinique par instrument, qu'aucun banc ne peut prendre ».

**Reprises à l'identique de la table d'orientation.** Aucun seuil nouveau —
mais cette table porte `validationExterne: false` : c'est un alignement, pas
une validation acquise.

| Panel | Zone reprise | Règle source |
|---|---|---|
| `PANEL_SOMMEIL_1` | couleur `info` `warning` `danger` `dark` | `R-SOM-01` |
| `PANEL_STRESS_1` | couleur `warning` `danger` `dark` | `R-STR-01`, `R-STR-02` |
| `PANEL_DIGESTIF_1` | couleur `warning` `danger` `dark` | `R-GAS-01` |

`dark` est inerte sur `Q_STR_02` et `Q_GAS_01`, qui ne publient pas cette
bande ; la table la cite au titre de « ne jamais s'arrêter sous la plus
sévère ».

**Zones : les treize sont tranchées** (2026-08-15). Les bandes listées sont
celles que l'instrument publie déjà ; la case cochée vaut pour elle-même et
toutes les plus sévères.

L'IBS-SSS part à `warning` (≥ 70) pour une raison d'abord structurelle : le
panel digestif porte déjà un second déclencheur, le TFD (`Q_GAS_01`), qui part
à `warning` par reprise de `R-GAS-01`. Deux déclencheurs d'un même panel à des
sévérités différentes feraient dépendre le déclenchement de l'instrument passé
plutôt que de l'état du patient. La bande porte du reste le mot
« significatifs » — c'est l'instrument qui y place son seuil.

*Limite notée* : la bande `warning` de l'IBS-SSS couvre 70 à 300, une plage
très large dont le libellé reconnaît lui-même que « l'intensité du trouble
ressenti est proportionnelle au score ». Un patient à 75 déclenche donc comme
un patient à 295. Affiner supposerait une borne intermédiaire qu'aucune source
du dossier ne publie (`DC-19`).

**L'axe cognitif a été fixé par stade, non par couleur.** Le MCI ne tombe pas
dans la même bande selon l'instrument — `warning` sur l'AQ, `info` sur le MMSE
et le QDRS. Une règle uniforme l'aurait attrapé par l'un et manqué par les
deux autres, sans que rien ne le signale.

| Panel · instrument | Bandes publiées (cocher le départ) |
|---|---|
| Humeur · `Q_NEU_01` BDI | ☑ **`warning`** (17-39) « cas limite » et au-delà — *tranché le 2026-08-15* |
| Humeur · `Q_NEU_11` HAD-D | ☑ **`warning`** (8-21) — cut-off publié de l'instrument — *tranché le 2026-08-15* |
| Anxiété · `Q_NEU_11` HAD-A | ☑ **`warning`** (8-21) — cut-off publié — *tranché le 2026-08-15* |
| Anxiété · `Q_INF_05` SIIN | ☑ **`warning`** + `danger` + `dark` — *tranché le 2026-08-15* |
| Mémoire · `Q_GEO_04` MMSE | ☑ **`info`** (≤ 26) — dès le MCI, échelle inversée — *tranché le 2026-08-15* |
| Mémoire · `Q_GEO_06` 5 mots | ☑ **`danger`** (0-7) — seule bande défavorable — *tranché le 2026-08-15* |
| Mémoire · `Q_NEU_06` MMT | ☑ **`info`** (≥ 1) — dès les troubles fonctionnels — *tranché le 2026-08-15* |
| Digestif · `Q_GAS_02` IBS-SSS | ☑ **`warning`** (70-500) « troubles fonctionnels significatifs » — *tranché le 2026-08-15* |
| Fatigue · `Q_SOM_06` Pichot | ☑ **`warning` 23-32** (seuil source > 22) — *tranché le 2026-08-15* |
| Neurodég. · `Q_GEO_03` AQ | ☑ **`warning`** (5-21) — bande portant le MCI probable — *tranché le 2026-08-15* |
| Neurodég. · `Q_GEO_05` QDRS | ☑ **`info`** (≥ 1,5) — bande portant le MCI — *tranché le 2026-08-15* |
| Métabolique · `Q_CAR_01` | ☑ **`info`** (6-25) — dès le risque modéré — *tranché le 2026-08-15* |
| SJSR · `Q_SOM_04` IRLS | ☑ **`warning` 11-20 modéré** (+ `danger` 21-40) — *tranché le 2026-08-15* |

**Le SJSR est tranché** (2026-08-15) : départ à `warning`, soit un score
IRLS ≥ 11 (« SJSR modéré » et au-delà). La grille de l'instrument publie pour
protocole de cette bande « Bilan biologique complet (ferritine++) » — le
départ est soutenu par l'instrument, et l'arbitrage praticien l'a retenu. La
bande `info` (1-10, « SJSR léger »), dont le protocole mentionne déjà la
correction des déficits en fer, reste hors déclenchement.

**Quatre instruments demandent autre chose qu'une zone :**

- **`Q_SOM_07` (MFI-20) : le blocage n'est pas l'absence de barème.** L'écrire
  ainsi serait inexact. La source refuse bien tout score global
  (`sansTotalGlobal: true`), mais elle cite des seuils — pour la seule
  sous-échelle « Fatigue générale », et **dépendants du sexe et de l'âge** :
  hommes ≥ 9 avant 40 ans, ≥ 11 de 40 à 59, ≥ 14 dès 60 ; femmes ≥ 11, ≥ 12,
  ≥ 14 sur les mêmes tranches. Elle les rapporte à des données allemandes
  (25ᵉ percentile) attribuées à Schwarz 2003 et Singer 2011, **absentes du
  dossier et non vérifiées ici**.

  Deux obstacles distincts, donc. `OrientationDeclencheur` ne transporte ni
  âge ni sexe : un `>= 9` unique s'allumerait à tort chez une femme de 65 ans,
  un `>= 14` manquerait un homme de 30 ans — c'est `DC-14`, la population d'un
  claim se respecte. Et les références manquent au dossier, ce qui interdit de
  s'y adosser (`DC-01`). Le déclencheur du panel fatigue repose donc sur le
  seul `Q_SOM_06` (Pichot, bande `warning` 23-32, seuil source > 22).
  ☐ Accepter · ☐ Verser Schwarz 2003 / Singer 2011 au corpus, puis rouvrir ·
  ☐ Étendre le type de déclencheur à l'âge et au sexe (lot dédié)

  **Les seuils MFI ne portent que sur `GEN`**, une dimension sur cinq. Même
  références versées, on ne débloquerait qu'un cinquième de l'instrument :
  un déclencheur « fatigue générale », pas un déclencheur MFI. Les quatre
  autres sous-échelles n'ont de barème d'aucune sorte.

  *Note de périmètre* : le MFI-20 mesure la fatigue, pas la qualité du
  sommeil. Sa catégorie « Sommeil » au catalogue est un regroupement par
  domaine d'exploration ; l'instrument du sommeil est le PSQI (`Q_SOM_01`).
- **Le corpus ne fonde aucun seuil de déclenchement pour la fatigue** —
  recherche du 2026-08-15, et c'est un résultat, pas un échec. Il fonde
  solidement le *contenu* du panel (`WN-CL-0361-009` énumère les marqueurs de
  première intention : NFS, hémoglobine, CRP ultrasensible, ferritine, fer
  sérique, coefficient de saturation) et documente abondamment le lien
  fatigue↔déficits (`0110-004`, `0359-039`, `0358-008`). Mais aucun claim ne
  dit à partir de quel score explorer. `WN-CL-0361-008` dit même l'inverse :
  « les marqueurs […] doivent être sélectionnés en fonction du contexte
  clinique évocateur » — un jugement praticien, pas un seuil.

  L'anamnèse n'offre pas de repli : `symptomes_fonctionnels` ne porte qu'une
  option (déglutition), et aucun drapeau ne code la fatigue.

  **Tranché le 2026-08-15 : `conditionnel` sur Pichot**, zone `warning`
  (23-32). L'option `optionnel` — proposé sans déclencheur, au plus près de
  ce que dit `0361-008` — a été examinée et écartée par le praticien. La
  réserve reste consignée au panel §B.7 ; le mode `conditionnel` en limite la
  portée, puisque le panel s'affiche toujours avec sa condition.

- **`Q_STR_06` (Karasek) est retiré du déclencheur stress** — tranché le
  2026-08-15, sur délégation. J'avais proposé de le câbler en comparaison sur
  sous-score ; la vérification du corpus a renversé cette proposition.

  **Aucun claim du corpus ne mentionne Karasek, le *job strain*, la latitude
  décisionnelle ni la demande psychologique** (recherche du 2026-08-15). Un
  déclencheur y serait sans provenance (`DC-01`). S'y ajoutent deux obstacles :
  la note de l'instrument enregistre une discordance non résolue sur le seuil
  de latitude — 70 « mention France » contre 72 pour la définition du *job
  strain*, le calcul retenant 72 — et le *job strain* exige DEUX conditions en
  ET, que la règle du panel ne peut pas porter sans se séparer de sa jambe
  PSS-10, les `declencheurs` étant déjà conjonctifs.

  **Le corpus fonde le stress sur un autre instrument : le BMS-10**
  (`Q_STR_05`, Burnout Measure Short), déjà servi en production. Ses cinq
  bandes publiées correspondent une à une à cinq claims `VALIDE` —
  `WN-CL-0106-025` à `WN-CL-0106-029` — et `WN-CL-0107-012` fonde
  explicitement le bilan biologique pour situer le stade de stress, « du
  stress d'alarme […] à la menace de Burn out et au Burn out ».

  **Retenu le 2026-08-15 : le BMS-10 entre au panel stress**, zone `warning`
  et au-delà — moyenne ≥ 3,5, « présence du burnout » (`WN-CL-0106-027`), en
  cohérence avec le départ du PSS-10. Sa forme exacte dépend de `F.6`.
- **`Q_NEU_02` (MADRS) est troué par fidélité à la source** : les scores 7 et
  19 ne sont classés par aucune bande, le code le documente. Une zone couleur
  y manquerait silencieusement un patient à 19 — soit une dépression moyenne
  non explorée. Une `comparaison >= 8` couvre la plage sans trou.
  ☐ Comparaison `>= 8` · ☐ Zone couleur en connaissance du trou
- **`Q_GEO_04` (MMSE) et `Q_GEO_06` (5 mots) sont à échelle inversée** — score
  haut favorable. Les couleurs le gèrent ; une comparaison devrait inverser
  l'opérateur. À garder en tête si l'un bascule en comparaison.

### F.6 — Aucun « ou » n'est exprimable : cinq panels sont concernés

**Découvert en étendant le panel stress au BMS-10** (2026-08-15), en lisant
`statuts.ts` plutôt qu'en le supposant. Le moteur ne propose aucune
disjonction, à deux niveaux :

- **dans une règle**, les `declencheurs` sont en ET — `tousAtteints` n'est
  vrai que si chacun est atteint ;
- **entre règles**, deux règles publiées sur un même panel sont traitées comme
  une discordance : le panel bascule en `non_indique_actuellement` et est
  écarté « jusqu'à arbitrage de la table » (`DC-30`, cité sur place).

Or ce document écrit « déclencheurs : X **ou** Y » pour cinq panels — humeur
(BDI, MADRS, HAD), anxiété (HAD, `Q_INF_05`), mémoire (MMSE, 5 mots, MMT),
digestif (TFD, IBS-SSS), neurodégénératif (AQ, QDRS) — et le stress serait le
sixième. **Aucun n'est implémentable tel qu'écrit.** Pire qu'inopérant : deux
règles naïvement publiées écarteraient le panel au lieu de l'élargir, soit
l'inverse exact de l'intention.

La formulation « ou » n'était pas fausse en tant que proposition clinique —
elle décrit bien l'intention. Elle est simplement sans traduction dans le
contrat actuel, et je ne l'avais pas vérifié en l'écrivant.

**Trois issues, à trancher panel par panel ou globalement :**

- **Un seul instrument par panel.** Le ET devient trivial, rien à changer au
  moteur. Coût : on perd le déclenchement quand le patient a passé l'autre
  questionnaire.
- **Tous les instruments en ET.** Exige que le patient les ait tous passés et
  tous positifs. Très restrictif, et probablement contraire à l'intention
  clinique — un patient n'ayant passé que le BDI ne déclencherait rien.
- **Étendre le contrat à une disjonction** (`{type:'ou', declencheurs:[…]}`),
  avec sa garde de recueil incomplet et son banc. C'est un lot de code dédié,
  hors de ce catalogue, mais c'est la seule issue qui préserve l'intention.

☐ Un instrument par panel · ☐ ET · ☐ Lot « disjonction » puis reprise

---

### F.3 — Sexe et âge ne sont pas des drapeaux d'anamnèse
`DrapeauxAnamnese` ne porte ni l'un ni l'autre. Les deux panels de population du
§C partent donc avec `declencheurs: []`. ☐ Accepter · ☐ Retirer ces deux panels

### F.4 — Niveau de preuve A/B/C/D : absent du corpus
45 claims sur 8 224 en portent un, en texte libre (« élevé », « méta-analyse »,
« p<0,001 »). Or `biology_functional_ranges.niveau_preuve` est NOT NULL et
contraint à A/B/C/D. Je ne l'invente pas.
☐ Appliquer `C` (« biologie fonctionnelle interprétative », convention déjà
écrite au dépôt) · ☐ Coter à la main

### F.5 — Plages fonctionnelles : deux, dont une discordante

**Ferritine** — trois sources incompatibles, et un seul intervalle actif permis
par (analyte, population) :
- `WN-CL-0044-003` : carence profonde < 10, déficience < 30, suboptimal < 50,
  **confort 50–80**, élevée > 80 ng/mL.
- `WN-CL-0154-051` : indispensable > 50, **souhaitée 80–120 µg/L**.
- `WN-CL-0112-012` : > 80 ng/mL, mais **spécifique au SJSR** — hors population
  générale (`DC-14`).

`DC-30` interdit de moyenner. **Le câblage des déclencheurs en dénoue une
partie** : `WN-CL-0112-012` n'est pas une plage générale concurrente, c'est une
cible thérapeutique du SJSR. Elle rejoint donc le panel `PANEL_SJSR` (§B.10) —
`DC-14`, on respecte la population du claim — et sort de cet arbitrage.

Restent deux sources pour la population générale. **Tranché le 2026-08-15 :
`WN-CL-0044-003`**, seule classification complète du corpus et non
conditionnée à une pathologie particulière. `WN-CL-0154-051` est écartée pour
cet usage — elle n'est pas invalidée, elle n'est simplement pas la source
retenue pour la plage affichée. La discordance reste donc signalée, jamais
moyennée (`DC-30`).

**Vitamine D** — borne basse 10 ng/mL (`WN-CL-0239-010`), cible 45 ng/mL
(`WN-CL-0239-004` et `WN-CL-0154-054`, concordants). `WN-CL-0239-005` (60 ng/mL)
**écarté** : il se déclare lui-même non consensuel. ☐ Accepter · ☐ Modifier

### F.6 — `RequiresMedicalValidation`
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
| Panels `conditionnel` | 1 | **12**, un par tableau clinique ou population |
| Panels `optionnel` | 0 | **1**, seul claim qui qualifie un bilan d'optionnel |
| Panels `non_indiqué_actuellement` | 1 | **2**, tous deux sourcés verbatim |
| Analytes | 24 | **47**, sans aucune indication attachée |
| Sources dépouillées | mots-clés | notebook 08 + 89 fiches + 2 protocoles biologie |

**Après validation** — migration de données (composition + 2 plages + colonne),
puis règles dans `INDICATIONS_BIOLOGIE_V1`, puis signature. Trois gestes, dans
cet ordre.
