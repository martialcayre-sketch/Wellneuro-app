# BP-10 — Constat d'usage de l'acte de lecture (2026-10-07)

Lecture de production du 2026-10-07 à 10:48 UTC, depuis un conteneur
`scalingo run -d` (`one-off-1330`). La transaction était en lecture seule,
close par `ROLLBACK`. Le script (`CONSTAT_USAGE_BP10.sql`) ne contient que des
`COUNT` et des `GROUP BY` : aucun identifiant, aucun nom, aucun e-mail n'en
sort. Cette note est le constat d'usage de BP-10 (`D-268`, `D-266` §12). Elle
ne conclut rien sur un parcours de patient (`D-125`).

## Mesures

| Mesure | Valeur |
|---|---|
| Imports | 1, statut `extrait` |
| Imports validés au sens de `D-268` (au moins une ligne `validee`, aucune `proposee`) | 1 |
| Imports à décider | 0 |
| Lignes candidates | 58 : 42 `validee`, 16 `ecartee`, 0 `proposee` |
| `resultats_biologiques` | 42, tous `source = saisie_praticien` |
| Comptes rendus | 1, purgé (`motif_purge = lignes_decidees`) |
| Actes | 1 `lecture`, 0 `revocation` |
| Lectures actives (non révoquées) | 1, sur 1 import et 1 dossier |
| Imports validés sans lecture active (ce que la carte du Fil signale) | 0 |
| Jour des actes (UTC) | 2026-10-07, premier et dernier |

Complément du même jour (`one-off-4233`, mêmes règles) : des 16 lignes
écartées, 12 étaient la même mesure imprimée dans une seconde unité, dont la
jumelle dans l'unité du catalogue était validée dans le même import ; 2
portaient un analyte inconnu du catalogue ; 2 une valeur non chiffrée.

## Lecture

Depuis la ligne de base du 2026-10-05 (39 validées, 19 proposées), l'import
réel a été décidé en entier : 3 lignes validées de plus, 16 écartées. La
lecture a ensuite été consignée. La chaîne de `D-268` est donc constatée une
fois en production : import décidé, carte « compte rendu à lire », acte de
lecture, plus aucun import validé sans lecture. La purge du compte rendu à la
décision de sa dernière ligne (`D-258`) est constatée aussi.

Une occurrence ne mesure pas un usage : elle établit que le chemin
fonctionne, pas qu'il est suivi. Aucune révocation n'a eu lieu : ce chemin
n'est éprouvé qu'en banc.

**Le blocage observé avant la lecture.** La lecture exige un import
entièrement décidé (`D-268` §5). Les 16 lignes laissées en « Plus tard »,
qui n'est pas une décision, la bloquaient. Le praticien les a écartées, puis
a lu. Deux suites, livrées le même jour : l'écran ne laisse dépliées que les
lignes à trancher (#1351), et la seconde unité d'une même mesure s'ouvre sur
« Écarter » quand sa jumelle part validée (`D-270`, #1353). Sur cet import,
4 lignes seulement seraient restées à trancher au lieu de 16.

## Réserve : l'effectif de masquage

`D-266` §14 range « l'effectif minimal en dessous duquel un agrégat est
masqué » parmi les constantes produit, chiffrées par le responsable dans le
lot qui les consomme, sans valeur par défaut. Il n'est pas chiffré. Toutes les
valeurs ci-dessus valent 0 ou 1 sur un seul dossier et un seul praticien,
comme celles de la ligne de base du 2026-10-05. Elles sont publiées parce
qu'elles ne portent ni date fine, ni identifiant, ni valeur clinique. Le
chiffrer reste dû avant tout constat portant sur plusieurs dossiers, et au
plus tard avant l'ouverture de BP-21a.
