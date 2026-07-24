### Atelier corpus — réponse notebook collée + verdict IA proposé (voie rapide) (2026-07-24)

La restitution de la voie rapide reposait sur une auto-restitution RAG (nos
propres claims rejoués), verdict posé à la main. Décision praticien du
2026-07-24 : verser la réponse d'un **notebook externe** (NotebookLM, sans API)
et faire **proposer** le verdict par l'IA — sans jamais retirer la main au
praticien.

- **Réponse notebook collée** (`AtelierVoieRapideModale.tsx`) : chaque question
  du questionnaire de restitution porte désormais un champ éditable où le
  praticien colle la réponse produite par NotebookLM. Éditer la réponse
  réinitialise le verdict et la justification (on repart neutre).
- **Verdict proposé par l'IA, confirmé par le praticien** : le bouton « Faire
  évaluer par l'IA » confronte la réponse collée aux claims validables de la
  source (`lib/rag/claims/evaluation.ts`, Claude via l'API Anthropic, patron de
  `questionnaire.ts`) et **pré-remplit** « conforme / non_conforme » + une
  justification. Le praticien peut confirmer ou trancher autrement : le verdict
  retenu reste son acte (D-003, « le verdict de conformité reste un acte
  praticien, jamais un seuil automatique »). L'évaluation n'écrit aucun état.
- **Couverture inchangée, portée par les claims cités** : chaque question
  générée porte désormais son `chunkId` et ses `claimsCites` (issus de la
  génération, 1 question ↔ 1 chunk). La porte de signature serveur
  (`revue.ts` `deciderLot`) est **inchangée** : elle revérifie la couverture à
  partir des `claimsCites` du questionnaire, pas de l'ancienne restitution RAG.
  Les questions libres d'appoint (sans claims cités) restent hors du lot signé.
- **Nouvelle route** `POST /api/praticien/corpus/claims/evaluation`
  (`{ sourceId, question, reponse, claimsCites? }`), praticien seul,
  `maxDuration = 120`, n'écrit rien.
- **Fonctions pures testées** (`evaluation.test.ts`, 8 cas) : le contrat de
  sortie du juge (verdict énuméré + justification bornée non vide) est validé
  sans réseau ; une sortie hors contrat est refusée, jamais « nettoyée » en
  silence. Le client Prisma est importé paresseusement pour garder ces tests
  exécutables sans base (T1).

L'ancienne auto-restitution RAG (« Jouer sur le corpus ») est retirée de la
modale ; la route `…/claims/recherche` reste en place, inutilisée par cet écran.
