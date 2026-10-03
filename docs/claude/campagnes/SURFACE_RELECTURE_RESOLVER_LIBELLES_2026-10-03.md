# Surface de relecture — resolver libellé → analyte (BIO-INGEST LOT-02)

Préparée le 2026-10-03 pour la signature de `resolverLibellesV1.ts`
(étape 3 des arbitrages du 2026-10-02, fiche
`2026-09-30-bio-ingest/lots/LOT-02-staging-et-pdf.md`). Le responsable
valide ou corrige la table ; la signature suit, par une décision `D-xxx`,
avec l'enrôlement dans `shaPerimetreLitteral.guard.test.ts`.

## Ce que la signature engage

- La table **propose** un analyte pour un libellé lu ; elle n'écrit rien. Le
  praticien confirme ou corrige chaque analyte à la validation.
- Correspondance sur le libellé **entier**, normalisé (accents, casse,
  ponctuation) ; rien n'est traduit ni deviné. Un libellé absent rend
  `inconnu`, un libellé posé sous deux codes rend `ambigu`.
- **Garde aval** : une unité lue différente de celle du catalogue est
  refusée à la validation (`unite_divergente`, `decisions.ts:236`). Une
  proposition fausse dont l'unité diffère ne peut donc pas s'écrire. Le seul
  piège réel est une autre matrice **sous la même unité** — c'est le motif
  du retrait de « Cuivre », « Glutathion », « Zonuline » (2026-10-02).
- Empreinte de la table relue :
  `ccbd8008f913d69900792c976e80311fc390a32d5ca525c2f3b46486ff53504b`
  (98 entrées, 96 libellés distincts, 43 analytes). Toute retouche la
  change et referme le verrou.

## La table, analyte par analyte

Catalogue : libellé, unité, prélèvement (migrations
`catalogue_biologie_niveau_1_donnees` et `…_omega3_aa_epa`).

