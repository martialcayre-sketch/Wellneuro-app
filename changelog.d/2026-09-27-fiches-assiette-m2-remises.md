### Fiches d'assiette : migration M2, les remises au patient et l'espèce de lecture (D-251, lot 7) (2026-09-27)

- **Nouvelle table `fiches_assiette_remises`.** Elle trace qu'une version de
  fiche a été remise à un patient, par un clic « Valider pour diffusion », au
  titre d'une action Alimentation. Elle ne recopie pas le texte : elle désigne
  la version et recopie son empreinte. Aucun code n'y écrit encore : la remise
  viendra au lot 8, après l'application constatée par conteneur.
- **La base refuse, à l'insertion, toute version qui n'est pas la version de
  référence de sa fiche.** Ni brouillon, ni version retirée, ni repli sur une
  version plus ancienne (amendement du 2026-09-27, point 3). Après un retrait,
  la précédente version validée redevient la référence (point 2). La base
  refuse aussi une empreinte qui n'est pas celle de la version, et une
  approbation posée sur un autre dossier.
- **Une version n'est remise qu'une fois à un patient.** Un clic rejoué ne
  remet rien de plus.
- **Une remise est figée.** UPDATE et TRUNCATE sont refusés par trigger.
  DELETE reste admis, pour l'effacement nommé du dossier, qui supprime
  désormais les remises avant les approbations de diffusion.
- **L'espèce de lecture `fiche_assiette`** rejoint `bilan` et `synthese`
  (D-251 §8). Aucune colonne ne s'ajoute, et toujours aucune date.
- **Contrat SQL négatif** (`fiches_assiette_remises_v1_negatif.sql`, au CI) :
  quatorze promesses éprouvées. Dix-sept mutants de la migration, un par règle,
  le font tous rougir sur le cas qui les vise.
