### Correspondance patient : les invitations et l'accusé ne portent plus de donnée de santé (D/39)

- **Quatre gabarits en v2** (`registreGabarits.ts`), sur décision du praticien
  du 2026-10-23 : `assignation_questionnaire`, `assignation_pack`, `file_envoi`
  et `accuse_reception` ne portent plus ni titre d'instrument, ni nom de pack,
  ni liste des titres, ni note libre du praticien. L'e-mail ne dit plus que
  l'échéance et l'adresse de l'espace ; la note reste lisible en tête du
  questionnaire, dans l'espace. Les v1 restent au registre avec leur écart
  déclaré. Textes relus et validés par le responsable en session : ils naissent
  validés.
- **Routes alignées** : `praticien/assignations`, `praticien/packs/assign`,
  `praticien/file-envoi/envoyer` et `patient/submit` ne passent plus au rendu
  que l'échéance et l'adresse (l'accusé : rien). Bancs : chaque route vérifie
  que l'e-mail ne porte plus ni titre, ni liste, ni note.
- **Validations datées** sur le texte servi, empreinte inchangée :
  `lien_magique`, `relance_agenda_sommeil`, `envoi_bilan` et
  `relance_questionnaire` (2026-10-23) ; `objectif_propose` v2 (2026-09-10,
  date confirmée par le responsable), dont le commentaire recopié de la v1 la
  disait validée sans date posée.
- Après ce lot, chaque gabarit servi porte une date de validation. Ni
  clinique, ni migration, ni drapeau, ni D-xxx.
