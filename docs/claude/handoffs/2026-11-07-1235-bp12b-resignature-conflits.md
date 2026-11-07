# Handoff — 2026-11-07 — BP-12b, PR 4 : `conflitsSourcesV1` re-signé sur les dossiers clos (D-452)

## Branche et état du dépôt

- Branche `b-bp12b-resignature-conflits`, partie de `origin/main` f52afad1
  (#1893 mergée), avancée par `--ff-only` jusqu'à `origin/main` du
  2026-11-07 ; worktree `.claude/worktrees/b-bp12b-resignature-conflits`.
- **Chemin clinique** (`web/src/lib/clinical/**`) : le déploiement est
  retenu jusqu'à l'approbation de release-db (D-044, D-389 §5). Sans
  migration ni `schema.prisma`.
- Essai `D-373` : la file déclare « prête @sha », l'intégrateur merge.

## Objectif

Appliquer D-439 §4, A1, A2 : re-signer `conflitsSourcesV1` sur les conflits
des dossiers de preuve clos, avec la liste curée des fiches par conflit et
l'empreinte de chaque entrée ; lister au cockpit les arbitrages d'un conflit
constaté, étiquetés par fiche, sous `WN_POSITIONS_EXPERT`.

## Décisions prises

Mémoire `bp12b-pr4-arbitrages-2026-11-06`, et D-452 :

1. Onze conflits neufs publiés (`CS-FER-01`, `CS-VITD-01` à `03`,
   `CS-ZINC-01` à `04`, `CS-MAG-03`, `CS-B9B12-01`, `CS-IODSE-01`), chacun un
   couple de claims épinglés par une fiche signée et relus en production
   (lecture seule). Quatre couples initiaux ne s'opposaient pas : trois
   remplacés (arbitrage du 2026-11-06), un écarté. 53 conflits des dossiers
   clos écartés avec motif et condition de retour.
2. Liste curée = toutes les fiches qui épinglent l'un des deux claims (banc).
   `CS-BIO-01` reçoit les quatre fiches de `WN-CL-0312-018`.
3. Iode et sélénium inclus.
4. `declenchableParBilan` écrit par entrée et contrôlé par banc : seul
   `CS-BIO-01` l'est. Le cockpit ne montre aucun constat nouveau.
5. Revue `wn-reviewer` : GO sur le code, NO-GO sur les textes, corrigés. Le
   responsable a gardé `CS-MAG-03` (option non recommandée, 2026-11-07).
   Ajout : une pose d'arbitrage est refusée (`registre_non_signe`, 409) si
   l'empreinte de l'entrée n'est pas celle qui a été signée.
6. **Signature** : déclaration du responsable le 2026-11-07 (« je signe la
   surface »), après lecture de la surface privée. Empreinte du périmètre
   `300974d7dadf62b246b977aac45d8977f7aceb57540333daee75a9bff1f5b944`,
   empreintes d'entrée recalculées avant la frappe, identiques à la surface.
7. Question du brouillon qui occupe sa fiche : seule une position signée
   occupe une fiche, contrôle déplacé à la signature, **PR séparée** après
   celle-ci.

## Fichiers modifiés

- `web/src/lib/clinical/conflitsSourcesV1.ts` (+ `.guard.test.ts`,
  `conflitsSourcesEngine.test.ts`) : entrées, écartés, métadonnées signées.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et son
  négatif : vingt et un claims neufs.
- `web/src/lib/positions-expert/` : `cockpit.ts` (neuf) et son test,
  `ecriture.ts`, `http.ts`, `registreConflits.ts` et leurs tests,
  `positionsExpert.pg.test.ts` ;
  `web/src/app/api/praticien/positions-expert/routes.test.ts`.
- Cockpit : `api/praticien/cockpit/route.ts` (+ test),
  `MissingDataPanel.tsx` (+ test), `ClinicalRuntimeSection.tsx`.
- Docs : `docs/decisions/D-452.md`, `docs/FEATURE_FLAGS.md` (table des
  signatures, `WN_POSITIONS_EXPERT`), fragment `changelog.d/`, journal F09.

## Validations exécutées

- Suites `lib/clinical`, `lib/positions-expert`, cockpit et garde des
  verrous, registre signé : 123 fichiers, 2 619 tests verts.
- T1 complet (`npm run check`) : vert.
- T3 (`npm run test:worktree`) : vert en 8 min 28 s — Vitest 962 fichiers, 16 370 tests ; forme courte 1 716 ; E2E Playwright Chromium + WebKit 355 passés, 21 sautés.
- `bash scripts/check_no_secrets.sh` : propre.

## Problèmes ouverts

- P2-12 de la revue (coût de la lecture des arbitrages au cockpit) : écarté
  avec motif — tables minuscules, drapeau éteint.
- Contre-revue Codex : facultative, geste manuel, non faite.
- Les 31 couples conflit × fiche restent non arbitrés : c'est voulu
  (`DC-54`), l'arbitrage est un geste du responsable.

## Prochaine action exacte

1. Revue CodeRabbit (ou substitution D-393 §2 / D-448) sur le sha de tête,
   verdict par commentaire, puis « prête @sha ».
2. Après merge : approbation de release-db, déploiement constaté.
3. Responsable : `WN_POSITIONS_EXPERT=true` (valeur exacte), puis versement
   et signature des positions des dossiers clos à l'atelier (D-439 §5), puis
   arbitrages fiche par fiche.
4. File B : PR séparée « seule une position signée occupe sa fiche ».

## Interdits encore actifs

- Ni migration ni `schema.prisma` sans demande.
- Production en lecture seule.
- Aucun texte de position d'expert ni décision de dossier au dépôt (dépôt
  public, forme opaque, D-251 §4).
- Ne pas merger soi-même (essai D-373) ; release-db avant tout déploiement.
- Ne jamais taper `shaPerimetre`, `dateValidation` ou `empreintesEntrees`
  sans déclaration du responsable (D-195).
