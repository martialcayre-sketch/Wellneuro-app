### Le récit d'étape ne disparaît plus, et deux gardes cessent d'être décoratives (`D-111`)

Correctifs de la revue `wn-reviewer` du LOT-05 PR 2 (verdict GO, quatre points
majeurs). Aucun changement de comportement volontaire : ce sont des défauts.

- **Le patient perdait ses mots à la première reformulation.** La route ne sert
  que les têtes de chaîne ; les récits d'étape étaient filtrés sur la version
  courante, sans le bloc « écrit sur une formulation précédente » qui existe
  pour les amendements — dix lignes plus bas, avec un commentaire décrivant ce
  défaut mot pour mot. Le praticien, lui, continuait de les lire (le cockpit
  filtre sur toute la chaîne) : asymétrie exactement inverse de celle voulue.
  **Le banc verrouillait la disparition** ; il est retourné, et un cas nomme
  désormais le scénario complet.
- **Hors fenêtre, l'écran était vide.** `jalonObjectifDu` rendait un motif, une
  prochaine ouverture et des bornes pour empêcher qu'« un écran qui n'affiche
  rien laisse croire à une panne » — rien n'en était affiché. Le motif est dit,
  sous les mêmes conditions d'invitation que la question.
- **La garde anti-agrégat tenait par un nom.** Écrite
  `reponsesJalon.(reduce|sort)`, elle était franchie par l'alias `etapes`
  introduit une ligne plus loin dans le panneau : une moyenne d'EVA passait les
  deux bancs au vert. Elle interdit désormais `reduce`/`sort` sur **tout
  identifiant** des deux surfaces, les cas licites étant nommés un par un —
  le remède déjà appliqué aux décomptes dans le même fichier. Troisième
  occurrence de ce patron dans le dépôt.
- **La garde « écrivain unique » ne regardait pas les composants.** Le balayage
  s'arrêtait à `src/app/api` et `src/lib` : un Server Action posé dans un
  composant pouvait créer une ratification, un amendement ou une réponse
  d'étape sans faire rougir personne. Racines élargies à `src/app` et
  `src/components`.
- **La fixture d'ancre E2E ne survivait pas à un run tué.** Elle pose un
  `assessmentEpisode` T0 sur `PAT_SEED_01`, alors que trois specs assertent que
  ce patient n'en a aucun — dont un qui passe avant elle. Un `globalSetup`
  balaie l'identifiant réservé avant tout spec ; un `globalTeardown` n'aurait
  pas davantage tourné sur un process tué.
- La fermeture du client Prisma du spec passe au niveau fichier : dans le
  dernier `describe`, elle ne jouait pas sous un `--grep` sur le premier.

Les cinq correctifs de garde ont été vus rouges par les mutations mêmes que la
revue avait employées pour les démontrer.
