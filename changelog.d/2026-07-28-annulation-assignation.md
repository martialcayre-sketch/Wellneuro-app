### Praticien

- **Un praticien peut désormais annuler une assignation de questionnaire.** Un
  bouton « Annuler » par ligne du tableau « Assignations récentes » (écran
  Patients) ouvre une confirmation nommant le questionnaire ; l'assignation passe
  au statut `Annulée`.
- **Annulation = statut, jamais suppression** (patron `rendez-vous/annulation`) :
  idempotent, l'assignation reste une trace. Un `delete` serait de toute façon
  exclu — `ProtocolCheckin` et `AgendaSommeilNuit` référencent `Assignation` en
  FK RESTRICT, et les `QuestionnaireReponse` (lien souple, sans FK) deviendraient
  orphelines. **Aucune migration** : `statut` est un champ String libre existant.
- **Portée = seulement les assignations ouvertes** (`statutReponses ===
  'non_rempli'`, jamais soumises). Une assignation ouverte n'a aucune donnée
  clinique serveur (les réponses ne sont écrites qu'à la soumission complète). Une
  déjà remplie porte une passation : l'annuler la masquerait — refus (409),
  bouton absent de la ligne. C'est un autre geste (effacement), hors périmètre.
- **Effectif sur tous les chemins d'assignation, pas seulement à l'écran** (la
  leçon du lot #406) :
  - la route `/api/praticien/assignations/annulation` vérifie l'appartenance
    (assignation d'un autre praticien = introuvable) et la portée avant d'écrire ;
  - `/api/patient/questionnaire` refuse d'ouvrir une annulée (410, « annulé par
    votre praticien ») ;
  - `/api/patient/submit` refuse de la soumettre (409, défense symétrique) ;
  - `mapAssignation` la retire de la liste « à saisir » côté patient ;
  - **la chaîne parallèle de l'agenda du sommeil (Q_SOM_09)** l'honore aussi —
    trouvée en revue adversariale : elle a sa propre saisie nuit-par-nuit et sa
    propre clôture, qui ne passent pas par `submit`. Sans garde, on pouvait
    annuler un agenda ouvert puis, en continuant à saisir des nuits et en
    clôturant, fabriquer une passation clinique qui écrasait l'annulation. Refus
    posé aux deux points de convergence : `authorizeAgendaPortail` (vue + saisie)
    et `cloturerAgenda` (clôture patient comme praticien).
- **Preuves par mutation** : retirer le garde de portée rend une soumise
  annulable ; retirer l'exclusion de `estEnAttenteSaisie` la laisse « à saisir » ;
  retirer la branche patient la rend remplissable — chacune fait rougir un test.

### Réserves

- **Aucun email automatique** n'est envoyé au patient à l'annulation : le lien
  affichera « questionnaire annulé » s'il le rouvre. Prévenir activement les
  patients reste un geste manuel (cf. le message des 4 assignations Q_ALI_01).
- Ne touche pas les assignations déjà complétées (refusées), ni le token/cookie
  `wn_portail` (révocation = niveau compte, trop large pour une assignation).
- **Résiduel connu, inoffensif** : `/api/patient/consentement` accepte encore
  d'enregistrer un consentement sur une assignation annulée. Aucune donnée
  clinique n'en résulte — la soumission reste refusée — mais c'est un chemin
  patient qui ignore l'annulation. À fermer si l'on veut la symétrie complète.
- Aucune migration, aucune modification de `schema.prisma`.
