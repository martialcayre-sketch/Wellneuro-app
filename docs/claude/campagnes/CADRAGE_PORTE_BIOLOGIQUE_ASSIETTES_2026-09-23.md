# Cadrage — la porte biologique d'une indication d'assiette (chantier 6)

> Posé le 2026-09-23. Chantier ouvert par [[D-236]] §4 (« ce qui manque est un
> mécanisme, pas un claim »), nommé « chantier 6 » depuis [[D-237]]. Ce document
> est le LOT-00 : il ne livre aucun code.

## 1. Deux arbitrages rendus le 2026-09-23

**A1 — DOCUMENTAIRE D'ABORD, AUTOMATIQUE ENSUITE.** Le premier étage **pose côte à
côte** ce que les sources disent d'un marqueur et ce que le dossier en mesure ; il
ne les compare pas. La porte automatique (« résultat au-delà de la borne ⇒
assiette indiquée ») ne se décide qu'**après** l'observation de l'usage du premier
étage, par une décision propre.

Pourquoi c'est l'ordre, et pas une prudence : [[D-157]] a tranché que placer une
plage sourcée à côté d'une mesure est **documentaire**, et que « calculer un
écart, écrire *hors plage* » est de l'**interprétation**, geste du praticien.
[[D-122]] ajoute que faire parler un résultat réel au moteur est une **règle
clinique neuve**, avec sa décision et ses claims. `DC-46` : une valeur de
laboratoire ne se lit jamais isolée (unités, âge, sexe, inflammation,
traitements) — c'est le praticien qui porte ce contexte, pas la machine. Le premier
étage ne franchit **aucune** de ces trois frontières.

**A2 — LE PÉRIMÈTRE INCLUT L'OMÉGA 3.** L'index oméga 3 et le rapport AA/EPA
n'ont **aucun code au catalogue** (`BiologyAnalyte`) : le chantier emporte donc
une migration, **seule dans sa PR** ([[D-087]]).

## 2. Ce que le dépôt porte, constaté le 2026-09-23

- `OrientationDeclencheur` (`orientationRulesV1.ts:72-197`) n'a **aucune variante
  biologique** ; rien dans le code ne compare un résultat à une borne (seuls les
  scores d'instrument et l'âge le sont). `resultats.ts` refuse délibérément toute
  borne à la saisie.
- Résultats : `resultats_biologiques`, append-only (`supersedesResultatId`), unité
  recopiée du catalogue. Drapeau `WN_CB_RESULTS_ENABLED` **posé en production
  le 2026-09-09**.
- Catalogue : `BIO_CRP_US` (mg/L), `BIO_HOMOCYSTEINE` (µmol/L),
  `BIO_FOLATES_ERYTHROCYTAIRES` (nmol/L), `BIO_RATIO_KYN_TRP`,
  `BIO_AG_ERYTHROCYTAIRES` (%). **Absents : index oméga 3, rapport AA/EPA.** Les
  ratios existants sont saisis comme des analytes (`BIO_RATIO_ZINC_CUIVRE`, unité
  `ratio`) — c'est le patron à suivre, `resultats_biologiques` ne référençant que
  `analyte_code`.
- `biology_functional_ranges` : deux lignes seulement (ferritine, vitamine D).
- **La table signée des indications ne se touche pas** : son empreinte couvre
  toutes ses lignes, et la modifier éteindrait les **sept assiettes servies** en
  production (`WN_ASSIETTES_INDIQUEES` posé le 2026-09-20) jusqu'à une nouvelle
  signature. D'où un module **séparé**, signé à part (§4).

## 3. Surface de relecture — ce que disent les claims (corpus, lu le 2026-09-23)

Textes lus en production (`rag_corpus_claims`, `active`, `statut = 'VALIDE'`),
**recopiés mot pour mot**. `P` = prescriptif. Aucune borne n'est reformulée : le
premier étage **cite** la phrase, il n'en extrait pas de nombre.

