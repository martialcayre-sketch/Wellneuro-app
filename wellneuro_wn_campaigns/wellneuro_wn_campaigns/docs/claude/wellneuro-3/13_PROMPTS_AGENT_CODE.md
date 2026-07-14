# 13 — Prompts prêts pour assistant de code

## Prompt de cadrage général

```text
Tu travailles sur le dépôt WellNeuro-app. Respecte strictement : Next.js 14 App Router, TypeScript, Tailwind, Prisma, NextAuth. Tous les textes UI doivent être en français. Aucun secret en dur. Patients fictifs uniquement : Sophie Nicola, Jennifer Martin, Michel Dogné. Pas de migration Prisma/SQL sans confirmation explicite. Ne modifie pas les seuils cliniques ou le scoring sans demande explicite. Le praticien valide toujours avant diffusion patient. Propose une branche courte avec objectif, fichiers probables, hors périmètre, étapes, risques, critères d’acceptation et tests.
```

## Prompt Phase 0 — alignement roadmap

```text
Audite la documentation du dépôt WellNeuro-app pour vérifier la cohérence entre docs/roadmap.md, docs/claude/SESSION_LOG.md, docs/claude/PROJET_CONTEXTE.md et l’état réel des routes liées à Google Sheets/OAuth. Ne modifie pas le code métier. Propose les corrections documentaires minimales. Signale les divergences avant toute modification.
```

## Prompt Phase 1 — shell praticien

```text
Implémente un shell praticien WellNeuro 3.0 avec navigation latérale ou cockpit, sans changer les routes API, Prisma, scoring ou IA. Respecte le thème praticien sombre deep teal/champagne gold et les tokens existants. Tous les textes UI en français. Ajoute des états vides utiles. Ne touche pas aux données.
```

## Prompt Phase 1b — découpage fiche patient

```text
Découpe FichePatientPanel en sous-composants lisibles sans changer le comportement. Objectif : préparer une fiche patient cockpit. Ne modifie ni les appels API, ni le scoring, ni le schéma Prisma. Crée des composants PatientHeader, EquilibreOverview, Priorites21JoursPanel, CorrectionRequestsPanel, QuestionnaireHistoryPanel. Vérifie type-check.
```

## Prompt Phase 1c — résumé décisionnel

```text
Ajoute un bloc DecisionSummaryCard dans la fiche patient. Il doit afficher : Où en est le patient, ce qui converge, ce qui résiste, ce qui manque, décision proposée 21 jours. Utilise uniquement les données déjà disponibles ou des placeholders prudents si insuffisant. Ne pas générer de conclusion médicale. Ne pas appeler l’IA. UI française.
```

## Prompt Phase 2 — protocole minimal

```text
Crée un Protocole Builder 21 jours minimal non persistant. Il permet au praticien de préparer maximum 3 actions, 1 fiche, 1 critère de suivi, avec calcul de charge thérapeutique. Pas de migration DB. Pas d’envoi patient. Validation uniquement visuelle. Fournis types TypeScript, composant UI, fonction calculateTherapeuticLoad et tests simples si possible.
```

## Prompt Phase 2b — charge thérapeutique

```text
Implémente un moteur déterministe de charge thérapeutique pour un protocole 21 jours. Statuts : léger, modéré, chargé, excessif. Un protocole excessif doit afficher une alerte et demander justification praticien avant validation. Pas d’IA. Pas de DB. UI française.
```

## Prompt Phase 3 — documents imprimables

```text
Crée un document HTML imprimable patient à partir d’un protocole 21 jours validé en front. Version V1 sans PDF natif et sans envoi email. Sections : priorité actuelle, actions 21 jours, plan minimal, fiche conseil, suivi J21, limites. Validation praticien obligatoire avant affichage final.
```

## Prompt Phase 4 — compagnon patient

```text
Crée une maquette intégrée du compagnon patient minimal : priorité actuelle, action du jour, fiche utile, check-in court. Ne crée pas de migration. Ne stocke pas encore les check-ins. Langage patient rassurant, mobile-first, sans score anxiogène. UI française.
```

## Prompt critique PR

```text
Critique cette PR WellNeuro comme développeur senior Next.js/Prisma, UX santé, praticien neuronutrition et patient anxieux. Liste les risques, la dette créée, les régressions possibles, les textes problématiques, et les éléments à reporter.
```
