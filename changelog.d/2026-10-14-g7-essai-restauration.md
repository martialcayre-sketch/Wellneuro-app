### G-7 : procédure de l'essai de restauration et son script (D-289, 2026-10-14)

- `docs/RUNBOOK.md`, « Essai de restauration (G-7) » : commandes exactes de
  D-289 §2 — sauvegarde de l'hébergeur restaurée dans une base temporaire de
  la même région, archive téléchargée dans le conteneur (jamais sur le
  poste), jeton API temporaire saisi masqué puis révoqué, destruction le jour
  même, consignation en agrégats.
- `scripts/wn-g7-restauration.sh` : se joue dans un one-off interactif ;
  refuse une cible égale à la production ou non vide ; lit la production en
  lecture seule ; rend code, durée et erreurs de `pg_restore` (ligne d'erreur
  seule), migrations comparées à l'heure de la sauvegarde, tables présentes,
  comptes de lignes rapprochés.
- Aucun code applicatif, aucune migration, aucun drapeau.
