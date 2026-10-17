### Sécurité : SAF-EI-01 amendée est signée — la pause sur effet indésirable et la garde de diffusion s'activent au déploiement (D-281 §6, M-1 puis J1-sécu, sans migration, 2026-10-17)

- **La signature** : déclaration du responsable rendue en séance le
  2026-10-17, après lecture de la conduite et des trois points qu'elle engage
  (D-195). Surface relue :
  `docs/claude/campagnes/SURFACE_RELECTURE_SAF_EI_01_2026-10-17.md`. La règle
  passe en version `safety-effet-indesirable-nnpp2-v2`, avec quatre champs
  posés : validation, date, source (texte de D-281 §6) et empreinte du
  périmètre (la conduite et les trois textes patient).
- **Ce qui s'active au déploiement** (le drapeau `WN_EI_INTERRUPTION` vaut
  déjà `1`) :
  - au portail, l'élément désigné, ou les compléments, passe en pause avec
    les textes signés ;
  - la diffusion est refusée tant qu'un signalement attend l'avis du
    praticien ;
  - la Boussole, les fiches d'assiette et l'aperçu praticien portent la
    marque « en pause ».
- **Effet assumé sur les programmes servis** (D-281 §6 a) : la règle passe de
  « candidate » à « validée », et l'empreinte des cartes change. Les
  programmes approuvés deviennent « indisponibles » au portail jusqu'à leur
  nouvelle version, que le praticien diffuse aussitôt après le déploiement.
  Pour un dossier dont le signalement a reçu l'avis « impliqué », la nouvelle
  version porte l'aménagement consigné dans l'avis : la pause ne vise que la
  version désignée et ne passe pas à la suivante.
- **Autres effets du déploiement** :
  - au panneau praticien, la mention « règle non encore signée » laisse place
    aux textes d'attente ;
  - les lectures des signalements et des pauses partent désormais (cockpit,
    vérificateur, rejeu, Fil, portail) ; les migrations de D-281 sont toutes
    constatées en production ;
  - une rediffusion qui remet une fiche d'assiette envoie l'e-mail « document
    remis » ; l'e-mail de diffusion du protocole (`WN_ANNONCE_PROTOCOLE`)
    reste fermé.
- **Différés** : l'avis sans élément sur un programme lisible sans élément
  désignable (Q3 de t25, §8 du plan) ; la visibilité de « Signaler un
  problème » (lot UI à part).
- Aucune migration, `schema.prisma` inchangé.
