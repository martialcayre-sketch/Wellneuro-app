# 14 — Definition of Done transversale

## Avant développement

- Le périmètre est réduit à une branche courte.
- Les fichiers probables sont identifiés.
- Les hors-périmètre sont écrits.
- Toute migration éventuelle est explicitement demandée et confirmée.
- Les impacts cliniques sont compris.

## Pendant développement

- Changement minimal.
- Pas de refactor large non demandé.
- Pas de données patient réelles.
- Tous les textes UI en français.
- Pas de secret.
- Pas de changement de seuils/scoring sans validation.
- Pas d’envoi patient automatique.

## Qualité UI

- Mobile/tablette vérifiés quand pertinent.
- États chargement/erreur/vide prévus.
- Aucun état clinique indiqué par la seule couleur.
- Langage patient non culpabilisant.
- Theme praticien/patient respecté.

## Qualité clinique

- Distinction entre donnée déclarative, calculée, biologique, hypothèse, IA, validation.
- Pas de diagnostic automatique.
- Pas de prescription automatique.
- Validation praticien visible.
- Incertitudes affichées côté praticien.

## Tests

Selon disponibilité :

```text
npm run type-check
npm run scoring-check
scripts/check_no_secrets.sh
smoke test navigateur
vérification mobile
parcours patient fictif
```

## Critères d’acceptation génériques

- La branche répond à l’objectif annoncé.
- Le comportement existant n’est pas cassé.
- Les API existantes ne changent pas sans nécessité.
- Les composants sont réutilisables.
- Les textes sont clairs en français.
- Le code reste lisible.
- Les risques restants sont documentés.
