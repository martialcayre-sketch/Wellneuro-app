# 2026-08-23 11:30 — Doctrine exécutable LOT-01 : l'état atteint (D-095)

## Ce qui a changé

- **LOT-01 livré, docs seules.** `CONSTITUTION_CLINIQUE.md` et
  `AUDIT_DOCTRINE_CHAINE_T0.md` disent l'état du 2026-08-23. `D-095` porte la
  requalification, la portée de `DC-14`, les deux bascules et les marqueurs.
  Aucun code, aucun banc, aucun seuil touché.
- **Descente en éventail** (10 agents, une section `I`→`IX` chacun, plus une
  synthèse-filtre) : 58 règles confrontées au code, jamais à la documentation.
- **Deux bascules seulement.** `DC-29` : `D-041` avait écrit sa propre
  condition (« elles ne basculent à acté qu'à ce moment »), elle est remplie —
  le garde refuse **à la compilation** tout champ de certitude. `DC-33` :
  proposée, **rejetée** par le filtre (aucune décision ne la tranchait,
  `D-048` l'ayant renvoyée au LOT-04 et `D-054` ne l'ayant jamais reprise),
  puis basculée **par régularisation** sur arbitrage du responsable.
- **Sept réserves « Banc dû » retirées sur neuf** — cinq parce que le banc a
  été trouvé (`DC-17`, `DC-27`, `DC-30`, `DC-34`, `DC-35`), deux parce que la
  réserve était mal nommée : `DC-12` et `DC-23` avaient leur banc, il leur
  manque un **producteur** (marqueur neuf **Producteur dû**).
- **Marqueurs neufs, tous grepables** : `Producteur dû`, `Décision due` (4
  règles actées sans décision, maintenues actées sur arbitrage plutôt que
  déclassées), `orpheline` (12 marques), `écrite, non armée` (4 règles sans
  sujet, déclencheur nommé).

## À savoir pour la suite

- **Le vrai produit du lot est une liste de dettes, pas des bascules.** La
  clôture de la chaîne T0 périme dix-neuf lignes du tableau (13 « porté » +
  6 « partiel » nommant un lot). Quatre règles ont été refermées, quatre ont
  changé de porteur, **onze sont orphelines** — plus la part de `DC-11` hors
  exclusions. **Deux n'ont ni preuve, ni banc, ni véhicule : `DC-09` et
  `DC-36`.** `DC-09` est celle que l'audit désignait comme le garde-fou le
  plus exposé de toute la chaîne. Le LOT-08 les nommera ; il ne les fermera
  pas — c'est un arbitrage de portefeuille du responsable.
- **La grille à quatre colonnes de l'audit n'a PAS été recomputée**, et c'est
  écrit dans les trois documents. Elle mesure l'état du code, la constitution
  mesure l'acte d'intégration, et `DC-33` prouve que les deux divergent. Ne
  pas réintroduire un total global sans une passe règle par règle : la revue a
  démontré qu'un `17/21/4/16` n'était reconstituable depuis aucune liste.
- **Piège de rédaction à ne pas répéter** : la première version annonçait
  « trois réserves Banc dû retirées » alors qu'il y en avait sept, et trois
  listes d'orphelines incompatibles cohabitaient dans trois fichiers. Un
  document qui dit l'état doit être compté depuis son propre texte, pas depuis
  le rapport qui l'a produit. Les comptes sont désormais vérifiables au grep.
- **Worktree, et clôture écrite à la main** : la copie principale était prise
  par la session 6.0-B (branche `feat/alliance-6b-lot01-migration`, migration
  non commitée). La suite `/wn-*` ne tourne pas en worktree — `/wn-finish` et
  `/wn-handoff` n'ont pas été utilisés, cette entrée et le `SESSION_LOG` ont
  été écrits directement. **Le client Prisma doit être généré** dans un
  worktree neuf, sinon T1 rend 20 erreurs `Cannot find module
  '@/generated/prisma'` étrangères au diff.

## Ouvert

- PR du LOT-01 : CI à attendre, merge = Copilot ou go.
- **Arbitrage de portefeuille sur les douze orphelines** — en particulier
  `DC-09` : dette nommée sans véhicule, ou rattachement à un lot ?
- `DC-26` reste partiel : le compilateur `tools/corpus/orientation/` n'est au
  périmètre d'aucun lot, et le banc de fraîcheur ne le remplace pas.
- La matrice claim par claim (grille `DC-07` / `DC-13` sur les 8 224 claims)
  reste à faire — LOT-08 la reconduira, Curation signée la portera.
- Prochain lot mobilisable sans dépendance : **LOT-03** (banc de doctrine
  `DC-58`) ou **LOT-02** (migration, confirmation obligatoire). Le seul lien
  fort du graphe est LOT-04 → LOT-05/LOT-06.
