### Ajouté

- **Rayon corpus « douleur » (notebook 06 — Douleurs chroniques)** dans la recherche
  corpus clinique du praticien (`dashboard/bibliotheque`), derrière
  `WN_RECHERCHE_CORPUS_ENABLED` (éteint par défaut). Ses 651 claims sont validés et
  signés ; le rayon complète `cognition` et `intestin`, et clôt le LOT-02.

### Sécurité

- **La route du tiroir compléments (`/api/praticien/complements/corpus`) ne sert plus
  que le rayon `micronutrition`.** Elle validait le paramètre `rayon` par une regex
  syntaxique et servait donc n'importe quelle entrée de `RAYON_VERS_NOTEBOOK` derrière
  `WN_C4_ENABLED` seul — sans jamais consulter `WN_RECHERCHE_CORPUS_ENABLED`, censé
  garder les rayons de la recherche corpus. Leur drapeau n'était pas un interrupteur.
  Allowlist d'un seul rayon désormais, ce qui ferme aussi l'exposition de `cognition`
  et `intestin` ouverte depuis leur branchement.

### Modifié

- Les listes de rayons refusés des deux routes corpus sont **dérivées** de
  `RAYON_VERS_NOTEBOOK` au lieu d'être énumérées : un rayon ajouté à la carte sans
  être ajouté à une allowlist est couvert par les tests d'office.
