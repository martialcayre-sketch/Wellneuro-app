### Synthèse IA : ce que le service n'applique pas part au modèle, consigne `synthese-v34` (D-511, t77, 2026-11-13)

Arbitrages `20261113-0923-a` à `0926-a` du 2026-11-13. Solde la dette t77 (D-491 §7, D-495 §8, D-500 §5) sur le
patron de D-471. Aucun seuil, aucune migration ; `release-db` sans migration au merge (contrat écrit dans
`orientationService.ts`).

- Nouveau module `web/src/lib/synthese/blocReglesNonServies.ts` : le bloc « Règles non appliquées par le service »
  distingue quatre situations — sources de l'orientation non vérifiées, règles d'orientation non appliquées, règles
  d'arrêt suspendues, règles d'arrêt non évaluées (fenêtre d'arrêt dépassée ou non valide, passation datée après la
  date du jour de D-508) — avec leur motif, sans identifiant de règle ni claim. Il part même quand le bloc de
  recommandation est absent.
- Consigne `synthese-v34` : une section neuve ; une seule mention au praticien, aucun lien entre une règle d'arrêt et
  une exploration précise, rien dans `narratif_patient`. La section v33 est intacte.
- Corpus illisible : la ligne de vigilance déterministe « Convergences non évaluées : la validité de leurs sources
  n'a pas pu être vérifiée. », texte du cockpit.
- Trace : `donneesEntree.blocReglesNonServies`, identifiants et motifs des trois listes, deux booléens.
- Sept constats routés par les revues de #2025 : journalisation de la lecture partagée, mocks, bancs croisés,
  contrat de `lectureOrientation`, deux compléments à D-495.
- Contre-revue Codex P0 (D-505, mode `revue`) : aucun P0 ni P1 ; un P2 corrigé (fenêtre servie non entière ou non
  positive ignorée comme malformée).
