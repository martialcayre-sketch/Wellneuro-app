---
id: "LOT-05"
titre: "Table de règles d'orientation V1 — remplir et signer"
statut: "livré — table refondue en 20 règles (#565) puis signée le 2026-08-04 (LOT-08)"
dépend_de: "LOT-03 + LOT-04"
palier: "T3"
---

# LOT-05 — Table de règles d'orientation V1 : remplir et signer

## But

Remplir `ORIENTATION_RULES_V1`, aujourd'hui vide, avec des règles sourcées sur
les fiches d'intervention, puis la signer pour que `tableSignee()` soit satisfait
— sans jamais contourner le double verrou.

## Ce qui existe déjà, et qu'on ne réécrit pas

| Pièce | État |
|---|---|
| `web/src/lib/clinical/orientationEngine.ts` | 303 lignes, testé, fonctionnel |
| `web/src/app/api/praticien/orientation/route.ts` | route lecture seule, fail-closed |
| `ORIENTATION_RULES_V1` | **tableau vide** — c'est ce lot qui le remplit |
| `ORIENTATION_METADATA` | `validationExterne: false`, `dateValidation: null`, `claimsSource: []` |

Le verrou reste ce qu'il est :

```ts
function orientationActive(): boolean {
  return process.env.WN_ENABLE_ORIENTATION_NNPP2 === '1' && tableSignee();
}
```

`tableSignee()` exige la validation **et** la date **et** au moins un claim
source. Remplir la table sans la signer ne l'ouvre pas.

## La matière n'est pas à inventer

Les fiches du registre LOT-00 énoncent déjà des conduites conditionnées à un
tableau clinique — « insomnie et troubles anxieux », « insomnie récente et stress
modéré », « dépression simple et inaugurale », « travail posté ». C'est la forme
même d'une règle d'orientation : une condition clinique, une conduite. 527 des
979 claims recensés sont prescriptifs.

## Résultat observable

`GET /api/praticien/orientation?idPatient=…` rend `actif: true` et des
recommandations non vides pour un patient de démonstration ayant répondu au pack
initial, avec le `sha256` de la table servie.

## Prérequis levé par le LOT-03

Jusqu'au 2026-08-03, remplir la table n'aurait rien produit : les `PackId` des
règles et les `id_pack` de la base formaient deux espaces disjoints, donc toute
recommandation de pack était rejetée par le fail-closed. La correspondance est
désormais en place et testée.

**Deux conséquences pour ce lot** : une règle ne peut cibler que les 6 packs
portant un `idPackBase` — un banc de `orientationRulesV1.test.ts` échoue sur toute
règle citant un pack sans existence en base. Et les 10 packs de doctrine restants
devront être créés en base avant d'être citables.

## Périmètre

- Écrire les règles V1 : condition sur les scores du pack initial **et** sur les
  drapeaux d'intake du LOT-04 ; cible = un pack ou une suite de questionnaires.
- Chaque règle cite ses `claimsSource` parmi les claims du registre LOT-00.
- Renseigner `ORIENTATION_METADATA` : `validationExterne`, `dateValidation`,
  `claimsSource`.
- Conserver le filtre d'administrabilité déjà posé par `#528` en aval du moteur.

## Arbitrage tranché au cadrage (PMI-6)

Les règles vivent **en code**, pas dans `pack_triggers`. Le modèle en base
existe et permettrait de modifier une règle sans déploiement — mais une règle
modifiable hors revue ne peut pas être couverte par la signature `sha256`, et
c'est la signature qui fait la gouvernance. Le geste de modification doit rester
une PR relue.

## Hors périmètre

- Toute auto-assignation : l'assignation reste le geste manuel existant.
- Toute exposition patient.
- Toute génération de recommandation par un modèle (voir LOT-06).
- Activer le flag `WN_ENABLE_ORIENTATION_NNPP2` en production sans validation
  clinique explicite du praticien.

## Fichiers probables

- `web/src/lib/clinical/orientationRulesV1.ts`
- `web/src/lib/clinical/orientationEngine.test.ts`, `orientationRulesV1.test.ts`
- `web/src/app/api/praticien/orientation/route.test.ts`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de contournement de `tableSignee()`.
- Pas de règle citant un claim non signé.
- Pas de refactor hors lot.

## Étapes

- [ ] Dériver les règles candidates depuis les fiches du registre LOT-00.
- [ ] Soumettre les règles à validation clinique praticien.
- [ ] Écrire la table et ses claims sources.
- [ ] Renseigner `ORIENTATION_METADATA` après validation.
- [ ] Vérifier le `sha256` et sa stabilité.
- [ ] `npm run test:worktree` (T3).

## Tests

- Table vide ou non signée → `actif: false`, message « en cours de constitution »,
  jamais une erreur.
- Règle citant un claim non signé → refusée par un garde.
- Recommandation visant un pack non administrable → filtrée (comportement `#528`).
- Le `sha256` change si et seulement si la table change.

## Critères de done

- [ ] La table est non vide, signée, et sert des recommandations. — **moitié
      atteinte** : non vide (6 règles), **non signée**, ne sert donc rien.
- [x] Chaque règle porte ses claims sources signés.
- [x] Aucune auto-assignation possible.
- [x] Revue adversariale `wn-reviewer` passée (deux passes, deux NO-GO levés).
- [ ] Validation clinique du praticien tracée par écrit. — **en attente**.

## Résultats

**Livré le 2026-08-03 par la PR #545 (commit `a3d3c29a`), volontairement non
signée.** Statut `livré_partiel` et non `livré` : écrire les règles et les signer
sont deux gestes, et le second est praticien.

- `ORIENTATION_RULES_V1` porte **6 règles** adossées à **9 claims `VALIDE`**
  vérifiés en base à la main le 2026-08-03 (`version_claim = 'v1.0'`,
  `prescriptif = true`, `active = true`). Aucun test unitaire n'ouvre
  `rag_corpus_claims` : le CI n'atteint que le **format** d'un `claimId`. Cette
  lecture est à refaire à chaque ajout de règle et **avant la signature**.
- `ORIENTATION_METADATA` reste `validationExterne: false`, `dateValidation: null`,
  `claimsSource: []` → `tableSignee()` est faux → **la route demeure fail-closed
  et ne sert aucune recommandation**.
- Le moteur sait lire les drapeaux d'anamnèse du LOT-04, qui n'avait jusque-là
  aucun consommateur.
- Trois arbitrages praticien : bande d'entrée choisie **instrument par
  instrument** (PSQI à `info`, PSS-10 et TFD à `warning`) ; `signauxAlerte` ne
  porte aucune règle — un signal d'alerte appelle un adressage, quand la table ne
  sait produire qu'une exploration ; une déclaration seule propose un instrument,
  jamais un pack.
- Quatre défauts silencieux corrigés : `OrientationZone` ignorait `dark` **et**
  `info` (le même trou aux deux bouts) ; une composition de pack inconnue était
  traitée comme autorisée ; la route retenait la consultation la plus récente, or
  une consultation naît sans anamnèse — les règles de drapeau se seraient tues
  dans la fenêtre exacte où le praticien regarde l'orientation.

**Ce qui reste à faire pour clore ce lot** : la relecture clinique des six règles
par le praticien, puis le renseignement de `ORIENTATION_METADATA` en PR relue.
Tant que ce geste n'a pas eu lieu, le LOT-06 ne peut afficher que l'état
« en cours de constitution ».
