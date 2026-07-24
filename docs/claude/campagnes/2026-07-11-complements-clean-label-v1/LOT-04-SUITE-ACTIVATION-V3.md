# LOT-04 — Suite : chantiers d'activation du contrat V3 (avant tout usage réel)

> **Origine** : revue adversariale de la PR #340 (contrat protocole V3), 2026-07-24.
> Verdict : **GO (stub de contrat)**. Le PR est additif et échoue fermé sur les
> deux propriétés qui comptent — la référence catalogue ne fuit pas vers le
> patient (double défense : lecture close sur V3 + projection patient en
> allowlist) et un payload V3 est refusé en lecture. Mais les validateurs
> introduits ne sont **câblés à aucune frontière runtime** : c'est un stub.

## Ce qui est réellement garanti aujourd'hui

- **Lecture** : `reconstructProtocolDraft` (`web/src/lib/protocol/fromPrisma.ts`)
  refuse tout payload de version V3 (garde de version V1/V2 seule) → une
  référence catalogue ne peut ni être reconstituée ni atteindre la vue patient.
  Propriété porteuse, verrouillée par test (`fromPrisma.test.ts`).
- **Génération** : `buildProtocolDraft` rejette toute `supplementCatalogRef`.
- **Projection patient** : `buildPatientProtocolView` et `/api/portail/protocole`
  sont des allowlists (`actionId/type/title/minimalPlan`) — la référence, les
  plans idéal/secours et les doses ne peuvent structurellement pas fuir.

## Ce qui n'est PAS garanti (à brancher avant activation)

La route de persistance **POST `/api/praticien/protocoles`**
(`web/src/app/api/praticien/protocoles/route.ts`) enregistre le `draft` **brut du
corps de requête** via `toDraftCreateInput` (`web/src/lib/protocol/versioning.ts`)
**sans** appeler `buildProtocolDraft` ni aucun validateur structurel. Un praticien
authentifié (ou tout code amont) peut donc faire persister un draft V3 portant une
référence, voire une action `supplement_exploration` avec un champ interdit — la
garde ne s'interpose jamais. C'est un **état préexistant** (la route persistait
déjà des drafts bruts) que ce lot n'aggrave pas, et rien n'est lisible tant que la
lecture refuse V3 ; mais la garantie « validé structurellement » est aujourd'hui
**côté client seulement**.

## Chantiers d'activation (lot ultérieur, ordonné)

1. **Brancher la validation en écriture** : appeler
   `assertProtocolDraftSupplementStructure(draft)` dans
   `POST /api/praticien/protocoles` **avant** `toDraftCreateInput`. Rejeter
   (400) tout draft dont la structure supplément est invalide.
2. **Brancher la validation en lecture** : à l'ouverture de V3, ajouter
   `VERSION_PROTOCOL_DRAFT_V3` aux gardes de version de `fromPrisma.ts` **et**
   de `refValidation.ts`, et appeler `assertProtocolDraftSupplementStructure`
   dans `reconstructProtocolDraft` (à côté de `assertProtocolDraftC5Structure`).
   ⚠️ Ne jamais ouvrir la garde de version sans brancher simultanément le
   validateur — sinon la lecture de références non validées s'ouvre en silence.
   Le test « rejette un payload de version V3 » (`fromPrisma.test.ts`) est le
   garde-fou : il échouera à l'ouverture et forcera le branchement du validateur.
3. **Cardinalité éventuelle** : si le contrat V3 doit imposer une présence ou une
   absence de `supplementCatalogRef` (comme C5/V2 impose ≥1 ref,
   `refValidation.ts`), l'ajouter à la validation de lecture.
4. **Révision V3-aware** : `reviseProtocolDraft` délègue à `buildProtocolDraft`,
   qui jette sur toute référence — un draft V3 est donc aujourd'hui non
   révisable (même limite que `foodCompassRef`/V2). Prévoir un chemin de
   révision qui préserve la référence.
5. **Tests d'intégration** : verrouiller le comportement de
   `POST /api/praticien/protocoles` face à un draft V3 (rejet une fois le
   chantier 1 fait) et la révision V3.

## Gate

Ces chantiers sont un prérequis à tout **usage réel** du contrat V3 (pose d'une
référence catalogue par l'instrument bibliothèque, LOT-06). Tant qu'ils ne sont
pas faits, V3 reste un contrat déclaré mais fermé en lecture — sans surface
patient ni persistance validée.
