# Handoff — 2026-11-24 — Refonte Lien / Empreinte, PRA-6n : plus aucun saut de niveau de titre dans la fiche, et le banc qui le vérifie

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6n-titres-4e074e`, worktree `.claude/worktrees/refonte-lien-pra6n-titres-4e074e`, créée sur `origin/main@db55f70f` (récupéré le 2026-11-24), avancée par `--ff-only` à `6ca7da42` (#2313, D-557, documentation seule, aucun fichier du diff) avant le premier commit.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454, D-546).
- Lot ouvert par le responsable le 2026-11-24 (« Oui, ouvrir PRA-6n »), confié par la session d'orchestration, sur les restes relevés par la revue de PRA-6e (#2284, handoff `2026-11-20-1250-refonte-lien-pra6e-h1-fiche.md`, « Problèmes ouverts »).

## Objectif

Corriger les sauts et les chevauchements de niveaux de titres de la fiche patient laissés par PRA-6e, et poser le banc structurel qui manquait.

## Décisions prises

- **Phase Actions** : ses panneaux étaient en `h2`, au niveau du titre de phase. Ils descendent d'un niveau, leurs sous-parties avec eux : `AssiettesIndiqueesPanel` (h3, sous-titres h4), `ProtocolMiniBuilder` (h3 dans ses deux branches, « Actions (n/7) » en h4), `ProtocolVersionHistory` (h3), `ProtocolDiffusionPanel` (h3, fiches/lettre/complément en h4), `ProtocolConsultationPanel` (h3, monté par la fixture locale seule). Ces cinq composants ne sont montés que par `ClinicalRuntimeSection` dans la phase Actions (vérifié par recherche d'usages). `DecisionSummaryCard` (h3) et `ArbitrageBiologiquePanel` (h3/h4) étaient déjà au bon niveau.
- **Tiroir de synthèse** (`TiroirSyntheseInline`, `FichePatientPanel.tsx`) : « Résumé praticien » et « Narratif patient » passent de h4 à h3 sous le `Dialog.Title` (h2) d'`InstrumentTiroir`.
- **Banc** dans `FichePatientPanel.test.tsx` (le fichier porte `stubFetch`/`rendreFiche`) : fiche rendue avec runtime prêt, constats biologiques ouverts (`CbFeatureProvider bioConstatEnabled`), constat confirmé avec options de bibliothèque, synthèse validée — toutes données synthétiques. Trois tests : chaque phase du poste (h1 en tête, aucun saut, titre de phase seul en h2 dans la zone focale) ; chaque onglet (h1, aucun saut ; Biologie attend la région « Bibliothèque des options » d'`OptionsAuCockpitBloc`) ; le tiroir de synthèse (h2 puis h3, aucun saut).
- **Le banc mord** : rejoué sur le code d'avant correctif, il rougit la phase Actions et le tiroir (« h2 → h4 « Résumé praticien » ») ; avec `OptionsAuCockpitBloc` remis en h5/h6, il rougit l'onglet Biologie (« h3 → h5 « Bibliothèque des options » »).
- Aucun texte, aucune classe, aucun style changés : seules les balises de titre. Aucune inscription D-488 n'est donc due.

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` (tiroir de synthèse).
- `web/src/components/patient-cockpit/` : `AssiettesIndiqueesPanel.tsx`, `ProtocolMiniBuilder.tsx`, `ProtocolVersionHistory.tsx`, `ProtocolDiffusionPanel.tsx`, `ProtocolConsultationPanel.tsx`.
- Tests : `FichePatientPanel.test.tsx` (banc PRA-6n), `patient-cockpit/ProtocolMiniBuilder.test.tsx` (« Actions » attendu en h4).
- `changelog.d/2026-11-24-refonte-lien-pra6n-titres-fiche.md`, ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans `web/` avant tout test.
- Vitest ciblé (fiche, `patient-cockpit`, `biologie`, `atelier-bibliotheque-options`) : 56 fichiers, 1 369 tests, vert.
- T1 complet (`npm run check`) : vert.
- T2 (`npm run test:worktree -- --fast`) : vert en 13 min 17 s, à `db55f70f` plus le diff — Vitest 18 461 tests (62 sautés), E2E 471 réussis, 37 sautés (Chromium et WebKit, build de production). L'avance à `6ca7da42` n'apporte que de la documentation.
- Contrôle à l'écran en local : `next dev`, base du worktree migrée et seedée (fixtures seules : Sophie Nicola, Jennifer Martin, Michel Dogné, `PAT_SEED_01` à `03`), cookie praticien des E2E, Desktop Chromium, sonde locale non versée (supprimée). 36 vues (7 phases et 5 onglets par dossier) : aucun saut dans la liste des titres à l'écran ; axe à 0 (WCAG 2.1 A/AA, et `heading-order`, `page-has-heading-one`, `empty-heading`). Phase Actions : `h1` nom, `h2` Actions, `h3` « Ce que la décision a retenu », `h3` « Protocole 21 jours ».
- Limite du contrôle à l'écran : au seed, aucun dossier n'a de version de protocole, de constat confirmé ni de synthèse validée ; historique, diffusion, assiettes, options et tiroir rempli ne sont jugés que par le banc Vitest.

## Problèmes ouverts

- Hors périmètre, inchangés : les branches chargement, introuvable et échec de la fiche sans `h1` (un titre y serait un texte neuf, D-488) ; « Trajectoire alimentaire » (h2, `text-3xl`) plus grand que le `h1` (décor, après COM-1).
- Les phases Suivi et Réévaluation sont jugées sans saut par le banc sur ses données, pas sur tous leurs états.

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer`, D-448), un verdict par commentaire en ligne ; puis « prête @<sha> » sur la PR, et numéro + sha à la session d'orchestration.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1.
- Ni route, ni garde serveur, ni drapeau, ni schéma, ni migration ; rien de clinique ; production en lecture seule.
- Jamais de merge par la session ; D-518 : une branche avec commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
