---
id: "2026-07-13-journal-alimentaire-21j-v1"
titre: "JA — Ma spirale alimentaire (journal alimentaire recadré 5.0)"
statut: "recadrée 5.0 — règles cliniques candidates"
créée_le: "2026-07-13"
mise_à_jour: "2026-07-16"
lot_courant: "aucun"
---

# JA — Ma spirale alimentaire

> Recadrage 5.0 acté le 2026-07-16 (registre A7). Le cadrage V1 « journal
> alimentaire 21 jours » est remplacé par le cap essai/friction — voir
> `../../propositions/2026-07-16-journal-alimentaire-5-0/BRAINSTORM_JA_5_0.md`
> et `ARBITRAGES_JA_5_0.md` (D1–D12 tranchés).

## Objectif

Instrument longitudinal **à deux régimes** (A7-11) :

- **Régime A — évaluation avant protocole** : construire un profil
  alimentaire observationnel (`DietaryObservationProfile`) qui éclaire le
  `ClinicalSnapshot` et la `DecisionCard`, avec sa couverture et ses
  limites, sans produire seul une conclusion clinique. Prescrit
  explicitement, jamais imposé.
- **Régime B — expérimentation après protocole** (le noyau) : observer si
  une action alimentaire validée est réellement praticable dans la vie du
  patient — occasions, praticabilité, frictions, adaptations — pendant un
  tour borné (« essai »), pour éclairer la décision du praticien au point
  d'étape suivant.

On ne décrit pas les repas de façon exhaustive ; on ne transforme aucune
observation en score clinique officiel ni en réponses de questionnaire.

## Frontières

**Possède** : épisodes d'observation (`FoodObservationEpisode`, objet
unique porteur d'un régime `assessment | experiment` ; en régime B :
hypothèse et versions d'action idéale/simple/secours), profil
observationnel `DietaryObservationProfile` (régime A, gouverné comme un
instrument de mesure), traces occasion/praticabilité/friction, registre de
frictions versionné à catégories fermées, corrections/suppressions
événementielles (append-only), couverture et limites explicites, constats
directs d'adhésion, solutions personnelles intra-épisode, plan minimal,
quatre lectures séparées (déclaré/observé/vécu/interprété), delta de
décision, agrégats descriptifs et discordances.

**Consomme** : charte patient HC-F. Le futur branchement patient consommera
un protocole actif C2 ; C5 pourra lire les observations publiées sans
posséder le journal ; la persistance des solutions entre épisodes consommera
l'identité durable IDP ; la trace rapide consommera le canal notifications.

**Ne possède pas** : score Mon équilibre, scoring SIIN, décision C1,
contextualisation C5, persistance C2, projections questionnaire, météo
d'adhésion agrégée (SP-MET), capture photo/voix (différée), comparaison
multi-épisodes automatique, Nutrition Lab avancé, cabinet apprenant.

## Décisions actées

- **A7 au registre** : architecture à deux régimes avec objet unique
  (A7-11) ; noms « Ma spirale alimentaire » (patient, vocabulaire « essai »)
  et « Trajectoire alimentaire » (praticien) ; D1–D12 tranchés — politique
  focalisée par défaut en régime B, évaluation observationnelle prescrite
  explicitement en régime A, durée cible adaptative, suffisance par type de
  question versionnée, photo/voix différées avec politiques actées,
  solutions gatées IDP, plan minimal libre 1/3/7 j, constats directs
  (agrégation → SP-MET), notifications « pourquoi maintenant » avec trace
  rapide, comparaison gatée, « simulateur d'action », J21 par assignation
  explicite.
- Boucle patient-praticien fermée : retour de décision (Relu → Validé →
  Envoyé), tour suivant préparé (praticien seul), charge perçue en clôture.
- Domaine TypeScript pur avant toute persistance.
- Aucune projection automatique vers `Q_ALI_01` ou `Q_ALI_02`.
- Les 25 marqueurs et neuf axes du prototype V1, et le registre de frictions
  5.0, sont des candidats à auditer, pas un référentiel canonique.
- Toute migration, durée de conservation ou activation patient exige un gate
  C2/RGPD distinct.

## Lots à compiler

| Lot | Objet | Gate |
|---|---|---|
| JA-00 | Audit clinique/RGPD : registre de frictions, marqueurs, axes, couverture, rétention, critères de prudence relationnelle (doc 09 §4.7) + arbitrages régime A restants (doc 11 §12 : questions du bilan, marqueurs pilotes, place du profil dans le ClinicalSnapshot, comparaison questionnaires) | validation praticien |
| JA5-01 | Domaine TypeScript pur : contrats de l'épisode à deux régimes, politiques focalisée (B) et évaluation observationnelle (A), profil observationnel, événements append-only, opportunités, couverture et suffisance versionnée, constats directs, discordances, quatre lectures, delta de décision, tests Vitest | JA-00 |
| JA5-02 | Parcours patient local : trace occasion/praticabilité/friction, plan minimal, budget d'attention, droit au silence, réflexion hebdomadaire, solutions intra-épisode | JA5-01 |
| JA5-03 | Parcours praticien : cartes Fil du jour, trajectoire, qualité d'observation, constats directs, tour suivant préparé | JA5-02 |
| JA5-04 | Persistance : épisodes, événements, solutions, snapshots, RLS patient-scopé, audit append-only | C2A + confirmation migration explicite |
| JA5-05 | Activation : liaison protocole actif, jalons, PhaseReview, retour de décision, charge perçue en clôture | JA5-04 |

Différés hors campagne, chacun avec son gate propre : capture photo/voix
(choix TRUST + validation de la boucle simple), météo agrégée (SP-MET),
persistance des solutions (IDP), comparaison multi-épisodes (C2A + IDP),
Nutrition Lab et simulateur d'action, cabinet apprenant.
