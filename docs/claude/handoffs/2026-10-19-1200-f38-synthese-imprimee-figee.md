# Handoff — F38, synthèse imprimée figée et confirmation (2026-10-19 12:00)

## Branche et état Git

- Branche `f38-synthese-imprimee-figee`, tirée de `main` (892f0948, déployé :
  contient #1564). Worktree `bio-ingest-cloture`. Aucune migration.

## Objectif

Livrer les trois arbitrages du responsable du 2026-10-19 sur les restes de
F38, et consigner la validation des textes du portail.

## Décisions prises

- 1A — « vider » et « rejeter » une synthèse sont refusés (409,
  `synthese_imprimee_pour_medecin`) dès qu'une impression du document pour le
  médecin existe. Le contrôle et la mise à jour se font dans une transaction,
  sous `patients FOR UPDATE`, le verrou que l'impression prend aussi.
  « Valider », « annoter » et « enregistrer » n'entrent pas dans ce contrôle.
- 2A — constat en trois gestes : le responsable imprime, l'assistant relit et
  allume `WN_DOCUMENT_MEDECIN_PATIENT`, le responsable télécharge, l'assistant
  relit. Le drapeau reste allumé si tout concorde.
- 3A — `GET /api/praticien/documents` rend `portailDocumentMedecinOuvert`. Quand
  il vaut vrai, la confirmation d'impression ajoute « Le patient pourra le
  télécharger dans son espace pour le remettre lui-même. »
- Les textes du portail sont validés tels quels. La condition (1) du drapeau
  est levée.

## Fichiers modifiés

- `api/praticien/synthese/route.ts` et `route.manual.test.ts`.
- `api/praticien/documents/route.ts`, `DocumentsPanel.tsx` et son test.
- `textesDocumentMedecin.ts` (en-tête).
- `docs/FEATURE_FLAGS.md`, `docs/DECISIONS.md` (compléments à l'amendement de
  D-307), fragment changelog, `PLAN_WELLNEURO.md`, `SESSION_LOG.md`, ce
  handoff.

## Validations exécutées

- Vitest : `synthese` (16 fichiers, 231 tests), `DocumentsPanel` et
  `documents` (4 fichiers, 43 tests), verts.
- T1 vert. T2 (`--fast`) vert.

## Problèmes ouverts

- Le constat du drapeau attend l'impression du responsable sur un dossier de
  test.

## Prochaine action exacte

PR, CI, CodeRabbit, merge. Puis le constat en trois gestes. Une fois le
drapeau allumé, mettre à jour `docs/FEATURE_FLAGS.md` (preuves de pose) et le
registre RGPD.

## Interdits encore actifs

Rien vers un tiers ([[D-307]] §4) ; production en lecture par conteneur
seulement ; le drapeau n'est allumé qu'après l'impression constatée ; aucune
identité réelle dans le dépôt.
