# LOT-06 « Biologie opérante » — ouverture en cours, rien n'est encore codé

- **Branche** : `claude/lot-06-campagne-t0`, créée depuis `origin/main` frais
  (`28e42a3`, LOT-07 mergé le 2026-08-14 par la PR #678). Arbre propre,
  aucun commit propre au lot encore.
- **Campagne** : chaîne T0 opérationnelle. Le LOT-07 est TERMINÉ et mergé
  (clôture embarquée dans sa PR) ; `active_lot` bascule à LOT-06 au commit
  d'ouverture, comme aux lots précédents. Le LOT-06 est le DERNIER lot de la
  campagne.

## Objectif

Ouvrir le LOT-06 (fiche : `lots/LOT-06-biologie-revision.md`) : biologie
opérante SANS stocker de valeurs d'analyses — proposition de bilan
hiérarchisée et sourcée, courrier médecin, arbitrage praticien sans valeurs,
révision de protocole re-validée. Décision `D-059` préalable à toute ligne de
code, comme pour chaque lot de la campagne.

## Faits établis (à ne pas redécouvrir)

- **Production relue le 2026-08-14 (MCP, lecture seule)** : le squelette
  biologie existe et est VIDE — `biology_nabm_actes` = 987 (référentiel),
  `biology_catalog_versions_courantes` = 1, `biology_source_snapshots` = 1,
  tout le reste (analytes, panels, items, liens, ranges, ratios,
  préanalytique) = 0 ligne. `correspondances_medecin` = 0. AUCUNE table
  d'arbitrage biologique n'existe : la migration `ArbitrageBiologique` de la
  fiche est bien à créer.
- La fiche porte DEUX migrations, chacune en PR séparée avec confirmation
  explicite : le schéma `ArbitrageBiologique` (structurel) et le peuplement
  du catalogue niveau 1 (CONTENU CLINIQUE, validé par le praticien).
- Une exploration de l'existant (biology-library, drapeaux type
  `WN_CB_RESULTS_ENABLED`, statuts d'intervention et `waitFor` du LOT-05,
  `correspondanceMedecin`/`assertRenduMedecinNonPrescriptif`,
  `versioning.ts`/`diffusion.ts`, carte de Fil `jalon_j21`, effacement IDP2,
  contrats SQL `cb_biologie_*`) a été lancée en sous-agent ; son rapport
  n'était pas encore rendu à l'écriture de ce handoff — ne pas affirmer ce
  qu'il dira, le relancer au besoin.

## Décisions prises

Aucune propre au LOT-06. Le patron attendu est celui des quatre décisions
précédentes (`D-055` à `D-058`) : mécanisme livré, permission gatée par un
acte humain séparé — ici le catalogue vide/non signé devrait jouer le rôle
que `BANDES_DE_BRUIT.publiee=false` joue au LOT-07.

## Prochaine action exacte

1. Lire le rapport d'exploration (ou relancer l'agent s'il est perdu).
2. Poser le cadrage `D-059` et soumettre à l'utilisateur les arbitrages qui
   lui reviennent (AskUserQuestion) : séquencement migrations/code (drapeau
   éteint vs release-db d'abord), périmètre exact du catalogue niveau 1 et
   qui le valide, statuts du moteur, forme de l'arbitrage sans valeurs.
3. Commit d'ouverture (fiche `en_cours`, D-059, bascule `active_lot`,
   `wn-cycle --appliquer` pour la vue générée) — puis exécution par étapes.

## Interdits encore actifs

- **Rien ne se code avant `D-059`.**
- **Aucune valeur biologique patient en base** (verrou HDS) — contrat SQL
  négatif exigé par la fiche.
- **Migration ≠ code dépendant** : PR séparées ou drapeau éteint ;
  `release-db` approuvé avant activation ; `schema.prisma` ne se touche
  qu'avec confirmation explicite (le hook la matérialise).
- Aucune ligne de catalogue sans claim ; contenu clinique du catalogue validé
  par le praticien avant toute migration de données.
- `ACTIVE_CAMPAIGN.md` ne s'édite jamais à la main (`wn-cycle --appliquer`) —
  leçon payée au LOT-07, garde `wn-coherence-etat` en T1 et en CI.

## Validations exécutées sur cette branche

Aucune (aucun diff). Dernier état vert connu : `main` au merge du LOT-07
(CI `verify` vert, Vitest 4 788).
