# Handoff — test des convergences D-495 : horloge figée (2026-11-26 21:43)

## 1. Branche et état Git

- Branche `worktree-fix-horloge-contradictions-d495`, worktree
  `.claude/worktrees/fix-horloge-contradictions-d495`, partie de `origin/main`
  `7c1a9c59` (#2372).
- Un commit : test, fragment `changelog.d/`, ce handoff. PR ouverte par
  l'intégrateur H89, qui la merge lui-même et suit le `release-db`.

## 2. Objectif

Remettre au vert le CI de toutes les PR. Depuis le 2026-11-26 à 10 h UTC, le
cas « D-495 : corpus lisible — la convergence sort et rien n'est signalé » de
`web/src/lib/clinical/contradictionsService.test.ts` échoue à coup sûr
(attendu `['CONV-B5']`, reçu `[]`). Signalé par la file B (message de registre
`20261126-2005-b`, constaté sur #2378). Correctif choisi par le responsable en
séance (« Je corrige »).

## 3. Décisions prises

- Cause : `contradictionsDetailleesPourPatient` lit `Date.now()`
  (`contradictionsService.ts`, appel à `constatsContradictionsPourDossier`).
  La réponse de fixture Q_MOD_01, datée du 2026-11-05 à 10 h UTC, sort de sa
  fenêtre de fraîcheur de 21 jours (`FENETRES_FRAICHEUR_ORIENTATION`) le
  2026-11-26 à 10 h UTC.
- Correctif dans le test seul : `serviceStocke` fige `Date` à `MAINTENANT`
  (2026-11-07 à 12 h UTC), la constante que les autres cas du bloc passent
  déjà au service, avec `vi.useFakeTimers({ toFake: ['Date'] })`. L'`afterEach`
  du bloc rétablit l'horloge réelle.
- Écarté : passer l'horloge en paramètre du service. Cela changerait du code
  sur un chemin clinique, hors du besoin.
- Aucune `D-xxx` : ni règle, ni seuil, ni fenêtre ne change.

## 4. Fichiers modifiés

- `web/src/lib/clinical/contradictionsService.test.ts`
- `changelog.d/2026-11-26-test-contradictions-horloge-figee.md`
- `docs/claude/handoffs/2026-11-26-2143-test-contradictions-horloge-figee.md`

## 5. Validations exécutées

- Avant le correctif, sur `origin/main` `7c1a9c59` : le fichier rend 1 échec
  sur 52, de façon déterministe.
- Après : le fichier rend 52 sur 52. Les trois cas du dossier stocké, rejoués
  seuls, rendent 3 sur 3.
- T1 complet (`npm run check`) → 0.
- Suite Vitest entière → 0 (1 096 fichiers, 18 662 tests verts, 82 sautés).
- T2 non joué : test unitaire seul, sans interface ni API.

## 6. Problèmes ouverts

- Le merge déclenche un `release-db` sans migration (filtre
  `web/src/lib/clinical/**`, D-044). L'intégrateur le suit jusqu'au constat.
- D'autres tests du dépôt peuvent dépendre de l'horloge réelle avec des
  fixtures datées. La suite entière est verte ce soir, mais aucun balayage
  n'a été fait.

## 7. Prochaine action exacte

Merger cette PR après la revue, suivre le `release-db`, puis prévenir la
file B que #2378 peut relancer son CI.

## 8. Interdits encore actifs

- Pas de `retries` Playwright ; un rouge WebKit du CI ne se relance pas.
- Pas de modification de logique clinique ou de seuil sans `D-xxx`.
- Un `release-db` à la fois.
