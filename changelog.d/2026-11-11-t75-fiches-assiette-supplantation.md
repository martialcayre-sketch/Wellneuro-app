### Fiches d'assiette : un claim supplanté ne fonde plus une fiche, jusqu'au patient (D-478, t75, 2026-11-11)

Dette t75 (§8), inscrite par t73. Cadrage et textes validés le 2026-11-11. Aucune migration, aucune re-signature,
aucune `release-db` : aucun fichier du lot n'est sous les chemins de `release-db.yml`. Production : 7 versions de
fiche, 36 clés citées, aucune supplantée ; effet nul au déploiement.

- La lecture unique des claims cités (`claimsValidesEtLeursTextes`) exige aussi `superseded_at IS NULL`, dans la
  même requête. Un claim encore `VALIDE` mais supplanté, réserves de sécurité comprises, produit l'anomalie
  `claim_non_valide` : dépôt et validation refusés, fiche non remise, « indisponible » pour le patient (mention
  inchangée).
- Écran de relecture du responsable : « … ne satisfait pas les critères de validité du corpus. » remplace « … n'est
  pas VALIDE … » (trois textes), comme pour D-472, D-476 et D-479.
