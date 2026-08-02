---
id: "2026-08-02-rayon-complements-alimentaires"
titre: "Rayon compléments alimentaires — consolidation C4"
statut: "clos"
créée_le: "2026-08-02"
mise_à_jour: "2026-08-02"
lot_courant: "LOT-04"
---

# Rayon compléments alimentaires — consolidation C4

## Objectif

Consolider les branches historiques consacrées au rayon compléments alimentaires sur une seule branche de campagne, puis stabiliser le socle déjà présent dans le dépôt pour préparer une activation cohérente du rayon côté praticien.

## État constaté au dépôt

Le développement du rayon compléments est déjà bien avancé dans le code courant :

- bibliothèque de logique métier sous `web/src/lib/supplement-library/` (catalogue, validation, résolution, gouvernance, ingestion, référentiel) ;
- UI praticien sous `web/src/components/complements/` ;
- API praticien sous `web/src/app/api/praticien/complements/` ;
- routes internes d'ingestion/référentiel sous `web/src/app/api/internal/supplements/`.

L’avancement est donc réel, mais il reste fragmenté entre plusieurs branches historiques et des garde-fous d’activation (notamment `WN_C4_ENABLED`) qui empêchent d’une part d’en faire une lecture simple et d’autre part d’en mesurer la maturité produit de manière unifiée.

## État de validation courant

- la validation T1 (`npm run check`) est verte sur le périmètre modifié ;
- les tests ciblés des routes internes d’ingestion et de référentiel sont passés ;
- une exécution plus large de la suite de travail (`npm run test:worktree -- --fast`) a mis en évidence un échec E2E déjà présent sur le parcours `portail-lien-magique`, sans lien direct avec le rayon compléments.

## Branches regroupées

La campagne suivante regroupe les branches historiques liées à ce travailstream :

- `agent/rayon-biologie-cadrage`
- `c4/lot-02a-import-complalim`
- `c4/lot-06-rayon-ui`
- `feat/bibliotheque-rayon-questionnaires`
- `feat/had-entree-de-rayon`
- `worktree-rayon-complements-reflexion`
- `worktree-referentiel-complalim-phase1b`
- branches de lots C4 autour de résolution, atelier de règles, ingestion et transport de compositions.

La branche de campagne unique retenue est : `campagne/rayon-complements-2026-08-02`.

## Résultat observable

Un périmètre unique de campagne capable de :

- consolider les branches historiques autour d’un même socle ;
- stabiliser le catalogue, les routes et l’UI du rayon ;
- définir une trajectoire d’activation claire et documentée ;
- produire un handoff de campagne à jour pour la suite.

## Contraintes non négociables

- Aucun secret en dur.
- UI en français.
- Aucun patient réel.
- Aucune migration sans confirmation.
- Changements minimaux.
- Aucune modification de logique clinique sans demande explicite.

## Décisions prises

- La campagne se concentre sur la consolidation et la stabilisation, pas sur un refactor de fond.
- Les branches historiques servent à repérer les périmètres déjà explorés ; la source de vérité reste le dépôt courant.
- Le périmètre de campagne est volontairement restreint aux éléments déjà présents dans le code, sans ouvrir de nouvelle surface non justifiée.

## Questions ouvertes

- L’activation du rayon côté runtime doit-elle être rendue effective par défaut, ou seulement via un flag explicite de validation métier ?
- Le rayon corpus est-il assez mature pour sortir du statut “corpus en cours de constitution” ?
- La priorité de données doit-elle rester Compl’Alim, ou faut-il privilégier un mélange DGCCRF / saisie praticien / référentiel interne ?

## Dépendances

- Dépendance produit : la campagne C4 globale et la roadmap R2.
- Dépendance technique : l’état courant du dépôt, en particulier les routes C4 et le flag `WN_C4_ENABLED`.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Consolidation de la branche de campagne et état de l’existant | en cours | — |
| LOT-01 | Stabilisation des routes praticien / internes et du flag d’activation | en cours | LOT-00 |
| LOT-02 | Finalisation de l’UI praticien et intégration du rayon dans le parcours | fait | LOT-01 |
| LOT-03 | Ingestion, gouvernance et référentiel de produits | fait | LOT-00 |
| LOT-04 | Validation E2E, documentation et handoff | fait | LOT-01, LOT-02, LOT-03 |

## Done de campagne

- [x] Tous les lots requis sont terminés.
- [x] Les validations sont documentées.
- [x] La documentation canonique est à jour.
- [x] Le handoff final est produit.
