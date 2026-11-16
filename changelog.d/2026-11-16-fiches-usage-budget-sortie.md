### Fiches d'usage : budget de sortie de la rédaction porté à 64 000 jetons (F05, 2026-11-16)

- **Cause** : pendant l'essai v9, cinq fiches de 14 à 41 claims se sont
  arrêtées sur `max_tokens`, à 16 000 jetons, avec une réponse vide. Le
  raisonnement adaptatif avait épuisé le budget avant d'écrire le moindre
  texte.
- **Correctif** (arbitrage du responsable, liste commune `20261116-1246-b`) :
  `rediger.mjs` demande 64 000 jetons de sortie, en streaming, imposé par le
  SDK au-delà d'environ 16 000. L'effort de raisonnement n'est pas fixé et
  reste le défaut du modèle : seule la coupure change.
- **Raison dédiée** : une réponse arrêtée sur `max_tokens` ne se lit plus et
  ne se rapporte plus comme une `SyntaxError`. Le rapport hors dépôt dit
  « réponse vide : budget de sortie épuisé avant tout texte (max_tokens) »
  ou « réponse coupée par le budget de sortie (max_tokens) ».
- **Ce qui ne change pas** : la consigne (`fiche-usage-v9+26ec769b7e28a398`,
  empreinte vérifiée), le modèle, la structure signée, la contre-lecture et
  les champs du brouillon. Le banc `lib/preparation.test.mjs` couvre la
  réponse vide, la réponse coupée, la requête et son câblage en streaming.
