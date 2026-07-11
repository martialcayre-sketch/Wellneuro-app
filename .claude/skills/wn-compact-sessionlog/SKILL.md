---
description: Compacte SESSION_LOG en archivant les anciennes entrées et en gardant le journal actif minimal.
argument-hint: "[audit|compact|verify]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — compaction de SESSION_LOG

!`test -f docs/claude/SESSION_LOG.md && tail -n 70 docs/claude/SESSION_LOG.md || true`
!`test -f docs/claude/SESSION_LOG.md && grep -n '^## ' docs/claude/SESSION_LOG.md || true`
!`git status --short`

Arguments : `$ARGUMENTS`

## Modes

- `audit` : mesurer la taille du journal, repérer les coupures candidates et proposer le périmètre de compaction.
- `compact` : archiver les entrées anciennes dans `docs/archive/sessions/SESSION_LOG_YYYY-MM-DD_to_YYYY-MM-DD_compact.md`, puis réduire le journal actif aux dernières entrées utiles à la reprise.
- `verify` : contrôle en lecture seule après compaction, sans réécriture.

## Règles

- `SESSION_LOG.md` reste append-only par défaut ; la compaction se fait uniquement en déplaçant l'historique dans une archive dédiée.
- Ne jamais supprimer l'historique : créer un fichier d'archive daté pour chaque plage compactée.
- Conserver dans le journal actif seulement les entrées récentes utiles au redémarrage, en priorité les lots encore ouverts ou les derniers lots livrés nécessaires à la reprise.
- Préserver un court bandeau de référence en tête de `SESSION_LOG.md` vers l'archive créée.
- Ne jamais introduire de secret, de valeur `.env`, de token patient ou de donnée patient réelle.

## Critères

- Le journal actif reste court, lisible et orienté reprise.
- L'historique déplacé est intégralement conservé dans une archive nommée explicitement.
- Le résumé de tête indique clairement où retrouver les entrées archivées.
- Aucun autre fichier applicatif n'est modifié.
