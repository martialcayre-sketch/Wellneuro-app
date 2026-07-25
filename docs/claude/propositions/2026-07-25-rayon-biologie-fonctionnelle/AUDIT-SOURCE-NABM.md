# CB-00 — Audit de la source NABM (licence, format, volumétrie)

Complément au [cadrage du rayon biologie fonctionnelle](README.md), §8 lot CB-00.
Audit mené le 2026-07-25 sur la version **NABM V105 du 4 juin 2026**.

## Verdict

**La source est exploitable. CB-02a n'est pas décalé.**

La nomenclature est publiée par l'Agence du numérique en santé sur son Serveur
Multi-Terminologies (SMT), sous **Licence Ouverte v2**, et sa table complète —
codes, libellés et propriétés de facturation — se récupère en **six appels
d'API anonymes**, sans compte ni convention.

Mais l'audit renverse deux hypothèses du cadrage, et c'est là son intérêt réel :

1. **La NABM ne peut pas être l'ossature du catalogue.** Le cœur de la biologie
   fonctionnelle en est absent — sélénium, homocystéine, vitamine C, coenzyme
   Q10, acides gras érythrocytaires, glutathion peroxydase, SOD, mélatonine,
   zonuline. Elle est l'**axe de remboursement**, pas l'axe du catalogue.
2. **Le lien analyte ↔ acte NABM est plusieurs-à-plusieurs**, pas un champ
   optionnel. La TSH se cote 1208 seule, 1211 avec la T4 libre, 1212 avec T4L et
   T3L. Le `nomenclatureNabm?` du §3 est trop étroit — correction à porter en
   CB-01 (voir §7 ci-dessous).

## 1. Source retenue : le SMT de l'ANS, pas le portail ameli

| Source | Accès | Licence affichée | Verdict |
| --- | --- | --- | --- |
| **SMT / ANS** — `smt.esante.gouv.fr/fhir` | API FHIR, anonyme, versionnée | **LOv2 Etalab** (champ `copyright`) | **retenue** |
| Portail SMT (téléchargement OWL) | compte requis, affiliation au CNR SNOMED CT | LOv2 | écartée — inutile, l'API suffit |
| `codage.ext.cnamts.fr` (TNB, via ameli) | consultation web, recherche par code/chapitre | **aucune mention** | écartée en import, gardée en **contrôle** |

Le portail ameli reste la référence réglementaire consultable (dates de JO,
texte des conditions de prise en charge), mais il n'affiche aucune condition de
réutilisation et n'expose pas d'export documenté. Importer depuis lui serait
reprendre une donnée sans licence quand la même donnée existe sous LOv2.

**Conséquence LOv2** : réutilisation libre, y compris commerciale, sous réserve
de **mentionner la source et la date de version**. À afficher dans l'UI du
catalogue, et à stocker : `version = "V105"` + `contenuSha256` du snapshot.

## 2. Volumétrie exacte — 1050 concepts ≠ 1050 actes

L'API annonce `count = 1050`. Ce nombre ne doit pas devenir le nombre de fiches
du catalogue : **62 concepts sur 1050 ne sont pas des actes**.

| Nature | Nombre | Forme du code | Exemple |
| --- | --- | --- | --- |
| Chapitre | 18 | 1–2 chiffres | `05` — Hématologie |
| Sous-chapitre | 33 | `CC-NN` | `06-04` |
| Nœud de règle | 11 | texte | `CONTINGENCE_3`, `REGLE_SPECIFIQUE` |
| **Acte facturable** | **988** | 4 chiffres, zéros de tête | `1213` — FERRITINE (DOSAGE) (SANG) |
| Total | 1050 | | |

Deux pièges d'implémentation qui en découlent :

- **Le filtre d'import est obligatoire.** Sans lui, le catalogue naîtrait avec 62
  fiches fantômes, dont des chapitres présentés comme des analyses.
- **Le code est une chaîne, jamais un entier.** `0014` ≠ `14`, et 45 codes ne
  sont pas purement numériques. Une colonne `integer` perdrait les zéros de tête
  et casserait le rapprochement.

## 3. Ce que la NABM porte

Les propriétés sont **peuplées**, contrairement à ce qu'un premier appel laisse
croire (voir le piège au §5). Relevé sur l'acte `1213` :

