### Technique

- **Catalogue clinique : `@ts-nocheck` levé sur les 17 fichiers** (5 286
  lignes, chantier 5 du lot G-TRUST-04). Mesure préalable consignée au lot :
  1 560 erreurs, dont 1 425 tenaient au seul `meta` non-optionnel des
  fabriques. Le juge de certification transpile désormais le TypeScript avant
  son eval (prouvé neutre sur catalogue inchangé) — c'est lui qui verrouillait
  les pragmas. Types seuls, zéro changement d'émission : fabriques `q/qn/qs`
  signées, `Question.groupe` et `QuestionOption.v: number | string`
  documentent des réalités du catalogue, moteur de scoring en `any` explicites
  (51) — les juges du comportement restent la certification des
  63 questionnaires et les tests de scoring, tous verts.
- **Deux clés dupliquées de `QUESTIONNAIRE_CATALOGUE` dédoublonnées**
  (Q_NEU_04 SCOFF, Q_NEU_08 ECAB) en conservant le gagnant runtime — la
  version morte, écrasée à la construction de l'objet, ne peut plus être
  éditée par erreur. Certification inchangée.
