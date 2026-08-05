### Modifié

- **Le parcours patient legacy redirige vers le portail.** Toute navigation vers
  `/patient/[idAssignation]` est renvoyée sur `/portail/connexion`
  (`next.config.mjs`, `redirects()`). Un seul chemin d'entrée reste proposé au
  patient.

  **307 et non 308**, délibérément : la redirection est une mesure de
  convergence, pas une réécriture d'URL définitive. Un 308 se met en cache
  durablement dans les navigateurs et les intermédiaires — si le retrait devait
  être reporté ou défait, il resterait actif sur les postes patients sans moyen
  de le rappeler. Et **aucun email n'est transmis en query string** vers la
  cible : l'adresse du patient est une donnée de santé indirecte, qu'une
  redirection déposerait dans les journaux serveur, l'historique du navigateur
  et les barres d'URL partagées. `/portail/connexion` la redemande — c'est le
  coût assumé d'une reprise sans fuite.

  La cible n'est pas une impasse, et ça a été vérifié avant d'écrire la
  redirection : les journaux d'exécution de production montrent, sur les
  dernières 24 h, des sessions réellement ouvertes par **Google** et par **lien
  magique**. Les trois drapeaux qui portent `/portail/connexion`
  (`WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, `WN_G5_GOOGLE_PATIENT`) sont
  donc allumés et servants. C'était la question bloquante : rediriger vers un
  écran éteint aurait fermé le parcours au lieu de le déplacer.

### Supprimé

- **Le repli email est retiré des six routes `api/patient/*`** —
  `questionnaire`, `assignations`, `reponses`, `equilibre`, `consentement`,
  `submit`. Elles n'acceptent plus que le cookie de session portail
  `wn_portail`, comme `api/patient/protocole` le faisait déjà.

  Ce repli comparait **une adresse, et rien d'autre**. Il ne lisait ni `actif`
  ni `accessTokenRevoked` : « TROIS PORTES, ET RÉVOQUER LES FERME TOUTES » n'en
  fermait en réalité que deux, et un compte désactivé ou révoqué rouvrait les
  six routes à qui détenait l'identifiant d'assignation et l'adresse du patient
  — deux valeurs qui ne sont pas indépendantes, puisqu'elles voyagent ensemble
  dans le mail d'invitation.

  **Le corriger n'était pas la bonne réponse.** Un premier correctif recoupait
  l'état du compte sur le chemin sans cookie (`isEmailAuthorizedForAssignment`).
  Il refermait le trou de révocation, mais laissait debout une porte que plus
  personne n'a de raison d'emprunter : depuis que `/patient/[idAssignation]`
  redirige, aucun appelant légitime n'atteint ces routes sans session. Ce qui
  restait n'était donc pas une compatibilité, c'était une surface d'attaque —
  identifiant deviné plus adresse devinée, sans aucun secret. La fonction et
  son test dédié sont supprimés avec le repli.

  Cela ne casse pas l'usage mesuré : les **61 réponses déposées par 8 patients
  distincts sur 30 jours** hors session portail arrivaient par une navigation
  qui, désormais, atterrit sur `/portail/connexion`. Le parcours est déplacé,
  pas fermé — c'est bien la redirection qui rend le retrait tenable, et elle
  part dans le même lot.

  Les codes de refus **sont désormais uniformisés en 401**, sur les six
  routes ET sur `api/patient/protocole` — pas 404/403 comme une première
  version de ce lot le proposait. La revue adversariale a trouvé pourquoi
  c'était insuffisant : le hub patient (`portail/[token]/questionnaires/[idAssignation]/page.tsx`)
  ne redirige vers le gate de reconnexion que sur 400/401 — une session
  expirée (TTL 12 h glissantes) sur un lien profond rouvert rendait 404, et le
  patient atterrissait sur un écran d'erreur sans aucun chemin de retour. 401
  restaure cette reprise. Le refus tombe **avant toute lecture en base** : un
  identifiant deviné ne déclenche plus une seule requête.

  La page `app/patient/[idAssignation]/` reste dans le dépôt, inatteignable
  derrière la redirection. Son retrait effectif devra vérifier que le portail
  couvre les deux gestes qu'elle portait en plus de l'entrée dans un
  questionnaire : le **recueil du consentement RGPD** (`ConsentScreen`) et la
  **consultation des réponses verrouillées** (`ConsultationScreen`).
