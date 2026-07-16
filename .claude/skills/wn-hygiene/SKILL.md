---
description: Exécute le playbook d’hygiène documentaire multi-dépôts via scripts/repo-hygiene.sh (audit-only, apply-safe, report-pr).
argument-hint: "[audit-only|apply-safe|report-pr] [--dry-run] [--out <dossier>] [--write <fichier>]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — hygiène multi-dépôts

## Contexte

!`git status --short`
!`test -f docs/claude/SESSION_LOG.md && tail -n 40 docs/claude/SESSION_LOG.md || true`

Arguments : `$ARGUMENTS`

## Mission

- Sans argument : exécuter `audit-only`.
- Avec `audit-only` : lancer `bash scripts/repo-hygiene.sh audit-only`.
- Avec `apply-safe` : lancer `bash scripts/repo-hygiene.sh apply-safe` (accepter `--dry-run`).
- Avec `report-pr` : lancer `bash scripts/repo-hygiene.sh report-pr` (accepter `--write`).
- Si `--out <dossier>` est fourni, le transmettre à la commande.
- Ne jamais interpréter ce skill comme une autorisation de suppression destructive.

## Règles

- Mode recommandé par défaut : `audit-only` puis `apply-safe --dry-run`.
- Utiliser `apply-safe` réel uniquement sur demande explicite.
- Conserver le runbook Vercel (`CONTEXTE_SESSION_VERCEL_2026-07-01.md`) hors archivage.
- En cas d’erreur script, afficher la commande exacte, l’erreur courte et la correction proposée.

## Sortie

1. Mode exécuté et commande exacte.
2. Résultat synthétique (succès/échec, artefacts générés).
3. Liste des chemins impactés (ou prévus en dry-run).
4. Prochaine action sûre (souvent `report-pr`).
