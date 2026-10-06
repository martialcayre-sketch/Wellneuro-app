# Handoff — 2026-10-06 — BIO-PARCOURS BP-23 : cadrage, pas de code

## Branche et état Git

`docs/bio-parcours-bp23-cadrage`, depuis `main` baf706f4. Doc seule.

## Objectif

Exécuter `D-213` §1 : la relecture cesse d'être un tampon.

## Décisions prises

- Pas de code avant arbitrage : un correctif limité à la route bloquerait
  toute diffusion de protocole réel (le client n'envoie aucune coche).
- Cadrage versé dans la fiche LOT-23 : deux pièges (coche jamais transmise ;
  relecture d'un contenu inchangé = no-op), effets de bord (C5 en V2,
  `prevol`, approbation du cockpit), trois questions avec recommandations.
- « Hors périmètre : l'interface » levé : route et transport côté client dans
  la même PR.

## Fichiers modifiés

Fiche `LOT-23-relecture-reelle.md`, SESSION_LOG, ce handoff.

## Validations exécutées

T1 complet. Cartographie du circuit (agent Explore), relue en principal sur
les points de route, de diffusion et d'empreinte.

## Problèmes ouverts

- Trois arbitrages du responsable, consignés dans la fiche LOT-23 :
  relecture d'un contenu inchangé, ré-enregistrement décoché d'un contenu
  relu, coche explicite à l'écran.
- Les versions déjà enregistrées portent un tampon de relecture non gagné ;
  elles restent telles quelles (append-only).

## Prochaine action exacte

1. Le responsable tranche les trois questions de la fiche.
2. Banc rouge sur la route, puis correctif route + client, T2 sur le parcours
   enregistrement → diffusion.

## Interdits encore actifs

- Aucune modification des versions déjà enregistrées (append-only).
- Aucune modification de logique clinique.
