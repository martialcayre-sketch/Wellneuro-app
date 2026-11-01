# Handoff — 2026-11-01 — Audit 3, lot Q3 bis : restes de Q3 (D-404)

## Branche et état du dépôt

- Branche `fix/audit3-q3bis-restes`, partie de `origin/main` dcef9059 ;
  worktree `j3-12e-ingestion`, session concurrente, cycle en `git`/`gh`
  direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.

## Objectif

Les quatre restes du lot Q3 (#1798), tranchés par le responsable le
2026-11-01 :
1. rappel d'un questionnaire échu non déverrouillé : refusé ;
2. Fil : un rappel non parti ne se dit plus « envoyé » ;
3. accès révoqué puis rétabli dans l'heure : le rétablissement confirmé
   passe la garde d'une heure ;
4. `buildBookletHTML` qui lève : « Erreur » tracée en préparation.

## Décisions prises

- D-404 (réservée par `wn-reserver-decision.mjs`), amende D-398 §3 :
  - §1 : refus `echeance_expiree` (409) après le contrôle d'échéance, sauf
    `statut_reponses = deverrouille` ; le groupe de D-399 §3 ne couvre que
    les déverrouillées ;
  - §2 : textes du Fil sur `Erreur` et `Non_envoye` ;
  - §3 : la garde ne compte que les e-mails partis depuis la révocation
    levée (`sessionsInvalidesAvant`, à défaut l'instant du rétablissement ;
    paramètre `depuis` de `reserverSousGarde`) ; levée de révocation en
    `updateMany … accessTokenRevoked = true`, seule la requête qui lève
    porte l'instant ;
  - §4 : trace `Erreur`/`Preparation` (audit + journal) sous le motif fixe
    « Rendu du bilan impossible. », puis le `catch` général (500, message
    inchangé) ; la garde du dossier clos passe avant le rendu.
- Textes validés mot pour mot par le responsable :
  - « Ce questionnaire a expiré : déverrouillez-le avant de le rappeler. »
  - « Rappel non parti : l’envoi a échoué. Vous pouvez réessayer. »
  - « Rappel non parti : l’envoi d’e-mails n’est pas configuré. »
- Écartés (arbitrage) : garde par adresse ; lien magique orphelin d'un accès
  refusé (D-399 §4).

## Fichiers modifiés

- `lib/praticien/relanceAssignation.ts` (+ test) — refus `echeance_expiree`.
- `api/praticien/assignations/relance/route.ts` (+ test) — `statutReponses`
  lu, message du refus.
- `components/fil/FilDuJour.tsx` (+ test) — deux textes.
- `lib/correspondance/reservation.ts` — `depuis` borne la fenêtre.
- `lib/consultation/email.ts` (+ test) — `revoqueLe`, sixième argument de
  `sendPortailLinkEmail`, transmis à la garde.
- `api/praticien/token/route.ts` (+ test) — bascule atomique, instant
  transmis.
- `api/praticien/booklet/route.ts` (+ test) — rendu tracé, garde du
  dossier clos remontée avant le rendu. **Fichier en
  CRLF** : l'éditer en préservant les fins de ligne (un premier essai les
  avait normalisées, rétabli depuis Git).
- `lib/correspondance/reservation.pg.test.ts` — deux bancs neufs (échue non
  déverrouillée ; accès révoqué, rétabli, double confirmation).
- Docs : `docs/DECISIONS.md` (D-404),
  `changelog.d/2026-11-01-audit3-q3bis-restes.md`, ce handoff.

## Validations exécutées

- Bancs ciblés sur base locale (`scripts/wn-dev-db.sh`, DB_POOL_MAX=4) :
  `reservation.pg.test.ts` 10/10 verts.
