### Biologie : annuler un résultat saisi par erreur, la migration seule (BP-09, D-291, 2026-10-14)

PR 1 du lot BP-09 (fiche LOT-09) : migration seule, aucun code applicatif.
Rien n'écrit ni ne lit encore la table ; le code consommateur (lecteurs de
calcul, route, fiche praticien, effacement nommé) viendra dans la PR 2, après
la release-db approuvée et constatée par conteneur.

- **Table neuve `annulations_resultats_biologiques`** (migration
  `20261014200000_annulations_resultats_biologiques_v1`), en ajout seul : deux
  actes, `annulation` (motif fermé : mauvais dossier, mauvaise date de
  prélèvement, mauvais analyte) et `revocation` (motif fermé : mauvais
  résultat annulé, résultat vérifié exact, motif d'annulation erroné). Aucune
  valeur, aucun analyte, aucune date recopiés ; aucun texte libre.
- **Refus en base** : résultat d'un autre dossier, acte d'un autre praticien
  que celui du dossier, annulation d'une ligne déjà corrigée, seconde
  annulation active sur un même fil (fourche comprise), révocation qui ne
  vise pas une annulation de ce résultat ou qui vise une annulation déjà
  révoquée ; UPDATE et TRUNCATE refusés ; instant et ordre posés par la base.
  RLS activée sans politique ; clés RESTRICT vers le dossier et le résultat.
- **`resultats_biologiques` intacte** : ni colonne, ni trigger.
- **Contrat négatif** `annulations_resultats_biologiques_v1_negatif.sql`
  (quinze promesses), branché au CI ; six mutations du trigger le font
  échouer, chacune au cas qu'elle vise.
- **D-291** amende D-124 §3 ; registre RGPD (rubriques 2 ter et 5) mis à jour
  avant la table.
