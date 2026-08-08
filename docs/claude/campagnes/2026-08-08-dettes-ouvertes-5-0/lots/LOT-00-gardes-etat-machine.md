---
id: "LOT-00"
titre: "Dette 6 — trois gardes contre la récidive d'auto-déclaration"
statut: "livré (2026-08-08) — trois gardes posés, mutation-testés, joués par T1 et par le CI"
dépend_de: "aucun"
---

# LOT-00 — Dette 6 : trois gardes contre la récidive d'auto-déclaration

## But

Poser **trois gardes**. Les deux premiers sont choisis parce qu'ils auraient
attrapé les **deux défauts de la PR de clôture 5.0 elle-même** ; le troisième
ferme la comparaison que la déclaration nomme comme absente :

1. **Confronter la vue dérivée à sa source.** `ACTIVE_CAMPAIGN.md` est généré
   depuis `.wn/state.json` ; à la clôture il a été régénéré **avant** l'édition
   de sa source, et a publié « Lot actif : LOT-06 » quand la source disait
   LOT-07. Rien ne l'a vu — ni T3, ni deux passes de revue adversariale, ni le
   CI. Trouvé par la revue adversariale, dans le paragraphe qui dénonçait
   cette dette.
2. **Refuser un `last_checked_at` postérieur à `updated_at`.** Aujourd'hui
   `comparerEtat` (`scripts/wn-etat-reel.mjs:250-277`) ne sait dire qu'une chose :
   la validation a plus de sept jours. Elle ne sait pas dire qu'une validation
   se prétend **plus récente que la dernière écriture d'état** — c'est-à-dire
   qu'elle n'a pas été rejouée depuis, ou qu'elle a été tamponnée à la main.
   État au cadrage : `last_checked_at` 06:29Z, `updated_at` 06:36Z — cohérent,
   donc le garde se pose **avant** l'incident, pas après.

3. **Confronter le lot courant.** `campagneActive` et `lotActif` étaient
   *rapportés*, jamais confrontés à `CAMPAGNE.md` — `.wn/state.json` portait
   `active_lot: "LOT-06"` quand la campagne disait LOT-07, et l'outil ne l'a pas
   vu. Périmètre assumé : la campagne **primaire** seulement.

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

- Chacun des trois gardes est **mutation-testé** : désynchroniser la vue de sa
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
- `scripts/lib/campagnes-sur-disque.mjs` — la lecture des `CAMPAGNE.md`,
  extraite du même script. Le garde régénère la vue pour la comparer : il doit
  lire les campagnes **exactement** comme l'écrivain, sans quoi il rougit sur un
  fichier correctement généré et conseille une resynchronisation sans effet.
- `scripts/wn-coherence-etat.test.mjs` — 24 cas, branché dans
  `bancs-outillage-check` **et** dans `.github/workflows/ci.yml`. Vingt-et-un sur
  fixtures (dont deux sur le **branchement** réel, `construireRapport`, et quatre
  sur la parité des deux lecteurs), **trois sur le dépôt réel**.

## Ce que la revue adversariale a corrigé — deux tours, deux NO-GO

Deux tours, deux NO-GO, neuf constats traités avant la PR. Le **second** tour
importe autant que le premier : mon correctif du câblage (tests `CÂBLAGE`) avait
posé une fixture datée en dur du 2026-08-08 dans un test à égalité stricte, alors
que `construireRapport` lit l'horloge réelle. Sept jours plus tard, le verdict
« périmé » se serait ajouté et le job `verify` du dépôt entier serait devenu
rouge sans qu'aucun commit n'ait rien cassé — et d'autant plus sûrement que
l'autre correctif venait de rendre ce banc opposable en CI. Les fixtures sont
désormais datées **relativement à maintenant**, et les deux tests assèrent
l'égalité stricte sans filtre. C'est la classe même que ce lot garde, arrivée
dans le garde.

