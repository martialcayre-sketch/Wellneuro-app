# Workflow Developpement (Claude + Humain)

## Etape 1 - Cadrer la demande

- Identifier le besoin exact.
- Verifier si la tache touche le clinique, la securite ou les secrets.
- Limiter le perimetre des fichiers modifies.

## Etape 2 - Explorer le code

- Lire les fichiers cibles avant modification.
- Reutiliser les conventions existantes (noms, structure, style).
- Eviter les refactors non demandes.

## Etape 3 - Implementer

- Faire des changements minimaux et explicites.
- Preserver la compatibilite MVP GAS.
- Garder les textes UI en francais.

## Etape 4 - Verifier

Checklist rapide:
- pas de secret introduit,
- pas de SHEET_ID en dur,
- pas de donnee patient reelle,
- pas de changement clinique involontaire.

Commande de controle:

```bash
bash scripts/check_no_secrets.sh
```

## Etape 5 - Documenter

- Expliquer pourquoi le changement est necessaire.
- Lister les fichiers modifies.
- Ajouter les tests manuels effectues/restants.
- Mettre a jour `CHANGELOG.md` si impact notable.

## Etape 6 - Livraison

- Proposer un resume orienté risque.
- Mentionner explicitement les limites et hypotheses.
- Laisser des prochaines etapes concretes si utile.
