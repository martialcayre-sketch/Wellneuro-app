---
id: "2026-07-19-sp-tt-time-travel-relecture"
titre: "SP-TT — Time-travel et note de relecture"
statut: "cadrée"
créée_le: "2026-07-19"
mise_à_jour: "2026-07-19"
lot_courant: "LOT-01"
---

# SP-TT — Time-travel et note de relecture

## Objectif

Permettre au praticien de **relire la fiche telle qu'elle était** à une date
passée — pour comprendre ce qu'il savait au moment où il a décidé — et de
déposer une **note de relecture horodatée au présent**, qui devient la mémoire
explicite du raisonnement.

C'est la contrepartie honnête de la Spirale : sans lecture du passé, un
changement d'avis reste inexpliqué ; sans note, la relecture ne laisse
aucune trace.

## Frontières

**Possède** : le paramètre `asOf` sur les lectures praticien et son cadrage
(bornes, valeurs autorisées) ; le bandeau d'état « vous lisez l'état du … » ;
l'objet **note de relecture** (modèle, écriture, affichage).

**Consomme** : `construireReponsesParQuestionnaire(reponses, dateLimite)`
(`web/src/lib/equilibre/depuisPrisma.ts:38-57`), qui sait déjà reconstituer un
état connu à une date passée ; la trajectoire C2B ; les épisodes C2A.

**Ne possède pas** : la persistance de snapshot, de `ClinicalSnapshot` ou de
`DecisionCard` — **refus doctrinal explicite** (`web/prisma/schema.prisma:676-677`,
« Snapshot/review/decision-card NON persistés (recalculables) ; provenance
ancrée par hashes ») ; le comparateur multi-épisodes (**C2B**) ; la diffusion ;
toute lecture du passé côté patient.

## Décisions actées

- **La lecture du passé est un recalcul, pas un snapshot** : on rejoue les
  données brutes en tronquant à la date demandée. Cohérent avec la provenance
  par empreintes déjà en place (`snapshotInputHash`, `reviewInputHash`,
  `decisionCardInputHash`).
- Le mode passé est **strictement lecture** : aucune action d'écriture n'y est
  possible, à la seule exception de la note de relecture.
- La note est **horodatée au présent** même lorsqu'on relit une date passée —
  on n'antidate jamais un raisonnement.
- La note est **append-only** ; une correction crée une nouvelle version, elle
  n'écrase pas la précédente.
- La note est **praticien seul** : jamais exposée côté patient.
- L'objet était prévu par A6-1 (`REGISTRE_FRONTIERES.md` §A6) et sa table a été
  explicitement **différée de C2A à SP-TT**
  (`…suivi-j7-j14-j21-et-persistance/lots/LOT-01-spec-modele-gate.md:111`).

## Dépendances

C2A ✓ (épisodes persistés), C2B ✓ (trajectoire lisible).

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Paramètre `asOf` sur les lectures praticien + bandeau d'état passé + retour au présent — **sans migration** | à_faire | — |
| LOT-02 | Note de relecture : table `relecture_notes` append-only + saisie et affichage — **gate migration G3, confirmation explicite** | à_faire | LOT-01 |

## Définition de done

- Recharger la fiche à une date de jalon connue affiche l'état d'alors, sans
  ambiguïté sur la date lue.
- Aucune écriture n'est possible en mode passé hors note de relecture.
- La note apparaît dans l'historique avec son horodatage réel.
- Vérifications : anti-secrets, type-check, lint, Vitest, E2E (`test:worktree`).
- Pour LOT-02 : migration **additive** seule, relue avant application.
