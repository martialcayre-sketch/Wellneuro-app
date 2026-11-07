### BIO-PARCOURS : migration de l'identité d'auteur des protocoles, `cree_par` et `valide_par` (BP-14, D-459, 2026-11-07)

PR de migration seule de la file C (place 8), sans code consommateur
(D-266 §11).

- `20261107230000_identite_auteur_protocoles_v1` : `protocol_drafts.cree_par`
  et `protocol_diffusion_approvals.valide_par`, `TEXT NULL`, sans défaut.
  `approved_by` ne change pas.
- Reprise de l'historique (D-459 §4) : les versions relues et toutes les
  approbations reçoivent l'e-mail du praticien du dossier, par jointure ; les
  versions `draft` restent nulles. Aucun e-mail n'est écrit dans le fichier.
  Avant toute écriture, la migration compte les e-mails praticien distincts
  (dossiers et journal d'accès, sans casse) : s'il y en a plus d'un, elle
  échoue sans rien écrire. La reprise est une fonction conservée en base,
  EXECUTE retiré à PUBLIC, qui refuse aussi de s'exécuter une seconde fois.
- Contrat négatif `identite_auteur_protocoles_v1_negatif.sql` et sa ligne de
  CI : forme des colonnes, insertions sans les colonnes, casse, refus à deux
  praticiens (journal ou dossiers), version relue et approbation remplies,
  `draft` nul, `updated_at` intact, aucune seconde reprise.
- `schema.prisma` : `creePar` et `validePar`, facultatifs.
- Suite : release-db approuvée par le responsable, constat par conteneur et
  date seuil inscrite, puis la PR de code et ses trois bancs.
