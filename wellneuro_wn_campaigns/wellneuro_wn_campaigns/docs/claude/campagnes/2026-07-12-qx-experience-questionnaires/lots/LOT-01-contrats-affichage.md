---
id: "LOT-01"
titre: "Contrats d'affichage"
statut: "à_faire"
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

- [ ] Aucun champ UX n'est ajouté à `questions.ts` ni envoyé au scoring.
- [ ] Seul `Q_NEU_03` est activable à ce stade.
- [ ] Type-check et tests ciblés passent.

