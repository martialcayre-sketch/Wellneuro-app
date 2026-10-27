### bb, préparation de l'activation : le miroir praticien lit les trois plans comme le portail, et « Jour difficile ? » ne double plus le point (D-386, H49)

- La route `api/praticien/protocoles/diffusion` sert `troisPlans` sur la
  version de l'aperçu, par la règle du portail : `WN_PORTAIL_TROIS_PLANS` à
  `true`, colonne `protocol_drafts.created_at` strictement postérieure à
  `2026-10-27T00:00:00.000Z`, actions fermes hors pause, orientation vers le
  médecin exclue. L'aperçu « Vu par votre patient » de la sous-vue
  « Diffusion » les lit sous « Selon votre journée : » et les intitulés de
  D-384 §2. Drapeau éteint : la clé n'existe pas, l'aperçu est celui d'avant.
- « Jour difficile ? » retire le point final du plan minimal avant « . »,
  comme il le faisait déjà du plan de secours : un plan minimal ponctué ne
  s'affiche plus « .. ». Seul changement visible drapeau éteint.
- Arbitrages du responsable du 2026-10-27, écrits dans D-386 : le panneau de
  consultation (fixture seule) garde le plan minimal ; le détail déplié
  d'office est le détail de D-384 §3. Sans migration ; le drapeau reste
  éteint.
