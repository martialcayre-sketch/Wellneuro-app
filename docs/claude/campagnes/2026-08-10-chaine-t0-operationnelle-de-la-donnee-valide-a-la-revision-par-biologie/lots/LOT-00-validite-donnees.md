---
id: "LOT-00"
titre: "Validité des données cliniques — statut par passation, filtre unifié, déduplication"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Validité des données cliniques

## But

Une donnée invalidée ne peut plus alimenter aucun raisonnement (synthèse,
orientation, équilibre, momentum, protocole) ; l'invalidation devient un geste
praticien tracé, pas un déploiement.

## Résultat observable

Une passation marquée `INVALID` disparaît du prompt de synthèse, de
`donneesEntree`, de l'orientation et du score d'équilibre ; une re-passation
marque l'ancienne `SUPERSEDED` ; l'inbox affiche le statut ; le registre en dur
peut être supprimé sans changement de comportement.

## Périmètre

- **Migration (confirmation obligatoire, PR séparée)** : `QuestionnaireReponse`
  + `statutValidite` (`VALID` défaut | `AMBIGUOUS` | `INVALID` | `SUPERSEDED` |
  `HISTORICAL_ONLY`), `invalideLe`, `invalidePar`, `motifInvalidation`,
  `supersedesReponseId`.
- Script de reprise : initialiser depuis le registre
  `passationsNonInterpretables.ts` (Q_ALI_03/Q_SOM_07 antérieures au
  `reconstruitLe` → `INVALID`).
- Prédicat de filtre unique (nouveau module `lib/scoring/validite.ts`) appliqué
  aux quatre consommateurs : synthèse, orientation, équilibre/momentum, cockpit.
- Déduplication à la génération de synthèse : dernière passation `VALID` par
  instrument ; marquage `SUPERSEDED` automatique à la re-passation.
- `donneesEntree` : n'enregistrer que les données réellement transmises au
  prompt (ou marqueur d'exclusion par passation).
- UI inbox : action « invalider cette passation » (motif obligatoire),
  append-only, journalisée.

## Hors périmètre

- Régénération des synthèses historiques (mention de lecture existante suffit).
- Suppression physique de données.
- Tout changement de scoring ou de seuil.

## Fichiers probables

`web/prisma/schema.prisma` (migration séparée),
`web/src/lib/scoring/passationsNonInterpretables.ts`,
`web/src/app/api/praticien/synthese/route.ts:627-661`,
`web/src/lib/clinical/orientationService.ts:83-112`,
`web/src/lib/equilibre/depuisPrisma.ts`, `web/src/lib/fil/inbox.ts`,
`web/src/app/api/praticien/inbox-questionnaires/route.ts`,
`web/src/lib/patient/effacement.ts` (si nouvelle table de trace).

## Interdits

- Migration et code dépendant dans la même PR (ou drapeau éteint).
- Zéro implicite : une passation exclue est absente, jamais comptée à 0.
- Toute écriture Supabase directe.

## Dépendances

Aucune. Ouvre LOT-01 et LOT-02.

## Étapes

1. Migration + `prisma generate` (PR migration seule, release-db).
2. Module `validite.ts` + branchement des quatre consommateurs (drapeau éteint
   tant que la migration n'est pas relâchée).
3. Script de reprise + test d'équivalence avec le registre en dur.
4. Déduplication + marquage `SUPERSEDED`.
5. UI inbox + journalisation.

## Tests

- Régression section 56 de la spec : `INVALID` ⇒ aucune influence (prompt,
  `donneesEntree`, orientation, équilibre, momentum, protocole).
- Deux passations du même instrument ⇒ seule la dernière `VALID` part au prompt.
- Équivalence avant/après suppression du registre en dur.
- T2 avant commit UI/API.

## Done

- Critères 1-4 du Lot A de `sources/02-spec-lots-parcours-t0.md` vérifiés.
- Fragment `changelog.d/` (changement de comportement clinique documenté).
- Aucun secret, textes UI en français.
