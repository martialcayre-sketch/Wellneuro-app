---
id: "LOT-01"
titre: "Mapping clinique et gate de validation"
statut: "terminé — validation clinique et vecteurs signés"
dépend_de: "LOT-00"
---

# LOT-01 — Mapping clinique et gate de validation

## But

Figer un mapping intrinsèque revuable avant toute implémentation.

## Résultat observable

Un dossier clinique validable qui fixe, sans ambiguïté, les constituants Ciqual,
la direction et le poids de chaque contribution, les règles de données
manquantes, les niveaux de preuve et les versions.

## Périmètre

- Codes constituants Ciqual et unités autorisées.
- Mapping dans NeuroAxis et NutrientAxisWeight.
- Formule de normalisation p5/p95 sur la distribution complète retenue.
- mappingVersion, scoreVersion, règles d'arrondi et incompatibilités.
- Vecteurs attendus des 12 vedettes et document de revue praticien.

## Hors périmètre

Schéma, migration, import, API, UI, recommandations patient et modification des
seuils cliniques existants.

## Fichiers probables

Documentation clinique C5, gouvernance de scoring, fixtures futures, CHANGELOG.md
et matrice de revue praticien.

## Interdits

- Aucun code avant signature humaine explicite du dossier de revue.
- Aucun poids, seuil, code ou vecteur inventé.
- Aucune compensation masquant une donnée insuffisante.
- Aucune valeur patient ni donnée biologique.

## Étapes

- [x] Résoudre les codes et unités depuis la source Ciqual officielle.
- [x] Documenter direction, poids, preuve et justification de chaque liaison.
- [x] Définir p5/p95, données manquantes et valeurs limites.
- [x] Calculer et faire relire les vecteurs attendus des 12 vedettes.
- [x] Versionner le contrat et recueillir la validation humaine explicite du
      gate initial.

## Tests

Fixtures cliniques revues, déterminisme, p5/p95, valeurs limites, unités
incompatibles, données manquantes et versions incompatibles.

## Critères de done

- [x] Chaque entrée est sourcée et porte son niveau de preuve.
- [x] Les vecteurs des 12 vedettes ont un résultat attendu signé.
- [x] mappingVersion et scoreVersion sont figés.
- [x] La validation humaine est traçable et `CHANGELOG.md` consigne la
      décision clinique documentaire.

## Risques / points de vigilance

La source statistique de p5/p95 doit être la même version de dataset que le
calcul ; un changement de mapping ou de distribution impose une nouvelle
version et invalide les profils antérieurs.

## Résultats

Passe documentaire préparatoire exécutée le 2026-07-18 :

- dossier de mapping clinique : DOSSIER_MAPPING_CLINIQUE_LOT-01.md ;
- manifeste préparatoire des 12 vedettes, désormais enrichi des vecteurs
  pondérés de seconde passe : VECTEURS_12_VEDETTES_LOT-01.md ;
- matrice de gate humain : REVUE_PRATICIEN_LOT-01.md ;
- sources Ciqual 2025 V1 téléchargées uniquement en temporaire et empreintes
  officielles vérifiées ;
- p5/p95 calculés par constituant sur les 3 484 aliments, sans imputation des
  valeurs absentes, traces ou sous limite ;
- pendant cette passe préparatoire antérieure à l'avis praticien, aucun poids,
  score agrégé, code, schéma, import ou état d'activation n'avait été produit.

Avis final rendu le 2026-07-18 par Martial CAYRE, praticien valideur
responsable de la gouvernance clinique WellNeuro : **VALIDÉ — seconde passe
documentaire requise**.

Référence stable : **C5-LOT01-VALIDATION-MC-2026-07-18-v1**. La preuve Git est
rattachée dans REVUE_PRATICIEN_LOT-01.md.

Décisions consignées :

- les 12 références candidates sont acceptées comme cohorte pilote, sans
  limiter le futur catalogue C5 ;
