---
id: "2026-07-13-journal-alimentaire-21j-v1"
titre: "JA — Ma spirale alimentaire (journal alimentaire recadré 5.0)"
statut: "recadrée 5.0 + adaptation contrepoint — règles cliniques candidates"
créée_le: "2026-07-13"
mise_à_jour: "2026-07-16"
lot_courant: "aucun"
---

# JA — Ma spirale alimentaire

> Recadrage 5.0 acté le 2026-07-16 (registre A7), adapté le même jour par le
> contrepoint critique (A7-11 amendé, A7-12 à A7-14). Voir
> `../../propositions/2026-07-16-journal-alimentaire-5-0/BRAINSTORM_JA_5_0.md`,
> `ARBITRAGES_JA_5_0.md` (D1–D12 + adaptation) et
> `12_CONTREPOINT_ET_ADAPTATION.md`.

## Objectif

Préparer la conversation et la décision du praticien, avec le moins de
saisie patient possible. Instrument longitudinal **à trois régimes** :

- **Calibrage** (pré-bilan / pré-protocole) : bilan borné de 3–5 jours à
  double calibrage — clinique (structure et heure des prises, empreintes de
  marqueurs, variabilité → `DietaryObservationProfile` minimal éclairant le
  `ClinicalSnapshot`, sans produire seul une conclusion clinique) et produit
  (charge supportable, moments réalistes → calibre le budget d'attention et
  la politique du régime essai). Prescrit explicitement, jamais imposé.
- **Essai** (après protocole — le noyau) : observer si une action
  alimentaire validée est réellement praticable dans la vie du patient —
  occasions, praticabilité, frictions, adaptations — pendant un tour borné,
  pour éclairer la décision au point d'étape suivant.
