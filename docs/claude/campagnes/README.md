# Campagnes de développement

Chaque campagne possède son propre dossier (souvent daté), un `BRIEF.md`, un `BRIEF_COMPILED.md`, un `CAMPAIGN_DRAFT.md`, un `CAMPAGNE.md` et des lots.

Création :

```bash
node scripts/wn-campaign.mjs create "Nom" --lots 5
```

Création depuis des notes Markdown :

```bash
node scripts/wn-campaign.mjs create "Nom" --source ./brainstorms/nom --auto-final --activate
```

État :

```bash
node scripts/wn-campaign.mjs status
node scripts/wn-campaign.mjs next
```

Options principales (`create`) :

- `--source <dossier>` : importe des fichiers `.md` de brainstorming.
- `--slug <slug>` : force le nom technique.
- `--prefix-date` : préfixe le dossier par la date.
- `--init-only` : crée uniquement le dossier et un canevas `00_brainstorm.md`.
- `--auto-final` : crée `CAMPAGNE.md` (utile notamment avec `--init-only`).
- `--activate` : met à jour `docs/claude/campagnes/ACTIVE_CAMPAIGN.md`.
- `--overwrite` : autorise l'écrasement des artefacts générés.

Méthode recommandée :

1. Préparer la campagne et le lot via `/wn` ou `/wn-auto`.
2. Passer en mode Plan pour le plan technique détaillé avant toute modification.
3. Exécuter seulement après validation du plan.
4. Clôturer avec `/wn-finish`.

Statuts autorisés : `à_faire`, `en_cours`, `bloqué`, `terminé`, `abandonné`.
