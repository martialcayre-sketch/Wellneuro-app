# LOT-06 — PR de code « boucle de révision biologie » (après release-db)

- **Branche** : `claude/lot-06-arbitrage-biologique-code`, depuis `origin/main`
  frais (`6e2c8a1`, migration `arbitrages_biologiques` mergée par la PR #680 et
  **appliquée en production** par release-db, confirmé par l'utilisateur le
  2026-08-15).
- **Campagne** : chaîne T0 — LOT-06, dernier lot. Cette PR livre les étapes
  2-5 de la fiche (moteur, courrier, arbitrage, révision) ; la migration de
  DONNÉES du catalogue reste à faire (PR séparée, validation praticien ligne à
  ligne, D-059 §2).

## Livré ici (tout testé, T1 vert, patrons du dépôt)

- `biology-library/indicationsBiologieV1.ts` — table d'indications au patron
  orientation, **vide, non signée** (les règles = contenu clinique, arrivent
  avec le catalogue validé). SHA exporté.
- `biology-library/statuts.ts` (+ banc golden case Lot F) — moteur 6 statuts,
  fail-closed à trois portes, réutilise `evaluerDeclencheur` d'orientation.
- `biology-library/courrier.ts` — courrier via `renderDocumentHtml('medecin')`
  seul chemin ; `SourceBloc` étendu (`biologie_proposition`), modèle
  `courrier_biologie` ; le mot « dosage » est prescriptif → « exploration ».
- `biology-library/arbitrage.ts` + route `api/praticien/biologie/arbitrage`
  (GET/POST, `garder()` standard, dossier clos 409, version active seule,
  P2002 → 409) + `ArbitrageBiologiquePanel` dans `ClinicalRuntimeSection`
  (gaté `CbFeatureProvider` ← `WN_CB_ENABLED`).
- `biology-library/revision.ts` — `refusResolutionSansArbitrage` branché dans
  la route de versionnement (422 `resolution_sans_arbitrage`) ;
  `appliquerArbitrages` côté UI ; `sans_objet` ne résout RIEN (lecture
  conservatrice, D-059 ne mappe que confirme/infirme — à faire trancher si
  gênant : nouvelle version en gardant l'intention, ré-arbitrer dessus).
- GET versions expose `active.contenu` (purpose, critère, charge, actions) —
  matière de la révision côté client.
- Carte de Fil `biologie_arbitree` (`fil/biologieArbitree.ts`, patron
  `jalonsSansDecision`), route du Fil gatée `isCbEnabled`.
- Contrat SQL `cb_arbitrage_biologique_v1_negatif.sql` + étape CI.
- Scénario bout-en-bout Lot G : `biology-library/boucleRevision.test.ts`.

## Décisions locales à connaître

- L'arbitrage N'ouvre PAS la révision (sinon la carte de Fil ne pourrait
  jamais exister) : deux gestes praticien distincts.
- La révision passe par la route de versionnement EXISTANTE (préconditions,
  chaîne C1, no-op, idempotence réutilisés) — pas de seconde voie de création
  de version. `reviseProtocolDraft` reste sans appelant production.
- Routes et UI biologie fail-closed sur `WN_CB_ENABLED` (non posé en prod).

## Reste à faire (lot non clos)

1. **Proposition de catalogue niveau 1** (assistant rédige, praticien valide
   ligne à ligne, claims relus en production) → migration de DONNÉES en PR
   seule + règles dans `indicationsBiologieV1.ts` + signature praticien.
2. Route/écran « proposition de bilan » + bouton courrier (morts sans
   catalogue : verrous table signée + drapeau). Attention RLS deny-all sur les
   tables `biology_*` à vérifier avant la première lecture Prisma.
3. `RequiresMedicalValidation` : aucune colonne en base — entrée du moteur
   aujourd'hui ; trancher le stockage avec le catalogue.
4. Clôture campagne (fiche, ACTIVE_CAMPAIGN via `wn-cycle --appliquer`) quand
   le lot sera réellement fini.
