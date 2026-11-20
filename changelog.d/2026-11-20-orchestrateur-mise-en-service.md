### Orchestration : D-540 amendée, mise en service de la passe cloud et lectures GitHub en REST (2026-11-20)

Lot `orchestrateur-mise-en-service` (file D, phase 2 de D-540 §10). Aucune
routine n'est créée, allumée ni lancée.

- **D-540 amendée** sur trois réponses du responsable :
  - `20261120-1231-d` : la passe de la routine **est** la session du lot.
    Elle prend au plus un lot, le mène jusqu'à « prête » ou `bloque`, puis
    s'arrête. Elle ne prend rien tant qu'un lot `cloud` est pris sans PR.
  - `20261120-1232-d` : les lots P0 restent au Mac, car Codex est absent en
    cloud. Le carnet porte `risque` (`P0`, `P1`, `P2`), et la passe
    reclasse elle-même un lot qu'elle juge P0.
  - `20261118-2312-d` (« Prudent ») : une passe par heure de 7 h à 23 h,
    heure de Paris ; au plus 4 lots par jour ; l'hygiène une fois par jour.
- **Décision de passe** : `scripts/wn-orchestrateur-passe.mjs`. Il lit un
  export des registres et son manifeste, puis rend le lot à prendre ou la
  raison de n'en prendre aucun, les signalements de la voie Mac, et l'hygiène
  due. Il écrit aussi la ligne de journal.
  - Il couvre l'interrupteur (seul `false` ouvre), la plage horaire, le
    plafond, les arrêts de soi et les lots déjà tentés.
  - Ses bancs sont ceux de la phase 2.
- **Consigne de la passe** : `docs/claude/templates/ORCHESTRATEUR_PASSE.md`.
  La routine, hors dépôt, ne porte que l'adresse de la page.
- **GitHub en REST.** `gh pr` passe par GraphQL, refusé en cloud. Cinq
  scripts lisent désormais par `gh api`, via `scripts/lib/gh-rest.mjs` :
  `wn-attendre-ci`, `wn-cycle`, `wn-etat-reel`, `wn-guetteur` et
  `nettoyage-branches.sh`.
  - Ce dernier se dégradait en silence : branches des PR ouvertes non
    protégées, « aucune preuve », code 0.
  - Il s'arrête maintenant en code 3 si la liste des PR ouvertes est
    illisible, et dit « lecture GitHub en échec » sur une preuve illisible.
- **Carnet et registre** : champs `lieu`, `nature` et `risque`, contrôlés par
  `scripts/lib/registres.mjs` ; boîte émettrice `orchestrateur`.
  `CLAUDE.md` et `docs/ROLES_MACHINES.md` décrivent les sessions de passe.
