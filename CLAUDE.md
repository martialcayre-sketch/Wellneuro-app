# CLAUDE.md

Ce fichier donne le contexte essentiel a Claude IA pour intervenir sur NutriConsult NNPP2.

## Objectif projet

NutriConsult NNPP2 est un MVP de consultation en neuronutrition base sur Google Apps Script (GAS) + Google Sheets.
Priorite absolue: stabiliser le MVP GAS, pas de migration technologique sans demande explicite.

## Regles critiques

- Ne jamais committer de donnees patients reelles.
- Ne jamais committer de secrets (API keys, OAuth, .env reels, .clasp.json, .clasprc.json).
- Ne jamais coder SHEET_ID en dur.
- Lire uniquement SHEET_ID via:

```javascript
PropertiesService.getScriptProperties().getProperty('SHEET_ID')
```

- Patients fictifs autorises uniquement: Sophie Nicola, Jennifer Martin, Michel Dogne.

## Fichiers coeur a connaitre

- Code serveur GAS: `src/gas/Code.gs`
- Questionnaires/scoring: `src/gas/Questions.gs`
- UI HTML: `src/gas/index.html`
- Manifeste GAS: `src/gas/appsscript.json`

## Documentation de reference

- Vue d'ensemble Claude: `docs/claude/README.md`
- Bootstrap session rapide: `docs/claude/CLAUDE_SESSION_BOOTSTRAP.md`
- Contexte projet: `docs/claude/PROJET_CONTEXTE.md`
- Regles de securite et clinique: `docs/claude/REGLES_CRITIQUES.md`
- Workflow de dev: `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts: `docs/claude/TEMPLATES_PROMPTS.md`
- Index des ressources: `docs/claude/RESSOURCES_INDEX.md`

## Manieres de travailler attendues

- Interface et textes utilisateur en francais.
- Noms de fonctions explicites, code lisible pour praticien non developpeur.
- Ne pas modifier la logique clinique ou les seuils sans demande explicite et documentation dans CHANGELOG.
- Limiter les changements au besoin exprime.

## Verification avant proposition de commit

```bash
bash scripts/check_no_secrets.sh
```

## Definition de done pour une tache standard

- Changement limite au perimetre demande.
- Pas de regression visible dans le parcours MVP.
- Pas de secret ni donnee sensible introduits.
- Documentation mise a jour si necessaire.
