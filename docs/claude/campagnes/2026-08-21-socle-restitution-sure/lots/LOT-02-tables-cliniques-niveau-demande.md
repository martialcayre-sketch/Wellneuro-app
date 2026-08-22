---
id: "LOT-02"
statut: "terminé (2026-08-22) — huit fichiers en demande, banc neuf 36 cas, relecture adversariale ACCEPTER (évitement par segments refermé), en-tête corrigé sous D-083 ; mesuré : le sha couvre les données, pas le texte — pas de ré-épinglage"
dépend_de: "aucun"
---

# LOT-02 — Les tables cliniques s'écrivent au niveau « demande » — et l'en-tête cesse de mentir

## But

À la fin de ce lot, modifier une ligne d'une table clinique signée ou d'une
constante clinique déclenche le verdict « demande » du hook
`protect-wellneuro-files.mjs` — la confirmation `DC-17`/`DC-18` est
matérialisée par un clic, plus jamais supposée. Aujourd'hui le niveau
« demande » ne couvre que `prisma/` (`protect-wellneuro-files.mjs:49-53`) :
une table signée s'édite en silence.

Dans le même lot, l'en-tête d'`orientationRulesV1.ts` cesse de décrire un
pipeline qui n'a jamais existé — dette **encore ouverte**, contrairement à ce
que le brief croyait (voir CAMPAGNE.md, état réel).

## La liste mesurée (2026-08-22, re-mesurée après #734)

À couvrir au niveau « demande » — jamais « refus » :

| Fichier | Signature |
|---|---|
| `web/src/lib/clinical/orientationRulesV1.ts` | `validationExterne: true` (:1450) |
| `web/src/lib/clinical/stopRulesV1.ts` | `validationExterne: true` (:238) |
| `web/src/lib/clinical/priorityRulesV1.ts` | `validationExterne: true` (:371) |
| `web/src/lib/clinical/contradictionsV1.ts` | `validationExterne: true` (:212) — **omise par le brief** |
| `web/src/lib/biology-library/indicationsBiologieV1.ts` | `validationExterne: true` (:537, `D-061`) — **omise par le brief** |
| `web/src/lib/clinical/corpusSyntheseV1.ts` | `validationExterne: true` (:65) — **signée pendant l'ouverture même de cette campagne** (`D-082`, PR #734 du 2026-08-22), ancrée `shaPerimetre` le même jour (`D-084`) |
| `web/src/lib/equilibre/constants.ts` | non signée — constantes cliniques `D-014`/`D-055` (`DC-17` vaut sans signature) |
| `web/src/lib/questions.ts` | non signée — cotations et libellés sous `D-014`/`D-055`/`D-060` |

Candidat à trancher **au lot**, en un mot avec le responsable :
`stopRulesLibelles.ts` (compagnon des stop rules, non signé séparément).
*(Sort à la clôture : non tranché — consigné au fragment `changelog.d/` avec
les deux candidats découverts par la relecture adversariale
(`questionnaires/alimentaire.ts`, fixture `chaineC1Fixture`) ; arbitrage
responsable pendant, le banc a un cas « silence » qui rougira à l'ajout.)*

## Le mécanisme, tel qu'il est

Le hook matche par `normalized.includes(motif)` sur le chemin **minuscule**
(`:33,56,67`) et rend le verdict « demande » par JSON
`permissionDecision: "ask"` + `exit 0` (`:66-83`). Conséquences : motifs en
minuscules, et **assez longs pour ne matcher qu'eux** — `includes()` sans
ancrage ferait d'un motif court un filet trop large.

## L'en-tête d'`orientationRulesV1` — un geste clinique, pas un fix de doc

- `orientationRulesV1.ts:11-12` affirme que la table « est régénérée par
  `tools/corpus/orientation/` (lot 9) » — le répertoire n'existe pas et n'a
  jamais existé (audit doctrine §E ; `D-042` a posé un banc de fraîcheur en
  **compensation**, elle n'a pas ordonné la correction).
- Le fichier est au **sha épinglé** (`SHA_SIGNE`, discipline `D-018`) : un
  diff de commentaire fait rougir le banc. La correction passe donc le circuit
  clinique entier — **décision `D-xxx` prise au lot avec le responsable**,
  fragment `changelog.d/`, re-épinglage du sha dans le même commit, et rien
  d'autre ne bouge dans le fichier.
- *(Corrigé à l'exécution, mesure du 2026-08-22 :* le sha épinglé couvre
  `sha256(JSON.stringify(ORIENTATION_RULES_V1))` — **les données, pas le
  texte du fichier**. Un diff de commentaire ne le fait PAS rougir : 61/61
  vert sans ré-épinglage. La décision `D-083` et le fragment restent requis —
  c'est la doctrine `DC-17`, pas le sha, qui l'exige.)*

## Périmètre

- `.claude/hooks/protect-wellneuro-files.mjs` — ajout des motifs « demande ».
- Son banc (`.claude/hooks/*.test.mjs`) — un cas par motif ajouté, et la
  preuve qu'aucun verdict existant n'a bougé.
- `web/src/lib/clinical/orientationRulesV1.ts` — l'en-tête seul, sous `D-xxx`.
- `web/src/lib/clinical/orientationRulesV1.test.ts` — le sha ré-épinglé.

## Interdits

- **Jamais « refus »** pour ces fichiers : le niveau « demande » matérialise
  la confirmation, il n'interdit pas le travail.
- N'abaisser aucun verdict existant, ne retirer aucun motif, ne toucher ni
  `block-risky-commands.mjs` ni `guard-supabase-mcp.mjs`.
- Aucune modification du **contenu** des tables (règles, seuils, poids,
  libellés) — l'en-tête d'`orientationRulesV1` est l'unique exception, et
  seulement son commentaire.

## Dépendances

Aucune.

## Tests

- Banc des hooks : `node --test .claude/hooks/*.test.mjs` — chaque motif
  ajouté a son cas « demande », les cas existants inchangés.
- Mutation à l'œil avant de conclure : une édition d'essai d'une table
  couverte déclenche réellement la demande (puis s'annule).
- Sha d'`orientationRulesV1` ré-épinglé : suite clinique verte.
- T2 avant commit.

## Critères de done

- [ ] Les huit fichiers déclenchent « demande » ; prouvé par banc + essai réel.
- [ ] Aucun verdict existant modifié (banc complet vert, relecture
      adversariale du diff de hook faite avant merge).
- [ ] L'en-tête ne mentionne plus le pipeline inexistant ; `D-xxx` consignée,
      fragment `changelog.d/` posé, sha ré-épinglé.
- [ ] Le candidat `stopRulesLibelles` tranché et son sort écrit ici.
- [ ] T2 vert ; fragment `changelog.d/` du lot écrit.
