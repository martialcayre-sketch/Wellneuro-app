# 2026-08-06 19:15 — LOT-01 packs-personnalises : inventaire des surfaces + D-030

**Campagne** : `2026-08-06-packs-personnalises` (primaire, `lot_courant` avancé
à LOT-02 dans cette même PR).

## Statut — livré

- Matrice d'inventaire dans `lots/LOT-01-socle.md` (section Résultats) :
  ~70 surfaces, unité « une ligne = une surface de code », chaque ligne avec
  chemin:ligne relu, trois lectures SQL production datées du 2026-08-06.
- **D-030** dans `docs/DECISIONS.md` : les trois arbitrages produit + les
  conséquences d'inventaire + les réserves.
- Revue `wn-reviewer` indépendante : **NO-GO** (B1 : l'instruction « désactiver
  les 2 packs praticien », lue littéralement, désactivait « Base de
  consultation » et cassait tout onboarding ; B2 : repli par nom de
  `resoudrePackBase` mort ; B3 : réserve D-025 déclarée fermée à tort) →
  correctifs appliqués → **contre-revue GO**. T1 vert à chaque passe.
- LOT-02/LOT-03 enrichis pour qu'aucun geste découvert ne reste orphelin
  (bouton « Assigner ce pack » → LOT-02 ; « Packs suggérés », garde
  `IDS_SUSPENDUS`, repli casse, garde `parDefaut` → LOT-03 ; fixture
  `COMPOSITION_PACKS` complétée → critère de done LOT-02).

## Prochaine action exacte

Ouvrir **LOT-02** via `/wn-lot` — classe Scoring/clinique
(`orientationRulesV1.ts`) : re-ciblage des 6 règles à `packId` vers des
suggestions `questionnaireId` (candidats déjà proposés dans la matrice),
**re-signature D-018** (littéral `SHA_SIGNE_2026_08_04` du test), revue
adversariale avant PR, palier T3.

## À savoir

- **« 6 packs désactivés » = 5 doctrine actifs + « Florence 1 »** ; « Base de
  consultation » (pack praticien, `par_defaut`) n'est **jamais** désactivée.
- `consultations.id_pack_assigne` ne porte que le pack de base (15 lignes) ;
  `pack_propositions` est **vide** mais le modèle est vivant (écrivain
  `pack-reevaluation`, purge RGPD) — ne pas le déclarer « sans objet ».
- Le repli par nom de `resoudrePackBase` cherche `'BASE DE CONSULTATION'`
  (majuscules) : mort par sensibilité à la casse. Aggravant : `PATCH
  /api/praticien/packs` accepte `parDefaut` sur n'importe quel pack sans
  garde. Les deux gestes sont au périmètre LOT-03.
- Les compositions de remplacement du LOT-02 viennent de la **lecture SQL**,
  pas de la fixture `COMPOSITION_PACKS` (partielle : 8/8, 2/9, 1/8).
- Références dans `DECISIONS.md` : citer l'identifiant D-0xx + la phrase,
  jamais un numéro de ligne (fichier append-en-tête, décalé à chaque
  insertion — constaté deux fois dans la même journée).
- Reliquat hors périmètre : la campagne dettes 5.0 reste `statut: en_cours /
  lot_courant: LOT-06` sans trace de sa mise en attente (D-030 et CAMPAGNE.md
  packs-personnalisés portent la primauté ; le fichier de la campagne dettes,
  lui, n'a pas été touché).
