### Synthèse : bloc déterministe de biologie et drapeau éteint, livrés SANS APPELANT (H95 part B, PR 2, D-513, 2026-11-17)

Lot `h95-b-code` de la file B, seconde PR du lot de code de D-513. Le constructeur
vit sous `web/src/lib/clinical/`, ce qui impose `release-db` (§10). Aucune
migration. **Aucune biologie ne part au modèle** : le lecteur n'est branché à
aucune synthèse, et `WN_SYNTHESE_BIOLOGIE_ENABLED` est créé éteint.

**Pourquoi sans appelant.** L'évaluation sur dossiers fictifs (§11) a été rendue
**non conforme** le 2026-11-17, avec le bloc dans l'appel principal (détail au
journal de H95). Le responsable a tranché le même jour deux questions, dont les
arbitrages s'écrivent dans D-539, réservée :
- `20261117-0816-b`, option E : la restitution passe par un appel IA distinct,
  qui ne voit ni l'anamnèse ni les questionnaires ;
- `20261117-1356-b`, option F3 : la biologie fonde un axe par un évaluateur
  signé, jamais par la consigne de synthèse.

Le second appel viendra dans une PR suivante. L'évaluation sera rejouée avant
toute pose.

**Textes d'information du §12 : reportés.** Sont reportés à la PR du second
appel :
- « Vos données personnelles » v24 ;
- la notice IA v9 ;
- les conditions v7 et le gabarit `conditions_utilisation@7` ;
- le paragraphe « Biologie transmise à la synthèse » du dossier RGPD.

Ces textes décrivaient un flux que ce lot n'ouvre pas, et que l'option E change.
C'est un choix du responsable, sur la réserve P1 du recours `wn-reviewer` : ils
seront réécrits selon E et F3 puis validés à nouveau. Aucun accusé n'est demandé
aux patients pour un flux qui n'existe pas.

**Le bloc « Résultats de biologie »** (D-513 §2,
`lib/clinical/blocBiologieSynthese.ts`) suit le chemin de la fiche :
- même série par analyte (`serieParAnalyte`), mêmes têtes non annulées, mêmes
  motifs sous les libellés du cockpit ;
- chaque point porte :
  - sa date, et l'heure seulement si elle a été lue ;
  - la valeur et son unité, ou « unité non renseignée », y compris pour une
    unité vide ;
  - l'intervalle, sous l'une des cinq formes du §2 : les silences de D-267 §5
    priment, et « non imprimé » ne se déduit jamais du seul champ nul ;
  - le laboratoire ;
  - le contexte de prélèvement, champ par champ ;
- les textes du laboratoire sont encodés dans une enveloppe
  `<textes_laboratoire_cites>` ;
- le bloc reproduit l'exemple de la décision au caractère près.

**Le lecteur** (`blocBiologieSyntheseService.ts`) juge le drapeau AVANT toute
requête. Il exige aussi l'étage des résultats, et seule la valeur `true`
l'allume. Il ne lit ni marquage, ni commentaire, ni statut, ni constat, ni plage.

**L'entrée publiée de BioFlow** ré-exporte le contexte de prélèvement (sixième
lecteur hors biologie). Les gardes des lecteurs inscrivent les nouveaux modules.
