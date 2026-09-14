---
id: "LOT-06"
titre: "Le barème de charge — mécanisme signé, première ligne du praticien"
statut: "à faire"
dépend_de: "LOT-02"
---

# LOT-06 — Le barème de charge

## But

La charge thérapeutique est « saisie manuelle, aucun calcul automatique » et son
barème n'a **jamais été validé**. Le LOT-02 a déjà refusé qu'elle se pose en silence ;
ce lot lui donne une matière.

**La machine ne peut pas l'écrire.** Aucun seuil, dose, poids ou borne ne s'invente
(`DC-19`, `DC-20`). Le lot livre le mécanisme ; le praticien écrit et signe ce que la
charge compte.

## Répartition, et elle n'est pas négociable

| Livré par le lot | Écrit par le praticien |
|---|---|
| La table signée, sur le patron de `INDICATIONS_BIOLOGIE_V1` | Ce que la charge compte |
| `shaPerimetre` et la vérification **à cinq termes** | La valeur de chaque borne |
| Le refus fail-closed si la table n'est pas signée | La signature et sa date |
| Le moteur pur qui la lit | — |
| L'enrôlement dans les bancs de garde | — |

La vérification à cinq termes est le patron de `D-063` : booléen de validation
externe, date ISO valide, claims non vides, SHA de périmètre concordant — **un flip
de booléen ne suffit plus**.

## Une règle d'ordonnancement, tirée d'un échec mesuré

**Table, première ligne et signature dans la même campagne.** Rien n'est livré tant
qu'au moins une ligne n'est pas signée. Le rendement de remplissage d'une table
livrée vide est mesuré à **zéro** au dépôt : `clinical_rules`, le catalogue d'alertes
compléments et les seuils d'ingrédient portent 0 ligne chacun, et le moteur `D-056`
qui en dépend « refuserait tout ».

## Résultat observable

Le constructeur propose un niveau de charge fondé sur une ligne signée ; le praticien
le garde ou le change. La charge **reste déclarée par lui** — `source: 'practitioner'`,
posé en dur et inchangé.

## Périmètre

- Une table TypeScript signée + son moteur pur (aucune migration).
- Le branchement dans `ProtocolMiniBuilder`, en **proposition** jamais en substitution.
- Décision `D-xxx` : périmètre, champs, régime de signature, banc textuel.
- La première ligne signée.

## Hors périmètre

- Tout calcul qui remplacerait la saisie.
- Toute borne non écrite par le praticien.
- L'étage 3 (table d'interventions), qui compterait des interventions plutôt que des
  actions.

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- **Aucun seuil, dose, poids ou borne inventé.** Si la première ligne n'est pas
  écrite, le lot ne se livre pas — il se reporte.

## Étapes

- [ ] Rendre la décision (périmètre, champs, signature) + fragment.
- [ ] Écrire la table, son moteur, sa vérification à cinq termes.
- [ ] Recevoir la première ligne signée du praticien.
- [ ] Brancher en proposition ; enrôler dans les bancs de garde.

## Tests

T1, T2, T3. Le banc de signature doit être vu ROUGE sur une table dé-signée.

## Critères de done

Une ligne signée existe ; la table refuse de servir si sa signature ne tient pas ; la
saisie praticien reste souveraine.
