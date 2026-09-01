---
id: "LOT-05"
titre: "ui-rayon-biologie-cb08"
statut: "terminé"
dépend_de: "LOT-02 (CB-05), LOT-03 (CB-06) — dépendances constatées caduques au réel (voir Résultats)"
---

# LOT-05 (CB-08) — UI : rayon biologie dans la bibliothèque, fiche patient, fil

## But

Remplacer progressivement le placeholder `dashboard/biologie`, ajouter
l'encart « explorations biologiques suggérées » sur la fiche patient et les
cartes de suivi dans le Fil du jour.

## Résultat observable

- Rayon documentaire consultable dans la bibliothèque : catalogue, fiches
  d'analytes avec les **deux référentiels** de valeurs côte à côte (laboratoire
  / fonctionnel), jamais fusionnés en une colonne unique ; bandeau HDS présent
  sur tout ce qui touche aux résultats.
- Encart « explorations biologiques suggérées » sur la fiche patient — pendant
  de l'encart questionnaires du lot 10 certification : instrument à tiroir
  ouvert depuis la zone focale du protocole, jamais écran de classement
  autonome ; **aucun score global**, justification à un clic.
- Cartes de suivi (signée, transmise, retour à consigner) dans le Fil, comme
  les cartes existantes (projection recalculée).
- `EstimeMesurePanel` reste en « second temps », inchangé, jusqu'à l'étage 2.

## Périmètre

- `web/src/app/dashboard/biologie/page.tsx` (remplacement progressif du
  placeholder statique).
- Composants de fiche analyte, encart fiche patient, cartes du Fil.
- Textes UI en français, vocabulaire imposé (jamais « prescription » etc.).

## Hors périmètre

- Toute saisie ou affichage de résultat biologique réel (étage 2, CB-09).
- La logique du moteur, de la machine à états, de la diffusion (déjà faites).

## Fichiers probables

- `web/src/app/dashboard/biologie/page.tsx`
- `web/src/components/EstimeMesurePanel.tsx` (ne pas sortir du « second temps »)
- `web/src/components/**` (nouveaux composants de fiche analyte, encart)
- Rayon compléments C4 UI (`web/src/lib/supplement-library/`) comme patron

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Aucune migration ici (lecture seule du catalogue et des propositions déjà
  en base).
- Pas de score global affiché nulle part sur ce rayon.
- Pas de refactor hors lot.
- Textes UI en français uniquement.

## Étapes

- [x] Vérifier les hypothèses (patron C4 UI, placeholder actuel).
- [x] Implémenter le rayon documentaire (catalogue, fiches analytes).
- [x] ~~Implémenter l'encart fiche patient et les cartes du Fil~~ — constatés
      **déjà livrés hors campagne** (voir Résultats), rien à écrire.
- [x] Exécuter les validations (T1 + T2 ; ~~captures de revue pour tout nouvel
      écran~~ — non produites : remplacées par les bancs d'écran et une
      contre-revue adverse du diff, constat en Résultats ; la vérification à
      l'œil reste due au premier déploiement).
- [x] Relire le diff (UI, français, vocabulaire).
- [x] Documenter les résultats.

## Tests

- T2 avant tout commit UI.
- Vérification manuelle : bandeau HDS visible partout où c'est requis, deux
  référentiels toujours côte à côte, aucun score global.

## Critères de done

- Placeholder remplacé pour l'étage documentaire.
- Encart et cartes fonctionnels et testés.
- Revue UI (français, vocabulaire, HDS) faite.

## Résultats

**Terminé le 2026-09-01**, sur un périmètre réel plus étroit que le cadrage du
2026-08-03 — l'écart est un constat, pas une coupe :

- **Livré ici** : le rayon documentaire « Analyses biologiques » dans la
  Bibliothèque (section flag-gardée `WN_CB_ENABLED`, patron C4) — bilans par
  niveau, fiches d'analytes en tiroir avec les deux référentiels côte à côte
  (chaque absence dite), remboursement dérivé par `remboursable.ts` (« non
  évalué » ≠ « non remboursé », écrit à l'écran), préanalytique, provenance,
  millésime NABM sans euros. Route `GET /api/praticien/biologie/catalogue`
  (garde praticien + 404 fail-closed), service
  `biology-library/catalogue.ts`. Le placeholder `dashboard/biologie` oriente
  vers le rayon et sa bannière HDS périmée est réécrite (`D-120`/`D-121`).
- **Constaté déjà livré hors campagne, donc pas réécrit** : l'encart fiche
  patient (`PropositionBilanPanel` au cockpit, `D-071`) et les cartes du fil
  (cartes d'arbitrage, `D-070` §2). Les cartes « signée/transmise » du cadrage
  restent sans objet : la machine à états CB-05 (`BiologyExplorationProposal`)
  n'a jamais été construite — la proposition se recalcule à la lecture
  (chaîne `D-068`→`D-073`), et les dépendances déclarées du lot (LOT-02/LOT-03)
  sont caduques.
- **Bancs** : garde-fous du drapeau sur la page Bibliothèque, route (401/404
  fail-closed/500), service (dérivation du remboursement, actes du seul
  millésime pointé, panels inactifs écartés), écran (deux colonnes, absences
  dites, badge validation médicale, banc de vocabulaire joué liste ET tiroir
  ouvert — jamais « prescription », « ordonnance » ni « diagnostic », aucun
  score global, aucun euro ; « dosage » n'est PAS interdit d'écran : la donnée
  réelle le porte en verbatim de claim — `PANEL_MG_PLASMATIQUE` — et la
  fixture du banc le prouve).
- **Contre-revue adverse du diff jouée avant la PR** (3 lentilles, réfutation
  par 2 sceptiques par constat) : 10 constats retenus, 0 réfuté, tous
  corrigés — dont la puce « Analyses biologiques » de `BibliothequePanel`
  restée « à venir » avec la phrase HDS fausse sur la page même du rayon, et
  la carte « Le rayon est ouvert » de `dashboard/biologie` qui ne lisait pas
  le drapeau. Aucune capture d'écran produite : la vérification à l'œil reste
  due au premier déploiement.
- **Matrice de consommation** : `catalogue-biologie` sort des dormantes (le
  verdict `a_brancher` du 2026-08-05 est soldé) ; `rayon:biologie` re-daté,
  toujours dormant — élargir l'allowlist corpus est une décision praticien.
- **EstimeMesurePanel** intact (« second temps », étage 2 / CB-09).
