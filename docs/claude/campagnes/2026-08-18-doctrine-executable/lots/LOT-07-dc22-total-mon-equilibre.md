---
id: "LOT-07"
statut: "à_faire"
dépend_de: "—"
---

# LOT-07 — `DC-22` : le total de « Mon équilibre » a-t-il un sens ?

## But

À la fin de ce lot, la question posée par `DC-22` est **tranchée par une
décision**, dans un sens ou dans l'autre : soit le total des douze besoins a
une interprétation clinique et elle est écrite, soit il n'en a pas et l'écran
n'en produit plus.

`DC-22` pose que la question précède le calcul : *existe-t-il une
interprétation clinique du total ?* L'audit relève qu'elle **n'a jamais été
posée dans le registre de décisions** — c'est une question clinique franche,
qui ne dépend d'aucun véhicule et n'a jamais eu de lot d'accueil.

## Périmètre

1. **Mesurer ce que le total est** : `equilibre/constants.ts` motive ses
   groupes et ses poids sur place, y compris son refus des poids plats
   (`DC-21`, tenu en pratique). Le total agrège douze besoins en groupes
   pondérés — le lot descend ce qu'il additionne exactement, et ce que
   l'écran en dit aujourd'hui.
2. **Mesurer ce que le total fait** : qui le lit, qui le compare, où il
   apparaît, ce qu'il déclenche. Un total purement affiché et un total qui
   entre dans une règle ne posent pas la même question.
3. **Poser la question au praticien**, avec la mesure. Deux issues, et le lot
   n'en préfère aucune :
   - **le total a une interprétation** — elle s'écrit, se source, se date, et
     `DC-22` bascule à *acté* ;
   - **le total n'en a pas** — l'écran présente les axes et les signaux sans
     produire de total, et `DC-22` bascule à *acté* dans l'autre sens.
4. Exécuter l'issue retenue, avec sa garde.

## Interdits

- **Ne pas trancher à la place du praticien.** C'est une question clinique,
  pas une question d'ingénierie : le lot mesure et pose, il ne conclut pas.
- **Aucun poids, aucune pondération, aucune bande d'interprétation inventés**
  (`DC-19`, `DC-21`) : si l'issue est « le total a un sens », ce sens vient
  d'une source, pas d'un arbitrage d'implémentation.
- Ne pas retirer un total d'un écran sans décision : un chiffre qui disparaît
  d'une surface praticien est un changement de restitution.
- Ne pas élargir au scoring des instruments : `DC-22` vise le **total
  agrégé** de « Mon équilibre », pas les scores qui l'alimentent.
- Si la version de score doit bouger, elle bouge **explicitement** (patron des
  bumps `VERSION_SCORE_EQUILIBRE`), avec le coût d'historique nommé — jamais
  en passant.

## Dépendances

Aucune. Le lot peut se jouer à tout moment de la campagne ; il est placé tard
parce qu'il est le seul dont l'issue peut modifier une surface praticien
existante.

## Étapes

1. Descente de `equilibre/constants.ts` et de ses consommateurs — que
   contient le total, qui le lit, que déclenche-t-il.
2. Rapporter la mesure et **poser la question** — s'arrêter.
3. Exécuter l'issue retenue : soit écrire l'interprétation et sa provenance,
   soit retirer le total de la restitution.
4. Garde structurelle correspondant à l'issue, vue rouge.
5. T3 (classe scoring), revue `wn-reviewer`.
6. Décision `D-xxx` + fragment `changelog.d/` ; bascule de `DC-22`.

## Tests

- T3 avant la PR (le scoring d'équilibre est couvert par des bancs existants,
  qui doivent être relus et non contournés).
- Garde vue rouge sur l'issue retenue.
- Si l'issue retire le total : vérifier qu'aucun consommateur ne le lit encore
  en silence, et qu'aucun historique n'est réécrit.

## Critères de done

- [ ] Mesure rapportée : ce que le total agrège, qui le lit, ce qu'il
      déclenche.
- [ ] Question posée au praticien avec la mesure ; issue tranchée par lui.
- [ ] Issue exécutée, avec sa garde vue rouge.
- [ ] Aucune pondération ni interprétation inventée.
- [ ] T3 vert, revue `wn-reviewer` ; `D-xxx` + `changelog.d/`.
- [ ] `DC-22` basculé à *acté*, quel que soit le sens de l'issue.
