# CLAUDE.md — Wellneuro NNPP2

Contexte pour Claude Code sur ce dépôt. Lu automatiquement à chaque session.

## Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL (Supabase)
- NextAuth — OAuth Google restreint au domaine `@wellneuro.fr`
- Déploiement Vercel (`app.wellneuro.fr`)

## Contexte projet

Wellneuro-app est une application de consultation en neuronutrition en production.

Le déploiement Google Apps Script (GAS) historique a été décommissionné le 2026-07-03 (web app + déclencheurs arrêtés) ; le code est archivé dans `archive/gas-legacy/` à titre de référence et n'est plus exécuté.

**Décommission Google Sheets terminée (2026-07-07)** : la dépendance à l'API Google Sheets a été entièrement retirée du runtime. Le scope OAuth se limite désormais à `openid email profile`, la route `migrate-historique` a été supprimée, et toutes les routes praticien (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `packs`…) lisent/écrivent exclusivement PostgreSQL via Prisma. `SHEET_ID` n'est plus une variable d'environnement requise. Le code GAS reste archivé dans `archive/gas-legacy/` (référence seule) — voir `docs/claude/PROJET_CONTEXTE.md`.

Priorité absolue : stabilité de l'application en production, pas de nouvelle migration technologique sans demande explicite.

## Règles non négociables

- **Jamais de secret en dur** : clés API, tokens, mots de passe. Utiliser les variables d'environnement (`web/.env.local` en dev, variables Vercel en production — jamais committés).
- **UI en français** : tout texte visible par l'utilisateur (labels, messages d'erreur, placeholders) est en français.
- **Changements minimaux** : ne pas refactorer au-delà de ce qui est demandé. Pas de renommage, réorganisation de fichiers ou changement de style de code non sollicité.
- **Pas de migration Prisma sans demande explicite** : ne jamais lancer `prisma migrate dev`, `prisma db push`, ou modifier `schema.prisma` sans confirmation explicite dans la conversation.
- **Pas de SQL destructif** sans confirmation explicite (DROP, DELETE sans WHERE, TRUNCATE).
- **Pas de modification de la logique clinique ou des seuils** sans demande explicite et documentation dans `CHANGELOG.md`.

## Données patients

- Seuls ces patients fictifs peuvent apparaître dans le code, les seeds, les tests ou les données de démo : **Sophie Nicola, Jennifer Martin, Michel Dogné**.
- Ne jamais générer, dériver ou "compléter" des données patient réelles, même si elles apparaissent dans un fichier ouvert ou un log collé par erreur dans la conversation.

## Fichiers cœur à connaître

- Application Next.js : `web/src/app/` (routes `dashboard/*` praticien, `patient/[idAssignation]` portail patient, `api/*` routes serveur)
- Schéma base de données : `web/prisma/schema.prisma`
- Catalogue questionnaires et scoring : `web/src/lib/questions.ts`
- Auth praticien (NextAuth, Google OAuth) : `web/src/lib/auth.ts`
- Client Prisma : `web/src/lib/prisma.ts`
- Code GAS legacy (référence uniquement, non maintenu) : `archive/gas-legacy/`

## Documentation de référence

- Vue d'ensemble : `docs/claude/README.md`
- Contexte projet et état actuel : `docs/claude/PROJET_CONTEXTE.md`
- Règles de sécurité et clinique : `docs/claude/REGLES_CRITIQUES.md`
- Workflow de dev : `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts : `docs/claude/TEMPLATES_PROMPTS.md`
- Runbook incident Vercel/DNS : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
- Roadmap produit consolidée (séries D/R/E, priorités) : `docs/claude/ROADMAP_AGENT_PLAN.md`

## Commandes utiles

```bash
cd web && npm run dev              # serveur local
cd web && npx prisma studio        # inspection DB en lecture seule (ne pas laisser ouvert en prod)
cd web && npx prisma generate      # régénérer le client après modif du schéma
cd web && npm run type-check       # vérification TypeScript
bash scripts/check_no_secrets.sh  # contrôle anti-secrets
```

## Avant de committer

- Vérifier qu'aucun secret n'a été introduit (`bash scripts/check_no_secrets.sh`).
- Vérifier que les textes UI ajoutés sont en français.
- Ne pas committer de fichier `.env*`.
- Pas de régression visible dans le parcours praticien ou patient.

## Définition de done pour une tâche standard

- Changement limité au périmètre demandé.
- Pas de secret ni donnée sensible introduits.
- Documentation mise à jour si nécessaire.

## Début de session

Si `docs/claude/SESSION_LOG.md` existe, lire sa dernière entrée avant de répondre à la première question de la session, sans qu'on ait besoin de le demander. Ne pas résumer ce contenu à voix haute sauf si c'est demandé — l'utiliser silencieusement comme contexte de reprise.

## Fin de session

Sur demande d'un "résumé de session" : produire un résumé (<150 mots) — décisions prises, options écartées et pourquoi, prochaine action prioritaire, questions ouvertes — puis l'ajouter directement (append, jamais d'écrasement) à la fin de `docs/claude/SESSION_LOG.md`, précédé d'un titre `## [date] — [sujet]`. Créer le fichier s'il n'existe pas. Ne pas demander de confirmation pour cet ajout : fichier de log interne au projet, sans donnée sensible.
