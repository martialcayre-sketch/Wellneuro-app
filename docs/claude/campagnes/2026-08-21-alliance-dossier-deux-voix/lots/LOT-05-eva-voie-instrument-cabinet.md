---
id: "LOT-05"
statut: "à faire"
dépend_de: "— (indépendant du LOT-01 — cf. cadrage : la voie CabinetInstrument existe)"
---

# LOT-05 — L'EVA voie instrument cabinet : piloter sans classer

## But

À la fin de ce lot, une EVA (échelle visuelle analogique) se crée, se relit et
s'assigne par la voie instrument cabinet existante — cycle
`brouillon → grille_a_relire → valide` — et ses passations pilotent la
conversation sans jamais classer : **aucun seuil, aucune bande, aucune
interprétation inventée** (`DC-19`, `DC-20`) ; un pilotage n'est jamais un
diagnostic (`DC-27`, `DC-28`).

## La voie mesurée (2026-08-22)

`CabinetInstrument` (`web/prisma/schema.prisma:1450`) porte déjà le cycle
complet : `statutRelecture` (`brouillon | grille_a_relire | valide`),
`definitionJson`, `scoringJson`, assignation après publication, scoring à la
soumission par le resolver commun `@/lib/instruments`, surfaces
`api/praticien/instruments/route.ts` et `BibliothequePanel.tsx`. **Première
question du lot** : cette voie accepte-t-elle une EVA *sans* grille
d'interprétation (un `scoringJson` qui rend la valeur brute sans bande) ?

- Si oui : le lot est une affaire de définition d'instrument + garde de forme,
  **sans migration**.
- Si non : le lot s'arrête, nomme le manque précis, et la décision (étendre
  `scoringJson` ou voie propre) revient au responsable — jamais une bande
  « neutre » inventée pour passer.

## Périmètre

- Rendre l'EVA créable et assignable par la voie cabinet (relecture de grille
  comprise — le cycle existant ne se contourne pas).
- Restitution praticien : la **valeur et sa trajectoire** (les passations
  successives, deux dates), jamais une bande, une couleur de sévérité ni un
  libellé interprétatif.
- Garde structurelle par test : une EVA ne porte aucun seuil — le banc rougit
  si une interprétation apparaît dans sa définition ou sa restitution.

## Fichiers probables

- `web/src/app/api/praticien/instruments/route.ts` (+ banc) — si extension
  nécessaire.
- `web/src/components/BibliothequePanel.tsx` (création/relecture).
- `web/src/lib/instruments` (resolver — lecture d'abord ; toute modification
  est un geste sur le scoring, décision propre).

## Interdits

- **Aucun seuil, bande, borne ou libellé interprétatif** — ni dans la
  définition, ni dans le scoring, ni dans l'affichage.
- Ne pas modifier le moteur de scoring des instruments du catalogue ; si le
  resolver commun doit bouger, s'arrêter et le nommer (décision + fragment).
- Ne pas contourner `grille_a_relire` : une EVA se publie relue, comme tout
  instrument cabinet.
- Aucun credit clinique inventé : l'EVA est un instrument de pilotage déclaré
  comme tel, sans provenance fabriquée.

## Dépendances

Aucune — peut se mener en parallèle du LOT-01. (Si la réponse à la première
question impose un schéma propre, le lot rejoint la discipline migration du
LOT-01 : confirmation obligatoire, migration seule dans sa PR.)

## Étapes

1. Instruire la première question sur pièces (resolver, definitionJson,
   scoringJson) — verdict écrit dans le lot.
2. Voie retenue : définition EVA + parcours création → relecture →
   assignation → passation, joué de bout en bout.
3. Garde anti-seuil vue rouge puis verte.
4. T2 ; fragment `changelog.d/`.

## Tests

- Parcours complet par bancs de route (création, relecture, publication,
  assignation, soumission).
- Garde anti-seuil : mutation qui introduit une bande → rouge.
- Restitution : valeur + trajectoire asserties, absence de tout libellé
  interprétatif assertée.
- T2 avant commit.

## Critères de done

- [ ] Une EVA se crée, se relit, s'assigne et se passe par la voie cabinet.
- [ ] Aucun seuil nulle part — garde vue rouge au débranchement.
- [ ] Resolver commun intact (ou arrêt nommé si impossible).
- [ ] T2 vert ; fragment écrit.
