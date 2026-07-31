### Modifié

- **Agenda du sommeil — on ne relance plus pour une nuit encore notable.** Affine
  la relance praticien introduite dans ce même lot (drapeau `WN_AGENDA_RELANCE`),
  avant sa première ouverture.

  L'éligibilité était une simple appartenance à trois états sur cinq, sans seuil
  ni compteur : « Relancer ce patient » s'affichait dès que la nuit du jour
  n'était pas notée, donc **dès 00 h 05** sur un patient parfaitement à jour, la
  référence temporelle étant une date nue (`dateJourParis`, sans heure).

  Or `estDateSaisissable` (`lib/agenda-sommeil/nuit.ts`) accepte la nuit
  d'aujourd'hui **et** celle de la veille : un patient qui a noté hier a jusqu'à
  demain matin pour noter celle-ci. **Le suivi traitait en retard ce que la
  saisie traite comme normal** — le versant patient nommait d'ailleurs déjà le
  même état `nuit_a_noter`, une invitation et non un manquement.

  Nouvelle règle, en une phrase : **on ne relance jamais pour une nuit que le
  patient peut encore noter.**

  - `nuit_du_jour_manquante` n'ouvre plus la relance. L'état et son libellé
    « Nuit du jour pas encore notée » restent affichés — le fait est utile au
    praticien —, seul le bouton disparaît. La relance s'ouvre à `silencieux` :
    dernière nuit avant-hier ou plus tôt, donc au moins une nuit
    **définitivement perdue**, que `estDateSaisissable` refuse déjà. Deux nuits
    manquantes, pas une ; la borne exacte est verrouillée par un banc.
  - Un agenda jamais commencé gagne un **délai de grâce de deux jours**
    (`JOURS_AVANT_RELANCE_DEMARRAGE`) : plus de relance proposée le jour de la
    consultation ni le lendemain.
  - La règle est appliquée **aussi côté serveur** (409 `non_relancable`), par le
    même prédicat exporté et non par une copie — un seuil dupliqué est un seuil
    qui finit par diverger, et un onglet resté ouvert porte un `relancable`
    calculé la veille. Les deux populations refusées reçoivent deux messages
    distincts : un praticien qui lit « Assigné aujourd'hui — aucune nuit notée »
    à l'écran ne peut pas s'entendre répondre que la nuit du jour reste notable.

  **Contreparties assumées.** Le praticien ne peut plus relancer délibérément un
  patient dont seule la nuit du jour manque. Et la règle est aveugle aux trous
  **antérieurs** : qui a noté hier est tenu pour actif quels que soient ses
  oublis passés — seule la série en cours compte. Un patient troué mais régulier
  reste donc invisible dans ce panneau ; c'est un manque verrouillé par un test,
  pour qu'il reste un choix relisible et non un oubli.

  Les seuils de `relanceEmail.ts` (`JOURS_ENTRE_RELANCES`,
  `MAX_TENTATIVES_FENETRE`) sont inchangés : ils bornent la **cadence d'envoi**,
  pas l'éligibilité. Aucune migration — la règle se calcule à la lecture.
