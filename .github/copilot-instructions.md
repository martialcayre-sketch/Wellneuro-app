# Copilot Instructions — Wellneuro NNPP2

Ce fichier est l'équivalent pour GitHub Copilot de `CLAUDE.md` (racine du dépôt), lu par Claude Code. Copilot ne lit pas `CLAUDE.md` : les règles utiles sont reformulées ici. En cas de divergence future entre les deux fichiers, `CLAUDE.md` fait foi et celui-ci doit être resynchronisé à la main.

## Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL (Supabase)
- NextAuth — OAuth Google restreint au domaine `@wellneuro.fr`
- Déploiement Vercel (`app.wellneuro.fr`)

## Règles non négociables

- **Jamais de secret en dur** : clés API, tokens, mots de passe. Utiliser les variables d'environnement (`web/.env.local` en dev, variables Vercel en production — jamais committés).
- **UI en français** : tout texte visible par l'utilisateur (labels, messages d'erreur, placeholders) est en français.
- **Changements minimaux** : ne pas refactorer au-delà de ce qui est demandé. Pas de renommage, réorganisation de fichiers ou changement de style de code non sollicité.
- **Pas de migration Prisma sans demande explicite** : ne jamais lancer `prisma migrate dev`, `prisma db push`, ou modifier `schema.prisma` sans confirmation explicite.
- **Pas de SQL destructif** sans confirmation explicite (DROP, DELETE sans WHERE, TRUNCATE).
- **Pas de modification de la logique clinique ou des seuils** sans demande explicite et documentation dans `CHANGELOG.md`.
- **Données patients** : seuls Sophie Nicola, Jennifer Martin, Michel Dogné peuvent apparaître dans le code, les seeds, les tests ou les données de démo. Ne jamais générer, dériver ou compléter des données patient réelles.

## Début de session

Si `docs/claude/SESSION_LOG.md` existe dans le dépôt, le lire (dernière entrée) avant de traiter la première demande de la session — silencieusement, sans le résumer sauf si c'est demandé.

## Fin de session — journal (mode agent uniquement)

Si le mode agent (édition de fichiers) est actif et qu'un "résumé de session" est demandé : produire le résumé (<150 mots — décisions prises, options écartées et pourquoi, prochaine action prioritaire, questions ouvertes), puis l'ajouter en fin de `docs/claude/SESSION_LOG.md` (append, jamais d'écrasement), précédé d'un titre `## [date] — [sujet]`. Pas de confirmation nécessaire pour cet ajout.

En mode Ask/Edit sans accès fichier, proposer le résumé au format ci-dessus et indiquer qu'il doit être collé manuellement dans `docs/claude/SESSION_LOG.md`.

## Documentation de référence

- `docs/claude/PROJET_CONTEXTE.md` — contexte projet et état actuel
- `docs/claude/REGLES_CRITIQUES.md` — sécurité, RGPD, contraintes cliniques
- `docs/claude/WORKFLOW_DEVELOPPEMENT.md` — workflow de dev
- `docs/claude/ROADMAP_AGENT_PLAN.md` — roadmap produit (séries D/R/E)
- `docs/claude/SESSION_LOG.md` — journal des sessions précédentes

## Avant de committer

- Vérifier qu'aucun secret n'a été introduit (`bash scripts/check_no_secrets.sh`).
- Vérifier que les textes UI ajoutés sont en français.
- Ne pas committer de fichier `.env*`.
- Pas de régression visible dans le parcours praticien ou patient.
