### Moteur d'orientation NNPP2 — sombre, table vide (2026-07-25)

Campagne « certification corpus des questionnaires », lot 7. Ossature complète
de l'orientation des explorations, livrée éteinte.

`web/src/lib/clinical/orientationRulesV1.ts` : table de règles versionnée, vide
en v1, avec la discipline sha-256 et `validationExterne:false` du corpus de
synthèse. Une règle porte des déclencheurs multiples en ET (zones ou
comparaisons), des suggestions au grain questionnaire (priorité, objectif)
et/ou pack — le type impose au moins une cible —, les besoins visés, un statut,
et ses claims justificatifs.

`orientationEngine.ts` (pur, testable) : scores stockés → déclencheurs →
recommandations agrégées, avec motifs traçables, drapeaux factuels
déjà-assigné / déjà-répondu (`null` quand le fait est inconnu, jamais présenté
comme négatif), tri déterministe et invariants de doctrine **vérifiés, pas
seulement annoncés** — une règle sans claim justificatif ne recommande rien, et
les droits/la certification forment un filtre dur qui écarte un pack entier dès
qu'un de ses membres connus est non administrable.

`GET /api/praticien/orientation?idPatient=` : double verrou fail-closed
(`WN_ENABLE_ORIENTATION_NNPP2` **et** table réellement signée — validation
externe, date et claims), garde d'appartenance et journal des accès. Le verrou
précède toute lecture du dossier : en mode sombre, la route ne distingue pas un
patient inexistant de celui d'un autre praticien.

Tant que les claims d'orientation des fiches NNPP2 ne sont pas validés dans
l'Atelier corpus puis compilés (lots 8–9), la route répond « orientation en
cours de constitution ». Rien n'est jamais auto-assigné : la recommandation
reste une proposition au praticien. 35 tests (moteur, verrou épinglé, route).