- Mutations (source restaurée après chacune) :
  - contrôle du déverrouillage retiré : 4 bancs rougissent (unitaire,
    deux de route, base réelle) ;
  - branches `Erreur`/`Non_envoye` du Fil retirées : 2 bancs rougissent ;
  - borne `depuis` ignorée : le banc base réelle du rétablissement rougit ;
  - bascule non atomique (`count` ignoré) : le banc de route rougit ; le
    banc base réelle reste vert, la borne protégeant déjà le double clic
    (les deux instants précèdent les deux réservations) ;
  - trace du rendu neutralisée : le banc de route rougit.
- T1 complet : code 0.
- T2 `--fast` : code 0 (Vitest : 15 531 passés, 40 sautés ; E2E : 303
  passés, 7 sautés).
- Revue `wn-reviewer` (diff non committé, sans checkout) : GO avec
  réserves, aucun P0/P1. Corrigés : ordre expiration/cadence prouvé par un
  banc, valeurs de `statut_reponses` réelles dans les bancs, changelog
  (« envoi ou renvoi »). Consignés : deux limites du rétablissement (D-404
  §3). Routés : voir problèmes ouverts. Écarté : apostrophes ASCII dans
  D-404 et le changelog (le code porte les textes typographiques, comme
  D-399). Après corrections : T1 complet code 0.
- PR #1804, tête e737039d : CI code 0. CodeRabbit en quota épuisé ;
  PR-Agent (run sur la tête) et Copilot :
  - Copilot, horloge (élevé) : corrigé — la borne passe de l'instant du
    rétablissement à celui de la révocation persisté, qui précède les
    envois concurrents de toute la durée d'un geste humain. Prémisse en
    partie inexacte : `enregistre_le` est posé par Prisma côté client, pas
    par PostgreSQL ; l'écart entre conteneurs reste, et la nouvelle borne
    le neutralise. Mutation (borne au rétablissement) : banc de route rouge ;
  - Copilot, banc vacant (moyen) : corrigé — `updateMany` rend `{ count: 1 }`
    et la réponse est vérifiée `success: true` ;
  - PR-Agent, trace avant la garde de clôture : corrigé — garde remontée
    avant le rendu, banc neuf (409, aucune trace) ;
  - PR-Agent, message brut persisté : corrigé — motif fixe « Rendu du bilan
    impossible. » (texte interne, non arbitré, à signaler au responsable).
  - Après ces corrections : T1 complet code 0, puis T2 `--fast` code 0
    (Vitest : 15 533 passés ; E2E : 303 passés).

## Problèmes ouverts

- Arbitrages livrés ; Q2 revient avec l'audit 2. Relevés de `wn-reviewer`
  (GO avec réserves, aucun P0/P1), hors arbitrage, à router :
  - limites du rétablissement consignées D-404 §3 : e-mail de rétablissement
    en échec, puis nouvel essai sous la fenêtre pleine ; consultation qui
    rétablit, toujours sous la garde. Piste : borner par
    `sessions_invalides_avant` (autre décision) ;
  - le bouton « Rappeler » reste sur toutes les cartes en retard, alors que
    la plupart (non déverrouillées) rendront le refus `echeance_expiree` :
    masquer ou relibeller au Fil ? Question au responsable ;
  - fuseau (antérieur) : la relance juge le dépassement par minuit + 24 h,
    le portail par 23:59:59.999 local ; écart d'une heure le soir du passage
    à l'heure d'hiver si le serveur n'est pas en UTC. Correctif : lendemain
    par `setDate(+1)`.

## Prochaine action exacte

1. PR (`--body-file`), CI en fond (`wn-attendre-ci.mjs <N>`).
2. `@coderabbitai review` sur la tête (ou PR-Agent, D-393), tri des
   commentaires.
3. Étape 7 bis, `wn-sonde-release-db.mjs <N>` = 0, merge.
4. Page de l'audit en v8, mémoire `audit-emails-patient-2026-10-30`, puis
   `/clear`.

## Interdits encore actifs

- Aucune écriture en production.
- Aucun identifiant de dossier, nom ou e-mail dans le dépôt, sur la page ou
  dans les commandes.
- Pas de migration ; ne pas rejouer un refus de garde.
- Constat D-353 §5 (fenêtre du 1er au 7 novembre) hors de cette session.
