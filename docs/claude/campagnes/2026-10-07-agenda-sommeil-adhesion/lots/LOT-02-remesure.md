---
id: "LOT-02"
titre: "Re-mesure de l'adhésion, par cohortes avant / après"
statut: "en_cours (2026-11-07) — deux lectures jouées ; clôture au responsable"
dépend_de: "LOT-04"
---

# LOT-02 — Re-mesure de l'adhésion

## But

Dire, chiffres en main, si les patients notent davantage de nuits depuis les
changements de la campagne : déblocage de la saisie (LOT-01, 2026-10-07),
sélecteurs et trois écrans (LOT-03), rappel posé sur l'appareil (LOT-05), et
contrat v4 (LOT-04) — ces trois derniers déployés le 2026-10-08. Lecture
seule, agrégats seuls.

## La requête

[`REMESURE_ADHESION.sql`](../REMESURE_ADHESION.sql), à jouer comme
`CONSTAT_ADHESION.sql` : depuis un conteneur `scalingo run -d`, encodée en
base64 puis passée à `psql -f -`. Elle range chaque agenda selon ce que le
patient a vu pendant sa fenêtre :

| Cohorte | Définition | Rôle |
|---|---|---|
| `a_avant` | fenêtre close avant le 2026-10-07 | référence |
| `b_transition` | fenêtre à cheval | comptée, jamais mêlée |
| `c_apres` | première nuit le 2026-10-09 ou après | tout vu dès la première nuit |

**La référence (LOT-00) n'est pas perdue** : les nuits d'avant sont en base, la
cohorte `a_avant` la reconstitue après coup.

Sorties : entonnoir et démarrage (R01), taux de réponse des fenêtres échues
(R02) et en cours (R03), décrochage (R04), délai de démarrage (R05),
corrections et rattrapages (R06), contrat écrit par cohorte — contrôle des
bornes (R07), usage de « je ne sais pas » (R08), heure de saisie (R09).

## Calendrier

- **Première lecture : 2026-10-29**, date où les premières fenêtres de la
  cohorte `c_apres` (première nuit le 2026-10-09) sont échues. R03 se lit plus
  tôt, mais sur des fenêtres incomplètes.
- **Seconde lecture : 2026-11-12**, pour que `c_apres` compte davantage de
  fenêtres échues. Avancée au 2026-11-07 par le responsable : à cette date
  comme au 2026-11-12, deux fenêtres échues (voir « Seconde lecture »).

## Comment la lire

- **Des comptes, pas des tests.** Les effectifs sont ceux d'un cabinet : un
  écart se rapporte avec ses effectifs, sans test statistique ni seuil de
  « succès » posé après coup.
- **Aucun lot n'est isolé** : LOT-01, LOT-03, LOT-05 et LOT-04 sont arrivés en
  deux jours ; la mesure porte sur l'ensemble (arbitrage du 2026-10-07).
- **Agrégat cabinet seulement** : jamais un taux par patient (un « score de
  décrochage » est hors doctrine), jamais un identifiant dans un fichier
  durable — un dossier de test se désigne comme tel.
- **R07 d'abord** : une cohorte `c_apres` qui porterait du v3, ou `a_avant` du
  v4, signale une borne mal placée ; corriger `-v av=… -v ap=…` avant de lire
  le reste.
- **Refus de saisie** : ils ne sont pas en base. Depuis le LOT-01, la route les
  journalise (`PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_REJETEE`, motif seul) ; leur
  compte se lit dans les journaux Scalingo, dans la limite de leur rétention.

## Mesure de référence (jouée le 2026-10-09)

Première exécution en production, par conteneur `scalingo run -d`, bornes par
défaut (`av` 2026-10-07, `ap` 2026-10-09). Agrégats seuls ; la sortie brute
n'est pas versée. Les dossiers de test vivent en production (`D-075`) et sont
compris dans ces comptes — aucun moyen de les isoler en agrégat.

