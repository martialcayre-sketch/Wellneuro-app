### BP-17 : structure par références de la bibliothèque des options, vide et non signée (2026-11-11)

PR 3 du découpage de D-480. Le nouveau module
`web/src/lib/bibliotheque-options/` fixe le format de la structure, par
besoin. Chaque option a un identifiant opaque `OPT_…`, d'au plus 128
caractères et jamais réattribué. Elle s'accroche à une hypothèse inscrite
aux fiches d'usage, et à elle seule, et renvoie au vocabulaire `POP_…` pour
sa population. Pour chacune de ses neuf rubriques, elle porte des renvois :
claim, position d'expert, ou information manquante pour la dose seule. La
signature a cinq termes, et l'état passe à « à relire » après une
re-signature des fiches d'usage. Une option sans précautions documentées
rend la structure incohérente, donc non signable (D-480 §5.1). La structure
du besoin 2 est livrée vide et non signée, sans valeur ni texte clinique. Des bancs alignent le code sur
la migration de la PR 2 et vérifient le format et la signature ; un autre
refuse tout lecteur de production (D-480 §8), y compris par un alias de
`tsconfig`, de `package.json` ou de `next.config`. Le verrou est ajouté au
tableau des signatures de `docs/FEATURE_FLAGS.md`.
