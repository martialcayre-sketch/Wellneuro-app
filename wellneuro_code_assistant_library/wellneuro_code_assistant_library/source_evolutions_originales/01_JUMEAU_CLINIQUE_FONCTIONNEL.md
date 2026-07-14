# 01 — Jumeau clinique fonctionnel

## Intention

Créer pour chaque patient un **profil fonctionnel vivant**, non diagnostique, qui relie les données déjà disponibles :

- plaintes ;
- questionnaires ;
- scores ;
- priorités Mon équilibre ;
- protocole en cours ;
- check-ins ;
- alimentation ;
- compléments ;
- biologie disponible ou suggérée ;
- messages ;
- momentum.

Ce n’est pas un diagnostic. C’est une **cartographie évolutive de travail**.

## Formulation produit

### Côté praticien

> Profil fonctionnel consolidé

### Côté patient

Ne pas exposer le terme “jumeau clinique”. Utiliser :

> Votre parcours  
> Votre équilibre actuel  
> Votre progression

## Exemple fictif

```text
Sophie Nicola

Hypothèse fonctionnelle actuelle :
Sommeil irrégulier + énergie matinale fragile + densité micronutritionnelle à renforcer.

Ce qui soutient la progression :
- meilleure régularité des repas ;
- check-ins réguliers ;
- bonne compréhension du protocole.

Ce qui reste fragile :
- coucher tardif ;
- faible exposition lumineuse le matin ;
- alimentation du soir peu stabilisante.

Prochaine décision :
poursuivre phase 1 ou introduire un bloc chronobiologie.
```

## Données en entrée

| Source | Exemple | Statut |
|---|---|---|
| Questionnaires | PSQI, HAD, DNSM, mode de vie | Donnée structurée |
| Mon équilibre | 12 besoins, 3 strates | Calcul déterministe/versionné |
| Protocole | phases, actions, compléments | Validé praticien |
| Suivi | check-ins, adhésion | Déclaratif patient |
| Nutrition | Boussole, journal, aliments vedettes | Estimation/contextuel |
| Biologie | résultats ou packs suggérés | HDS si stockage réel |
| Messagerie | questions, effets ressentis | Donnée sensible, contextualisée |

## Objets conceptuels

```text
patient_functional_profile
- patient_id
- current_phase
- dominant_needs[]
- active_priorities[]
- improving_signals[]
- resistant_signals[]
- adherence_summary
- latest_momentum_snapshot
- practitioner_note
- generated_summary_status
- validated_at
```

```text
functional_hypothesis
- id
- patient_id
- title
- supporting_evidence[]
- contradictory_evidence[]
- confidence_label: faible | modéré | fort
- evidence_levels: A/B/C/D
- status: brouillon | validé | archivé
```

## UX praticien

Dans la fiche patient :

```text
[Vue clinique]

Résumé fonctionnel
──────────────────
Hypothèse actuelle
Priorités 21 jours
Signaux convergents
Signaux discordants
Prochaine décision proposée
```

### Détail explicable

Chaque phrase doit pouvoir s’ouvrir :

```text
Pourquoi ?
- PSQI élevé
- check-ins sommeil bas
- dîner tardif noté 4 fois
- protocole sommeil suivi à 52 %
```

## UX patient

Le patient ne voit pas le modèle complet.

```text
Votre priorité actuelle
──────────────────────
Cette semaine, nous travaillons surtout sur :
- votre rythme de sommeil ;
- votre énergie du matin ;
- la régularité du protocole.
```

## Règles cliniques

- Toujours parler d’hypothèse fonctionnelle, jamais de diagnostic.
- Ne jamais donner une causalité unique.
- Toujours afficher les données contradictoires côté praticien.
- Toujours distinguer “signal patient”, “score questionnaire”, “biologie” et “interprétation”.
- Toute synthèse patient doit être validée.

## Innovations possibles

### 1. Vue “signal convergent”

```text
Fatigue
├── plainte élevée
├── sommeil non réparateur
├── alimentation matin faible en protéines
└── biologie B12 à explorer
```

### 2. Vue “signal discordant”

```text
Stress déclaré bas
mais :
- réveils nocturnes ;
- tension corporelle ;
- hyperexcitabilité élevée.
```

### 3. Historique des hypothèses

```text
T0 : sommeil prioritaire
J21 : digestion devient prioritaire
J42 : énergie mitochondriale à explorer
```

## Critères d’acceptation

- Un praticien peut voir en un écran :
  - priorité actuelle ;
  - hypothèse fonctionnelle ;
  - signaux convergents ;
  - signaux discordants ;
  - prochaine action.
- Le patient ne voit qu’une version simplifiée.
- Aucune donnée réelle non validée n’est exposée comme conclusion.
- Les niveaux de preuve restent visibles côté praticien.

## Prompt agent dev

```text
Tu travailles sur WellNeuro. Conçois le module “Profil fonctionnel consolidé” sans implémenter de diagnostic. Respecte les invariants projet : UI française, aucune donnée patient réelle, patients fictifs uniquement Sophie Nicola/Jennifer Martin/Michel Dogné, pas de migration sans confirmation. Propose une architecture UX et des objets conceptuels pour relier questionnaires, Mon équilibre, protocole, check-ins, nutrition, compléments, biologie et messagerie. L’objectif est d’aider le praticien à comprendre la trajectoire du patient et à préparer la prochaine décision J21.
```

## Questions ouvertes

- Le profil fonctionnel doit-il être généré automatiquement à chaque nouveau check-in ou uniquement aux jalons J7/J21 ?
- Faut-il une validation praticien pour toute mise à jour visible patient ?
- Comment archiver les anciennes hypothèses sans les effacer ?
