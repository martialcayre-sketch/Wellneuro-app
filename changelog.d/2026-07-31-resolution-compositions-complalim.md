### Ajouté

- **Résolution des compositions Compl'Alim vers le référentiel** (C4, transport
  des compositions — PR A : la décision, pas encore l'écriture).
  `supplement_product_compositions` est vide en production (140 148 produits,
  0 composition), et c'est ce qui laisse les fiches à l'état de coquilles. Ce lot
  livre de quoi trancher avant d'écrire : un résolveur
  (`tools/supplements/compositions/lib/resolution.mjs`) et un outil de projection
  (`projeter.mjs`) qui **n'écrit nulle part et n'a aucune option pour le faire**.

  **L'appariement ne peut se faire que par libellé** — l'inverse de l'invariant
  payé au lot référentiel. Vérifié sur le schéma officiel et sur les 151 Mo du
  fichier : les cinq colonnes de composition ne portent **que du texte**, zéro
  occurrence de clé `id` dans les objets embarqués. L'invariant n'est pas
  contourné, il est inapplicable ; sa raison est honorée autrement — vocabulaire
  clos et fini (1 965 libellés distincts pour 580 892 lignes), correspondance
  exacte sans aucun approché, et tout ce qui ne se résout pas d'une seule façon
  n'est pas écrit mais rapporté.

  Trois règles, éprouvées chacune par une mutation :

  - **L'ingrédient direct l'emporte sur la forme.** « Huile de poisson » est à la
    fois `substance:716` et une forme d'apport rattachée à **sept** ingrédients
    (DHA, EPA, oméga 3, vitamine E…). Suivre la forme ferait déclarer au produit
    sept actifs que le fabricant n'a jamais déclarés — dans la table même qui
    alimentera la sentinelle de cumul.
  - **Une forme à plusieurs parents n'est pas écrite.** 69 libellés sur 568 sont
    dans ce cas, dont « D-pantothénate de calcium », qui apporte réellement le
    calcium **et** la vitamine B5 : rien dans la donnée ne dit lequel le
    fabricant visait.
  - **Un filtre d'espace de noms** double les deux, y compris à travers le parent
    d'une forme : une ligne `plantes` ne se résout que vers une plante. 48 noms
    d'ingrédients sont homonymes ; sans ce filtre, un produit déclarerait un
    actif d'une tout autre famille que celle que la source annonce.

- **Un rapport de couverture** avant toute écriture : couverture par catégorie,
  libellés inconnus par volume, ambigus avec leurs candidats, motifs de refus de
  dose, et le nombre de formes dérivées à créer (partie × préparation d'une
  plante, souche d'un micro-organisme — le référentiel ne les engendre pas).

### Modifié

- **`dose_par_portion` devient `dose_par_djr`** (migration
  `20260731200000_c4_composition_dose`, sur une table **vide** — 0 ligne en
  production, aucune donnée déplacée). La source déclare une quantité par **dose
  journalière recommandée**, pas par unité de prise : un produit à 3 gélules/jour
  déclare 300 mg par DJR, soit 100 mg par gélule. Le prochain lecteur de cette
  colonne est la sentinelle de cumul, pour qui le nom aurait été la première
  source de vérité — et l'erreur aurait porté un facteur, dans le sens
  rassurant. Contrat servi passé en `c4-catalogue-v4`.

- **`UFC` entre au vocabulaire d'unités.** Les 21 805 lignes de micro-organismes
  portent une quantité et aucune unité — l'UFC y est implicite, et le schéma
  officiel la documente. Sans elle, le CHECK qui apparie dose et unité ne
  laissait qu'une issue : jeter la dose, et perdre 21 478 dosages probiotiques en
  silence. Élargissement, pas assouplissement : le vocabulaire reste clos.
  `ml` minuscule (19 330 lignes) est normalisé à l'import, pas admis en base.

- **`composition_source_lignes` existe** sur `supplement_products`, nullable et
  **écrite par personne** : `integre` reste inatteignable, toutes les fiches
  restent `partielle`, et les trois verdicts positifs restent écrasés. La colonne
  est câblée au lecteur pour que son remplissage soit un geste de donnée.

### Corrigé

- **`lireCompletudeComposition` refuse un compte source nul ou négatif.** Sans ce
  garde, `n >= 0` était vrai pour toute fiche portant au moins une ligne : une
  valeur creuse aurait ouvert `Compatible`, `Aucun cumul` et `Aucune interaction
  connue` sur une fiche dont on ne sait rien. Le CHECK en base interdit le
  négatif, pas le zéro — et zéro est légitime : 406 fiches ne déclarent aucun
  actif.

- **Deux contrats SQL C4 tournent enfin.** `c4_referentiel_provenance_v1.sql`
  était annoncé « câblé au CI » par le changelog de #493 : il ne l'était pas, et
  n'avait donc **jamais tourné**, ni en CI ni dans `wn-test-worktree.sh` (qui
  dérive sa liste de `ci.yml`). `c4_supplement_catalogue_v1.sql` était inerte
  depuis le LOT-01, alors qu'il garde précisément les index de la table de ce
  lot. Les deux sont désormais dans `ci.yml`, donc dans T3.

### Notes

- **Ce lot n'écrit aucune composition.** Le transport — formes dérivées, envoi,
  `composition_source_lignes` — demande un go explicite, et l'outil de projection
  est là pour que ce go se prenne sur un chiffre.
- La projection du référentiel est **extraite** dans
  `tools/supplements/referentiel/lib/projection.mjs`, importée par l'ingestion et
  par l'outil de projection : deux copies divergeraient en silence, et le rapport
  porterait sur un référentiel qui n'existe pas.
- **Couverture mesurée avant d'écrire**, sur les 140 148 fiches : **94,8 %** des
  575 769 lignes actives se résolvent, et **aucun libellé n'est inconnu du
  référentiel** — le résiduel tient en **101 libellés ambigus**, liste finie et
  arbitrable. 84,2 % des fiches se résolvent intégralement ; 73,6 % ont toutes
  leurs lignes dosables dosées. À créer : 14 102 formes de plantes et
  5 806 souches.

  En tête des ambiguïtés viennent « Sélénite de sodium » (sélénium **et**
  sodium), « Iodure de potassium » (iode **et** potassium) et « D-pantothénate
  de calcium » — exactement les exemples qui justifiaient « ne jamais lire le
  libellé ». Le résolveur les refuse au lieu de se tromper.

- L'empreinte `contenuSha256` sérialise ses clés, et celle-ci a suivi le
  renommage **sans coût** : les 140 148 fiches en base ont toutes été ingérées
  avec `compositions: []`, le JSON haché y contient `"composition":[]` et la clé
  n'y figure nulle part. Vérifié par recalcul — empreinte identique dans les deux
  graphies. Ce ne sera plus vrai dès la première composition écrite. Deux tests
  figent les valeurs exactes.

- **Réserve pour la PR B** : `composition_source_lignes` n'entre pas dans
  l'empreinte. Corriger ce seul compte sur une fiche dont la composition n'a pas
  bougé rendrait un hash identique, donc `inchangee`, donc aucune écriture. Le
  transport devra écrire ce compte par un autre chemin que la comparaison
  d'empreinte.