| Assiette | Marqueur | Claim | P | Texte |
|---|---|---|---|---|
| Sérotoninergique | CRP-us, KYN/TRP | `WN-CL-0290-007` | P | L'assiette sérotoninergique est indiquée en présence de marqueurs biologiques tels qu'un ratio kynurénine/tryptophane élevé, une CRP ultrasensible supérieure à 2 milligrammes/litre, ou un taux de 5-HIA urinaire très faible. |
| Anti-inflammatoire | CRP-us, KYN/TRP, AA/EPA | `WN-CL-0293-013` | | Les marqueurs biologiques en faveur d'une assiette anti-inflammatoire sont une CRP ultrasensible élevée > 2 mg/litre, un ratio Kynurénine/tryptophane plasmatique élevé, un rapport AA/EPA trop élevé > 1,2, et un déséquilibre des adipokines (leptine valeurs hautes/adiponectine valeurs basses). |
| Anti-inflammatoire | CRP-us | `WN-CL-0340-007` | P | Une CRP ultrasensible supérieure à 1 mg/litre est associée à une inflammation de bas grade, et au-dessus de 3 mg ou plus elle signe très certainement une neuro-inflammation associée dans le cadre d'une dépression, ce qui impose une assiette anti-inflammatoire et une optimisation des oméga 3 et des polyphénols. |
| Antioxydante | CRP-us | `WN-CL-0292-005` | | Ces marqueurs biologiques de stress oxydant sont fréquemment associés à une CRP ultrasensible élevée supérieure à 2 mg/litre. |
| Oméga 3 | index oméga 3, AA/EPA | `WN-CL-0294-004` | | Un déficit en acides gras oméga 3 peut être objectivé par le statut des acides gras érythrocytaires (LNA, EPA, DHA), un index oméga 3 inférieur à 8%, ou un ratio AA/EPA supérieur à 1,2. |
| Oméga 3 | CRP-us | `WN-CL-0294-005` | | Une CRP ultrasensible élevée supérieure à 2 mg/litre est un marqueur biologique pertinent à considérer. |
| Dopaminergique | CRP-us (+ HOMA) | `WN-CL-0289-005` | | Les marqueurs biologiques évocateurs d'une insuffisance dopaminergique sont un taux de HVA ou de MHPG bas dans la biologie des neurotransmetteurs et leurs catabolites urinaires, ainsi qu'un indice HOMA élevé et une CRP ultrasensible élevée supérieure à 2 milligrammes/litre. |
| Méthylation | homocystéine | `WN-CL-0043-014` | | Une méthylation insuffisante correspond à une homocystéine supérieure à 8 à 10 μmol/l. |
| Méthylation | homocystéine | `WN-CL-0282-007` | P | L'homocystéine est un biomarqueur utile pour orienter un conseil alimentaire de méthylation et une supplémentation en B9, B12 ou SAMe. |
| Méthylation | folates érythrocytaires | `WN-CL-0125-035`, `WN-CL-0340-004` | | Un taux abaissé de folates érythrocytaires est associé à des troubles de la méthylation […] *(aucune borne chiffrée)* |
| Détoxication | — | `WN-CL-0287-010` | | Il n'existe pas de marqueurs biologiques spécifiques pour l'assiette de détoxication […] |

**Absence documentée, à respecter comme telle** : la détoxication a un claim qui
dit qu'il n'existe **pas** de marqueur spécifique. **Épargne digestive et
psychobiotique** : aucun claim trouvé **parmi ceux qui citent la CRP-us,
l'homocystéine, l'oméga 3 ou le rapport AA/EPA** — la recherche s'est bornée à ces
quatre marqueurs. Elles se fondent peut-être sur d'autres (IgA sécrétoires,
métabolome bactérien…) : à rechercher avant de les dire sans porte.

**Trois discordances entre sources, à MONTRER et non à trancher (`DC-30`)** :

1. **CRP-us** : « > 2 mg/l » (0290-007, 0292-005, 0293-013, 0294-005, 0289-005)
   contre « > 1 bas grade, ≥ 3 neuro-inflammation » (0340-007, **prescriptif**).
2. **Homocystéine** : « normale < 5 à 8 » (`WN-CL-0043-013`), « méthylation
   insuffisante > 8 à 10 » (0043-014), « risque vasculaire > 15 »
   (`WN-CL-0043-015`) — trois seuils pour trois questions différentes.
3. **Index oméga 3** : « < 8 % associé à la dépression… » (`WN-CL-0045-010`) et
   « > 8 % valeurs santé optimales » (`WN-CL-0045-009`, **prescriptif** — une
   « valeur optimale », à étiqueter comme telle, `DC-47`).

**Écartés du périmètre, et pourquoi** : les claims de **cas cliniques**
(« CRP ultrasensible à 3,2… », un homme de 65 ans…) décrivent un patient, pas une
borne ; deux d'entre eux portent d'ailleurs une unité fausse (« ng/litre »,
« ng/ml » pour une CRP) — à signaler à la curation, pas à citer.

## 4. Ce que le premier étage montre, et ce qu'il s'interdit

Sur la carte « Assiettes indiquées », pour chaque assiette qui a au moins une
ligne signée au module biologique :