- protéines 25000 : inclusion et direction favorable validées ;
- sel 10004 retenu et sodium 10110 exclu ;
- normalisation p5/p95 validée sans correction ;
- PRAL validé comme marqueur dérivé de `equilibre_assiette`, jamais comme
  aliment ou vedette.
- pondération clinique validée : sous-profil nutritionnel 90 % et PRAL
  facultatif plafonné à 10 % ;
- poids effectifs validés : protéines 18 %, sucres 9 %, fibres 13,5 %, AG
  saturés 9 %, AG monoinsaturés 4,5 %, AG polyinsaturés 4,5 %, ALA 6,3 %,
  EPA 5,4 %, DHA 6,3 %, sel 13,5 % et PRAL 10 % ;
- glucides 31000 et sodium 10110 exclus du score et conservés comme données
  descriptives sans poids ;
- formule PRAL Remer–Manz documentée avec les codes Ciqual officiels protéines
  25000, magnésium 10120, phosphore 10150, potassium 10190 et calcium 10200 ;
- calcul PRAL fixé par 100 g en C5A, puis par total et densité pondérée par les
  portions en C5B ;
- en cas d'intrant PRAL non exact, aucune imputation ni valeur partielle :
  `pralStatus = insufficient_data` ; si seul le PRAL manque,
  `profileStatus = partial_data` et complétude 90 % ; avec un autre facultatif
  manquant, complétude égale aux poids disponibles ; avec un obligatoire
  manquant, `profileStatus = insufficient_data` et aucun score ;
- noyau obligatoire validé : protéines 25000, fibres 34100, AG saturés 40302,
  AG monoinsaturés 40303 et AG polyinsaturés 40304 ;
- sucres 32000, ALA 41833, EPA 42053, DHA 42263, sel 10004 et PRAL facultatifs
  mais pondérés lorsque leur valeur est exacte ;
- couverture du noyau vérifiée sur Ciqual 2025 V1 : 2 385/3 484 aliments et
  12/12 vedettes, contre 629/3 484 et 2/12 avec les dix constituants
  nutritionnels obligatoires ;
- politique globale validée : `insufficient_data` pour un obligatoire manquant,
  `partial_data` pour un facultatif manquant, sans imputation, avec
  renormalisation, complétude pondérée et liste des absences ;
- versions validées : `equilibre_assiette`, `ciqual-2025-v1`,
  `c5a-b1-mapping-v1`, `c5a-b1-score-v1` et
  `c5a-pral-remer-manz-v1`, sous identité append-only ; identifiants figés mais
  non publiables avant rattachement des p5/p95 PRAL et vecteurs signés.

Seconde passe documentaire exécutée le 2026-07-18 :

- PRAL exact calculable pour 2 347/3 484 aliments, soit 67,4 % ;
- bornes réelles `p5 = -8,70089` et `p95 = 14,69258 mEq/100 g` ;
- 12/12 noyaux obligatoires complets ;
- deux profils complets et dix profils partiels, sans imputation ;
- contributions pondérées et agrégats attendus consignés sous la référence
  `C5-LOT01-VECTEURS-2026-07-18-v1` ;
- sources officielles ou de référence, limites d'interprétation et niveau
  WellNeuro B rattachés à chaque liaison ;
- entrée clinique documentaire ajoutée dans `CHANGELOG.md`, sans activation.

Signature finale reçue le 2026-07-18 de Martial CAYRE, praticien valideur
responsable de la gouvernance clinique WellNeuro : validation explicite du
document de référence `C5-LOT01-VECTEURS-2026-07-18-v1`, identifié par
`fb138bd784431713c26d0e4d93053189c3359d99`.

La revue indépendante conclut **GO signature documentaire** : 12 agrégats
reproduits à six décimales, PRAL plafonné à 10 %, aucune imputation, preuve Git
et périmètre documentaire conformes.

**Statut : terminé — validation clinique et vecteurs signés.** LOT-01 est
terminé. La campagne passe à 2/8 lots terminés et reste inactive ; LOT-02 devient
le prochain lot, avec gates migration et import toujours bloquants.
