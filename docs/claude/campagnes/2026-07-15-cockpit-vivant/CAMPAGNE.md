---
id: "2026-07-15-cockpit-vivant"
titre: "SP-RUN — Cockpit vivant (runtime C1)"
statut: "terminé — SP-RUN-02 validé en CI"
créée_le: "2026-07-15"
mise_à_jour: "2026-07-17"
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

## Gate d'entrée (levé le 2026-07-17)

Le verdict de clôture C1 est : **« GO technique, ergonomie à valider, NO-GO
runtime/activation/diffusion »**. La DoD C1 restante — chronométrer le flux
complet comprendre → décider → 3 actions → prévisualiser → valider avec le
praticien (grille : `../2026-07-11-decision-clinique-21-jours-v1/GRILLE_VALIDATION_ERGONOMIQUE_C1.md`)
— **doit être réalisée par l'utilisateur** avant tout câblage. Cette campagne
ne démarre pas tant que ce gate n'est pas levé explicitement.

**Verdict utilisateur** : GO ergonomique sur l'interface actuelle. Martial
CAYRE a exécuté la grille le 2026-07-17 avec Sophie Nicola (patiente fictive) :
compréhension en 1 minute et préparation en 5 minutes, sans erreur, aide,
confusion ni tentative d'envoi. La refonte d'interface signalée comme restant
à faire est hors de cette validation et devra être revalidée séparément.

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
| SP-RUN-00 | Validation ergonomique praticien (grille C1) + décisions d'ajustement UI éventuelles — **terminé le 2026-07-17** | **levé** |
| SP-RUN-01 | Route serveur snapshot/review/décision depuis les réponses réelles (lecture seule, versions tracées) — **terminé le 2026-07-17** | SP-RUN-00 ✓ |
| SP-RUN-02 | Branchement cockpit + états vides/abstention + tests — **terminé le 2026-07-17** | SP-RUN-01 ✓ |

## Résultat SP-RUN-01

La route authentifiée `/api/praticien/cockpit` propose d'abord un épisode
T0/J21/J42/J90 depuis les réponses PostgreSQL réelles, avec un hash de
proposition. Un POST explicite du praticien recharge les données, refuse une
proposition périmée, confirme l'épisode uniquement en mémoire puis construit
`ClinicalSnapshot`, `ClinicalReview` et `DecisionCard`.

Sans règle clinique validée supplémentaire, l'abstention reste
`not_evaluated` et la carte ne propose ni ne sélectionne aucune priorité.
Aucune écriture, migration, persistance, activation ou diffusion n'est
réalisée. SP-RUN-02 possède le geste UI de confirmation et le branchement du
cockpit.

## État SP-RUN-02

La fiche patient charge désormais la proposition T0 en lecture seule, affiche
les réponses dans et hors fenêtre sans exposer les scores, puis exige une
confirmation explicite, y compris pour un épisode vide. Une proposition
périmée est rechargée automatiquement et doit être confirmée à nouveau.

Après confirmation, la revue et la carte réelles alimentent le cockpit. La
décision reste explicitement suspendue avec une abstention `not_evaluated` ;
le constructeur de protocole et l'aperçu patient restent indisponibles. Le
mode `validationErgo=c1` conserve la fixture prioritaire et n'appelle jamais
le runtime réel.

Les tests composants/intégration, Vitest global, type-check, lint, build,
scoring, audit campagnes et anti-secrets sont validés. L'E2E PostgreSQL isolé
sur patient fictif, bureau et mobile, a réussi dans la CI de la PR #100. La
campagne SP-RUN est terminée ; aucune persistance, migration, règle clinique
ou diffusion patient n'a été ajoutée.

## Définition de done

- Le cockpit affiche des objets calculés réels, versions de scoring citées.
- Aucun changement des contrats C1 ni des seuils ; aucune persistance.
- Vérifications standard + e2e mode consultation.

## Direction UX 5.0 — poste de pilotage & A5-R2 (aligné le 2026-07-18)

> Alignement additif. Voir `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`
> et le registre (A6-R1 poste de pilotage, A5-R2 canvas mid-tone).
> **Aucun contrat clinique figé de cette campagne n'est modifié.**

- Le cockpit runtime devient le cœur du **poste de pilotage borné** : cycle clinique en colonne vertébrale, zone focale de la phase due, **instruments à tiroir** (12 besoins, momentum, réponses) au lieu de l'empilement vertical. Objets calculés, abstention et confirmation T0 **inchangés**.
- Canvas **ardoise** A5-R2 et **typographie remontée** — différés au lot d'implémentation, sans migration.
