# Banc de certification SOURCE ↔ SERVI — bilan du 2026-07-25

> ## ⚠ Corrigé le 2026-07-26 — les chiffres ci-dessous surestiment les écarts
>
> Trois défauts du comparateur ont été trouvés **en vérifiant ses accusations une
> à une**, et corrigés (tests de non-régression : `comparaison.test.mjs`, six cas
> qui échouent sur la version d'origine) :
>
> 1. les **sous-échelles** étaient comparées aux `sections` — le découpage
>    d'écran — au lieu des dimensions calculées par le moteur. Le DASS-21 tient
>    en une section et calcule trois sous-échelles ; le PSQI en compte trois et
>    produit sept composantes ;
> 2. les **inversions** n'étaient cherchées que dans le *type* de scoring, alors
>    que `subScores[].reversed` en porte. L'UPPS applique bien ses 25 inversions
>    (45 items cotés 1 → 45/48 en Urgence) ;
> 3. les **bornes** étaient balayées item par item, ce qui est faux dès qu'une
>    composante décroît quand l'item croît. Le PSQI atteint 21/21 et le QIF
>    99,9/100 avec un jeu de réponses cohérent.
>
> **Après rejeu des 59 instruments** (sans nouvel appel de modèle, via
> `certify.mjs --recomparer`) : **9 instruments** à divergence critique et non
> 11 ; **13 critiques** et non 16 ; **3 `sous_echelles`** et non 7. L'UPPS et le
> QIF sortent entièrement de la liste. Deux des 13 restantes sont encore des
> artefacts de comptage, décrits dans le dossier d'arbitrage.
>
> Les chiffres d'origine sont conservés ci-dessous tels qu'ils ont été publiés.
> Le tableau à jour et les décisions attendues sont dans
> **`ARBITRAGES-2026-07-26.md`**.

Passé sur **59 instruments** du catalogue, contre les PDF sources rapatriés du
dossier Drive du cabinet. Chaque instrument est lu **deux fois de façon
indépendante** (Claude Sonnet 5 et GPT-5.4), aucune des deux n'ayant le catalogue
sous les yeux ; une divergence vue par les deux est « confirmée ».

**Le banc constate. Il ne corrige rien et ne certifie rien** : chaque écart appelle
un arbitrage du praticien, documenté au CHANGELOG (lot 4 de la campagne).

Les rapports détaillés restent **hors dépôt** (`~/.wellneuro/corpus/certify/`) :
ils citent le verbatim des instruments, dont les droits ne sont pas tous tranchés.

## En un coup d'œil

| | |
|---|---|
| Instruments passés au banc | 59 |
| Sans aucune divergence | 12 |
| Avec au moins une divergence **critique confirmée** | **11** |
| Divergences critiques confirmées, au total | 16 |
| Croisement non abouti (une seule lecture) | 2 — Q_ALI_03, Q_STR_06 |

## Instruments à arbitrer en priorité

« Critiques » au sens du comparateur : échelle de cotation, nombre d'items,
inversion absente, barème sans source, bornes de score, total numérique absent.

| Instrument | Nom servi | Critiques | Codes critiques confirmés |
|---|---|---|---|
| `Q_SOM_07` | Multidimensional Fatigue Inventory (MFI-20) | **3** | `bareme_sans_source`, `echelle_de_cotation`, `inversion_absente` |
| `Q_SOM_01` | Pittsburgh Sleep Quality Index (PSQI) | **2** | `bornes_score`, `nombre_items` |
| `Q_ALI_01` | Questionnaire alimentaire SIIN | **2** | `echelle_de_cotation`, `nombre_items` |
| `Q_FIB_03` | ELFE — Évaluation des points douloureux fibromyalgiques (professionnel) | **2** | `echelle_de_cotation`, `nombre_items` |
| `Q_NEU_12` | IDTAS-AE — Inventaire Diagnostique des Troubles Affectifs Saisonniers (auto-évaluation) | **1** | `nombre_items` |
| `Q_GEO_01` | Grille de Tinetti — équilibre et marche (POMA) | **1** | `nombre_items` |
| `Q_GEO_06` | Test des 5 mots de Dubois | **1** | `nombre_items` |
| `Q_NEU_05` | UPPS Impulsive Behavior Scale | **1** | `inversion_absente` |
| `Q_FIB_02` | Questionnaire d'impact de la fibromyalgie (QIF, adaptation du FIQ) | **1** | `bornes_score` |
| `Q_INF_05` | Auto-évaluation de l'anxiété (référentiel SIIN) | **1** | `total_numerique_absent` |
| `Q_URO_01` | International Prostate Symptom Score (IPSS) | **1** | `bornes_score` |

## Fréquence des codes (divergences confirmées)

| Code | Occurrences | Gravité |
|---|---|---|
| `libelle_item` | 274 | mineur |
| `protocole_dans_interpretation` | 11 | majeur |
| `sous_echelles` | 7 | majeur |
| `nombre_items` | 6 | critique |
| `echelle_de_cotation` | 3 | critique |
| `bornes_score` | 3 | critique |
| `inversion_absente` | 2 | critique |
| `total_numerique_absent` | 1 | critique |
| `seuil_non_represente` | 1 | majeur |
| `bareme_sans_source` | 1 | critique |

## Instruments propres

Aucune divergence, ni confirmée ni à confirmer :

`Q_CAN_02`, `Q_INF_04`, `Q_MOD_02`, `Q_NEU_07`, `Q_NEU_09`, `Q_NEU_10`, `Q_SOM_06`, `Q_STR_02`, `Q_STR_08`, `Q_TAB_01`, `Q_TAB_02`, `Q_URO_02`.

## Ce que ce bilan ne dit pas

- **Il ne classe pas par gravité clinique.** « Critique » qualifie l'écart entre
  la source et le servi, pas le risque patient. Un `nombre_items` sur le test des
  5 mots et un `inversion_absente` sur le MFI-20 portent le même label et n'ont
  pas les mêmes conséquences.
- **Il ne tranche aucune hiérarchie.** Quand la source du cabinet et la
  publication d'origine divergent, laquelle fait foi ? C'est la question (c) de
  la campagne, toujours ouverte.
- **Deux instruments n'ont pas été croisés** — `Q_ALI_03` et `Q_STR_06`
  (Karasek) : une seule des deux lectures a abouti. Leurs écarts sont donc tous
  « à confirmer », y compris les cinq items non inversés du Karasek. À rejouer.
- **Les 274 `libelle_item`** sont des écarts de formulation entre le PDF et le
  catalogue. Le volume est attendu et ne se lit pas comme 274 défauts : il
  faudra un tri par ampleur avant d'en faire quoi que ce soit.

## Suite

Lot 4 de la campagne : arbitrage instrument par instrument, daté et porté au
CHANGELOG, puis bloc `certification.corpus` additif dans `questions.ts`. Aucune
correction automatique — la doctrine tient : le banc constate, le praticien
tranche.
