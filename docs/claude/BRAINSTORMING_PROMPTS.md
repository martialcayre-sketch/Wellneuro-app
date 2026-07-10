# Brainstorming & Prompts économes en tokens

Guide pratique pour conduire des sessions de réflexion avec Claude sur le dev à venir, tout en minimisant la consommation de tokens.

Ce document sert quand l’objectif est d’explorer, arbitrer ou préparer un lot avant implémentation. Pour les prompts de correction, de revue ou d’ajout de documentation, voir aussi [docs/claude/TEMPLATES_PROMPTS.md](docs/claude/TEMPLATES_PROMPTS.md).

---

## 1. Quand utiliser ce guide

Utilise ce guide quand tu veux:

- faire émerger des options sans écrire de code,
- comparer des pistes produit ou techniques,
- préparer un lot R0 à R6,
- cadrer une décision avant implémentation,
- produire un résumé compact de reprise de session.

Ne pas l’utiliser pour:

- une correction cible sur un fichier précis,
- une revue technique détaillée,
- une implémentation bornée,
- un prompt de synthèse IA ou de caching.

## 2. Principes d'économie de tokens

### Ce qui coûte cher (à éviter)

| Anti-pattern | Alternative |
|---|---|
| Répéter le contexte stack à chaque message | Utiliser l'alias **NNPP2** et pointer vers `CLAUDE.md` |
| Coller tout un fichier source | Donner le chemin + la plage de lignes (`web/src/app/api/…:45-80`) |
| Demander une explication + une implémentation dans le même message | Séparer en deux échanges |
| Historique de conversation interminable | Ouvrir une nouvelle conversation avec un résumé de contexte compact |

### Ce qui accélère et économise

- **Prompt d'ancrage** : donner le chemin de `CLAUDE.md` plutôt que de répéter la stack.
- **Format de sortie explicite** : "réponds en liste à puces max 5 items", "diff uniquement".
- **Contraintes négatives explicites** : "ne pas toucher à la logique clinique", "réponse < 200 mots".
- **Un objectif par échange** : brainstorming / décision / implémentation = trois conversations distinctes.

## 3. Alias de contexte réutilisable

Copier-coller ce bloc en tête d'une nouvelle conversation quand le contexte complet est nécessaire :

```text
[CTX-NNPP2]
Stack: Next.js 14 App Router, Prisma, PostgreSQL Supabase, NextAuth (OAuth @wellneuro.fr), Vercel.
Règles: pas de secret en dur, textes UI français, changements minimaux, pas de migration non demandée.
Patients fictifs autorisés: Sophie Nicola, Jennifer Martin, Michel Dogne.
Référence doc: docs/claude/PROJET_CONTEXTE.md
```

