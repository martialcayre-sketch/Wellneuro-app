---
id: "LOT-04"
titre: "Transmission depuis le portail patient"
statut: "en_cours"
dépend_de: "LOT-02, consentement RGPD à jour, LOT-07, BIO-PARCOURS BP-10"
---

# LOT-04 — Transmission depuis le portail patient

## But

Le patient transmet son compte rendu depuis `/portail/[token]`. Un **document transmis** reste distinct d'un **résultat validé**.

## Résultat observable

Le patient voit le statut de son document (en attente, reçu, validé, refusé ou illisible) ; le praticien valide dans l'écran du LOT-02.

## Périmètre

Upload portail (session par lien magique), statut du document, notification praticien. **Migration probable — confirmation obligatoire, seule dans sa PR.**

## Hors périmètre

Toute écriture de résultat sans validation praticien ; messagerie de santé.

## Fichiers probables

- `web/src/app/portail/`
- `web/src/app/api/portail/`
- `docs/DOSSIER_RGPD.md`, consentement versionné

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-02, consentement RGPD à jour. **Précondition de sécurité** (`D-266` §15,
2026-10-04) : LOT-07 (faits du laboratoire transcrits) puis BIO-PARCOURS BP-10
(sécurité biologique, étage 1 : marquage restitué, acte de lecture tracé,
carte « geste »). Ce lot n'ouvre pas avant BP-10 livré.

**Précondition consignée le 2026-10-07 (`D-269` §9) : remplie.** LOT-07
terminé (2026-10-06). BP-10 en production : acte de lecture tracé, carte
« compte rendu à lire » qui ouvre le compte rendu désigné (#1349),
`WN_BIO_LECTURE_ENABLED` posé le 2026-10-06 à 22:12 UTC. Le constat d'usage
de BP-10 attend des lectures consignées ; c'est une observation, pas une
garde.

**Arbitrages du 2026-10-07 (`D-269`)** :
- refus ou illisible : un geste praticien « Écarter ce document », motif
  fermé, purge immédiate ;
- accusé `usage_ia` v6 exigé côté serveur avant tout dépôt ;
- au plus 3 documents « en attente » ou « reçus » par dossier, 10 dépôts par 24 h, mêmes
  types et taille que le praticien ;
- la carte du Fil seule.

**Découpage** :
1. PR 1, la décision et le registre RGPD ;
2. PR 2, la migration `bio_ingest_transmission_patient_v1`, seule dans sa PR ;
3. PR 3, le code sous `WN_BIO_PORTAIL_ENABLED` éteint, avec les textes v6
   et v13 ;
4. l'allumage.

## Étapes

- [ ] Mettre à jour le consentement et le registre **avant** l'ouverture (registre et `D-269` : PR 1 ; textes v6 et v13 : PR 3).
- [x] Mode Plan : droits, taille, types, rétention (2026-10-07, `D-269`).
- [ ] Migration seule si nécessaire, puis code.

## Tests

Sécurité : jeton expiré ou réutilisé, dossier d'autrui, type de fichier ; E2E portail sur fixture ; accessibilité.

## Critères de done

Transmission ouverte après le consentement à jour ; aucun résultat écrit sans validation praticien.

## Résultats

À compléter à la clôture.
