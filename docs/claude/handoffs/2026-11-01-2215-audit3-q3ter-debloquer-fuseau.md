# Handoff — 2026-11-01 — Audit 3, lot Q3 ter : Débloquer au Fil, fuseau de la relance (D-414)

## Branche et état du dépôt

- Branche `audit3/q3ter-debloquer-fuseau`, partie de `origin/main` 6b5ea0f3,
  avancée en `--ff-only` sur 17126579 (D-407 à D-413 parues entre-temps ;
  D-414 recalée au sommet du registre, diff en ajouts seuls) ; worktree
  `j3-12e-ingestion`, session concurrente, cycle en `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge.

## Objectif

Les restes de Q3 bis tranchés par le responsable le 2026-11-01 :
1. Fil, carte « Échéance dépassée » non déverrouillée : « Débloquer » à la
   place de « Rappeler », puis « Rappeler » après le déblocage ;
2. relance : lendemain de l'échéance par le calendrier, aligné sur
   `isDeadlineExpired`.

## Décisions prises

- D-414 (réservée par `wn-reserver-decision.mjs`), précise D-404 §1 :
  - §1 : bouton « Débloquer » (« Déblocage… ») → `PATCH
    /api/praticien/assignations`, sans confirmation, échéance inchangée ; la
    carte reste, le même bouton devient « Rappeler » (focus conservé) ; un
    refus du déblocage s'affiche tel que la route l'écrit ; sans
    `statutReponses` (serveur antérieur), le bouton reste « Rappeler » ;
  - §2 : `depasseeLe` = minuit local du lendemain (`setDate(+1)`) ; la
    cadence entre rappels reste en durée.
- Textes neufs non arbitrés, calqués sur l'existant : « Déblocage
  impossible. » (repli si la route ne donne pas de message) et « Déblocage
  impossible : le serveur n'a pas répondu. ».
- Validés tels quels (arbitrage) : motif « Rendu du bilan impossible. » ;
  limites du rétablissement (D-404 §3) laissées consignées.
- Écartés (arbitrage) : confirmation ; « Débloquer et rappeler » en un
  geste ; échéance repoussée.

## Fichiers modifiés

- `web/src/lib/praticien/relanceAssignation.ts` (+ test) — lendemain par le
  calendrier ; banc à Paris aux deux changements d'heure de 2026.
- `web/src/lib/fil/cartes.ts` (+ test) — `statutReponses` sur
  `AssignationRow` et `CarteFil`.
- `web/src/app/api/praticien/fil/route.ts` — `statutReponses` lu.
- `web/src/components/fil/FilDuJour.tsx` (+ test) — `BoutonRelance` porte
  les deux gestes.
- Docs : `docs/DECISIONS.md` (D-414),
  `changelog.d/2026-11-01-audit3-q3ter-debloquer-fuseau.md`, ce handoff.

## Validations exécutées

- Mutations (source restaurée après chacune) :
  - bouton toujours « Rappeler » : 3 bancs rougissent ;
  - bouton qui ne bascule pas après le déblocage : 1 ;
  - « Débloquer » sans statut : 5 ;
  - statut absent de la carte : 1 ;
  - statut absent de la lecture du Fil : erreur de typage (`route.ts:516`) ;
  - lendemain par minuit + 24 h : 2 (octobre et mars) ;
  - statut porté par une annulée : 1 ;
  - échec réseau du déblocage muet : 1.
- T1 complet : code 0. T2 `--fast` : code 0 (Vitest : 15 556 passés,
  40 sautés ; E2E : 303 passés, 7 sautés), avant les corrections de revue.
- Revue `wn-reviewer` (diff non committé, sans checkout) : GO avec réserves.
  - P1 corrigé : une annulée échue aurait offert « Débloquer », succès
    trompeur (le portail l'ignore) ; sa carte ne porte plus le statut et
    garde « Rappeler », refusé sans écriture, comme avant ;
  - bancs ajoutés : carte annulée, échec réseau du déblocage ;
  - P2 écarté : annonce « Questionnaire débloqué. » — texte non arbitré ; le
    bouton qui garde le focus change de libellé et d'`aria-label` ;
  - P2 écarté : geste figé au montage — le `PATCH` est idempotent et le
    bouton bascule ensuite ;
  - P2 écarté : « lecture des retards sans filtre praticien » — la route
    filtre après lecture sur les patients du praticien (`actifs`, issu de
    `filtrePatientsDuPraticien`, `fil/route.ts`), et la garde du `PATCH`
    tient de toute façon.
- Après corrections : T1 complet code 0 ; T2 `--fast` code 0 (Vitest :
  15 558 passés, 40 sautés ; E2E : 303 passés, 7 sautés).
- PR #1812, tête 7db1967a : CI code 0. CodeRabbit en quota épuisé ;
  PR-Agent (run 41351606723 sur la tête, « No major issues ») et Copilot :
  - Copilot, suivi clos (élevé) : corrigé — le Fil garde les suivis
    clôturés, et « Débloquer » y aurait écrit alors que le rappel y est
    refusé (`accepteNouvelEnvoi`) ; la route marque `suiviClos`, la carte
    ne porte plus le statut et garde « Rappeler ». Mutations : cartes qui
    ignorent la marque (2 bancs), route qui ne marque pas (1). La garde
    serveur du `PATCH`, demandée aussi, est routée (voir problèmes
    ouverts) : elle toucherait le dossier, hors de l'arbitrage.
- `origin/main` avancé (#1811) : fusionné dans la branche sur arbitrage du
  responsable (de98fb87), sans conflit ; puis de nouveau (#1813, D-415),
  conflit de registre résolu en ajouts seuls (D-415 au-dessus de D-414).
- Après la correction Copilot et la première fusion : T1 complet code 0 ;
  T2 `--fast` code 0 (Vitest : 15 560 passés, 40 sautés ; E2E : 303
  passés, 7 sautés). La seconde fusion n'apporte que des docs.

## Problèmes ouverts

- Relevé hors arbitrage (antérieur) : le Fil lit les assignations
  `statut != Complété`, donc une annulée échue y paraît « en retard », et le
  bloc « échu » du dossier lui offre « Débloquer » (la route `PATCH` ne
  refuse ni annulée ni complétée). Écarter les annulées des deux surfaces,
  ou garder la route ? Question au responsable.
- Même question pour un suivi clôturé : la route `PATCH` déverrouille sans
  `accepteNouvelEnvoi` (Copilot, #1812). Le Fil ne l'offre plus ; le bloc
  « échu » du dossier peut l'offrir encore. Garde serveur dans le `PATCH` ?
  Question au responsable.
- Q2 revient avec l'audit 2.

## Prochaine action exacte

1. PR (`--body-file`), CI en fond (`wn-attendre-ci.mjs <N>`).
2. `@coderabbitai review` sur la tête (ou PR-Agent, D-393), un verdict par
   commentaire.
3. Déclarer « prête @<sha> » sur la PR, puis `/clear` (sans merge).
4. Après le merge par l'intégrateur : page de l'audit et mémoire
   `audit-emails-patient-2026-10-30`.

## Interdits encore actifs

- Aucune écriture en production.
- Aucun identifiant de dossier, nom ou e-mail dans le dépôt, sur la page ou
  dans les commandes.
- Pas de migration ; ne pas rejouer un refus de garde.
- Pas de merge par cette session (essai `D-373` §2).
