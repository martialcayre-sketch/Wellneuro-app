---
id: "LOT-00"
titre: "Validité des données cliniques — statut par passation, filtre unifié"
statut: "terminé"
dépend_de: "aucun"
---

# LOT-00 — Validité des données cliniques

## But

Une donnée invalidée ne peut plus alimenter aucun raisonnement (synthèse,
orientation, équilibre, momentum, protocole) ; l'invalidation devient un geste
praticien tracé, pas un déploiement.

## Résultat observable

Une passation marquée `INVALID` disparaît du prompt de synthèse, de
`donneesEntree`, de l'orientation et du score d'équilibre ; ~~une re-passation
marque l'ancienne `SUPERSEDED`~~ (refusé, point 2) ; l'inbox affiche le statut ;
~~le registre en dur peut être supprimé sans changement de comportement~~ (le
registre reste en place, point 1).

## Ce que l'exécution a corrigé de la spécification (2026-08-11)

Trois points de `sources/02-spec-lots-parcours-t0.md` (Lot A) se sont révélés
faux à la lecture du code. Ils sont notés ici pour que la reprise ne les
réintroduise pas.

1. **La reprise du registre en `INVALID` serait une régression.**
   `lib/scoring/passationsNonInterpretables.ts` dit autre chose que le statut de
   validité : la passation a eu lieu, ses réponses brutes restent vraies, seul
   le RÉSULTAT n'est pas une mesure — d'où sa transmission *nommée-mais-vidée*,
   qui laisse au praticien le signal « mesure à replanifier ». La convertir en
   `INVALID` la ferait disparaître, et le signal avec elle. **Les deux
   mécanismes se complètent ; aucun n'absorbe l'autre.** Le registre reste en
   place ; le statut sert l'invalidation praticien, qui n'existait pas.
2. **Une re-passation ne doit JAMAIS marquer la précédente `SUPERSEDED`.**
   `construireHistoriqueEquilibre` reconstruit chaque jalon depuis les
   passations connues à cette date : périmer la mesure de T0 à l'arrivée de
   celle de J21 supprimerait le point de départ, donc tout le momentum.
   `SUPERSEDED` = remplacement d'une passation *fautive*, geste praticien
   explicite. Verrouillé par deux bancs dans `depuisPrisma.test.ts`.
3. **La déduplication à la synthèse demande un arbitrage, pas un `distinct`.**
   Retirer les passations antérieures priverait le praticien de l'évolution
   (deux enquêtes alimentaires à trois semaines d'écart, par exemple). L'écart
   réel avec l'orientation n'est pas le nombre de lignes mais l'absence de
   repère : le modèle ne sait pas laquelle est courante. **Marquer** la plus
   récente par instrument dans le bloc transmis est le geste juste — il relève
   du prompt, donc du LOT-01.

## Périmètre

- **Migration (confirmation obligatoire, PR séparée)** : `QuestionnaireReponse`
  + `statutValidite` (`VALID` défaut | `AMBIGUOUS` | `INVALID` | `SUPERSEDED` |
  `HISTORICAL_ONLY`), `invalideLe`, `invalidePar`, `motifInvalidation`,
  `supersedesReponseId`.
- ~~Script de reprise : initialiser depuis le registre
  `passationsNonInterpretables.ts`~~ — **abandonné**, conséquence du point 1
  ci-dessus : le registre n'est pas absorbé, il n'y a rien à reprendre.
- Prédicat de filtre unique (nouveau module `lib/scoring/validite.ts`) appliqué
  aux quatre consommateurs : synthèse, orientation, équilibre/momentum, cockpit.
- ~~Déduplication à la génération de synthèse ; marquage `SUPERSEDED`
  automatique à la re-passation.~~ — le marquage automatique est **refusé**
  (point 2) ; la déduplication est **renvoyée au LOT-01** sous forme de marquage
  de la passation courante (point 3), et y est désormais inscrite.
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
3. ~~Script de reprise + test d'équivalence avec le registre en dur.~~ abandonné.
4. ~~Déduplication + marquage `SUPERSEDED`.~~ marquage refusé ; déduplication
   renvoyée au LOT-01.
5. UI inbox + journalisation.

## Tests

- Régression section 56 de la spec : `INVALID` ⇒ aucune influence (prompt,
  `donneesEntree`, orientation, équilibre, momentum, protocole).
- ~~Deux passations du même instrument ⇒ seule la dernière `VALID` part au
  prompt.~~ — remplacé au LOT-01 : les deux partent, la plus récente est marquée.
- ~~Équivalence avant/après suppression du registre en dur.~~ — sans objet, le
  registre reste.
- T2 avant commit UI/API.

## Done

- Critères 1-4 du Lot A de `sources/02-spec-lots-parcours-t0.md` vérifiés.
- Fragment `changelog.d/` (changement de comportement clinique documenté).
- Aucun secret, textes UI en français.
