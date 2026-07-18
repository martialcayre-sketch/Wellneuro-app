# Dettes ouvertes — C5 (Boussole alimentaire)

> Dettes consignées à la clôture du LOT-07 (2026-07-18). Non bloquantes pour
> l'activation autorisée par le responsable, mais **non maquillées comme
> résolues**. Chaque dette a un propriétaire et une échéance de revue. Le volet
> C5B patient reste GO **conditionnel** tant que D-C5-01→04 ne sont pas levées.

| # | Dette | Volet | Propriétaire | Échéance de revue |
|---|---|---|---|---|
| D-C5-01 | Accessibilité non couverte automatiquement : pas d'outil axe/lighthouse dans le dépôt ; lecteur d'écran (NVDA/VoiceOver), zoom 200 % et contraste = revue humaine à faire sur les surfaces boussole (Observatoire praticien + Jardin patient). | C5B patient | dev + praticien | avant élargissement multi-praticien |
| D-C5-02 | Parcours E2E « boussole » des trois fixtures (Sophie Nicola, Jennifer Martin, Michel Dogné) non écrits. Les specs Playwright actuelles couvrent le portail générique et ne pilotent réellement que Michel. | C5B patient / praticien | dev | prochaine passe E2E |
| D-C5-03 | Test de vocabulaire non-culpabilisant dédié C5 absent (TRUST disposait d'un test « lexique interdit », non répliqué pour la boussole). | C5B patient | praticien + dev | prochaine campagne UI |
| D-C5-04 | Revue visuelle en conditions réelles : Observatoire praticien et Jardin patient non revus manuellement après activation. | C5B praticien + patient | praticien | à l'activation, puis 1 mois |
| D-C5-05 | Advisors performance INFO : clés étrangères non indexées sur tables C5A (`ingredient_functional_thresholds`, `clinical_rules`) et index inutilisés. Non bloquant ; à revoir si la volumétrie augmente. | C5A | dev | opportuniste |

## Rollback associé

Le rollback applicatif de toute surface C5 est immédiat et non destructif :
remettre `WN_C5_ENABLED` à `false` (ou la supprimer) dans l'environnement Vercel
Production puis redéployer. **Aucun `DROP`/`DELETE`** n'est autorisé par cette
procédure (voir `HANDOFF_C5.md` et `ACTIVATION_RUNBOOK_C5.md`).
