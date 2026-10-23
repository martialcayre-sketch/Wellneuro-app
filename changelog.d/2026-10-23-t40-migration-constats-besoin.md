### t40, migration : les constats du praticien sur un besoin sans score et leurs pièces (D-347, précise D-338 §4, H84, 2026-10-23)

- `web/prisma/migrations/20261023160000_constats_besoin_praticien_v1` : deux
  tables neuves en ajout seul, au patron de D-331. `constats_besoin_praticien`
  porte la pose ou le retrait, le besoin (CHECK : 2, 6, 7 ou 11 seuls), le
  verdict (`a_soutenir`, `non_retenu`, `non_evaluable`, `sans_objet`), le motif
  fermé par verdict, la note (obligatoire avec `autre`, 2000 caractères au
  plus, jamais faite de blancs) et la date « à revoir le ». Un seul constat en
  vigueur par besoin et par dossier, tenu sous le verrou du dossier puis du
  besoin (espace 347) ; REPEATABLE READ refusé ; instant, ordre et
  transaction posés par la base ; seul le praticien du dossier écrit.
  `pieces_constats_besoin_praticien` porte les pièces, facultatives : un
  résultat de biologie (tête de fil, sans annulation active) ou une réponse
  de questionnaire (VALID ou AMBIGUOUS) du même dossier, écrite dans la
  transaction de son constat. UPDATE et TRUNCATE refusés ; suppression
  réservée à l'effacement du dossier ; RLS deny-all.
- `schema.prisma` : modèles `ConstatBesoinPraticien` et
  `PieceConstatBesoinPraticien`, relations inverses seules sur `Patient`,
  `QuestionnaireReponse` et `ResultatBiologique`.
- Contrat `constats_besoin_praticien_v1_negatif.sql` (seize promesses) et
  banc à deux sessions `banc-constats-besoin-deux-sessions.test.mjs` (huit
  courses), au CI et au T3.
- `effacerDossier` : les pièces, puis les constats sur un besoin, nommément,
  avant les réponses et les résultats qu'ils citent ; test d'ordre.
- `docs/DOSSIER_RGPD.md` : paragraphe validé par le responsable le
  2026-10-23.
- Migration seule : aucun code ne lit ni n'écrit ces tables avant le constat
  par conteneur. La route, la lecture et l'écran suivent, sous
  `WN_CONSTAT_BESOIN`, éteint.
