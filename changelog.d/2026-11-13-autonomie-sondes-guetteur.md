### Autonomie des sessions : guetteur borné versé au dépôt, trois sondes de suivi (2026-11-13)

- `scripts/wn-guetteur.mjs` (neuf) : trois sondes bornées, en lecture seule,
  à lancer en tâche de fond pour être prévenu plutôt que sonder à la main.
  - `prete` : les déclarations « prête @<sha> » neuves. Le motif, la clé
    (identifiant du commentaire), les lignes de sortie et `--amorcer` sont
    repris à l'identique du guetteur de l'intégrateur, qui vivait hors dépôt
    sans banc versionné. L'interface change : `--iter` et `--pas` remplacent
    les arguments de position.
  - `merge <N>` : la PR mergée, avec son commit, ou fermée sans merge, pour la
    file qui l'a déclarée.
  - `release-db` : un run en attente d'approbation (le geste reste humain,
    D-087). `--ignorer` écarte les runs déjà signalés.
- Codes : 0 événement, 3 délai échu, et 2 nouveau, « aucune lecture n'a
  abouti ». Le guetteur hors dépôt rendait 3 dans ce cas, ce qui confondait
  « rien vu » et « rien lu ».
- Banc `scripts/wn-guetteur.test.mjs`, câblé dans `npm run check` et dans le
  CI. Il reprend les cas du motif à l'identique, couvre les trois sondes, les
  codes de la boucle et les usages refusés. Il lance aussi le script par un
  lien symbolique : la relecture `wn-reviewer` faite avant le push a trouvé
  que le garde « exécuté directement » sortait alors en 0 sans rien lire, et
  ce cas est corrigé.
- `docs/ROLES_MACHINES.md` (registre des messages) : le guetteur, et le
  constat `crossSessionInbound` = `accept` sur le Mac (2026-11-13).
- Le guetteur en service de l'intégrateur n'est pas touché : la bascule lui
  revient.
