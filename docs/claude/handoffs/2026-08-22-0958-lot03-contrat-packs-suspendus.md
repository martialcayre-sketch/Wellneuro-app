# 2026-08-22 09:58 — LOT-03 biologie : le garde-fou cassé une fois devient un contrat

## Ce qui a changé

- **`web/prisma/checks/packs_instruments_suspendus_v1.sql`** (neuf) — frère de
  `packs_registre_coherence_v1.sql`, jamais son doublon : deux représentations
  d'accord peuvent être toutes deux fausses (incident `Q_ALI_09`,
  2026-08-06). Deux assertions — legacy `packs.qids` et miroir relationnel —
  chacune complète sur sa représentation. La suspension se lit **en base**
  (`questionnaires.actif = false`), ce qui ferme la réserve de `D-033` : le
  catalogue se lisait dans la mauvaise position (drapeau `WN_AGENDA_ALI`).
- **`ci.yml`** — ligne d'appel après le seed, au voisinage du frère ; T3 la
  ramasse par extraction automatique (24ᵉ contrat).
- **Éprouvé par mutation** sur base éphémère locale : rouge assertion 1 (pack
  inséré référençant un suspendu — la forme de l'incident), rouge assertion 2
  (miroir seul), vert sain, vert non-vacu. Motifs nommant pack et qid.
- **Constat production (MCP, 2026-08-21)** : dix définitions suspendues en
  base, aucun pack actif n'en référence — l'invariant tient.

## À savoir pour la suite

- **Dette nommée** : l'en-tête du frère (`packs_registre_coherence_v1.sql`,
  § « HORS PÉRIMÈTRE ») dit encore « la réserve reste ouverte » — devenu faux
  avec ce lot, mais le lot interdisait de modifier ce fichier. Une ligne à
  corriger à sa prochaine édition légitime.
- **Câblage release-db non fait, et pas anodin** : avant de jouer ce contrat
  contre la production, trancher la position de `Q_ALI_09` (note de conception
  `D-033` : drapeau documenté allumé en prod, ligne backfillée `false` — les
  neuf autres suspendus, littéraux, ne posent pas la question).
- **Restes de la session HDS parallèle remisés** : trois fichiers locaux
  (runbook LOT-02 HDS, checklist, rapport recette) bloquaient le merge
  d'`origin/main` ; vérifiés strictement antérieurs à ce que #730 a mergé
  (aucune information unique), remisés en stash (« restes session HDS
  parallele ») + copie au scratchpad. La session HDS peut purger le stash.
- Promotions examinées : la promotion, c'est le lot lui-même (une réserve
  écrite devient un contrat exécutable) ; rien d'autre à promouvoir, aucune
  décision nouvelle pour `docs/DECISIONS.md`.

## Ouvert

- **LOT-02 (E2E proposition + courrier)** — dernier lot de la campagne,
  CI-gated (`D-049`). La campagne Biologie consolidée se clôt avec lui.
- Arbitrages pendants inchangés (clean-label, JA5-05, rayon-biologie-cb,
  worktree arbitrage-boucle-clinique).
