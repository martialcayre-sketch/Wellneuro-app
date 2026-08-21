# Handoff — 2026-08-21 — Le portefeuille de campagnes se réarbitre autour de 6.0

## Ce qui a changé

- **`FILE_ATTENTE.md`** — hiérarchie du 2026-08-21 : rang 0 clôture de
  Biologie consolidée (primaire, LOT-02 courant) ; HDS hors-rang (parallèle,
  bloquée sur l'externe) ; rang 1 **Socle de restitution sûre** (le gate des
  campagnes 6.0) ; rang 2 **6.0-A dossier à deux voix** ; doctrine exécutable
  rang 3 (V3 bloque toute calibration) ; curation signée rang 4 (parallèle
  continu) ; 6.0-B/C/D rangs 5-7 ; nutrition référentielle rang 8 ; mémoire
  relationnelle gatée conformité.
- **Cinq dossiers init-only créés** (`2026-08-21-*`) : briefs seuls, le
  cadrage s'écrit à l'ouverture — convention respectée.
- **Resynchronisations** : Biologie CAMPAGNE.md (LOT-01 terminé, lot_courant
  LOT-02, via `wn-campaign activate` + `sync`) ; `next_action[0]` de
  `.wn/state.json` corrigé (ne désigne plus HDS comme primaire) ;
  `PROJET_CONTEXTE.md` R6/R8 périmées corrigées. `wn-coherence-etat` : 24/24.

## À savoir pour la suite

- La source de l'architecture est le **§8 de l'artifact** « Wellneuro face au
  notebook 00 » (audit → contre-audit → vision → architecture) ; le critère
  d'acceptation transverse des lots 6.0 est le principe du §7.
- **L'ouverture d'une campagne 6.0 reste un geste responsable** : le
  réarbitrage met en file, il n'ouvre rien. Prochaine primaire après la
  clôture biologie : Socle de restitution sûre (petit, 3 lots, il gate le
  reste).
- Le contre-audit a montré que `priorityRulesV1` est signée (D-061/067) et le
  hook « demande » toujours muet sur les tables signées — le lot 2 du Socle
  ferme précisément cela.

## Ouvert

- Arbitrages pendants inchangés (clean-label, JA5-05, rayon-biologie-cb,
  worktree arbitrage-boucle-clinique) ; geste-données recueil 21 j toujours
  seul débloqueur d'agenda/chaîne alimentaire.
