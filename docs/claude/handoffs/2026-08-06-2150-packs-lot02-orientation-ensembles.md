# 2026-08-06 21:50 — LOT-02 packs-personnalises : orientation en ensembles personnalisés, table re-signée

**Campagne** : `2026-08-06-packs-personnalises` (primaire, `lot_courant` avancé
à LOT-03 dans cette même PR).

## Statut — livré

- Les 6 règles à `packId` re-ciblées en suggestions `questionnaireId`
  multi-instruments (compositions arbitrées par le praticien, deux fois : au
  plan, puis après la revue NO-GO). **Table re-signée D-018** : sha
  `547119c6868eb59ffbb153b395bf424804c81a91b9f8d970765e27474ce7397d`,
  `dateValidation` 2026-08-06, 23 claims relus en production (23/23 VALIDE,
  prescriptif, actifs, v1.0 — requête consignée au lot).
- Panneau : « Ajouter à la file d'envoi » (un clic, `POST
  /api/praticien/file-envoi`, modèle Bibliothèque), trois états : ajouté /
  déjà dans la file (GET filtré patient, périmé par drapeau d'obsolescence,
  y compris la relecture post-ajout) / déjà assigné (message écrit pour la
  cible questionnaire). Plus de bouton « Assigner ce pack ».
- Synthèse IA : bloc orientation inchangé par construction (lignes
  `questionnaire X`), phrase pack du prompt retirée (bump `synthese-v18`),
  `packsTransmis` structurellement vide + 5 bancs de restitution dont un
  faux positif assumé épinglé.
- Bancs neufs sur la table signée : résolubilité (prédicat `IDS_ASSIGNABLES`,
  celui de la route), **non-redondance** (attrape le no-op silencieux —
  mutation vérifiée), anti-`packId`, anti-contournement des portes R2-SOM-04 /
  R2-SOM-06 ; 4 tests d'absorption réécrits sur règles synthétiques,
  `COMPOSITION_PACKS` complétée (8/9/8).
- Qualité : revue `wn-reviewer` NO-GO (Berlin contournait la porte apnées ;
  claim Karasek inversé) → correctifs → **contre-revue GO** → 4 résidus
  appliqués. T1 vert, T2 vert (120 E2E), **T3 complet vert** (2 min 13).

## Prochaine action exacte

**LOT-03** via `/wn-lot` — retrait effectif des packs (désactiver 6 packs :
5 doctrine actifs + « Florence 1 » ; « Base de consultation » JAMAIS) + les
gestes hérités déjà au périmètre du lot : repli par nom de `resoudrePackBase`
mort (casse), garde `parDefaut` sur `PATCH /api/praticien/packs`, garde
`IDS_SUSPENDUS` sur POST/PATCH, journalisation de la perte de cible (aucun
code d'événement n'existe), bloc « Packs suggérés » de `PatientsPanel`.

## À savoir

- **Un sha intermédiaire (`86788998…`) a existé en cours de lot, jamais signé
  ni publié** — ne pas s'y référer.
- La re-signature d'une table qui change se **recalcule**, elle ne se rattrape
  pas ; la relecture des claims est ce qui distingue re-signer de « mettre le
  sha à jour » (D-018).
- Réserves consignées au lot : `WN-CL-0105-001`/`Q_STR_08` sur `R-STR-02`
  (claim de volet, instrument sans claim nommant) ; bruit du garde de
  restitution non mesuré (`SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE`).
- La valeur production de `WN_ENABLE_ORIENTATION_NNPP2` est chiffrée (posée le
  2026-08-04) : vérifier le panneau praticien après merge.
- Un T3 lancé pendant qu'un agent crée des fichiers de test jetables dans le
  même worktree rend un rouge fantôme — arbre calme obligatoire.
- PR #598 (état machine post-LOT-01) toujours en attente : panne GitHub
  Actions majeure en cours au moment de cette clôture, veilleur armé.
