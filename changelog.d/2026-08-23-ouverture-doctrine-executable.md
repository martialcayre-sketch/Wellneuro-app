### Campagnes — « Doctrine exécutable » s'ouvre en primaire, huit lots cadrés sur mesures

- La campagne `2026-08-18-doctrine-executable` passe d'init-only à ouverte :
  `CAMPAGNE.md` et **huit lots** écrits le 2026-08-23, sur un état réel
  re-mesuré contre le dépôt **et contre la production**. Objectif : faire
  passer les règles `DC-nn` de « opposable sur parole » (`D-043`) à « le code
  refuse ».
- **Le cadrage déplace trois des cinq véhicules de l'audit du 2026-08-11** :
  - **V1 est à moitié livré** — `contradictionFinding.ts` porte un objet à
    trois formes depuis `D-041`/`D-044`, avec les quatre niveaux de `DC-29`
    typés mot pour mot et une garde structurelle interdisant tout champ de
    certitude ; seule `DISCORDANCE` est peuplée. Restent les producteurs et
    la politique de résolution (LOT-06).
  - **V4 est périmé** — ses deux fiches d'accueil (LOT-05/LOT-07 de la chaîne
    T0) sont livrées depuis le 2026-08-18 et rien dans `web/src/lib` ne porte
    la tolérance ni la compatibilité séquentielle. `DC-39`/`DC-41` deviennent
    des **dettes sans véhicule**, nommées au LOT-08 plutôt que perdues avec
    le véhicule.
  - **§D est clos** par le Socle LOT-02 (`D-083`, `demandeClinique` dans
    `protect-wellneuro-files.mjs`) et **§E** a son banc de fraîcheur à
    découverte automatique (`D-042`/`D-046`) — le compilateur reste absent,
    `DC-26` reste partiel et le dit.
- **§A est tranché par la lecture** : `typologie_lecture` est un `CHECK` fermé
  sur `déclaré/observé/vécu/interprété`, sans rapport avec la taxonomie `A-E`
  — V2 est un axe **nouveau**, pas un enrichissement. Mesure de production du
  2026-08-23 (conteneur `one-off-8873`, lecture seule) : **8 224 claims, tous
  `VALIDE`**, `metadata` sans axe doctrinal.
- **Arbitrage du responsable, 2026-08-23 — la population sort du claim.** Le
  cadrage initial posait un axe `population` lu fail-closed, ce qui aurait
  écarté les 8 224 claims d'un moteur qui n'existe pas encore. Le modèle
  retenu est **général déclaré + exclusions déclarées**, porté par
  l'**intervention** (95 entrées, champ `neCouvrePas` aujourd'hui `null` sur
  les 95) et non par le claim : un claim descriptif n'a pas de population,
  c'est la proposition qui en a une (`DC-11`) ; le précédent du dépôt est déjà
  celui-là (`BiologyFunctionalRange.population NOT NULL DEFAULT
  'adulte_tout_venant'`, `D-068`/`D-069`) ; et écrire un défaut sur 8 224
  lignes par migration fabriquerait des déclarations que personne n'a
  prononcées (`DC-17`, `DC-19`). **`DC-14` n'est pas modifiée** — sa portée est
  écrite : elle gouverne l'extrapolation d'un claim, pas le défaut d'une
  colonne, et une population générale *déclarée* n'est pas un silence.
  Garde-fou : une intervention non curée se propose **en le disant** (`DC-35`),
  sans quoi « ouvert par défaut » deviendrait « aveugle par défaut ».
  Conséquences — le LOT-02 passe à **trois** colonnes et cesse d'être le chemin
  critique ; les LOT-05 et LOT-06 n'en dépendent plus.
- **Aucun claim n'est invalidé par la campagne** : `statut`, `validateur` et
  `valide_at` ne sont touchés par aucun lot.
- **V3 n'est plus préventif, il est en retard** : `grossesse`/`allaitement`
  n'existent que dans `trust/contenus/registre.ts` (contenus d'information),
  aucun filtre d'intervention, alors que `priorityRulesV1` est signée
  (`D-061`) et que `D-093` a ouvert les recommandations élargies en notant que
  le classement n'est couvert par aucune ligne signée. Sa fenêtre est la borne
  de six semaines de `D-093`.
- Huit lots : état atteint (docs) · migration du schéma de claim, trois axes
  (**confirmation obligatoire**, seule dans sa PR) · banc de doctrine `DC-58` ·
  typage de l'objet de sécurité et pouvoir d'inhibition · gates de population
  et effet indésirable · conflit de sources et escalade · `DC-22` · clôture.
  L'ordre est un **graphe**, pas une chaîne : le seul lien fort est
  LOT-04 → LOT-05/LOT-06.
- Gate de campagne : aucun banc sans sujet, et l'acte d'intégration compte
  **trois preuves** — décision `D-xxx`, banc qui mord, statut basculé dans
  `CONSTITUTION_CLINIQUE.md`. État, `ACTIVE_CAMPAIGN` et `FILE_ATTENTE`
  resynchronisés.
