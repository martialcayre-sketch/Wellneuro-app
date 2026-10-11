# Handoff — 2026-10-12 — Lot 5A : la priorité posée par le praticien (D-279)

## Branche et état Git

`feat/5a-priorite-praticien-code`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`5aba00b2`,
#1402 mergée). La copie principale n'a pas été touchée. Elle porte la PR 2 sur
2 du lot, c'est-à-dire le code consommateur.

## Objectif

BP-26, décision 5A, lue comme un **ajout**. Les candidats d'axe restent. Le
praticien peut en plus poser lui-même une priorité. Le blocage « pas de
candidat, pas de protocole » est levé, et l'objectif peut s'assembler des
seuls mots du patient.

## Décisions prises

- `D-279`, écrite et mergée avec la migration (#1402). Arbitrages du
  responsable du 2026-10-11 :
  - un domaine pris dans une liste fermée (les sept domaines de Q_MOD_03,
    plus « autre ») et un texte libre ;
  - la priorité reste offerte sous recueil incomplet ;
  - la migration est autorisée.
- Migration `c1_selection_priorite_libre_v1` : appliquée par `release-db`
  (run 38178290265, approuvé par le responsable), puis constatée par
  conteneur (one-off-5272). Elle est marquée appliquée, porte trois CHECK
  neufs, et les 8 lignes existantes restent en `priority:`, sans aucune ligne
  libre. Production sur 5aba00b2.
- Constat v4 à l'ouverture du lot : aucun import `bio-extraction-v4` en
  production (derniers imports v3, le 2026-10-10).
- Identifiant `libre:<domaine>:<16 hex>`. Changer le libellé ou le domaine
  vaut un pivot (D-255). Changer le seul motif ne relance rien.
- Le libellé est gardé contre le registre anxiogène à l'écriture, par un refus
  sans confirmation. Une normalisation retire les blancs Unicode, les
  caractères de largeur nulle et les contrôles bidi.
- `decisionBloquee` (fiche) ne vaut plus que pour un constat de sécurité. Sans
  candidat, la fiche dit « Priorité non retenue ».
- Revue `wn-reviewer` du code : GO.
  - Corrigés : P2-1 (banc « deux motifs d'abstention exactement »), P2-3
    (normalisation complétée), P2-4 (banc de route « mots du patient »,
    commentaire faux) et P2-6 (commentaire orphelin).
  - P2-2 documenté : les gardes aval font confiance à la carte que
    `buildDecisionCard` a vérifiée.
  - P2-5 routé dans `FILE_ATTENTE.md` : l'identifiant brut s'affiche dans la
    minute d'après.

## Fichiers modifiés

- Moteur : `lib/clinical-engine/prioriteLibre.ts` (module pur, neuf),
  `prioriteLibreServeur.ts` (neuf), `types.ts`, `decisionCard.ts`,
  `protocolDraft.ts`, `contenuPatientProtocole.ts`, `patientProtocolView.ts`,
  `selectionPrioritePrisma.ts`, `decisionGuards.ts`.
- Route : `app/api/praticien/cockpit/priorite/route.ts`.
- Objectif : `lib/praticien/assemblageProposition.ts`.
- Écrans : `SelectionPrioritePanel.tsx`, `DecisionSummaryCard.tsx`,
  `ProtocolMiniBuilder.tsx`, `ProtocolConsultationPanel.tsx`,
  `ClinicalRuntimeSection.tsx`.
- Doc : `lib/documents/vocabulaire.ts` (commentaire),
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée),
  `docs/claude/campagnes/FILE_ATTENTE.md`,
  `changelog.d/2026-10-12-5a-priorite-libre.md`, `docs/claude/SESSION_LOG.md`.
- Tests : les bancs de chacun des modules ci-dessus, plus
  `FichePatientPanel.test.tsx` et `propositions-objectif/route.test.ts`.

## Validations exécutées

- PR 1 : contrat SQL sur la base locale migrée, T1 complet, T3 complet vert
  (5 min 15 s), CI vert sur la tête.
- PR 2 : T1 vert après chaque lot d'éditions, `tsc` à 0 erreur. T3 complet
  vert en 4 min 58 s : 713 fichiers Vitest, 12 291 cas, 271 E2E, aucune
  dérive. Le premier passage était rouge sur la matrice de consommation, qui
  a été régénérée. Les bancs touchés par les corrections de revue sont
  rejoués au vert.

## Problèmes ouverts

- Le refus de la route sous abstention `required` (recueil incomplet) n'est
  éprouvé qu'aux niveaux unitaires (carte, protocole, contenu patient) : la
  fixture de chaîne de la route ne sait pas retirer Q_MOD_03.
- 8B reste à faire : seuils de 540 min et de 80 % de l'agenda du sommeil,
  paliers 70/40 de « Mon équilibre », tous sans provenance.
- Constat v4 à reprendre au premier import réel.

## Prochaine action exacte

CI, lecture des commentaires de revue, merge, puis constat du déploiement.
Après le premier usage, constater en agrégats par conteneur les sélections
`libre:` et les protocoles qui en partent. Ensuite, `/clear`, puis le lot 8B.

## Interdits encore actifs

- Approuver release-db reste un geste humain. La base de production se lit
  par conteneur et ne s'écrit que par migration.
- Aucune identité réelle dans le dépôt. Un identifiant de dossier ne va
  jamais avec des métriques dans un fichier durable.
- Les quatre règles de priorité signées, leur classement et la procédure
  d'abstention ne changent pas sans décision. Un motif d'abstention neuf
  rouvre D-279 (banc en place).
- La priorité posée n'alimente aucun calcul (besoins, repassation,
  assiettes).
