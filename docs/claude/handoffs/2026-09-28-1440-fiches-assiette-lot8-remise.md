# Handoff — 2026-09-28 — Fiches d'assiette : la remise au clic « Valider pour diffusion » (D-251, lot 8)

## 1. Branche et état Git

`wn-fiches-assiette-lot8-remise`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`97aa57f2` (#1244). Code seul, sans migration : M2 est appliquée et constatée
(#1243). Un merge à la fois.

## 2. Objectif

Le lot 8 de `D-251` : au clic « Valider pour diffusion », remettre au patient
la fiche de chaque assiette portée par une action ferme du protocole, après un
aperçu, sous `WN_FICHES_ASSIETTE`.

## 3. Décisions prises

- **Le drapeau garde l'émission, et rien d'autre.** Fermé, la route de
  diffusion lit et écrit exactement ce qu'elle lisait et écrivait : ni
  `payload`, ni dossier, ni transaction, ni remise. Seule la réponse du GET
  porte `fiches: null` de plus. Un banc le tient.
- **Un cœur pur, un module serveur.**
  - `apercuRemise.ts` décide, fiche par fiche : partira, déjà remise, ne
    partira pas (avec son motif).
  - `remise.ts` lit les faits, avec les contrôles rejoués sur la référence
    (§6), calcule le jeton et écrit.
  - L'écran n'importe que les types et une fonction pure.
- **Le jeton résume ce qui décide, pas les phrases.** Il couvre les versions,
  les statuts, les actions, le blocage et la version du protocole. Reformuler
  une phrase ne périme pas un aperçu.
- **Approbation et remises dans une seule transaction.** L'aperçu y est
  recalculé sous le verrou de chaque fiche, dans l'ordre des fiches : le même
  verrou que `decision.ts` et que le trigger de M2. Un jeton absent ou
  différent donne 409 `apercu_fiches_perime`, et rien n'est écrit.
- **Un clic sur une version déjà approuvée n'est pas un no-op** quand des
  fiches ont été validées depuis (§7). L'approbation active est reprise.
- **Deux blocages globaux.**
  - Le dossier n'est pas en suivi (`accepteNouvelEnvoi`).
  - Le protocole n'est pas servable : carte non rejouable, payload illisible,
    ou contrat patient refusé.

  Le dossier prime. Au clic, il est lu DANS la transaction avec `FOR SHARE` :
  une clôture concurrente attend la fin du clic. Sous un blocage, aucune fiche
  n'est lue ni verrouillée.
- **Les correctifs de la revue `wn-reviewer`** (GO, aucun P0 ni P1, cinq P2
  corrigés dans ce lot) :
  - `payload` lu seulement drapeau ouvert ;
  - une lecture des fiches en échec ne fait plus tomber le GET : blocage
    `lecture_impossible`, avec un jeton qui n'égale aucun aperçu calculé ;
  - sur un aperçu périmé, le cockpit recharge aussi les versions, et une
    lecture manquée efface l'aperçu ;
  - le dossier est verrouillé au clic ;
  - seul le texte de la référence est chargé ;
  - l'écran ne dit plus « aucune action ne porte d'assiette » sous un blocage à
    zéro ligne.
- **« Ferme » veut dire `interventionStatus: 'active'`** (`D-056`). Une même
  assiette sur une action ferme et une action suspendue part par l'action
  ferme.

## 4. Fichiers modifiés

- `web/src/lib/fiches-assiette/apercuRemise.ts` (nouveau, pur) et son banc.
- `web/src/lib/fiches-assiette/remise.ts` (nouveau, serveur) et son banc.
- `web/src/lib/fiches-assiette/drapeau.ts` (nouveau).
- `web/src/lib/fiches-assiette/remises.guard.test.ts` : un seul endroit crée
  une remise, par `createMany`.
- `web/src/app/api/praticien/protocoles/diffusion/route.ts`, son banc, et
  `route.fiches.test.ts` (nouveau, l'invariant des jetons).
- `web/src/components/patient-cockpit/ProtocolDiffusionPanel.tsx` et son banc.
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx`, et la garde
  `diffusionFiches.guard.test.ts` (nouvelle).
- `web/src/components/fiches-assiette/RayonFichesConseilsPanel.tsx` : la phrase
  d'introduction.
- `docs/FEATURE_FLAGS.md` : `WN_FICHES_ASSIETTE`.
- `changelog.d/2026-09-28-fiches-assiette-lot8-remise.md` (fragment de
  changelog).
- `docs/claude/handoffs/2026-09-28-1440-fiches-assiette-lot8-remise.md` (ce
  handoff).
- `docs/claude/SESSION_LOG.md` (entrée de clôture).

## 5. Validations exécutées

- **Bancs verts :**
  - aperçu (13), la garde des remises (4) et `remise.ts` (9) ;
  - route (34, dont 12 neufs) ;
  - l'invariant central (3, `route.fiches.test.ts`), sans simuler la chaîne
    des fiches : le jeton du GET est celui que le POST recalcule, un rejeu est
    refusé, et une version validée entre-temps est refusée puis remise ;
  - panneau (14, dont 6 neufs) et la garde du cockpit (5) ;
  - les bancs du cockpit et de la fiche patient, inchangés ;
  - les gardes des drapeaux et la matrice de consommation.
- **24 mutants tués, joués en session** (script hors dépôt), chacun par le
  banc qui vise sa règle. Ils couvrent :
  - le jeton non comparé, absent accepté, ou calculé au GET sur une autre
    version ;
  - le drapeau ignoré, le `payload` lu drapeau fermé, l'approbation toujours
    recréée ;
  - le dossier clos ignoré ou lu sans verrou, la lecture en échec non
    rattrapée, l'aperçu du GET verrouillé ;
  - l'action non ferme, les contrôles ignorés, l'idempotence retirée, le
    blocage ignoré, le jeton aveugle à la version ;
  - les verrous non pris, les remises non triées, le compte non vérifié, la
    remise en cours lue à l'envers, le texte chargé pour toutes les versions ;
  - à l'écran : le blocage répété, et un blocage à zéro ligne lu « aucune
    assiette » ;
  - au cockpit : les versions non rechargées, et un aperçu gardé après une
    lecture manquée.
- **Un passage d'intégration sur une base réelle migrée** (`wn_m2_travail_b`,
  locale), en session, dans une transaction annulée : remise de la v1, rejeu
  sans effet, v2 qui la remplace, puis v1 remise à nouveau après le retrait de
  la v2. L'histoire v1-v2-v1 est en base dans l'ordre, et chaque remise porte
  son approbation. Les contrôles y étaient simulés, faute de corpus.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- **Pas d'E2E du parcours de diffusion avec fiches.** Le drapeau est fermé dans
  les E2E, et aucun E2E n'atteint aujourd'hui la sous-vue Diffusion. Le premier
  constat réel est le protocole servi de bout en bout sur un dossier de test
  (arbitrage 6 du 2026-09-28), drapeau fermé : il éprouvera la diffusion, pas
  les fiches.
- **Le nettoyage des E2E** (`web/e2e/helpers/db.ts`) ne supprime ni
  approbations ni remises. C'est sans effet tant que le drapeau est fermé dans
  les E2E.
- **Lots 9 à 11 :** le service patient des fiches remises (remise EN COURS par
  fiche, mention de retrait, mention « ne fait plus partie de votre protocole
  actuel »), l'espace de lecture avec la tâche du fil, l'e-mail neutre, et le
  document TRUST sur l'IA.

## 7. Prochaine action exacte

1. La PR, sa revue Copilot et le merge. La revue `wn-reviewer` est faite
   (GO), et ses P2 sont corrigés.
2. Servir un premier protocole de bout en bout sur un dossier de test, drapeau
   fermé, et le constater par conteneur.
3. Le lot 9.

## 8. Interdits encore actifs

- `WN_FICHES_ASSIETTE` reste fermé jusqu'au §10 de `D-251`.
- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal ; tests en texte
  synthétique.
