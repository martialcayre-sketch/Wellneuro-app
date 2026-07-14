# 00 — Index stratégique WellNeuro 3.0 / 4.0

## Vision

WellNeuro doit évoluer d’un outil de questionnaires et de synthèse vers un **système longitudinal d’aide à la décision neuronutritionnelle**, centré sur la prochaine action utile, réaliste et validée.

La question produit centrale :

> Quelle est la prochaine action utile, réaliste, sûre et compréhensible pour ce patient, dans les 21 prochains jours ?

## Architecture cible

```text
Questionnaires
  ↓
Mon équilibre / Cartographie neuro-fonctionnelle
  ↓
Priorités cliniques 21 jours
  ↓
Protocole personnalisé validé
  ├── Boussole alimentaire / Ciqual
  ├── Bibliothèque compléments clean label
  ├── Explorations biologiques à discuter
  ├── Fiches conseils
  ├── Messagerie contextualisée
  └── Suivi / momentum / ajustements
```

## Les 10 évolutions majeures

1. Jumeau clinique fonctionnel.
2. Protocole adaptatif 21 jours.
3. GPS alimentaire basé sur Boussole + Ciqual.
4. Moteur de cohérence nutraceutique clean label.
5. Biologie raisonnée et packs dynamiques.
6. Compagnon patient quotidien.
7. Messagerie contextualisée.
8. Momentum et prévention du décrochage.
9. Documents / booklets multi-destinataires.
10. Copilotes IA spécialisés.

## Principe d’interface

### Côté praticien

Interface dense, explicable, orientée décision :

```text
Cockpit praticien
├── Patients à traiter
├── Protocoles à valider
├── Messages à relire
├── Jalons J21/J42/J90
├── Explorations biologiques à préparer
└── Signaux de décrochage
```

### Côté patient

Interface calme, simple, centrée sur l’action du jour :

```text
Aujourd’hui
├── Une action prioritaire
├── Un check-in court
├── Une fiche utile
└── Un message praticien si nécessaire
```

## Règles transverses

- Ne jamais afficher un score sans phrase d’interprétation.
- Ne jamais culpabiliser le patient.
- Ne jamais présenter une recommandation comme une vérité absolue.
- Ne jamais confondre hypothèse fonctionnelle et diagnostic.
- Ne jamais automatiser la diffusion patient sans validation praticien.
- Toujours distinguer :
  - donnée calculée ;
  - donnée déclarative ;
  - donnée biologique ;
  - interprétation IA ;
  - validation praticien.

## Objets fonctionnels transverses

| Objet | Rôle |
|---|---|
| `patient_functional_profile` | Vue consolidée non diagnostique du patient. |
| `care_plan` | Plan vivant validé par le praticien. |
| `care_plan_phase` | Phase J1-J21, J22-J42, J43-J90. |
| `care_action` | Action alimentaire, complément, routine, exploration, fiche. |
| `momentum_snapshot` | État longitudinal à T0/J21/J42/J90. |
| `patient_checkin` | Mini-retour patient. |
| `message_context` | Ancrage d’un message à un protocole, complément ou fiche. |
| `document_bundle` | Ensemble de documents produits pour patient/médecin/praticien. |

## Cible produit à long terme

```text
WellNeuro observe.
WellNeuro organise.
WellNeuro propose.
Le praticien valide.
Le patient suit.
WellNeuro mesure.
Le praticien ajuste.
```

## Critère de réussite global

Le praticien doit pouvoir ouvrir une fiche patient et répondre en moins de 2 minutes :

1. Où en est ce patient ?
2. Quelle est sa priorité actuelle ?
3. Le protocole est-il suivi ?
4. Y a-t-il un signal faible ?
5. Quelle décision prendre pour les 21 prochains jours ?
