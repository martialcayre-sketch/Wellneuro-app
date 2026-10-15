### Porte 9 : la release-db d'EF-3b consignée, deux références d'apport remises en relecture (#1478, 2026-10-15)

- `docs/claude/PLAN_WELLNEURO.md` : porte 9 et fiche H11. Le run
  `38770021810` a été approuvé par le responsable, et il est vert, garde
  anti-recul comprise. La migration `20261015140000_rag_claim_garde_dose_v1` a
  été appliquée le 2026-10-15 à 16:57 UTC, avec la sentinelle liée au run.
  C'était après la release-db de #1476, une à la fois. Le déploiement 6be60c33
  est en tête.
- Constat par conteneur : la fonction de garde en place nomme D-304. Une
  dose sous une forme que D-304 reconnaît (nombre et unité de dose — mg, µg,
  g, UI, ml… — avec une fréquence ou un poids de sa liste) ferme la voie
  rapide, qu'elle soit écrite avant ou après la fréquence. Une posologie hors
  de ces formes ne la ferme pas : sans nombre (§3), ou sans unité de dose
  (« 2 gélules par jour »).
- Les deux références d'apport signées par lot, que la règle amendée vise
  (WN-CL-0033-019, WN-CL-0033-020), repassent en relecture une à une. Décision
  du responsable, prise dans l'atelier du corpus par la transition
  d'annulation existante.
- Aucun code, aucune migration.
