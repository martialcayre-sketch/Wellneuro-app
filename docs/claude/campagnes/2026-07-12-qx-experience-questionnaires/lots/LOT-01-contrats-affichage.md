---
id: "LOT-01"
titre: "Contrats d'affichage"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Contrats d'affichage

## But

Livrer un registre UX séparé du catalogue clinique et les types purs `DisplayPolicy`, `RendererProfile` et `OptionOrderPolicy`.

## Périmètre

- Résolution déterministe avec politique stricte par défaut.
- `shuffle_nominal` décrit par le type, jamais exécuté.
- Sérialisation de soumission limitée à `questionId → value`.
- Tests de non-régression sur politique, ordre, conditionnels et payload.

## Done

- [x] Aucun champ UX n'est ajouté à `questions.ts` ni envoyé au scoring.
- [x] Seul `Q_NEU_03` est activable à ce stade.
- [x] Type-check et tests ciblés passent.

## Résultats

- Registre séparé livré dans `web/src/lib/questionnaire-display.ts`.
- Quatre tests couvrent fallback strict/fixe, gates des pilotes, absence de
  mélange et nettoyage du payload.
- `type-check`, test ciblé et `scoring-check` passent.
