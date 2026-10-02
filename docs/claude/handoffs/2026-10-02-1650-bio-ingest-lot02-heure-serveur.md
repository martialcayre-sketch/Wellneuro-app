# Handoff — 2026-10-02 — BIO-INGEST LOT-02 : heure exigée par le serveur, délai à 180 s

## Branche et état Git

- `feat/bio-ingest-lot02-heure-serveur`, partie de `origin/main` à `7d36e4ed` (PR 2b, #1283).
- PR #1284 : le CI a rendu 0 au premier passage. Les corrections de la revue Copilot sont sur la branche.
- Production : la 2b (`7d36e4ed`) est déployée sur Scalingo depuis 12:54, avec succès. Aucune variable `WN_BIO_INGEST_*` n'est posée : l'import est éteint.

## Objectif

Première des sessions arbitrées le 2026-10-02 après la 2b (fiche LOT-02, bloc « Arbitrages du 2026-10-02 après le merge de la 2b »).

## Décisions prises (responsable, 2026-10-02)

1. Heure exigée aussi par le serveur. Délai d'appel de 180 s, sans nouvelle tentative. **Cette PR.**
2. Purge du PDF :
   - dès que toutes les lignes sont décidées, et au plus tard 30 jours après le dépôt ;
   - **avant** la pose du drapeau ;
   - document patient v12 rédigé par Claude, relu par le responsable.
3. Resolver relu, puis signé par une D-xxx. Pas de pose avec un resolver qui rend tout `inconnu`.
4. Constat de `after()` en production :
   - PDF fabriqué déposé dans un dossier de test réel, sans rien valider ;
   - constat par conteneur, par identifiant ;
   - puis retrait du dépôt.

## Fichiers modifiés

- `web/src/lib/biology-library/import/decisions.ts` : refus `heure_absente`, détection de minuit à Paris par `Intl`.
- `decisions.test.ts` : nouveaux tests.
- `extraction.ts` : `DELAI_EXTRACTION_MS` = 180 000, `TENTATIVES_SUPPLEMENTAIRES` = 0, tous deux exportés.
- `extraction.test.ts` : test de l'inégalité avec la péremption.
- `verrou.ts` : commentaire mis à jour.
- Fiche LOT-02, fragment `changelog.d/2026-10-02-bio-ingest-lot02-heure-serveur.md`, `SESSION_LOG`.

## Validations exécutées

- T1 complet vert.
- T2 vert.
- Tests de l'import verts sous TZ Europe/Paris et UTC.
- CI de #1284 : 0.

## Problèmes ouverts

- **Une heure imprimée « 00:00 » se confond avec une heure absente** (revue Copilot de #1284). Le staging ne garde que l'instant lu. Proposer une colonne « heure lue » dans la PR de migration de purge ; c'est une migration, donc une demande explicite du responsable est requise.
- Purge, signature du resolver et constat `after()` : toujours à faire, dans l'ordre ci-dessus.

## Prochaine action exacte

1. Merger #1284 dès que le CI rend 0, après avoir répondu aux commentaires Copilot.
2. `/clear`.
3. Cadrer en mode Plan la **migration de purge** :
   - `contenu` nullable et déclencheur de figement à revoir ;
   - échéance de 30 jours ;
   - colonne « heure lue » à proposer ;
   - document patient v12.

## Interdits encore actifs

- Pas de migration ni de `schema.prisma` sans demande explicite. Jamais `prisma format`. `release-db` reste un geste humain.
- Aucune écriture dans `resultats_biologiques` sans validation praticien. Aucune conversion d'unité, aucune qualification de valeur.
- Fixtures seulement (Sophie Nicola, Jennifer Martin, Michel Dogné). Aucun seed ni E2E sur un dossier réel.
- Drapeau éteint jusqu'aux conditions de `docs/FEATURE_FLAGS.md`.
- Ne pas sonder le CI.
