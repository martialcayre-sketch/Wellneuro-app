### Alliance 6.0-B — la migration de l'objectif à trois voix (LOT-01, D-094)

- Trois tables événement neuves : `propositions_objectif` (fragments sourcés
  en JSONB + `hash_sources` portant la caducité), `dispositions_proposition`
  (ce que le praticien fait d'une proposition : reprise, ou écart **motivé**)
  et `amendements_objectif` (« le dire autrement » — table propre, jamais un
  `sens` de plus sur la ratification : un amendement porte un texte, une
  ratification n'en porte pas). Plus une colonne nullable
  `source_proposition_id` sur `objectifs_negocies`, qui dit de quelle
  proposition un objectif procède, s'il en procède d'une.
- **Additive uniquement**, aucun backfill : la colonne neuve naît NULLE et le
  reste — un objectif rédigé de la main du praticien n'a pas de proposition
  source, et lui en fabriquer une serait fabriquer une histoire (`DC-17`).
- Invariants de 6.0-A reconduits : append-only, deux dates (événement ≠
  enregistrement, `cree_le` posé par la base), références souples sans FK
  entre objets du dossier, FK patient en `ON DELETE RESTRICT`, RLS deny-all,
  aucune colonne de score.
- **Aucun rang, aucune numérotation** (`D-094` §3) : l'ordre des candidats
  n'est couvert par aucune ligne signée (`D-093`), il ne se persiste donc
  jamais — l'ordre d'affichage se décide au rendu. La liste blanche du
  contrat vise nommément ce chemin.
- Le **couple geste↔motif** est tenu par un CHECK dans les deux sens : un
  écart sans motif est refusé (un écart muet ne dirait rien au bilan du
  LOT-06, qui décidera de signer ou non le classement) et une reprise avec
  motif l'est aussi (la reprise se lit dans l'objectif produit). `caduque`
  n'est pas un geste : la caducité se dérive de `hash_sources`, personne ne
  la décide.
- Contrat `alli_objectif_trois_voix_v1_negatif.sql` (11 cas négatifs, cas
  positifs par table, listes blanches, NOT NULL, FK RESTRICT, RLS) branché
  au CI, **vu rouge par cinq mutations réelles** puis remis au vert : CHECK
  du couple retiré, colonne `rang` ajoutée, FK passée en CASCADE, RLS
  désactivée, CHECK `fragments` retiré.
- L'effacement RGPD nommé (`effacerDossier`) couvre les trois tables. Sa
  garde de complétude a **mordu la première** : elle a refusé la migration
  tant que les tables neuves n'y étaient pas — la preuve qu'elle n'est pas
  décorative.
- Aucun code applicatif ne lit ces tables : elles naissent vides et le
  restent jusqu'au LOT-02.