- **Silence** (protocole d'abstention) : zéro observation prescrite ;
  l'épisode n'existe que comme ancre de conversation à la revue.

On ne décrit pas les repas de façon exhaustive ; on ne transforme aucune
observation en score clinique officiel ni en réponses de questionnaire.

## Frontières

**Possède** : épisodes d'observation (`FoodObservationEpisode`, objet unique
porteur d'un régime `calibrage | essai | silence` ; en régime essai :
hypothèse et versions d'action idéale/simple/secours), **carrière d'action**
(proposée → essayée → adaptée → stabilisée → intégrée/abandonnée-informative,
à travers les tours), bilan de calibrage et son profil observationnel
minimal, traces occasion/praticabilité/friction, registre de frictions
versionné à catégories fermées, corrections/suppressions événementielles
(append-only), couverture et limites explicites, constats directs
d'adhésion, solutions personnelles intra-épisode, plan minimal, parité
papier (carte A6), quatre lectures séparées (déclaré/observé/vécu/interprété),
delta de décision, agrégats descriptifs et discordances.

**Consomme** : charte patient HC-F ; **codes des aliments moyens Ciqual**
(référence documentaire — les valeurs nutritionnelles viendront du
référentiel C5A, jamais portées par le JA) ; **assiettes recommandées C5B**
(l'action d'un essai peut en référencer une — boucle A7-13, sans dépendance
à la livraison d'`assiette_type`). Le futur branchement patient consommera
un protocole actif C2 ; C5 pourra lire les observations et la faisabilité
publiées sans posséder le journal ; la persistance des solutions entre
épisodes consommera l'identité durable IDP ; la trace rapide consommera le
canal notifications.

**Ne possède pas** : score Mon équilibre, scoring SIIN, référentiel
nutritionnel scoré (C5A), assiettes types (C5B), décision C1,
contextualisation C5, persistance C2, projections questionnaire, météo
d'adhésion agrégée (SP-MET), capture photo/voix (différée), comparaison
multi-épisodes automatique, Nutrition Lab avancé, cabinet apprenant —
et **aucun moteur avant preuve du besoin** (au volume attendu, la
restitution simple bat le calcul).

## Décisions actées

- **A7 au registre** : trois régimes avec objet unique (A7-11 amendé) ;
  noms « Ma spirale alimentaire » (patient, vocabulaire « essai ») et
  « Trajectoire alimentaire » (praticien) ; D1–D12 tranchés — politique
  focalisée par défaut en régime essai, calibrage prescrit explicitement,
  durée cible adaptative, suffisance par type de question versionnée,
  photo/voix différées avec politiques actées, solutions gatées IDP, plan
  minimal libre 1/3/7 j, constats directs (agrégation → SP-MET),
  notifications « pourquoi maintenant » avec trace rapide, comparaison
  gatée, « simulateur d'action », J21 par assignation explicite.
- **A7-12 Ciqual** : registre de marqueurs adossé aux codes des 191 aliments
  moyens Ciqual (Etalab 2.0), 12 aliments vedettes du slice C5 en
  sous-ensemble ; aucune valeur nutritionnelle dans le JA.
- **A7-13 Assiettes** : boucle recommandation (C5B) ↔ essai (JA) ;
  vocabulaire « **recommandation** d'assiette », jamais « prescription »
  (R4).
- **A7-14 Contrepoint** : validation terrain avant domaine, carrière
  d'action, question du jour, friction-agenda, revue = décision pré-remplie,
  parité papier, delta de décision instrumenté dès le premier lot,
  affichage-avant-moteurs, budget de charge global au protocole (contrainte
  signalée vers C2A).
- Boucle patient-praticien fermée : retour de décision (Relu → Validé →
  Envoyé), tour suivant préparé (praticien seul), charge perçue en clôture.
- Domaine TypeScript pur avant toute persistance.
- Aucune projection automatique vers `Q_ALI_01` ou `Q_ALI_02`.
- Les marqueurs (adossés Ciqual) et le registre de frictions sont des
  candidats à auditer, pas un référentiel canonique.
- Toute migration, durée de conservation ou activation patient exige un gate
  C2/RGPD distinct.

## Lots à compiler

| Lot | Objet | Gate |
|---|---|---|
| JA-00 | Audit clinique/RGPD : registre de marqueurs adossé aux 191 aliments moyens Ciqual (12 vedettes du slice C5 incluses), registre de frictions, couverture, rétention, critères de prudence relationnelle (doc 09 §4.7), arbitrages calibrage restants (doc 11 §12 allégé : questions du bilan, marqueurs pilotes, place du profil dans le ClinicalSnapshot, comparaison questionnaires) | validation praticien |
| JA-0T | Validation terrain : 5 entretiens patients (E1 boucle courte, E5 acceptabilité — doc 09 §6), test de la carte papier A6, enseignements consignés | — (parallèle à JA-00) ; go/no-go du noyau |
| JA5-01 | Domaine TypeScript pur : épisode à trois régimes, carrière d'action, question du jour compilée, calibrage (profil minimal + charge), capture occasion/praticabilité/friction, budget d'attention, delta de décision, constats directs, quatre lectures, tests Vitest — restitution simple, **aucun moteur** | JA-00 + JA-0T |
| JA5-02 | Parcours patient : question du jour, plan minimal, solutions intra-épisode, parité papier (carte A6 imprimable + saisie praticien en 30 s) | JA5-01 |
| JA5-03 | Parcours praticien : bilan de calibrage restitué, « 3 moments à explorer » (friction-agenda), revue = décision pré-remplie (Accepter/Modifier), action référençant une assiette recommandée | JA5-02 |
| JA5-04 | Persistance : épisodes, événements, solutions, carrière d'action, RLS patient-scopé, audit append-only | C2A + confirmation migration explicite |
| JA5-05 | Activation : liaison protocole actif, jalons, PhaseReview avec delta, retour de décision, charge perçue, budget de charge global protocole (avec C2A) | JA5-04 |

Différés hors campagne, chacun avec son gate propre : capture photo/voix
(choix TRUST + validation de la boucle simple), météo agrégée (SP-MET),
persistance des solutions (IDP), comparaison multi-épisodes (C2A + IDP),
Nutrition Lab et simulateur d'action, cabinet apprenant, **gouvernance
métrologique complète du calibrage** (lot conditionnel — déclenché si le
profil observationnel pèse dans les décisions cliniques).