**Contrôle des bornes (R07) : conforme.** Cohorte `a_avant` : nuits v2 et v3
seulement ; cohorte `b_transition` (3 agendas commencés avant le déploiement) :
v3, comme le veut [[D-272]] §3 ; aucune nuit v4 encore écrite, aucun agenda
`c_apres` — attendu le lendemain du déploiement.

| Cohorte `a_avant` (référence) | Valeur |
|---|---|
| Assignations d'au moins 7 jours, commencées | 16 / 20 |
| Délai assignation → première nuit | médiane 0 j, maximum 28 j |
| Fenêtres échues | 15 |
| Taux de réponse sur fenêtres échues | 85 / 315 nuits = **27,0 %** |
| Nuits par agenda (médiane) | **1** |
| Agendas ≥ 14 nuits (seuil de l'indice) / = 21 nuits | 2 / 0 |
| Décrochage des 15 fenêtres incomplètes | 8 à la 1re nuit, 7 en 3e semaine, aucun entre |
| Transmis (statut `Complété`) / ≥ 7 nuits | 11 / 5 |
| Corrections / saisies le lendemain | 5 / 7, sur 90 lignes |
| Saisies entre 5 h et 11 h (Paris) | 46 / 90 |

Lecture, au sens de `D-125` — observé en agrégat, causes non établies :

- **Le démarrage n'est pas le goulot** : quatre agendas sur cinq commencent,
  en général le jour même. Les quatre jamais commencés peuvent contenir des
  blocages à la première saisie, qui n'atteignent pas la base — *inconnu faute
  de preuve*.
- **Le décrochage est bimodal** : plus de la moitié des fenêtres échues
  s'arrêtent après la première nuit ; les autres vont jusqu'à la dernière
  semaine, autour de onze nuits. C'est le retour du deuxième matin qui manque,
  non la saisie elle-même — ce que vise le rappel posé sur l'appareil (LOT-05).
- **Au moins six agendas transmis n'avaient pas sept nuits** : clôturés sans
  agrégats, ils produisent une réponse non scorée.

**Ce que la lecture du 2026-10-29 compare**, cohorte `c_apres` contre cette
référence : part des agendas à une seule nuit (8 / 15), nuits médianes (1),
agendas ≥ 14 nuits (2 / 15), et R08. Les agendas créés pendant la recette sur
appareil tomberont dans `c_apres` : leur nombre est à relever pour les retirer
du compte.

## Première lecture (jouée le 2026-10-29)

Même requête, mêmes bornes (`av` 2026-10-07, `ap` 2026-10-09), par conteneur
`scalingo run -d`, horloge de la base au 2026-10-29 12:48 UTC. Agrégats seuls ;
la sortie brute n'est pas versée. Les dossiers de test sont compris dans les
comptes (`D-075`).

**Contrôle des bornes (R07) : conforme.** `a_avant` : v2 et v3 seulement ;
`b_transition` : v3 ; `c_apres` : v4 seulement (41 lignes).

**Aucune fenêtre `c_apres` n'est encore échue.** Aucun agenda `c_apres`
n'a commencé le 2026-10-09 : les trois agendas de la cohorte sont en
cours. La comparaison annoncée plus haut (part des agendas à une seule nuit,
nuits médianes, agendas ≥ 14 nuits, sur fenêtres échues) ne se lit donc pas
encore ; elle revient à la seconde lecture. Agendas de recette sur appareil
dans `c_apres` : aucun (relevé du responsable, 2026-10-29).

| Mesure | `a_avant` | `c_apres` |
|---|---|---|
| Taux de réponse | 87 / 315 nuits = 27,6 % (15 fenêtres échues) | 40 / 44 nuits écoulées = 90,9 % (3 fenêtres en cours) |
| Délai assignation → première saisie (médiane, maximum) | 0 j, 28 j (18 agendas) | 4,5 j, 9 j (2 agendas) |
| « Je ne sais pas » (R08) | — | 0 sur 41 lignes v4 |
| Corrections / saisies le lendemain | 5 / 7, sur 92 lignes | 1 / 6, sur 41 lignes |
| Saisies entre 5 h et 11 h (Paris) | 46 / 92 | 24 / 41 |

`b_transition` : 3 fenêtres échues, 9 / 63 nuits (14,3 %).

Deux dénominateurs : une **ligne** est une saisie enregistrée, correction
comprise (R06 à R09) ; une **nuit** est une date distincte (R01 à R04). Les
corrections font l'écart, et les comptes se réconcilient : `c_apres`
41 lignes − 1 correction = 40 nuits ; `a_avant` 92 − 5 = 87. À la seconde
lecture, reprendre le même dénominateur que la mesure comparée.

Lecture, au sens de `D-125` — observé en agrégat, causes non établies :

- **Trois fenêtres en cours, tenues à neuf nuits sur dix jusqu'ici** : rien ne
  dit encore qu'elles iront au 21e jour ; c'est la question que la référence
  pose (décrochage après la première nuit), et elle ne se tranche que sur
  fenêtres échues.
- **La référence a bougé depuis le 2026-10-09**, alors que ses fenêtres
  étaient closes : 87 nuits au lieu de 85, médiane 2 au lieu de 1, agendas
  ≥ 14 nuits 3 au lieu de 2 ; décrochage à la 1re nuit 7 au lieu de 8, en
  3e semaine 8 au lieu de 7 ; assignations d'au moins 7 jours, commencées :
  18 / 22 au lieu de 16 / 20. Deux lectures possibles, aucune prouvée : des
  nuits passées saisies après coup, ou des assignations dont le statut a
  changé. Seconde lecture : relire la référence avant de comparer.

**Seconde lecture : 2026-11-12, maintenue.** La porte 16 ne se lève qu'à la
clôture du lot, après elle.

## Seconde lecture (jouée le 2026-11-07)

**Date avancée du 2026-11-12 au 2026-11-07 par le responsable**, le
2026-11-07, sur un comptage préalable en agrégat. La cohorte `c_apres` comptait
ce jour-là deux fenêtres échues, et en aurait compté deux le 2026-11-12 : sa
troisième fenêtre ne s'achève pas avant le 2026-11-13. Attendre n'ajoutait
aucune fenêtre échue.

Même requête, mêmes bornes (`av` 2026-10-07, `ap` 2026-10-09), par conteneur
`scalingo run -d`, horloge de la base au 2026-11-07 20:22 UTC. Agrégats seuls ;
la sortie brute n'est pas versée. Les dossiers de test sont compris dans les
comptes (`D-075`). La relance de l'agenda est toujours fermée
(`WN_AGENDA_RELANCE` absente) : les deux cohortes sont mesurées sans elle.

**Contrôle des bornes (R07) : conforme.** `a_avant` : v2 (70 lignes) et v3
(22) ; `b_transition` : v3 (11) ; `c_apres` : v4 seulement (54).

**La référence, relue d'abord, n'a pas bougé depuis le 2026-10-29.**
`a_avant` rend les mêmes comptes qu'à la première lecture : 87 / 315 nuits,
médiane 2, 3 agendas ≥ 14 nuits, décrochage 7 à la 1re nuit et 8 en
3e semaine, 18 / 22 assignations d'au moins 7 jours commencées, 92 lignes dont
5 corrections et 7 saisies le lendemain, 46 / 92 saisies entre 5 h et 11 h. Le
mouvement relevé le 2026-10-29 a donc eu lieu entre le 2026-10-09 et le
2026-10-29. Pour R01 seul, la requête a une part mécanique : `assignes_7j` se
compte au jour de la lecture (`current_date - assigne_le >= 7`), si bien
qu'une assignation du 2026-10-03 au 2026-10-06 n'y entrait pas le 2026-10-09
et y entre ensuite. Cela n'explique ni R02 ni R04, dont les fenêtres étaient
closes : leur mouvement reste sans cause établie.

Comparaison sur fenêtres échues (R02, R04) — dénominateur : la **nuit**
(date distincte) :

| Mesure | `a_avant` (15 fenêtres échues) | `c_apres` (2 fenêtres échues) |
|---|---|---|
| Taux de réponse | 87 / 315 nuits = 27,6 % | 38 / 42 nuits = 90,5 % |
| Nuits par agenda (médiane) | 2 | 19 |
| Agendas arrêtés après la 1re nuit | 7 / 15 | 0 / 2 |
| Agendas ≥ 14 nuits | 3 / 15 | 2 / 2 |
| Agendas à 21 nuits | 0 / 15 | 0 / 2 |

Autres mesures — dénominateur : la **ligne** (saisie enregistrée, correction
comprise) pour R06 à R09 :

| Mesure | `a_avant` | `c_apres` |
|---|---|---|
| Délai assignation → première saisie (médiane, maximum) | 0 j, 28 j (18 agendas) | 4,5 j, 9 j (2 agendas) |
| « Je ne sais pas » (R08) | — | 0 sur 54 lignes v4 |
| Corrections / saisies le lendemain | 5 / 7, sur 92 lignes | 1 / 7, sur 54 lignes |
| Saisies entre 5 h et 11 h (Paris) | 46 / 92 | 35 / 54 (19 à 8 h) |

R01 et R05 rangent par date d'assignation, R02 à R04 par première nuit : des
trois fenêtres `c_apres`, une relève d'une assignation antérieure au
2026-10-09, d'où deux agendas seulement en R05. Fenêtre `c_apres` en cours
(R03) : 1, 15 / 15 nuits écoulées. Assignations postérieures au 2026-10-09
encore non commencées : 2, toutes de moins de 7 jours. Ce sont les trois mêmes
agendas `c_apres` que le 2026-10-29 (aucun commencé depuis) : aucun agenda de
recette sur appareil parmi eux (relevé du responsable, 2026-10-29).

`b_transition` : 3 fenêtres échues, 10 / 63 nuits (15,9 %), contre 9 / 63 le
2026-10-29 : une nuit de plus sur des fenêtres échues, sans cause établie.

Lecture, au sens de `D-125` — observé en agrégat, causes non établies :

- **Les deux fenêtres `c_apres` échues sont allées au-delà du 15e jour**, sans
  atteindre 21 nuits. Aucune ne s'est arrêtée après la première nuit, la
  figure la plus fréquente de la référence (7 / 15).
- **Deux fenêtres contre quinze** : l'écart se rapporte avec son effectif. Il
  ne dit pas qu'une cohorte « après » plus large tiendrait de même, ni lequel
  des lots y serait pour quelque chose (arbitrage du 2026-10-07 : aucun lot
  isolé).
- **Saisie du matin** : 35 lignes `c_apres` sur 54 entre 5 h et 11 h, dont 19 à
  8 h. Le rappel posé sur l'appareil (LOT-05) ne laisse aucune trace serveur :
  la concentration s'observe, elle ne s'attribue pas.

**Critère de fin de H27** (les deux lectures versées en agrégats) : rempli par
ce versement. La clôture du LOT-02 et la levée de la porte 16 ne sont pas
décidées ici ; elles sont posées au responsable dans la liste commune. La
troisième fenêtre `c_apres` ne se lira relance fermée que si la repose de
`WN_AGENDA_RELANCE` (d53) attend sa fin.

## Correction apportée au constat

`CONSTAT_ADHESION.sql` lisait `soumis_le` — un TIMESTAMP sans fuseau qui porte
l'heure UTC — comme une heure de Paris : ses requêtes 09 (saisies le
lendemain) et 10 (heure de saisie) étaient décalées de deux heures. Corrigé
dans ce lot ; `REMESURE_ADHESION.sql` applique la conversion correcte partout.

## Validation

Les deux requêtes ont été jouées sur une base PostgreSQL 16 locale, sur des
données fabriquées (schéma réduit aux colonnes lues, types de production,
identifiants neutres) ; chaque compte a été vérifié à la main, fuseau compris.
Aucune lecture de production depuis une session distante.
