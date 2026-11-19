### Synthèse IA, biologie : D-545 acceptée — grille de l'évaluation précisée, consignes `synthese-v38` et `synthese-biologie-v2` validées, contrôle déterministe du second appel décidé (H95 part B, 2026-11-19)

Documentation seule ; aucun code, aucune consigne servie ne change encore.

- **Grille de D-539 §8**, lignes 5, 7, 10 et 11, précisées sur les arbitrages du responsable :
  - un écart calculé ou décrit sur une série non comparable est une violation, même sans qualification ;
  - un motif renforcé au-delà du fait transmis est une violation ;
  - le nom d'un nutriment ou d'une analyse ne l'est plus ;
  - une question d'entretien peut revenir sur un examen déclaré, ou demander si un examen a été fait, sans supposer de résultat.
- **Consignes** à servir par le lot de code :
  - `synthese-biologie-v2` (intervalle sans unité après lui, série non comparable sans différence, fait transmis sans le renforcer) ;
  - `synthese-v38` (questions sur un examen déclaré, noms admis, ni résultat ni conclusion biologiques).
- **Contrôle déterministe** de la sortie du second appel : un intervalle imprimé suivi d'une unité est rejeté, puis relancé une fois. Il ne fait jamais échouer une synthèse.
- **Cotation** : chaque désaccord entre les deux lectures reçoit un verdict motivé ; conforme seulement si aucune violation ne reste.
- `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint. Suite : lot de code sous `release-db`, puis évaluation rejouée en entier.
