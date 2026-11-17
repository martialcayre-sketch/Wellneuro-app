### Synthèse : le bloc déterministe de biologie, son drapeau éteint et les textes d'information qui le déclarent — livrés SANS APPELANT (H95 part B, PR 2, D-513, 2026-11-17)

Lot de la file B (`h95-b-code`). Seconde PR du lot de code de D-513. Le
constructeur vit sous `web/src/lib/clinical/` : le lot passe par
`release-db` (§10). Aucune migration. **Aucune biologie ne part au modèle** :
le lecteur n'est branché à aucune synthèse, et `WN_SYNTHESE_BIOLOGIE_ENABLED`
est créé éteint.

- **Pourquoi sans appelant.** L'évaluation sur dossiers fictifs (§11) a été
  rendue **non conforme** le 2026-11-17 avec le bloc dans l'appel principal.
  Le détail est au journal de H95. Le responsable a tranché le même jour :
  - la restitution passe par **un appel IA distinct**, qui ne voit ni
    l'anamnèse ni les questionnaires (question `20261117-0816-b`, option E) ;
  - la biologie fonde un axe par un **évaluateur signé**, jamais par la
    consigne de synthèse (question `20261117-1356-b`, option F3).

  Les deux arbitrages s'écrivent dans D-539, réservée. Le second appel viendra
  dans une PR suivante, et l'évaluation sera rejouée avant toute pose.
- **Le bloc « Résultats de biologie »** (D-513 §2,
  `lib/clinical/blocBiologieSynthese.ts`) suit le chemin de la fiche :
  - mêmes têtes non annulées, même série par analyte (`serieParAnalyte`),
    mêmes motifs sous les libellés du cockpit ;
  - chaque point porte sa date, l'heure seulement si elle a été lue, la valeur
    et son unité (« unité non renseignée » sinon, une unité vide comprise) ;
  - l'intervalle prend l'une des cinq formes du §2. Les silences de D-267 §5
    priment, et « non imprimé » ne se déduit jamais du seul champ nul ;
  - viennent ensuite le laboratoire et le contexte de prélèvement, champ par
    champ ;
  - le nom du laboratoire et le texte de l'intervalle sont encodés en chaîne
    JSON, chevrons échappés, dans une enveloppe `<textes_laboratoire_cites>` ;
  - le bloc reproduit au caractère près l'exemple de la décision.
- **Le lecteur** (`blocBiologieSyntheseService.ts`) juge le drapeau AVANT
  toute requête. Il exige aussi l'étage des résultats, et seule la valeur
  `true` l'allume. Il ne lit ni marquage, ni commentaire, ni statut, ni
  constat, ni plage.
- **Textes d'information (§12)**, validés tels quels le 2026-11-17 (question
  `20261117-0901-b`) :
  - « Vos données personnelles » v24 ;
  - « L'intelligence artificielle dans Wellneuro » v9 ;
  - conditions d'utilisation v7 ;
  - gabarit d'e-mail `conditions_utilisation@7`, dont l'envoi reste le geste
    du responsable ;
  - dossier RGPD : paragraphe « Biologie transmise à la synthèse » (§2
    quater) et amendements des rubriques 2, 5 et 6.
- **L'entrée publiée de BioFlow** ré-exporte le contexte de prélèvement
  (sixième lecteur hors biologie). Les gardes des lecteurs des résultats et
  des faits du laboratoire inscrivent les nouveaux modules.
