---
id: "LOT-06"
titre: "Biologie opérante — catalogue, statuts, courrier, arbitrage sans valeurs, révision de protocole"
statut: "en_cours"
dépend_de: "LOT-05"
---

# LOT-06 — Biologie opérante et boucle de révision

## But

Rendre la biologie opérante pour la boucle de révision **sans stocker de
valeurs d'analyses** (verrou HDS maintenu) : proposition de bilan hiérarchisée
et sourcée, courrier médecin, arbitrage praticien au retour du bilan, révision
de protocole re-validée.

## Résultat observable

Sur la fixture : le moteur propose socle + panels `recommandé`, cœliaque
`conditionnel` (déclencheur digestif rempli), bilan hormonal `conditionnel`
(déclencheur non rempli, condition affichée), cortisol isolé
`non_indiqué_actuellement` — chaque ligne avec claim, remboursement et
`RequiresMedicalValidation`. Un arbitrage `infirme` sur une intention
`conditionnelle_biologie` ouvre une révision : nouvelle version de protocole,
intention résolue avec motif, re-revue + re-approbation avant que le portail
serve la version révisée ; carte de Fil « biologie arbitrée — protocole à
réviser » tant que la révision manque.

## Périmètre

- **Peuplement du catalogue niveau 1** (migration de données — confirmation
  obligatoire, PR séparée ; contenu clinique validé par le praticien) : socle,
  glucidique (insulinémie `RequiresMedicalValidation`), lipides, thyroïde,
  micronutrition, CRPus ; panels conditionnels cœliaque et hormonal avec
  `TriggerConditions`/`ExclusionConditions`.
- Moteur de statuts : `recommandé | optionnel | conditionnel |
  non_indiqué_actuellement | déjà_documenté | à_répéter` (patron orientation,
  claims cités) dérivé du tableau clinique.
- Courrier médecin généré (gabarit non prescriptif — garde
  `assertRenduMedecinNonPrescriptif` réutilisée), consigné dans
  `CorrespondanceMedecin`.
- **Arbitrage sans valeurs** : nouvel objet `ArbitrageBiologique
  { protocolDraftId, intentionId, verdict: confirme|infirme|sans_objet,
  noteCourte, arbitreLe, arbitrePar }` (migration — confirmation obligatoire ;
  entre dans la transaction d'effacement IDP2).
- **Révision** : l'arbitrage ouvre une nouvelle version de `ProtocolDraft`
  (`supersedesDraftId`), résout les intentions `conditionnelle_biologie`
  (`confirme` ⇒ `active` ; `infirme` ⇒ `non_indiquee_actuellement` motivée),
  lève `waitFor` ; la caducité d'approbation existante force re-revue +
  re-approbation ; carte de Fil au patron `jalon_j21` (différence entre deux
  artefacts persistés).

## Hors périmètre

- Saisie/stockage de **valeurs** biologiques (décision HDS préalable — backlog).
- Envoi automatique du courrier (transcription/remise manuelle, V1).
- Notification patient automatique.

## Fichiers probables

`web/prisma/schema.prisma` (ArbitrageBiologique — migration séparée) +
migration de données catalogue, `web/src/lib/biology-library/` (nouveau moteur
de statuts, `remboursable.ts` existant), nouvelles routes
`web/src/app/api/praticien/biologie/*`,
`web/src/lib/praticien/correspondanceMedecin.ts`,
`web/src/lib/documents/vocabulaire.ts:7-33`,
`web/src/lib/protocol/versioning.ts`, `diffusion.ts:75-81`,
`web/src/lib/fil/cartes.ts`, `web/src/lib/patient/effacement.ts`.

## Interdits

- Aucune valeur biologique patient en base (contrat SQL négatif au patron
  `cb_biologie_catalogue_v1_negatif.sql`).
- Aucune ligne de catalogue sans claim (le schéma l'impose — le préserver).
- Migrations et code dépendant en PR séparées (ou drapeau éteint) ;
  `release-db` approuvé avant activation.
- Résolution d'une intention conditionnelle sans arbitrage lié : impossible.

## Dépendances

LOT-05 (statuts d'intervention et `waitFor`).

## Étapes

1. Migration `ArbitrageBiologique` (PR seule) ; migration de données catalogue
   (PR seule, contenu validé praticien).
2. Moteur de statuts + tests sur fixture.
3. Courrier médecin + consignation correspondance.
4. Arbitrage (API + UI fiche patient) ; verdict `infirme` sans note ⇒ refus.
5. Révision : résolution des intentions + carte de Fil + parcours de
   re-validation.

## Tests

- Scénario bout-en-bout de la spec (Lot G, critère 1) : intention
  `conditionnelle_biologie` → arbitrage `infirme` → carte de Fil → version
  révisée sans l'intention active → re-approbation → portail à jour.
- Statuts du moteur sur le tableau de la fixture (Lot F, critère 1).
- Contrat SQL négatif : aucune valeur biologique.
- Historique complet relisible : claims → intention → arbitrage → révision.
- T3 avant PR (migration + clinique).

## Done

- Critères des Lots F et G de `sources/02-spec-lots-parcours-t0.md`.
- Fragments `changelog.d/` (catalogue + boucle de révision).
- Vérification base de production après release (lecture MCP seule).
