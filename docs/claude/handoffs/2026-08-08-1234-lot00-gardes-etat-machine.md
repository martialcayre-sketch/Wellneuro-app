# 2026-08-08 12:34 — LOT-00 : trois gardes de cohérence de l'état machine

Campagne `2026-08-08-dettes-ouvertes-5-0`, cadrée et ouverte le jour même.
Branche `worktree-cadrage-dettes-ouvertes-5-0`, base `de8eb804`.

## Ce qui est fait

Le cadrage de la campagne (les trois dettes que `DECLARATION_5_0.md` laisse
ouvertes — 6, 5, 4 — plus le badge « Certifié » qui n'emporte pas la définition
de D-034) et le **LOT-00** en entier : trois gardes qui échouent en T1 et en CI.

- vue `ACTIVE_CAMPAIGN.md` confrontée à `.wn/state.json` dont elle dérive ;
- `validation.last_checked_at` jamais postérieur à `updated_at` ;
- `active_lot` confronté au `lot_courant` de `CAMPAGNE.md` (primaire seulement).

Les deux premiers sont les défauts que la PR de clôture 5.0 a laissé passer ; le
troisième ferme la comparaison que la déclaration nomme comme absente.

## Ce qu'il faut savoir avant de reprendre

- **Le garde échoue, il ne répare pas.** Décidé à l'ouverture : une
  régénération automatique efface la récidive qu'on cherche à compter. Et le
  geste de réparation **n'est pas le même pour les trois** —
  `wn-cycle.mjs --appliquer` régénère la vue (garde 1), ne touche jamais
  `active_lot` (garde 3), et **éteindrait** le garde 2 en poussant `updated_at`
  sans qu'aucune validation ait été rejouée.
- **Le CI énumère ses bancs un par un.** `wn-etat-reel.test.mjs` vivait dans
  `npm run check` sans être dans `.github/workflows/ci.yml` depuis sa création,
  et `parite-check-ci.test.mjs` ne pouvait pas le voir : il vérifie CI →
  `check`, jamais l'inverse. Un banc ajouté à `bancs-outillage-check` n'est
  **pas** joué par le CI tant qu'on ne lui écrit pas son étape.
- **Un garde testé par ses fonctions pures n'est pas un garde branché.** Deux
  mutations de `construireRapport` débranchaient les gardes 1 et 3 en laissant
  tous les tests verts, pendant que le CLI continuait d'annoncer « 3
  confrontées, 0 écart ». Les tests `CÂBLAGE` ferment ce trou.
- **Deux lecteurs d'une même donnée rendent une comparaison fausse.** Le garde
  régénère la vue pour la comparer : il doit lire les `CAMPAGNE.md` exactement
  comme l'écrivain, sinon il rougit sur un fichier correct et conseille un geste
  sans effet. D'où `scripts/lib/campagnes-sur-disque.mjs`.
- **T2 a rougi deux fois avant de passer**, sur `portail-parcours.spec.ts:110`
  (Chromium) : signature connue du voisinage — même test ✓ sur iPhone 13 dans la
  même passe, `ECONNRESET` secondaire qui se déplace. Vert à la troisième,
  machine vérifiée au repos, et vert de nouveau après les correctifs de revue.

## Prochaine action

LOT-01 (dette 5) : poser une **date-cible** de retrait du parcours legacy — la
date inscrite aujourd'hui est celle de la décision — et retirer le `href` interne
survivant (`web/src/app/patient/[idAssignation]/page.tsx:191-192`). Les
commentaires de `orientationEngine.ts:212` et `orientationRulesV1.ts:229`, qui
déclarent encore ouverts trois moteurs fermés, voyagent avec.

## Questions ouvertes

- **Décision produit** : quelle échéance de retrait du legacy, adossée à quelle
  mesure d'usage ? `next.config.mjs:34` en invoque une qui n'existe pas.
- Le badge du LOT-02 : infobulle, libellé plus long, ou lien ? « Certifié » est
  employé à l'oral par le praticien ; le renommer a un coût d'usage.
- Les campagnes **parallèles** ne sont pas confrontées par le garde 3 :
  `agenda-alimentaire` porte `active_lot: null` face à `lot_courant: "LOT-08"`.
  Cet état est-il légitime ? La réponse décide si le garde est trop étroit ou la
  primaire trop stricte.
