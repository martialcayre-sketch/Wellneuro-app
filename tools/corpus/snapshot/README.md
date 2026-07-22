# Snapshot local du corpus (Phase 1)

Apparie les fichiers d'un dossier Drive **rapatrié localement** aux 391 notices
du registre `docs/claude/corpus/source_registry.json`, calcule les SHA-256,
détecte les doublons, et écrit un **manifeste local hors dépôt**.

## Usage

```bash
# 1. Rapatrier le dossier Drive vers ~/.wellneuro/corpus/drive-dump/
#    (Google Drive Desktop, ou export manuel — les fichiers restent hors dépôt).

# 2. Lancer le snapshot (lecture seule sur le dépôt) :
node tools/corpus/snapshot/snapshot.mjs

# Options : --dump <dir>  --registry <path>  --out <path>
```

Sortie : `~/.wellneuro/corpus/manifest.json` —
`sourceId → { localPath, sha256, bytes, mime, matchConfidence, canonical, autresFichiers }`.

## Garde-fous

- **Rien ne rentre dans le dépôt** : le manifeste, les Drive IDs et les fichiers
  restent dans `~/.wellneuro/corpus/` (registre externe restreint,
  cf. `docs/claude/corpus/README.md`).
- Le **registre committé n'est jamais modifié** ; `contentHash` reste nul ;
  `rightsStatus` bascule par notice **à l'ingestion**, jamais ici.
- L'appariement se fait par **nom de fichier** (`title`) — aucun Drive ID n'est
  committé. Le matching normalisé tolère le suffixe de doublon « (1) ». Les
  cas **ambigus** et **non appariés** sont listés pour arbitrage manuel.
- Les notices `quarantined` / `deprecated` sont signalées pour exclusion.
