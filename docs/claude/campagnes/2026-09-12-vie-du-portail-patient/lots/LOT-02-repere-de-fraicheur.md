---
id: "LOT-02"
titre: "repere-de-fraicheur"
statut: "livré (2026-09-12)"
dépend_de: "LOT-01"
---

# LOT-02 — Le repère de fraîcheur : « jusqu'où ce patient a vu »

## But

L'arbitrage 3 (replié par défaut, déplié s'il y a du neuf) exige un repère
serveur. C'est le **seul point de toute la campagne qui demande une écriture**,
et le cadrage annonçait le contraire.

## Résultat observable

- `portail_journal_reperes` : **une ligne par dossier, écrasée**, deux colonnes.
- `GET /api/portail/journal` rend `vuJusqua` et `duNeuf`.
- `POST /api/portail/journal` avance le repère, et rien d'autre.

## Ce que la table ne peut pas devenir

`id_patient` **est** la clé primaire. Ce n'est pas une commodité : c'est ce qui
rend un décompte d'assiduité **impossible**, et pas seulement interdit. Une table
append-only de visites dirait « ce patient a ouvert son portail 14 fois en
septembre » — un constat sur lui (`DC-19`/`DC-20`). Ce qui n'est pas conservé ne
se compte pas.

## Quatre décisions de route

- **Sans repère, tout est neuf.** Un patient qui n'a jamais déplié n'a jamais vu.
- **La borne est stricte.** Un fait daté exactement du repère a été vu. Un `>=`
  rouvrirait le journal à chaque chargement.
- **Le POST ignore son corps** (`D-164`). Un horodatage du client posé loin dans
  le futur ferait taire ce journal pour toujours.
- **Le repère ne recule jamais**, et rien ne s'écrit s'il n'y a rien à avancer.

## Preuves

- Migration **partie seule** (`D-087`), `release-db` approuvée, **constatée par
  conteneur** (one-off-5630) : deux colonnes, PK `id_patient`, FK `confdeltype=r`,
  RLS active, 0 policy, 0 ligne.
- **T3 verte** avant la PR de migration, 41 contrats SQL joués.
- **Dix mutations jouées, dix mutants tués** sur la partie code.

## Écart assumé

Le repère **n'est pas une trace d'audit** : les valeurs précédentes sont perdues
à chaque avancée. C'est une commodité d'affichage, et la perte est voulue. Le
registre des traitements le dit en ces termes.
