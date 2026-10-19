# Handoff — D-325 « Nature » et règle d'autorisation Chrome

## Branche et état Git

`chore/permission-chrome-computer`, partie de `origin/main` (6d56ea8c). Une
PR, une finalité : la règle d'autorisation. La ligne « Nature » de D-325 part
dans sa propre PR de documentation (#1587, `docs/d325-nature-delegation`).

## Objectif

Fermer les deux restes du lot de l'étiquetage en lot : le texte de D-325 qui
contredisait §5, et la règle `/permissions` restée locale.

## Décisions prises

- Texte de la ligne « Nature » rédigé par l'assistant, validé tel quel par le
  responsable le 2026-10-19.
- `.claude/settings.json` committé sur demande du responsable : une seule
  ligne ajoutée à `permissions.allow`, l'ordre des clés de `main` gardé.

## Fichiers modifiés

- `.claude/settings.json`
- SESSION_LOG, ce handoff
- (PR #1587) `docs/DECISIONS.md`

## Validations exécutées

- JSON relu par `json.load`.
- T1 rapide vert sur la branche de #1587, après `prisma generate` (client
  périmé).

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête des deux PR, merge, puis le dossier
zinc : ouverture en lecture seule, modèle BP-07, écrit directement dans les
dix rubriques.

## Interdits encore actifs

- Aucune écriture en base de production hors des routes de l'atelier.
- La signature d'un claim n'est pas déléguée (D-325 §5).
- Aucun contenu clinique au dépôt (D-251 §4).
