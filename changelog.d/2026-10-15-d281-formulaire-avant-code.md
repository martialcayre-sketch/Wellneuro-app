### Sécurité : le signalement du formulaire d'avant attend l'avis du praticien et bloque la diffusion (D-281 §5, code consommateur, 2026-10-15)

- **Après la migration constatée** : `20261014230000_saf_ei_verdict_formulaire_avant_v1`
  (#1464), release-db approuvée le 2026-10-15, sentinelle liée au run,
  `migrate status` à jour par conteneur. Ce code la consomme ; il ne touche
  ni au schéma ni aux migrations. La règle `SAF-EI-01` reste non armée : la
  garde de diffusion et la pause restent inertes avant la signature. Le
  panneau des signalements, lui, change dès le déploiement : l'écran d'avis
  et le compteur « non traités ».
- **Le formulaire d'avant attend comme les autres** (arbitrage du
  responsable du 2026-10-14). Il s'agit d'un signalement qui répond « oui, lié
  au programme » sans désigner d'élément : dossier mineur ou sans date de
  naissance, ou adulte resté sur l'ancien formulaire. Tant qu'aucun avis n'est
  rendu, aucun programme ne se diffuse au dossier, quel que soit le statut du
  signalement. Le compteur « non traités » du panneau le compte de la même
  façon.
- **L'avis** : la route du verdict et l'écran d'avis l'acceptent. Le
  praticien désigne l'élément en cause dans le programme visé, ou aucun,
  comme pour « Je ne sais pas ». L'écran nomme le formulaire d'avant.
- **Rien en pause au portail** : faute d'élément désigné, aucun élément de ce
  signalement n'est mis en pause, avis rendu ou non. Le calcul pur de la
  pause l'ignore, en plus du filtre de lecture.
- **La revue clinique ne le dit plus « hors règle »** : sa limitation, servie
  règle signée, ne compte plus que les signalements sans programme visé.
  Ceux-là (aucun programme diffusé, « non » au programme, désignation
  illisible) ne reçoivent toujours aucun avis et ne bloquent rien.
- **Banc de cas fictifs** étendu de six cas (24 à 29) ; le cas 19 couvre
  désormais le signalement sans programme.
