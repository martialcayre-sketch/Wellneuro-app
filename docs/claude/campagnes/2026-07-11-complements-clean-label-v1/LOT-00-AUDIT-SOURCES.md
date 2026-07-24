---
id: "LOT-00-AUDIT-SOURCES"
campagne: "2026-07-11-complements-clean-label-v1"
titre: "Audit des sources open data, modèle de fiche produit, contrat de données"
statut: "livré"
date: "2026-07-24"
---

# LOT-00 — Audit des sources open data et modèle de fiche produit

> Livrable du LOT-00 de la campagne C4 (« Compléments clean label »), exécuté le
> 2026-07-24 dans le cadre du lancement décidé par le praticien (catalogue
> DGCCRF/Compl'Alim complet importé en brouillons — décision 1 de la proposition
> `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/PROPOSITION_RAYON_COMPLEMENTS.md`).
>
> **Méthode** : les chiffres de volumétrie et de complétude ci-dessous ne sont
> pas repris de la documentation officielle — ils ont été **mesurés sur le CSV
> réel** téléchargé le 2026-07-24 (version du 2026-07-22, 141 388 lignes,
> 144 Mo). Ils sont à revérifier au moment du LOT-02a : le jeu est mis à jour
> quotidiennement.

## 1. Audit des sources

### 1.1 Source principale retenue — « Déclarations de compléments alimentaires » (Compl'Alim, data.gouv.fr)

