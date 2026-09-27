### Fiches d'assiette : migration M2, les remises au patient et l'espèce de lecture (D-251, lot 7) (2026-09-28)

- **Nouvelle table `fiches_assiette_remises`.** Elle trace qu'une version de
  fiche a été remise à un patient, par un clic « Valider pour diffusion », au
  titre d'une action Alimentation. Elle ne recopie pas le texte : elle désigne
  la version et recopie son empreinte. Aucun code n'y écrit encore : la remise
  viendra au lot 8, après l'application constatée par conteneur.
- **La remise en cours d'une fiche est la dernière** (arbitrage du responsable
  du 2026-09-28, amendement de D-251).
  - Un clic qui ne change rien ne remet rien : la base annule l'insertion, sans
    erreur.
  - Une version déjà remise se remet si une autre l'a remplacée depuis. Le
    patient a reçu la v1, puis la v2 ; si la v2 est retirée, le clic suivant
    lui remet la v1.
  - Jamais de retour en arrière sans clic.
- **La base refuse, à l'insertion :**
  - toute version qui n'est pas la version de référence de sa fiche : ni
    brouillon, ni version retirée, ni repli sur une version plus ancienne ;
  - une empreinte qui n'est pas celle de la version ;
  - une approbation posée sur un autre dossier ;
  - une action absente du protocole approuvé, ou qui ne porte pas l'assiette
    de la fiche.
- **Aucune course avec la décision du responsable.** La remise prend le même
  verrou par fiche qu'une validation ou un retrait.
- **Une remise est figée.** UPDATE et TRUNCATE sont refusés par trigger.
  DELETE reste admis pour l'effacement nommé du dossier, qui supprime
  désormais les remises avant les approbations de diffusion. Un nouveau banc
  (`remises.guard.test.ts`) réserve la suppression à ce seul chemin.
- **L'espèce de lecture `fiche_assiette`** rejoint `bilan` et `synthese`
  (D-251 §8). Aucune colonne ne s'ajoute, et toujours aucune date.
- **La table est déclarée en rubrique 5 du dossier RGPD** avant que la
  surface qui l'alimente n'existe. Le nom d'une assiette révèle une
  indication. Sa qualification au titre de l'article 9 reste au responsable de
  traitement.
- **Contrat SQL négatif** (`fiches_assiette_remises_v1_negatif.sql`, au CI) :
  seize promesses, chaque refus reconnu à son message. Vingt-quatre mutants de
  la migration, joués en session, le font tous rougir sur le cas qui les vise.
