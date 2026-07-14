---
id: "wellneuro-wn-auto-maturite-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Maturité WN-AUTO — évaluation, contexte minimal et orchestration bornée

Ce document formalise la prochaine marche d’industrialisation de WN-AUTO.
Il ne remplace ni `docs/claude/REGISTRE_FRONTIERES.md` ni les campagnes en
cours. Il synthétise les évolutions à privilégier pour rendre l’autonomie
plus fiable, moins coûteuse en contexte et plus sûre à maintenir.

## 1. Principe directeur

Avant d’augmenter l’autonomie, il faut mesurer la qualité.

Le système cible combine trois couches :

1. un banc d’essai permanent avec invariants et cas dorés ;
2. une cartographie d’impact avant chaque lot ;
3. une orchestration événementielle avec budgets bornés.

Sans ces trois couches, l’autonomie produit plus de volume mais pas plus de
fiabilité.

## 2. Banc d’essai permanent

Répertoire de référence proposé :

```text
tests/wellneuro/
├── golden/
│   ├── questionnaires/
│   ├── scorings/
│   ├── parcours-patient/
│   ├── parcours-praticien/
│   └── sorties-ia/
├── invariants/
├── fixtures/
└── evals/
```

### Invariants à vérifier en continu

- un score ne change pas sans modification explicitement autorisée ;
- une réponse patient ne peut pas être visible par un autre patient ;
- un praticien n’accède qu’aux dossiers autorisés ;
- une synthèse IA ne peut pas être publiée sans validation ;
- aucun texte d’interface n’est introduit en anglais ;
- aucun secret ne figure dans le dépôt ;
- aucune migration n’est créée implicitement ;
- aucune donnée réelle n’apparaît dans les tests ou les logs.

### Cas dorés de scoring

Chaque questionnaire critique doit disposer d’un cas doré versionné :

```json
{
  "questionnaire": "HAD",
  "reponses": [3, 0, 2, 1],
  "score_attendu": {
    "anxiete": 5,
    "depression": 1
  },
  "version_regle": "HAD-v2-certifiee"
}
```

L’objectif est de détecter immédiatement toute dérive du moteur générique
de scoring, même si l’interface ou les routes restent inchangées.

## 3. Séparation code / doctrine clinique

La séparation à maintenir est la suivante :

- code applicatif ;
- règles de scoring ;
- règles d’interprétation ;
- corpus documentaire ;
- prompts IA ;
- modèles de documents.

Chaque objet clinique ou documentaire devrait porter au minimum :

- `id` ;
- `version` ;
- `statut` ;
- `source` ;
- `date_de_validation` ;
- `validateur` ;
- `date_de_revision_prevue` ;
- `empreinte_du_contenu`.

Cette séparation permet de faire passer une tâche en risque rouge dès qu’un
changement touche la doctrine, même si le code exécutant la règle ne change
pas.

## 4. Moteur d’analyse d’impact

Avant chaque lot, l’agent devrait produire une fiche d’impact minimale :

- fichiers directement affectés ;
- fonctions appelantes ;
- routes API concernées ;
- écrans concernés ;
- tests associés ;
- règles cliniques potentiellement affectées ;
- risque de régression.

La première version peut reposer sur :

- l’analyse des imports TypeScript ;
- la recherche des usages Prisma ;
- la cartographie des routes ;
- les liens entre identifiants de questionnaires ;
- les tags présents dans les documents cliniques.

## 5. Orchestration événementielle

Le système doit progressivement passer d’un déclenchement par commandes à
un déclenchement par événements.

Exemples cibles :

- issue `ready` → planification automatique ;
- plan validé → création d’un worktree ;
- code modifié → tests ciblés ;
- PR ouverte → revue IA + sécurité ;
- preview disponible → tests Playwright ;
- PR fusionnée → documentation et journal ;
- erreur Sentry → issue d’incident ;
- dépendance vulnérable → PR corrective ;
- règle clinique bientôt périmée → issue de révision.

