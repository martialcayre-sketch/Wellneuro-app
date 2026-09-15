# Compteur d'ouverture de « Voir les sources et limites » — migration seule

**PR** : migration + `schema.prisma`, rien d'autre. Régime `D-087` : la migration
va seule dans sa PR, le code consommateur suit après application constatée.

**Autorisation** : le responsable a autorisé la migration d'avance le 2026-09-14
(arbitrage « Migration autorisée d'avance »). Le **go de merge reste dû** — une PR
de migration ne se merge jamais sans lui (`D-087` §1).

## Ce que la table est, et ce qu'elle ne peut pas devenir

`compteur_ouverture_sources` : `(jour DATE, espece TEXT, compte INT)`, clé primaire
`(jour, espece)`, `CHECK` sur l'espèce et sur la positivité du compte.

**Deux espèces parce qu'un compte d'ouvertures seul ne veut rien dire.** Sans
dénominateur, « 40 ouvertures » ne distingue pas une surface consultée
systématiquement d'une surface ignorée 99 fois sur 100 — exactement le nombre
sans dénominateur que cette campagne poursuit depuis son premier lot.

**Quatre absences choisies** : aucun `id_patient`, aucune identité de praticien,
aucun instant (un jour), aucune ligne par événement. La table est
STRUCTURELLEMENT incapable de dire « ce praticien n'ouvre jamais les
limitations ». C'est la discipline de `portail_lectures_patient`, qui se prive de
toute colonne de date pour ne pas devenir un journal de présence ; ici la cible
serait le praticien, et un second registre d'accès sur les patients par-dessus
`journal_acces_dossiers`.

**Seul endroit du dépôt où un `UPDATE` vaut mieux qu'un ajout.** Ailleurs l'ajout
seul protège une trace clinique contestable ; ici, empiler FABRIQUERAIT la
granularité qu'on vient de refuser.

**Pas de clé étrangère**, conséquence directe de l'absence d'`id_patient` :
`patient/effacement.ts` n'a rien à y faire, il n'y a rien qui concerne un dossier.

## Ce qui suit, et qui n'est pas ici

La PR consommatrice porte le module-feuille `lib/mesure/ouvertureSources.ts`, la
route `POST /api/praticien/mesure/ouverture-sources`, le branchement de
`DecisionSummaryCard` et un `onOuverture` sur `TwoLevelReading`. Elle est écrite
et ses 26 cas sont verts en local ; elle attend cette migration.

**Points déjà tranchés dans ce travail, pour qu'ils ne se rejouent pas** :

- La mesure est **fermée par défaut** (`mesurable={false}`). La carte se monte
  DEUX fois sur une même page ; ouverte par défaut, chaque nouveau site
  d'affichage gonflerait le dénominateur en silence.
- Elle est **fausse en mode fixture** : le harnais ergonomique sert un contenu
  fictif et ne contacte jamais le réseau (banc existant de
  `ClinicalRuntimeSection`, qui a attrapé la première rédaction).
- **Fail-open sans exception** (`D-146`) : une mesure qui empêcherait de lire les
  limitations d'une décision clinique renverserait l'ordre des choses.
