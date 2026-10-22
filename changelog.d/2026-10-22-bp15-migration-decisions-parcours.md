### BP-15, migration : les décisions de parcours (D-343, LOT-15, 2026-10-22)

- `web/prisma/migrations/20261022100000_decisions_parcours_v1` : table
  `decisions_parcours` en ajout seul, ancrée sur une version du protocole
  (clé `RESTRICT` vers `protocol_drafts`, du même dossier), l'action
  facultative ; trois familles typées par CHECK (choix, mise en œuvre,
  révision), motifs en listes fermées sans motif d'efficacité, note
  obligatoire avec `autre` et pour une préférence, date de l'événement au
  jour ou « inconnue », version suivante sur `ajuster` seule ; une révision
  en vigueur par version, un fil par événement, remplacement dans la même
  famille, retrait de la tête ; praticien du dossier seul ; verrou du
  dossier puis verrou consultatif 343 ; REPEATABLE READ refusé ; UPDATE et
  TRUNCATE refusés, suppression réservée à l'effacement du dossier ; RLS
  sans politique. Rien n'écrit dans les versions, les approbations ni les
  check-ins.
- `schema.prisma` : modèle `DecisionParcours` et ses relations.
- Contrat `decisions_parcours_v1_negatif.sql` (quinze promesses) et banc
  `banc-decisions-parcours-deux-sessions.test.mjs` (sept courses), au CI et
  en T3.
- `patient/effacement.ts` : les décisions de parcours, nommément, avant les
  versions du protocole.
- Migration seule : aucun code ne lit ni n'écrit la table avant le constat
  par conteneur ; le code viendra sous `WN_DECISIONS_PARCOURS` éteint.
