### Ajouté

- **Portail patient — « Mon bilan ».** Le bilan neuronutritionnel transmis par le
  praticien se lit désormais dans l'espace patient (`/portail/<token>/bilan`),
  avec impression ou enregistrement en PDF. L'accès n'apparaît dans le hub que
  si un bilan a réellement été **transmis** : la visibilité se fonde sur un envoi
  de statut `Envoye` (`booklet_envois`), jamais sur une synthèse seulement
  validée — le praticien valide souvent avant de décider s'il envoie.

  Première étape de la sortie des données de santé du flux SMTP (audit HDS du
  2026-07-24) : le corps de l'e-mail de booklet porte aujourd'hui le nom du
  patient et son narratif en clair, à travers un relais Google Workspace qui
  n'est pas certifié HDS. Cette page est la destination ; le retrait du contenu
  clinique de l'e-mail suit dans un lot distinct, une fois celle-ci en
  production.

  La projection servie au patient (`lib/documents/bilanPatient.ts`) est **typée**
  et ne porte ni axes prioritaires, ni points de vigilance, ni questions
  d'entretien — les trois blocs réservés au praticien et au médecin. Le booklet
  obtenait la même garantie en s'abstenant de les écrire ; ici le type ne les a
  pas, et un banc de garde échoue si l'un d'eux reparaît dans la réponse
  sérialisée, signal d'alerte patient compris.

### Modifié

- **La note du praticien est figée à l'envoi** (`booklet_envois.note_transmise`,
  migration additive avec backfill). `syntheses_ia.notes_praticien` reste
  modifiable après un envoi réussi : l'action `annoter` n'a aucune garde de cycle
  de vie, contrairement à `effacer` qui est refusé dès qu'un envoi existe. Tant
  que la note ne servait qu'à composer l'e-mail, cela n'avait pas de conséquence.
  Avec une page qui la lit, une lecture en direct aurait publié au patient un
  texte jamais transmis — et permis d'écrire encore **après la clôture du
  suivi**, alors que tout renvoi y est refusé. Le portail sert désormais
  l'instantané, jamais le champ vivant.

  **Cette absence de garde est un choix, pas une dette.** Le renvoi corrigé
  (`forceSend`) consiste précisément à corriger une note puis à la renvoyer : une
  garde symétrique de celle d'`effacer` interdirait le geste qu'elle prépare.
  C'est l'instantané qui ferme le défaut, et un renvoi en écrit un frais. Reste
  une divergence qu'aucune des deux réponses ne réconcilie, portée comme réserve
  ouverte : sur un dossier clos, annoter est possible et renvoyer ne l'est plus.

  Le backfill ne repose pas sur une mesure mais sur un **invariant**
  (`updated_at <= date_envoi`) : ne sont recopiés que les envois dont la synthèse
  n'a provablement pas bougé, les autres restent nuls. Une première version se
  fondait sur un comptage — vrai le jour où il a été pris, et toujours vrai au
  2026-08-05 (6 envois réussis, 1 portant une note, 0 synthèse modifiée depuis),
  mais rien n'empêchait un praticien d'annoter entre la relecture et le
  déploiement. La condition ne retire aucune ligne aujourd'hui ; elle retire la
  dépendance au temps.

### Corrigé

- **Un bilan rejeté après coup disparaît de l'espace patient.** L'envoi accorde
  la visibilité, le rejet la retire. Sans cette soupape, un praticien qui
  s'aperçoit qu'il a transmis un bilan erroné n'aurait aucun moyen de le
  retirer : `effacer` est refusé dès qu'un envoi existe, et « Rejeter » serait
  resté sans effet sur ce que le patient lit.
- **Le hub cesse de proposer un bilan retiré.** Il calculait sa visibilité sans
  filtrer la synthèse rejetée : « Consulter mon bilan » menait à une page
  répondant « ne vous a pas encore transmis ». La règle vit désormais en une
  seule définition (`whereEnvoiVisible`), servie au hub comme à la page.

  **L'accès au document et l'avancement de la frise sont deux signaux, et non
  plus un seul.** Les brancher ensemble faisait reculer le parcours patient de
  l'étape « restitution disponible » à « votre praticien les prépare » — alors
  que le contrat de trajectoire pose que les signaux ne reculent pas. L'envoi a
  bien eu lieu : la frise le garde acquis, seul le lien suit le rejet.
- **Un compte révoqué ne reboucle plus en silence sur la page de connexion.** Le
  refus opposé à une session lisible dont le patient n'est plus résolvable —
  compte désactivé, jeton révoqué, sessions invalidées — rend désormais `403`
  et non `401`, comme le fait déjà la fiche patient. Le client cessait
  d'afficher quoi que ce soit et renvoyait vers le gate, qui refusait à son
  tour : l'utilisateur voyait une boucle, jamais un motif.
- **Un refus d'accès au bilan laisse désormais une trace.** La route portail
  n'émettait aucun journal de sécurité sur ses deux refus, alors qu'elle garde
  un document clinique — le motif de `portail/assignations` lui est appliqué.
- **L'impression du portail sort un document, pas une capture d'écran** : l'en-tête
  (avec son contrôle de confort de lecture, interactif) et le pied de page de
  l'application disparaissent en média `print`.
