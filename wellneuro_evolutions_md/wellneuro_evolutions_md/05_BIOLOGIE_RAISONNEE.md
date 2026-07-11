# 05 — Biologie raisonnée

## Intention

Créer un module d’explorations biologiques raisonnées, hiérarchisées, à discuter avec le médecin.

L’app ne diagnostique pas. Elle aide à préparer un raisonnement, une priorisation, un document clair et une discussion médicale.

## Vocabulaire

Utiliser : exploration biologique, marqueur, bilan à discuter, niveau de priorité, élément d’orientation, à valider par le médecin.

Éviter : prescription automatique, diagnostic, anomalie certaine, carence certaine sans résultat validé.

## Niveaux de bilan

```text
Niveau 1 — Socle
Marqueurs simples et prioritaires.

Niveau 2 — Orientation fonctionnelle
Marqueurs utiles selon les questionnaires.

Niveau 3 — Spécialisation
Marqueurs avancés selon contexte clinique.
```

## Packs dynamiques

### Pack fatigue

```text
Niveau 1 :
NFS, ferritine, CRP-us, vitamine D, B12 active, folates, TSH.

Niveau 2 :
magnésium érythrocytaire, zinc/cuivre, homocystéine, HOMA.

Niveau 3 :
profil acides gras érythrocytaires, CoQ10, cortisol salivaire.
```

### Pack stress / axe HPA

```text
Niveau 1 :
CRP-us, glycémie/insuline, vitamine D, magnésium.

Niveau 2 :
cortisol salivaire matin/soir, DHEA, alpha-amylase.

Niveau 3 :
CAR, profil complet rythme cortisol.
```

### Pack intestinal

```text
Niveau 1 :
CRP-us, NFS, ferritine.

Niveau 2 :
calprotectine, IgA sécrétoires, zonuline, LBP.

Niveau 3 :
SCFA, microbiote selon contexte.
```

### Pack inflammation basse

```text
Niveau 1 :
CRP-us, VS, ferritine.

Niveau 2 :
profil acides gras érythrocytaires, oméga-3 index.

Niveau 3 :
marqueurs spécialisés selon médecin.
```

## Objets conceptuels

```text
biomarker_catalog_item
- code
- label_fr
- category
- clinical_use
- linked_needs[]
- sample_type
- priority_default
- explanation_patient
- explanation_practitioner
- constraints
```

```text
biology_pack
- id
- name
- indication
- biomarkers_level_1[]
- biomarkers_level_2[]
- biomarkers_level_3[]
- generated_from_signals[]
```

```text
biology_recommendation_bundle
- patient_id
- selected_packs[]
- selected_markers[]
- practitioner_note
- physician_note
- status: brouillon | validé | remis_patient | archivé
```

## T0 / T1

Ne jamais écraser la donnée questionnaire par la biologie.

```text
T0 :
questionnaires et plaintes.

T1 :
résultats biologiques disponibles.

Lecture :
le signal est confirmé, nuancé ou non retrouvé.
```

## UX praticien

```text
Biologie — Sophie Nicola

Signaux actuels :
- fatigue élevée ;
- sommeil non réparateur ;
- apports estimés B9/B12 bas.

Packs proposés :
[Socle neuronutrition]
[Fatigue]
[Stress]
[Intestin]

Document :
[Générer note médecin]
```

## UX patient

```text
Pourquoi ces explorations ?

Ces analyses peuvent aider votre médecin et votre praticien à mieux comprendre certains signaux : fatigue, sommeil, équilibre micronutritionnel.

Elles ne remplacent pas une consultation médicale.
```

## Document médecin

```text
Objet :
Explorations biologiques à discuter.

Contexte :
Synthèse courte, non diagnostique.

Marqueurs niveau 1 :
liste avec justification brève.

Marqueurs niveau 2 :
selon accord médical.

Zone de validation :
médecin prescripteur.
```

## Innovations

- Biologie minimale pour budget limité.
- Biologie complète pour dossier complexe.
- Biologie séquentielle : d’abord socle, puis compléter.
- Biologie comparée J0 vs J90.
- Fiche pédagogique par marqueur.

## Critères d’acceptation

- Le praticien peut sélectionner/désélectionner chaque marqueur.
- Chaque marqueur a une justification.
- Le document est formulé pour discussion médicale.
- Les résultats réels ne sont stockés que si cadre HDS validé.
- La biologie affine le profil, elle ne remplace pas les questionnaires.

## Prompt agent dev

```text
Conçois le module “Biologie raisonnée” de WellNeuro. Il doit proposer des explorations biologiques hiérarchisées en niveaux 1/2/3, organisées par packs fatigue, stress, intestin, inflammation, micronutrition. L’app ne prescrit pas et ne diagnostique pas : elle prépare un document à discuter avec le médecin. Prévois UX praticien, UX patient, objets conceptuels, T0/T1, dépendance HDS pour stockage de résultats réels, et critères d’acceptation.
```
