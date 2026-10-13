# Handoff — 2026-10-13 — G3 de BioFlow : la mise en service (D-282, lot 4)

## Branche et état Git

`feat/bioflow-g3-lot4-drapeau`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`f3ddbd3d`,
merge du lot 3). Code seul, aucune migration. PR ouverte avec ce handoff.

## Objectif

Lot 4 du G3 (`D-282` §6.4) : déclarer le processus de fond au `Procfile`,
après les arbitrages de P2-2 et P2-6 ; préparer les gestes du responsable.

## Décisions prises

- `D-282` §7, arbitrages du responsable sur scénarios : **P2-2** = alerte
  e-mail sur le silence du processus (écartés : message d'écran après 10 min,
  les deux, rien) ; **P2-6** = fenêtre de ~2 s acceptée (écartés : griser les
  décisions, afficher le refus).
- Signal de vie émis après chaque balayage RÉUSSI des fantômes (boucle vivante
  ET base joignable), pas sur un minuteur indépendant, qui pourrait battre
  pendant que la boucle est bloquée.

## Fichiers modifiés

- `web/Procfile` (`worker: npm run bio:worker-extraction`).
- Neufs : `web/src/lib/observability/signalDeVie.ts` (+ test).
- `web/scripts/bioExtractionWorker.ts`, `web/src/lib/scalingo-release.guard.test.ts`.
- `docs/DECISIONS.md` (§7 de `D-282`), `docs/FEATURE_FLAGS.md`, changelog,
  SESSION_LOG, ce handoff.

## Validations exécutées

- `signalDeVie.test.ts` (3 cas : sans adresse, appel borné, erreur et
  injoignable sans lever ni journaliser l'adresse) et la garde du `Procfile`
  étendue : verts.
- T1 complet vert (`npm run check`), anti-secrets OK.
- T2 non joué : ni écran ni route touchés ; le `Procfile` ne s'éprouve qu'au
  déploiement (constat de la prochaine action).

## Problèmes ouverts

- Repris du lot 3, inchangés : dossier clos pendant l'attente ; TEMPS 3
  préexistant face à l'effacement ; horloge client de `ouvrirExtractionDans`
  (lot 5).

## Prochaine action exacte

Après merge et déploiement constaté, gestes du responsable, dans l'ordre :

1. Créer une surveillance par battement avec alerte e-mail : période 60 s,
   tolérance 6 min.
2. Poser son adresse dans `WN_BIO_WORKER_SIGNAL_URL` (Scalingo).
3. `scale worker:1`. Constater dans le journal du conteneur
   `[bio-ingest file] démarré` et la surveillance au vert.
4. PUIS poser `WN_BIO_EXTRACTION_ASYNC=true`, et constater une lecture sur un
   dossier de test lu par identifiant (travail `termine`, import `extrait`).

Puis lot 5 : retrait d'`after()`, clôture, G3 levé dans la feuille de route.

## Interdits encore actifs

- `scale worker`, pose de l'adresse et du drapeau : gestes du responsable.
- Ne pas toucher à la lecture (LOT-08), aux refus de relance (LOT-09) ;
  `after()` reste jusqu'au lot 5.
