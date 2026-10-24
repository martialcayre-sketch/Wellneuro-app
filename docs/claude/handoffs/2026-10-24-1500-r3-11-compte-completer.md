# Handoff — 2026-10-24 — r3_11 : compte des besoins mesurés et « Compléter la mesure » (Q6, Q8)

## Branche et état du dépôt

- Branche `r3-11-compte-completer`, partie de `origin/main` (21918b98),
  worktree `j3-12e-ingestion`. Session concurrente, cycle en `git`/`gh`
  direct.
- `origin/main` (7e8d2d3d, après D-351 #1680) fusionné : conflits résolus sur
  `docs/DECISIONS.md` (D-352 au-dessus de D-351) et `SESSION_LOG.md`
  (reconstruit sur main, entrée en ajout seul).

## Objectif

Lot r3_11 de la file A (F59, rang 3) : Q6 (compte « Calculé sur n besoins
mesurés sur 12 » sur l'instrument) et Q8 (« Compléter la mesure » pour une
source sans passation exploitable), par une D-xxx produit commune.

## Décisions prises

- D-352 (produit, pas clinique), arbitrée le 2026-10-24 par quatre questions
  à options, toutes à la recommandation :
  - compte en tête de l'onglet, en tête du tiroir et en seconde ligne du
    bouton du tiroir. La ligne d'accès de F2 n'existe pas, puisque Q2 a gardé
    les cercles ;
  - geste sur l'onglet et le tiroir seulement : la liste des cercles garde le
    motif sans geste ;
  - geste dans le motif déplié, sous la seule ligne « aucune passation
    exploitable » ;
  - textes au mot près : « Compléter la mesure » ; bouton, états et phrase
    repris de la Trajectoire.
- Filtre partagé `questionnairesProposables` (dédoublonnage, puis
  `IDS_ASSIGNABLES`) entre la re-passation ciblée et
  `questionnairesACompleter`.
- Appel, bouton et libellés dans `patient-cockpit/AjoutFileEnvoi.tsx`, repris
  par `TrajectoirePanel` à rendu identique. L'état d'un ajout vaut pour un
  patient (revue medium).
- La route `besoins` sert `besoinsMesures` par
  `compterBesoinsMesures(agregerEquilibre(couvertures))`. Il n'y a aucun
  recompte côté écran, et un ancien conteneur n'affiche rien.

## Fichiers modifiés

- `web/src/lib/protocol/repassationCiblee.ts` (+ banc).
- `web/src/components/patient-cockpit/AjoutFileEnvoi.tsx` (neuf),
  `DetailMotifNonMesure.tsx`, `TrajectoirePanel.tsx`.
- `web/src/components/FichePatientPanel.tsx`, `DetailBesoinsPanel.tsx`.
- `web/src/app/api/praticien/besoins/route.ts` (+ banc).
- Bancs complétés : `DetailBesoinsPanel.test.tsx`, `FichePatientPanel.test.tsx`,
  `CerclesBesoinsCockpit.test.tsx`.
- `docs/DECISIONS.md` (D-352), `docs/claude/MATRICE_CONSOMMATION.md`
  (régénérée), `changelog.d/2026-10-24-r3-11-compte-completer.md`,
  `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) vert après la fusion de main.
- T2 (`npm run test:worktree -- --fast`) vert en 6 min 44 s, E2E Chromium
  et WebKit compris, après la fusion de main.
- `/code-review medium` : six constats. Quatre corrigés : état d'ajout
  propre au patient, sous-composant monté à la demande, mention du compte
  réutilisée, garde sur les deux champs. Deux écartés : le compte figure deux
  fois pour le tiroir, ce qui est l'arbitrage ; la clé des lignes de motif
  vient de r3_08 et chaque ligne est unique par construction.
- `lib/equilibre` est inchangé, donc ni T3 ni `wn-reviewer` (règle du lot).
  `frontierePortail.guard` est vert dans T1.

## Problèmes ouverts

- Compte à zéro : le compte dit « Calculé sur 0 besoin mesuré sur 12 »,
  alors que la jauge de l'indice masque sa base. Question posée au
  responsable, sans réponse au moment de la PR.
- Bases visuelles : le bouton du tiroir gagne une ligne et l'onglet une ligne
  de tête. Il faut régénérer les bases par le workflow `visual-baselines` et
  ne committer que les bases refusées.
- Hors lot : r3_09 (Q1), r3_10 (Q5), r3_12 (Q7), r3_13 (Q11), r3_14 (Q12),
  t43 (mode consultation), règle 2 (`nom-vN`).

## Prochaine action exacte

CI en fond (`wn-attendre-ci`), puis bases visuelles si `verify` rougit sur
`visual.spec.ts`. Ensuite, revue CodeRabbit sur le sha de tête, un verdict
pour chaque commentaire, aucune `release-db` en attente, puis merge
(`--repo`, `--match-head-commit`). Enfin, r3_11 passe à « fait » sur la page
de la file A, et la mémoire audit-instruments est mise à jour.

## Interdits encore actifs

- Aucune formule, table, version ni seuil ; aucune couleur ni aucun mot qui
  juge la valeur (D-333 §2 r4) ; aucune migration.
- Rien au portail (`frontierePortail.guard` vert). Le geste « compléter » ne
  doit jamais se lire comme une relance au patient : aucun envoi ni rappel
  automatique.
- Production en lecture seule ; aucun merge sans une revue de CodeRabbit
  sur le sha de tête.
