### Orchestrateur cloud : plus de plafond quotidien de lots (D-540, amendement du 2026-11-24)

Le responsable a jugé le plafond de 4 lots par jour trop bas : « pas de
limite ». `scripts/wn-orchestrateur-passe.mjs` ne refuse plus aucune prise
au nombre de lots déjà pris dans la journée ; le code `plafond` disparaît.
Les prises du jour restent comptées dans le journal (`prises_du_jour`).

- Le débit reste borné par la cadence de la routine (une passe par heure,
  de 7 h à 23 h), la plage horaire, un lot par passe, la garde de tête
  (aucun lot `cloud` pris sans PR, aucune intention en vol) et l'arrêt de
  soi.
- `D-540` reçoit un amendement daté : plafond retiré, push et PR constatés
  depuis une passe (#2318 et #2319, mergées par l'intégrateur), lots déjà
  tentés laissés à la voie Mac.
- `docs/ROLES_MACHINES.md` et la consigne de passe
  `docs/claude/templates/ORCHESTRATEUR_PASSE.md` : les lignes qui citaient
  le plafond.
- Banc : le cas « plafond quotidien » devient « aucun plafond » (vingt
  prises du jour, la suivante est prise ; la veille à Paris ne compte pas).