| Code | Catalogue | Libellés proposés | Remarque |
| --- | --- | --- | --- |
| BIO_FERRITINE | Ferritine · ng/mL · sang | Ferritine, Ferritinémie | |
| BIO_FER_SERIQUE | Fer sérique · µmol/L · sang | Fer sérique, Sidérémie | « Fer » seul non repris |
| BIO_COEF_SATURATION | Coef. de saturation de la sidérophiline · % · sang | libellé catalogue, … de la transferrine, Saturation de la transferrine, CST | |
| BIO_ZINC_PLASMATIQUE | Zinc plasmatique · µmol/L · sang | Zinc plasmatique | « Zinc » seul non repris (sérique ≠ plasmatique) |
| BIO_MAGNESIUM_ERYTHROCYTAIRE | Magnésium érythrocytaire · mmol/L · sang | libellé catalogue, Magnésium intra-érythrocytaire | |
| BIO_VITAMINE_D_25OH | Vitamine D (25-OH) · ng/mL · sang | libellé catalogue, 25-OH vitamine D, 25-OH vitamine D (D2+D3), 25-hydroxyvitamine D, 25(OH)D | |
| BIO_FOLATES_ERYTHROCYTAIRES | Folates érythrocytaires · nmol/L · sang | libellé catalogue, Folates intra-érythrocytaires | |
| BIO_B12_HOLOTC | Vitamine B12 active (holotranscobalamine) · pmol/L · sang | libellé catalogue, Vitamine B12 active, Holotranscobalamine, Holo-TC | « Vitamine B12 » seule non reprise (B12 totale) |
| BIO_SELENIUM | Sélénium plasmatique · µmol/L · sang | Sélénium plasmatique | |
| BIO_IODURIE | Iodurie · µg/24h · urine | Iodurie, Iodurie des 24 heures | voir **R1** |
| BIO_CUIVRE | Cuivre · µmol/L · sang | Cuprémie | « Cuivre » seul retiré le 2026-10-02 |
| BIO_RATIO_ZINC_CUIVRE | Rapport zinc / cuivre · ratio | Rapport…, Ratio zinc / cuivre | |
| BIO_GLYCEMIE_JEUN | Glycémie à jeun · mmol/L · sang | libellé catalogue, Glucose à jeun | « Glycémie » seule non reprise |
| BIO_INSULINEMIE | Insulinémie à jeun · mUI/L · sang | libellé catalogue, Insuline à jeun | |
| BIO_RATIO_HOMA | Indice HOMA · score | Indice/Index HOMA, HOMA-IR | |
| BIO_HBA1C | Hémoglobine glyquée · % · sang | libellé catalogue, … (HbA1c), HbA1c | la ligne en mmol/mol sera refusée (unité) |
| BIO_AG_ERYTHROCYTAIRES | Statut des acides gras érythrocytaires · % · sang | libellé catalogue | panel plus qu'une ligne : sans effet probable |
| BIO_ALBUMINE | Albumine · g/L · sang | Albumine, Albuminémie | voir **Q1** |
| BIO_CRP_US | CRP ultrasensible · mg/L · sang | libellé catalogue, CRP us, CRP hs, hs-CRP, Protéine C réactive ultrasensible | « CRP » seule non reprise |
| BIO_HOMOCYSTEINE | Homocystéine · µmol/L · sang | Homocystéine, Homocystéinémie | |
| BIO_TSH_US | TSH ultrasensible · mUI/L · sang | libellé catalogue, TSH us, TSH, Thyréostimuline | « TSH » seule rattachée (dosages actuels tous ultrasensibles) |
| BIO_HEMOGLOBINE | Hémoglobine · g/L · sang | Hémoglobine | urinaire = qualitative, refusée d'office |
| BIO_ACIDE_URIQUE | Acide urique · µmol/L · sang | Acide urique, Uricémie | voir **Q1** |
| BIO_ANTI_TPO | Anticorps anti-TPO · UI/mL · sang | libellé catalogue, Anticorps anti-thyroperoxydase, Ac anti-TPO | |
| BIO_T3_REVERSE | T3 reverse · ng/L · sang | T3 reverse, Reverse T3, rT3 | |
| BIO_ANTI_LDL_OXYDE | Anticorps anti-LDL oxydé · UI/mL · sang | libellé catalogue, … oxydées | |
| BIO_COENZYME_Q10 | Coenzyme Q10 plasmatique · µmol/L · sang | libellé catalogue, Coenzyme Q10 | |
| BIO_RATIO_KYN_TRP | Rapport kynurénine / tryptophane · ratio | Rapport…, Ratio… | |
| BIO_CAR | Cortisol awakening response · nmol/L · salive | libellé catalogue, *Cortisol salivaire* | ambigu voulu |
| BIO_CORTISOL_8H_20H | Cortisol salivaire 8h / 20h · nmol/L · salive | libellé catalogue, *Cortisol salivaire* | ambigu voulu ; voir **R2** |
| BIO_RATIO_CORTISOL_DHEA | Rapport cortisol / DHEA · ratio | Rapport…, Ratio… | |
| BIO_ALPHA_AMYLASE | Alpha-amylase salivaire · UI/L · salive | libellé catalogue, Amylase salivaire | |
| BIO_IGA_SALIVAIRE | IgA sécrétoire salivaire · mg/L · salive | libellé catalogue, IgA sécrétoires salivaires, *IgA sécrétoires* | ambigu voulu |
| BIO_IGA_FECALES | IgA sécrétoires fécales · µg/g · selles | libellé catalogue, *IgA sécrétoires* | ambigu voulu |
| BIO_6_SMT | 6-sulfatoxymélatonine urinaire · µg/24h · urine | libellé catalogue, 6-sulfatoxymélatonine, 6-SMT | |
| BIO_HVA_URINAIRE | HVA urinaire (catabolites dopamine) · µg/24h · urine | libellé catalogue, HVA urinaire, Acide homovanillique urinaire | |
| BIO_BDNF | Facteur neurotrophique BDNF · ng/mL · sang | libellé catalogue | « BDNF » seul non repris (sérum/plasma) |
| BIO_BETA_DEFENSINE_2 | Bêta-défensines de type 2 fécales · µg/g · selles | libellé catalogue, Bêta-défensine 2 | sérique en ng/mL : refusée (unité) |
| BIO_AGCC_FECAUX | Acides gras à chaîne courte fécaux · µg/g · selles | libellé catalogue | |
| BIO_CALPROTECTINE | Calprotectine fécale · µg/g · selles | libellé catalogue, Calprotectine | plasmatique en autre unité : refusée |
| BIO_LBP | LBP (protéine porteuse du LPS) · µg/mL · sang | libellé catalogue, LBP, Lipopolysaccharide binding protein | |
| BIO_INDEX_OMEGA3 | Index oméga 3 · % · sang | Index oméga 3 | |
| BIO_RATIO_AA_EPA | Rapport AA / EPA · ratio | Rapport…, Ratio… | |

**Hors table, `inconnu` permanent** (le praticien choisit) : Glutathion,
Zonuline (libellés retirés le 2026-10-02) ; Profil lipidique, NFS, Bilan
hépatique, Ionogramme (panels sans unité).

## À trancher

- **Q1 — « Albumine » et « Acide urique » restent-ils rattachés ?** Ce sont
  les deux seuls libellés génériques gardés dont une autre matrice (urine)
  peut, rarement, s'écrire dans la même unité que le catalogue. *Recommandé :
  les garder* — le cas est rare, le praticien confirme l'analyte, et les
  retirer obligerait à choisir l'analyte sur chaque bilan courant.
- **Q2 — Signer la table telle quelle, ou l'enrichir d'abord ?** *Recommandé :
  signer telle quelle*, puis compléter à partir des libellés réellement lus
  restés `inconnu` (lus par identifiant en conteneur, après quelques comptes
  rendus réels) — plutôt que de deviner des synonymes aujourd'hui. Chaque
  ajout est une re-signature.
- **Q3 — Source déclarée** dans la signature (`sourceReference`). Proposition :
  « Relecture du responsable, le 2026-10-03, contre le catalogue
  `biology_analytes` (migrations niveau 1 et oméga-3 AA/EPA) ».

## Remarques hors resolver (catalogue — aucune action dans ce lot)

- **R1** — L'iodurie sur échantillon s'exprime en µg/L ; le catalogue tient
  µg/24h. Une iodurie sur échantillon sera proposée puis refusée à la
  validation (`unite_divergente`).
- **R2** — Un compte rendu imprime « Cortisol salivaire 8h » et « Cortisol
  salivaire 20h » sur deux lignes ; aucune ne correspond au libellé
  catalogue (une seule mesure « 8h / 20h ») : `inconnu`, choix manuel.
