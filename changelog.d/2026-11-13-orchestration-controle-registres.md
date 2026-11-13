### Orchestration (1) : un contrôle en lecture seule des registres de coordination, `wn-registres.mjs` (2026-11-13)

- `scripts/wn-registres.mjs` applique les règles écrites de
  `docs/ROLES_MACHINES.md` à un export des trois registres que la session
  vient de faire : liste commune de questions, registre des messages
  (`D-503`), carnet de lots (`D-510`). Il rend trois listes :
  - les anomalies de règle : identifiant hors format, champ requis absent,
    valeur hors énumération, accusé incohérent, lot `pris` sans branche,
    `apres` qui désigne un lot absent, accord `D-505` sur une question qui
    n'est pas ordinaire ;
  - les avis, pour ce qu'aucune règle écrite ne tranche ;
  - les actions dues : ligne `emis` à relancer, lot sans nouvelles depuis
    quatre heures, reprise possible une heure après la sonnette, lot `bloque`
    dont les questions sont répondues, question répondue sans suite.
- Portée bornée, épinglée par le banc :
  - il lit des fichiers locaux et n'écrit rien : ni réseau, ni processus, ni
    écriture au dépôt ou aux registres ;
  - il n'authentifie aucune ligne et n'autorise aucun geste ;
  - il ne recopie aucun texte libre d'une ligne, et signale sans le citer un
    contenu qui ressemble à une adresse, un jeton ou un identifiant de dossier ;
  - il ne lit pas les registres lui-même : un automatisme sans session n'est
    décidé ni par `D-503` ni par `D-510`.
- Codes de sortie : `0` conforme, `1` actions dues, `2` anomalie de règle,
  `3` usage invalide. Un export de plus de trente minutes est dit périmé.
- `scripts/lib/registres.mjs` porte les règles en fonctions pures ;
  `scripts/lib/registres.test.mjs` (19 cas, fixtures fictives) confronte les
  énumérations mot pour mot à `docs/ROLES_MACHINES.md` et rejoint
  `bancs-outillage-check`.
- `docs/ROLES_MACHINES.md` : une section « Le contrôle des registres » dit
  l'usage et la portée.
- Aucune décision `D-xxx`, aucun crochet, aucun réglage, aucun workflow CI
  touché. Le banc n'est pas encore joué par le CI (`verify` ne lance pas
  `npm run check`) : l'étape `ci.yml` part dans un lot à part, en revue P1.
