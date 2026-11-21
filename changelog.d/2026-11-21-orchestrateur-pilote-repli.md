### Orchestration : D-540 amendée, amorçage et repli de la routine du pilote (2026-11-21)

Mise en service du pilote (file D, phase 3 de D-540 §10). La première passe
s'est ouverte sans clone du dépôt et s'est arrêtée sans laisser de trace dans
les registres.

- **D-540 amendée** sur demande du responsable :
  - la consigne de la routine porte, en plus de l'adresse de la page, un
    **amorçage** (clone du dépôt dans le répertoire courant, contrôle des
    crochets) et un **repli** : sans dépôt, sans crochets ou sans consigne,
    la passe écrit une ligne de journal `erreur_script` qui nomme la cause,
    puis s'arrête. Le repli n'ouvre aucun droit ;
  - une passe ne travaille jamais sans les crochets du dépôt ;
  - le modèle de la passe suit le défaut de `CLAUDE.md`, puisque la passe
    mène elle-même le lot.
- **Constat** de la passe de contrôle, interrupteur fermé : clone, crochet,
  consigne, script (code `2`, `interrupteur_ferme`) et ligne de journal.
  Le push et la PR restent à constater à la première passe qui mène un lot.
- `docs/claude/templates/ORCHESTRATEUR_PASSE.md` et `docs/ROLES_MACHINES.md`
  disent désormais ce que porte la routine.
