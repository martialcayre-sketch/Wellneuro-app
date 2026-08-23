# Handoff — 2026-08-23 — Alliance 6.0-B : les cinq arbitrages du LOT-02, tranchés

## Branche et état Git

`docs/lot02-arbitrages-alliance-6b`, worktree `alliance-6b-lot02`, deux commits
au-dessus de `origin/main` (43705ea1). Diff purement documentaire.

## Objectif

Sortir les cinq arbitrages d'ouverture du LOT-02 de la conversation où ils
vivaient, puis les faire trancher. Les deux étapes sont dans cette branche :
le commit précédent les a écrits en recommandations, celui-ci les acte.

## Décisions prises

Les cinq sont tranchés **conformes aux recommandations** — chacune s'adossait
déjà à un patron du dépôt plutôt qu'à une invention :

1. **Forme des fragments** — invariant de *constructeur*, pas validateur :
   trois fabriques nommées (`depuisAnamnese`, `depuisInstrument`,
   `depuisRegleSignee`) rendent un fragment sans source inconstructible au sens
   du type ; plus un balayage récursif du blob sérialisé avant écriture,
   refusant toute clé `score|seuil|bande|rang|position|ordre|niveau`. C'est le
   pendant JSONB de la liste blanche de colonnes.
2. **`hash_sources`** — SHA-256 hex 64 sur sérialisation canonique, helper
   `canonicalSha256` **dupliqué** (≈15 lignes, sans dépendance) plutôt que G7
   assouplie : une garde qui gagne une exception les perd toutes. Contenu
   haché : identifiants et valeurs des sources + SHA du périmètre signé,
   **jamais le texte des fragments** — sinon une reformulation praticien
   rendrait caduque une proposition dont les sources n'ont pas bougé.
3. **Motif vide sur reprise** — refus par motif nommé (`motif_sur_reprise`),
   pas de `''` → `NULL` silencieux (« par refus, jamais troncature »).
4. **Dispositions multiples** — le dernier geste gagne (`creeLe` décroissant,
   départage par `id`), comme `etatRatification` : deux règles de résolution
   dans un même dossier seraient un piège. La nuance « reprise puis écartée
   reste reprise EN FAIT » se porte dans l'UI, pas dans la donnée.
5. **Plafond de trois** — borner la *production* et le *service*, jamais le
   stock : la table est append-only, l'accumulation historique y est normale.

Écarté : rouvrir `D-094` pour y loger les points 1 et 2. Ils touchent la
doctrine de garde, mais G7 en porte l'exécution — une garde vue rouge par
mutation tient mieux qu'une phrase de décision.

## Fichiers modifiés

- `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/lots/LOT-02-moteur-proposition.md`
  — section « Cinq arbitrages » passée de *à trancher* à *tranchés*, motifs
  conservés (c'est le motif, pas la conclusion, qui se relira sur un cas limite).
- `docs/claude/SESSION_LOG.md` (commit précédent).

## Validations exécutées

Aucune : diff documentaire, aucun fichier sous `web/`.

## Problèmes ouverts

- La forme des fragments reste **non gardée en base** ; l'arbitrage 1 la
  déplace dans le code du LOT-02, il ne la referme pas côté schéma.
- `D-093` court jusqu'au 2026-10-04 et attend toujours un premier objectif
  rédigé ; sa levée est préparée au LOT-06.

## Prochaine action exacte

Ouvrir le LOT-02 sur une branche de code distincte (module
`propositionObjectif.ts`, route `/api/praticien/propositions-objectif`, gardes
G7 vues rouges par mutation). Cette branche-ci ne porte que de la doc.

## Interdits encore actifs

- Aucune écriture dans `clinical-engine/` (doctrine-executable en est
  propriétaire) ; aucun import de `clinical-engine/` ni `clinical/` depuis le
  module (G7).
- Aucune écriture sur les tables de 6.0-A ; aucun LLM dans ce lot.
- Jamais journaliser un texte clinique (`messageJournalisable`).
