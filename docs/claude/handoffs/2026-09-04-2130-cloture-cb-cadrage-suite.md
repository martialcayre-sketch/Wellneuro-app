# Handoff — 2026-09-04 — Clôture de la campagne CB et cadrage de la suite du rayon

## Branche et état Git

- Branche vivante : `docs/cadrage-suite-biologie` (PR de gouvernance, docs
  seuls, aucune ligne de code).
- Même jour, déjà sur `main` : #859 (journal de session de la nuit D-122),
  #863 (fix corps `null` du POST courrier, relevé P1 de la contre-revue).

## Ce que cette PR tranche (go du responsable, en session)

1. **La campagne `2026-08-02-rayon-biologie-cb` est CLOSE** — l'arbitrage
   pendant de FILE_ATTENTE est tranché. LOT-05/LOT-06 livrés ; LOT-00→LOT-04
   requalifiés fiche par fiche (bandeaux datés) : LOT-00/01/03 recouverts
   par la chaîne D-068→D-073 puis D-122, LOT-02 (machine à états) caduc,
   LOT-04 (contrat V4 `BiologyCatalogRef`) non livré et TRANSFÉRÉ à l'entrée
   « producteur d'intentions » de la file. Done coché sur preuves.
2. **La suite immédiate est cadrée** : campagne
   `2026-09-04-biologie-exploitee/` — quatre lots courts, code sans règle
   clinique nouvelle (relecture du document patient + garde
   anti-double-consignation ; geste de correction d'une saisie ; E2E des
   étages de septembre ; plage sourcée à côté de la mesure, conditionné au
   tranchement DC-19/20). **Rang face aux 6.0 : à arbitrer** — le cadrage ne
   réarbitre pas la file.
3. **L'horizon à décision entre en file « à cadrer »** : ré-alimentation du
   moteur par le mesuré (proposition de cadrage → D-xxx + claims →
   campagne), import laboratoire (cadrage + volet RGPD + exactitude
   décimale), producteur d'intentions `conditionnelle_biologie` (D-056 vs
   geste praticien — le contrat V4 s'y réexamine).
4. **Réconciliations datées** des documents en retard d'époque :
   ROADMAP_PRODUIT (R5/E8), REGISTRE_FRONTIERES (estimé↔mesuré, biologie
   réelle), DOSSIER_RGPD rubrique 2 (l'étage 2 existe et reste fermé ;
   ouverture conditionnée aux mises à jour RGPD préalables), FILE_ATTENTE
   (dette du commentaire `featureFlag.ts` constatée soldée ; E8 périmé
   annoté).

## Ce qui n'est PAS dans cette PR

- Aucune levée de drapeau, aucune écriture applicative, aucune migration.
- Le registre des traitements et l'information patient (préalables à la
  levée de `WN_CB_RESULTS_ENABLED`) restent dus — gestes du responsable.
- Le constat visuel des surfaces D-122 reste dû.

## Sources

- Bilan complet du rayon + contre-revue adverse Codex intégrée (2026-09-04,
  artefact « Le rayon biologie ») ; handoff
  `2026-09-04-0040-chantier-d122-etages-biologie.md`.

## Prochaine action exacte

1. Merge de cette PR (gouvernance, docs seuls).
2. Arbitrages du responsable, chacun indépendant : rang de « Biologie
   exploitée » dans la file ; régime de correction (LOT-02) ; question
   DC-19/20 (LOT-04) ; date de la levée du drapeau (après registre +
   information patient).
3. À l'ouverture de la campagne : LOT-01 d'abord (aucune dépendance).

## Interdits encore actifs

- Aucune règle « résultat → statut » sans décision propre (D-122, DC-30).
- Tables signées intouchables hors décision (DC-17/18).
- Fixtures uniquement ; production lisible par conteneur one-off seulement.
