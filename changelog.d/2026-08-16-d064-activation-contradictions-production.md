### D-064 — le frein de `D-053` §5 était inopérant, les contradictions sont activées en production (2026-08-16)

Revue `wn-reviewer` a posteriori des trois PR cliniques de `D-061`/`D-062`/
`D-063` (mergées sans revue depuis un conteneur distant). Finding critique :
la signature conjointe arrêt + contradictions ne produisait pas le frein
qu'elle revendiquait. `tableArretSignee()` ne teste que la signature — sous
un `WN_ENABLE_ORIENTATION_NNPP2` déjà posé — quand `contradictionsActives()`
exige le drapeau EN PLUS ; `WN_ENABLE_CONTRADICTIONS_NNPP2` étant absent de
tous les scopes Vercel, **l'extinction a tourné sans le frein de `D-053` §5
du 2026-08-15 au 2026-08-16** : sur un dossier du recoupement
`STOP-STR` × `C-STR`, une discordance déclarée était supprimée sans constat
(`DC-30` à revers).

- **Drapeau posé, pas de dé-signature.** `WN_ENABLE_CONTRADICTIONS_NNPP2=1`
  sur le scope Production Vercel, sur instruction expresse du praticien.
  Effet au prochain déploiement : constats `C-STR` servis au cockpit
  (câblage `D-050`) et frein réel sur l'extinction. Alternatives écartées
  dans `D-064`.
- **`docs/FEATURE_FLAGS.md` remis à l'état réel.** Il affirmait encore
  « fermé quoi qu'on pose » sur les contradictions et « livrée
  `validationExterne: false` » sur l'arrêt — trois jours après leur signature.
  Un opérateur qui l'aurait cru aurait manipulé un interrupteur armé en le
  croyant inerte.
- **Dettes nommées, non soldées ici** : aucun banc ne joue « arrêt signé +
  contradictions inactives » (la configuration exacte du trou) ; aucun garde
  ne relie `FEATURE_FLAGS.md` aux `validationExterne` réels ; les autres
  findings de la revue (instruction de signature biologie piégée, liaison
  par position des motifs d'abstention) restent ouverts.

Aucun changement de code ni de table clinique : un geste d'environnement
(production) et de la documentation.
