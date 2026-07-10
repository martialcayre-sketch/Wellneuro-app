# Outil ultime Claude Code + Copilot — WellNeuro

## Entrée quotidienne

```text
/wn
```

## Cycle d’une campagne

```text
/wn-campaign créer "Titre"
/wn-campaign-run
/wn-campaign-run apply
/wn-test
/wn-review
/wn-finish
```

## Cycle d’un correctif

```text
/wn-debug <symptôme>
/wn-plan <correctif>
/wn-test quick
/wn-review
```

## Répartition recommandée

- Claude Code : campagnes, terminal, changements multi-fichiers et diagnostic.
- Copilot inline : complétions locales.
- Copilot Planner : plan sans écriture.
- Copilot Implementer : un lot validé.
- Copilot Reviewer : revue indépendante.
- `/wn-handoff` : passage propre entre outils ou sessions.

## Règle d’or

Aucun agent ne doit décider seul d’une migration, d’un changement clinique, d’une écriture Supabase ou d’un déploiement.
