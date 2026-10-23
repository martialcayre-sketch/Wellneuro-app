---
id: "LOT-15"
titre: "BP-15 — Décisions de parcours"
statut: "en_cours (2026-10-22) — D-343 acceptée (#1642) ; migration mergée (#1644), appliquée et constatée ; PR 2, code sous drapeau éteint, ouverte"
dépend_de: "LOT-00"
---

# LOT-15 (BP-15) — Décisions de parcours

> **Fiche proposée le 2026-10-22.** Les arbitrages du responsable sont
> rendus (2026-10-20) et consignés par D-343, qui précise D-255 §2. Dépôt
> public : cette fiche ne porte aucune identité, aucun texte clinique,
> aucun libellé d'hypothèse.

## But

Écrire ce que le patient fait réellement d'une version diffusée de son
protocole, et ce que le praticien décide à sa revue : ses choix (préférence,
refus), la mise en œuvre réelle (début, interruption, reprise, arrêt) et la
révision (maintenir, ajuster, arrêter), en lignes datées, motivées par une
liste fermée, sans jamais toucher au jour 0 ni aux empreintes de la version.
BP-20 (suivi factuel) et BP-19 les liront.

## Résultat observable

Après le lot, drapeau allumé : au cockpit, sur une version du protocole, le
praticien du dossier pose un choix du patient, un événement de mise en
œuvre (avec sa date ou « inconnue ») ou une décision de révision, avec la
source et le motif ; il corrige par remplacement et retire une ligne posée
par erreur ; l'historique reste lisible. Le jour 0, les jalons et les quatre
empreintes de chaque version sont identiques avant et après. Drapeau éteint,
rien ne change.

## Socle établi (ne se rediscute pas)