- les claims de §3 retenus par le praticien, **cités entiers**, avec leur
  identifiant ;
- pour chaque marqueur cité, le **dernier résultat du dossier** (valeur, unité,
  date de prélèvement, provenance) — ou « aucun résultat au dossier » ;
- rien d'autre. **Interdits** : comparer, colorer, écrire « élevé », « hors
  plage », « normal », calculer un écart, trier les assiettes par le résultat,
  dire « indiquée » d'une assiette sur la foi d'un résultat. Le lexique interdit
  de `EstimeMesurePanel.test.tsx` s'applique tel quel.

**Où cela vit** : un module **neuf et signé à part**,
`lib/clinical/portesBiologiquesAssiettesV1.ts` — lignes `{ plateCode,
analyteCode, claims }`, sans aucun nombre, avec son propre verrou et sa propre
empreinte littérale. La table des indications reste intacte, les sept assiettes
servies aussi.

## 5. Les lots

| Lot | Contenu | Porte |
|---|---|---|
| LOT-00 | Ce cadrage + la décision qui le porte | Revue |
| LOT-01 | **Migration seule** : `BIO_INDEX_OMEGA3` (`%`) et `BIO_RATIO_AA_EPA` (`ratio`), sur le patron des ratios existants | `release-db` approuvée, constat par conteneur |
| LOT-02 | Module signé `portesBiologiquesAssiettesV1` : lignes, verrou, banc de fraîcheur des claims épinglés (TS **et** contrat SQL), surface de relecture | **Ta signature**, claim par claim |
| LOT-03 | Lecture du dernier résultat par analyte (append-only, tête de chaîne), route et section de carte ; lexique interdit ; E2E | Relecture à l'écran |
| LOT-04 | Bilan d'usage au conteneur, par identifiant (`D-125`) — puis, seulement là, la décision sur la porte automatique | Toi |

## 6. Sélection du responsable, rendue le 2026-09-23

Ce que le module du LOT-02 portera — et qu'il signera, claim par claim :

| Assiette | Marqueurs | Claims retenus |
|---|---|---|
| Sérotoninergique | CRP-us, KYN/TRP | `WN-CL-0290-007` |
| Anti-inflammatoire | CRP-us, KYN/TRP, AA/EPA | `WN-CL-0293-013` |
| Oméga 3 | index oméga 3, AA/EPA, CRP-us | `WN-CL-0294-004`, `WN-CL-0294-005` |
| Dopaminergique | CRP-us, HOMA | `WN-CL-0289-005` |
| Méthylation | homocystéine | `WN-CL-0043-013`, `WN-CL-0043-014`, `WN-CL-0043-015` |

- **Écartés** : `WN-CL-0340-007` (double borne 1/3, prescriptif) et
  `WN-CL-0292-005` (une association, pas une indication). Conséquences : la
  discordance CRP-us de §3 **ne s'affichera pas** (les claims retenus disent tous
  « > 2 ») ; l'assiette **antioxydante** n'a aucun marqueur au premier étage.
- **Homocystéine** : les trois seuils, pour trois questions distinctes.
- **KYN/TRP** : affiché **sans nombre**, à côté de la phrase « ratio élevé » telle
  que le claim la porte.
- Folates érythrocytaires (`WN-CL-0125-035`, `-0340-004`) et `WN-CL-0282-007` :
  non soumis à cette sélection ; hors premier étage faute de borne ou de marqueur
  nommé comme porte.

**Reste ouvert** : épargne digestive et psychobiotique (autres marqueurs, non
recherchés) ; signalement à la curation des deux claims de cas cliniques à unité
fausse.

## 7. Contradictions de documentation relevées, sans lien avec le lot

- `FILE_ATTENTE.md` (« rien n'est encore à l'écran… éteint ») et la surface de
  relecture des assiettes disent `WN_ASSIETTES_INDIQUEES` éteint ; il est posé
  depuis le 2026-09-20 (`FEATURE_FLAGS.md`).
- `REGISTRE_FRONTIERES.md` et `DC-46` disent `WN_CB_RESULTS_ENABLED` éteint ; il
  est posé depuis le 2026-09-09.
- `D-236` compte « sept des douze » assiettes à claim biologique, méthylation
  à part. Sur les quatre marqueurs de ce chantier, la relecture en retrouve
  **six** avec un claim (sérotoninergique, anti-inflammatoire, antioxydante,
  oméga 3, dopaminergique, méthylation) ; l'épargne digestive et la
  psychobiotique relèvent d'autres marqueurs, non recherchés ici.
