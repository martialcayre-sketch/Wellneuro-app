# Campagnes de développement

Chaque campagne possède son propre dossier daté, un `BRIEF.md`, un `CAMPAGNE.md` et des lots.

Création :

```bash
node scripts/wn-campaign.mjs create --title "Nom" --lots 5
```

État :

```bash
node scripts/wn-campaign.mjs status
node scripts/wn-campaign.mjs next
```

Statuts autorisés : `à_faire`, `en_cours`, `bloqué`, `terminé`, `abandonné`.
