---
description: Transforme une idée ou un brainstorming en campagne autonome, crée son dossier et ses fichiers de lots avec des noms normalisés.
argument-hint: "créer <titre> [lots=N] | status | next"
disable-model-invocation: true
effort: medium
---

# WellNeuro — campagnes

Commande : `$ARGUMENTS`

## Modes

- `créer <titre>` : créer une campagne.
- `status` : afficher les campagnes.
- `next` : afficher le prochain lot.
- Un texte libre est traité comme un brainstorming à structurer.

## Création

1. Extraire un titre court, l’objectif, les contraintes, décisions, questions ouvertes et dépendances.
2. Choisir entre 3 et 8 lots atomiques.
3. Exécuter `node scripts/wn-campaign.mjs create --title "<titre>" --lots <N>`.
4. Compléter `BRIEF.md`, `CAMPAGNE.md` et chaque fichier `lots/LOT-*.md`.
5. Ne créer aucun code applicatif.
6. Ne pas planifier de migration sans lot séparé marqué « confirmation obligatoire ».

Chaque lot contient : but, périmètre, fichiers probables, interdits, dépendances, étapes, tests et done.
