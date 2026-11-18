# Handoff — 2026-11-18 — H95 part B : code du second appel de biologie (D-539)

## Branche et état Git

- Worktree `.claude/worktrees/b-h95-second-appel`, session concurrente, cycle en git/gh direct.
- Branche `worktree-b-h95-second-appel`, depuis `origin/main`, avancée par `--ff-only` jusqu'à `1354683d` (aucun fichier commun).
- Lot du carnet `h95-b-code` (file B) : il reste à l'état `pr` après le merge de cette PR ; l'évaluation rejouée suit.
- PR de code sous `release-db` (chemin `web/src/lib/clinical/`), sans migration ni `schema.prisma`.

## Objectif

Livrer D-539 §2, §4, §5 et §7 : le second appel qui restitue la biologie au praticien, la consigne principale `synthese-v37`, la phrase N3 posée par le code, les textes d'information et le dossier RGPD. Rien ne s'ouvre.

## Décisions prises

- Exécution de D-539 (acceptée le 2026-11-18). Textes recopiés du fichier de la décision, sans retouche, par script quand c'était possible (consigne, section v37, 2 quater). Les bancs les relisent dans D-539.
- Choix techniques, déclarés comme tels (DC-19) :
  - délai du second appel de 120 s, partagé par ses deux tours, relance comprise (`AbortSignal.timeout`), et `maxRetries` du transport ;
  - plafond de 8 192 jetons.
- Le second appel ne lève jamais. Son issue est tracée sous `donneesEntree.appelBiologie`.
- Journal :
  - classe d'erreur seule, ou violations structurelles ;
  - clé inconnue comptée, jamais nommée.
- Relance du second appel : un texte de format, non cité par D-539, épinglé par empreinte.
- Phrase N3, point de forme non spécifié par D-539 : « 1er » pour le premier du mois. C'est la convention typographique du dépôt (`portail/texteMentionValidation.ts`), retenue sur la réserve P2-1 de `wn-reviewer` ; elle est signalée dans la PR.
- `publieLe` vaut `2026-11-19` pour v24, v9 et conditions v7 : c'est le jour prévu du déploiement. Si le merge glisse, réaligner la date.

## Fichiers modifiés

- Code :
  - `web/src/lib/synthese/appelBiologie.ts` (neuf) ;
  - `web/src/lib/synthese/generation.ts` ;
  - `web/src/lib/anthropic.ts` ;
  - `web/src/lib/observability/eventCodes.ts` ;
  - commentaires de `web/src/lib/clinical/blocBiologieSyntheseService.ts` et de `syntheseBiologieDrapeau.ts`.
- Textes :
  - `web/src/lib/trust/contenus/registre.ts` (v24, v9, conditions v7) ;
  - `web/src/lib/correspondance/registreGabarits.ts` (`conditions_utilisation@7`).
- Bancs :
  - neufs : `appelBiologie.test.ts`, `biologie.generation.test.ts`, `dossierRgpdD539.test.ts` ;
  - réécrit : `promptBiologie.guard.test.ts` ;
  - empreintes v37 : `promptAlimentaire.guard.test.ts` et `anthropic.corpusActif.guard.test.ts` ;
  - fixtures sans clés biologiques ;
  - `registre.test.ts`, `registreGabarits.test.ts`.
- Docs :
  - `docs/DOSSIER_RGPD.md` (7a à 7c ter) ;
  - `docs/FEATURE_FLAGS.md` (ligne du drapeau) ;
  - `changelog.d/2026-11-18-h95b-second-appel-biologie-code.md` ;
  - `docs/claude/plan-journal/H95/2026-11-18-01-part-b-code-second-appel.md` ;
  - ce handoff.

## Validations exécutées

- `cd web && npm run check:rapide` : rc=0, 16 étapes.
- `cd web && npm run check` (T1 complet) : rc=0, avant les correctifs de revue. Résultat : 4 908 tests et 1 725 tests verts.
- Après les correctifs : suites ciblées vertes (appelBiologie 18, guard et chaîne 25), T1 rejoué avant le commit.
- Contre-revue `wn-reviewer` sur le diff local : GO avec réserves, aucun P0.
  - P1-1, injection de date par U+2028/U+2029 dans la phrase N3 : corrigé, banc ajouté.
  - P2-1 (« 1er ») : traité.
  - P2-3 (intervalles usuels) : banc ajouté.
  - P2-5 (relance épinglée) : traité.
  - P2-6 (ponctuation de `FEATURE_FLAGS`, handoff) : traité.
- Constat par `scalingo env` le 2026-11-18 : `WN_SYNTHESE_BIOLOGIE_ENABLED` est absent de l'application `wellneuro`, donc fermé.
- Boîte B lue au démarrage : un `merge_fait` pour #2245, sans objet pour ce lot, accusé `lu`.

## Problèmes ouverts

Réserves de `wn-reviewer`, laissées en l'état :
- **P2-2.** Le second appel part avant `syntheseIA.create`. Si l'écriture échoue, le bloc est parti pour une synthèse non enregistrée, sans trace. L'ordre « après la réussite de l'appel principal » est tenu ; ce reliquat ne l'est pas. Le risque est faible.
- **P2-3.** Un intervalle imprimé réduit au seul nombre du jour, ou à l'année, rendrait suspecte une synthèse par la phrase N3. D-539 ne touche pas le contrôle de contamination. Les formes usuelles sont tenues par le banc. Le praticien corrige dans l'éditeur.
- **P2-7.** Restes antérieurs au diff :
  - `auditErreurGeneration` persiste `err.message`, et `donneesEntree` porte désormais le bloc ;
  - `synthese-praticien.ts` tronque le narratif à 12 000 caractères.
- **Codex P0, CI, PR-Agent** : à jouer sur la tête poussée, puis relire la boîte B avant « prête ».

## Prochaine action exacte

1. Commit, push, PR, avec `--body-file`.
2. Contre-revue Codex P0 : `node scripts/wn-codex-avis.mjs --mode revue`, avec le diff poussé et ses invariants. Déposer l'avis sur la PR.
3. `node scripts/wn-attendre-ci.mjs <N>`, en fond.
4. `node scripts/wn-revue-pr-agent.mjs <N>` → 0. Puis traiter les commentaires : un verdict pour chacun.
5. Relire la boîte B, puis déclarer « prête @sha » à l'intégrateur, qui merge. Suivre `release-db` jusqu'au constat.
6. Lot suivant : l'évaluation rejouée de D-539 §8 (24 dossiers fictifs × 3 passages, zéro violation), hors production.

## Interdits encore actifs

- Aucune règle, aucun seuil, aucune borne ni aucun texte clinique inventés ou tirés de la mémoire. Les textes de D-539 se recopient sans retouche.
- Aucune interprétation des résultats. Le texte patient se limite à la réception d'un bilan daté.
- Ni pose de `WN_SYNTHESE_BIOLOGIE_ENABLED`, ni ouverture, ni dossier réel visé. L'envoi de l'e-mail @7 est un geste du responsable.
- Forme opaque au dépôt (D-251 §4).
- Pas de merge par la session : c'est l'intégrateur qui merge.
- Si `main` avance : fusion permise sans fichier commun ; sinon, demander.
