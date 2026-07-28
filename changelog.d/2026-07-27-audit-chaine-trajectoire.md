### Audit de la chaîne trajectoire patient, et mise à jour du rapport alimentaire (2026-07-27)

Lot **documentaire seul** : aucun code touché, aucune migration, aucune écriture
en base. Deux rapports, dont un nouveau.

**Nouveau — `docs/claude/propositions/2026-07-27-audit-chaine-trajectoire/`.**
La chaîne qui produit la trajectoire d'un patient dans le temps (campagnes
SP-CONV et SP-TRAJ, six lots livrés) n'avait jamais été auditée. Elle l'est ici
avec la méthode du rapport alimentaire du 2026-07-26, et une règle de preuve
ajoutée : **aucun constat de comportement retenu sur la seule lecture du code** —
chacun est établi par une sonde exécutée dont la sortie est citée, puis sa portée
mesurée en base de production (lecture seule).

- **La chaîne praticien est dormante.** `assessment_episodes`, `protocol_drafts`,
  `protocol_checkins`, `protocol_diffusion_approvals`, `protocol_review_flags` :
  **zéro ligne**, pour 17 patients et 76 réponses. Aucun épisode n'a jamais été
  confirmé, donc le Spirale-index, le comparateur multi-cycles, la courbe de
  momentum et le repère de cabinet n'ont aucune donnée à afficher. Fait
  structurant, invisible dans le code comme dans les campagnes.
- **Une absence de mesure est rendue comme un résultat** (F1, prouvé par
  exécution). `construireHistoriqueEquilibre` émet une lecture à chaque jalon
  *passé* dès que des réponses existent *jusqu'à* cette date — pas des réponses
  *nouvelles*. Un patient qui ne revient jamais obtient J21, J42 et J90 à la
  valeur de T0, tous `mesure: true`, et un momentum « stable, écart 0 ». Deux
  frontières écrites l'interdisent mot pour mot (A6-R2, A8-2) ; A8-2 est
  elle-même mal formée — elle définit « non mesuré » par une propriété d'une
  ligne de réponse quand le moteur raisonne sur un agrégat.
- **Le repère de cabinet en hérite** (F1-bis, prouvé) : cinq patients silencieux
  suffisent à franchir `SEUIL_COHORTE_CABINET` et à servir une médiane de `+0`
  sur les trois jalons.
- **Le patient est la seule surface vivante concernée** (F7) : « *n* bilans
  jalonnent votre parcours » et « Stable depuis votre dernier bilan » — quand il
  y a eu un bilan et aucun suivant. La garde D7, qui interdit tout chiffre dans
  les formulations patient, ne scanne pas le composant qui rend ces phrases.
- Également relevés : tolérance de jalon inerte sur les quatre chemins de
  production (F2), étiquette `versionScore` affichée à côté de valeurs
  recalculées sous une autre version (F3), comparateur bloqué définitivement dès
  que deux étiquettes coexistent (F4), carnet alimentaire et trajectoire
  disjoints côté patient (F5).

**Portée réelle, dite explicitement** : aucun de ces constats ne décrit un
incident en cours. Sur 11 patients porteurs de réponses, 3 ont dépassé J21 et
2 ont dépassé J42, tous avec au moins une réponse nouvelle — **zéro jalon
fabriqué à ce jour**. Ce sont des défauts latents, à corriger avant l'arrivée de
données longitudinales réelles.

**Mis à jour — le rapport alimentaire du 2026-07-26.** Il affirmait encore que
les points 2 à 4 de son P0 étaient ouverts alors qu'ils sont mergés (#408), et
son encadré §6 portait une mise en garde **fausse sur ses deux moitiés** :
« un épisode figé en v3 ne se compare pas à un épisode v4, la comparaison reprend
au premier couple v4 ». Rien n'est figé sauf l'étiquette, et il n'y a aucune
reprise. Corrigé sur place, avec le renvoi vers F3 et F4. La question 1 du §7 est
marquée tranchée par #398.
