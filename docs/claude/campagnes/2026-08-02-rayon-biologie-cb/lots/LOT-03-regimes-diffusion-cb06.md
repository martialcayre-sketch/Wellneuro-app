---
id: "LOT-03"
titre: "regimes-diffusion-cb06"
statut: "à_faire"
dépend_de: "LOT-02 (CB-05)"
---

# LOT-03 (CB-06) — Régimes de diffusion (courrier médecin / document patient)

## But

Implémenter les deux régimes strictement séparés de la proposition
d'exploration signée : remboursé → courrier médecin (fil C3, texte seul) ;
non remboursé → document patient systématique. IA en aval, bornée aux
candidats retenus et signés.

## Résultat observable

- Régime **remboursé** : génération d'un courrier au médecin traitant via le
  fil C3 existant (texte seul, mur HDS respecté) — le médecin seul prescrit.
- Régime **non remboursé** : document remis au patient systématiquement
  (décision F du cadrage), y compris quand le laboratoire n'exige rien.
- Chaîne de diffusion : Relu → Validé → Envoyé, identique au patron existant.
- L'IA rédige l'argumentaire **en aval uniquement**, bornée aux candidats déjà
  retenus et signés par le praticien (patron du lot 11 certification) ; elle ne
  choisit aucune analyse, ne fixe aucune priorité, ne génère jamais un artefact
  ressemblant à une ordonnance.

## Périmètre

- Génération de document (courrier médecin, document patient) à partir d'une
  `BiologyExplorationProposal` signée (CB-05).
- Intégration au fil de correspondance C3 existant (texte uniquement, jamais
  de pièce biologique).
- Vocabulaire imposé : jamais « prescription », « ordonnance », « diagnostic ».

## Hors périmètre

- La machine à états elle-même (CB-05, déjà faite).
- Le contrat protocole V4 (CB-07).
- L'UI de déclenchement (CB-08).

## Fichiers probables

- `web/src/lib/correspondance-medecin/**` (fil C3 existant, à réutiliser)
- `web/src/lib/biology-library/diffusion/**` (nom indicatif, nouveau)
- Modèles de document existants (patron C3, fiches contextuelles)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Aucune migration sauf si strictement nécessaire pour le statut de diffusion
  (dans ce cas : confirmation explicite distincte avant exécution).
- Jamais de pièce biologique transportée par le courrier C3.
- Pas de vocabulaire prescriptif en surface.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier les hypothèses (fil C3 existant, patron de diffusion Relu→Validé→Envoyé).
- [ ] Implémenter le changement minimal pour les deux régimes.
- [ ] Brancher la rédaction IA en aval, bornée aux candidats signés.
- [ ] Exécuter les validations (T2).
- [ ] Relire le diff (vocabulaire, mur HDS).
- [ ] Documenter les résultats.

## Tests

- T2 avant tout commit.
- Tests : un candidat non signé n'est jamais transmis à l'IA de rédaction ;
  aucune valeur biologique ne transite par le courrier C3 ; le vocabulaire
  interdit est absent des templates.

## Critères de done

- Les deux régimes fonctionnent et sont testés séparément.
- Revue du vocabulaire de surface faite.

## Résultats

À compléter à la clôture.
