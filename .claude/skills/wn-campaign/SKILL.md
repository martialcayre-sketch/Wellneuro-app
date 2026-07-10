---
description: Transforme une idée ou un brainstorming en campagne autonome WN, avec brief compilé, draft de campagne et lots.
argument-hint: "creer <titre> [--source <dossier>] [--auto-final] [--activate] | status | next"
disable-model-invocation: true
effort: medium
---

# WellNeuro — campagnes

Commande : `$ARGUMENTS`

## Modes

- `creer <titre>` : créer une campagne.
- `status` : afficher les campagnes.
- `next` : afficher le prochain lot.
- Un texte libre est traité comme un brainstorming à structurer.

Options utiles (`create`) :

- `--source <dossier>` : importe des fichiers `.md` de brainstorming.
- `--slug <slug>` : force le nom technique.
- `--prefix-date` : préfixe le dossier par la date.
- `--init-only` : initialise seulement le dossier et le canevas.
- `--auto-final` : crée immédiatement `CAMPAGNE.md`.
- `--activate` : met à jour `docs/claude/campagnes/ACTIVE_CAMPAIGN.md`.
- `--overwrite` : autorise l'écrasement des artefacts générés.

## Création

1. Extraire un titre court, l’objectif, les contraintes, décisions, questions ouvertes et dépendances.
2. Choisir entre 3 et 8 lots atomiques.
3. Exécuter `node scripts/wn-campaign.mjs create "<titre>" --lots <N>`.
4. Vérifier `BRIEF_COMPILED.md`, `CAMPAIGN_DRAFT.md`, `CAMPAGNE.md` et chaque fichier `lots/LOT-*.md`.
5. Ne créer aucun code applicatif.
6. Ne pas planifier de migration sans lot séparé marqué « confirmation obligatoire ».
7. Si une implémentation est envisagée ensuite, déléguer le plan technique détaillé au mode Plan avant toute modification.

Chaque lot contient : but, périmètre, fichiers probables, interdits, dépendances, étapes, tests et done.
