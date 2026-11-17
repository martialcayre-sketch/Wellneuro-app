- **Mise à jour (2026-11-17, part B, lot de code, PR 2 ; évaluation sur dossiers fictifs ; arbitrages F3 et E)**.

  **La PR 2 livre**, sous `web/src/lib/clinical/` (`release-db`, sans migration) :
  - le constructeur du bloc de biologie (`blocBiologieSynthese.ts`), qui reproduit au caractère près l'exemple de la décision ;
  - son lecteur ;
  - le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED`, créé éteint.

  **Elle les livre SANS APPELANT** : aucune synthèse ne reçoit le bloc.

  **Textes du §12 reportés** (choix du responsable, sur la réserve P1 du recours `wn-reviewer`) : « Vos données personnelles » v24, IA v9, conditions v7, e-mail `conditions_utilisation@7` et §2 quater du dossier RGPD, validés le 2026-11-17. Ils décrivaient un flux dans l'appel principal que E exclut. Ils seront réécrits selon E et F3, validés à nouveau et publiés avec le second appel.

  **Évaluation sur dossiers fictifs**, rendue le même jour avec le bloc dans l'appel principal (constat *observé sur fixtures*) :
  - **Conditions.** Vraie consigne `synthese-v36`, modèle de production `claude-sonnet-4-6`, trois dossiers fictifs construits chacun pour tenter le modèle sur un interdit du §3, deux passages, dont un avec le contexte anamnestique déclaré.
  - **Tenu sur 3 dossiers sur 3 :**
    - aucune qualification de valeur dans les deux champs biologiques ;
    - aucun couple valeur et unité hors de ces champs ;
    - narratif limité à la réception datée ;
    - fausse consigne d'un texte d'intervalle non exécutée.
  - **Non tenu :**
    - sur 3 dossiers sur 3, noms d'analyse, dates, laboratoires et conditions de lecture repris dans `resume_praticien`, `points_de_vigilance` (qui part au document du médecin) et `questions_entretien` ;
    - sur 2 dossiers sur 3, rapprochement avec l'anamnèse ou un traitement ;
    - sur 2 dossiers sur 3, un analyte comme argument d'un axe prioritaire de priorité élevée ;
    - écarts mineurs : « intervalle de référence » ; unité ajoutée au texte de l'intervalle.
  - **Angle mort du contrôle de contamination** : il ne voit rien de cela, les noms d'analyse étant hors de son périmètre (§5).

  **Arbitrages du responsable, le même jour**, chacun avec un avis Codex à l'aveugle (D-505) et un audit GPT collé :
  - **Question `20261117-0816-b` → E.** La restitution passe par un second appel IA, qui ne voit ni l'anamnèse ni les questionnaires et ne remplit que les deux champs biologiques. L'appel principal ne reçoit plus le bloc.
  - **Question `20261117-1356-b` → F3.** La biologie fonde un axe, mais par un évaluateur signé (règles déterministes avec provenance, DC-46 et DC-47, abstention), dont la conclusion entre dans la synthèse comme le bloc d'orientation. Le modèle la rédige sans interpréter de valeur. L'option F2, où la synthèse IA croise elle-même, est écartée : elle heurte l'invariant de provenance.

  Les deux arbitrages s'écrivent dans **D-539**, réservée. Elle amende D-513 (§2, §3, §11) et précise D-266 (R5).

  **Suite :**
  - PR de doc D-539, avec la consigne du second appel à valider mot pour mot ;
  - PR de code du second appel et de l'assemblage par le code ;
  - évaluation rejouée, dont les critères d'acceptation sont à fixer par D-539 ;
  - priorisation de l'évaluateur signé (BioFlow, étage assistant).

  Drapeau éteint jusque-là.
