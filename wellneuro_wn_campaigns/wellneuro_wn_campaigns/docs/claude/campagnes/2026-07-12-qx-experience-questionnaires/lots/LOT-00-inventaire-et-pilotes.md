---
id: "LOT-00"
titre: "Inventaire et pilotes"
statut: "en_cours"
dépend_de: "HC-F LOT-05 terminé"
---

# LOT-00 — Inventaire et pilotes

## But

Établir l'inventaire UX exhaustif des 63 questionnaires sans modifier le catalogue clinique, puis borner les pilotes autorisés.

## Livrables

- `INVENTAIRE_UX_QUESTIONNAIRES.md` : une ligne par questionnaire.
- Politique par défaut `strict`, ordre des items et options `fixed`.
- Pilotes : `Q_NEU_03` en `micro_batch`; `Q_MOD_02` en `focus` après certification; `Q_ALI_01` en `guided_sections` après certification; `Q_ALI_03` candidat `compact_repeated_scale`.

## Interdits

- Aucune modification clinique ou de scoring.
- Aucun nouveau renderer activé pour un questionnaire non certifié.
- Aucun mélange d'options et aucune migration Prisma.

## Tests et done

- [ ] 63 identifiants uniques inventoriés.
- [ ] Toute entrée sans exception explicite retombe sur `strict` et `fixed`.
- [ ] Les quatre pilotes et leurs gates sont traçables.
- [ ] Le catalogue clinique reste inchangé.

