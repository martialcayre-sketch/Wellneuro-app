# 12 — Prompts pour brainstorming IA et moteur de dev

## Prompt global brainstorming produit

```text
Tu es expert produit santé numérique, UX clinique, neuronutrition et architecture SaaS. Aide-moi à faire évoluer WellNeuro vers un système longitudinal d’aide à la décision neuronutritionnelle. Respecte ces invariants : interface française, pas de diagnostic automatique, pas de prescription automatique, validation praticien obligatoire, patients fictifs uniquement Sophie Nicola/Jennifer Martin/Michel Dogne. Propose des idées créatives mais implémentables, en distinguant V1, V2 et vision long terme.
```

## Prompt architecture fonctionnelle

```text
Analyse l’architecture fonctionnelle cible de WellNeuro autour de 5 moteurs : Mon équilibre, Protocole Builder, Boussole alimentaire/Ciqual, Compléments clean label, Momentum/messagerie. Propose les objets métier, les flux, les dépendances, les zones à ne pas mélanger dans une même PR et les risques réglementaires.
```

## Prompt UX praticien

```text
Conçois le cockpit praticien WellNeuro 3.0. Objectif : ouvrir l’app et voir immédiatement les patients à traiter, protocoles à valider, messages à relire, jalons J21/J42/J90 et signaux de décrochage. Propose wireframes textuels, composants, navigation, états vides et version mobile/tablette. Style : thème praticien sombre deep teal/champagne gold.
```

## Prompt UX patient

```text
Conçois le dashboard patient WellNeuro comme un compagnon quotidien calme. Il doit montrer Mon équilibre, la priorité actuelle, les actions du jour, le check-in 15 secondes, les fiches utiles et les messages praticien. Langage rassurant, non culpabilisant, mobile-first. Propose microcopy française et états J0/J7/J21.
```

## Prompt protocole builder

```text
Développe le Protocole Builder 21 jours. Il assemble alimentation, compléments, routines, explorations biologiques et fiches conseils. Il mesure la charge thérapeutique, prépare des ajustements J7/J14/J21, et nécessite validation praticien. Fournis UX, objets conceptuels, règles cliniques, garde-fous, critères d’acceptation.
```

## Prompt Boussole alimentaire

```text
Développe le GPS alimentaire WellNeuro : produit, panier, repas, journée, semaine. Il s’appuie sur Ciqual, Open Food Facts en cache, aliments vedettes et mapping WellNeuro. Le score intrinsèque aliment est indépendant du patient ; la lecture contextuelle dépend du protocole actif. Propose UX, messages patient, substitutions, assiettes types, limites et V1 réaliste.
```

## Prompt compléments clean label

```text
Développe le module Compléments clean label. Il doit classer produits et formes selon qualité, additifs, biodisponibilité, contraintes patient, tolérance digestive, cohérence de protocole et alternatives. L’objectif est d’aider le praticien à sélectionner, pas de prescrire automatiquement. Propose fiches, badges, filtres, moteur de vigilance et UX.
```

## Prompt biologie raisonnée

```text
Développe le module Biologie raisonnée. Il propose des explorations à discuter avec le médecin, organisées en niveaux 1/2/3 et packs dynamiques. Il ne stocke pas de résultats réels avant cadre HDS. Prévois document médecin, fiche patient pédagogique, T0/T1 et traçabilité sans écraser les questionnaires.
```

## Prompt messagerie contextualisée

```text
Conçois la messagerie contextualisée WellNeuro. Évite le chat libre médical. Le patient choisit un contexte : protocole, complément, alimentation, biologie, effet ressenti, administratif. L’IA prépare un brouillon pour le praticien, jamais une réponse automatique clinique. Prévois triage, templates, tâches, lien au protocole.
```

## Prompt momentum

```text
Développe le module Momentum. Il suit T0/J7/J14/J21/J42/J90, distingue progression clinique, adhésion, régularité des check-ins, tolérance et risque de décrochage. Propose UX praticien/patient, signaux faibles, actions suggérées, microcopy non culpabilisante.
```

## Prompt documents

```text
Conçois le système documentaire WellNeuro. Il doit générer des booklets patient, documents médecin, bilans praticien, fiches conseils, fiches compléments et bilans J21. Même source clinique, plusieurs formats selon destinataire. Prévois sections modulaires, statuts IA/validation, export et garde-fous.
```

## Prompt critique

```text
Critique cette proposition WellNeuro comme si tu étais : 1) développeur senior Next.js/Prisma, 2) UX designer santé, 3) expert conformité santé numérique, 4) praticien en neuronutrition, 5) patient anxieux. Liste risques, angles morts, simplifications nécessaires et priorités.
```

## Prompt découpage PR

```text
Découpe ce module en PR courtes. Pour chaque PR : nom de branche, objectif, fichiers probables, ce qui est explicitement hors périmètre, critères d’acceptation, tests, risques de régression. Respecte : pas de migration sans confirmation, pas de données patient réelles, UI française.
```
