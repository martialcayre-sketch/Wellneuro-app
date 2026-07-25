### Corrigé

- **Fuite de contenu praticien dans le booklet patient.** Le document envoyé par
  e-mail au patient rendait les points de vigilance et les questions d'entretien,
  contournant le field-filter de `documents/depuisSynthese.ts` qui les déclare
  « jamais patient ». Ces points sont pré-remplis par
  `extraireVigilanceDeterministe` avec les signaux d'alerte déclarés — dont
  « Idées noires ou suicidaires », suivi de « avis médical à évaluer en
  priorité ». Les deux blocs sont retirés de `documents/bookletHtml.ts` ; trois
  tests rejouent le cas, signal d'alerte compris.

### Ajouté

- **Garde de registre sur les contenus lus par le patient.**
  `documents/vocabulaire.ts` expose `termeAnxiogene()` /
  `contientTermeAnxiogene()` (urgence, danger, alarmant, grave, sévère,
  critique, inquiétant, immédiatement, risque élevé, sans délai).
  `POST /api/praticien/booklet` refuse l'envoi en 422 `REGISTRE_ANXIOGENE` en
  nommant le terme à reformuler, plutôt que de réécrire en silence. Les surfaces
  praticien (résumé, vigilance, champs `protocol` du catalogue) ne sont pas
  concernées : leur franchise clinique est utile et voulue.

### Modifié

- **Prompt de synthèse `synthese-v4`** : section « Ton du narratif patient » —
  interdit le registre alarmiste, la recopie littérale des libellés
  d'interprétation destinés au praticien, et la mention des signaux d'alerte
  déclarés dans `narratif_patient`. Les synthèses archivées gardent leur version
  d'origine.
