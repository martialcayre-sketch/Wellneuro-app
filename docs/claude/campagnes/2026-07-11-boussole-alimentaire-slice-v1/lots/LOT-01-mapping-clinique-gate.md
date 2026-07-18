---
id: "LOT-01"
titre: "Mapping clinique et gate de validation"
statut: "validation_clinique_acquise — seconde_passe_documentaire_requise"
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

- [ ] Résoudre les codes et unités depuis la source Ciqual officielle.
- [ ] Documenter direction, poids, preuve et justification de chaque liaison.
- [ ] Définir p5/p95, données manquantes et valeurs limites.
- [ ] Calculer et faire relire les vecteurs attendus des 12 vedettes.
- [ ] Versionner le contrat et recueillir la validation humaine explicite.

## Tests

Fixtures cliniques revues, déterminisme, p5/p95, valeurs limites, unités
incompatibles, données manquantes et versions incompatibles.

## Critères de done

- Chaque entrée est sourcée et porte son niveau de preuve.
- Les vecteurs des 12 vedettes ont un résultat attendu signé.
- mappingVersion et scoreVersion sont figés.
- La validation humaine est traçable et CHANGELOG.md est prêt si le lot conduit
  ensuite à une modification clinique.

## Risques / points de vigilance

La source statistique de p5/p95 doit être la même version de dataset que le
calcul ; un changement de mapping ou de distribution impose une nouvelle
version et invalide les profils antérieurs.

## Résultats

Passe documentaire préparatoire exécutée le 2026-07-18 :

- dossier de mapping clinique : DOSSIER_MAPPING_CLINIQUE_LOT-01.md ;
- références et vecteurs non pondérés des 12 vedettes :
  VECTEURS_12_VEDETTES_LOT-01.md ;
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
- PRAL classé comme marqueur dérivé candidat de `equilibre_assiette`, jamais
  comme aliment ou vedette.
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
  `pralStatus = insufficient_data`, `profileStatus = partial_data`, sous-profil
  nutritionnel renormalisé et complétude 90 % ;
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
  `c5a-pral-remer-manz-v1`, sous identité append-only.

Le gate clinique est acquis. La seconde passe reste requise pour calculer les
p5/p95 PRAL réels, produire et faire signer les vecteurs pondérés, inscrire la
décision clinique dans CHANGELOG.md et proposer ensuite la clôture.

**Statut : validation_clinique_acquise — seconde_passe_documentaire_requise.**
LOT-01 n'est pas terminé et la campagne reste inactive à 1/8 lot terminé.
