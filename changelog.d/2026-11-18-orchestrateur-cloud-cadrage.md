### Orchestration : D-540, cadrage de l'orchestrateur cloud (2026-11-18)

Lot `orchestrateur-cloud-cadrage` (file D) : un cadrage sans code. Aucune
routine n'est créée ni lancée.

- **D-540** cadre une routine claude.ai. À chaque passe, elle lit le
  carnet, le registre et GitHub. Puis elle lance une session cloud neuve
  sur le lot `pret` suivant d'une file, dès que la PR précédente est
  déclarée « prête ». Avant chaque lancement, elle crée une ligne
  d'intention, que deux passes ne peuvent pas créer deux fois. Elle
  respecte un plafond et un budget, et journalise chaque passe.
- **Une session lancée = un lot.** Elle s'arrête après « prête », après
  avoir rangé son lot, ou sur un refus de prise. C'est un amendement de
  D-510 §4, §6 et §7, pour ces seules sessions. Son premier message suit
  un gabarit fixe. Il ne recopie aucun texte libre des registres et
  contrôle chaque identifiant avant lancement.
- **Ce que fait la routine.** Elle lance des sessions et rend un constat
  d'hygiène à la boîte D : `wn-etat-reel`, `nettoyage-branches.sh` sans
  `--appliquer`, `repo-hygiene.sh audit-only`.
- **Ce qu'elle ne fait jamais.**
  - Elle ne merge pas, ne touche pas à release-db, ne signe pas et ne
    répond à aucune question.
  - Elle ne prend, ne débloque, n'inscrit ni ne supprime aucune ligne.
  - Une session lancée ne merge jamais, filet compris. Le filet d'un lot
    lancé revient à sa file, sur la voie Mac (amende D-454 pour ces seuls
    lots).
- **Ce qui part en cloud.** Seul un lot `lieu: cloud` et
  `nature: ordinaire`, aux champs valides, est lancé. Tout le reste va au
  Mac, avec un signal à la boîte D :
  - les lots de migration, clinique, authentification ou revue ;
  - les lots à T2 ou T3 ;
  - les lots qui numérotent une décision ;
  - les lots P0 ;
  - les lots orphelins.

  L'intégrateur et les E2E, `test:worktree` compris, restent au Mac, selon
  la réponse `20261117-0113-d`.
- **L'arrêt d'urgence** se fait de deux façons : désactiver la routine, ou
  poser le document d'arrêt. La passe ne lance que si ce document vaut
  exactement `false`.
- **La mise en service** se fait en quatre phases :
  1. un second essai à blanc, avec la routine et une session de sonde ;
  2. le lot de mise en service ;
  3. le pilote sur la file D (L4) ;
  4. la généralisation, après L3.
- **Les valeurs de départ** (cadence, plafond quotidien, hygiène) attendent
  la question `20261118-2312-d`. Sans réponse, la routine ne s'allume pas.
