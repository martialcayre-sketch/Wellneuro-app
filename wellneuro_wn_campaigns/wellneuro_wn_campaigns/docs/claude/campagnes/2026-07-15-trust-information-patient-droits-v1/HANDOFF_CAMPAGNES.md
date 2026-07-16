# Handoffs TRUST → campagnes futures

> Contrats rendus opposables à la clôture (2026-07-16).

| Vers | TRUST fournit | La campagne doit |
|---|---|---|
| **IDP** (identité patient durable) | exigences minimales d'auth (`AUDIT_AUTH_ET_NOTIFICATIONS.md`), contrat `DelegatedAccessGrant`, cycle de vie du compte, signalements `connexion_non_reconnue`/`appareil_perdu` comme signaux | implémenter sessions révocables, journal de connexions, délégations avec identité réelle de l'auteur ; reprendre D-TRUST-07 (booklet dans le portail) |
| **C3** (documents / correspondance) | choix `partage_medecin_traitant` (événements enregistrés dès V1), provenance `ContentProvenance`, notices contextuelles avant partage | ne partager que si le choix courant est `accorde` ; référencer les versions TRUST sans les copier ; chaîne Relu → Validé → Envoyé |
| **C2A/C2B** (épisodes, timeline) | événements publiables patient : information majeure mise à jour, choix modifié, demande reçue, incident signalé | publier dans la timeline sans exposer les événements techniques |
| **QX** (questionnaires) | notices contextuelles versionnées avant transmission | consommer les textes du registre TRUST, jamais de copie locale |
| **C4** (compléments) | signalements d'effets indésirables (produit déclaré, orientation tracée) | rapprochement avec le référentiel produits ; nutrivigilance documentée |
| **SP-AMB** (écoute ambiante, programme 5.0) | modèle documentaire versionné pour le consentement double niveau (décision A6-3) | document d'information signé = document TRUST versionné ; activation par séance = événement de choix |
| **SP-RUN/C1** (cockpit) | badges de provenance patient (`PatientFacingProvenance`) | tout état « validé » affiché au patient doit porter sa trace |
