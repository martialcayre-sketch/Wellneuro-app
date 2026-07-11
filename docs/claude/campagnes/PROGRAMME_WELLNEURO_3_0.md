# Synthèse du programme WellNeuro 3.0

## Décision stratégique

Ne pas recoder WellNeuro. Recomposer progressivement l'UX et le moteur clinique autour d'un MVP décisionnel.

```text
Questionnaires + anamnèse + Mon équilibre
↓
Fiche patient cockpit
↓
Priorité 21 jours
↓
Protocole minimal validé
↓
Document patient
↓
Suivi J7/J14/J21
```

## Ce que WellNeuro 3.0 doit prouver

- Le praticien comprend la situation en moins de deux minutes.
- Il prépare une phase 1 en moins de dix minutes.
- La phase 1 reste supportable : trois actions maximum.
- Les données manquantes et discordances empêchent la surinterprétation.
- Le patient reçoit une version calme et concrète.
- Le suivi distingue effet, tolérance et adhésion.

## Programme de campagnes

| Ordre | Campagne | Résultat | Priorité | Risque | Dépendance |
|---|---|---|---|---|---|
| C0 | `2026-07-11-alignement-documentaire-etat-reel` | Alignement documentaire | Obligatoire | Faible | Aucune |
| C0-UX | `2026-07-11-refonte-ux-shell-3-0` | Refonte UX shell praticien 3.0 (rail gauche, navigation mobile, tokens) | Recommandée avant C1 | Moyen | C0 |
| C1 | `2026-07-11-decision-clinique-21j-v1` | Décision clinique 21J V1 | Priorité produit | Moyen | C0 + C0-UX |
| C2 | `2026-07-11-suivi-j7-j14-j21-et-persistance` | Persistance + suivi J7/J14/J21 | Après validation UX | Élevé / migration | C1 + confirmation |
| C3 | `2026-07-11-fiches-conseils-contextuelles-v1` | Fiches conseils contextuelles | Après C1 | Faible | C1 |
| C4 | `2026-07-11-complements-clean-label-v1` | Compléments clean label V1 | Après C1/C3 | Moyen | C1 + C3 |
| C5 | `2026-07-11-boussole-alimentaire-slice-v1` | Boussole alimentaire slice V1 | Après C1 | Moyen | C1 + validation mapping |

> **C0-UX** couvre uniquement le shell praticien transversal (navigation, barre de commande, tokens
> sémantiques — phases UX-0/UX-1 de `docs/claude/UX_WELLNEURO_3_0.md`). Le dashboard léger, l'annuaire, la
> fiche patient et le portail patient (phases UX-2 à UX-5 du même document) restent portés par C1/C3/C4/C5,
> qui ont déjà leurs propres specs UX (ex. `06_SPEC_UX_COCKPIT_PRATICIEN.md` dans C1) — pas de campagne
> dédiée pour eux. La phase UX-6 (préparation WellNeuro 4.0) rejoint les « Modules différés » ci-dessous.

## Gate de migration

La campagne C2 contient un lot `bloqué_confirmation`. Aucun agent ne doit le démarrer sans confirmation explicite de migration Prisma/SQL.

## Modules différés

- Biologie réelle stockée : après cadre HDS.
- Messagerie contextualisée : après auth/persistance stabilisées.
- Copilotes IA spécialisés : après flux déterministes et validation praticien.
- Scanner alimentaire, panier et photo repas : après validation du slice Boussole.
