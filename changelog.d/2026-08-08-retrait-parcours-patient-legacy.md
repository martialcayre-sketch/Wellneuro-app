### Supprimé

- **Le parcours patient legacy `web/src/app/patient/`** — page, layout et banc.
  Il était inatteignable depuis le 2026-08-05 (redirection 307 vers
  `/portail/connexion`), et le cadrage prévoyait de lui poser une date-cible de
  retrait ; l'arbitrage du 2026-08-08 a préféré le retrait immédiat. Le seul
  `href` interne qui le visait encore vivait dans la page supprimée.
  La règle gardée par son banc — `consentementPossible` sur recueil périmé —
  reste couverte par le banc de l'écran portail, qui consomme la même route.

### Modifié

- **La redirection des anciens liens passe de `next.config.mjs` à
  `web/src/middleware.ts`**, et ce déplacement corrige une fuite réelle. Le
  dépôt affirmait depuis le 2026-08-05 qu'« aucun email n'est transmis en query
  string vers `/portail/connexion` » — c'était faux : un `redirects()` recopie
  la query string d'origine dans sa destination, donc `/patient/ASS_x?email=…`
  produisait `/portail/connexion?email=…`, déposant une donnée de santé
  indirecte dans les journaux serveur, l'historique du navigateur et les barres
  d'URL partagées. Aucune écriture déclarative ne l'empêche (une query portée
  par la destination est *fusionnée*, pas substituée), et garder `redirects()`
  « en filet » ne marchait pas non plus : il s'exécute **avant** le middleware
  et le neutralisait entièrement. Personne ne l'avait vu parce qu'aucun test
  n'empruntait cette redirection.
- `web/next.config.mjs` : le reste du motif est réécrit. Elle n'est plus une convergence entre deux parcours vivants mais le
  seul reste du legacy, maintenu pour les liens e-mail déjà partis chez des
  patients — les retirer les ferait tomber en 404 au lieu de les ramener au
  portail. Le 307 (et non 308) tient pour la même raison qu'avant : un 308 en
  cache sur un poste patient est irrattrapable.
- `orientationEngine.ts` et `orientationRulesV1.ts` ne déclarent plus
  `sum_decimal`, `count_threshold` et `ecab` « ouverts » : la PR #583 les a
  fermés le 2026-08-05, gardes vérifiées ligne à ligne dans
  `web/src/lib/questions.ts` (L2517, L3357, L3706) et trois bancs dédiés. Le
  dépôt contredisait sa propre correction à deux endroits.

### Ajouté

- `web/e2e/parcours-legacy-redirection.spec.ts` : la redirection 307 est enfin
  empruntée par un banc — code, destination, absence de recopie de l'identifiant
  et de l'e-mail dans l'URL cible, `X-Robots-Tag`, et le parcours suivi jusqu'au
  portail. Aucun test ne l'empruntait, alors que le retrait fait passer la
  conséquence d'une panne de « parcours dégradé » à « 404 sur un lien reçu par
  e-mail ».
- Un test de **non-résurrection** dans `auth.roles.guard.test.ts` : un revert qui
  restaurerait `app/patient` sans réinscrire sa racine laisserait une page
  patient obtenir une session NextAuth sans témoin.

### Connu

- `web/src/app/api/patient/assignations/route.ts` n'a plus d'appelant depuis ce
  retrait — elle n'était consommée que par la page supprimée. Non retirée ici :
  le retrait d'une route d'API se décide séparément.
