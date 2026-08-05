---
id: "LOT-02"
titre: "Rayons cognition, douleur, intestin et premier appelant"
statut: "livré"
dépend_de: "LOT-01"
palier: "T2"
---

# LOT-02 — Rayons cognition, douleur, intestin et premier appelant

## But

Rendre consultables les notebooks 05, 06 et 07 dans la bibliothèque clinique —
**et les brancher à un écran qui les appelle vraiment**.

## La règle de ce lot

Aucun rayon nouveau sans consommateur dans le même lot. Le fichier
`rayonCorpus.ts` le dit déjà de lui-même : cinq rayons y sont déclarés et
inertes, seul `micronutrition` a un appelant. Ce lot ne fait pas passer le compte
de cinq à huit.

## Résultat observable

Un écran praticien affiche des claims des notebooks 05, 06 ou 07 sur une requête
de recherche, avec leur provenance.

## Périmètre

- Étendre `RAYON_VERS_NOTEBOOK` dans
  `web/src/lib/supplement-library/rayonCorpus.ts` :
  `cognition` → `05 — Cognition et mémoire`, `douleur` → `06 — Douleurs
  chroniques`, `intestin` → `07 — Axe intestin-cerveau`.
- Brancher au moins un appelant réel.

## Arbitrage à trancher dans le lot

Le rayon filtre **par notebook entier**, pas par source. Après le LOT-01, seules
les sources d'intervention de ces notebooks seront validées — le reste du
notebook restera en attente. Deux options :

1. restreindre le rayon aux sources du registre LOT-00 (rayon complet mais
   étroit) ;
2. assumer un rayon partiel, alimenté par ce qui est validé (comportement actuel
   du filtre, sans code nouveau).

L'option 2 est le comportement par défaut et ne coûte rien ; l'option 1 demande
un paramètre de filtre supplémentaire. Trancher sur l'usage clinique attendu, pas
sur la facilité.

## Hors périmètre

- Toute exposition patient.
- La validation des claims (LOT-01).
- Un rayon pour les notebooks 11 et 12.

## Fichiers probables

- `web/src/lib/supplement-library/rayonCorpus.ts`
- `web/src/lib/rag/claims/notebooks.ts`
- la surface praticien retenue comme appelant

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de rayon déclaré sans appelant.
- Pas de contournement du filtre `VALIDE`.
- Pas de refactor hors lot.

## Étapes

- [x] Trancher l'arbitrage rayon complet / rayon partiel et l'écrire. (option 2,
  rayon partiel — sans objet en pratique : 05 et 07 sont 100 % VALIDE)
