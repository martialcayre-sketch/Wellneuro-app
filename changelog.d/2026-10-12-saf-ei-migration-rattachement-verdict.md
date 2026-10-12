### Sécurité : la base reçoit le rattachement à un élément et le verdict du praticien (D-281 lot 2, migration seule, 2026-10-12)

- **Migration seule, aucun code consommateur** : rien ne lit ni n'écrit ces
  colonnes avant la `release-db` approuvée et son constat par conteneur. La
  règle `SAF-EI-01` reste non armée.
- **Le signalement** gagne `rattachement` (`element`, `ne_sait_pas`,
  `autre_produit`) et `element_action_id`. À l'insertion, la base exige un
  programme du patient, approuvé pour diffusion, qui contient l'élément
  désigné ; le rattachement est ensuite figé.
- **Le verdict** vit dans `trust_adverse_effect_verdicts` : « impliqué »
  (élément et aménagement — retirer, différer, réduire — obligatoires) ou
  « non impliqué », daté et nominatif. **Correction tracée** (arbitrage du
  responsable du 2026-10-12) : un verdict erroné se corrige par un nouveau
  verdict qui le supplante, l'ancien reste lisible ; ni UPDATE ni TRUNCATE.
- **Effacement IDP2** : les verdicts partent avant les signalements. Entre le
  déploiement et la `release-db`, un effacement de dossier échoue fermé sur la
  table absente.
- **Contrat SQL** `trust_aer_rattachement_verdict_v1_negatif.sql`, branché au
  CI : chaque CHECK est éprouvé sous son propre nom. Il a attrapé un CHECK
  écrit en disjonction, qui laissait passer un élément sans rattachement.
