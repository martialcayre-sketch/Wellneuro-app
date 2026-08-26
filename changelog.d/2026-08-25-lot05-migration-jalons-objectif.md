### Migration — la réponse d'étape du patient aux jalons de son objectif (`D-111`)

Une table événement neuve, `reponses_jalon_objectif` : où le patient en est
**par rapport à la version exacte de son objectif**, aux jalons J21/J42/J90 —
en mots, plus une EVA facultative restituée brute.

**Migration seule dans sa PR**, confirmée explicitement en session ; rien ne la
consomme encore. Le code du LOT-05 suit dans une PR distincte, après application
`release-db` approuvée et **constatée par conteneur** (`D-087`).

- **Table propre, pas un élargissement de `protocol_checkins`** : celle-ci est
  ancrée à un protocole (`protocol_draft_id` et `id_assignation` NOT NULL) et
  parle en J7/J14/J21. La fusionner l'aurait rendue bilingue sur ses deux axes —
  un `J21` y aurait désigné deux moments différents selon la ligne.
- **`T0` est refusé comme jalon** : c'est l'ancre des fenêtres, pas une étape.
  La taxonomie est `JOURS_JALON` moins son ancre.
- **EVA bornée 0-10, borne purement technique** (`DC-19`/`DC-20`) : aucune
  bande, aucun seuil, aucune direction, aucune moyenne, aucun moteur ne la lit.
  Régime de `D-088`, appliqué sans l'élargir. Facultative, nullable, sans
  DEFAULT.
- **Texte obligatoire** : l'EVA ne peut pas le remplacer — une ligne au texte
  vide serait un chiffre nu déposé dans un dossier. Le CHECK emploie
  `btrim(texte, E' \t\r\n')` et non `btrim/1`, qui ne retire que l'espace
  ASCII : un texte fait d'une tabulation passait la première rédaction (mesuré
  en revue). Les CHECK de texte déjà en production portent ce trou — dette
  nommée à `D-111`.
- **Ancre des jalons** : celle de toute la chaîne, le `dateT0` du cycle, sans
  colonne ni copie. Compter depuis la naissance de la version aurait fabriqué un
  second calendrier.
- **Aucune contrainte d'unicité** sur (patient, objectif, jalon) : répondre deux
  fois fait deux lignes ; un `UNIQUE` pousserait à l'`upsert`, c'est-à-dire à
  écraser ce que le patient avait écrit.
- FK vers `patients` en `ON DELETE RESTRICT`, effacement de dossier couvert
  nommément, RLS deny-all, un seul index `(id_patient, cree_le)`.

Contrat SQL neuf `alli_jalons_objectif_v1_negatif.sql`, joué au CI et à T3 :
écritures valides acceptées (avec EVA, sans EVA, aux deux bornes, et deux fois
le même jalon), **sept cas négatifs sur trois CHECK** dont `T0`, `J7` et les
blancs non-espace nommément, taxonomie lue dans la **définition** de la
contrainte — les cas négatifs testant des valeurs
refusées, un CHECK élargi à `T0` les laisserait tous verts —, liste blanche de
colonnes visant le taux d'atteinte autant que le score, absence d'unicité
assertée, FK RESTRICT et RLS deny-all.
