### Alliance 6.0-A LOT-01 — les cinq tables du dossier à deux voix, migration confirmée

- Migration `20260822153000_alliance_dossier_deux_voix_v1` (confirmée par le
  responsable, plan approuvé en session) : `objectifs_negocies`,
  `ce_qui_compte_entrees`, `syntheses_comprehension`,
  `desaccords_comprehension`, `ratifications_objectif` — tables ÉVÉNEMENT
  append-only par convention (patron `supersedes`), deux dates partout
  (l'événement est une donnée nullable, `cree_le` est posé par la base),
  FK patient `ON DELETE RESTRICT`, RLS deny-all ×5, **aucun champ de score,
  seuil ou bande** (DC-19/DC-20 — la liste de DC-19 nomme explicitement les
  objectifs ; DC-27 garde la frontière score ≠ diagnostic).
- Contrat `alli_dossier_deux_voix_v1_negatif.sql` câblé au CI : cas positifs
  sur les cinq tables, 8 CHECK rejetants, **listes blanches exactes de
  colonnes** (l'arme opposable de l'interdit score/seuil), 18 NOT NULL,
  5 FK RESTRICT, RLS sans policy — **vu rouge sous trois mutations
  provoquées** (policy ajoutée, colonne `score` ajoutée, FK passée CASCADE)
  et vert après revert ; parité schéma↔migrations « No difference detected ».
- `effacement.ts` : les cinq tables entrent dans la transaction d'effacement
  (garde de complétude satisfaite) ; bloc `Patient` : cinq back-relations
  (ajout pur).
- La ratification est une table dédiée dès ce lot (arbitrage responsable —
  un champ d'état aurait contredit « rien ne s'écrase ») ; pas de colonne
  d'accusé de lecture sur le désaccord (représentation au LOT-04, dette
  nommée). Aucun code applicatif : LOT-02/03/04 restent gatés sur
  l'application en production.