Le second tour a aussi rendu deux énoncés au réel — la ventilation des cas du
banc (18 + 3 pour un total de 23) et un « et seulement ça » de
`PROJET_CONTEXTE.md` démenti par `recent_decision_ids` — dans un lot dont la
thèse est justement qu'un énoncé dérivé doit correspondre à sa source. Plus
trois durcissements : la descente de la garde textuelle rendue **récursive** et
assortie d'une assertion de **présence** (deux `doesNotMatch` sur un texte qui
rétrécit deviennent plus faciles, jamais rouges) ; une consigne dans `ci.yml` de
ne pas exporter de jeton `gh` sur cette étape ; et un cas de banc qui tient
enfin la borne du front matter — l'une des quatre divergences qui motivaient
l'extraction du lecteur, que rien n'assérait.

Premier tour :

- **Le banc n'était pas dans le CI**, alors que quatre textes l'affirmaient.
  `.github/workflows/ci.yml` énumère ses bancs un par un ; ni
  `wn-coherence-etat.test.mjs` ni `wn-etat-reel.test.mjs` (antérieur) n'y
  figuraient, et `parite-check-ci.test.mjs` ne pouvait pas le voir — il vérifie
  CI → `check`, jamais l'inverse. Un garde qui ne tourne qu'en T1 dépend de la
  discipline de la session qui l'oublie ; le seul verdict opposable du dépôt est
  le CI. Étape ajoutée.
- **Quatre mutations survivaient.** Deux débranchaient silencieusement les
  gardes 1 et 3 dans `construireRapport` — le banc restait vert pendant que le
  CLI annonçait « 3 confrontées, 0 écart » en n'en confrontant plus qu'une, soit
  la dette 6 reproduite d'un cran ; une aveuglait le garde 3 sur le cas
  unilatéral (`aucun` face à `LOT-03`, valeur portée par sept campagnes sur
  trente-cinq) ; une offrait trente minutes de tolérance au garde 2. Quatre
  familles de cas ajoutées.
- **Deux lecteurs de campagnes** divergeaient sur quatre points, dont `id:` du
  front matter contre nom de dossier. Rien n'était rouge — par chance, pas par
  construction. Lecteur unique désormais.
- **La réparation nommée était fausse pour deux gardes sur trois** :
  `wn-cycle.mjs --appliquer` ne touche jamais `active_lot`, et **éteint** le
  garde 2 en poussant `updated_at` sans qu'aucune validation ait été rejouée —
  la réparation qui efface la trace, offerte comme remède. Le geste est
  désormais nommé garde par garde.
- **Les gardes de sûreté du rapporteur** (« aucune connexion base », « jamais
  d'écriture ») ne lisaient que son fichier, plus ses nouveaux imports.
  Étendues aux modules de `scripts/lib/`.
- **`PROJET_CONTEXTE.md`**, lu à chaque session, décrivait encore l'outil comme
  comparant ses six dimensions. Corrigé : six observées, trois confrontées.

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

## Ce que ce lot ne ferme pas, et qui est nommé plutôt que taché

- **Les campagnes parallèles ne sont pas confrontées.** `.wn/state.json` porte
  `active_lot: null` pour `2026-08-04-agenda-alimentaire` quand sa `CAMPAGNE.md`
  déclare `lot_courant: "LOT-08"` : même fait que celui du garde 3, traitement
  opposé selon la position. Trancher si cet état est légitime est une décision
  de cycle, pas de script — à porter au cadrage suivant.
- **Le garde 2 couvre l'inverse temporel du défaut observé.** Le vrai défaut
  était un tampon **périmé** de quinze jours ; ce verdict-là dépend de l'horloge
  et resterait hors du CI. Une piste existe pour le rendre bloquant sans
  horloge : comparer `last_checked_at` à la date du commit HEAD.
- **Le coût opérationnel du garde 3** : `active_lot` n'est écrit que par
  `wn-campaign activate --lot` pendant que `lot_courant` avance à la main.
  Quand les deux divergent sur `main`, `npm run check` rougit pour **toutes**
  les sessions, y compris celles qui ne touchent ni l'état ni les campagnes.
  Assumé pour l'instant ; à revoir si cela gêne.

Et, découvert en chemin : `scripts/wn-campaign.mjs` dérive toutes ses racines du **cwd**
(`const cwd = process.cwd()` L12-14), alors que les sessions de ce dépôt
travaillent depuis `web/`. C'est la même classe que la régression N1 déjà
corrigée dans `wn-etat-reel.mjs` — racine dérivée de l'emplacement du script —
et elle n'est pas traitée ici : hors périmètre, à porter au cadrage suivant.
