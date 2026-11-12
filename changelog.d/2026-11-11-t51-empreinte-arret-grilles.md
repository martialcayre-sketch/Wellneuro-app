### Table d'arrêt : l'empreinte signée couvre les grilles citées par STOP-STR (D-494, t51, 2026-11-11)

Dette t51 (§8), applique D-400 §1. Re-signature du responsable le 2026-11-11 (question `20261111-2147-a`). Aucune
migration ; release-db au merge (chemin clinique). Aucun changement de comportement au déploiement.

- `STOP_RULES_SHA256` hache désormais `{ regles, grilles }` : la règle STOP-STR et les grilles de Q_STR_01, Q_STR_03
  et Q_STR_04 qu'elle cite (`GRILLES_ARRET = grillesCitees(STOP_RULES_V1)`, même dérivation que l'orientation et la
  biologie).
- Re-signature : date 2026-11-11, empreinte `b73cc1b6…` (précédente `1db9a002…`, D-278 §2). Règle, bornes, claims
  et préflight de fraîcheur inchangés.
- Conséquence voulue : une borne déplacée sur l'une de ces trois grilles ferme la table d'arrêt jusqu'à re-signature.
- §8 du plan : t51 soldée.
