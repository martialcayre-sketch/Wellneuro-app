---
id: "LOT-01"
titre: "Garde-fous de synthèse et moteur de contradictions"
statut: "en_cours"
dépend_de: "LOT-00"
---

# LOT-01 — Garde-fous de synthèse et moteur de contradictions

## But

Plus aucune causalité affirmée ni faux niveau de certitude en sortie LLM ; les
discordances entre instruments sont détectées par le déterministe et imposées à
la synthèse comme vigilances non censurables.

## Résultat observable

Sur la fixture golden case : la synthèse porte les vigilances C-STR et C-SOM en
formulation neutre (« signal fonctionnel non confirmé par les instruments
spécifiques — à clarifier en entretien »), ne contient ni causalité depuis un
score DNST ni promotion d'un facteur de risque en alerte médicale ; une sortie
hors schéma est rejetée et retentée, jamais servie dégradée.

## Périmètre

- Prompt `synthese-v20` (`web/src/lib/anthropic.ts`) : interdit général de
  causalité ; taxonomie facteur de risque ≠ symptôme ≠ dépistage ≠ risque
  global ; consigne de restitution neutre des discordances ; section « axes
  rassurants » dans `resume_praticien`.
- Validation de sortie stricte : schéma fermé, énumérations contrôlées, rejet +
  une relance (remplace la coercion de `validateSyntheseSchema`).
- Moteur de contradictions déterministe (patron orientation : table versionnée +
  claims + signature + SHA) produisant des `DiscordanceFinding` — trois règles
  V1 : C-STR (adaptation effondrée vs DASS normal), C-SOM (DNST mélatonine vs
  PSQI/Epworth/Berlin/plainte rassurants), C-ALI (restriction déclarée vs
  plainte pondérale élevée).
- Injection : vigilances déterministes de la synthèse (fusion en tête
  existante) + panneau discordances du cockpit (`MissingDataPanel`).
- Persistance : SHA-256 du prompt système + `inputHash` sur `SyntheseIA`.
- Marquage de la passation courante par instrument dans le bloc transmis au
  prompt (renvoi du LOT-00, point 3) : les passations antérieures **restent
  transmises** — l'évolution entre deux enquêtes d'un même instrument est un
  signal clinique — mais la plus récente `VALID` est nommée comme telle. L'écart
  à corriger est l'absence de repère, pas le nombre de lignes : aucun `distinct`,
  aucune suppression.

## Hors périmètre

- Hypothèses cliniques persistées (backlog P2).
- Régénération de synthèses passées.
- Modification des seuils des instruments.

## Fichiers probables

`web/src/lib/anthropic.ts:211-461`,
`web/src/app/api/praticien/synthese/route.ts:276-286,313-453`,
nouveau `web/src/lib/clinical/contradictionsV1.ts` (+ engine/service au patron
de `orientationRulesV1.ts`), `web/src/lib/clinical-engine/types.ts:199-207`,
`web/src/components/patient-cockpit/MissingDataPanel.tsx`,
`web/prisma/schema.prisma` seulement si `inputHash` exige une colonne
(migration séparée, sinon champ JSON existant).

## Interdits

- Le LLM ne produit jamais une contradiction : il restitue celles du
  déterministe.
- Aucune vigilance déterministe supprimable par la sortie LLM.
- Pas de nouveau few-shot contenant des données patient.

## Dépendances

LOT-00 (les contradictions ne raisonnent que sur passations `VALID`).

## Étapes

1. Table de contradictions + moteur + tests unitaires (bump de version signé).
2. Prompt v20 + garde d'empreinte (patron `promptAlimentaire.guard.test.ts`).
3. Schéma de sortie strict + chemin de rejet/relance audité.
4. Injection vigilances + cockpit.
5. Marquage de la passation courante par instrument dans le bloc de synthèse.

## Tests

- Régressions sections 57 (mélatonine non suggérée, contradiction produite) et
  58 (pas d'alexithymie, question d'entretien générée) de la spec.
- Rejeu des entrées d'une synthèse de référence ⇒ absence des formulations
  proscrites (liste dans la spec §F).
- Non-fuite `narratif_patient` : aucun score, aucun axe DNST nommé, vocabulaire
  anxiogène absent (`documents/vocabulaire.ts`).
- Deux passations `VALID` du même instrument ⇒ les deux partent au prompt, une
  seule est marquée courante (banc de non-régression du renvoi LOT-00).
- T2 avant commit.

## Done

- Critères 1-4 du Lot B de `sources/02-spec-lots-parcours-t0.md`.
- Fragment `changelog.d/` (bump prompt + nouvelles vigilances).
