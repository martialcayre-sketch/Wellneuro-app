---
id: "LOT-05"
titre: "Activation JA5-05"
statut: "en_cours"
---

# LOT-05 — Activation JA5-05

## Objet

Activer la boucle de décision JA entre praticien et portail patient, en liant un
snapshot JA au contexte protocole actif via un jalon de phase (J7/J14/J21), un
delta de décision, un retour patient et des indicateurs de charge perçue.

## Avancement

- API praticien d'activation ajoutée (`GET` état courant, `POST` activation).
- API portail patient ajoutée pour lecture de la décision active.
- Couche de persistance enrichie pour la création d'un snapshot d'activation
  append-only, sans migration Prisma.
- UI praticien reliée à l'activation (jalon, retour patient, charge perçue,
  budget global).
- UI patient reliée à la restitution de décision active.
- Tests unitaires API et composants ajoutés/ajustés.