| Attribut | Constat |
|---|---|
| **Jeu de données** | [Déclarations de compléments alimentaires](https://www.data.gouv.fr/datasets/declarations-de-complements-alimentaires) |
| **Producteur** | Ministère de l'Agriculture (DGAL), plateforme Compl'Alim opérée par beta.gouv ([betagouv/complements-alimentaires](https://github.com/betagouv/complements-alimentaires)). Reprend l'historique DGCCRF/Téléicare (téléprocédure décommissionnée le 16 mai 2025, historique transféré). |
| **Fichier** | CSV unique, séparateur `;`, UTF-8, **144 Mo réels** (la métadonnée data.gouv.fr annonce 45 Mo — obsolète). URL directe : `https://cellar-c2.services.clever-cloud.com/compl-alim-prod/media/declarations.csv` |
| **Format des champs composés** | **Tableaux JSON sérialisés dans les cellules CSV** (plantes, nutriments, substances, micro-organismes, additifs, ingrédients inactifs, populations cibles, facteurs de risques). 1 cellule JSON invalide détectée sur 141 388 lignes (champ `micro_organismes`) : parsing à tolérance de panne requis. |
| **Volumétrie** | **141 388 déclarations** : 129 009 `Autorisée`, 12 379 `Retiré du marché`. 101 497 issues de Téléicare (71,8 %), 39 891 natives Compl'Alim. Couverture temporelle : avril 2016 → aujourd'hui. |
| **Licence** | **Licence Ouverte 2.0 (Etalab, `lov2`)** — réutilisation libre y compris commerciale, **mention de la source et de la date de mise à jour obligatoire**. Cohérent avec l'exigence C4A « provenance et fraîcheur obligatoires par produit ». (Ce n'est PAS de l'ODbL : pas de clause share-alike.) |
| **Fraîcheur** | Mise à jour **quotidienne** (export programmé de la plateforme, cf. README du dépôt beta.gouv). Dernière modification constatée : 2026-07-22 (fichier), 2026-07-24 (métadonnées). |
| **Schéma documenté** | [schema_declarations.json](https://github.com/betagouv/complements-alimentaires/blob/main/data/schemas/schema_declarations.json) (29 champs) + [CHANGELOG](https://github.com/betagouv/complements-alimentaires/blob/staging/data/schemas/CHANGELOG_declarations.md). Le schéma **évolue encore** (10 champs ajoutés entre janvier et juin 2025, restructuration des identifiants en mai-juin 2025) : l'import doit valider les colonnes à chaque exécution. |
| **API** | **Aucune API REST publique documentée.** Le CSV quotidien est le seul canal machine. La veille de fraîcheur (outil n°6) se fera par **diff de snapshots quotidiens**, pas par appel API — ce qui satisfait d'office la décision n°11 (pas de synchronisation live). |

#### Les 29 champs, et leur qualité mesurée

Taux de « vide » = cellule vide ou tableau JSON `[]`, mesuré sur les
141 388 lignes du fichier du 2026-07-22.

| Champ | Contenu | Vide | Note |
|---|---|---|---|
| `id` | Identifiant Compl'Alim | 0 % | Clé primaire source |
| `teleicare_id`, `numero_declaration_teleicare` | Identifiants historiques | 28,2 % | Vides pour les déclarations natives Compl'Alim |
| `article_procedure` | Article 15 / 16 / 18 | 0 % | 128 329 Art. 15, 13 044 Art. 16, marginal ensuite |
| `decision` | `Autorisée` / `Retiré du marché` | 0 % | Les produits en attente ou refusés **ne figurent pas** dans le jeu |
| `date_decision` | Date de la décision | 8,8 % | |
| `date_retrait` | Date de retrait du marché | 91,5 % | Renseignée sur 12 044 lignes — cohérent avec les 12 379 retraits |
| `nom_commercial` | Nom du produit | 0 % | |
| `marque` / `gamme` | Marque, gamme | 36,4 % / 71,8 % | Lacune notable pour l'affichage catalogue |
| `responsable_mise_sur_marche` (+ adresse, siret, TVA) | Metteur sur le marché | 0 % (siret 31,4 %, TVA 68,6 %) | L'adresse = code postal + pays seulement |
| `forme_galenique` | Gélule, comprimé, poudre… | 0 % | Vocabulaire quasi contrôlé : Gélule (59 485), Compte-gouttes (17 228), Comprimé (13 504), Poudre (13 227)… |
| `dose_journaliere` | Dose journalière recommandée | 0 % | **Texte libre non normalisé** (« 2 gélules », « 13g », « 2 », « 2 gélules par jour »…) |
| `mode_emploi` | Recommandations d'emploi | 26,7 % | Texte libre |
| `mises_en_garde` | Avertissements d'étiquetage | 33,8 % | Texte libre — seule trace des allergènes |
| `objectif_effet` | Objectifs revendiqués (fabricant) | 40,4 % | Déclaratif commercial, **à ne jamais confondre avec une intention clinique** |
| `aromes` | Arômes | 87,5 % | |
| `facteurs_risques` | Populations déconseillées | 29,8 % | Liste fermée (femmes enceintes, enfants, hypertension…) — exploitable |
| `populations_cibles` | Populations visées | 62,7 % | Liste fermée Compl'Alim |
| `plantes` | Plantes actives | 31,0 % | **Structuré et dosé** : nom latin, partie, préparation, `quantité_par_djr`, unité. 97 447 lignes avec dose |
| `ingredients_inactifs` | Excipients | 44,3 % | **Chaînes simples** (« gélatine », « amidon de maïs ») — présents mais non typés, non dosés |
| `micro_organismes` | Souches (probiotiques) | 96,3 % | Structuré avec dose quand présent (5 101 lignes avec dose) |
| `additifs` | Additifs | 37,0 % | Codes E (`E101`, `E330`…) — exploitable pour la qualité de formulation |
| `nutriments` | Vitamines et minéraux | 62,1 % | **Forme d'apport seule, jamais de quantité** (« Acide L-ascorbique », « Bisglycinate de magnésium »…). 189 formes d'apport distinctes relevées |
| `autres_ingredients_actifs` | Autres actifs | 61,6 % | Chaînes simples |
| `substances` | Substances actives dosées | 93,5 % | **Natif Compl'Alim uniquement** : dosé sur 8 757 lignes, **vide sur 100 % de l'historique Téléicare** |

#### Ce que le jeu NE contient PAS (à dire sans fard)

Ces absences conditionnent opérationnellement le choix « catalogue complet » :

1. **Aucun dosage pour les vitamines et minéraux.** Le champ `nutriments` ne
   porte que la forme d'apport, jamais la quantité par DJR — et ce sur les
   141 388 lignes, natives comprises. Seuls plantes, micro-organismes et (sur
   les déclarations natives récentes) `substances` sont dosés. **Conséquence
   directe : la sentinelle de cumul (LOT-03) ne peut pas fonctionner depuis
   l'open data seul pour les nutriments** — les doses devront être saisies à la
   vérification praticien de chaque fiche, ou la sentinelle dégradera en
   « doublon d'ingrédient détecté, dose inconnue ».
2. **Pas d'allergènes structurés.** Seul le texte libre `mises_en_garde` peut en
   contenir. Le champ « allergènes » du modèle C4A sera donc `non renseigné à la
   source` par défaut.
3. **Pas de labels** (bio, vegan, certifications) ni d'attributs qualité tiers.
4. **Pas de code EAN / code-barres, pas d'image, pas de prix.** Le
   rapprochement avec Open Food Facts (différé) est le seul chemin vers l'EAN.
5. **Pas de version de formulation.** Une reformulation peut donner une nouvelle
   déclaration sans lien avec l'ancienne ; aucun champ ne chaîne les versions.
   La « version de formulation » du modèle C4A sera gérée côté WellNeuro par le
   diff quotidien (même `id`, contenu modifié → nouvelle version interne).
6. **Pas les produits en attente, refusés ou jamais déclarés.** Le jeu couvre le
   marché déclaré français — pas les produits achetés à l'étranger par les
   patients.
7. **Historique Téléicare plus pauvre** (71,8 % du jeu) : `substances` vide,
   `populations_cibles` et `objectif_effet` largement vides. La complétude d'une
   fiche dépend fortement de son origine — le **niveau de complétude** doit être
   calculé par fiche, pas présumé.

### 1.2 Sources complémentaires

| Source | Format / accès | Volumétrie | Licence | Usage pour C4 | Lacunes / limites |
|---|---|---|---|---|---|
| **Ciqual (ANSES)** | Table déjà **ingérée dans le projet** (55 744 lignes, référentiel de la Boussole alimentaire C5) | 3 185 aliments × ~60 constituants | Licence Ouverte (Etalab) | Précédent d'ingestion de référentiel officiel ; table de référence des nutriments (noms, unités) pour normaliser les formes d'apport | Couvre les **aliments**, pas les compléments ; aucune donnée produit commercial |
| **Nutrivigilance (ANSES)** | Avis et rapports **PDF** ([anses.fr](https://www.anses.fr/), déclaration via nutrivigilance-anses.fr) | ~500 signalements/an ; 8 695 signalements cumulés 2009→2023 ; ~20 alertes/an | Documents publics, **pas de flux open data structuré** | Alimente `SupplementSafetyAlert` et `SupplementSourceReference` par **curation manuelle praticien** (avis p-synephrine, levure de riz rouge, curcuma, vitamine D nourrissons…) | Aucun format machine : impossible à importer automatiquement — ce qui converge avec la décision n°11 (une alerte active ne s'écrit jamais depuis un flux externe) |
| **Open Food Facts** | API REST + dumps CSV/JSONL ; catégorie « Compléments alimentaires » ; initiative « Open Food Supplements Facts » (réutilise elle-même Compl'Alim) | Non vérifiée le 2026-07-24 (service indisponible, HTTP 503) | **ODbL — share-alike** : toute base dérivée redistribuée doit être republiée sous ODbL. À instruire avant tout mélange avec le catalogue C4A | **Différé acté** (frontières C4). Apporterait : EAN (scan code-barres), photos, ingrédients OCR | Crowdsourcé : complétude et exactitude hétérogènes ; la clause share-alike impose une analyse juridique avant intégration |
| **BelFrIt / listes plantes DGCCRF (arrêté « Plantes »)** | Textes réglementaires (Légifrance) | ~1 200 plantes autorisées | Droit public | Référence pour valider le vocabulaire plantes lors de la normalisation | Pas un jeu de données produit ; hors périmètre V1 |

### 1.3 Verdict de l'audit

**La source retenue est le jeu Compl'Alim (data.gouv.fr).** Elle est la seule
source officielle, exhaustive sur le marché déclaré français, sous licence
permissive (Licence Ouverte 2.0), rafraîchie quotidiennement, avec composition
structurée. Le choix praticien « catalogue complet » est **opérationnellement
tenable** : 141 388 fiches importables en brouillons, dont ~129 000 actives.

Ses trois faiblesses structurantes — **nutriments sans dosage, pas
d'allergènes structurés, complétude dépendante de l'origine Téléicare/native**
— ne remettent pas en cause l'import mais dictent le modèle : chaque fiche doit
porter un **niveau de complétude calculé** et des **incertitudes explicites**,
et la vérification praticienne reste le seul chemin vers une fiche activable
cliniquement (dimension « Données manquantes » de la présentation
multi-dimensions, décision figée C4).

## 2. Modèle de fiche produit cible (C4A)

Champs du cadrage C4A, annotés de leur couverture par la source. Statuts de
couverture : **S** = fourni par la source, **S~** = partiellement/parfois,
**C** = calculé par WellNeuro, **P** = saisie praticien (vérification),
**∅** = absent de la source (honnêtement affiché « non renseigné »).

| Champ C4A | Couverture | Alimentation |
|---|---|---|
| Nom commercial, marque, gamme | S / S~ (marque vide 36 %) | `nom_commercial`, `marque`, `gamme` |
| Metteur sur le marché | S | `responsable_mise_sur_marche` (+ siret si présent) |
| Forme galénique | S | `forme_galenique` (vocabulaire quasi contrôlé) |
| Dose journalière recommandée | S (texte libre) | `dose_journaliere` — conservée verbatim, jamais interprétée automatiquement |
| **Composition — actifs** | S~ | `plantes` (dosé), `micro_organismes` (dosé), `substances` (dosé, natif seulement), `nutriments` (forme d'apport **sans dose**), `autres_ingredients_actifs` (chaînes) |
| **Composition — excipients** | S~ (chaînes non typées) | `ingredients_inactifs`, `additifs` (codes E), `aromes` |
| Allergènes | ∅ / P | Rien de structuré à la source ; `mises_en_garde` verbatim en appui ; saisie à la vérification |
| Labels (bio, certifications) | ∅ / P | Absent de la source |
| Mises en garde, populations à risque | S~ | `mises_en_garde` (texte), `facteurs_risques` (liste fermée), `populations_cibles` |
| Objectif revendiqué (fabricant) | S~ | `objectif_effet` — étiqueté « revendication fabricant », jamais mappé automatiquement vers un `ClinicalIntentTag` |
| Sources officielles / provenance | C | Référence du jeu + `id` Compl'Alim + `numero_declaration_teleicare` + date du snapshot importé (obligation Licence Ouverte et exigence C4A) |
| Pays / marché | C | `FR` (constante du jeu) |
| Date de dernière vérification | C / P | Date du snapshot à l'import ; date de revue praticien ensuite |
| Version de formulation | C | Compteur interne incrémenté par le diff quotidien (même `id` source, contenu modifié) |
| Statut | C / P | `importée` (défaut à l'import) → `vérifiée` (revue praticien) → `inactive` (`decision = Retiré du marché`, `date_retrait`, ou désactivation praticien) |
| Niveau de complétude | C | Calcul déterministe : proportion de champs cœur renseignés (composition dosée, excipients, allergènes, mises en garde…) — jamais un score de qualité, une mesure de remplissage |
| Incertitudes | C / P | Générées à l'import (« dosages nutriments non fournis par la source », « allergènes non renseignés », « déclaration historique Téléicare : substances indisponibles »…) puis éditées à la revue |
| Réviseur | P | Praticien signataire de la vérification |

Deux garde-fous de modèle, hérités des décisions figées :

- **Aucun score global** n'est dérivé de ces champs ; le niveau de complétude
  mesure le remplissage, pas la qualité du produit.
- `objectif_effet` est une **revendication commerciale déclarative** : il peut
  servir de facette de recherche étiquetée comme telle, jamais d'entrée du
  moteur C4B ni de lien automatique vers une intention clinique.

## 3. Contrat de données — mapping source → entités

Entités cibles décrites au §4 de la proposition : `SupplementProduct` et
`SupplementProductComposition` (à créer au LOT-01, migration gatée), se
projetant sur `SupplementIngredient` / `SupplementIngredientForme` (schéma V1
existant, `web/prisma/schema.prisma:404-584`, **intact** — l'ingrédient reste le
pivot clinique).

### 3.1 `SupplementProduct` (nouvelle entité, LOT-01)

| Attribut cible | Origine | Règle de transformation |
|---|---|---|
| `sourceId` | `id` | Clé de rapprochement du diff quotidien (unique par déclaration source) |
| `sourceTeleicareId` / `numeroDeclarationTeleicare` | `teleicare_id`, `numero_declaration_teleicare` | Copie ; null pour les natives |
| `nomCommercial`, `marque`, `gamme` | `nom_commercial`, `marque`, `gamme` | Copie ; vide → null (jamais de valeur inventée) |
| `responsableMiseSurMarche` | `responsable_mise_sur_marche` | Copie |
| `formeGalenique` | `forme_galenique` | Copie ; vocabulaire à référencer (table ou enum souple) |
| `doseJournaliereTexte` | `dose_journaliere` | **Verbatim** — pas de parsing en V1 |
| `modeEmploi`, `misesEnGarde` | `mode_emploi`, `mises_en_garde` | Verbatim |
| `objectifEffetFabricant` | `objectif_effet` | Verbatim, étiqueté revendication |
| `facteursRisques`, `populationsCibles` | JSON | Tableaux de chaînes (listes fermées source) |
| `paysMarche` | — | Constante `FR` |
| `statutSource` | `decision`, `date_retrait` | `Autorisée` → importable ; `Retiré du marché` → fiche `inactive` d'office |
| `statut` | — | `importée` \| `vérifiée` \| `inactive` (machine à états, transitions praticien sauf inactivation par retrait source) |
| `versionFormulation` | — | Entier, incrémenté par le diff (contenu modifié à `sourceId` constant) ; historique conservé |
| `provenance` | — | `compl_alim_open_data` + date du snapshot + URL du jeu (obligation d'attribution Licence Ouverte 2.0) |
| `derniereVerification` | — | Date snapshot à l'import ; date de revue à la vérification |
| `niveauCompletude` | — | Calcul déterministe à l'import, recalculé à chaque diff et revue |
| `incertitudes` | — | Liste générée + éditable (cf. §2) |
| `reviseur`, `verifieLe` | — | Praticien, à la vérification |

### 3.2 `SupplementProductComposition` (nouvelle entité, LOT-01)

Une ligne par (produit × ingrédient), issue de l'éclatement des cinq champs
composition :

| Attribut cible | Origine | Règle |
|---|---|---|
| `productId` | — | FK `SupplementProduct` |
| `ingredientId` | `plantes[].nom`, `nutriments[]`, `substances[].nom`, `micro_organismes[].nom`, `autres_ingredients_actifs[]` | Résolution vers `SupplementIngredient` via la **table de correspondance gouvernée** (§3.3) ; sans correspondance → composant conservé en verbatim, non lié |
| `formeId` | `nutriments[]` (forme d'apport), `plantes[].preparation` | Résolution vers `SupplementIngredientForme` via la même table |
| `roleComposant` | champ d'origine | `actif_plante` \| `actif_nutriment` \| `actif_substance` \| `micro_organisme` \| `autre_actif` \| `excipient` \| `additif` \| `arome` |
| `doseParDjr`, `unite` | `quantité_par_djr`, `unite` | Copie quand la source la fournit ; **null sinon — jamais estimée** |
| `partiePlante`, `preparation` | `plantes[].partie`, `plantes[].preparation` | Copie (plantes) |
| `verbatimSource` | cellule JSON d'origine | Conservé pour audit et re-mapping |

Les excipients (`ingredients_inactifs`), additifs (`additifs`, codes E) et
arômes entrent comme lignes de composition à rôle dédié, sans dose — c'est ce
qui rend la dimension « Qualité de formulation » calculable (présence
d'additifs controversés, nature des excipients) sans prétendre à un dosage que
la source ne donne pas.

### 3.3 Pivot `SupplementIngredient` — la table de correspondance gouvernée

Le schéma V1 reste **intact** : règles, seuils et alertes demeurent au niveau
ingrédient. Le lien produit → ingrédient passe par une table de correspondance
`libellé source → (ingredientId, formeId)` :

- **~189 formes d'apport nutriments distinctes** relevées dans le jeu (« Acide
  L-ascorbique », « Bisglycinate de magnésium »…) : volume de normalisation
  borné et tenable à la main.
- Vocabulaire plantes en nom latin (Linné) : rapprochement quasi direct.
- La table est **de la donnée, pas du code** (même motif que
  `FunctionalCategory`), versionnée, remplie par proposition automatique +
  validation praticien. Un libellé non mappé laisse le composant en verbatim
  non lié : le produit s'affiche, mais aucun lien clinique ne s'active — le
  moteur C4B ne voit que ce qui est normalisé ET vérifié.
- Aucune création automatique de `SupplementIngredient` par l'import : créer un
  ingrédient pivot est un acte de gouvernance praticien (il porte règles et
  seuils cliniques).

### 3.4 Ce que l'import n'écrit jamais

Conformément à la décision n°11 du moteur d'intention
(`docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`) : `ClinicalRule`,
`IngredientFunctionalThreshold`, `SupplementSafetyAlert`,
`SupplementSourceReference` actives, `ClinicalIntentTag`. L'import ne touche
que `SupplementProduct` / `SupplementProductComposition` en statut `importée`
et les propositions de correspondance en attente.

## 4. Stratégie d'import de masse en brouillons (LOT-02a)

Flux acté par la proposition (§4), précisé par l'audit :

```text
declarations.csv (snapshot quotidien, ~144 Mo, 141 388 lignes)
        │  script hors runtime (façon tools/corpus/), jamais dans l'app Next
        ▼
Parsing tolérant (séparateur ';', JSON par cellule, cellules invalides
journalisées et écartées — 1 cas connu)
        │
        ▼
Staging brouillon : SupplementProduct statut `importée`
(+ compositions, verbatim conservé, complétude et incertitudes calculées)
        │  diff quotidien par `sourceId` : nouveau / modifié (→ version
        │  de formulation) / retiré (→ `inactive`)
        ▼
File de revue praticien (façon Atelier corpus) — filtrable,
priorisée à l'usage : on vérifie une fiche quand on s'apprête à s'en servir
        │  vérification / complétion (doses nutriments, allergènes, labels)
        ▼
Fiche `vérifiée` — seuls ses liens cliniques sont activables
```

Décisions opérationnelles issues de l'audit :

1. **Import par lots idempotent, rejouable, hors runtime.** Un script
   `tools/` (pas une route API), qui écrit en base via un chemin dédié.
   L'import initial (~141 000 fiches + compositions éclatées, de l'ordre de
   500 000 à 1 000 000 de lignes de composition) se fait par transactions par
   lots avec reprise sur incident.
2. **Jamais d'écriture en base active** : tout entre en `importée`. Aucune
   fiche `importée` n'alimente le moteur C4B ni aucun rendu patient. Le flag
   `WN_C4_ENABLED` (fail-closed, modèle `WN_C5_ENABLED`) gouverne l'exposition
   de la bibliothèque elle-même.
3. **La revue n'est pas une dette de 141 000 éléments.** La file de revue est
   un instrument de consultation : le praticien vérifie une fiche au moment où
   il envisage de s'en servir (recherche → fiche `importée` → vérification →
   activation). Le compteur de fiches vérifiées est un fait, pas un objectif.
4. **Veille de fraîcheur = diff de snapshots** (pas d'API à appeler) :
   retraits du marché (`date_retrait`) → inactivation automatique **de la
   fiche** (seul automatisme accepté, car il retire, n'active jamais) ;
   modifications → nouvelle version de formulation + retour en file de revue si
   la fiche était vérifiée ; nouveautés → brouillons.
5. **Attribution de licence** : chaque fiche affiche « Source : Compl'Alim
   (DGAL), données du JJ/MM/AAAA, Licence Ouverte 2.0 » — l'obligation légale
   coïncide avec la dimension « Fraîcheur / provenance » du cadrage.
6. **Snapshot archivé** : conserver le CSV brut de chaque import (stockage
   froid) pour audit et re-parsing — le schéma source évolue encore.

### Risques identifiés pour le LOT-02a

| Risque | Impact | Parade |
|---|---|---|
| Schéma source encore mouvant (10 champs ajoutés en 6 mois) | Import cassé silencieusement | Validation des colonnes contre `schema_declarations.json` à chaque run ; échec bruyant |
| Nutriments jamais dosés à la source | Sentinelle de cumul (LOT-03) inopérante sur vitamines/minéraux depuis l'open data | Doses saisies à la vérification praticien ; mode dégradé « doublon détecté, dose inconnue » |
| Historique Téléicare appauvri (substances vides, 71,8 % du jeu) | Fiches anciennes peu utiles telles quelles | Niveau de complétude visible + facette « origine de la déclaration » |
| Doublons fonctionnels (produit re-déclaré, pas de chaînage de versions à la source) | Fiches multiples pour un même produit commercial | Pas de fusion automatique en V1 ; rapprochement proposé à la revue (même nom + marque), décision praticien |
| Volume de compositions (10⁵–10⁶ lignes) | Migration et requêtes catalogue à dimensionner | Index sur (produit, ingrédient), pagination systématique ; à cadrer au LOT-01 avec revue adversariale |
| JSON invalide ou texte libre piégeux dans les cellules | Crash ou données corrompues | Parsing par cellule en try/catch, verbatim conservé, rejets journalisés |
| Métadonnées data.gouv.fr non fiables (taille annoncée 45 Mo vs 144 Mo réels) | Surprises d'infrastructure | Se fier au fichier, pas à la fiche ; contrôles de taille et de volumétrie à chaque snapshot |

## 5. Références

- Jeu de données : <https://www.data.gouv.fr/datasets/declarations-de-complements-alimentaires>
- Schéma officiel : <https://github.com/betagouv/complements-alimentaires/blob/main/data/schemas/schema_declarations.json>
- Changelog du schéma : <https://github.com/betagouv/complements-alimentaires/blob/staging/data/schemas/CHANGELOG_declarations.md>
- Plateforme Compl'Alim : <https://compl-alim.beta.gouv.fr/> ; fiche beta.gouv : <https://beta.gouv.fr/startups/icare-complements-alimentaires.html>
- Téléicare (historique) : <https://www.economie.gouv.fr/dgccrf/teleicare-teleprocedure>
- Nutrivigilance ANSES : <https://www.anses.fr/fr/system/files/ANSES-Ft-Nutrivigilance.pdf> ; rapport 2024 : <https://www.anses.fr/system/files/Anses-RA2024-Nutrivigilance.pdf>
- Open Food Facts (différé) : <https://fr.openfoodfacts.org/data> — licence ODbL
- Proposition de convergence : `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/PROPOSITION_RAYON_COMPLEMENTS.md`
- Doctrine moteur d'intention (décision n°11) : `docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`
