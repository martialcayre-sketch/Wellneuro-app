---
id: "LOT-00"
titre: "JA-00 — Audit clinique/RGPD des registres et arbitrages calibrage"
statut: "prêt — audit à mener, validation praticien requise"
gate: "validation praticien (aucune implémentation avant levée)"
---

# LOT-00 (alias JA-00) — Audit clinique/RGPD

> Id outillage : `LOT-00` ; le programme et le registre désignent ce lot
> sous l'alias **JA-00**. Compilé le 2026-07-17, après le GO terrain de
> JA-0T (`LOT-01-validation-terrain-ja-0t.md`, Enseignements). Lot
> **documentaire** : aucune ligne de code, aucune migration, aucune donnée
> patient.

## Objet

Auditer et faire valider par le praticien les référentiels candidats du JA
avant toute compilation de code (JA5-01 est gaté par ce lot), et trancher
les arbitrages de calibrage restants (doc 11 §12, allégé par les décisions
A7 déjà actées).

## Livrables

### 1. Registre de marqueurs (candidat, à auditer)

- Adossé aux codes des **191 aliments moyens Ciqual** (Etalab 2.0 —
  décision A7-12), avec les **12 vedettes du slice C5** en sous-ensemble
  (voir `../../2026-07-11-boussole-alimentaire-slice-v1/SPEC_SLICE_BESOIN_1_LOT-00.md`).
- **Aucune valeur nutritionnelle dans le JA** : les valeurs viendront du
  référentiel C5A ; le JA ne porte que des références documentaires.
- Sélectionner les marqueurs déjà suffisamment gouvernés pour un pilote
  (doc 11 §12.3) ; les autres restent hors périmètre.

### 2. Registre de frictions à catégories fermées (versionné)

- Catégories fermées, peu nombreuses, en français patient.
- **Doit inclure les issues validées par le terrain JA-0T (saturation
  5/5)** : « j'ai adapté l'action », « fait en partie », « oublié / pas
  noté », avec empêchement exprimable en quelques choix rapides + mot
  libre **court et optionnel** — jamais de texte long obligatoire.
- Statut : candidat à auditer, pas un référentiel canonique.

### 3. Couverture et rétention

- Définir une couverture exploitable **sans créer de seuil clinique
  implicite** (doc 11 §12.4).
- Durées de conservation candidates par type de trace ; toute rétention
  effective ou migration exige le gate C2/RGPD distinct (décision actée).

### 4. Critères de prudence relationnelle (doc 09 §4.7)

- L'observation répétée de l'alimentation peut renforcer hypervigilance,
  culpabilité ou rigidité : définir les critères d'éligibilité, de
  prudence, de **suspension immédiate** et de retrait (doc 11 §12.8).
- **Renforcé par le terrain (P5)** : aucun commentaire sur le poids ou
  l'apparence, aucun classement bon/mauvais, aucune alerte culpabilisante
  — ces interdits deviennent des critères d'audit, pas des préférences.
- L'activation reste une décision humaine, par patient.

### 5. Arbitrages calibrage restants (doc 11 §12 allégé)

À trancher et documenter (les points 1, 7 et 9 du §12 sont déjà actés par
A7 et la structure de lots) :

- questions auxquelles le bilan observationnel doit répondre (§12.2) ;
- place exacte du profil observationnel dans le `ClinicalSnapshot` —
  éclairant, jamais concluant seul (§12.5) ;
- comparaison autorisée avec `Q_ALI_01` / `Q_ALI_02`, sachant qu'aucune
  projection automatique n'est permise (§12.6).

## Critères de done

- Les cinq livrables sont documentés dans ce fichier (sections « Résultats
  d'audit », à ajouter) et **validés explicitement par le praticien**.
- Aucun code, aucune migration, aucun secret, aucune donnée patient.
- Le gate est levé par une mention datée du praticien dans ce fichier ;
  sa levée, combinée au GO JA-0T, débloque l'exécution de JA5-01
  (`LOT-02-domaine-typescript-ja5-01.md`).
