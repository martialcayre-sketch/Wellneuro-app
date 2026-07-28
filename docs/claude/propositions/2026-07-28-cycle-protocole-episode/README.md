---
id: "2026-07-28-cycle-protocole-episode"
titre: "Le cycle protocole → épisode a-t-il vocation à servir ? — aide à la décision"
statut: "proposition — aucune décision rendue, arbitrage praticien attendu"
créé_le: "2026-07-28"
base_auditée: "main @ 37bd1c1"
---

# Le cycle protocole → épisode : instruire avant de trancher

Item 6 du lot 2 (`docs/claude/propositions/2026-07-27-plan-carnet-alimentaire-parcours-patient/`
§5). Le plan posait la question ainsi : « zéro ligne en base : décider s'il sert,
avant de figer des instantanés à sa clôture ». Cette note l'instruit. Elle ne
tranche pas : le choix appartient au praticien.

Aucune ligne de code n'accompagne cette note.

## 1. Le constat de départ, et ce qu'il ne disait pas

Relevé en production le 2026-07-27, en lecture seule :

| Table | Lignes |
|---|---|
| `assessment_episodes` | 0 |
| `protocol_drafts` | 0 |
| `protocol_checkins` | 0 |
| `protocol_diffusion_approvals` | 0 |
| `protocol_review_flags` | 0 |

L'audit en concluait que la recommandation externe — figer des instantanés « à
la clôture d'un épisode » — portait sur un objet qui n'existe pas. C'est exact.

Mais **le vide en base ne prouve pas l'absence de chaîne**. Vérification du
2026-07-28 : la chaîne existe, elle est complète, et elle est reliée à l'UI.

## 2. Ce qui existe réellement

Chemin praticien, du dossier au patient :

1. `FichePatientPanel.tsx:1140` monte `ClinicalRuntimeSection`.
2. `ClinicalRuntimeSection.tsx:198` → `GET /api/praticien/cockpit?milestone=T0` →
   verdict `proposal_required` (`cockpit/route.ts:139`).
3. `EpisodeConfirmationPanel` → `POST /api/praticien/cockpit`.
4. `saveVersion` (`ClinicalRuntimeSection.tsx:319-326`) →
   `POST /api/praticien/protocoles/versions` → transaction
   `assessmentEpisode.upsert` + `protocolDraft.upsert` (`versions/route.ts:299-310`).
5. Diffusion → `protocolDiffusionApproval.create` (`diffusion/route.ts:125`).
6. Check-in patient → `lib/protocol/checkins.ts:121`, depuis
   `patient-companion/ProtocolCheckinForm.tsx:73`.

**Trois points morts** expliquent le zéro en base bien mieux que l'hypothèse
d'un cycle superflu :

- **L'étape 3 n'écrit rien**, et le panneau le dit lui-même :
  « Cette confirmation reste en mémoire et ne modifie aucune donnée »
  (`EpisodeConfirmationPanel.tsx:36-37`). `cockpit/route.ts:147-200` ne contient
  aucun `create` ni `upsert`. Un épisode T0 confirmé en consultation
  **n'existe nulle part** une fois l'onglet fermé.
- **`POST /api/praticien/protocoles` n'a aucun appelant client.** La route écrit
  épisode + brouillon (`protocoles/route.ts:139,144`) ; aucun `fetch` du dépôt
  ne la vise. L'unique chemin d'écriture réel est l'étape 4, c'est-à-dire
  l'enregistrement d'une **version de protocole**.
- **`protocol_review_flags` est morte de bout en bout** : aucune écriture,
  aucune lecture, aucune relation Prisma déclarée (`schema.prisma:628-645`,
  index seul).

Conséquence : **il n'existe aucun bouton « ouvrir un épisode »**. Pour qu'une
ligne apparaisse dans `assessment_episodes`, il faut aller jusqu'à enregistrer
une version de protocole. Un praticien qui confirme l'épisode puis s'arrête —
le geste le plus naturel en consultation — ne laisse aucune trace.

## 3. L'hypothèse que ces trois points suggèrent

Le cycle n'a peut-être jamais servi **parce que son premier geste ne persiste
rien**, et non parce qu'il serait inutile. C'est une hypothèse, pas un constat :
elle n'est vérifiable qu'en la corrigeant, ou en demandant au praticien pourquoi
il n'a jamais poursuivi jusqu'à l'enregistrement d'une version.

Elle mérite d'être posée avant de retirer quoi que ce soit : retirer un cycle
qu'on n'a jamais rendu utilisable n'est pas la même décision que retirer un
cycle essayé et abandonné.

## 4. Trois options

### A. Brancher la confirmation T0 (effort : modéré)

`POST /api/praticien/cockpit` persiste l'épisode confirmé. La confirmation
devient un acte, le compteur cesse d'être à zéro par construction, et la
question « ce cycle sert-il ? » devient enfin observable.

Coût : une écriture nouvelle sur une table de données de santé, et le retrait du
message qui promet aujourd'hui l'inverse. Suppose de décider ce qu'un épisode
confirmé sans protocole représente.

### B. Ne rien changer — la version de protocole reste le seul acte (effort : nul)

Le cycle existe pour qui va jusqu'au bout. On accepte que la confirmation T0 soit
un geste d'affichage, à condition que le panneau continue de le dire aussi
clairement qu'aujourd'hui.

Coût : le zéro en base persiste, et avec lui l'impossibilité de trancher plus
tard sur des faits.

### C. Retirer le cycle (effort : élevé, irréversible en pratique)

Sortir `assessment_episodes` et les tables `protocol_*` du chemin praticien.

Coût : ce cycle est la seule structure existante capable de porter un « avant /
après » clinique, et plusieurs lots livrés en dépendent en lecture
(`trajectoire`, `fil`, `momentumJ21`, `boussole`, `copilote`). L'option n'est
raisonnable que si le suivi par épisodes est abandonné comme intention produit.

## 5. Ce que la décision commande

Le §5 de l'audit externe — figer `inputSnapshot`, `scoreSnapshot`,
`coverageSnapshot` à la clôture d'un épisode — n'a de sens que sous l'option A,
et seulement une fois qu'un épisode aura été ouvert au moins une fois. Sous B, la
recommandation reste sans objet ; sous C, elle disparaît.

Un geste indépendant reste utile dans les trois cas : **`protocol_review_flags`
peut être retirée**, ou branchée. En l'état, elle décrit une intention que rien
n'exécute.

## 6. Question au praticien

Le cycle protocole → épisode a-t-il vocation à servir en consultation ? Si oui,
l'option A rend la confirmation T0 réelle ; sinon, l'option B assume l'état
actuel sans le maquiller.
