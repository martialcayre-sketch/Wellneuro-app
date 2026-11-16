### Fiches d'usage : plafond de la contre-lecture porté à 16 000 jetons, cause d'un arrêt gardée (F05, 2026-11-16)

- **Cause** : pendant l'essai v9 du 2026-11-16, la contre-lecture des
  précautions de `FU_POLY_AOX_P6` (41 claims) s'est arrêtée au statut
  « incomplete », avec `max_output_tokens` à 4 096. L'outil ne gardait pas la
  cause de l'arrêt.
- **Correctif** (arbitrage du responsable, liste commune `20261116-1518-b`) :
  le plafond de sortie de la contre-lecture passe à 16 000 jetons, avec le
  même raisonnement (`medium`). Une contre-lecture inachevée garde sa cause
  (`incomplete_details.reason`, seulement si elle a la forme d'un code) dans
  la raison de l'échec technique, par exemple
  « contre-lecture inachevée (incomplete, max_output_tokens) ».
- **Ce qui ne change pas** : la consigne (`fiche-usage-v9+26ec769b7e28a398`),
  les modèles, la rédaction, et le sens d'un échec technique, qui n'est ni un
  accord ni un refus et fait échouer la fiche. La lecture du verdict passe dans
  la fonction pure `lireVerdictContreLecture`, couverte au banc
  (`lib/preparation.test.mjs`) avec son câblage.
