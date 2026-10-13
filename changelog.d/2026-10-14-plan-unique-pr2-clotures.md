### Plan unique WellNeuro 6.0, PR 2 : clôtures des campagnes et des lots, gabarits vides supprimés, audit régénéré (D-285 §7, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucune règle clinique.
- Cinq campagnes fermées au sens de l'audit des campagnes
  (`scripts/wn-campaign-audit.mjs`), lots ouverts fermés dans le même commit,
  `lot_courant` à « aucun » : compléments clean label (abandonnée, objet livré
  par le rayon compléments), journal alimentaire 21 jours (abandonnée,
  transférée au plan : J2-alim), agenda alimentaire (terminée, barème gelé au
  plan sous la porte des 21 jours), chaîne alimentaire (abandonnée, barème
  gelé, moteur de propositions abandonné, rayon fiches conseils doublon de
  D-251), échéance HDS G-TRUST-04 (terminée : annexe signée D-121,
  décommissionnement D-120).
- Deux mots de statut (« clos », « close ») remplacés par « terminée » datée ;
  quatre corrections de forme (C2, C5, biologie exploitée, alliance) ; les
  cases « Done » restées ouvertes des campagnes fermées sont cochées sur
  preuve relue ou reçoivent une ligne datée.
- Cinq gabarits de lots jamais remplis supprimés (compléments clean label,
  `lots/LOT-00` à `LOT-04`), après `lot_courant` « aucun » ; leur texte reste
  dans l'historique Git.
- `docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md` régénéré par script.