| Propriété | Type | Valeur (1213) | Usage côté CB |
| --- | --- | --- | --- |
| `coeffB` | string | `17` | cotation brute — **non convertie en euros**, voir §6 |
| `examenSanguin` | boolean | `true` | pré-remplit `typePrelevement`, mais booléen : ne distingue pas urine / selles / salive |
| `ententePrealable` | boolean | `false` | condition administrative |
| `indicationMedicale` | boolean | `true` | l'acte porte des indications restrictives — **le texte n'est pas dans la donnée** |
| `nombreMaximumParFacturation` | integer | `1` | garde-fou de répétition |
| `initativeBiologistePossible` | boolean | `true` | le biologiste peut compléter sans prescription (orthographe de la source, à reprendre telle quelle) |
| `rmo` | boolean | `true` | référence médicale opposable |
| `remboursementTotal` | boolean | `false` | pas de prise en charge à 100 % |
| `acteReserve` | boolean | `false` | acte réservé |
| `codeIncompatible`, `regleApplicable` | code | — | renvoient aux nœuds `CONTINGENCE_*` / `REGLE_SPECIFIQUE` |
| `parent`, `child` | code | `parent = 12` | hiérarchie chapitre / sous-chapitre |
| `inactive` | boolean | `false` | **filtre d'import** |

## 4. Ce que la NABM ne porte pas

Rien de ce qui fait une fiche d'analyse exploitable en consultation :

- **pas de nom d'analyte propre** — seulement un libellé de facturation ;
- **pas d'unité de mesure**, pas de valeurs de référence ;
- **pas de conditions préanalytiques** (jeûne, moment du prélèvement) ;
- **pas de correspondance LOINC** — une recherche par nom sur les 358 systèmes
  du SMT ne rend ni LOINC ni UCUM ;
- **pas le texte des indications** : `indicationMedicale` est un booléen, la
  condition elle-même reste sur ameli.

Cela ne remet pas en cause le modèle du §3 : c'est exactement ce que
`niveauCompletude` et `donneesManquantes[]` servent à rendre visible. L'import
remplit la moitié administrative d'une fiche et **laisse l'autre moitié vide** —
la vérification praticien (`importee → verifiee`) et le corpus la comblent.

Le vocabulaire fermé d'unités reste donc à définir en interne, comme prévu.

## 5. Le libellé NABM n'est pas un nom d'analyte

Les libellés sont des intitulés de facturation, en capitales, abrégés, souvent
préfixés par le milieu ou la pathologie :

```text
1208  T.S.H.(SANG)
1211  T.S.H. + T4 LIBRE (SANG)
0552  SANG : GLUCOSE (GLYCEMIE)
1487  THYROIDE : AUTOAC ANTITHYROPEROXYDASE
0014  CYTOPATH. LIQ. EPANCHEMENT, LAVAGE ALVEOLAIRE OU VESICAL, LCR
```

Le filtre du serveur ne rattrape pas l'écart : il travaille par préfixe de mot et
tolère l'à-peu-près. `THYREOSTIMULINE` rend **0** résultat ; `PEROXYDASE` rend
**0** alors que l'acte 1487 existe ; à l'inverse `SELEN` rend 19 résultats qui
sont tous des actes sur les **selles**, et `MICROBIOTE` en rend 27 en accrochant
le chapitre « Microbiologie ».

**Le rapprochement analyte ↔ code NABM ne s'automatise donc pas par le libellé.**
C'est une mise en correspondance revue, pas un import — et elle produit des faux
négatifs silencieux si on la confie à une recherche textuelle.

## 6. Le tarif : ne rien stocker en euros

`coeffB` est disponible, mais la valeur de la lettre-clé B en euros **n'est pas
dans la donnée** : elle est fixée par arrêté publié au JO, et les sources
secondaires consultées divergent (0,27 € contre 0,25 €, avec des valeurs
distinctes outre-mer).

**Recommandation : stocker `coeffB` brut, n'afficher aucun montant en V1.** Le
cadrage différait déjà le coût indicatif (§3) ; l'audit confirme que c'est le
bon choix. Un prix affiché est lu comme un engagement, et il se périme sans
prévenir.

## 7. Correction à porter au modèle du §3

Le lien analyte ↔ acte est **plusieurs-à-plusieurs dans les deux sens** :

- un analyte a plusieurs cotations possibles selon le groupage — TSH : `1208`
  seule, `1211` avec T4L, `1212` avec T4L et T3L ;
- un acte couvre plusieurs analytes — `1211` en couvre deux, `1387` couvre
  folates sériques **ou** érythrocytaires.

Le champ `nomenclatureNabm?` de `BiologyAnalyte` ne peut donc pas rester un code
unique. Proposition pour CB-01 : une table de correspondance
`BiologyAnalyteNabm` (`analyteCode`, `codeActe`, `nature : isole | groupe`,
`verifiePar/verifieLe`), et `remboursable` dérivé de l'existence d'au moins une
correspondance vérifiée — jamais d'un libellé, jamais d'une inférence.

