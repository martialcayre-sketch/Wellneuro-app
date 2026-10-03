# Handoff — 2026-10-03 — Levée du blocage par signal d'alerte : l'écrivain des adressages (LOT-03)

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, PR **#1290** (brouillon jusqu'à la clôture),
  base `main` (`75dbc56`). Têtes `4057f76` (écrivain) et `f913e35` (revue)
  + ce handoff. Arbre propre.
- CI sur `f913e35` : `e2e` vert ; `controles` rouge au premier passage sur
  `replisAssietteV1.guard.test.ts` (délai de 5000 ms dépassé — garde sans
  rapport avec le diff, 3,98 s en local), relancé une fois.
- Déjà fusionnés dans la campagne : #1282 (cadrage), #1285 (`D-257`), #1288
  (migration, appliquée en production par le run `release-db` 131).

## Objectif

Écrire les couvertures : la lettre d'adressage consignée écrit, dans la même
transaction, la ligne `adressage` qui nomme les signaux couverts ; une
révocation motivée la retire (A12). **Aucune lecture** : rien ne lève encore
l'abstention clinique (LOT-04).

## Décisions prises

- Route courrier : consultation porteuse, constats, lettre et couverture dans
  un seul `prisma.$transaction` ; aucun constat d'anamnèse ⇒ 409
  `aucun_signal_adressage`, aucune lettre écrite.
- Route de révocation `POST /api/praticien/adressage/revocation`, **sans
  drapeau** (elle ne fait que rebloquer) ; refusée sur dossier clos (`D-219`
  §2) ; `findingIds` omis (NULL exigé par le CHECK).
- Texte de l'écran amendé : la lettre trace l'adressage, elle ne lève pas
  encore l'abstention.
- Garde « qui écrit » : deux écrivains nommés, deux suppresseurs (effacement,
  nettoyage E2E), portée étendue aux scripts, seeds, E2E, SQL et shell.

## Fichiers modifiés (PR #1290)

- `web/src/app/api/praticien/adressage/courrier/route.ts` + `.test.ts`
- `web/src/app/api/praticien/adressage/revocation/route.ts` + `.test.ts` (nouveaux)
- `web/src/lib/correspondance/adressagesSignalAlerte.guard.test.ts`
- `web/e2e/helpers/db.ts` (nettoyage des couvertures avant les consultations)
- `web/src/components/patient-cockpit/AdressagePanel.tsx` + `.test.tsx`
- `docs/DOSSIER_RGPD.md` ; cadrage §7 ; `changelog.d/2026-10-03-adressages-signal-alerte-ecrivain.md`

## Validations exécutées

- `npm run check` (T1 complet) vert ; `next build` local vert (après retrait
  de l'export `MOTIF_REVOCATION_MAX`, refusé par Next).
- Vitest complet local : 660 fichiers, 11 385 tests verts.
- Mutant « écriture hors transaction » : 10 tests échouent.
- Revue `wn-reviewer` : P0, P1-1, P1-2 corrigés ; P2 corrigés ou notés au
  cadrage §7.
- T3 E2E non jouable en conteneur cloud ; job `e2e` du CI vert.

## Problèmes ouverts

- P2-7 de la revue : délais par défaut de la transaction interactive
  (5 s) non réglés — à mesurer si la génération de la lettre s'allonge.
- Mesure de production (dossiers bloqués, lettres déjà consignées) toujours
  à faire par conteneur détaché, en agrégats, avant le drapeau du LOT-04.

## Prochaine action exacte

1. CI verte sur la tête, puis merge de #1290 sur accord du responsable.
2. LOT-04 : lecture des couvertures actives dans la chaîne C1 derrière un
   drapeau éteint, affichage des couvertures et bouton de révocation, après
   la mesure de production (cadrage §7).

## Interdits encore actifs

- Aucun troisième écrivain de `adressages_signal_alerte` ; aucune
  réécriture, aucune suppression hors effacement nommé et nettoyage E2E.
- Aucune lecture des couvertures par la chaîne clinique avant le LOT-04 et
  son drapeau.
- Pas de modification de la cotation signée des douze signaux (`D-099`).
