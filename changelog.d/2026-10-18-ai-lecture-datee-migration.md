### ai, migration : la colonne du jour de première lecture, vide et sans défaut (D-297 §6, 2026-10-18)

- Migration `20261018120000_portail_lectures_lu_le_v1` : une colonne `lu_le`
  de type date, nullable, **sans défaut**, sur `portail_lectures_patient`. Aucun
  rattrapage : les lectures antérieures restent sans date (D-297 §3).
- Sans défaut, pour tenir D-297 §4 : aucune date ne s'écrit depuis une page qui
  ne sert pas la phrase « Votre lecture est datée ». C'est le code de ai,
  seconde PR après la release-db constatée, qui écrira le jour par l'horloge de
  la base, en heure de Paris, en même temps que la phrase.
- Contrats SQL : `portail_lectures_lu_le_v1_negatif.sql` est neuf (type date,
  nullable, aucun défaut, jour relu, horodatage ramené au jour). Le contrat de la
  table est amendé : quatre colonnes, aucun horodatage, `lu_le` seule date.
- La consignation d'une lecture lit désormais `select: { idObjet: true }` : la
  route ne tombe pas entre le déploiement et l'application de la migration.
- `docs/DOSSIER_RGPD.md` nomme la migration. Aucune règle clinique, aucun seuil.
