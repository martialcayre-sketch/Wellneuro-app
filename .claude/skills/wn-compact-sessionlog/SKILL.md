---
description: Compacte SESSION_LOG en archivant les anciennes entrées et en gardant le journal actif minimal.
argument-hint: "[audit|compact|verify]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — compaction de SESSION_LOG

> **À lire avant d'agir — `SESSION_LOG.md` est déclaré `merge=union`.** Ce skill
> est le seul du dépôt à RETIRER des entrées du journal et à en réécrire le
> bandeau ; `union` concatène les deux côtés d'un hunk sans marqueur. Une
> compaction fusionnée avec un ajout parallèle **restaure silencieusement les
> entrées compactées**, ou duplique le bandeau — ce n'est pas une perte, c'est une
> résurrection, et elle ne se voit pas dans le diff de fusion. Donc : vérifier
> qu'aucune autre branche vivante ne touche le journal, compacter dans une PR
> courte, et relire `SESSION_LOG.md` en entier après toute fusion qui l'implique.
> L'avertissement vit aussi dans `.gitattributes`, que personne n'ouvre au moment
> d'agir.

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && tail -n 70 docs/claude/SESSION_LOG.md || true`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && grep -n '^## ' docs/claude/SESSION_LOG.md || true`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`

Arguments : `$ARGUMENTS`

## Modes

- `audit` : mesurer la taille du journal, repérer les coupures candidates et proposer le périmètre de compaction.
- `compact` : archiver les entrées anciennes dans `docs/archive/sessions/SESSION_LOG_YYYY-MM-DD_to_YYYY-MM-DD_compact.md`, puis réduire le journal actif aux dernières entrées utiles à la reprise.
- `verify` : contrôle en lecture seule après compaction, sans réécriture.

## Règles

- `SESSION_LOG.md` reste append-only par défaut ; la compaction se fait uniquement en déplaçant l'historique dans une archive dédiée.
- **Ne jamais compacter tant qu'une branche parallèle touche le journal.** Le fichier est déclaré `merge=union` dans `.gitattributes` : la fusion concatène les deux côtés d'un hunk sans marqueur. C'est la bonne réponse sur un fichier où l'on n'ajoute qu'à la fin — et la mauvaise ici, puisque ce skill est le seul à en RETIRER des entrées et à en réécrire le bandeau. Une compaction fusionnée avec un ajout parallèle **restaure silencieusement les entrées compactées**, ou duplique le bandeau. Ce n'est pas une perte, c'est une résurrection : elle ne se voit pas dans le diff de fusion. Vérifier d'abord qu'aucune autre branche vivante ne touche le journal, compacter dans une PR courte, et **relire `SESSION_LOG.md` en entier après toute fusion qui l'implique**.
- Ne jamais supprimer l'historique : créer un fichier d'archive daté pour chaque plage compactée.
- Conserver dans le journal actif seulement les entrées récentes utiles au redémarrage, en priorité les lots encore ouverts ou les derniers lots livrés nécessaires à la reprise.
- Préserver un court bandeau de référence en tête de `SESSION_LOG.md` vers l'archive créée.
- Ne jamais introduire de secret, de valeur `.env`, de token patient ou de donnée patient réelle.

## Critères

- Le journal actif reste court, lisible et orienté reprise.
- L'historique déplacé est intégralement conservé dans une archive nommée explicitement.
- Le résumé de tête indique clairement où retrouver les entrées archivées.
- Aucun autre fichier applicatif n'est modifié.
