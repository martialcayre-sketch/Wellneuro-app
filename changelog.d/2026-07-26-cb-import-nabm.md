### Ajouté

- **Rayon biologie fonctionnelle — import de la nomenclature NABM (lot CB-02a).**
  La table des actes se remplit depuis le Serveur Multi-Terminologies de l'ANS
  (Licence Ouverte v2, six appels anonymes) : **987 actes** de la version V105,
  avec leurs treize propriétés de facturation. Logique pure séparée du CLI, et
  un CLI qui ne peut écrire qu'avec cinq preuves simultanées — `--apply`, un
  jeton en argument, le même jeton en variable d'environnement, une connexion
  de migration dédiée, et `--base` qui doit **nommer l'hôte réellement visé**.
  Sans elles, il imprime son rapport et s'arrête.
- **Banc d'intégration du chemin d'écriture** (`scripts/test-cb-nabm-import.sh`,
  exécuté en CI) : neuf cas sur base réelle — premier import, rejeu idempotent,
  rotation de millésime, refus de changer le catalogue servi sans le nommer,
  refus d'orpheliner une signature du praticien, refus sur un hôte erroné.
- **Snapshot de source vérifiable (`biology_source_snapshots`).** L'audit
  exigeait de conserver le contenu importé ; seule son empreinte avait une
  colonne — on gardait la preuve d'un contenu qu'on ne gardait pas. La table
  stocke les **1050 concepts** du millésime, y compris les chapitres et
  sous-chapitres qui n'ont pas de table dédiée. Le contenu est en TEXT et non
  en `jsonb`, précisément pour que son empreinte reste recalculable **en
  base** : une contrainte `CHECK` la recalcule à chaque écriture, si bien qu'un
  snapshot ne peut pas mentir sur ce qu'il contient.
- **Le millésime servi ne change pas sans qu'on le nomme.** Un import qui
  n'apporte aucune donnée — parce que ce millésime est déjà intégralement en
  base — mais qui déplacerait le pointeur est refusé tant que la version quittée
  n'est pas nommée explicitement. Sans ce garde, rejouer un millésime remplacé
  réactivait des actes désactivés depuis, et faisait donc repartir un courrier
  au médecin traitant citant un acte retiré de la nomenclature. De même, un
  import qui priverait de son acte une correspondance signée par le praticien
  est refusé, et le forçage l'écrit en clair.
- **Deux colonnes que CB-01 ne prévoyait pas** sur `biology_nabm_actes` :
  `code_incompatible` (438 actes sur 987, jusqu'à 17 valeurs) et
  `regle_applicable` (25 actes). La première porte l'information qui dit que
  1208 (T.S.H. seule) et 1211 (T.S.H. + T4 libre) ne peuvent pas figurer sur la
  même demande — sans elle, une proposition d'exploration aurait pu cumuler
  deux actes que le payeur rejette.

### Corrigé

- **La nomenclature compte 987 actes, pas 988.** Le 988ᵉ code à quatre
  caractères est `NABM`, la racine de la terminologie. L'audit de cadrage le
  comptait comme un acte ; la mesure faite avant d'écrire l'import l'a détrompé.
- **Aucun code d'acte n'est non-numérique** (l'audit en annonçait 45), mais
  **256 portent un zéro de tête** — ce qui confirme que le code reste une
  chaîne. Le filtre `^[0-9]{4}$` ne rejette donc aucun acte réel.
- **L'import ne filtre pas les actes inactifs**, contrairement à ce que
  prévoyait la recette d'audit. Aucun acte de la V105 n'est inactif, mais
  écarter les inactifs aurait fait *disparaître* du millésime, à la première
  version qui en désactive un, un acte que le catalogue doit au contraire
  montrer comme inactif.
- **La description du lot CB-02a annonçait des fiches d'analyte en brouillon** :
  l'import n'en crée aucune. La NABM est l'axe de remboursement, pas l'ossature
  du catalogue, et ses libellés sont des intitulés de facturation dont l'audit a
  montré qu'ils ne se rapprochent pas d'un analyte par recherche textuelle.
