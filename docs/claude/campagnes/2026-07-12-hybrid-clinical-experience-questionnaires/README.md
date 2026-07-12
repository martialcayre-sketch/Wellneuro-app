# Reprise rapide — Hybrid Clinical et questionnaires

## À lire dans cet ordre

1. `CAMPAGNE.md` — objectif, contraintes, décisions et lots.
2. `BRIEF_COMPILED.md` — synthèse opérationnelle.
3. `sources/00_DECISION_ET_VISION.md` — décision utilisateur.
4. `sources/01_REFERENCE_HYBRID_CLINICAL.md` — charte visuelle et composants.
5. `sources/02_STANDARD_UX_QUESTIONNAIRES_PATIENT.md` — profils de saisie et expérience patient.
6. `sources/03_GARDE_FOUS_PSYCHOMETRIQUES.md` — intégrité des instruments et randomisation.
7. `sources/04_GOUVERNANCE_UX_FUTURE.md` — règles imposées aux futurs modules.
8. `sources/05_INNOVATIONS_UX_VAGUE_2.md` — mode consultation, timeline, décision clinique, suivi avant/après, confiance patient et productivité.
9. `lots/LOT-00-audit-arbitrages.md` — première action autorisée.

## Démarrage Claude Code

```text
/wn-campaign status
```

Puis :

- vérifier la dernière entrée de `docs/claude/SESSION_LOG.md` ;
- réconcilier `ACTIVE_CAMPAIGN.md` ;
- pointer manuellement la campagne active vers ce dossier ;
- vérifier :

```text
/wn-campaign next
```

- lancer LOT-00 uniquement sur instruction explicite.

## Règle majeure

Ne pas commencer directement par le thème ou les composants. LOT-00 doit d'abord classifier les écrans, les questionnaires et les innovations de vague 2. En cas d'incertitude sur un instrument, sa politique est `strict`. En cas d'incertitude sur une innovation, elle reste au stade prototype ou backlog gouverné.

## Priorités de la vague 2

Les capacités P1 à arbitrer en premier sont :

- mode consultation sans distraction ;
- double niveau de lecture ;
- timeline clinique longitudinale ;
- carte de décision clinique ;
- comparateur avant / maintenant ;
- prévisualisation de la vue patient.

Le constructeur visuel de protocoles 21 jours dépend de l'état de C1 et peut nécessiter une campagne dédiée.

## Règle de randomisation

L'ordre reste fixe par défaut. Seules des options nominales explicitement autorisées peuvent être mélangées, avec une permutation déterministe et des tests de scoring.

## État de cette branche

- documentation uniquement ;
- aucun code applicatif ;
- aucune migration ;
- campagne non activée ;
- pull request à relire puis fusionner avant démarrage.