> Pour un brainstorming (pas d'implémentation), remplacer la dernière ligne par :
> `Mode: exploration uniquement, pas de code.`

## 4. Templates de brainstorming

### 4.1 — Exploration d'une nouvelle fonctionnalité

```text
[CTX-NNPP2] Mode: exploration uniquement.

Fonctionnalité envisagée: [titre court]
Besoin utilisateur: [1-2 phrases]

Pour chaque option proposée, donner:
- approche en 1 phrase,
- avantage principal,
- risque ou contrainte principale.

Limiter à 3-4 options. Pas de code.
```

### 4.2 — Priorisation du backlog

```text
[CTX-NNPP2] Mode: décision.

Backlog items à prioriser:
1. [item A]
2. [item B]
3. [item C]

Critères de tri par ordre d'importance:
- valeur praticien immédiate
- risque technique
- dépendances entre items

Résultat attendu: liste ordonnée avec une justification par item (1 ligne chacune).
```

### 4.3 — Faisabilité technique rapide

```text
[CTX-NNPP2] Mode: analyse.

Question de faisabilité: [description de ce qu'on veut faire]
Fichiers probablement concernés: [liste ou "inconnu"]

Répondre uniquement sur:
1. Faisable oui/non et pourquoi (2 phrases max)
2. Risques identifiés (puces)
3. Prochaine action concrète (1 ligne)
```

### 4.4 — Arbitrage dette technique vs nouvelle feature

```text
[CTX-NNPP2] Mode: arbitrage.

Option A (dette): [description]
Option B (feature): [description]
Contrainte: [délai, ressource, ou impact patient]

Donner: recommandation + 2 arguments pour + 1 argument contre. Max 150 mots.
```

### 4.5 — Génération d'idées (divergent)

```text
[CTX-NNPP2] Mode: idéation libre.

Sujet: [thème général du dev à venir]
Horizon: [ex: 1 mois, prochaine version]

Générer 6-8 idées courtes (titre + 1 ligne chacune), sans filtrage. Inclure au moins une idée non évidente.
```

### 4.6 — Préparation d’un lot WellNeuro

```text
[CTX-NNPP2] Mode: préparation de lot.

Lot pressenti: [R0 à R6]
Objectif métier: [1 phrase]
Contrainte dominante: [temps / risque / dépendance / validation]

Répondre uniquement avec:
1. le périmètre minimal,
2. les fichiers à inspecter en premier,
3. les risques de dérive,
4. le plus petit plan en 3 étapes.

Pas de code, pas d’implémentation.
```

### 4.7 — Reprise de session compacte

```text
[CTX-NNPP2] Mode: reprise de session.

Résumé précédent:
[coller 5 à 10 lignes max]

Aujourd’hui, je veux:
[objectif unique]

Répondre avec:
- l’état actuel en 1 phrase,
- 3 points d’attention,
- la prochaine action la plus utile.
```

## 5. Gestion de la mémoire inter-sessions

### Résumé de session (à sauvegarder manuellement)

En fin de session de brainstorming, demander à Claude :

```text
Produis un résumé de session en moins de 150 mots:
- Décisions prises (liste)
- Options écartées et pourquoi (liste)
- Prochaine action prioritaire
- Questions ouvertes restantes
```

Coller ce résumé dans `docs/claude/SESSION_LOG.md` (ou dans un fichier de notes local si la session n’a pas vocation à être historisée dans le dépôt).

### Reprise de session

```text
[CTX-NNPP2]
Résumé de la session précédente:
[coller le résumé]

Aujourd'hui: [objectif de la session]
```

## 6. Prompts pour l'optimisation du code existant

### Audit ciblé (sans implémentation)

```text
[CTX-NNPP2]
Audite [fichier:lignes] sur le seul critère: [performance / sécurité / lisibilité].
Format: tableau Problème | Impact | Correction suggérée. Max 5 lignes.
```

### Implémentation bornée

```text
[CTX-NNPP2]
Tâche: [description précise]
Fichiers à modifier: [liste]
Fichiers à ne pas toucher: [liste]
Sortie attendue: diff commenté + commande de vérification.
```

## 7. Règles de caching pour les prompts API

Quand Claude est appelé via l'API (route `synthese/route.ts`), s'assurer que :

- Le **prompt système** (stable) contient les règles cliniques et le format de sortie.
- Les **données variables** (nom patient, scores) restent dans le message utilisateur.
- Voir `docs/claude/PROMPT_CACHING.md` pour le seuil 1024 tokens et les règles d'invalidation.

## 8. Checklist avant d'envoyer un prompt

- [ ] Contexte minimal fourni (alias CTX-NNPP2 ou chemin fichier)
- [ ] Mode explicite (exploration / décision / implémentation)
- [ ] Format de sortie précisé (liste, tableau, diff, texte libre)
- [ ] Longueur maximale indiquée si important
- [ ] Contraintes négatives listées si nécessaire
- [ ] Un seul objectif par message

## 9. Formats recommandés selon l’intention

Quand le besoin n’est pas encore clair, choisir le format le plus conservateur:

- **Exploration**: 3 à 6 options courtes, sans décision.
- **Décision**: une recommandation nette avec raisons et contrepartie.
- **Préparation**: périmètre, fichiers, risques, validation.
- **Reprise**: état actuel, points d’attention, prochaine action.

Pour WellNeuro, garder en tête les contraintes suivantes dans tous les prompts:

- textes UI en français,
- aucun secret en dur,
- aucune donnée patient réelle,
- changements minimaux,
- pas de migration Prisma ou SQL sans demande explicite,
- pas de modification clinique sans consigne claire.
