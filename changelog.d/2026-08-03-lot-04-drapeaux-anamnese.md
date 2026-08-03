### Ajouté

- `extraireDrapeauxAnamnese` (`web/src/lib/consultation/drapeauxAnamnese.ts`,
  LOT-04 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) :
  extraction typée de 8 drapeaux d'anamnèse (5 listes fermées, 3 valeurs uniques)
  à partir du JSON `Consultation.anamnese`, destinée au moteur de règles
  d'orientation (LOT-05). Les valeurs autorisées sont lues dynamiquement dans
  `ANAMNESE_SECTIONS` — jamais dupliquées — pour qu'un changement de libellé côté
  formulaire se répercute automatiquement sans risque de divergence. Jamais
  d'exception, jamais de valeur devinée hors énuméré. `signaux_alerte` filtré
  ici n'est pas une garantie de sécurité : `extraireVigilanceDeterministe`
  (existant, non filtré) reste la source de vigilance praticien.
- Tests (`drapeauxAnamnese.test.ts`, `motifs.test.ts`) : garde anti-dérive à
  libellés figés (une évolution des options d'`anamnese.ts` doit faire échouer
  ce test, pas disparaître silencieusement d'un JSON historique), entrées
  adverses (types inattendus, valeurs hors énuméré, doublons), et couverture de
  `isMotifValide` qui n'en avait aucune.

### Écarté

- Lot d'origine : les motifs énumérés et le schéma d'anamnèse existaient déjà
  (`motifs.ts`, `anamnese.ts`) ; recadré sur le résiduel réel (extraction typée).
  Ni `Consultation.motif` (nullable) ni `anamnese.motif_principal` (texte libre)
  ne deviennent des drapeaux.
