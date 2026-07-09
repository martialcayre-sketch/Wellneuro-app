# Prompt Caching — Notice de développement

## Pourquoi ce mécanisme

Chaque appel à l'API Claude facture **tous les tokens en entrée**, y compris le prompt système qui ne change jamais d'une requête à l'autre. Le prompt caching permet de mettre ce contenu stable en cache côté Anthropic et de ne payer que 10 % du coût normal sur les lectures suivantes.

## État d'implémentation

`cache_control: { type: 'ephemeral' }` est posé sur `SYSTEM_PROMPT_SYNTHESE` dans `web/src/app/api/praticien/synthese/route.ts:117` (Anthropic SDK TypeScript).

## Seuil minimal à connaître

Anthropic n'active le cache que si le bloc dépasse **1024 tokens** (Sonnet/Opus) ou **2048 tokens** (Haiku).

Le `SYSTEM_PROMPT_SYNTHESE` actuel fait environ 650-700 tokens — **en dessous du seuil**. Le marqueur `cache_control` est déjà en place et ne génère aucune erreur, mais le cache ne se déclenchera pas tant que le prompt système n'aura pas franchi 1024 tokens.

**Action débloquante** : quand le corpus SIIN ou des lignes directrices cliniques seront ajoutés au prompt système, le seuil sera franchi automatiquement et les économies deviendront effectives sans aucun autre changement de code.

## Règle critique : ne pas casser le cache

Le cache est **invalidé** dès qu'un seul octet change avant le marqueur. Les erreurs fréquentes à éviter :

| A ne pas faire | Pourquoi |
|---|---|
| Injecter la date/heure dans le prompt système | Change à chaque requête → cache toujours manqué |
| Construire le prompt système dynamiquement (variables, conditions) | Toute variation invalide tout ce qui suit |
| Changer l'ordre des champs `tools` entre requêtes | L'ordre de rendu `tools → system → messages` doit être constant |
| Modifier `SYSTEM_PROMPT_SYNTHESE` sans bump de `versionPrompt` | Rend les synthèses existantes non comparables en audit |

**Contenu stable autorisé** : texte clinique fixe, règles déontologiques, format de sortie JSON, corpus SIIN statique.  
**Contenu volatile, à garder dans le message utilisateur** : nom du patient, scores, dates, tout ce qui varie par requête.

## Vérifier que le cache fonctionne

Dans la route web (`synthese/route.ts`), ajouter temporairement un log après l'appel :

```typescript
console.log('[cache]', {
  cache_read: response.usage.cache_read_input_tokens,
  cache_write: response.usage.cache_creation_input_tokens,
  input: response.usage.input_tokens,
});
```

- **Première requête** : `cache_creation_input_tokens > 0`, `cache_read = 0` (écriture en cache)
- **Requêtes suivantes (< 5 min)** : `cache_read > 0`, `cache_creation = 0` (lecture depuis le cache)
- **Si `cache_read` reste à 0** : un invalidateur silencieux est présent — vérifier qu'aucune variable ne s'est glissée dans `SYSTEM_PROMPT_SYNTHESE`

TTL du cache : **5 minutes** (type `ephemeral`). Pour les sessions longues où le même praticien génère plusieurs synthèses d'affilée, le cache sera actif. Entre sessions distinctes, il sera réécrit à faible coût.

## Économies attendues (post-seuil)

Tarif `claude-sonnet-4-6` : $3/M tokens input.

| Opération | Coût relatif |
|---|---|
| Token non caché | $3.00/M (base) |
| Écriture cache (1re requête) | $3.75/M (×1.25) |
| Lecture cache (requêtes suivantes) | $0.30/M (×0.10) |

Break-even : **2 requêtes** dans la même fenêtre de 5 min. Au-delà, ~90 % d'économie sur la portion système.

## Évolution future : TTL 1 heure

Si l'usage évolue vers des sessions longues (> 5 min entre deux synthèses), passer à un TTL 1 heure :

```typescript
cache_control: { type: 'ephemeral', ttl: '1h' }
```

Coût d'écriture doublé (×2 au lieu de ×1.25), mais break-even atteint après 3 requêtes seulement. À évaluer selon les logs d'usage réels.
