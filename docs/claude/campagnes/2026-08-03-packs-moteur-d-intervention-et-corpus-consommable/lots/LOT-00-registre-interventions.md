---
id: "LOT-00"
titre: "Registre des sources d'intervention NNPP2"
statut: "à_faire"
dépend_de: "aucun"
palier: "T1"
---

# LOT-00 — Registre des sources d'intervention NNPP2

## But

Désigner, sous forme d'artefact versionné, l'ensemble des sources qui portent des
conduites d'intervention NNPP2 — fiches de synthèse, ordonnances commentées,
fiches protocole, prises en charge. Aujourd'hui elles existent en base mais
aucune pièce du code ne sait que `WN-SRC-0313` est une fiche d'intervention et
non un support de cours.

## Résultat observable

`docs/claude/corpus/nnpp2_interventions_registry.json` existe, décrit chaque
source retenue, et un garde échoue si une entrée référence un `sourceId` absent
de `source_registry.json`.

## Périmètre

- Partir des 48 sources inventoriées (`INVENTAIRE_SOURCES_INTERVENTION.md`) et
  **les revoir pièce à pièce**. Le titre a servi à l'inventaire ; il ne décide
  pas du classement.
- Chercher les sources d'intervention que l'intitulé n'a pas attrapées — l'écart
  entre 11 notebooks couverts et 13 existants est un indice à instruire.
- Pour chaque entrée retenue : identifiant d'axe stable, `sourceId`, notebook,
  tableau clinique visé, nombre de claims et statut de validation, et la mention
  explicite de ce que la source **ne couvre pas**.
- Trancher la question ouverte des 12 « protocole assiette » (NB09) : couche
  d'orientation questionnaires, ou couche protocole distincte ?

## Hors périmètre

- Écrire la moindre règle d'orientation (c'est le LOT-05).
- Valider un claim (c'est le LOT-01).
- Toucher aux 64 instruments ou à leur scoring.

## Fichiers probables

- `docs/claude/corpus/nnpp2_interventions_registry.json` (créé)
- `scripts/check_nnpp2_interventions.js` ou extension d'un garde existant
- `docs/claude/corpus/README.md` (mention du nouvel artefact)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni écriture Supabase.
- Pas de classement d'une source sur son seul intitulé de fichier.
- Pas de refactor hors lot.

## Étapes

- [ ] Relire les 48 sources et statuer sur chacune (retenue / écartée / à instruire).
- [ ] Chercher les sources d'intervention hors motif de titre.
- [ ] Définir le schéma du registre et le remplir.
- [ ] Écrire le garde d'intégrité (référence croisée avec `source_registry.json`).
- [ ] Trancher le cas des « protocole assiette » et le documenter.
- [ ] `npm run check`.

## Tests

- Garde d'intégrité : une entrée pointant un `sourceId` inconnu fait échouer.
- Garde d'intégrité : un axe sans source fait échouer.

## Critères de done

- [ ] Chaque source retenue porte un axe, un notebook et un statut.
- [ ] Chaque source écartée porte un motif écrit.
- [ ] Le garde tourne dans `npm run check` et passe.
- [ ] La décision sur les « protocole assiette » est tracée dans `CAMPAGNE.md`.

## Résultats

À compléter à la clôture.
