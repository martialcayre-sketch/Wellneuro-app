---
id: "LOT-00"
titre: "JA-00 — Audit clinique/RGPD des registres et arbitrages calibrage"
statut: "terminé — validé praticien le 2026-07-17 (PR #98), gate levé"
gate: "levé le 2026-07-17 — validation praticien (approbation PR #98)"
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

## Résultats d'audit — propositions (2026-07-17, à valider praticien)

> Propositions préparées après le GO terrain JA-0T. Rien n'est acté tant
> que la section « Validation » n'est pas remplie. Précédent C5A :
> validation praticien = revue de la PR d'audit, répercutée ici par une
> mention datée.

### A1. Registre de marqueurs — proposition

- **Marqueurs alimentaires pilotes : les 12 vedettes C5A uniquement**
  (libellés de travail, LOT-00 de `2026-07-11-boussole-alimentaire-slice-v1`
  §3) : sardine (conserve), maquereau, huile d'olive vierge extra, huile de
  colza, lentilles cuites, pois chiches cuits, noix, flocons d'avoine, pain
  complet, brocoli cuit, épinards cuits, myrtille. Justification : seuls
  marqueurs déjà gouvernés (sélection documentée, licences Etalab 2.0
  actées, validation praticien C5A en cours par revue de PR).
- Le reste des **191 aliments moyens Ciqual** : référence documentaire
  d'appariement, **non pilote** — aucun marqueur supplémentaire sans
  nouvel audit.
- **Marqueurs structurels candidats** (déclaratifs, sans pesée ni
  quantité) : nombre de prises sur la journée, moment approximatif
  (matin / midi / soir / hors repas), contexte (seul·e / accompagné·e,
  domicile / extérieur).
- Codes Ciqual exacts résolus au C5A LOT-02 (aucun code inventé ici) ;
  **aucune valeur nutritionnelle dans le JA** (A7-12).

### A2. Registre de frictions v1 — proposition (catégories fermées)

Issues de trace (amendement terrain n° 1) : `fait | adapté |
partiel_empeche | oublie_non_note`.

Catégories d'empêchement, en français patient, ancrées dans les verbatims
JA-0T :

| # | Libellé patient | Ancrage |
|---|---|---|
| F1 | « Pas le temps, journée trop chargée » | P4 (journées de classe) |
| F2 | « Trop de fatigue ce jour-là » | P3 (fibromyalgie) |
| F3 | « Repas hors de chez moi / avec d'autres » | terrain (contexte social) |
| F4 | « L'aliment n'était pas là (courses, stock) » | faisabilité |
| F5 | « Trop compliqué à préparer ou organiser » | P3, P5 |
| F6 | « Pas envie ce jour-là » | distinction motivation/faisabilité |
| F7 | « Un imprévu (déplacement, santé, famille) » | P4 |
| F8 | « Autre » + mot libre **court, optionnel** | P1, P3, P4 (jamais obligatoire) |

Registre **versionné** (v1) ; toute évolution se fait par ajout — jamais de
suppression ni de renumérotation pendant un épisode en cours.

### A3. Couverture et rétention — proposition

- **Couverture** : description factuelle uniquement — « X traces sur un
  budget de Y cette semaine » — sans pourcentage-seuil, sans code couleur,
  sans qualificatif. L'absence de trace est un état **neutre**
  (amendement n° 2) ; aucun seuil clinique implicite (doc 11 §12.4).
- **Rétention candidate** (documentaire — toute mise en œuvre exige le
  gate C2/RGPD distinct, JA5-04) : traces conservées pendant l'épisode
  puis sur l'horizon de la carrière d'action, **24 mois glissants
  proposés** ; mots libres courts effaçables à la demande ;
  rectification/suppression par événement append-only. Aucune
  conservation effective avant persistance.

### A4. Prudence relationnelle — critères candidats (doc 09 §4.7)

- **Non-activation par défaut** : l'observation alimentaire n'est activée
  que par décision explicite du praticien, patient par patient.
- **Prudence renforcée avant activation** (arbitrage praticien documenté) :
  antécédent ou signes évocateurs de trouble du comportement alimentaire,
  relation anxieuse à l'alimentation, hypervigilance corporelle.
- **Suspension immédiate** : à tout moment, par le praticien (un geste) ou
  par le patient (sans justification) ; la suspension ne produit aucun
  signal négatif ni relance.
- **Signes d'appel en cours d'épisode → réévaluation au tour suivant** :
  culpabilité exprimée, rigidification des comportements, remplissage
  « pour faire plaisir ».
- **Interdits absolus** (terrain P5 + §4.7) : aucun commentaire sur le
  poids ou l'apparence, aucun classement bon/mauvais, aucune alerte
  culpabilisante, un seul rappel désactivable.

### A5. Arbitrages calibrage — propositions par défaut (doc 11 §12)

| Question | Proposition |
|---|---|
| Questions du bilan (§12.2) | Trois questions : structure des prises sur la journée (nombre, moments) ; régularité et variabilité des horaires ; présence des vedettes pertinentes pour le besoin travaillé |
| Marqueurs pilotes (§12.3) | Sous-ensemble des 12 vedettes pertinent au besoin + marqueurs structurels (A1) — rien d'autre |
| Place du profil dans le `ClinicalSnapshot` (§12.5) | Annexe éclairante non scorée : le `DietaryObservationProfile` s'affiche à côté du snapshot, n'entre dans aucun calcul, n'est jamais bloquant ni concluant seul |
| Comparaison `Q_ALI_01` / `Q_ALI_02` (§12.6) | Lecture côte à côte en consultation uniquement (déclaré vs observé, quatre lectures séparées) ; aucune projection ni écart calculé automatiquement |

### Validation

| Section | Verdict praticien (valider / modifier) | Date |
|---|---|---|
| A1 Marqueurs | Validé (approbation PR #98) | 2026-07-17 |
| A2 Frictions v1 | Validé (approbation PR #98) | 2026-07-17 |
| A3 Couverture/rétention | Validé (approbation PR #98) | 2026-07-17 |
| A4 Prudence relationnelle | Validé (approbation PR #98) | 2026-07-17 |
| A5 Arbitrages calibrage | Validé (approbation PR #98) | 2026-07-17 |

**Levée du gate** : les cinq sections validées (mention datée ci-dessus ou
approbation de la PR d'audit consignée ici) ⇒ gate JA-00 levé ⇒ JA5-01
exécutable.
