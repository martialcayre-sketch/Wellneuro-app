# Bibliothèque NotebookLM — corpus consultable à côté de l'application

> Décisions praticien du 2026-07-23 : la bibliothèque vit dans **NotebookLM**
> (un notebook par `primaryNotebook` du registre), nourrie par **dossiers
> Google Drive** au **markdown canonique** du corpus (triple lecture A/B/C).
> NotebookLM n'expose pas d'API : l'assemblage est outillé, le versement est
> un geste manuel documenté ici. La bibliothèque est un outil de CONSULTATION
> praticien — elle ne fait partie ni du RAG ni d'aucune voie patient (D-003
> n'y est pas engagé : rien de ce que NotebookLM produit n'entre dans l'app).

## Chaîne complète

```
extracted/<source>/canonical.md            (sortie triple lecture A/B/C)
        │  tools/corpus/notebooklm/exporter.mjs
        ▼
~/.wellneuro/corpus/notebooklm/<notebook>/ (un dossier par notebook + MANIFESTE.md)
        │  téléversement manuel (drive.google.com, une fois par mise à jour)
        ▼
Drive : WELLNEURO_BIBLIOTHEQUE/<notebook>/
        │  NotebookLM → Sources → Google Drive (une fois par notebook)
        ▼
NotebookLM : un notebook par notebook du registre
```

## 1 · Exporter (à chaque évolution du corpus extrait)

```bash
node tools/corpus/notebooklm/exporter.mjs            # tout l'extrait
node tools/corpus/notebooklm/exporter.mjs --source WN-SRC-0056,WN-SRC-0063
```

Sortie hors dépôt : `~/.wellneuro/corpus/notebooklm/<notebook>/<source> — <titre>.md`,
plus un `MANIFESTE.md` par dossier (traçabilité de ce qui a été versé). Les
sources sans `canonical.md` (non extraites) sont signalées, jamais silencieuses.

## 2 · Téléverser dans Drive (manuel)

1. Sur [drive.google.com](https://drive.google.com) (compte `@wellneuro.fr`),
   créer une fois le dossier `WELLNEURO_BIBLIOTHEQUE`.
2. Y glisser-déposer les dossiers de `~/.wellneuro/corpus/notebooklm/` —
   Drive fusionne les dossiers homonymes lors des mises à jour suivantes.

## 3 · Brancher NotebookLM (une fois par notebook)

1. Sur [notebooklm.google.com](https://notebooklm.google.com), créer un
   notebook portant le nom exact du dossier (ex. « 09 — Nutrition et aliments
   vedettes »).
2. **Sources → Ajouter → Google Drive**, sélectionner les fichiers du dossier
   (le `MANIFESTE.md` peut être ajouté aussi : il documente le contenu).
3. Après une mise à jour d'export, re-synchroniser la source modifiée dans
   NotebookLM (bouton « resynchroniser avec Drive » sur la source) ou ajouter
   les nouveaux fichiers.

## Limites assumées

- **Pas d'API NotebookLM** : les étapes 2 et 3 restent manuelles ; l'export
  (étape 1) est le seul maillon outillé, et le manifeste rend chaque
  versement vérifiable.
- **Le canonique n'est pas le PDF** : c'est le texte issu de la triple
  lecture, homogène et léger (décision du 2026-07-23). Les PDF originaux
  restent dans le Drive du cabinet (`drive-dump/`) si un retour à l'image de
  la page s'impose.
- **Aucun retour vers l'app** : ce que NotebookLM synthétise n'entre jamais
  dans le corpus RAG — la seule voie d'entrée reste extraction → chunks →
  claims → validation praticien (D-003).
