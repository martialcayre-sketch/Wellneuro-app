---
id: "2026-07-19-sp-cop-copilote-consultation"
titre: "SP-COP — Copilote de consultation (pré-vol & minute d'après)"
statut: "cadrée"
créée_le: "2026-07-19"
mise_à_jour: "2026-07-19"
lot_courant: "LOT-01"
---

# SP-COP — Copilote de consultation (pré-vol & minute d'après)

## Objectif

Assister les deux moments où le praticien perd le plus de temps et de fil :
les **dix minutes avant** la consultation (que s'est-il passé depuis la
dernière fois ? qu'y a-t-il à vérifier ?) et la **minute d'après** (décision,
protocole et document à produire pendant que tout est encore frais).

Le copilote **ne décide rien** : il compose, à partir d'objets déjà produits
par le runtime clinique, une lecture ordonnée et sourcée, puis pré-remplit des
brouillons que le praticien accepte, corrige ou refuse. Aucune de ses sorties
n'échappe à la chaîne **Relu → Validé pour diffusion → Envoyé**.

## Frontières

**Possède** : la surface « Consultation copilote » (entrée de rail déjà
réservée dans la maquette 5.0) ; la composition du pré-vol (ce qui a changé,
discordances, questions suggérées) ; l'écran de clôture et le pré-remplissage
décision / protocole / document.

**Consomme** : le runtime clinique C1 (`web/src/lib/clinical-engine/`,
`GET /api/praticien/cockpit`) ; `ProtocolDraft` et `ProtocolDiffusionApproval`
(C2A) ; la composition documentaire C3 (`web/src/lib/documents/`) ; le patron
« pourquoi maintenant » du Fil (`web/src/lib/fil/cartes.ts`) ; les patrons
`ModeConsultation` et `TwoLevelReading`.

**Ne possède pas** : l'écoute ambiante, l'enregistrement audio et la
transcription (**SP-AMB**, gate CNIL/RGPD bloquant — A6-3) ; la logique
clinique et les seuils (C1 reste souverain) ; l'envoi effectif (chaîne de
diffusion inchangée) ; la météo d'adhésion (**SP-MET**) ; la lecture d'un état
passé (**SP-TT**) ; le comparateur multi-épisodes (**C2B**).

## Décisions actées

- **Lecture seule et recalculée** : le pré-vol ne persiste rien ; il se
  reconstruit à chaque ouverture. Aucun snapshot (refus doctrinal C2A).
- Chaque élément affiché **cite instrument, date et `versionScore`**
  (garde-fou 5.0 n°5). Sans règle validée, l'abstention reste explicite.
- Les discordances restent `audience: practitioner_only` — jamais côté patient.
- La minute d'après **pré-remplit** ; elle n'envoie pas. Tout automatisme
  affiche « pourquoi maintenant » et reste **refusable**.
- Les brouillons produits réutilisent `ProtocolDraft` en append-only
  (`supersedesDraftId`) : aucune écrasure d'un brouillon existant.
- **Aucune migration Prisma** dans cette campagne.

## Dépendances

SP-RUN ✓ (runtime câblé), C2A ✓ (brouillons et approbations persistés),
C3 ✓ (composition documentaire). Toutes satisfaites au 2026-07-19.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Pré-vol T-10 min : surface branchée sur l'entrée de rail, changements depuis la dernière consultation, discordances sourcées, questions suggérées | à_faire | — |
| LOT-02 | La minute d'après : clôture, décision / protocole / document pré-remplis, trois relectures, aucun envoi automatique | à_faire | LOT-01 |

## Définition de done

- Les deux surfaces existent et sont atteignables depuis le rail.
- Toute affirmation affichée est sourcée et recalculable.
- Aucun document ne peut partir sans les relectures explicites.
- Vérifications : anti-secrets, type-check, lint, Vitest, E2E (`test:worktree`).
- Patients fictifs uniquement (Sophie Nicola, Jennifer Martin, Michel Dogné).
