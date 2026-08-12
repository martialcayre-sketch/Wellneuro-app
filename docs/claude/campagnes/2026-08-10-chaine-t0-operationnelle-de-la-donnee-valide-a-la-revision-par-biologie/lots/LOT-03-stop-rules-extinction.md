---
id: "LOT-03"
titre: "Règles d'arrêt et extinction d'orientation"
statut: "en_cours"
dépend_de: "LOT-01"
---

# LOT-03 — Règles d'arrêt et extinction d'orientation

## But

Le moteur sait dire « information suffisante — pas d'exploration supplémentaire
actuellement » : les recommandations s'éteignent quand les instruments
spécifiques sont rassurants, au lieu de rester allumées indéfiniment.

## Résultat observable

Sur la fixture : DASS + Cungi rassurants ⇒ HAD et PSS-10 éteints avec motif
visible dans le cockpit et la synthèse ; instruments déjà renseignés non
re-proposés ; le SCOFF est proposé sur restriction déclarée + plainte pondérale
élevée ; une donnée nouvelle qui rallume le déclencheur fait réapparaître la
recommandation.

## Périmètre

- Table `ClinicalStopRule` (patron orientation : versionnée, claims, signature,
  SHA) — V1 : STOP-STR (DASS + Cungi rassurants ⇒ éteindre les règles stress et
  le HAD proposé par cette voie), STOP-SOM (instruments sommeil spécifiques
  rassurants ⇒ clore l'axe), STOP-APN (dépistage faible + somnolence normale +
  absence de symptômes ⇒ « surveillance simple, réévaluer si évolution »).
- Effet dans `orientationEngine` : extinction de règles nommées + motif servi ;
  restitution dans la synthèse (bloc orientation existant) et le cockpit.
- `dejaRepondu` devient **excluant** (aujourd'hui décoratif).
- Ajout du SCOFF (`Q_NEU_04`) à la table d'orientation, avec claim justificatif
  (via l'atelier corpus — le lot branche, il n'invente pas le claim).

## Hors périmètre

- Information gain / charge patient chiffrée (backlog P2).
- Aucun changement de seuil des instruments existants.

## Fichiers probables

`web/src/lib/clinical/orientationRulesV1.ts` (bump signé),
`web/src/lib/clinical/orientationEngine.ts:610-804`,
`web/src/lib/clinical/orientationService.ts`,
nouveau `web/src/lib/clinical/stopRulesV1.ts`,
`web/src/app/api/praticien/synthese/route.ts:176-211` (bloc orientation),
`web/src/components/patient-cockpit/OrientationPanel.tsx`.

## Interdits

- Une extinction n'efface jamais l'historique : la recommandation éteinte reste
  relisible avec son motif.
- Pas d'extinction sur données `INVALID`/`SUPERSEDED` (LOT-00) ni sur recueil
  partiel non fermé.
- Toute modification de la table d'orientation re-signe la table (métadonnées +
  SHA), sinon le double verrou fail-closed doit refuser de servir.

## Dépendances

LOT-01 (patron des tables versionnées partagé, contradictions comme entrée des
stop rules). Parallélisable avec LOT-02/LOT-04.

## Étapes

1. Table stop rules + moteur + tests unitaires.
2. Extinction dans l'engine + motifs.
3. `dejaRepondu` excluant + test de non-régression sur les états d'antériorité.
4. SCOFF au catalogue de règles (claim requis) + bump signé.

## Tests

- Extension section 58 : DASS+Cungi rassurants ⇒ extinction motivée.
- Rallumage : nouvelle passation dégradée ⇒ la recommandation revient.
- Aucune règle sans claim ne recommande ni n'éteint.
- T2 avant commit.

## Done

- Critères du Lot J de `sources/02-spec-lots-parcours-t0.md`.
- Fragment `changelog.d/` (changement de comportement d'orientation).
