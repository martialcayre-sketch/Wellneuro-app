# Brief compilé — WN-AUTO : Orchestration GitHub et boucles autonomes

## 1. Objectif métier

Rendre le développement WellNeuro largement autonome sur les tâches sûres, tout en empêchant toute
modification solitaire des éléments cliniques, des données de santé, de l’authentification, des migrations
ou de la production.

## 2. Problème à résoudre

Le kit `/wn` sait déjà structurer, tester et documenter, mais il reste principalement local et manuel. La
mémoire durable doit migrer vers GitHub pour que les campagnes, lots, validations et revues indépendantes
soient traçables et reprenables.

## 3. Utilisateurs concernés

- Développeur principal.
- Relecteur IA indépendant.
- Praticien valideur des décisions sensibles.

## 4. Parcours cible

`/wn-auto` → triage → campagne → lots GitHub → tests → boucle de réparation → revue indépendante → preview
protégée → validation humaine → fusion.

## 5. Composants et capacités candidates

- routeur de risque et de périmètre ;
- matrice vert/orange/rouge ;
- création/lecture de issues et PR ;
- boucle de test-réparation bornée ;
- reviewer indépendant ;
- gate de preview et de release ;
- observabilité et incidents expurgés.

## 6. Données / modèles / intégrations pressenties

- GitHub Issues ;
- GitHub Projects ;
- GitHub Actions ;
- Vercel Preview Protection ;
- Sentry sans PII ;
- fichiers de configuration documentaire sous `docs/ai/`.

## 7. Contraintes projet

- aucun secret en dur ;
- UI et documentation en français ;
- aucun changement clinique sans validation ;
- aucune migration Prisma/SQL sans confirmation ;
- aucune écriture Supabase ;
- aucun déploiement production automatique.

## 8. Risques et dépendances

- dérive entre skills, documentation et chaîne GitHub ;
- sur-automatisation des tâches orange ;
- coûts CI si les tests ne sont pas ciblés ;
- nécessité d’un garde-fou explicite contre migration, auth et clinique.

## 9. Décisions prises

- l’autonomie est bornée, pas absolue ;
- les tâches rouges restent planificatrices seulement ;
- une revue indépendante est obligatoire avant toute fusion sensible ;
- la mémoire durable doit être la campagne et non la session.

## 10. Questions ouvertes

- où stocker la matrice de risque canonique ;
- quel niveau de granularité pour les labels GitHub ;
- quelle forme donner au state machine partagé ;
- comment réduire le bruit des retries de test.

## 11. Sources compilées

- proposition utilisateur WN-AUTO ;
- `docs/claude/campagnes/README.md` ;
- `docs/claude/CLAUDE_MD_MINIMAL_WELLNEURO.md` ;
- `README_AUTOMATISATION_CLAUDE_CODE.md` ;
- `.claude/skills/wn/*.md` ;
- `.claude/skills/wn-campaign-run/SKILL.md` ;
- `.claude/skills/wn-context/SKILL.md`.
