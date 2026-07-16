# Prompt d’intégration — Journal alimentaire WellNeuro 5.0

Tu travailles dans le dépôt `martialcayre-sketch/Wellneuro-app`.

## Objectif

Transformer le journal alimentaire 21 jours existant en **Ma spirale alimentaire**, conformément à `PROGRAMME_WELLNEURO_5_0.md`, sans modifier le scoring de `Q_ALI_01` ou `Q_ALI_02`, sans migration non confirmée et sans recommandation autonome.

## Sources à lire avant tout code

1. `docs/claude/campagnes/PROGRAMME_WELLNEURO_5_0.md`
2. `docs/claude/propositions/2026-07-15-wellneuro-5-0-spirale/BRAINSTORM_SPIRALE.md`
3. `docs/claude/propositions/2026-07-15-wellneuro-5-0-spirale/ARBITRAGES_QUESTIONS_OUVERTES.md`
4. la campagne JA existante ;
5. la campagne C2A ;
6. le registre des frontières ;
7. TRUST V1 ;
8. les fichiers du présent pack.

## Règles

- la Spirale est une navigation temporelle, jamais un graphe ;
- pas de gamification ;
- pas de score patient ;
- pas de notification culpabilisante ;
- chaque automatisme affiche « pourquoi maintenant » ;
- toute correction est traçable ;
- toute proposition voix/photo est confirmée ;
- aucune conservation brute par défaut ;
- aucune migration Prisma sans confirmation distincte ;
- aucun envoi automatique ;
- tous les textes UI sont en français ;
- seules les fixtures Sophie Nicola, Jennifer Martin et Michel Dogne sont autorisées.

## Premier lot demandé

Créer uniquement un domaine TypeScript pur :

```text
web/src/lib/food-observation/
```

avec :

- contrats ;
- politiques panoramique/focalisée/hybride ;
- événements append-only ;
- signatures ;
- opportunités ;
- couverture ;
- projections item par item ;
- discordances ;
- météo praticien ;
- tests Vitest.

Aucune UI, aucune API, aucune migration.

## Sortie attendue

- audit des types existants réutilisables ;
- plan de fichiers ;
- décisions ambiguës ;
- code ;
- tests ;
- `npm run type-check` ;
- `npm test` ciblé ;
- `bash scripts/check_no_secrets.sh` ;
- changelog ;
- handoff vers le lot UI local.
