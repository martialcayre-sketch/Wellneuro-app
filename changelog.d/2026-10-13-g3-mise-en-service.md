### BioFlow : la mise en service du processus de fond de la file des lectures (D-282, G3 lot 4, 2026-10-13)

- **`Procfile`** : le processus `worker` (`npm run bio:worker-extraction`) est
  déclaré. Il ne tourne qu'après `scale worker:1`, geste du responsable
  (conteneur facturé) ; la garde structurelle du `Procfile` le vérifie.
- **Signal de vie** (`D-282` §7, P2-2 arbitré) : après chaque balayage réussi
  des imports fantômes, le processus appelle la surveillance désignée par
  `WN_BIO_WORKER_SIGNAL_URL` ; son silence prévient le responsable par e-mail.
  Appel borné à 5 s, qui ne lève jamais ; l'adresse n'est pas journalisée.
  Absente, aucun appel.
- **Validation pendant l'attente d'une relance** (P2-6) : acceptée telle
  quelle, rien ne change.
- **Drapeau toujours éteint** : `WN_BIO_EXTRACTION_ASYNC` se pose après le
  constat du conteneur et de son signal ; la route reste sur l'ancien chemin
  jusque-là.
