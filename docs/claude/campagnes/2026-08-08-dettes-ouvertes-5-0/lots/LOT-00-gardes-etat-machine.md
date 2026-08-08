---
id: "LOT-00"
titre: "Dette 6 — deux gardes contre la récidive d'auto-déclaration"
statut: "en cours (2026-08-08) — les trois gardes sont posés et mutation-testés ; reste la PR"
dépend_de: "aucun"
---

# LOT-00 — Dette 6 : deux gardes contre la récidive d'auto-déclaration

## But

Poser **deux gardes**, choisis parce qu'ils auraient attrapé les **deux défauts
de la PR de clôture 5.0 elle-même** :

1. **Confronter la vue dérivée à sa source.** `ACTIVE_CAMPAIGN.md` est généré
   depuis `.wn/state.json` ; à la clôture il a été régénéré **avant** l'édition
   de sa source, et a publié « Lot actif : LOT-06 » quand la source disait
   LOT-07. Rien ne l'a vu — ni T3, ni deux passes de revue adversariale, ni le
   CI. Trouvé à l'œil, dans le paragraphe qui dénonçait cette dette.
2. **Refuser un `last_checked_at` postérieur à `updated_at`.** Aujourd'hui
   `comparerEtat` (`scripts/wn-etat-reel.mjs:250-277`) ne sait dire qu'une chose :
   la validation a plus de sept jours. Elle ne sait pas dire qu'une validation
   se prétend **plus récente que la dernière écriture d'état** — c'est-à-dire
   qu'elle n'a pas été rejouée depuis, ou qu'elle a été tamponnée à la main.
   État au cadrage : `last_checked_at` 06:29Z, `updated_at` 06:36Z — cohérent,
   donc le garde se pose **avant** l'incident, pas après.

Et, avec eux, la comparaison qui manque : **le lot courant**. `campagneActive` et
`lotActif` sont *rapportés* (L297-298), jamais confrontés à `CAMPAGNE.md`.

## Ce que la dette est vraiment

`scripts/wn-etat-reel.mjs` **observe six dimensions** (drapeaux, migrations,
certification, PR ouvertes, branches et worktrees, parcours patient) et n'en
**confronte qu'une**. Ce n'est pas le retrait de `git.branch`/`git.dirty` de la
PR #612 qui fait la dette — il était **délibéré et juste**, motif écrit dans le
script L253-260 : ce qui se recalcule en une commande ne se stocke pas, donc ne
dérive pas, donc n'a rien à comparer. La dette est ce que ce retrait **laisse** :
un outil dont le « zéro écart » couvre une dimension sur six, et zéro sur le lot
courant.

## Hors périmètre

- Rétablir les comparaisons `git.branch` / `git.dirty` — retirées à raison.
- Confronter les cinq autres dimensions observées. Elles n'ont pas produit de
  défaut mesuré ; les inclure ferait de ce lot un chantier, pas un garde.
- Toute modification de `wn-cycle.mjs --appliquer`.

## Preuve attendue

- Chacun des deux gardes est **mutation-testé** : désynchroniser la vue de sa
  source fait rougir ; reculer `updated_at` sous `last_checked_at` fait rougir.
  Un garde vert sur un dépôt sain ne prouve rien.
- Le garde de vue/source assère l'**écart**, pas la présence d'un champ : une
  assertion de présence est satisfaite par l'inversion exacte du défaut.
- T1 après édition, T2 avant commit.

## Question tranchée à l'ouverture — échouer, pas réparer

**Le garde échoue.** Une régénération automatique supprimerait la trace de la
dérive au moment même où elle survient : or c'est le **taux de récidive** qui
motive ce lot, et on ne compte pas ce qu'on efface. La réparation existe déjà et
reste un geste explicite — `node scripts/wn-cycle.mjs --appliquer`, cité dans le
message d'échec du banc.

Corollaire de forme : le verdict qui bloque ne vit **pas** dans le CLI
`wn-etat-reel.mjs`, qui sort 0 même avec des écarts et dont l'entête déclare
qu'il n'est qu'un observateur. Il vit dans un banc joué par T1 **et** par le CI.
Un rapport que personne ne lit n'aurait rien attrapé — c'est précisément ce qui
s'est passé le 2026-08-08.

## Ce qui a été livré

- `scripts/lib/vue-campagnes-actives.mjs` — le rendu de `ACTIVE_CAMPAIGN.md`,
  extrait de `scripts/wn-campaign.mjs` en **fonction pure**. Extraction
  nécessaire, pas cosmétique : `wn-campaign.mjs` exécute sa commande CLI au
  simple `import`, donc aucun banc ne pouvait régénérer la vue attendue.
  `writeActiveCampaignView()` l'appelle désormais et ne fait plus qu'écrire.
- `scripts/wn-etat-reel.mjs` — `comparerEtat` passe de **une** comparaison à
  **trois** (vue dérivée / cohérence des deux dates / lot courant), plus
  `collecterCampagnes`, `lireVueSurDisque` et `ordinalDeLot`. Le résumé stderr
  annonce désormais « 6 dimensions observées, **3 confrontées** » : le
  raccourci « 6 observées, 0 écart » était la moitié de la dette.
- `scripts/wn-coherence-etat.test.mjs` — 14 cas, branché dans
  `bancs-outillage-check` (donc T1 et CI). Onze sur fixtures, **trois sur le
  dépôt réel** : ce sont ces trois-là qui rougissent en CI.

## Preuve — les trois gardes ont été mutation-testés

Chaque mutation a été appliquée au dépôt réel, le banc rejoué, puis le fichier
restauré :

| Mutation | Banc |
|---|---|
| `ACTIVE_CAMPAIGN.md` : `Statut global : idle` → `active` | **rouge** (garde 1) |
| `.wn/state.json` : `last_checked_at` porté à `23:59` (après `updated_at`) | **rouge** (garde 2) |
| `.wn/state.json` : `active_lot: LOT-03` sous une `CAMPAGNE.md` qui dit `LOT-00` | **rouge** (gardes 3 et 1) |

Et sa contrepartie, sans laquelle les trois ne prouveraient rien : sur l'état
sain, `comparerEtat` rend **zéro** écart (premier cas du banc).

Le banc ne dépend d'aucune horloge : il n'assère **pas** le verdict « périmé »
(`last_checked_at` de plus de sept jours), qui rougirait un lundi matin sans
qu'aucun commit n'ait rien cassé. Ce verdict-là reste au rapport.

## Ce que ce lot ne ferme pas

`scripts/wn-campaign.mjs` dérive toutes ses racines du **cwd**
(`const cwd = process.cwd()` L12-14), alors que les sessions de ce dépôt
travaillent depuis `web/`. C'est la même classe que la régression N1 déjà
corrigée dans `wn-etat-reel.mjs` — racine dérivée de l'emplacement du script —
et elle n'est pas traitée ici : hors périmètre, à porter au cadrage suivant.
