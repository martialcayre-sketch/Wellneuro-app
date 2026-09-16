# Handoff — 2026-09-16 — Clôture de « 5. Actions », et l'usage mesuré à zéro

La campagne est **close**. Le créneau primaire est **libre**, et son attribution reste un
geste du responsable — l'état machine est passé à `idle` pour que personne ne lise un
créneau vide comme une invitation.

## La mesure, enfin faite

Elle était due depuis la clôture prévue et bloquée par le classifieur du mode auto, qui
refuse la **forme** de la commande (`run -d` + `psql`) et non son contenu. Le praticien a
ouvert une session hors mode auto ; la lecture a pris une minute.

| Mesure | Valeur |
|---|---|
| Versions de protocole en base | **1** — `ja-food-observation-v1`, du 2026-07-31 |
| Versions écrites depuis le 2026-09-14 | **0** |
| Versions relues / approbations / points d'étape | **0** / **0** / **0** |
| Sélections de priorité | **3** (1 au 2026-09-13) |
| Épisodes T0 | **8** (7 au 2026-09-13) |

**Aucune version de protocole C1 n'existe en production.** L'entonnoir franchit la phase
Décision — ce que `D-179` a débloqué — et s'arrête exactement là où cette campagne a
travaillé.

**Ce zéro mesure un jour, pas une adoption.** La campagne est déployée depuis le 2026-09-15
au soir. C'est une **ligne de base**, et la requête est conservée telle quelle au dossier du
LOT-07 : la rejouer à l'identique après deux semaines est la seule façon d'en tirer un
constat. Une entrée « à cadrer » le porte à la file.

## Ce que cela confirme, pour la troisième fois

`D-112` : « le goulot n'est pas l'ingénierie, c'est le temps praticien. » Trois campagnes
de suite l'ont mesuré. Le rang 5 de la file (6.0-B *charge et capacité*) porte déjà cet
avertissement : il **ajoute une surface**. L'ouvrir sans peser ce constat serait ouvrir à
l'aveugle.

## Le portefeuille, remis d'aplomb

| Campagne | Était | Est |
|---|---|---|
| IDP2 | `en_cours` depuis huit semaines | **close** — ses trois lots étaient livrés le 2026-07-22 |
| JA | `en cours — JA5-05 démarré` | **suspendue** — LOT-05 réellement inachevé, nommé en dette |
| C4 | `en cours` | **retournée en file** — cinq lots `à_faire`, jamais ouverte |

Trois statuts annonçaient du travail vivant qui ne l'était pas. `wn-campaign status` le
disait à chaque session.

## Les cinq dettes que la contre-revue laisse ouvertes

Portées à `FILE_ATTENTE.md`, nommées par `D-200` : la seconde description de la vue patient
(et son corollaire — **le praticien n'a aucun aperçu patient sur un dossier réel**) ;
`projeterSurLeFil` sans banc, alors qu'il décide seul de ce qui atteint le navigateur du
patient ; le statut `active` posé en silence ; `limitations` projeté au patient et rendu
par aucun écran ; l'hydratation du constructeur et `versionsLues`.

## Ce qui attend le responsable

**Une seule chose, et elle n'est pas technique** : à qui va le créneau primaire. La file
porte quatre candidats sérieux — curation des exclusions (`neCouvrePas` null sur 95, qui
ajoute de la donnée et non une surface), les dix règles orphelines (campagne dédiée déjà
tranchée le 2026-08-24), 6.0-B *charge et capacité* (qui ajoute une surface), et la
relecture d'usage à deux semaines, qui n'est pas une campagne mais conditionne les trois
autres.
