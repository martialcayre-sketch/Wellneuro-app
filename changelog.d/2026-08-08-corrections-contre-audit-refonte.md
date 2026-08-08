### Corrections du contre-audit de la refonte Claude Code

- **P0** — `wn-plan` ne demande plus au fork `Explore` (sans outil `Agent`)
  de déléguer lui-même : il signale la classe à risque en tête de sortie et la
  session délègue à `wn-reviewer` au retour ; renvois `/wn-reprompt` de
  `wn-plan`/`wn-debug` rendus déclaratifs. La rule `clinique-scoring` couvre
  désormais `scoring/`, `clinical/`, `clinical-engine/`, `questionnaires/` et
  les fichiers cliniques de racine (`instruments.ts`, `bibliotheque.ts`…) ;
  le glob mort `questions/**` disparaît. Nouvelle rule `auth-securite`
  (`auth.ts`, `patient-session.ts`, `patient-access.ts`, `portail/**`).
- **P1** — défaut réellement configuré : `model: sonnet` +
  `effortLevel: high` dans `.claude/settings.json`. Chemin Docs/UI/API de
  `wn-lot` rendu solo (cadrage/exécution/revue en session, `/code-review`) ;
  gate Fable aligné partout sur « ≥ 2 signaux forts » (clause disjonctive de
  `wn-lot` supprimée, « raisonnement clinique lourd » retiré des déclencheurs
  de `wn-fable`) ; l'attente CI a un propriétaire unique, `/wn-merge`
  (`/wn-pr` ouvre et s'arrête). `fetchRecent` de `wn-cycle` exige que
  `FETCH_HEAD` récent mentionne la branche par défaut (plus de faux « frais »
  après le fetch d'une autre ref).
- **P2** — clé `globs:` dupliquée retirée des rules (`paths:` est la clé
  officielle) ; `wn-attendre-ci` charge paresseusement auteur du commit et
  existence des runs (1 appel api par SHA au lieu de 3 sur une CI normale) et
  ne fige plus `runsExistent=false` (fausse accusation de branche squashée).
- Non retenu : retrait de l'attente CI côté `/wn-merge` (elle y reste — code
  `5` et snapshot) ; couverture de `web/src/middleware.ts` (inexistant).
