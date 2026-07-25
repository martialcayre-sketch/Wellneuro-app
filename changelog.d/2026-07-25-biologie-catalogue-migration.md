### Ajouté

- Catalogue de biologie fonctionnelle CB-A (lot CB-01) : onze tables additives
  posant l'étage documentaire du rayon — pivot clinique `biology_analytes`,
  nomenclature importée `biology_nabm_actes`, correspondance signée
  plusieurs-à-plusieurs `biology_analyte_nabm`, deux référentiels de valeurs
  jamais fusionnés (`biology_reference_ranges` laboratoire /
  `biology_functional_ranges` fonctionnel, ce dernier exigeant un claim),
  préanalytique, bilans hiérarchisés, ratios à opérandes structurés, liens
  cliniques et pointeur de version. Vocabulaires fermés, RLS deny-all, clés
  étrangères en RESTRICT. Plages et liens acceptent indifféremment un analyte
  ou un **ratio** : HOMA, ω6/ω3, Cu/Zn et saturation de la transferrine ont
  tous une plage, les câbler plus tard aurait coûté une migration.
  **Aucune de ces tables ne porte de donnée patient** : le stockage de
  résultats biologiques reste un acte gaté HDS (lot CB-09).
  Le catalogue sort vide de ce lot ; son remplissage est CB-02a.
- Contrat de migration `web/prisma/checks/cb_biologie_catalogue_v1.sql`, câblé
  dans le CI. Il vérifie ce que le drift check ne voit pas — CHECK, RLS, index
  partiels — et surtout il **fait échouer le CI si une colonne du catalogue
  prend une sémantique patient** (nom ou clé étrangère). Le verrou HDS cesse
  d'être un commentaire pour devenir un test.
- Dérivation du caractère remboursable écrite une seule fois
  (`web/src/lib/biology-library/remboursable.ts`) : quatre états plutôt qu'un
  booléen — `non_evalue`, `hors_nomenclature`, `remboursable`,
  `remboursable_si_groupe` — et les conditions (entente préalable, acte
  réservé, remboursement partiel) affichées sans jamais faire basculer le
  statut. C'est elle qui détermine le régime documentaire du §4 : courrier au
  médecin traitant ou document patient.
- Deux drapeaux fail-closed distincts pour le rayon biologie
  (`web/src/lib/biology-library/featureFlag.ts`) : `WN_CB_ENABLED` ouvre
  l'étage documentaire, `WN_CB_RESULTS_ENABLED` gouvernera l'étage résultats et
  exige que **les deux** valent exactement `true` — deux variables justes pour
  stocker une donnée de santé, jamais une seule. Aucun appelant à ce jour.

### Modifié

- La séparation entre nomenclature et catalogue devient structurelle, à la
  suite de l'audit de source CB-00 : les actes de la NABM vivent dans leur
  propre table (matière administrative, verbatim source) et ne rejoignent le
  pivot clinique que par une correspondance manuelle et signée. Un
  rapprochement automatique par libellé produirait un catalogue faux sans le
  signaler.
- La correspondance est ancrée sur le **code d'acte**, jamais sur la ligne d'un
  millésime : l'ancrer sur la ligne aurait périmé la signature du praticien à
  chaque nouvelle version de nomenclature, faisant basculer tout le catalogue
  en « non remboursé » — donc changer le document remis au patient.
- La nature d'une correspondance distingue désormais le groupe **imposé** du
  groupe **au choix** (`isole | groupe_et | groupe_ou`). Une valeur unique
  confondait « l'acte couvre A et B » (1211 = TSH + T4 libre) et « l'acte
  couvre A ou B » (1387 = folates sériques ou érythrocytaires), dont les
  conséquences sur le remboursement sont opposées.

### Corrigé

- Mesure de la source NABM sur les 1050 concepts publiés : la nomenclature
  compte **987 actes** et non 988. Le 988ᵉ code à quatre caractères est `NABM`,
  le nœud racine de la terminologie ; un filtre acceptant les lettres le
  laissait entrer comme s'il s'agissait d'une analyse. Le chiffre de l'audit
  CB-00 est corrigé en conséquence, et la contrainte de base n'accepte plus que
  quatre chiffres — les 987 actes réels sont tous purement numériques.
- La référence à un claim porte sa version en **texte** au format du corpus
  (`v1.0`) et non en entier : la clé métier d'un claim est le couple
  `(claim_id, version_claim)`, tous deux textuels. Une version stockée en
  entier n'aurait jamais pu se joindre au corpus, sans que rien ne le signale
  à l'écriture.