- [x] Étendre le mapping. (cognition, intestin en #546 ; douleur ajouté à la clôture)
- [x] Brancher l'appelant.
- [x] Vérifier le comportement à vide (message, jamais une erreur).
- [x] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- Un rayon dont le notebook n'a aucun claim validé rend vide avec message, pas
  une erreur ni un filtre ignoré.
- Un rayon inconnu rend le message dédié `MESSAGE_RAYON_INCONNU`.
- Aucun claim non signé ne remonte.

## Critères de done

- [x] Les trois rayons sont mappés et appelés. (3/3)
- [x] Le comportement à vide est testé.
- [x] Aucun rayon sans appelant n'a été ajouté.

## Résultats

**Livré partiellement le 2026-08-03 (PR #546, mergée).** Notebooks 05
(« Cognition et mémoire », 1114 claims) et 07 (« Axe intestin-cerveau », 370
claims) vérifiés 100 % VALIDE en base (`execute_sql` direct, pas le doc
d'inventaire de la campagne qui porte sur un sous-ensemble différent) — ajoutés
à `RAYON_VERS_NOTEBOOK`. Notebook 06 (douleurs chroniques) volontairement
exclu : pas encore validé.

**Arbitrage tranché** : option 2 (rayon partiel, comportement par défaut du
filtre) — sans conséquence observable ici puisque les deux notebooks sont déjà
100 % validés, mais la question se reposera pour 06 si sa validation reste
incomplète au moment de le brancher.

**Appelant** : nouvelle section « Recherche corpus » dans
`dashboard/bibliotheque`, nouvelle route `/api/praticien/corpus/rayons`,
nouveau composant `RechercheCorpusRayonPanel` — pas le patron de
`RayonComplementsPanel` (catalogue produit), qui ne convenait pas à une
recherche libre par thème clinique. Flag dédié `WN_RECHERCHE_CORPUS_ENABLED`
(éteint par défaut), documenté dans `docs/FEATURE_FLAGS.md`.

**Défaut trouvé et corrigé avant merge (revue adversariale `wn-reviewer`)** :
la route validait `rayon` par une regex syntaxique seule, ce qui l'aurait
laissée servir n'importe quel rayon de `RAYON_VERS_NOTEBOOK` — micronutrition
compris — en contournant `WN_C4_ENABLED`. Corrigé par une allowlist dédiée
(`RAYONS_RECHERCHE_CORPUS`), testée. Corollaire retiré dans la même PR : un
couplage caché où `servirRayonCorpus` forçait `WN_C4_ENABLED` pour **tout**
rayon demandé — le gate produit vit désormais dans la couche accès de chaque
route, pas dans le service générique.

**Complété le 2026-08-03 (soir) — rayon `douleur` branché, lot clos.** Le
notebook 06 est passé à 651/651 claims VALIDE ; la condition qui l'avait laissé
de côté est levée. Vérifié en base avant d'écrire une ligne (`execute_sql`) :
`'06 — Douleurs chroniques' = notebook` rend **vrai** (102 chunks) — le libellé
du mapping correspond au caractère près, tiret cadratin compris ; un écart
d'espace y rendrait un rayon silencieusement vide, sans erreur. Les 651 claims
portent 16 `source_id`, **tous** parmi les 17 que le registre déclare pour ce
notebook (seule `WN-SRC-0176` n'a aucun claim) : le `filter_source_ids` recouvre
la donnée, l'écran servira réellement quelque chose.

Édité : `RAYON_VERS_NOTEBOOK` et `RAYONS_RECHERCHE_CORPUS`
(`rayonCorpus.ts`), `RAYONS_DISPONIBLES` (`RechercheCorpusRayonPanel.tsx` —
liste codée en dur, non dérivée), l'en-tête de section de
`dashboard/bibliotheque`, `docs/FEATURE_FLAGS.md`, et les commentaires des trois
fichiers de la chaîne qui énuméraient nommément les rayons servis.

**Arbitrage confirmé** : option 2 (rayon partiel) sans objet ici non plus — 06
est à 100 % validé. Le flag `WN_RECHERCHE_CORPUS_ENABLED` reste **éteint** ;
l'allumer est un geste de prod distinct.

**Défaut trouvé par la revue adversariale, corrigé dans la même PR — le miroir
exact de celui de #546.** La route du tiroir compléments
(`/api/praticien/complements/corpus`) validait `rayon` par **regex syntaxique
seule** et servait donc n'importe quelle entrée de `RAYON_VERS_NOTEBOOK`
derrière `WN_C4_ENABLED` — allumé en production — sans jamais consulter
`WN_RECHERCHE_CORPUS_ENABLED`. Ajouter `douleur` au mapping l'y aurait exposé
dès le merge : **le lancement dark aurait été faux**, et le jour où l'on éteint
le drapeau pour une raison clinique, l'interrupteur n'aurait rien coupé.
Sur #546 on sortait de la recherche corpus vers micronutrition ; ici on y entre
par la porte compléments. Corrigé par une allowlist d'un seul rayon
(`rayonBrut !== RAYON_MICRONUTRITION`), ce qui ferme aussi l'exposition héritée
de `cognition` et `intestin`. Aucun appelant ne passait autre chose que
`micronutrition` (`FicheComplementPanel`, prop par défaut jamais surchargée) :
rien ne casse.

**Trois gardes ajoutés, tirés de la même revue** : les deux listes de rayons
refusés sont désormais **dérivées** de `RAYON_VERS_NOTEBOOK` au lieu d'être
littérales — un rayon ajouté demain sans allowlist est couvert d'office ; un
test lie `douleur` au `filter_source_ids` du notebook 06, sans quoi
`douleur: '05 — Cognition et mémoire'` passerait toute la suite au vert en
servant des claims de cognition sous l'étiquette « Douleurs chroniques » ; et le
titre du test de routage ne prétend plus rien sur le contenu du notebook, que le
service mocké ne peut pas prouver.

**Non fait, et assumé** : `stress`, `humeur` et `sommeil` restent mappés,
validés à 100 %, et hors de l'allowlist servie — décision produit distincte,
hors périmètre de ce lot.
