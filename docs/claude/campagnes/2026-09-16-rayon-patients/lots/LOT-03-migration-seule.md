---
id: "LOT-03"
titre: "Migration seule — quatre colonnes"
statut: "à faire"
dépend_de: "—"
---

# LOT-03 — Migration seule : quatre colonnes

## But

Donner au dossier les quatre renseignements qui n'existent nulle part :
adresse, NIR, nom et coordonnées du médecin traitant.

**Périmètre strict** : `migration.sql`, le bloc `Patient` de `schema.prisma`, le
contrat SQL négatif, le fragment changelog, et la rubrique 5 du dossier RGPD.
**Aucun code consommateur** (`D-087`).

## Le SQL

Gabarit à copier : `20260911160000_alliance_comprehension_provenance_v1` — même
cardinalité, `ALTER TABLE` unique multi-colonnes, en-tête de commentaires en
cinq blocs, chaque `CHECK` nommé et précédé du défaut qu'il ferme.

```sql
ALTER TABLE "patients"
  ADD COLUMN "adresse" TEXT,
  ADD COLUMN "nir" TEXT,
  ADD COLUMN "medecin_traitant_nom" TEXT,
  ADD COLUMN "medecin_traitant_coordonnees" TEXT;
```

Additif seulement : quatre colonnes nullables, sans défaut, sans index — rien à
rétro-remplir, rien à reconstruire au retour arrière. Aucun DROP, aucun
renommage, aucune colonne existante modifiée.

Un `CHECK` nommé par colonne texte, avec `btrim/2` (`btrim(x, E' \t\r\n')`) et
**jamais** `btrim/1`, qui ne retire que l'espace ASCII et laisse passer une
tabulation. Sur le NIR, le `CHECK` borne la **forme** (15 caractères, chiffres,
`2A`/`2B` corses admis) ; la **clé de contrôle** se vérifie côté application —
un calcul modulaire en contrainte SQL serait illisible et non testable.

`patients` porte déjà `ENABLE ROW LEVEL SECURITY` depuis
`20260707123710_enable_rls_security` : rien à ré-émettre, mais le contrat
`web/prisma/checks/<nom>_negatif.sql` le **re-vérifie** plutôt que de le
supposer, et se câble dans `ci.yml`.

Ne jamais lancer `npx prisma format` : il réaligne une centaine de lignes
étrangères au diff, à commencer par le bloc `Patient`.

## Le versant réglementaire, dans la même PR

`docs/DOSSIER_RGPD.md` §5 — la ligne « Identité et contact | `Patient` (email,
prénom, nom, date de naissance, téléphone) | Données ordinaires » cesse d'être
exacte. Adresse et coordonnées du médecin traitant s'y ajoutent ; **le NIR sort
de « données ordinaires »**.

Sa qualification juridique appartient au responsable de traitement — le lot
l'écrit comme **due**, il ne la pose pas. Le banc `rubrique5.modeles.test.ts` ne
compare que des **noms de modèles** fils de `Patient` : il ne rougira pas. Il
n'y a pas de filet ici, et c'est écrit pour que personne ne le croie.

## Mise en service

Merger, puis déclencher et approuver `release-db` **dans la foulée**. Le push
sur `main` touchant `web/prisma/migrations/**` propose le run automatiquement ;
l'approbation reste humaine.

**La fenêtre d'indisponibilité court entre les deux** : Prisma sélectionne
explicitement toutes les colonnes scalaires du modèle, donc dès que le code
déployé déclare `adresse`, toute requête `patient` échoue tant que la colonne
n'existe pas. Quelques minutes, à choisir — pas à subir.

## Done

- `npx prisma validate` ; T3 complet — c'est lui qui juge la parité
  schéma ↔ migrations (`prisma migrate diff`, attendu *No difference detected*).
- Contrat négatif exécuté et câblé en CI.
- `release-db` approuvée, et l'application **constatée** par conteneur
  (`migrate status` en one-off), jamais supposée.
