# Prompts Claude Code — chantier "Boussole alimentaire"

Un prompt = une branche = une PR. Coller tel quel dans Claude Code (VS Code)
après avoir créé la branche indiquée. Chaque prompt suppose que
`docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`,
`docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` et
`docs/claude/PROJET_CONTEXTE.md` sont déjà dans le repo et lisibles par
l'agent.

**Périmètre couvert ici** : Phase A (fondation clinique) + Phase B (moteur de
score), soit les 7 branches ci-dessous. Les 12 décisions du §9 du contexte
sont désormais actées (session du 2026-07-06) ; le premier passage réel sur
ces branches doit se limiter au **vertical slice** décrit en §2.5 du contexte
(besoin 1 uniquement, ~12 aliments vedettes, 1 produit scanné), pas à
l'ensemble de la Phase A d'un coup. Les phases C (Nutrition Lab praticien) et
D (scan patient) restent volontairement hors de ce fichier : la phase D
dépend toujours de E3 (auth patient), qui n'existe pas encore.

Ordre d'exécution : 1 → (2, 3 en parallèle possible après 1) → 4 →
(5 après 1) → (6, 7 après 1+2+4+5).

---

## 1. `feat/e1-neuro-axes-schema`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (sections 2.1, 2.2, 5.2)
avant de commencer.

Crée le schéma des tables cliniques propriétaires de la Boussole
alimentaire :
- neuro_axis (axis_code, label_patient, label_praticien, description,
  besoin_niveau1 nullable [1|2|3], besoin_niveau2 nullable [4|5|9|10],
  niveau_preuve [A|B|C|D], version_mapping, actif)
- nutrient_axis_weight (axis_code, nutrient_code, direction
  [favorable|limitant|modulateur], poids, cofacteur_group nullable,
  source_ref, seuil_reference nullable, version_mapping)

Respecte strictement les contraintes suivantes :
- Aucune donnée de niveau A ou C dans ce module (réservé aux questionnaires
  validés et à la biologie fonctionnelle — hors périmètre nutrition).
- Ne renomme, ne modifie et ne supprime aucune table existante.
- Pas de migration Prisma/SQL sans me le demander explicitement d'abord —
  présente-moi le schéma proposé avant de générer la migration.
- N'utilise jamais le terme "NeuroScore" nulle part (code, commentaires,
  noms de colonnes) — banni du projet, cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md.
- Reste strictement dans ce périmètre : pas de seed de données ici (branche
  suivante), pas de moteur de calcul, pas d'UI.

Utilise les patients fictifs Sophie Nicola, Jennifer Martin ou Michel Dogne
pour tout exemple.
```

---

## 2. `feat/e1-mapping-seed-v1`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (section 2.1) et
docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md avant de commencer.
La branche feat/e1-neuro-axes-schema doit être mergée ou disponible avant
celle-ci.

Seed les données v1 du mapping nutriment → besoin, limité au Niveau 1
(besoins 1, 2, 3 — la Boussole alimentaire ne calcule que ceux-là) :

- Besoin 1 (équilibre de l'assiette) : index glycémique, densité
  ultra-transformés, oméga-3 — niveau_preuve = B.
- Besoin 2 (micronutriments) : les "5 majeurs + 3" du guide — fer,
  zinc, magnésium, iode, sélénium, vitamine D, B9, B12 active —
  niveau_preuve = B.
- Besoin 3 (rythme alimentaire) : marque ce besoin comme structurellement
  dépendant d'un champ "heure" sur le journal alimentaire qui n'existe pas
  encore (branche feat/e1-journal-chronobiologie, pas encore créée) — ne
  seed pas de poids pour ce besoin dans cette branche, seulement les
  besoins 1 et 2.

N'ajoute PAS encore de contributions Niveau 2 (besoins 4/5/9/10) dans cette
branche — périmètre volontairement limité au calcul direct.

Chaque ligne de seed doit référencer source_ref = "GUIDE_12_BESOINS_NEURONUTRITION.md"
ou la fiche SIIN pertinente si plus précise. Ne remplis pas seuil_reference
sans valeur VNR EFSA vérifiable — laisse null plutôt que d'inventer un seuil.

Pas de migration Prisma/SQL dans cette branche (seed de données uniquement,
pas de schéma). Reste strictement dans ce périmètre.
```

---

## 3. `feat/e1-ciqual-schema`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (section 5.1) avant de
commencer.

Crée le schéma des tables référentielles Ciqual :
- ciqual_food (code_aliment, nom_fr, groupe, sous_groupe, version_ciqual)
- ciqual_nutrient (code_constituant, nom, unité, catégorie)
- ciqual_value (food_id, nutrient_id, valeur_100g, code_qualité, source)
- ciqual_aliment_moyen (191 aliments génériques, contributeurs — table
  distincte de ciqual_food, pas une vue)

