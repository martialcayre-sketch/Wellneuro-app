### Corrigé

- **Fuite de contenu praticien dans le booklet patient.** Le document envoyé par
  e-mail au patient rendait les **axes prioritaires**, les **points de
  vigilance** et les **questions d'entretien**, contournant le field-filter de
  `documents/depuisSynthese.ts` qui déclare les trois « jamais patient ».
  - La vigilance est pré-remplie par `extraireVigilanceDeterministe` avec les
    signaux d'alerte déclarés — dont « Idées noires ou suicidaires », suivi de
    « avis médical à évaluer en priorité ».
  - Le bloc **axes** était la même fuite sous un autre nom de champ, trouvée par
    une revue adversariale : `axe.arguments` porte les libellés d'interprétation
    destinés au praticien, et `axe.points_a_confirmer` porte — contrat JSON à
    l'appui — « Question à poser en entretien ». Retirer `questions_entretien`
    en laissant ce champ-là déplaçait la fuite au lieu de la fermer.

  Le patient reçoit désormais le narratif qui lui est destiné et la note de son
  praticien. Rétablir un profil par axes est une **décision produit** : elle
  suppose des libellés écrits pour le patient et une mise à jour du
  field-filter. Sept tests rendent les trois blocs impossibles à réintroduire.

### Ajouté

- **Garde de registre sur le narratif lu par le patient.**
  `documents/vocabulaire.ts` expose `termeAnxiogene()` — urgence, urgent,
  danger, alarmant, grave, sévère, inquiétant, immédiatement, risque élevé,
  sans délai — avec **frontières de mot et normalisation d'accents réelles** :
  « aggrave » et « persévère » (libellé du catalogue) ne la déclenchent plus, et
  elle renvoie le **mot du praticien**, pas la racine.

  `POST /api/praticien/booklet` répond un **avertissement confirmable**
  (`needsConfirmation` + `confirmerRegistre`), journalisé dans `BookletEnvoi`,
  et non un refus. La raison est vérifiable : le narratif d'une synthèse IA
  n'est éditable à aucun moment de son cycle de vie — `action:'enregistrer'`
  exige `Brouillon_Praticien`, l'envoi exige `Validee_Praticien`, et les deux
  ensembles sont disjoints. Un refus dur aurait dit « reformulez » sans qu'aucun
  écran ne le permette. `confirmerRegistre` est distinct de `forceSend` : un
  seul drapeau ferait confirmer d'un clic deux décisions sans rapport.

  Les surfaces praticien (résumé, axes, vigilance, champs `protocol` du
  catalogue) ne sont pas concernées : leur franchise clinique est voulue.

### Modifié

- **Prompt de synthèse `synthese-v4`** : section « Ton du narratif patient » —
  interdit le registre alarmiste, la recopie littérale des libellés
  d'interprétation destinés au praticien, et la mention des signaux d'alerte
  déclarés dans `narratif_patient`. Les synthèses archivées gardent leur version
  d'origine.
