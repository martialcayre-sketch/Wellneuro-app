---
id: "LOT-00"
titre: "Cadrage"
statut: "en cours"
dépend_de: "—"
---

# LOT-00 — Cadrage

## But

Ouvrir la campagne sur un état réel frais, poser les six arbitrages rendus en
session, et rendre l'état machine cohérent avec ce que la session suivante lira.

## Périmètre

- `docs/claude/campagnes/2026-09-16-rayon-patients/` — `CAMPAGNE.md`,
  `BRIEF.md`, `CAMPAIGN_META.json`, `lots/`.
- `.wn/state.json` — `status`, `active_campaign`, `active_lot`, et **une tête de
  `next_action` neuve** en position 0, la précédente préfixée d'une trace. Les
  entrées suivantes ne se touchent pas : elles sont l'archive.
- `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` — vue générée, jamais éditée à la
  main.
- `docs/claude/campagnes/FILE_ATTENTE.md` — l'entrée de la campagne et son rang,
  posée **à l'ouverture** et non à la clôture : c'est l'écart que la
  réconciliation du 2026-08-27 a reproché deux fois.
- Un fragment `changelog.d/`.

## Ce qui rougirait sans ce lot

- `scripts/wn-coherence-etat.test.mjs` — « la tête de `next_action` nomme la
  campagne active, pas une campagne close ». `wn-campaign activate` met à jour
  `active_campaign` et `active_lot`, **jamais** `next_action[0]`.
- Le voisin du même banc — `active_lot` doit égaler le `lot_courant` du
  `CAMPAGNE.md` de la campagne active.
- `scripts/wn-campaign-audit.mjs`, **bloquant et absent de T1** : il n'entre
  qu'à T2. Son vocabulaire de statuts clos est étroit.

## Done

- `node --test scripts/wn-coherence-etat.test.mjs` vert.
- L'audit de campagnes rejoué avec **la commande exacte du CI**.
- `npm run check` vert.
