---
id: wellneuro-journal-alimentaire-5-0-pack
version: 5.0-proposition
date: 2026-07-16
statut: proposition_a_arbitrer
remplace: wellneuro-journal-alimentaire-21j-v1
---

# WellNeuro — Journal alimentaire 5.0

## Nom produit

- **Nom patient** : **Ma spirale alimentaire**
- **Nom praticien** : **Trajectoire alimentaire**
- **Nom technique** : `FoodObservationEpisode`

Le mot « journal » reste un terme de domaine et de migration. Dans l’interface patient, le produit devient un **carnet de traces utiles**, et non un registre exhaustif de tout ce qui est mangé.

## Décision structurante

```text
La version 1 demandait de renseigner des journées.
La version 5.0 cherche à obtenir juste assez d’observations fiables
pour comprendre une trajectoire, suivre une action et préparer le tour suivant.
```

La 5.0 ne modifie pas le noyau clinique : questionnaires, ClinicalSnapshot, DecisionCard, ProtocolDraft et validation praticien restent souverains. Elle ajoute une couche de mémoire, de temporalité et d’adaptation conforme au programme WellNeuro 5.0 « la Spirale ».

## Contenu du pack

1. `docs/00_DOCTRINE_5_0_ET_DECISION_PRODUIT.md`
2. `docs/01_EXPERIENCE_PATIENT_MA_SPIRALE_ALIMENTAIRE.md`
3. `docs/02_FIL_DU_JOUR_ET_NUTRITION_LAB.md`
4. `docs/03_MODELE_CLINIQUE_ET_MOTEUR_OBSERVATION.md`
5. `docs/04_ARCHITECTURE_TECHNIQUE_ET_CONTRATS.md`
6. `docs/05_INNOVATIONS_PRIORISEES.md`
7. `docs/06_ROADMAP_JA_5_0.md`
8. `docs/07_DECISIONS_A_ARBITRER.md`
9. `docs/08_PROMPT_INTEGRATION_CLAUDE_CODE.md`
10. `docs/09_SYNTHESE_CRITIQUE_ET_CAP_PRODUIT.md`
11. `docs/10_VISION_PRODUIT_ET_INNOVATIONS.md`
12. `docs/11_SYNTHESE_FINALE_INSTRUMENT_A_DEUX_REGIMES.md`
13. `prototype/journal-alimentaire-5-0.html`
14. `code/contracts.ts`
15. `code/observation-policy.ts`

## Résumé du nouveau concept

```text
T0 déclaré : Q_ALI_01 / Q_ALI_02
        ↓
Action alimentaire validée dans le ProtocolDraft
        ↓
Politique d’observation adaptative
        ↓
Traces rapides, signatures de repas, voix/photo confirmées
        ↓
Moteur déterministe de couverture, opportunités et discordances
        ↓
FoodTrajectorySnapshot / DietaryTrajectoryFinding
        ↓
Fil du jour + fiche-trajectoire + Nutrition Lab
        ↓
PhaseReview J21 et nouveau tour de Spirale
```

## Principes non négociables

- aucune notation du patient ou du repas ;
- aucune série, badge, trophée ou culpabilisation ;
- aucune absence transformée en zéro ;
- aucune recommandation autonome ;
- aucune inférence nutritionnelle définitive depuis une photo ou une dictée ;
- chaque automatisme dit « pourquoi maintenant » ;
- les propositions IA sont confirmées, sourcées et révocables ;
- l’historique est immuable ; une correction crée un nouvel événement ;
- les photos et transcriptions brutes ne sont pas conservées par défaut ;
- le praticien valide toute action et toute restitution clinique.

## Livrable recommandé pour le dépôt

Ce pack est documentaire et prototypal. Il ne contient ni migration Prisma, ni activation de règle clinique, ni modification de production.
