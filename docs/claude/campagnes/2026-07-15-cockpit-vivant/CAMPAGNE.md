---
id: "2026-07-15-cockpit-vivant"
titre: "SP-RUN — Cockpit vivant (runtime C1)"
statut: "cadrée — gate humain à lever"
créée_le: "2026-07-15"
mise_à_jour: "2026-07-15"
lot_courant: "aucun"
---

# SP-RUN — Cockpit vivant

## Objectif

Câbler le runtime du moteur clinique C1 : le cockpit de décision
(`MissingDataPanel`, `DecisionSummaryCard`, `ProtocolMiniBuilder`,
`ProtocolConsultationPanel`) est aujourd'hui monté dans la fiche patient mais
**branché sur `null`**. SP-RUN alimente `buildClinicalSnapshot` /
`buildClinicalReview` / `buildDecisionCard` depuis les vraies réponses du
patient, **en mémoire par requête** (aucune persistance — C2A).

## Gate d'entrée (bloquant)

Le verdict de clôture C1 est : **« GO technique, ergonomie à valider, NO-GO
runtime/activation/diffusion »**. La DoD C1 restante — chronométrer le flux
complet comprendre → décider → 3 actions → prévisualiser → valider avec le
praticien (grille : `../2026-07-11-decision-clinique-21-jours-v1/GRILLE_VALIDATION_ERGONOMIQUE_C1.md`)
— **doit être réalisée par l'utilisateur** avant tout câblage. Cette campagne
ne démarre pas tant que ce gate n'est pas levé explicitement.

**Harnais disponible pour exécuter la grille** (2026-07-16) : la fixture C1
exigée par la grille est fournie par
`web/src/lib/clinical-engine/validationErgoFixture.ts`. En développement
uniquement : lancer `npm run dev` puis ouvrir
`/dashboard/patients/<idPatient>?validationErgo=c1` — le cockpit de la fiche
patient est alors alimenté par la fixture (bandeau « données fictives »
affiché, rien n'est sauvegardé ni transmis). Ce harnais est inerte en
production et **ne lève pas le gate** : seul le verdict de l'utilisateur après
exécution de la grille le lève.

## Frontières

**Possède** : la construction runtime des objets C1 depuis les réponses
réelles (route serveur dédiée), le branchement du cockpit, les états vides et
d'abstention.

**Consomme** : contrats `web/src/lib/clinical-engine/*` (inchangés),
réponses PostgreSQL existantes.

**Ne possède pas** : persistance des épisodes/décisions/protocoles (C2A),
diffusion patient (chaîne Relu → Validé → Envoyé, C3/SP-COP), modification
des contrats ou des règles cliniques C1.

## Lots à compiler (après levée du gate)

| Lot | Objet | Gate |
|---|---|---|
| SP-RUN-00 | Validation ergonomique praticien (grille C1) + décisions d'ajustement UI éventuelles | **utilisateur** |
| SP-RUN-01 | Route serveur snapshot/review/décision depuis les réponses réelles (lecture seule, versions tracées) | SP-RUN-00 |
| SP-RUN-02 | Branchement cockpit + états vides/abstention + tests | SP-RUN-01 |

## Définition de done

- Le cockpit affiche des objets calculés réels, versions de scoring citées.
- Aucun changement des contrats C1 ni des seuils ; aucune persistance.
- Vérifications standard + e2e mode consultation.
