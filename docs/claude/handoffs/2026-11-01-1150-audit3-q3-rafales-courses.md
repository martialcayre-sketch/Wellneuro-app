# Handoff — 2026-11-01 — Audit 3, lot Q3 : rafales et courses (D-398, D-399)

## Branche et état du dépôt

- Branche `fix/audit3-q3-rafales-courses`, partie de `origin/main` 969662cf
  (contient #1796, lot Q4) ; worktree `j3-12e-ingestion`, session
  concurrente, cycle en `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.

## Objectif

Dernier lot de l'audit 3 (e-mails patient contre traces), écart E3, en
quatre volets :
1. un seul e-mail quand plusieurs questionnaires d'un dossier sont rappelés ;
2. garde atomique d'une heure sur les e-mails d'accès et d'objectif ;
3. réservation avant le premier envoi d'un bilan et avant les relances
   manuelles ;
4. la cadence des rappels ne compte que les envois partis.

## Décisions prises

- D-399 (réservé par `wn-reserver-decision.mjs`, rédigé dans
  `docs/DECISIONS.md`), mise en œuvre de D-398 §1 Q3 et §3 :
  - verrou `pg_advisory_xact_lock` par dossier (ou par bilan), dans une
    transaction courte, puis une ligne réservée `Non_envoye` sous la marque
    « réservé : envoi en cours », soldée après l'envoi ;
  - ce qui compte comme envoi : `Envoye` ou une réservation en cours ; ni
    `Erreur`, ni messagerie absente, ni refus de garde. Limite écrite au §2 :
    une « Erreur » de délai SMTP n'est pas une preuve de non-livraison ;
  - rappel groupé par balayage côté serveur (choix du responsable, 2026-11-01).
- Textes validés mot pour mot par le responsable le 2026-11-01 :
  - gabarit `relance_questionnaires@1` : sujet « Des questionnaires vous
    attendent toujours — Wellneuro », corps sans échéance, nombre ni titre ;
  - objet de la trace : « Rappel — des questionnaires attendent toujours » ;
  - Fil : « Rappel envoyé. Il couvre les {n} questionnaires en retard de ce
    dossier. » ;
  - motifs : « garde : un e-mail d’accès par heure », « garde : un e-mail
    d’objectif par heure » ;
  - quatre messages d'écran de l'accès refusé (« … un e-mail d’accès est
    déjà parti vers ce patient il y a moins d’une heure. ») ;
  - marque interne « réservé : envoi en cours ».

## Fichiers modifiés

- Neufs : `web/src/lib/correspondance/reservation.ts`,
  `web/src/lib/correspondance/reservation.pg.test.ts`.
- Routes :
  - `praticien/assignations/relance/route.ts` (verrou, balayage, cadence) ;
  - `praticien/booklet/route.ts` (réservation du premier envoi, CRLF
    préservé) ;
  - `praticien/objectifs/relance/route.ts` (cadence, refus de garde → 429) ;
  - `praticien/token/route.ts`, `praticien/consultations/route.ts`
    (`deja_envoye`) ;
  - `praticien/nouveaux-patients/route.ts` (refus et réservations ignorés).
- Bibliothèques : `lib/consultation/email.ts` (garde),
  `lib/correspondance/registreGabarits.ts` (gabarit neuf),
  `lib/praticien/relanceAssignation.ts` (`envoisDeLAssignation`).
- UI : `components/fil/FilDuJour.tsx`,
  `components/dossier/RayonPatientsPanel.tsx`,
  `components/dossier/usePatientGestesDossier.ts`.
- Tests : bancs des routes ci-dessus, `email.test.ts`,
  `registreGabarits.test.ts`, `FilDuJour.test.tsx`,
  `RayonPatientsPanel.test.tsx`.
- CI : `.github/workflows/ci.yml`, étape « Reservation before send
  real-database bench ».
- Docs : `docs/DECISIONS.md` (D-399), `docs/claude/MATRICE_CONSOMMATION.md`
  (régénérée : 45 surfaces indirectes du corpus, le module neuf importe
  `lib/anthropic`), `changelog.d/2026-11-01-audit3-q3-rafales-courses.md`,
  ce handoff.

## Validations exécutées

- Banc sur base réelle (`scripts/wn-dev-db.sh`, DB_POOL_MAX=4) : 7/7 verts.
  Croisement forcé par un observateur qui tient le verrou.
- Mutations :
  - verrou retiré : les 4 bancs de concurrence rougissent (« les 2 requêtes
    n'attendent pas le verrou »), les 3 autres restent verts ;
  - filtre des envois partis remplacé : les 3 bancs de cadence rougissent ;
  - sources restaurées, 7/7 verts.
- T1 complet vert (après régénération de la matrice).
- T2 (`--fast`) : premier passage rouge sur un seul banc,
  `bilans-confirmation-non-envoye.migration.test.ts`, qui lit le ternaire
  littéral des objets du bilan ; littéral rétabli.
- Après les corrections de revue :
  - T1 complet : code 0 ;
  - T2 `--fast` : code 0. Vitest : 15 481 passés, 37 sautés. E2E : 303
    passés, 7 sautés.
- Revue `wn-reviewer` (diff non committé, sans checkout) : **GO avec
  réserves**.
  - Corrigés :
    - la phrase groupée du Fil ne s'affiche que si le rappel est parti ;
    - la carte cliquée est jugée sur sa lecture sous le verrou.
  - Documentés dans D-399 :
    - « Erreur » non comptée, avec la limite du délai SMTP (§2). Choix du
      responsable au cadrage (volet 4) ;
    - réservation de bilan restée marquée, sans fenêtre (§5).
  - Acceptés, précédent D-317 : un refus de garde s'affiche « Non envoyé »
    au panneau, sans motif.
- PR #1798, revue Copilot (tête 15f70d24), une remarque en ligne, corrigée :
  - sous le verrou du bilan, deux lectures séparées (audit `Envoye`, puis
    réservation marquée) pouvaient manquer le solde d'un envoi concurrent ;
  - le journal se lit désormais en une seule requête (`Envoye` ou marquée) ;
  - banc pg neuf, rouge sur l'ancien code, vert sur le correctif ;
  - T1 complet code 0, puis T2 `--fast` code 0 (Vitest : 15 481 passés ;
    E2E : 303 passés) ;
  - `origin/main` 67ab0108 (#1799, docs seuls) fusionné ensuite dans la
    branche, par délégation du 2026-10-16.
- CodeRabbit : quota atteint à la première tête.

## Problèmes ouverts

- Rappel vers des questionnaires échus (revue, Q1). Le rappel n'est permis
  qu'après l'échéance, quand le portail affiche « Expiré » et que la
  soumission est refusée (410), sauf déverrouillage. Le défaut est antérieur
  au lot, et le balayage l'élargit aux échus anciens. À router au plan.
- « Rappel envoyé. » s'affiche même quand le rappel a échoué ; antérieur au
  lot.
- Rétablir un accès dans l'heure qui suit un envoi : la garde refuse, alors
  que le lien magique de l'e-mail précédent est mort (révocation, D-128). Le
  patient garde la page de connexion. Question au responsable.
- Changement d'adresse e-mail dans l'heure : la garde porte sur le dossier,
  pas sur l'adresse.
- Le lien magique émis pour un accès refusé reste en base, non envoyé, et
  expire en 24 h (D-399 §4).

## Prochaine action exacte

1. PR (`--body-file`).
2. CI en fond : `wn-attendre-ci.mjs <N>`.
3. `@coderabbitai review` sur la tête (ou PR-Agent, D-393), puis tri des
   commentaires.
4. Étape 7 bis, puis `wn-sonde-release-db.mjs <N>` = 0, puis merge.
5. Page de l'audit en v7 (E3 corrigé, audit 3 clos hors Q2), mémoire
   `audit-emails-patient-2026-10-30` à jour, puis `/clear`.

## Interdits encore actifs

- Aucune écriture en production.
- Aucun identifiant de dossier, nom ou e-mail dans le dépôt, sur la page ou
  dans les commandes.
- Pas de migration ; ne pas rejouer un refus de garde.
- Constat D-353 §5 (fenêtre du 1er au 7 novembre) hors de cette session.
