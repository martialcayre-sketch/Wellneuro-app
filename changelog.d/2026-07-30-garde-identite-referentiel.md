### Le référentiel interne n'est plus un statut qu'on s'accorde

`scripts/lib/verifier_registre_instruments.js` refuse désormais
`statutBibliographique: referentiel_interne_siin` sur une entrée qui nomme un ayant
droit tiers — auteurs renseignés, ou `droits.detail` parlant d'« échelle tierce ».

**Ce qui l'a motivé.** Le 2026-07-30, deux instruments ont été déclarés « du
référentiel interne » puis rouverts à l'assignation sur ce raisonnement : *le PDF du
support de formation ne cite aucun tiers, donc aucun tiers n'a de droits.* C'est un
renversement de charge — le silence d'un document n'est pas une pièce. La revue
adversariale a identifié l'un des deux comme le **VQ11 de Ninot et al. (2010)** :
onze items et trois composantes publiées (fonctionnelle, psychologique,
relationnelle), reproduits à l'identique à l'échelle de réponse près. Le champ
`droits.detail` de sa propre entrée le disait déjà : « échelle tierce que le support
reproduit ». Les deux réactivations sont **annulées** ; `Q_PNE_01` et `Q_TAB_04`
restent fermés, et l'identification VQ11 est consignée au registre pour que la
prochaine tentative parte d'un fait plutôt que d'une absence.

Preuve par mutation : reposer `referentiel_interne_siin` sur `Q_PNE_01` fait rougir
le CI avec le nom de l'ayant droit dans le message.
