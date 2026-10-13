### Plan unique WellNeuro 6.0, PR 3 : le pilotage renvoie au plan (D-285 §7, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucune règle clinique.
- `.wn/state.json` : la tête de `next_action` renvoie au plan unique
  (`docs/claude/PLAN_WELLNEURO.md`) au lieu de dupliquer l'ordre des lots ;
  l'ancienne tête est démotée en trace datée ; les vingt-trois entrées de
  dettes qui suivaient les traces sont retirées, versées au plan §8 ;
  `blocking_issues` est vide (G-TRUST-04 clos par `D-121`) ;
  `last_completed_lot` et la validation (T1 complet du jour) sont mis à jour ;
  `recent_decision_ids` recalculé et `ACTIVE_CAMPAIGN.md` régénéré par
  `node scripts/wn-cycle.mjs --appliquer`.
- Trois campagnes maintenues réalignées sur le plan §9 : BIO-PARCOURS (en
  pause ; lots de sécurité issus de BP-26 portés dans sa table comme lignes
  datées ; ordre des `release-db` renvoyé au plan §5) ; agenda du sommeil
  (LOT-11 terminé, LOT-12 abandonné dans la campagne et transféré au plan sous
  les lettres cc et cf, LOT-02 reste courant) ; BIO-INGEST (LOT-05 transféré
  au plan, gelé sous la porte 29 ; `lot_courant` « aucun »).
- Fiche LOT-25 de BIO-PARCOURS corrigée (fiche F14 du plan) : « quatre
  termes » selon `D-273`, cases cochées, doublon de rubrique retiré.
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md` : bandeau `D-285`, pistes A
  et B à jour (G3 levé par `D-282`, lots de sécurité livrés), piste C réécrite
  « lots de BIO-PARCOURS, étapes av à az », porte 30 nommée, gates en
  historique ; règles de parallélisme gardées.
- `docs/claude/PROJET_CONTEXTE.md` (« Ce qui reste ouvert ») et
  `docs/claude/campagnes/README.md` (séquence) renvoient au plan.
- `docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md` régénéré par script.
