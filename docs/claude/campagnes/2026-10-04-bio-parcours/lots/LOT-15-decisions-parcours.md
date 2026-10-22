---
id: "LOT-15"
titre: "BP-15 — Décisions de parcours"
statut: "en_cours (2026-10-22) — D-343 acceptée ; PR 0 (décision et déclaration RGPD) ouverte"
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
  `protocol_drafts` et son banc.
- **PR 2 (code)** : route du cockpit ; panneau de la version (lignes,
  source, historique, séquence lacunaire dite) ; bancs comparatifs du jour 0
  et des quatre empreintes ; banc des lecteurs ; drapeau
  `WN_DECISIONS_PARCOURS` créé éteint, `docs/FEATURE_FLAGS.md`.

## Hors périmètre

Toute surface patient ; la frise et la revue de cycle (BP-20) ; toute
attribution (DC-39, marche 4) ; la persistance des six libellés du J21 ; un
arrêt qui fermerait les jalons ; la décision comme pièce de constat ; toute
proposition de révision (BP-19).
