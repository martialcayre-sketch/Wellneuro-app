# Handoff — BIO-INGEST : D-267, décision préalable au LOT-07

## Branche et état Git

`docs/bio-ingest-d267-faits-du-laboratoire`, depuis `main` 82395d0d. PR de
doc, une seule finalité : la décision du gate G1.

## Objectif

Poser la décision qui autorise la migration du LOT-07 (faits du laboratoire).

## Décisions prises

- `D-267` acceptée : intervalle et marquage imprimés transcrits verbatim sur
  `LigneBiologiqueCandidate` (`intervalle_lu`, `marquage_lu`, nullables),
  jamais sur `ResultatBiologique` (`D-256` A5 intact) ; ils survivent à la
  purge (`D-258`) ; consigne d'extraction amendée, `bio-extraction-v2` ;
  `D-157` précisée (fait du dossier ≠ référentiel, juxtaposé, attribué).
- Arbitrages de session : noms français des colonnes ; exemption bornée de
  la sentinelle au seul élément portant le marquage brut ; « Vos données
  personnelles » reste v12, `usage_ia` passe v5 sans accusé.
- Un résultat corrigé n'hérite pas des faits ; unité discordante ⇒ silence.

## Fichiers modifiés

`docs/DECISIONS.md`, fiche `LOT-07-faits-du-laboratoire.md`,
`changelog.d/2026-10-05-bio-ingest-d267-faits-du-laboratoire.md`,
`.wn/state.json` (`recent_decision_ids`).

## Validations

`npm run check` vert (267 décisions, sans trou ni doublon).

## Problèmes ouverts

- Cadrage directeur BioFlow remis par le responsable le 2026-10-05 (Track C
  BIO-PRESCRIPTION, axes au lieu de packs, gel des nouveaux packs cliniques).
  Son §35 « Décision directrice » est arrivé vide. Audit en lecture seule en
  cours ; aucune migration ni suppression avant lui.

## Prochaine action exacte

Merge de D-267, vérification de `main`, puis migration seule du LOT-07
(colonnes + CHECK de forme, sans `btrim/1`), passe Codex, `release-db`.

## Interdits encore actifs

- Pas de code LOT-07 avant la migration appliquée et constatée.
- Rien sur `ResultatBiologique` ; aucune borne dérivée.
- `bio-extraction-v2` jamais déployé avant `usage_ia` v5 constatée.
- Aucune identité réelle ; aucun nom de praticien ou de patient des modèles
  de documents cités par le cadrage BioFlow.
