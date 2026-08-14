# LOT-07 — Jalons confirmables et momentum par besoin : livré après un NO-GO à trois bloquants

- **Branche** : `claude/lot-07-campagne-t0`, vivante, partie de `b6d648355db0`
  (`origin/main`, LOT-09 mergé).
- **Campagne** : chaîne T0 opérationnelle. Lot actif LOT-07, dépend du LOT-05.
  Reste ensuite le **LOT-06 « Biologie opérante »** (migration — PR séparée,
  confirmation distincte, release-db) : c'est la demande utilisateur suivante,
  déjà actée (« Les deux, LOT-07 d'abord »).
- **Décision** : `D-058`, quatre arbitrages, **amendée le 2026-08-14** après
  revue (cible de re-passation `needIds` et non `mesures[]` ; ancre unique des
  fenêtres ; pas de garde de version intra-cycle ; dettes ajoutées).
- **Production au merge** : jalons et momentum immédiats, mais AUCUN delta
  qualifié (`BANDES_DE_BRUIT` vide, `publiee: false`) et re-passation inerte
  (`proposedMainPriorityId` nul tant que la table des priorités n'est pas
  signée). `assessment_episodes` = 0 ligne (relu le 2026-08-14) : aucun stock
  hérité. Aucune migration, aucun seuil neuf.

## Ce que le lot livre

1. **Jalon dû** (`resoudreJalonDu`) : fenêtres `JOURS_JALON` ±
   `TOLERANCE_JOURS_JALON`, ancrées sur le `confirmedAt` du T0 confirmé ;
   hors fenêtre, ni message trompeur ni panneau — rien n'est confirmable, et
   le motif se dit. Le panneau de confirmation nomme son jalon.
2. **Ancre partagée cockpit/serveur** : `proposeRuntimeEpisode` reçoit l'ancre
   du cycle courant (`ancreCycleCourant`, cockpit route) pour tout jalon
   post-T0 ; un banc de contrat inter-couches fixe l'égalité des bornes.
3. **Momentum par besoin** (`momentumParBesoin.ts`) : delta factuel de
   couverture entre jalons re-mesurés (nouveauté au grain du besoin), jamais
   qualifié sans bande publiée ; motif toujours rendu, jalons comparés et
   unités nommées au rendu. Opt-in (`avecMomentumParBesoin`) — seule la route
   trajectoire le paie.
4. **Re-passation ciblée** : `provenance.needIds` → `BESOIN_SOURCES` →
   `IDS_ASSIGNABLES` (le prédicat de la file d'envoi), via la file existante —
   proposition, jamais envoi.

## La revue a rendu NO-GO, et elle avait raison — à relire avant un lot de cette forme

- **B1** : ma garde de version intra-cycle « reprise d'A8-3 » ne reprenait
  rien — A8-3 est inter-cycles. Les deux lectures étant toujours recalculées
  par le moteur courant, la garde ne pouvait qu'éteindre des comparaisons
  correctes (tout stock v12/v13 face à v14/v15) avec un motif faux, rendu
  « non re-mesuré » sur des besoins re-mesurés. **Leçon** : une garde qui ne
  peut jamais se déclencher dans le sens annoncé n'est pas une prudence, c'est
  un interrupteur piloté par un fait sans rapport.
- **B2** : mon en-tête affirmait « deux définitions de la fenêtre finiraient
  par diverger » — en partageant les constantes mais PAS l'ancre, je livrais
  exactement cette divergence (client sur `confirmedAt`, serveur sur première
  réponse : fenêtres disjointes dès 16 jours d'écart). **Leçon** : partager
  les nombres ne partage pas la définition ; seul un banc de contrat
  inter-couches la tient.
- **B3** : le bloc re-passation n'était montable qu'en fixture
  (`selectedMainPriority` toujours nul en production) et son POST lisait
  `payload.ok` sur une route qui rend `{ success }` — tout succès affiché en
  échec. **Leçon** (troisième fois : LOT-08, LOT-09, LOT-07) : un banc qui
  fabrique un état que le service n'émet jamais masque le défaut qu'il croit
  fermer — mon test « hors fenêtre » jouait un GET `ready` que la route ne
  rend pas.
- M1–M7, Mo1–Mo4 refermés : panneau gaté hors fenêtre, jeton d'obsolescence
  des GET concurrents, unités et motifs rendus, fragment changelog + D-058 au
  state.json, amendement D-058, `rattacherReperesAuxCycles` réutilisé, opt-in
  cabinet, carte `ready` jamais écrasée.

## État des validations

T1 vert ; Vitest complet vert (404 fichiers, 4 787 tests) ; bancs cockpit,
trajectoire, momentum, jalonDu, repassation rejoués. E2E non jouables dans ce
conteneur (CDN Playwright bloqué, D-049 : segment CI/Mac).

Prochaine action : PR (bloc « Risques » de la revue repris), CI, merge
Copilot ; puis **ouverture du LOT-06** (D-xxx préalable + migration en PR
séparée). Ouvert : publier une première bande de bruit (acte séparé) ;
producteur de `selectedMainPriority` ; `DC-41`.
