# Handoff — 2026-11-09 — Portail : le succès s'annonce et le focus le suit quand le formulaire disparaît

## Branche et état Git

`fix/succes-annonce-focus`, worktree `.claude/worktrees/fix-succes-annonce-focus`, partie d'`origin/main` à `12ae6df4c`. Les worktrees `audit-ui-patient-correctifs`, `fix-question-field-nom-accessible` et `fix-saisie-nuit-groupes-accessibles` ne servent plus et restent sur le disque.

## Objectif

Corriger le constat n° 8 de l'audit d'interface du 2026-11-07, à la demande du responsable, `ConsultationScreen` compris, sur le modèle de `DepotDocuments` : succès sans annonce ni transfert du focus sur quatre écrans.

## Décisions prises

- Le modèle ne suffit pas tel quel : dans `DepotDocuments`, le formulaire reste à l'écran, le focus n'y est donc pas perdu. Ici, le bouton disparaît avec le formulaire. La région `status` permanente vient du modèle ; le transfert du focus vient de `portail/error.tsx` (`tabIndex={-1}`).
- Un composant commun, `PatientRegionAccuse`, plutôt que quatre copies. `PatientInlineMessage` n'est pas modifié : il sert aussi d'erreur et d'information partout, et `ConsultationScreen` ne l'utilise pas.
- Le focus ne bouge qu'au passage à visible, jamais au montage : `ConsultationScreen` peut s'ouvrir sur une demande déjà transmise.
- `CeQuiCompteForm` et `SignalerProbleme` sont scindés : leurs retours anticipés remontaient tout l'arbre, aucune région n'y aurait survécu. L'export et les props ne changent pas.
- Dans `SignalerProbleme`, « Faire un autre signalement » reste hors de la région : il ne fait pas partie de ce qui s'annonce.
- Dans `CeQuiCompteForm`, la région englobe toute la carte : l'accusé dit deux choses, que c'est enregistré et quand on pourra réécrire.
- Aucun texte modifié, ton de `SignalerProbleme` (`info`) et classes du `<p>` de `ConsultationScreen` conservés.

## Fichiers modifiés

- `web/src/components/patient/ui/PatientRegionAccuse.tsx` et son test : le composant.
- `web/src/components/patient/DemandeLienForm.tsx`, `ConsultationScreen.tsx`, `trust/SignalerProbleme.tsx`, `web/src/components/patient-companion/CeQuiCompteForm.tsx` et leurs tests.
- `changelog.d/2026-11-09-succes-annonce-focus.md`, ce handoff.

## Validations exécutées

- Six tests neufs des écrans sont rouges sans le correctif et verts avec ; un septième (l'aperçu praticien n'a pas de région) et le test du composant gardent le comportement. Avec les tests existants de ces écrans et la garde `ceQuiCompteAntiAgregat` : 52/52.
- T1 (`npm run check:rapide`) et T1 complet (`npm run check`) : verts sur l'arbre du lot.
- T2 (`npm run test:worktree -- --fast`) : vert sur l'arbre du lot, base `12ae6df4c`. 357 E2E passés et 23 ignorés ; 16 583 tests Vitest passés et 49 ignorés.

## Problèmes ouverts

- Non vérifié au rendu avec un lecteur d'écran réel : région et focus peuvent faire annoncer le message deux fois.
- Démontré dans le code, sans occurrence observée (`D-125`).
- Même famille, hors du constat et non corrigés, à arbitrer : `ComprehensionView.tsx:168` et `DossierDeuxVoixView.tsx:1035-1058` (accusés `success` sans région) ; `FoodObservationJourney.tsx:272` (`aria-live` monté avec son contenu).
- Focus perdu lui aussi, hors du constat : « Annuler » et « Faire un autre signalement » dans `SignalerProbleme`.
- Constats restants de l'audit : n° 4 à 7, 10, 11, 13 et les P2.

## Prochaine action exacte

CI et revue de la PR, puis déclaration « prête @<sha> » en commentaire sur la PR pour l'intégrateur.

## Interdits encore actifs

- Pas de merge par la file (`D-454`).
- Curseurs de `PlaintesForm` à 5 par défaut : arbitrage clinique, ne pas y toucher.
