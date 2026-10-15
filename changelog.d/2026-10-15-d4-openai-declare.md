### D-299 : OpenAI déclaré au registre et au document patient, « Vos données personnelles » v18 (D4, 2026-10-15)

- `web/src/lib/trust/contenus/registre.ts` : `donnees_confidentialite` v18,
  une ligne ajoutée aux prestataires, juste après Anthropic : OpenAI reçoit le
  texte de la recherche documentaire du praticien et celui des références à
  indexer, jamais le dossier. Accusé exigé (la v17 n'est pas encore accusée
  partout) ; résumé qui reprend les changements précédents. Texte validé par
  le responsable.
- `docs/DOSSIER_RGPD.md` : OpenAI au tableau de la rubrique 6 ; le constat
  « destinataire non déclaré » du 2026-09-07 est soldé par une ligne datée,
  conservé tel quel.
- Aucun flux, aucun drapeau, aucune migration modifiés.