- **Une migration, deux PR** (D-266 §11), précédées de la PR de décision et
  de déclaration RGPD (patron de BP-11 et BP-13 : #1614, #1622, #1631).
- **Release-db au rang 4**, après BP-13 (constatée le 2026-10-21) ; une à la
  fois (D-248) ; approuvée et déclenchée par le responsable.
- **Invariant B5** (cadrage v3) : aucun de ces événements ne change le jour
  0 (D-255) ni les quatre empreintes ; banc comparatif.
- **Aucune attribution** (DC-39) ; « maintenir, ajuster, arrêter » comme
  objet (DC-40) ; temporalité de la mise en œuvre (DC-48) ; D-266 §7.
- **Ajout seul, remplacement de la tête + retrait** (patron D-331 §2).
- **Registre RGPD avant la table** ; drapeau né avec le code (D-081).

## Ce que le code fait aujourd'hui (lu le 2026-10-22)

- **Version du protocole** : `ProtocolDraft` (`protocol_drafts`), une ligne
  par version, id `${protocolDraftId}#${inputHash}` (`versioning.ts:21`),
  chaînage `supersedes_draft_id` ; actions dans `payload`, chacune par son
  `actionId`. Quatre empreintes : `decision_card_input_hash`,
  `snapshot_input_hash`, `review_input_hash`, `input_hash`.
- **Diffusion et jour 0** : `ProtocolDiffusionApproval`
  (`protocol_diffusion_approvals`) ; jour 0 calculé dans
  `calendrierSuivi.ts` (`estDiffusionRecevable`, `joursZeroParCycle`).
- **Révision** : le panneau J21 présente six libellés **non persistés**
  (`J21DecisionPanel.tsx:7-11`) ; l'ajustement passe par une nouvelle
  version.
- **Objets voisins, qui ne conviennent pas** : `ArbitrageBiologique`
  (intention × résultat, D-059) ; `TrustAdverseEffectReport` (signalement de
  sécurité du patient) ; `ProtocolCheckin` (réponses du patient aux points
  d'étape).
- **Effacement** (`patient/effacement.ts`) : les check-ins, approbations et
  arbitrages avant `protocol_drafts`.

## Arbitrages (rendus par le responsable)

Le 2026-10-20, sur questions à options :

1. **Ancrage** : la version du protocole ; l'action est facultative ; la
   révision vise la version entière.
2. **Déclarant** : le praticien seul, au cockpit, source notée (« rapporté
   par le patient » / « constaté par le praticien ») ; aucune surface
   patient.
3. **Motifs** : liste fermée proposée par l'assistant, plus `autre` (note
   obligatoire) ; aucun motif d'efficacité (DC-39).
4. **Correction** : ajout seul, remplacement de la tête + retrait (patron
   D-331), commun à BP-13 et BP-15.

Listes validées le 2026-10-20 (2e série), telles quelles : préférence et
refus {`choix_du_patient`, `contrainte_pratique`, `avis_autre_soignant`,
`autre`} ; interruption et arrêt {`effet_indesirable_rapporte`,
`contrainte_pratique`, `choix_du_patient`, `avis_autre_soignant`,
`evenement_intercurrent`, `autre`} ; reprise sans motif ; révision ajuster
ou arrêter {`mise_en_oeuvre_incomplete`, `nouvelle_donnee_au_dossier`,
`effet_indesirable_rapporte`, `choix_du_patient`, `autre`} ; maintenir sans
motif. Écartés : inefficace, objectif atteint, amélioration.

**Précisions de l'assistant, retenues telles quelles par le responsable le
2026-10-22** (D-343), avec le paragraphe du dossier RGPD : les trois familles et leurs fils, une seule révision en vigueur
par version, aucune règle de séquence (§3) ; la date de l'événement au jour
ou « inconnue », et la note obligatoire pour une préférence (§4) ; le refus
levé par retrait (§5) ; la version suivante facultative, posée par
remplacement (§6) ; mise en œuvre et révision sur une version diffusée
seulement (§7) ; le dossier mineur refusé au cockpit (§8).

## Périmètre

- **PR 0 (cette PR)** : D-343, fiche, fragment, paragraphe du dossier RGPD.
  Aucun code.
- **PR 1 (migration seule)** : `decisions_parcours` (CHECK de forme par
  nature, famille, issue et motif ; note ; date de l'événement ; source ;
  version suivante ; triggers : ajout seul, praticien du dossier, même
  dossier pour la version et la version suivante, tête unique par fil sous
  verrou du dossier, remplacement dans la même famille, suppression
  réservée à l'effacement du dossier ; RLS sans politique) ; contrat SQL
  négatif propre et banc de deux sessions au CI ; effacement nommé avant
  `protocol_drafts` et son banc. Livrée : migration
  `20261022100000_decisions_parcours_v1` (les fonctions « figée » et
  « suppression nommée » de BP-13 réutilisées ; une fonction de famille et
  le trigger d'insertion neufs, verrou consultatif 343), contrat
  `decisions_parcours_v1_negatif.sql` (quinze promesses, dont « les
  versions ne bougent pas » : empreintes, statut et mise à jour des versions,
  approbations et check-ins inchangés après toutes les poses), banc
  `banc-decisions-parcours-deux-sessions.test.mjs` (sept courses).
  Isolation : la base n'admet que READ COMMITTED (REPEATABLE READ et
  SERIALIZABLE refusés par le trigger) — une transaction SERIALIZABLE face
  à une READ COMMITTED pouvait laisser deux révisions en vigueur, trou
  commun à BP-09, BP-11 et BP-13 ; fermé ici en base sur la revue
  CodeRabbit de #1644, arbitrage du responsable du 2026-10-22 (les tables
  voisines gardent leur garde). Routés de la relecture `wn-reviewer` de la
  PR 1 (P2), à tenir par le code : les
  nettoyages E2E qui suppriment des versions (`web/e2e/helpers/db.ts`)
  suppriment d'abord leurs décisions de parcours, dès qu'un E2E en pose ;
  le retour arrière de BP-13 passe après celui de BP-15 (fonctions
  partagées). Gardés à la route, comme D-343 le dit : date d'événement
  future, version suivante plus ancienne admise (D-343 §6 n'exige qu'une
  autre version).
- **PR 2 (code)** : route du cockpit ; panneau de la version (lignes,
  source, historique, séquence lacunaire dite) ; bancs comparatifs du jour 0
  et des quatre empreintes ; banc des lecteurs ; drapeau
  `WN_DECISIONS_PARCOURS` créé éteint, `docs/FEATURE_FLAGS.md`. Livrée :
  route `api/praticien/decisions-parcours` (GET journalisé : versions du
  dossier, hors instantanés du carnet, avec leur première diffusion
  recevable et leurs actions, et les décisions ; POST : pose, correction,
  retrait ; refus nommés avant la base, sous les mêmes verrous ; dossier
  mineur et dossier clos refusés ; journal par `classeEtCode`, jamais
  `err.message` — `signature` vit dans la bibliothèque biologique, hors de
  la frontière D-306, précédent BP-13) ; tiroir « Décisions de parcours »
  du cockpit (`DecisionsParcoursPanel`, libellés retenus le 2026-10-22 :
  révision en vigueur, fils de choix et de mise en œuvre, source, motif,
  note, date de l'événement ou « date inconnue », historique, séquence
  incomplète dite par portée, rappel du signalement d'effet indésirable ;
  la date de première diffusion s'affiche dans l'en-tête de la version, à
  côté des débuts réels, sans être remplacée — §9) ; bancs
  `jourZeroEtEmpreintes.test.ts` (jour 0 relu par `lireCalendriersSuivi`
  et quatre empreintes égaux après chaque nature, transaction de fixture
  qui refuse toute écriture hors `decisionParcours.create`, contre-épreuve)
  et `lecteursDecisionsParcours.guard.test.ts`. Le routé E2E reste sans
  objet : aucun E2E ne pose de décision. **Condition de l'allumage** : un
  test d'intégration de la route sur une vraie base (pose, correction,
  retrait, deux poses concurrentes sur un fil de révision, formes réelles
  des refus reconnus à leur code) ; l'information du patient relue avant
  l'ouverture du suivi (BP-21a).

## Hors périmètre

Toute surface patient ; la frise et la revue de cycle (BP-20) ; toute
attribution (DC-39, marche 4) ; la persistance des six libellés du J21 ; un
arrêt qui fermerait les jalons ; la décision comme pièce de constat ; toute
proposition de révision (BP-19).
