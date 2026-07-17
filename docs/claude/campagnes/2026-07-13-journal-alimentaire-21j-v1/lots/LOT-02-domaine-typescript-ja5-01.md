---
id: "LOT-02"
titre: "JA5-01 — Domaine TypeScript pur (noyau amendé par le terrain)"
statut: "prêt — gates JA-00 et JA-0T levés le 2026-07-17, exécutable"
gate: "levés — JA-00 (PR #98, 2026-07-17) + JA-0T (GO, 2026-07-17)"
---

# LOT-02 (alias JA5-01) — Domaine TypeScript pur

> Id outillage : `LOT-02` ; alias programme **JA5-01**. Compilé le
> 2026-07-17 après le GO terrain de JA-0T. Gate JA-00 levé le 2026-07-17
> (PR #98) : **lot exécutable**. (Référence historique : levée
> du gate via `LOT-00-audit-clinique-rgpd-ja-00.md`, section Validation.)

## Objet

Implémenter le domaine du JA en **TypeScript pur** (aucune persistance,
aucune route API, aucun composant UI, aucune dépendance Prisma) : types,
constructeurs, transitions et restitutions simples, couverts par des tests
Vitest. Livraison dans `web/src/lib/` (module dédié, emplacement exact à
fixer à l'exécution), sans toucher au runtime existant.

## Périmètre (noyau acté, amendé par JA-0T)

### Épisode à trois régimes

- `FoodObservationEpisode` : objet unique porteur d'un régime
  `calibrage | essai | silence` (A7-11 amendé). En régime essai : hypothèse
  et versions d'action idéale/simple/secours. En régime silence : aucune
  observation prescrite, l'épisode n'existe que comme ancre de conversation.

### Trace d'essai — boucle courte à 4 issues (amendement terrain n° 1)

- Les trois questions du noyau : l'occasion s'est-elle présentée ? était-ce
  faisable ? qu'est-ce qui a compté ?
- L'issue d'une trace porte **quatre valeurs** : `fait | adapté |
  partiel_empeche | oublie_non_note` — l'adaptation et l'oubli sont des
  données, pas des échecs (saturation 5/5 des entretiens).
- Empêchement/friction : choix fermés du registre de frictions audité en
  JA-00 + **mot libre court optionnel** — jamais de texte long obligatoire.

### Sémantique du silence patient (amendement terrain n° 2)

- L'absence de trace est un **état neutre** : aucune restitution ne la
  présente au praticien comme signal négatif (pas de « manque de
  motivation », « oubli », « non-adhésion » dérivés).
- Événement déclarable par le patient : « je n'ai pas pu cette semaine »
  (motif optionnel, catégories fermées) — distinct de l'absence simple.
- Silence utile explicite côté patient : l'instrument sait dire « rien à
  noter aujourd'hui, nous en savons assez ».

### Budget d'attention personnalisable (amendement terrain n° 3)

- Budget par épisode, borné **2 à 7 traces/semaine** (fourchette réelle du
  panel JA-0T), jamais imposé quotidien par défaut ; la politique du régime
  essai le respecte (focalisée par défaut — D1-D12).

### Autres éléments du noyau

- **Carrière d'action** : proposée → essayée → adaptée → stabilisée →
  intégrée/abandonnée-informative, à travers les tours (A7-14).
- **Question du jour compilée** (praticien prépare, patient répond).
- **Calibrage** : profil observationnel minimal + charge supportable
  (`DietaryObservationProfile` éclairant le `ClinicalSnapshot`, sans
  conclusion clinique autonome) — sous réserve des arbitrages JA-00 §5.
- **Delta de décision instrumenté** dès ce lot (A7-14) ; retour de décision
  **court et concret** (ce que les notes ont changé), cycle
  Relu → Validé → Envoyé.
- **Constats directs** d'adhésion (absence de trace, absence d'occasion,
  plan minimal actif, action déclarée impossible) — sans agrégation météo
  (SP-MET hors périmètre).
- **Quatre lectures séparées** : déclaré / observé / vécu / interprété.
- **Restitution simple, aucun moteur** : au volume attendu, l'affichage bat
  le calcul (affichage-avant-moteurs, A7-14).

## Interdits (contraintes de conception, confirmées par le terrain)

- Aucune valeur nutritionnelle, aucun score, aucune projection vers
  `Q_ALI_01` / `Q_ALI_02`.
- Aucun objectif chiffré affiché, aucun classement bon/mauvais des repas ou
  des journées, aucune description exhaustive des repas.
- Aucun mécanisme de rappel dans le domaine (le canal notifications est
  consommé, pas possédé ; contrainte produit : un seul rappel,
  désactivable).
- Aucune persistance, aucune migration, aucune activation patient (gates
  C2/RGPD distincts — JA5-04/JA5-05).

## Matériaux

- Enseignements JA-0T : `LOT-01-validation-terrain-ja-0t.md` (section
  Enseignements — source des amendements 1-3).
- Contrats candidats :
  `../../../propositions/2026-07-16-journal-alimentaire-5-0/code/contracts.ts`
  — **matériau à élaguer** (version riche pré-contrepoint : moteur,
  signatures, météo et projections sont hors noyau), pas un contrat acté.
- Arbitrages : `ARBITRAGES_JA_5_0.md` (D1-D12) et
  `12_CONTREPOINT_ET_ADAPTATION.md` (même dossier propositions).

## Critères de done

- Domaine TypeScript pur compilant (`npm run type-check`) sans nouvelle
  dépendance, importable sans effet de bord.
- Tests Vitest couvrant : transitions de régime, cycle de vie de la
  carrière d'action, les 4 issues de trace, neutralité du silence dans
  toute restitution, bornes du budget, delta de décision.
- Vocabulaire UI (constantes de libellés) en français : « essai »,
  « recommandation » (jamais « prescription » — R4).
- Aucun secret, aucune donnée patient réelle ; seuls Sophie Nicola,
  Jennifer Martin, Michel Dogné dans les fixtures de test.