Les workflows GitHub agentiques sont utiles pour le triage et la
documentation, mais les contrôles de sécurité et de déploiement doivent
rester déterministes.

## 6. Routeur de modèles

Le bon principe est : outil déterministe d’abord, petit modèle ensuite,
grand modèle seulement en cas de besoin.

### Routage recommandé

- classer une issue : modèle économique ;
- résumer un log : modèle économique ;
- trouver les fichiers concernés : intermédiaire ;
- écrire un test simple : intermédiaire ;
- implémenter un lot complexe : puissant ;
- examiner une règle clinique : puissant ;
- arbitrer deux solutions contradictoires : puissant ;
- vérifier formatage, types, secrets : aucun LLM.

Le routeur doit aussi savoir rétrécir le contexte avant d’appeler un modèle
plus coûteux.

## 7. Budgets par tâche

Chaque issue ou lot devrait porter un budget explicite :

```yaml
agent_budget:
  max_iterations: 3
  max_files_modified: 8
  max_diff_lines: 400
  max_context_files: 12
  max_parallel_agents: 2
  escalation_after_failures: 2
```

Quand le budget est dépassé, l’agent ne continue pas à l’aveugle. Il doit
rendre :

- ce qui a été compris ;
- ce qui a été tenté ;
- pourquoi cela bloque ;
- les fichiers concernés ;
- la décision attendue.

## 8. Contexte minimal et context packs

Le contexte transmis à chaque agent doit être réduit au strict nécessaire :

1. règles permanentes ;
2. lot courant ;
3. fichiers concernés ;
4. tests concernés ;
5. diff actuel.

Un contexte pack cible peut vivre sous :

```text
.wn/context/
├── project-core.md
├── current-campaign.md
├── current-lot.md
├── affected-files.md
├── recent-decisions.md
├── relevant-tests.md
└── prohibited-actions.md
```

Optimisations souhaitées :

- empreinte SHA des documents ;
- absence de retransmission des fichiers inchangés ;
- résumé hiérarchique des gros fichiers ;
- extraits localisés par symboles et fonctions ;
- purge du contexte après chaque lot ;
- journal des décisions séparé du journal technique ;
- handoff final inférieur à 1 000 mots.

## 9. Isolation par worktree

Chaque tâche parallèle doit disposer de son propre Git worktree.

Exemple :

```text
../wellneuro-main
../wellneuro-task-142
../wellneuro-task-143
```

Cette isolation réduit les conflits, simplifie l’abandon d’une tentative et
permet de comparer plusieurs solutions sans mélange d’état.

## 10. Revue indépendante et agent contradicteur

La revue croisée doit rester proportionnée au risque.

- risque vert : un agent + contrôles déterministes ;
- risque orange : un agent implémente + un autre relit ;
- risque rouge : un agent planifie + un agent critique, sans implémentation
  autonome.

Pour les changements sensibles, un agent contradicteur doit chercher les
cas qui cassent la solution : entrées inattendues, contournement des droits,
valeurs limites, double soumission, deux onglets ouverts, expiration de
session, fuite de donnée sensible.

## 11. Sandbox sans données réelles

Le système doit disposer d’un environnement sandbox totalement séparé de la
production et limité aux trois patients fictifs autorisés : Sophie Nicola,
Jennifer Martin et Michel Dogné.

Cette sandbox sert aux agents pour :

- créer des patients fictifs ;
- assigner des questionnaires ;
- remplir automatiquement ;
- générer des scores ;
- produire des synthèses ;
- tester les exports ;
- supprimer et restaurer.

L’objectif est d’éviter tout besoin d’accès à la production pour les tests
ordinaires.

## 12. Preview et validation réelle

Le pipeline cible doit s’appuyer sur les previews, pas seulement sur le
code local.

Chaîne recommandée :

```text
Tests unitaires
      ↓
Build
      ↓
Preview protégée
      ↓
Tests Playwright réels
      ↓
Tests visuels
      ↓
Tests d’accessibilité
      ↓
Validation du déploiement
```

