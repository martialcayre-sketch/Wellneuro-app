### ai, migration : la colonne du jour de première lecture, vide et sans défaut (D-297 §6, 2026-10-18)

- Migration `20261018120000_portail_lectures_lu_le_v1` : une colonne `lu_le`
  de type date, nullable, **sans défaut**, sur `portail_lectures_patient`. Aucun
  rattrapage : les lectures antérieures restent sans date (D-297 §3).
- Sans défaut, pour tenir D-297 §4 : aucune date ne s'écrit depuis une page qui
  ne sert pas la phrase « Votre lecture est datée ». C'est le code de ai,
  seconde PR après la release-db constatée, qui demandera un jour en même temps
  qu'il servira la phrase.
- Deux triggers gravent le reste de D-297 dans la base : à l'insertion, toute
  date fournie est remplacée par le jour de Paris de l'horloge de la base (le
  code choisit s'il date, jamais quelle date, §2) ; à la mise à jour, le jour ne
  se pose pas après coup, ne se corrige ni ne s'efface (§1, §3).
- Contrats SQL : `portail_lectures_lu_le_v1_negatif.sql` est neuf (type date,
  nullable, aucun défaut, deux triggers, date et horodatage fournis remplacés
  par le jour de la base, rattrapage, correction et effacement refusés). Le contrat de la
  table est amendé : quatre colonnes, aucun horodatage, `lu_le` seule date.
- La consignation d'une lecture lit désormais `select: { idObjet: true }` : la
  route ne tombe pas entre le déploiement et l'application de la migration.
- `docs/DOSSIER_RGPD.md` nomme la migration. Aucune règle clinique, aucun seuil.
