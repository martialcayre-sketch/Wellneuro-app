---
id: "LOT-07"
titre: "Reliquat de certification — bibliographie et psychométrie"
statut: "à_faire"
dépend_de: "aucun"
palier: "T1"
---

# LOT-07 — Reliquat de certification : bibliographie et psychométrie

## But

Solder ce qui reste vraiment de la certification des questionnaires, et écrire
noir sur blanc ce que le mot « certifié » recouvre — et ce qu'il ne recouvre pas.

## Le constat

La campagne de certification est close (`#528`) et le score-check est vert. Mais
le vert porte sur le **calcul**, pas sur l'instrument :

| Champ | État au 2026-08-03 |
|---|---|
| `statutBibliographique: a_completer` | 11 entrées sur 64 |
| `cosmin` | `inconnu` sur les 64 |
| `measurement_evidence.json` | 0 étude |

`statutCertification: scoring_verifie` (60 entrées sur 64) atteste que le scoring
a passé le banc `certify`. Un lecteur pressé y lira « instrument validé ». Rien,
aujourd'hui, ne l'en empêche.

## Résultat observable

- Les 11 entrées `a_completer` portent une référence ou un motif écrit
  d'impossibilité.
- La documentation de gouvernance distingue explicitement scoring vérifié et
  validité psychométrique.

## Périmètre

- Compléter les 11 entrées `statutBibliographique: a_completer` de
  `docs/claude/corpus/instrument_registry.json`.
- Renseigner `cosmin` là où une preuve existe ; laisser `inconnu` et le dire
  ailleurs.
- Amorcer `measurement_evidence.json` avec les études effectivement trouvées.
- Écrire la distinction dans `docs/gouvernance-questionnaires-scoring.md`.

## Hors périmètre

- Toute modification de scoring, de seuil ou d'interprétation.
- Toute réouverture de `Q_GEO_04` ou `Q_PED_03`.
- Toute promotion de statut de certification sur la seule foi d'une référence
  bibliographique.

## Fichiers probables

- `docs/claude/corpus/instrument_registry.json`
- `docs/claude/corpus/measurement_evidence.json`
- `docs/gouvernance-questionnaires-scoring.md`
- `scripts/check_questionnaire_certification.js`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de référence inventée : une entrée sans preuve reste `a_completer` avec son
  motif.
- Pas de changement de logique clinique.
- Pas de refactor hors lot.

## Étapes

- [ ] Lister les 11 entrées et ce qui manque à chacune.
- [ ] Chercher les références ; consigner les impasses comme telles.
- [ ] Amorcer `measurement_evidence.json`.
- [ ] Écrire la distinction scoring / psychométrie dans la gouvernance.
- [ ] `node scripts/check_questionnaire_certification.js` puis `npm run check`.

## Tests

- Le score-check reste vert sur les 64.
- Une entrée `a_completer` sans motif écrit fait échouer le garde.

## Critères de done

- [ ] Les 11 entrées sont complétées ou motivées.
- [ ] La distinction est écrite dans la gouvernance.
- [ ] Aucun statut de certification n'a été promu.

## Résultats

À compléter à la clôture.
