### D/55 : deux actions en double dans une version de protocole se refusent (D-394)

- La construction d'une version (`POST /api/praticien/protocoles/versions`)
  refuse désormais deux actions en double, sur deux critères : **même type et
  même intitulé** (sans tenir compte de la casse ni des espaces), ou **même
  fiche d'assiette** (`recommendedPlateRef.plateCode`). Le refus est un 400
  `draft_invalid`, que le cockpit affiche sous le bouton d'enregistrement,
  comme les autres refus de la route ; il passe avant la garde de registre
  anxiogène. Arbitrages du responsable du 2026-10-29 : refuser plutôt que
  signaler, et les deux critères ensemble.
- Textes d'écran validés mot pour mot le 2026-10-29 : « Deux actions portent
  le même intitulé, « … », et le même type. Retirez-en une, ou changez son
  intitulé, puis enregistrez. » et « Les actions « … » et « … » indiquent la
  même assiette. Retirez-en une, ou changez son assiette, puis enregistrez. »
- Nouveau module `web/src/lib/protocol/actionsEnDouble.ts` et son banc ; bancs
  de la route : les deux refus, et deux non-régressions (même intitulé sous
  deux types, deux intitulés d'un même type ; une seule action avec assiette).
- Aucune migration, aucun seuil, rien sous `lib/clinical/` ; les versions déjà
  enregistrées ne sont pas relues.
