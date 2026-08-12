### Ajouté

- **Un épisode T0 ne se confirme plus sur un dossier vide** (`D-052`). L'API
  vérifie trois **conditions dures**, recalculées depuis la base et jamais lues
  dans le corps de requête : premier rideau complet et exploitable
  (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01`), anamnèse consignée avec un
  motif principal, synthèse validée par le praticien et postérieure à la
  dernière passation du rideau. Refus en **422**, message français nommant ce
  qui manque. Deux **conditions souples** (passation ambiguë du rideau,
  contradictions ouvertes) se contournent avec un motif obligatoire, tracé dans
  le payload d'épisode — auteur et horodatage posés par le serveur.
- Le panneau de confirmation affiche la checklist : conditions dures cochées ou
  bloquantes, avertissements avec case « je confirme malgré » et motif. Ce qui
  n'est pas requis pour un T0 (biologie, agendas, journal) est **nommé**, y
  compris `Q_SOM_09`, qui figure au pack de base mais court sur 21 nuits.

### Le fond du sujet : « VALID » ne prouvait rien

- La migration du LOT-00 a posé `statut_validite TEXT NOT NULL DEFAULT 'VALID'`,
  ce qui a estampillé `VALID` **toutes** les lignes existantes. Lecture de
  production du 2026-08-12 : **105 passations, toutes `VALID`, aucune autre
  valeur**, et la route d'invalidation rend 503 tant que
  `WN_ENABLE_VALIDITE_PASSATIONS` est éteint. Une condition dure « la passation
  est `VALID` » aurait donc été **tautologique** — un défaut de colonne
  présenté comme un jugement clinique, ce que `DC-24` interdit.
- La condition retenue ne s'y appuie pas : la passation doit exister, son statut
  ne doit pas être exclu du raisonnement (`statutExcluDuRaisonnement`,
  indépendant du drapeau, prévu pour **désigner** et non pour filtrer), et
  `scoresRecalculesPourRaisonnement` ne doit pas rendre `null`. **C'est ce
  troisième terme, et lui seul, qui mord aujourd'hui** : il refuse la passation
  « nommée-mais-vidée », c'est-à-dire présente mais dont le résultat n'est pas
  une mesure.
- Les deux conditions souples sont **muettes en production**, et c'est écrit
  plutôt que masqué : aucune passation ne peut porter `AMBIGUOUS` drapeau
  éteint, et le service de contradictions rend une liste vide tant que la table
  n'est pas signée. Elles sont câblées et tenues par des bancs pour que le
  chemin existe le jour de l'allumage.

### Écarté

- **La condition souple « suggestions d'orientation ni renseignées ni
  écartées »**, retirée du lot : « écartée » n'existe nulle part et la créer
  demanderait une persistance nouvelle, donc une migration. Livrée dégradée en
  « des suggestions restent non renseignées », elle aurait produit un
  avertissement non acquittable, affiché à chaque T0 — un avertissement qu'on ne
  peut pas éteindre est un avertissement qu'on apprend à ignorer.
- **Faire dériver le rideau du pack de base.** Le pack est éditable depuis l'UI
  et une divergence registre↔pack a déjà été journalisée le 2026-08-03 : une
  règle clinique se déplacerait alors par un geste administratif (`DC-26`).
- **Exiger la forme longue de `Q_ALI_01`.** Plus exigeant, mais le T0
  deviendrait inconfirmable partout où `WN_ALI_01_SIIN57` est éteint — soit
  partout aujourd'hui.

### Réserves nommées

- Le lot **ne rend pas le T0 corrigible** : l'identifiant d'épisode est
  déterministe et la persistance est un `upsert(..., update: {})`. Il durcit une
  porte à sens unique, et un T0 confirmé par contournement le reste.
- **Le parcours nominal n'a pas d'E2E** : peupler un patient de seed
  déplacerait l'orientation, les captures visuelles et le garde de
  certification, et les trois patients autorisés sont tous centraux. Le
  parcours E2E existant asserte désormais le **refus** ; le cas nominal est
  couvert par les bancs de route.

### Modifié

- `VERSION_OBJETS_CLINIQUES` : `objets-cliniques-v1` → `v2` (le payload
  d'épisode gagne `preconditionOverrides`). Coût mesuré avant bump :
  `assessment_episodes` est vide et aucun `protocol_drafts` ne porte
  `objets-cliniques-v*` — aucun hash persisté ne bouge. Aucune migration.
- `docs/FEATURE_FLAGS.md` documente enfin `WN_ENABLE_VALIDITE_PASSATIONS`,
  absent alors qu'il gâte quatre consommateurs cliniques.
