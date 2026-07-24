### Ajouté

- **Synthèse IA en streaming (préparation Scalingo).** La génération
  (`POST /api/praticien/synthese`) peut répondre en **SSE** derrière le flag
  `WN_SYNTHESE_STREAM` (défaut **off** = transport JSON historique, Vercel
  inchangé). Un octet précoce + des heartbeats tiennent le routeur Scalingo
  (30 s premier octet, 59 s glissant), là où l'appel Anthropic bloquant de
  15–40 s se ferait couper. La génération et la persistance sont **identiques**
  aux deux transports ; en SSE, l'appel Anthropic est borné (2 min, 1 reprise).
  Le client (`SynthesePanel`) détecte le type de réponse et lit le flux via
  `lib/sse/readEventStream`. Tests : helper SSE (découpes de chunk) + route
  (gardes, JSON, SSE done/error).
