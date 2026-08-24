---
id: "LOT-12"
statut: "terminé"
dépend_de: "LOT-03, LOT-07, LOT-11 (livrés) — et le LOT-08 dépend de LUI"
---

# LOT-12 — Ce que la contre-revue adverse a trouvé : six trous, dont un servi au patient

> **LIVRÉ le 2026-08-24 — `D-108`.** Contre-revue Codex lancée **avant** la
> clôture, sur la plage `16d93c57~1..7793a4ac` : treize affirmations absolues
> soumises, **sept réfutées**, six debout. Les six trouvailles revérifiées une
> par une dans l'arbre — toutes réelles. Trois bancs élargis, un texte patient
> corrigé, deux surfaces praticien mises en conformité, une borne épinglée.
> **Aucun seuil, aucune valeur clinique, aucune migration.**

## Pourquoi ce lot existe avant le LOT-08

Le LOT-08 ne change aucun code : la surface relue est identique avant et après.
Mais il **grave** l'état final dans la constitution, la matrice d'audit et
`FILE_ATTENTE`. Une règle déclarée *actée* sur un banc qui ne mord pas y serait
inscrite comme fermée, et le resterait. La revue devait donc **alimenter** la
vérification des trois preuves, pas la corriger après coup.

Trois précédents de la seule journée du 2026-08-24 le justifiaient, tous trouvés
par revue ou par mesure et **jamais par le lot qui déclarait la chose faite** :
une entrée de garde qui était un no-op, un banc vert sous quatre mutations, une
règle étiquetée *Proposition* dont le corps concluait qu'elle basculait.

## Le trou qui n'était pas un banc perfectible

`PatientCompanionHome.tsx` servait du **vocabulaire de jeu au patient depuis le
2026-07-18** (`477fa20d`), monté dans le portail par
`app/portail/[token]/questionnaires/page.tsx`. Le mot est le **deuxième motif**
de la liste surveillée par `gamification-patient.guard.test.ts` : ce n'est pas la
liste qui a failli, c'est le périmètre. Le garde connaissait la **page**, pas le
**composant** qu'elle monte.

**Deuxième fois que ce garde est pris à ne pas couvrir ce qu'il annonce.** Le
LOT-11 avait trouvé ses entrées de type fichier muettes ; sa correction — une
non-vacuité *par entrée déclarée* — ne pouvait par construction rien dire d'une
surface **jamais déclarée**. Le correctif ferme donc la classe : un cas remonte
les imports de composants du portail patient, **transitivement**, et exige que
chaque racine atteinte soit déclarée. Deux manquaient (`patient-companion`,
`ui`). Vu rouge sur le vrai texte avant correction, puis vu rouge sur le
**nouveau** cas après avoir retiré l'entrée à la main.

## Les trois bancs, élargis plutôt que déclarés limités

L'option « requalifier les statuts en déclarant les limites » a été écartée : un
banc dont la limite couvre le contournement qu'on vient de démontrer ne garde pas
la règle, il en documente l'absence.

| Banc | Ce qui passait | Ce qui a été ajouté |
|---|---|---|
| bump de version | `× 100 → × 99` déplace **tous** les scores, banc vert | sorties de référence (6 scénarios) **et** empreinte du mapping, par version |
| seuils littéraux | `Math.min(0,95, …)` — borne hors comparaison | la position d'**écrêtage** ; `.slice` déclaré dehors, avec sa mesure |
| nature du total | second affichage sous **alias**, sentinelle immobile | résolution d'alias **à point fixe**, plus un détecteur par **libellé** |

**Le sixième scénario a dû être mesuré, pas deviné.** Rejouée contre les cinq
premiers, la mutation de la contre-revue n'en faisait rougir qu'**un**, et
`Math.round → Math.floor` passait vert sur les cinq : l'arrondi entier absorbe
1 % sur les petites valeurs. `frontiereArrondi` tombe sur **64,5** exactement, où
`round` rend 65 et `floor` 64.

**Le `.slice` est resté dehors sur mesure, pas par confort.** 39 littéraux
d'écrêtage dans `src/lib`, dont **30 `.slice`** de troncature d'affichage. Les
faire entrer aurait noyé la liste d'exemptions sous une classe qui ne décide de
rien — le défaut que l'en-tête du banc nomme déjà.

## Deux surfaces praticien, que le suivi par nom ne pouvait pas voir

`TrajectoirePanel` affiche `indice {jalon.valeur}`, `J21DecisionPanel` la
tendance sous « Score Mon équilibre ». Deux chemins de données distincts vers le
**même** agrégat : la valeur change de nom en traversant une réponse d'API,
qu'aucune résolution d'alias ne rejoint. D'où le **second détecteur, par
libellé** — il lit ce que le praticien lit, pas ce que le code nomme. `D-106`
exige que le total soit identifié comme tel là où il s'affiche ; les deux
surfaces portent désormais la mention.

## La borne épinglée, pas corrigée

Un mot plus long que le plafond sort **seul, hors plafond**, de
`scinderSousPlafond`. Le constat est exact et n'appelle aucun correctif : « aucun
mot coupé » et « tout morceau sous le plafond » sont **incompatibles** dans ce
cas, et couper fabriquerait deux mots absents d'un texte signé (`DC-19`) là où un
morceau trop long ne fait que refuser un enregistrement — bruyamment, sans rien
altérer. Un cas mesure aussi que le registre publié reste loin de cette borne.

## Ce qui résiste, et qui compte autant

`A1` verrous fail-closed · `A2` `DC-12` · `A3` prédicat unique d'ouverture ·
`A4` verrous à sens inverse · `A6` aucune identité réelle en fixture ·
`D2` aucune valence sur la variation.

La revue a écarté sa **propre première restitution** — elle présentait comme
confirmées des mutations non exécutées — et corrigé son verdict `A4` après
lecture des bancs de sécurité. Ses zones non couvertes sont nommées.

## Validation

- **T1 vert** (code 0).
- **Mutations vues rouges** : 4 sur le banc de bump, 1 sur les seuils, 1 sur la
  nature du total, 1 sur le garde de gamification — dont les **trois mutations
  exactes** que la contre-revue avait laissées vertes.
- Arbre restauré après chaque mutation (`git diff --stat` vide).

## Ouvert

- Les constats `F5` et `F6` portent sur l'arbre final, **non attribués** à un
  commit de la campagne : les corriger ici est un choix de sécurité, pas une
  réparation de régression.
- La limite qui demeure au détecteur par nom : un franchissement de **fichier**
  (valeur passée en prop à un enfant qui la renomme). Le détecteur par libellé
  couvre ces cas-là, mais par le mot, pas par la donnée.
- **LOT-08** reprend la main : la clôture terminale, désormais adossée à une
  revue adverse.