Les tests visuels doivent couvrir au minimum :

- mobile patient ;
- dashboard praticien ;
- questionnaires longs ;
- graphiques ;
- tableaux de résultats ;
- documents PDF ;
- états vides ;
- erreurs de formulaire.

## 13. Score de confiance de PR

Chaque PR automatisée devrait recevoir un score calculé, non déclaré par
l’IA.

Exemple de formule cible :

```text
Confiance =

tests réussis
+ couverture du diff
+ faible surface de modification
+ absence de zone sensible
+ revue indépendante validée
+ preview réussie
- fichiers critiques touchés
- dépendance nouvelle
- comportement non testé
- modification clinique
```

Le score sert à décider si l’autofusion est autorisée ou interdite.

## 14. Observabilité des agents

Les agents doivent être observés comme n’importe quel composant logiciel.

Indicateurs utiles :

- taux de lots réussis au premier passage ;
- nombre moyen de boucles de correction ;
- tokens consommés par type de tâche ;
- coût moyen par PR ;
- temps agent par lot ;
- pourcentage de PR rejetées ;
- régressions après fusion ;
- nombre de fichiers modifiés hors périmètre ;
- tests ajoutés par fonctionnalité ;
- taux de tâches nécessitant une intervention humaine.

## 15. Mémoire de décisions

Le système doit conserver les décisions, pas la conversation brute.

Une structure d’ADR ou de décision technique peut couvrir :

- contexte ;
- décision ;
- options rejetées ;
- conséquences ;
- date ;
- statut.

Cette mémoire évite de rouvrir sans cesse les arbitrages déjà tranchés.

## 16. Portail de commande minimal

À terme, un panneau engineering privé pourrait exposer :

- campagne active ;
- prochain lot ;
- agents en cours ;
- coût du mois ;
- PR à valider ;
- incidents ;
- dette technique ;
- état des dépendances ;
- révisions cliniques à prévoir.

Actions possibles :

- créer une campagne ;
- lancer le prochain lot ;
- suspendre les agents ;
- valider une PR ;
- refuser et commenter ;
- déclencher un audit ;
- générer un résumé de session.

## 17. Séquencement recommandé

### WN-AUTO v1 — priorité immédiate

1. matrice des risques ;
2. budgets par tâche ;
3. worktrees isolés ;
4. tests dorés des scorings ;
5. invariants de sécurité ;
6. context packs ;
7. état machine des campagnes ;
8. arrêt après trois échecs ;
9. rapport standard de PR ;
10. aucun accès production.

### WN-AUTO v2 — orchestration GitHub

1. GitHub Project et labels ;
2. machine à états ;
3. lancement depuis les issues ;
4. CI complète ;
5. previews protégées ;
6. Playwright ;
7. revue indépendante pour les tâches orange ;
8. autofusion limitée aux tâches vertes.

### WN-AUTO v3 — maintenance autonome

1. triage automatique des incidents ;
2. audit hebdomadaire ;
3. veille des dépendances ;
4. contrôle de dérive documentaire ;
5. analyse du coût et des performances ;
6. propositions de refactorisation ;
7. rappels de révision clinique ;
8. préparation automatisée des releases.

## 18. Ce qu’il ne faut pas faire

- mettre plusieurs agents en parallèle sur les mêmes fichiers ;
- laisser un agent fusionner une PR clinique ;
- construire un orchestrateur complexe sur mesure trop tôt ;
- donner un accès Supabase de production aux agents ;
- laisser les agents choisir seuls une migration ;
- automatiser les mises à jour majeures de dépendances ;
- stocker tout l’historique conversationnel comme contexte ;
- créer une boucle infinie jusqu’à réussite ;
- laisser une IA juger seule la qualité d’une autre IA.

## 19. Lecture d’ensemble

L’optimisation centrale n’est pas d’ajouter plus d’agents. C’est de donner
à chaque agent moins de contexte, moins de droits, un objectif plus petit et
une évaluation plus déterministe.
