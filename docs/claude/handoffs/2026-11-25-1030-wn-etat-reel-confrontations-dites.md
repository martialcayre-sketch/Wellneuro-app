# Handoff — lot `wn-etat-reel-confrontations-dites` : « non confronté » dans le résumé de `wn-etat-reel` (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-2g3g0o`, tirée d'`origin/main` à c8508321 (passe cloud de l'orchestrateur,
  journal `20261125-1008-orch`).
- Carnet : le lot `wn-etat-reel-confrontations-dites` (file D, ordre 111, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `wn-etat-reel-confrontations-dites--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; les lignes `lu` appellent des gestes hors de ce lot.

## 2. Objectif

Que le résumé de `scripts/wn-etat-reel.mjs` dise « non confronté » au lieu de « 3 confrontées … 0 écart(s) »
quand l'état machine est absent ou illisible, ou qu'une confrontation de `comparerEtat` n'a rien pu comparer
(consigne d'hygiène, `docs/claude/templates/ORCHESTRATEUR_PASSE.md` §5).

## 3. Décisions prises

- Caractérisation d'abord : dans un clone frais, `.wn/state.json` est suivi par git (83 Ko), présent ; la
  campagne active est sur disque, la vue aussi : les trois confrontations ont lieu et le résumé réel est
  inchangé. Le « vide » ne survient que hors de ce cas.
- Nouvelle fonction pure `confrontationsMenees(etatMachine, reel)` qui relit les conditions d'entrée des trois
  gardes nommées (vue dérivée, cohérence des dates, lot courant) sans toucher aux gardes ; `ligneDeTete(rapport)`
  rend la ligne. `etatLu` faux quand `readMachineState` rend `{}` (absent, illisible ou vide).
- Lot courant « mené » seulement si `active_campaign` est posé **et** la campagne est trouvée sur disque : sinon
  la garde compare au néant.
- La garde 4 (`next_action[0]`) n'entre pas dans le compte : le résumé n'en annonçait que trois.
- Champ `confrontations` ajouté au rapport JSON (stdout) ; le banc N1 (égalité de deux exécutions) reste vert.

## 4. Fichiers modifiés

- `scripts/wn-etat-reel.mjs` — `confrontationsMenees`, `ligneDeTete`, branchement dans `construireRapport`
  et `resumerSurStderr`.
- `scripts/wn-etat-reel.test.mjs` — quatre tests (état vide, trois menées, partielle, câblage absent/illisible).
- `changelog.d/2026-11-25-wn-etat-reel-confrontations-dites.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-etat-reel.test.mjs scripts/wn-coherence-etat.test.mjs` → 45/45 verts.
- `node scripts/wn-etat-reel.mjs` sur le dépôt → ligne de tête inchangée (3 confrontées, 1 écart périmé).
- T1 rapide (`cd web && npm run check:rapide`) → 0 ; T1 complet (`npm run check`) → 0.
- T2/T3 non joués : interdits en passe cloud.

## 6. Problèmes ouverts

- La consigne de passe §5 dit « sans `.wn/state.json` dans un clone frais, ses confrontations sont vides » : le
  constat le dément (fichier suivi). Hors périmètre du lot (consigne non touchée) — à relire par le responsable.
- Les résumés d'hygiène des passes précédentes (« 3/6 dimensions confrontées ») restent tels quels.

## 7. Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0, un
verdict par commentaire, « prête @<sha> » ; l'intégrateur merge.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni réponse à une question, ni second lot, ni T2/T3.
- Ni les gardes de `comparerEtat`, ni `wn-coherence-etat`, ni la consigne de passe dans ce lot.
- Aucune identité réelle dans le dépôt ; aucun secret.
