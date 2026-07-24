### Ajouté

- **Questionnaire de restitution du corpus en streaming (préparation
  Scalingo).** La génération (`POST /api/praticien/corpus/claims/questionnaire`,
  appels LLM parallèles, `maxDuration: 120`) peut répondre en **SSE** derrière
  le flag `WN_CLAIMS_QUESTIONNAIRE_STREAM` (défaut **off** = transport JSON
  historique, Vercel inchangé). Un octet précoce + des heartbeats tiennent le
  routeur Scalingo (30 s premier octet, 59 s glissant), là où la génération
  d'une source à nombreux chunks se ferait couper. Le résultat est **identique**
  aux deux transports (même payload `CorpusQuestionnaireApiResponse`, y compris
  le cas métier « aucune question ») ; en SSE, le travail est borné (2 min) par
  un `AbortSignal` qui annule les appels LLM en vol. Le client
  (`AtelierVoieRapideModale`) détecte le type de réponse et lit le flux via
  `lib/sse/readEventStream`. Tests : route (gardes, JSON, SSE done/error).
