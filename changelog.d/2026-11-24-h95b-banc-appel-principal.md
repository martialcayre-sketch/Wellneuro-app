### Banc d'évaluation de la synthèse : mode « appel principal seul » (H95 part B, 2026-11-24)

- **Banc `web/scripts/eval-d539/`** : il sait jouer l'appel principal seul (`lancer.sh <sortie> --confirme principal`), drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED` éteint pendant les générations, comme en service ; le bloc de chaque dossier est construit par le banc avant les générations, sans appel au fournisseur, pour vérifier les entrées et pour la lecture. Le mode `deux` rejoue les deux appels, comme au rejeu de #2286.
- **Lecture** : en mode `principal`, les paquets de lecture indépendante portent les lignes 10 et 11 de la grille de D-545 et les lectures de D-556 §1, recopiées des décisions par script.
- **Version** : le banc exige la consigne principale servie (`synthese-v39`) ; l'appel principal est reconnu par son étiquette, plus par sa version.
- **Inchangés** : aucune consigne, aucun texte clinique ; le banc n'est dans aucune configuration de CI.
