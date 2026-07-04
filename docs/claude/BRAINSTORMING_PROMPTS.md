# Brainstorming & Prompts économes en tokens

Guide pratique pour conduire des sessions de réflexion avec Claude sur le dev à venir, tout en minimisant la consommation de tokens.

---

## 1. Principes d'économie de tokens

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

---

## 2. Alias de contexte réutilisable

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

---

## 3. Templates de brainstorming

### 3.1 — Exploration d'une nouvelle fonctionnalité

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

### 3.2 — Priorisation du backlog

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

### 3.3 — Faisabilité technique rapide

```text
[CTX-NNPP2] Mode: analyse.

Question de faisabilité: [description de ce qu'on veut faire]
Fichiers probablement concernés: [liste ou "inconnu"]

Répondre uniquement sur:
1. Faisable oui/non et pourquoi (2 phrases max)
2. Risques identifiés (puces)
3. Prochaine action concrète (1 ligne)
```

### 3.4 — Arbitrage dette technique vs nouvelle feature

```text
[CTX-NNPP2] Mode: arbitrage.

Option A (dette): [description]
Option B (feature): [description]
Contrainte: [délai, ressource, ou impact patient]

Donner: recommandation + 2 arguments pour + 1 argument contre. Max 150 mots.
```

### 3.5 — Génération d'idées (divergent)

```text
[CTX-NNPP2] Mode: idéation libre.

Sujet: [thème général du dev à venir]
Horizon: [ex: 1 mois, prochaine version]

Générer 6-8 idées courtes (titre + 1 ligne chacune), sans filtrage. Inclure au moins une idée non évidente.
```

---

## 4. Gestion de la mémoire inter-sessions

### Résumé de session (à sauvegarder manuellement)

En fin de session de brainstorming, demander à Claude :

```text
Produis un résumé de session en moins de 150 mots:
- Décisions prises (liste)
- Options écartées et pourquoi (liste)
- Prochaine action prioritaire
- Questions ouvertes restantes
```

Coller ce résumé dans `docs/claude/SESSION_NOTES.md` (fichier à créer si besoin, non commité en prod si contient des données sensibles).

### Reprise de session

```text
[CTX-NNPP2]
Résumé de la session précédente:
[coller le résumé]

Aujourd'hui: [objectif de la session]
```

---

## 5. Prompts pour l'optimisation du code existant

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

---

## 6. Règles de caching pour les prompts API

Quand Claude est appelé via l'API (route `synthese/route.ts`), s'assurer que :

- Le **prompt système** (stable) contient les règles cliniques et le format de sortie.
- Les **données variables** (nom patient, scores) restent dans le message utilisateur.
- Voir `docs/claude/PROMPT_CACHING.md` pour le seuil 1024 tokens et les règles d'invalidation.

---

## 7. Checklist avant d'envoyer un prompt

- [ ] Contexte minimal fourni (alias CTX-NNPP2 ou chemin fichier)
- [ ] Mode explicite (exploration / décision / implémentation)
- [ ] Format de sortie précisé (liste, tableau, diff, texte libre)
- [ ] Longueur maximale indiquée si important
- [ ] Contraintes négatives listées si nécessaire
- [ ] Un seul objectif par message