Deuxième ajustement, mineur : la valeur `nabm_ameli` de `sourceProvenance`
devient **`nabm_smt_ans`**, la source retenue étant le SMT et non ameli.

## 8. Couverture réelle de la biologie fonctionnelle

C'est le chiffre qui commande le dimensionnement de CB-02a.

**Présents dans la NABM** — ferritine `1213`, 25-OH-vitamine D `1139`, vitamine
B12 `1374`, folates `1387`, vitamines A `7301` / B6 `7305` / E `7302`, magnésium
`0584`, zinc plasmatique `2003`, cuivre `0547` (et urinaire `2008`), insuline
`7422`, cortisol sanguin `0462` et urinaire `0476`, TSH `1208`, T4 libre `1207`,
anti-TPO `1487`, IgE totales `1200`, sérotonine `0364`, glycémie `0552`,
cholestérol `0580`, triglycérides `0590`, CRP `1804`, ALAT `0516`, GGT `0519`,
calprotectine fécale `1684`.

**Absents** — sélénium, homocystéine, vitamine C, coenzyme Q10, acides gras
érythrocytaires (ω3/ω6), glutathion peroxydase, superoxyde dismutase,
mélatonine, zonuline et perméabilité intestinale, iodurie, neurotransmetteurs
urinaires, tests d'intolérance alimentaire.

Le remboursable couvre le socle ; l'approfondissement et le spécialisé du §5 —
c'est-à-dire ce qui distingue la biologie fonctionnelle d'un bilan de routine —
sont **hors nomenclature**.

Trois conséquences, toutes conformes aux décisions déjà actées :

- le catalogue n'est pas « la NABM plus quelques extras » : `nomenclatureNabm`
  reste **optionnel par nature**, et une part importante des fiches n'en aura
  jamais ;
- la **décision F** (document patient systématique pour le non-remboursé) n'est
  pas un cas marginal, c'est le régime dominant du rayon ;
- le corpus, pas la nomenclature, est la source de la partie clinique — ce qui
  confirme la **décision G** : sans le notebook, le catalogue reste administratif.

## 9. Le piège d'implémentation à ne pas retrouver seul

Un `$lookup` sans paramètre ne rend que `parent` et `inactive`. Il faut
**nommer chaque propriété** attendue. Sans cela, on conclut à tort que la NABM du
SMT est vide de données de facturation et qu'il faut un compte pour les obtenir.

Le `$expand` paginé accepte lui aussi `property=`, qu'il rend via l'extension
FHIR R5 `expansion.contains.property`. C'est ce qui permet de tout récupérer en
six appels au lieu de 988 `$lookup`.

## 10. Recette d'import pour CB-02a

- pagination `count=200`, `offset` de 0 à 1000 — **6 appels**, anonymes ;
- `property=` pour chacune des propriétés du §3 ci-dessus ;
- filtrer : ne garder que `inactive = false` et un code de 4 caractères →
  **988 fiches** en statut `importee` ;
- conserver le snapshot brut, sa version (`V105`) et son `contenuSha256` ;
- ne dériver `remboursable` que de la correspondance vérifiée (§7) ;
- rejouer à chaque version : les versions se succèdent à un rythme mensuel à
  bimestriel (V101 à V105 entre janvier et juin 2026), et un acte peut passer
  `inactive`.

Vérification reproductible :

```bash
# volumétrie et libellés
curl -s -G 'https://smt.esante.gouv.fr/fhir/ValueSet/$expand' \
  --data-urlencode 'url=https://smt.esante.gouv.fr/terminologie-nabm?vs' \
  --data-urlencode 'count=200' --data-urlencode 'offset=0'

# propriétés de facturation d'un acte
curl -s -G 'https://smt.esante.gouv.fr/fhir/CodeSystem/$lookup' \
  --data-urlencode 'system=https://smt.esante.gouv.fr/terminologie-nabm' \
  --data-urlencode 'code=1213' --data-urlencode 'property=coeffB'
```

## 11. Ce que l'audit ne tranche pas

- **Unités, préanalytique, valeurs de référence laboratoire** : aucune source
  publique française identifiée. Les manuels de prélèvement des laboratoires
  sont sous droit d'auteur — ils ne s'importent pas. Ces champs viennent du
  corpus (claims) ou de la saisie praticien.
- **Texte des conditions de prise en charge** : hors import automatique, à
  consulter sur ameli au cas par cas lors de la vérification d'une fiche.
- **Le catalogue hors nomenclature** (§8) n'a pas de source de référence : il se
  construira par le corpus et la revue praticien, sans filet réglementaire.
  C'est le vrai travail de CB-02b, et il est plus lourd que l'import NABM.
