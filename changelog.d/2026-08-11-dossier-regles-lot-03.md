### Dossier de règles candidates LOT-03 : moteur de propositions de parcours (préparation, sans D-xxx)

La première question d'ouverture de LOT-03 (« liste des règles candidates et
leurs claims ») est instruite dans
`docs/claude/campagnes/2026-08-10-chaine-alimentaire/DOSSIER_REGLES_LOT-03.md`.
Sur la forme conditionnelle exhaustive — une proposition alimentaire énoncée
sous une condition — **46 claims-charnières `VALIDE`** du corpus
(`rag_corpus_claims`) sont attribués un par un, avec leur proposition et leur
condition **verbatim**.

Le dossier ancre le lot sur la **branche perdue de `R2-ALI-01`** :
`WN-CL-0287-009` propose « l'assiette de détoxication » lorsque l'enquête
alimentaire SiiN est défavorable, mais le moteur d'orientation, ne sachant
proposer qu'un questionnaire, l'abandonne — c'est précisément le parcours que
LOT-03 sait porter. Les candidats sont scindés en **groupe A déclenchable au
tour 1** (signaux questionnaires / agenda / anamnèse : assiette détox,
psychobiotique, sérotoninergique, régime histamine, éviction gluten, épargne
digestive, alimentation mixée) et **groupe B à déclencheur biologique**
(CRP, HOMA, vitamine D, fer… → pont vers la révision biologie, hors moteur).

**Aucune décision `D-xxx`, aucun code, aucune migration.** Réserves de
gouvernance nommées : **16 claims porte-seuil** en revue individuelle, usage
« parcours » non marqué en base (à trancher au `D-xxx`, source par source),
typologie `interprété` qui documente sans forcément porter la décision. Le
découpage du lot (table de règles versionnée, objet parcours en migration
séparée, bump de synthèse v19→v20, surface praticien) reste inchangé et gaté.
