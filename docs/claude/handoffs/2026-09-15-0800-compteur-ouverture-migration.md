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

## Revue interne — deux trous trouvés, tous deux miens

1. **Aucun contrat négatif.** Le patron d'une PR de migration en exige un
   (`D-127`, `D-178`), et ici il n'est pas décoratif : **sa liste blanche de
   colonnes est la seule chose qui tienne l'affirmation centrale de `D-192`.**
   Sans elle, une migration future ajoute `id_patient`, rien ne bronche, et la
   décision devient fausse en silence — exactement ce qui est arrivé à `D-185`,
   dont l'affirmation centrale a vécu une journée sur `main` sans être vraie.
   `compteur_ouverture_sources_v1_negatif.sql` éprouve six choses et tourne au CI.

2. **L'absence au registre RGPD était TACITE.** `rubrique5.modeles.test.ts` ne
   vérifie que les tables filles de `Patient` ; celle-ci n'en est pas une, donc
   **le banc se tait**. Une ligne absente ne ment pas, elle se tait — le défaut
   que ce dépôt a déjà nommé deux fois. La table est déclarée en rubrique 5 avec
   sa nature réelle (aucune donnée personnelle), la qualification juridique
   restant au responsable de traitement.

## Passe Codex — OBLIGATOIRE avant merge

`POLITIQUE_REVUE.md` classe P0 « migration », « données sensibles » et
« production » : cette PR coche les trois, et le tableau des budgets dit **une
passe obligatoire**. Le bloc est prêt (`scratchpad/codex-1113.txt`) et pose six
questions, dont trois qui m'inquiètent réellement :

- la **ré-identification par croisement** — un praticien seul actif un jour donné
  rend le compteur quotidien nominatif de fait, par recoupement avec
  `journal_acces_dossiers`. L'affirmation « incapable de dire qui » est peut-être
  trop forte et devrait être bornée dans le texte ;
- le **glissement de jour** — `jourDeMesure` calcule en UTC, Prisma écrit dans un
  `DATE` : la conversion peut-elle décaler d'un jour selon le fuseau de session
  Postgres du conteneur Scalingo ? Deux quotients faux au lieu d'un, et rien ne
  le signalerait ;
- la **liste blanche mord-elle vraiment** ? C'est tout le rempart.

## Passe Codex — BLOQUER sur `caacf68c`, trois findings, tous fondés

| Finding | Ce qui était faux | État |
| --- | --- | --- |
| **P1-1** | « structurellement incapable », « aucune donnée personnelle » | borné |
| **P1-2** | la liste blanche ne gardait que les NOMS de colonnes | corrigé |
| **P2-1** | « un compte ne descend pas » — `CHECK (compte >= 0)` accepte `2 → 1` | borné |

**P1-2 est le plus grave, et c'est le mien.** Un
`ALTER COLUMN jour TYPE TIMESTAMP(3)` laissait le contrat **entièrement vert** :
la granularité quotidienne disparaissait, deux ouvertures du même jour à une
seconde d'écart devenaient deux lignes horodatées, et la table redevenait le
journal par événement qu'elle s'interdit. **Mon propre message d'erreur nommait
« un instant » parmi les interdits, et le contrôle ne pouvait pas le voir.** Le
contrat compare désormais le triplet `nom:type`.

Rejoué localement sous PGlite, migration + contrat réels : base verte, et les
**quatre** mutations rouges — `jour → TIMESTAMP(3)` (celle de Codex),
`id_patient` ajoutée, `compte → BIGINT`, CHECK d'espèce retiré.

**P1-1 change la doctrine, pas seulement le texte.** L'absence d'identifiants
n'est pas une anonymisation : un jour où un seul praticien est actif, ses
ouvertures lui sont attribuables par croisement avec `journal_acces_dossiers`, et
s'il n'y a qu'un dossier ce jour-là, ce dossier devient identifiable. Aucune
colonne supplémentaire n'est nécessaire. Le risque est **borné par le volume
d'activité, et maximal aujourd'hui**. Ce qui reste garanti, et qui est désormais
ce qui est écrit : la table **n'ajoute aucun identifiant que le dossier ne
détienne déjà**.

**Deux inquiétudes levées par Codex, par exécution** : la liste blanche refuse
bien `id_patient` et `"ID_PATIENT"` ; et **le glissement de jour UTC→`DATE`
n'existe pas** — l'adaptateur Prisma transmet `YYYY-MM-DD` construit sur les
composantes UTC, vérifié dans quatre fuseaux.

**Non vérifié, et dit** : aller-retour réel dans Scalingo, concurrence réelle,
et aucune occurrence de ré-identification cherchée en production.