Ces tables sont en lecture seule pour l'application (référentiel, aucune
donnée patient, aucun enjeu HDS). Pas de migration Prisma/SQL sans me le
demander explicitement d'abord — présente-moi le schéma avant de générer
la migration. Ne touche à aucune autre table. Reste strictement dans ce
périmètre : pas de script d'import ici (branche suivante), pas de moteur
de calcul.
```

---

## 4. `feat/e1-ciqual-ingest`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (section 6) avant de
commencer. La branche feat/e1-ciqual-schema doit être mergée ou disponible
avant celle-ci.

Écris un script d'import one-shot (pas une route API) pour charger un
export Ciqual 2025 (Excel/XML, Anses, Etalab 2.0) dans les tables
ciqual_food / ciqual_nutrient / ciqual_value / ciqual_aliment_moyen.
Le script doit être idempotent (relançable sans dupliquer les lignes) et
tracer la version Ciqual importée.

Ne invente aucune valeur nutritionnelle — si une valeur est absente ou
ambiguë dans la source, laisse-la null plutôt que de l'estimer. Pas de
migration Prisma/SQL dans cette branche (le schéma existe déjà). Reste
strictement dans ce périmètre : pas de moteur de score, pas d'UI, pas
d'appel réseau vers Open Food Facts (branche séparée).
```

---

## 5. `feat/e1-off-cache`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (sections 1.1, 3.6) avant
de commencer.

Crée le client Open Food Facts et sa table de cache :
- off_product_cache (barcode, nom, nutriments, nutriscore, nova, additifs,
  fiabilité, contributeurs, fetched_at)

Comportement attendu :
- Ne mirrore jamais OFF en masse — cache uniquement les produits
  effectivement recherchés/scannés, avec TTL de rafraîchissement.
- Si un produit est absent d'OFF ou la requête échoue (réseau faible),
  fallback explicite vers un aliment Ciqual générique proche (table
  ciqual_aliment_moyen), avec un champ indiquant la source dégradée.
- Respecte la licence ODbL d'Open Food Facts : conserve l'attribution dans
  les métadonnées du cache.

Pas de migration Prisma/SQL sans confirmation explicite. N'implémente pas
encore le calcul de score ni l'UI de scan. Reste strictement dans ce
périmètre.
```

---

## 6. `feat/e2-intrinsic-score-engine`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (sections 2.3, 2.4) avant
de commencer. Les branches feat/e1-neuro-axes-schema, feat/e1-mapping-seed-v1,
feat/e1-ciqual-schema et feat/e1-off-cache doivent être mergées ou
disponibles avant celle-ci.

Implémente le calcul du score intrinsèque par aliment/produit et par axe
(besoins 1 et 2 uniquement dans cette branche — le besoin 3 attend le champ
heure du journal) :
- Calcul déterministe : score_brut = somme pondérée des valeurs nutriment
  × poids × signe(direction), normalisation min-max par axe sur les
  percentiles p5/p95 observés dans Ciqual (pas de seuils cliniques
  absolus inventés).
- Résultat matérialisé dans une table food_intrinsic_score (food_ref,
  source [ciqual|off|off_fallback_ciqual], axis_code, score_0_100,
  version_score, version_mapping, computed_at).
- Recalcul déclenché uniquement par un bump de version_score ou
  version_mapping — jamais à chaque lecture.
- Aucun calcul ne doit dépendre d'une donnée patient (biologie, journal) :
  le score intrinsèque est une propriété de l'aliment, pas du patient.

Pas de migration Prisma/SQL sans confirmation explicite. N'implémente pas
le score contextuel (branche suivante) ni l'UI. Reste strictement dans ce
périmètre. Utilise les patients fictifs autorisés uniquement dans les tests
d'exemple, jamais dans le calcul lui-même (le score intrinsèque ne doit
justement pas dépendre du patient — c'est ce que ce test doit démontrer).
```

---

## 7. `feat/e2-contextual-score`

```
Lis docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md (section 1.2) avant de
commencer. La branche feat/e2-intrinsic-score-engine doit être mergée ou
disponible avant celle-ci.

Implémente la lecture contextuelle du score intrinsèque, filtrée par les
axes actifs du protocole d'un patient :
- Fonction de lecture qui prend un food_ref + un patient_id (ou directement
  la liste des besoins actifs de son protocole) et retourne une lecture
  formatée par besoin, jamais un chiffre brut sans contexte.
- Aucune réécriture du score intrinsèque : cette couche ne fait que lire et
  contextualiser, jamais recalculer.
- Formulation systématique en cohérence avec un objectif, jamais en
  jugement absolu : "va dans le sens de votre objectif" / "neutre pour
  vous en ce moment" / "s'éloigne un peu de votre objectif actuel" — jamais
  "bon" ou "mauvais" aliment/produit.
- Si le score touche un besoin de Niveau 2 (contribution secondaire, cf.
  section 2.1), la formulation doit rester en signal ("semble aller dans le
  sens de..."), jamais affirmer un calcul du besoin lui-même.

Pas de migration Prisma/SQL sans confirmation explicite. N'implémente
aucune UI dans cette branche (fonction de lecture pure, consommable
ensuite par le Lab praticien ou un futur scan). Interface 100 % en
français dans les libellés retournés. Utilise les 3 patients fictifs
autorisés pour les exemples/tests. Reste strictement dans ce périmètre.
```
