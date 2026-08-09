# Handoff — 2026-08-09 19:15 — Clôture de `2026-08-08-dettes-ouvertes-5-0`

**Campagne** : `2026-08-08-dettes-ouvertes-5-0` · **Statut** : terminé (2026-08-09)
**Activité primaire promue** : **aucune** — le prochain chantier s'arbitre.

## Ce que la campagne ferme

Les trois dettes que `DECLARATION_5_0.md` laissait ouvertes, et la quatrième
qu'elle n'avait pas vue :

- **LOT-00** (#623) — dette 6 : trois gardes d'état machine contre la récidive
  d'auto-déclaration (vue/source, dates de validation, lot courant).
- **LOT-01** (#625) — dette 5 : le parcours patient legacy **retiré** (arbitrage
  du 2026-08-08 : retrait immédiat, pas de date-cible) ; seule la redirection
  307 subsiste.
- **LOT-02** (#626) — « Certifié » → « Scoring vérifié » sur les neuf libellés
  de la famille et les trois proses cabinet (`D-036`), neuf mutations rouges.
- **LOT-03** (#627) — dette 4 : re-mesurée à l'ouverture (0 divergence sur 8
  packs), son **générateur** fermé (`syncPackToRegistry` jetait les qids sans
  définition), garde d'écriture (409 nommant les qids) + préflight de
  production dans `release-db.yml`. Relecture de production après merge : 0/8.
- **LOT-04** (#630) — le libellé relié au barreau `scoring_verifie`
  (`verifier_registre_instruments.js` compare désormais catalogue et registre),
  le seed porte `certification` sur 13 blocs sur 15, une assertion E2E sur la
  colonne « Qualité ». Doc de livraison : #631.

## Le Done a été VÉRIFIÉ à la clôture, pas hérité des lots

Les trois gardes du LOT-00 ont été re-prouvés **par mutation le jour même** sur
le dépôt réel : « Lot actif » muté dans la vue → 1 rouge ; `last_checked_at`
poussé après `updated_at` → 1 rouge ; `active_lot` divergent de `lot_courant`
→ 2 rouges (le garde du lot et la vue par ricochet). Témoin 24/24 vert après
chaque restauration (`node --test scripts/wn-coherence-etat.test.mjs`).

Les paliers de la campagne : T3 complet vert le 2026-08-08 au LOT-03 ; au
LOT-04, E2E rejoués (133 verts, 1 rouge démontré étranger au lot — fragilité
locale macOS au 67e test, bissection dans le fichier de lot) et `verify` vert
sur #630. La clôture elle-même est un diff documentaire : T1 + audit de
campagne + anti-secrets.

## Le jalon du 2026-10-21, rappelé comme promis

Sans reconduction écrite, G-TRUST-04 **et** le dossier RGPD (préambule et
tableau §14 de `docs/DOSSIER_RGPD.md`, le tableau faisant foi) reprennent la
règle du dépôt le même jour ; l'information des personnes, « au plus tôt », est
**déjà échue**. `D-037` (2026-08-09) avance la revue de la dette HDS à la
réponse de Scalingo — l'échéance de la dérogation ne bouge pas.

## Lignes closes sorties de `next_action` (convention #613)

Les leçons transverses du LOT-03 (contrat de données vacu en CI sans étape
post-seed ; `BEGIN READ ONLY` mord à travers `prisma db execute` ;
`array_agg(DISTINCT)` rend un tableau trié — mutant équivalent) et le détail de
l'arbitrage du garde vivent dans le fichier du LOT-03 et son handoff
(`2026-08-08-2115-lot03-garde-derive-packs.md`). Le générateur de la dérive et
l'inventaire du badge muet vivent dans les fichiers des LOT-03/LOT-04. Restent
en état : l'invariant du contrat et sa borne (qui ne repose plus sur le seed),
et l'avertissement CRLF.

## Ce qui reste ouvert, sans lot d'accueil

- **La décision produit du badge muet** (suite de `D-036`) : au prochain numéro
  libre, sur la liste que le garde imprime à chaque `npm run check` — 22
  instruments muets (18 sans certification, 4 ambigus).
- **La redirection `/patient/*` n'a aucune échéance** ; une mesure d'accès
  trancherait. `api/patient/assignations` n'a plus d'appelant.
- **`seuils_points`** ne garde que le recueil entièrement vide — décision
  clinique.
- **Non-couverture nommée au LOT-04** : un instrument à l'état terminal dont le
  catalogue déclare encore `certifie` échappe aux deux sorties du garde ; zéro
  cas aujourd'hui.
- Le vocabulaire écran/dossier a divergé **volontairement** (l'écran dit
  « Scoring vérifié », le registre garde `certifie`) ; aligner le dossier serait
  une campagne de registre, rien ne l'exige.

## Prochain geste

Arbitrage entre trois fils : la décision badge muet, le chantier HDS (contrat
SQL pgvector en CI, puis recette staging une fois secrets et flags posés par le
responsable — questions ouvertes : rollback sans critère, aucun GO/NO-GO,
`osc-secnum-fr1` inaccessible), et le jalon du 2026-10-21. L'agenda alimentaire
reste parallèle : débloqué techniquement, en attente de données que personne ne
saisit.
