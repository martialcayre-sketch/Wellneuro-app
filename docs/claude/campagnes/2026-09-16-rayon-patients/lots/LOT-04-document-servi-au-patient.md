---
id: "LOT-04"
titre: "Le document servi au patient"
statut: "à faire"
dépend_de: "LOT-03"
---

# LOT-04 — Le document servi au patient

## But

Recueillir une adresse, un NIR et l'identité du médecin traitant, c'est
recueillir des **données nouvelles**. Le document « Vos données personnelles et
leur confidentialité », servi au patient et versionné, ne les mentionne pas.

## Périmètre

`lib/trust/contenus/registre.ts` — `DONNEES_CONFIDENTIALITE_V8`, dérivée de la
v7 : la section « Quelles données sont recueillies ? » nomme les renseignements
administratifs désormais tenus au dossier, et dit qu'ils sont saisis **par le
praticien**, pas par le patient.

- `changeLevel: 'information_substantielle'`
- **`requiresAcknowledgement: true`** — arbitrage du responsable du 2026-09-16.
  Les v3 à v7 ne l'exigeaient pas parce qu'aucune donnée nouvelle n'était
  collectée ; ici, il y en a trois.
- `hash` recalculé — `registre.test.ts:11` verrouille chaque hash publié, et
  modifier un texte sans créer de version casse ce banc.
- Ajout à `REGISTRE_DOCUMENTS_TRUST`.

## Pourquoi une PR à lui seul

Ce lot fait apparaître un **accusé à lever devant chaque patient** à sa
prochaine connexion au portail. C'est le seul changement de la campagne qui
touche directement les patients, et il se relit seul.

## Done

- `registre.test.ts` vert, hash recalculé et non recopié.
- `registre.dossier.test.ts` vert — la liste des sous-traitants ne bouge pas,
  mais le banc rejoue sur la version courante.
- T2 vert.
