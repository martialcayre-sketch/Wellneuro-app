### J2-base : D-522, le courriel d'un instrument du cabinet suit la copie de l'envoi (H59, lot D-277, 2026-11-14)

Décision de doc, sans code. [[D-522]] amende deux phrases de [[D-515]] pour
qu'elles disent ce que fait #2114 et ce qu'acte l'arbitrage du responsable
`20261114-1335-a` (option C). Textes signés de [[D-277]] inchangés.

- **[[D-515]] §5** : le courriel au praticien d'un instrument du cabinet part
  quand la copie « oui » est lisible, que la réponse diffère de la valeur
  « non » copiée (ou sort des options copiées) et que la table `SAF-QUEST-02`
  est signée. Il ne relit pas le drapeau courant (contre-revue Codex P1 de
  #2114) : drapeau allumé, il part exactement quand un constat naît ; aucun
  patient ne lit « votre praticien sera prévenu » sans courriel.
- **[[D-515]] §6** : drapeau éteint, ni copie, ni constat, ni carte, ni
  message sur un `CAB_` ; le courriel continue pour les assignations déjà
  envoyées drapeau allumé. Après une extinction, la carte du Fil disparaît
  alors que ces courriels restent possibles (`wn-reviewer` P2-1) ; une
  extinction complète passe par un lot dédié, préparé avant l'`env-set`.
- `docs/FEATURE_FLAGS.md` (`WN_ENABLE_DECLARATION_SUICIDE_CAB`) cite la
  réponse au lieu de la question ouverte.
