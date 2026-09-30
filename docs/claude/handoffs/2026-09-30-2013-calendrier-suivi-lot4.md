# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 4 : garde du POST et vérités d'écran (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-lot4`, copie principale, partie de `origin/main` à
`c02f209d` (#1272). La branche est partie de `2f172173`. La PR #1272 a
été mergée pendant le lot : elle ne touche aucun fichier commun. La branche a été
replacée par `git switch -C`, sans commit, avec l'accord du responsable.
Phase `travail`, fenêtre de clôture ouverte. Un merge à la fois.

## 2. Objectif

Dernier lot de `D-255` (§5.4) :

- une garde serveur qui refuse la confirmation d'un jalon de mesure hors de
  sa fenêtre ;
- un rail « Suivi » et un panneau J21 qui disent vrai sans protocole.

## 3. Décisions prises

- **Garde** (`refusJalonMesureHorsFenetre`, `lib/protocol/jalonDu.ts`) : même
  `fenetre()` et même jour 0 que `resoudreJalonDu`. Refus 409
  `jalon_hors_fenetre` dans trois cas : sans ancre, sans diffusion, hors
  fenêtre. Elle est posée avant toute écriture, et le client affiche le motif.
- **Seul un acte NOUVEAU est gardé.** Une ligne déjà en base garde sa date et
  se re-confirme (`D-129`), ce qui couvre le J21 de `PAT006`, confirmé sans
  protocole avant `D-255`.
- **Rail « Suivi »**, un statut par cas :
  - « à ouvrir » sans diffusion sur le cycle courant ;
  - « en attente du patient » quand le protocole est diffusé mais qu'aucun
    point n'est rendu ;
  - « renseignée » dès qu'un point est rendu ;
  - « indéterminée » tant que la trajectoire ou les check-ins ne sont pas lus.
- **Revue Copilot de #1273**, deux correctifs :
  - l'état des check-ins a trois valeurs (lu, vide, inconnu) ;
  - la route `praticien/protocoles/checkins` lit les versions du calendrier
    courant (repli par carte sans calendrier).
  Le troisième commentaire, « cinq neufs », est corrigé.
- **Panneau J21 sans diffusion** : il affiche une ligne d'état, sans « en
  attente du patient » et sans boutons d'ajustement.
- **Choix d'exécution à confirmer en revue** : le libellé « en attente du
  patient » sur Suivi, « à ouvrir » sans diffusion, et le code 409.

## 4. Fichiers modifiés

- `web/src/lib/protocol/jalonDu.ts` : la garde, et le motif sans diffusion
  mis en commun.
- `web/src/app/api/praticien/cockpit/route.ts` : `ancreCycle` calculé une
  seule fois, la garde, le motif `jalon_hors_fenetre`.
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` :
  `suiviOuvert`, `suiviRenseigne` compté sur les points rendus, refus affiché.
- `web/src/components/patient-cockpit/J21DecisionPanel.tsx` : branche sans
  diffusion.
- `web/src/components/FichePatientPanel.tsx` : statut et libellé du rail
  « Suivi ».
- `web/src/app/api/praticien/protocoles/checkins/route.ts` : bornage par le
  calendrier (revue).
- Bancs : `jalonDu.test.ts` (garde, parité jour par jour), `route.test.ts`
  (deux cas recalés sur une horloge simulée, cinq nouveaux),
  `J21DecisionPanel.test.tsx`, `FichePatientPanel.test.tsx` (cinq cas de
  rail), `protocoles/checkins/route.test.ts` (calendrier sur deux cartes,
  pivot).
- `docs/DECISIONS.md` (complément à `D-255`),
  `changelog.d/2026-09-30-calendrier-suivi-lot4.md`, `SESSION_LOG`, ce
  handoff.

## 5. Validations exécutées

- Bancs touchés : route 71/71, `jalonDu` 32/32, UI 172/172.
- Mutations : 16 jouées, toutes détectées. Six portent sur la garde :
  - garde retirée ;
  - garde appliquée aussi à un acte déjà posé ;
  - absence de diffusion acceptée ;
  - borne haute stricte ;
  - absence de cycle acceptée ;
  - ancre non exemptée.

  Cinq portent sur l'écran :
  - résumé lu compté comme renseigné ;
  - cas sans diffusion non traité ;
  - propriété non passée au panneau ;
  - libellé ;
  - cas « inconnu » non traité.

  Cinq portent sur les correctifs de revue :
  - lecture par carte seule ;
  - calendrier ignoré ;
  - check-ins inconnus non traités ;
  - échec de lecture compté comme lu ;
  - carte non comparée.
- T1 (`check:rapide`) vert.
- T2 (`test:worktree --fast`) vert, rejoué après les correctifs de revue sur
  la base `c02f209d` : 645 fichiers Vitest (11 171 cas) et 221 E2E.

## 6. Problèmes ouverts

- Aucun reste de `D-255` après ce lot.

## 7. Prochaine action exacte

1. Committer.
2. Ouvrir la PR du lot 4.
3. Attendre le CI avec `wn-attendre-ci`.
4. Lire la revue Copilot, commentaires en ligne compris.
5. Merger.
6. Constater le déploiement.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; rien sous `lib/clinical/`.
- Ne jamais confirmer un J21 pour débloquer une saisie.
